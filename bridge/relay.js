/* relay.js — jembatan antara SDK resmi Muse dan halaman web Serenity
   ==========================================================================
   CARA MENJALANKAN:  node bridge/relay.js
   Lalu buka:         http://localhost:8080/pages/userform.html

   ---------------------------------------------------------------------------
   KENAPA FILE INI ADA

   Data EEG diambil oleh SDK RESMI Muse (libmuse) yang jalan di HP Android.
   SDK itu native (Java/C++), tidak ada versi JavaScript-nya, jadi tidak bisa
   dipanggil langsung dari browser. Cara resmi mengeluarkan datanya adalah
   lewat OSC over UDP — contoh bawaan SDK (OscSender.java) memang sudah
   melakukan itu.

   Masalahnya: browser TIDAK BISA menerima UDP sama sekali. Itu batasan keras
   dari browser, bukan sesuatu yang bisa diakali. Jadi harus ada perantara
   yang: menerima UDP dari HP, lalu meneruskannya ke browser lewat jalur yang
   memang bisa diterima browser. Itulah tugas file ini.

       HP Android (SDK resmi)  --UDP/OSC-->  relay.js  --SSE-->  browser

   ---------------------------------------------------------------------------
   FILE INI BUKAN BAGIAN DARI APLIKASI WEB-nya

   Serenity sendiri tetap murni HTML/CSS/JS statis tanpa build step. relay.js
   ini alat bantu lab yang jalan di laptop selama sesi perekaman — anggap saja
   seperti kabel. Karena itu file ini sengaja ditulis TANPA satu pun dependensi
   npm: semuanya pakai modul bawaan Node (dgram untuk UDP, http untuk web).
   Tidak ada npm install, tidak ada package.json.

   ---------------------------------------------------------------------------
   KENAPA SSE, BUKAN WEBSOCKET

   SSE (Server-Sent Events) adalah cara server mendorong data ke browser lewat
   HTTP biasa. Dipilih karena:
     - Bisa ditulis pakai modul http bawaan Node, tanpa install package apa pun.
       WebSocket butuh package 'ws' atau ~80 baris kode protokol tulis tangan.
     - Bisa dites pakai curl:  curl http://localhost:8080/eeg-stream
       Kalau di lokasi ada masalah, satu perintah itu langsung memberi tahu
       apakah yang bermasalah HP-nya, relay-nya, atau browser-nya.
     - Browser menyambung ulang sendiri kalau relay di-restart.
   Aliran datanya memang satu arah (relay -> browser), jadi kemampuan dua arah
   milik WebSocket tidak terpakai di sini. */

const dgram = require('dgram');
const http = require('http');
const fs = require('fs');
const path = require('path');


/* --- Pengaturan ---
   Port UDP bisa diganti waktu menjalankan, misalnya:

     node bridge/relay.js --port-udp=5001

   Berguna karena panduan resmi Muse Lab memakai contoh port 5001, sedangkan
   contoh Android bawaan SDK memakai 7000. Yang penting angka di sini SAMA
   dengan angka yang diisi di kolom "Port" aplikasi Muse di HP. */
function ambilArgAngka(nama, bawaan) {
  const awalan = '--' + nama + '=';
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].indexOf(awalan) === 0) {
      const angka = parseInt(process.argv[i].substring(awalan.length), 10);
      if (angka > 0 && angka < 65536) return angka;
    }
  }
  return bawaan;
}

const PORT_UDP = ambilArgAngka('port-udp', 7000); // port tempat HP mengirim OSC
const PORT_WEB = ambilArgAngka('port-web', 8080); // port untuk membuka halaman Serenity
const AKAR_SITUS = path.join(__dirname, '..'); // folder proyek Serenity

// Tiap berapa milidetik data terbaru dikirim ke browser. 100ms = 10x per
// detik, kira-kira sama dengan kecepatan band power keluar dari headset.
const JEDA_KIRIM_MS = 100;

// Kalau selama sekian milidetik tidak ada satu pun paket UDP masuk, anggap
// aliran datanya putus (HP dimatikan, keluar dari WiFi, aplikasi ditutup).
const BATAS_SEPI_MS = 2000;


/* ==========================================================================
   BAGIAN 1 — MEMBACA PAKET OSC

   OSC (Open Sound Control) itu format pesan sederhana. Satu pesan isinya:

     1. Alamat  : teks yang menjelaskan pesan ini soal apa,
                  misalnya "/elements/alpha_absolute"
     2. Type tag: teks yang diawali koma, satu huruf per argumen,
                  misalnya ",ffff" artinya "ada 4 argumen bertipe float"
     3. Argumen : angka-angkanya sendiri

   Aturan yang bikin agak ribet: setiap teks di OSC harus diakhiri byte nol,
   lalu DIGANJAL byte nol tambahan sampai panjang totalnya kelipatan 4. Jadi
   membaca teks di OSC bukan sekadar "baca sampai ketemu nol", tapi juga
   "lalu lompat maju sampai posisi kelipatan 4 berikutnya".

   Kita cuma perlu mendukung argumen bertipe float, karena OscSender.java di
   contoh SDK memang cuma mengirim float. Tipe lain sengaja diabaikan. */

// Baca satu teks OSC mulai dari posisi 'mulai'. Mengembalikan teksnya dan
// posisi byte berikutnya (sudah memperhitungkan ganjalan kelipatan 4 tadi).
function bacaTeksOsc(buf, mulai) {
  let akhir = mulai;
  while (akhir < buf.length && buf[akhir] !== 0) akhir++;
  if (akhir >= buf.length) return null; // paket rusak: tidak ketemu byte nol

  const teks = buf.toString('ascii', mulai, akhir);

  // panjang teks + 1 byte nol, lalu dibulatkan ke atas ke kelipatan 4
  const panjangTerpakai = akhir - mulai + 1;
  const panjangDiganjal = Math.ceil(panjangTerpakai / 4) * 4;

  return { teks: teks, berikutnya: mulai + panjangDiganjal };
}

// Ubah satu paket OSC jadi objek { alamat, nilai } yang gampang dipakai.
// Balikin null kalau paketnya tidak dikenali — lebih baik diam-diam
// dilewati daripada bikin relay-nya mati di tengah sesi rekam.
function bacaPesanOsc(buf) {
  const alamat = bacaTeksOsc(buf, 0);
  if (!alamat) return null;

  const typeTag = bacaTeksOsc(buf, alamat.berikutnya);
  if (!typeTag || typeTag.teks[0] !== ',') return null;

  const nilai = [];
  let posisi = typeTag.berikutnya;

  // Huruf pertama type tag adalah koma, jadi mulai dari indeks 1
  for (let i = 1; i < typeTag.teks.length; i++) {
    if (typeTag.teks[i] === 'f') {
      if (posisi + 4 > buf.length) break; // paket terpotong, berhenti saja
      nilai.push(buf.readFloatBE(posisi));
      posisi += 4;
    } else {
      // Tipe selain float tidak dipakai di sini. Begitu ketemu, kita
      // berhenti — karena tanpa tahu ukurannya, posisi baca berikutnya
      // tidak bisa dihitung dengan benar.
      break;
    }
  }

  return { alamat: alamat.teks, nilai: nilai };
}

/* Sebagian aplikasi Muse resmi (MuseLab / Muse Direct) membungkus beberapa
   pesan sekaligus dalam satu "bundle" supaya hemat paket. Bentuknya:

     "#bundle" + timetag 8 byte, lalu berulang: [panjang 4 byte][isi pesan]

   Ditangani di sini supaya MuseLab bisa dipakai sebagai jalur cadangan tanpa
   perlu mengubah relay. Aplikasi Android contoh SDK tidak memakai bundle —
   dia mengirim pesan satuan, yang ditangani cabang 'else' di bawah. */
function bacaPaketOsc(buf, tampung) {
  if (buf.length >= 8 && buf.toString('ascii', 0, 7) === '#bundle') {
    let posisi = 16; // lewati "#bundle\0" (8 byte) + timetag (8 byte)
    while (posisi + 4 <= buf.length) {
      const panjang = buf.readInt32BE(posisi);
      posisi += 4;
      if (panjang <= 0 || posisi + panjang > buf.length) break;
      bacaPaketOsc(buf.subarray(posisi, posisi + panjang), tampung);
      posisi += panjang;
    }
  } else {
    const pesan = bacaPesanOsc(buf);
    if (pesan) tampung.push(pesan);
  }
}


/* ==========================================================================
   BAGIAN 2 — MENGUBAH ANGKA SDK JADI ANGKA YANG DIPAKAI SERENITY

   INI BAGIAN PALING PENTING DI FILE INI. Kalau salah, angka penelitiannya
   ikut salah, dan salahnya tidak kelihatan (grafiknya tetap tampil bagus).

   SDK resmi memberi band power dalam bentuk yang berbeda dari yang dipakai
   halaman web:

     - 4 angka per band, satu untuk tiap elektroda (TP9, AF7, AF8, TP10),
       sedangkan halaman web cuma mau SATU angka per band.
     - Satuannya Bel, yaitu skala LOGARITMIK. Nilainya bisa negatif.
     - Bisa berisi NaN kalau elektroda itu sedang lepas dari kulit.

   Urutan pengolahannya wajib begini, dan urutannya tidak boleh dibalik:

     1. Buang nilai NaN (elektroda yang datanya tidak sah)
     2. Ubah tiap angka dari log ke linear:  linear = 10 pangkat bel
     3. Baru dirata-rata

   Kenapa harus diubah ke linear DULU baru dirata-rata:
   merata-ratakan angka logaritmik itu sama saja dengan menghitung rata-rata
   geometrik, bukan rata-rata biasa — hasilnya bukan "total kekuatan
   gelombang saat ini" seperti yang kita mau.

   Kenapa hasil akhirnya harus linear, bukan log:
   hasil.js menghitung parameter stres sebagai rasio Theta dibagi Beta.
   Pembagian angka logaritmik TIDAK sama dengan logaritma hasil pembagian.
   Kalau angka Bel dikirim mentah-mentah ke sana, rasionya jadi tidak
   bermakna, dan bahkan bisa berbalik tanda waktu nilainya melewati nol. */
function rataRataKanal(nilaiBel) {
  let jumlah = 0;
  let banyak = 0;

  for (let i = 0; i < nilaiBel.length; i++) {
    const bel = nilaiBel[i];
    if (typeof bel !== 'number' || !isFinite(bel)) continue; // lewati NaN

    /* Nol PERSIS bukan pengukuran, melainkan penanda "kanal ini tidak punya
       data" dari libmuse. Ini kelihatan waktu headset diangkat dari kepala:
       keempat kanal langsung mengirim 0.00000000 sampai delapan angka di
       belakang koma, ratusan paket berturut-turut, berbarengan dengan
       horseshoe yang jadi 4 di semua elektroda. Nilai EEG sungguhan tidak
       pernah sedatar itu.

       Kenapa nol berbahaya justru DI SINI: konversi ke linear membuat
       10^0 = 1, angka yang kelihatan sangat masuk akal. Sebelum baris ini
       ada, headset yang tergeletak di meja membuat kelima band menampilkan
       1.00 dengan penuh percaya diri, tombol rekam tetap terbuka, dan
       rekamannya menghasilkan rasio Theta/Beta tepat 1,000 sepanjang sesi —
       di file CSV hasilnya tidak bisa dibedakan dari data yang sah.

       Melewatinya membuat kanal mati tidak ikut menarik rata-rata, dan kalau
       keempatnya mati fungsi ini mengembalikan null sehingga kegagalannya
       kelihatan di layar (lihat periksaKontakHilang). */
    if (bel === 0) continue;

    jumlah += Math.pow(10, bel); // log -> linear
    banyak++;
  }

  if (banyak === 0) return null; // semua elektroda tidak sah
  return jumlah / banyak;
}


/* ==========================================================================
   BAGIAN 3 — MENAMPUNG DATA TERBARU

   Tiap band datang sebagai pesan OSC terpisah, dan urutan datangnya tidak
   dijamin (UDP tidak menjanjikan urutan). Jadi daripada mencoba menunggu
   "sudah lengkap lima-limanya", kita cukup selalu menyimpan nilai TERBARU
   tiap band di sini, lalu mengirim potretnya ke browser secara berkala
   (lihat BAGIAN 5). Cara ini juga tahan terhadap paket yang hilang. */

let powerTerbaru = { delta: null, theta: null, alpha: null, beta: null, gamma: null };
let kualitasTerbaru = null;  // nilai horseshoe/HSI per elektroda
let batteryTerbaru = null;   // persen baterai headset
let waktuPaketTerakhir = 0;  // buat mendeteksi aliran data yang putus
let waktuPaketPertama = 0;   // buat memberi tenggang sebelum memperingatkan (lihat periksaBandPowerHilang)
let waktuKontakTerakhir = 0; // kapan terakhir ada kanal yang datanya sah (lihat periksaKontakHilang)

/* Akhiran alamat OSC -> nama band di Serenity.

   Dicocokkan dari BELAKANG (endsWith), bukan sama persis, karena awalan
   alamatnya berbeda-beda tergantung sumbernya:

     /elements/alpha_absolute            <- contoh Android bawaan SDK
     /muse/elements/alpha_absolute       <- MuseLab / Muse Direct
     /apapun/elements/alpha_absolute     <- kalau kolom "Messages Prefix" di
                                            aplikasi Muse diisi

   Aplikasi Muse resmi punya kolom "Messages Prefix" yang boleh diisi bebas
   (lihat Muse Lab Guide bagian 2a). Dengan mencocokkan dari belakang, apa pun
   isinya tetap terbaca — jadi tidak ada lagi kasus "sudah streaming tapi
   datanya tidak muncul" cuma gara-gara ada awalan yang tidak terduga. */
const AKHIRAN_BAND = {
  '/elements/delta_absolute': 'delta',
  '/elements/theta_absolute': 'theta',
  '/elements/alpha_absolute': 'alpha',
  '/elements/beta_absolute': 'beta',
  '/elements/gamma_absolute': 'gamma'
};

function cariBand(alamat) {
  const daftarAkhiran = Object.keys(AKHIRAN_BAND);
  for (let i = 0; i < daftarAkhiran.length; i++) {
    if (alamat.length >= daftarAkhiran[i].length &&
        alamat.indexOf(daftarAkhiran[i], alamat.length - daftarAkhiran[i].length) !== -1) {
      return AKHIRAN_BAND[daftarAkhiran[i]];
    }
  }
  return null;
}

function berakhiranDengan(alamat, akhiran) {
  return alamat.length >= akhiran.length &&
         alamat.indexOf(akhiran, alamat.length - akhiran.length) !== -1;
}

/* Catat sekali saja tiap alamat OSC yang belum pernah dilihat.

   Ini alat diagnosa yang penting waktu pertama kali menyambungkan headset
   asli: yang belum dipastikan adalah APAKAH aplikasi Muse benar-benar
   mengirim band power (/elements/*_absolute), atau cuma sinyal mentah
   (/eeg, /acc, /gyro, /ppg). Panduan resmi MuseLab cuma memperlihatkan
   sinyal mentah di contoh-contohnya.

   Dengan catatan ini, begitu HP mulai streaming, terminal langsung
   memperlihatkan daftar sinyal yang SEBENARNYA dikirim — jadi tidak perlu
   menebak-nebak. Ditandai "(dipakai)" atau "(diabaikan)" supaya langsung
   kelihatan mana yang berguna buat Serenity. */
const alamatSudahDicatat = {};

function catatAlamatBaru(alamat, dipakai) {
  if (alamatSudahDicatat[alamat]) return;
  alamatSudahDicatat[alamat] = true;
  console.log('[relay] sinyal masuk: ' + alamat + (dipakai ? '  (dipakai)' : '  (diabaikan)'));
}

function terimaPesan(pesan) {
  const alamat = pesan.alamat;
  waktuPaketTerakhir = Date.now();
  if (waktuPaketPertama === 0) waktuPaketPertama = waktuPaketTerakhir;

  const namaBand = cariBand(alamat);
  if (namaBand) {
    catatAlamatBaru(alamat, true);
    const linear = rataRataKanal(pesan.nilai);

    /* null (semua kanal mati) sengaja ikut disimpan, tidak disaring seperti
       dulu. Menyimpan nilai lama waktu kanalnya mati justru bikin layar
       membeku di angka terakhir yang sehat — kelihatan hidup padahal sudah
       tidak ada data. Dengan null, kirimPowerTerbaru() berhenti menyiarkan
       (dia menuntut kelima band terisi), jadi tidak ada satu pun angka palsu
       yang sampai ke grafik atau ikut terekam. */
    powerTerbaru[namaBand] = linear;
    if (linear !== null) waktuKontakTerakhir = Date.now();

    /* Band power akhirnya datang setelah sempat diperingatkan — misalnya
       pengaturan di aplikasi Muse baru dibetulkan sambil halamannya dibiarkan
       terbuka. Peringatannya harus dicabut: statusTerakhir dinolkan supaya
       kirimStatusJikaBerubah() menyiarkan "connected" lagi. Tanpa ini, status
       merahnya menempel selamanya dan tombol rekam tetap terkunci padahal
       datanya sudah sehat.

       Syarat "linear !== null" itu penting, dan bukan kehati-hatian kosong.
       Yang mencabut peringatan harus ANGKA yang sah, bukan sekadar pesannya
       yang datang. Waktu headset lepas dari kepala, pesan band power tetap
       mengalir sepuluh kali per detik — cuma isinya nol semua. Tanpa syarat
       ini, tiap pesan kosong itu mencabut peringatan, lalu pemeriksa berkala
       memasangnya lagi 100ms kemudian, dan status di layar berkedip antara
       merah dan hijau belasan kali per detik. */
    if (sudahMemperingatkan && linear !== null) {
      sudahMemperingatkan = false;
      statusTerakhir = null;
      console.log('[relay] band power akhirnya masuk — peringatan dicabut');
    }
    return;
  }

  // Horseshoe / HSI = kualitas kontak tiap elektroda dengan kulit kepala.
  // 1 = bagus, 2 = sedang, 4 = jelek. Dipakai halaman monitor untuk
  // memperingatkan peneliti sebelum mulai merekam data yang kotor.
  if (berakhiranDengan(alamat, '/elements/horseshoe')) {
    catatAlamatBaru(alamat, true);
    kualitasTerbaru = pesan.nilai;
    return;
  }

  if (berakhiranDengan(alamat, '/batt')) {
    catatAlamatBaru(alamat, true);
    // Sebagian sumber mengirim persen apa adanya (0-100), sebagian lagi
    // mengirimnya dikali 100 (jadi 0-10000). Dibedakan dari besarnya angka,
    // supaya kedua sumber sama-sama tampil benar.
    const persen = pesan.nilai[0];
    batteryTerbaru = persen > 100 ? persen / 100 : persen;
    return;
  }

  // Alamat lain (misalnya "/eeg" berisi sinyal mentah, atau /acc, /gyro,
  // /ppg) sengaja diabaikan: Serenity cuma butuh band power, dan meneruskan
  // sinyal mentah 256x per detik ke browser cuma bikin berat tanpa ada yang
  // memakai. Tetap dicatat sekali supaya kelihatan di terminal apa saja yang
  // sebenarnya dikirim sumbernya.
  catatAlamatBaru(alamat, false);
}


/* ==========================================================================
   BAGIAN 4 — MENGIRIM DATA KE BROWSER (SSE)

   Tiap browser yang membuka /eeg-stream disimpan di daftar di bawah. Waktu
   ada data baru, kita tulis ke semua browser di daftar itu sekaligus.

   Format SSE sederhana sekali: tiap pesan ditulis sebagai teks
   "data: <isi>\n\n". Dua baris kosong di akhir itulah penanda satu pesan
   selesai. Isinya kita pakai JSON supaya sisi browser tinggal JSON.parse. */

const browserTerhubung = [];

function siarkan(objek) {
  const teks = 'data: ' + JSON.stringify(objek) + '\n\n';
  browserTerhubung.forEach(function (res) {
    res.write(teks);
  });
}

// Status koneksi tidak dikirim oleh HP — kita simpulkan sendiri dari ada
// tidaknya paket yang masuk belakangan ini.
let statusTerakhir = null;

function kirimStatusJikaBerubah() {
  const adaData = waktuPaketTerakhir > 0 &&
                (Date.now() - waktuPaketTerakhir) < BATAS_SEPI_MS;
  const status = adaData ? 'connected' : 'disconnected';

  if (status === statusTerakhir) return; // jangan spam browser tiap 100ms
  statusTerakhir = status;

  /* Aliran data mati = percobaan berikutnya harus dinilai dari nol lagi.

     Dua hal yang harus di-reset bareng. Kalau latch peringatannya dibiarkan
     menyala, percobaan kedua tidak akan pernah diperingatkan lagi seumur
     proses relay. Kalau waktuPaketPertama-nya dibiarkan, tenggang 5 detik di
     periksaBandPowerHilang() dianggap sudah lewat sejak paket pertama tadi —
     jadi percobaan kedua langsung divonis merah tanpa diberi kesempatan. */
  if (status === 'disconnected') {
    sudahMemperingatkan = false;
    waktuPaketPertama = 0;
    // Sama alasannya: latch kontak juga harus dinolkan, supaya sesi berikutnya
    // dinilai dari nol dan tidak mewarisi vonis "kontak hilang" dari sesi tadi.
    waktuKontakTerakhir = 0;
    sedangKontakHilang = false;

    /* Potret band power terakhir ikut dibuang, dan ini bukan sekadar
       kerapian. Relay di server hidup terus lintas peserta, sementara
       powerTerbaru tidak pernah dikosongkan siapa pun. Tanpa baris ini,
       begitu ada paket masuk lagi — dari HP mana pun, bahkan yang cuma
       mengirim /eeg tanpa band power — kirimPowerTerbaru() langsung
       menyiarkan angka sisa sesi SEBELUMNYA sepuluh kali per detik, dan di
       layar itu tidak bisa dibedakan dari data hidup. Untuk aplikasi yang
       dipakai merekam data penelitian, itu jauh lebih berbahaya daripada
       layar yang kosong. */
    powerTerbaru = { delta: null, theta: null, alpha: null, beta: null, gamma: null };
    kualitasTerbaru = null;
    batteryTerbaru = null;
  }

  siarkan({
    tipe: 'status',
    state: status,
    teks: adaData
      ? 'Terhubung'
      : 'Menunggu data dari HP... (pastikan aplikasi Muse sudah streaming ke IP laptop ini)'
  });
}

// Kirim potret data terbaru, berkala. Cuma dikirim kalau kelima band sudah
// pernah terisi — supaya halaman tidak menampilkan band setengah kosong.
function kirimPowerTerbaru() {
  if (statusTerakhir !== 'connected') return;

  const lengkap = Object.keys(powerTerbaru).every(function (key) {
    return powerTerbaru[key] !== null;
  });
  if (!lengkap) return;

  siarkan({
    tipe: 'bandpower',
    powers: powerTerbaru,
    kualitas: kualitasTerbaru,
    battery: batteryTerbaru
  });
}

setInterval(function () {
  kirimStatusJikaBerubah();
  kirimPowerTerbaru();
  periksaBandPowerHilang();
  periksaKontakHilang();
}, JEDA_KIRIM_MS);


/* Elektroda lepas dari kepala, padahal paketnya tetap mengalir.

   Ini kembarannya periksaBandPowerHilang() di bawah, untuk kegagalan yang
   berbeda: di sana band power-nya memang tidak pernah dikirim, di sini
   dikirim tapi isinya nol semua karena tidak ada kulit kepala yang disentuh.
   Dua-duanya sama menyesatkannya kalau didiamkan — paket masuk, status
   telanjur "Terhubung", dan tidak ada satu pun petunjuk bahwa yang terekam
   sebenarnya bukan otak siapa-siapa.

   Kenapa horseshoe tidak dipakai sebagai penanda: waktu diuji dengan headset
   sungguhan, horseshoe pernah melaporkan keempat elektroda "sedang" (nilai 2)
   padahal band power-nya sudah nol semua. Jadi mutu kontak yang dilaporkan
   headset TIDAK cukup untuk menyimpulkan datanya sah — yang menentukan adalah
   ada tidaknya angka yang benar-benar sah di band power itu sendiri. */
const BATAS_KONTAK_MS = 2000;
let sedangKontakHilang = false;

function periksaKontakHilang() {
  // Aliran datanya sendiri yang putus? Itu bagian kirimStatusJikaBerubah().
  if (statusTerakhir !== 'connected') return;
  if (waktuKontakTerakhir === 0) return; // belum pernah ada band power sah sama sekali

  const hilang = (Date.now() - waktuKontakTerakhir) > BATAS_KONTAK_MS;
  if (hilang === sedangKontakHilang) return; // tidak ada perubahan, jangan spam
  sedangKontakHilang = hilang;

  if (hilang) {
    console.warn('[relay] semua kanal band power bernilai 0.00 Bel — headset kemungkinan lepas dari kepala');
    siarkan({
      tipe: 'status',
      state: 'error',
      teks: 'Headset tidak menempel di kepala'
    });
    return;
  }

  /* Kontaknya pulih. statusTerakhir dinolkan supaya kirimStatusJikaBerubah()
     menyiarkan "connected" lagi — tanpa ini status merahnya menempel selamanya
     dan tombol rekam tetap terkunci padahal datanya sudah sehat. Pola yang
     sama dipakai periksaBandPowerHilang() waktu band power akhirnya masuk. */
  statusTerakhir = null;
  console.log('[relay] kontak elektroda pulih — band power sah lagi');
}

/* Peringatan untuk satu kemungkinan kegagalan yang paling membingungkan:
   data OSC MASUK dengan lancar, tapi isinya cuma sinyal mentah (/eeg, /acc,
   /gyro, /ppg) tanpa band power sama sekali. Kalau itu terjadi, halaman
   monitor akan diam saja tanpa error — seolah-olah tidak ada yang terjadi —
   padahal sebenarnya sumbernya memang tidak mengirim yang kita butuhkan.

   Ini bukan kemungkinan yang mengada-ada: contoh-contoh di panduan resmi
   Muse Lab semuanya cuma memperlihatkan sinyal mentah. Jadi kalau band power
   ternyata tidak ikut dikirim, hal itu harus ketahuan dalam hitungan detik,
   bukan setelah satu sesi perekaman terlanjur gagal. */
const PERINGATAN_SETELAH_MS = 5000;
let sudahMemperingatkan = false;

function periksaBandPowerHilang() {
  if (sudahMemperingatkan) return;
  if (waktuPaketTerakhir === 0) return; // belum ada data sama sekali

  /* Pernah ada band power yang sah, walau cuma sekali? Berarti sumbernya
     terbukti MAMPU mengirim band power, dan pertanyaan yang ditangani fungsi
     ini sudah terjawab selamanya. Kalau sekarang angkanya kosong, penyebabnya
     kontak elektroda — itu wilayah periksaKontakHilang(), dengan kalimat yang
     jauh lebih berguna buat peneliti ("headset tidak menempel") daripada
     kalimat di sini ("aktifkan band power di aplikasi Muse"). Tanpa penjaga
     ini kedua pemeriksa berebut menyiarkan status dan layar jadi berkedip. */
  if (waktuKontakTerakhir !== 0) return;
  if (Date.now() - waktuPaketTerakhir > BATAS_SEPI_MS) return; // aliran sudah putus

  const adaSatuBand = Object.keys(powerTerbaru).some(function (key) {
    return powerTerbaru[key] !== null;
  });
  if (adaSatuBand) return; // aman, band power sampai

  if (Date.now() - waktuPaketPertama < PERINGATAN_SETELAH_MS) return;

  sudahMemperingatkan = true;
  console.warn('\n[relay] PERHATIAN: data OSC masuk, tapi TIDAK ADA band power di dalamnya.');
  console.warn('[relay] Serenity butuh alamat /elements/<band>_absolute (alpha, beta, delta, theta, gamma).');
  console.warn('[relay] Lihat daftar "sinyal masuk" di atas untuk tahu apa yang sebenarnya dikirim.');
  console.warn('[relay] Kalau yang muncul cuma /eeg, /acc, /gyro, atau /ppg, berarti sumbernya');
  console.warn('[relay] cuma mengirim sinyal mentah — band power harus diaktifkan di sumbernya,');
  console.warn('[relay] atau dipakai sumber lain (lihat docs/BridgeSdkResmi.md).\n');

  /* Peringatan yang sama, tapi dengan bahasa untuk klien, dikirim ke layar.

     Ini kegagalan yang paling menyesatkan di seluruh alur: paketnya memang
     masuk, jadi status telanjur jadi "Terhubung" — sementara kirimPowerTerbaru()
     diam karena band-nya kosong. Hasilnya halaman bilang "Terhubung — data
     mengalir" dengan yakin sambil grafiknya tidak pernah bergerak, tanpa satu
     pun petunjuk kenapa. Dikirim sebagai state 'error' supaya tombol rekam
     ikut terkunci: sesi yang datanya kosong memang tidak layak direkam. */
  siarkan({
    tipe: 'status',
    state: 'error',
    teks: 'Data dari HP sampai, tapi isinya belum berupa band power. Di aplikasi Muse, ' +
          'pastikan pengiriman band power sudah aktif, lalu mulai streaming lagi. ' +
          'Kalau tetap begini, laporkan ke Stefano.'
  });
}


/* ==========================================================================
   BAGIAN 5 — SERVER WEB

   Server ini punya dua tugas:

     1. Menyajikan file-file Serenity (html/css/js) lewat http://localhost:8080
     2. Menyediakan endpoint /eeg-stream untuk aliran data SSE

   Kenapa file statisnya ikut disajikan di sini, bukan dibuka langsung lewat
   file:// seperti sebelumnya: dengan cara ini halaman dan aliran data berada
   di alamat yang sama, jadi tidak ada urusan CORS sama sekali. Cukup satu
   perintah yang perlu dijalankan waktu sesi penelitian. */

const TIPE_FILE = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function layaniSse(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  browserTerhubung.push(res);
  console.log('[relay] browser terhubung (total: ' + browserTerhubung.length + ')');

  // Kirim status sekarang juga, tanpa menunggu perubahan berikutnya —
  // supaya halaman yang baru dibuka langsung tahu kondisinya.
  res.write('data: ' + JSON.stringify({
    tipe: 'status',
    state: statusTerakhir || 'disconnected',
    teks: statusTerakhir === 'connected'
      ? 'Terhubung'
      : 'Menunggu data dari HP...'
  }) + '\n\n');

  // Kalau paket dari HP pernah sampai, halaman yang baru dibuka pun harus
  // tahu. Inilah yang bikin Send Test tetap terbukti walaupun halamannya baru
  // dibuka setelah tombolnya ditekan.
  if (jejakJaringan) {
    res.write('data: ' + JSON.stringify(jejakJaringan) + '\n\n');
  }

  // Buang dari daftar begitu tab-nya ditutup, supaya relay tidak terus
  // menulis ke koneksi yang sudah mati.
  req.on('close', function () {
    const posisi = browserTerhubung.indexOf(res);
    if (posisi !== -1) browserTerhubung.splice(posisi, 1);
    console.log('[relay] browser terputus (sisa: ' + browserTerhubung.length + ')');
  });
}

function layaniFile(req, res) {
  let alamat = req.url.split('?')[0];
  if (alamat === '/') alamat = '/index.html';

  // path.normalize + cek awalan mencegah alamat nakal seperti
  // "/../../etc/passwd" keluar dari folder proyek.
  const berkas = path.normalize(path.join(AKAR_SITUS, alamat));
  if (berkas.indexOf(AKAR_SITUS) !== 0) {
    res.writeHead(403);
    res.end('Akses ditolak');
    return;
  }

  fs.readFile(berkas, function (err, isi) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Tidak ketemu: ' + alamat);
      return;
    }
    const tipe = TIPE_FILE[path.extname(berkas)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipe });
    res.end(isi);
  });
}

const server = http.createServer(function (req, res) {
  if (req.url.split('?')[0] === '/eeg-stream') {
    layaniSse(req, res);
  } else {
    layaniFile(req, res);
  }
});

/* Kesalahan paling sering waktu sesi penelitian: relay dijalankan dua kali
   (misalnya lupa kalau terminal sebelumnya masih hidup). Tanpa penanganan
   ini, Node menampilkan tumpukan error panjang yang tidak bisa dibaca orang
   non-programmer, padahal penyelesaiannya sederhana. */
server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('\n[relay] Port ' + PORT_WEB + ' sudah dipakai.');
    console.error('[relay] Kemungkinan besar relay-nya SUDAH jalan di terminal lain.');
    console.error('[relay] Coba buka http://localhost:' + PORT_WEB + '/pages/userform.html dulu —');
    console.error('[relay] kalau halamannya muncul, berarti tidak perlu menjalankan ini lagi.\n');
  } else {
    console.error('[relay] gagal menyalakan server web:', err.message);
  }
  process.exit(1);
});

server.listen(PORT_WEB, function () {
  console.log('[relay] Serenity siap di  http://localhost:' + PORT_WEB + '/pages/userform.html');
  console.log('[relay] Cek aliran data:  curl http://localhost:' + PORT_WEB + '/eeg-stream');
});


/* ==========================================================================
   BAGIAN 6 — PENERIMA UDP

   Bagian yang benar-benar mendengarkan HP. Sengaja ditaruh paling bawah
   supaya alur bacanya runut: paket masuk di sini, lalu dibaca (BAGIAN 1),
   diubah satuannya (BAGIAN 2), ditampung (BAGIAN 3), dan dikirim ke
   browser (BAGIAN 4). */

const soket = dgram.createSocket('udp4');

/* Catat sekali tiap alat yang mengirim paket ke sini.

   Ini baris paling menenangkan waktu menyiapkan alat di lokasi: begitu
   muncul, artinya HP benar-benar berhasil menjangkau laptop lewat jaringan.
   Kalau baris ini tidak pernah muncul, masalahnya di jaringan (IP salah,
   beda WiFi, firewall, atau WiFi-nya memblokir komunikasi antar-perangkat)
   — bukan di Serenity. */
const pengirimSudahDicatat = {};

/* Jejak "pernah sampai" ini disimpan, bukan cuma disiarkan sekali lewat.

   Alasannya urutan yang wajar di lapangan justru terbalik dari dugaan:
   klien menekan Send Test di HP dulu, BARU membuka halaman monitornya.
   Padahal siarkan() cuma sampai ke browser yang sedang terbuka. Kalau
   jejaknya tidak disimpan, bukti paling menenangkan itu justru hilang di
   saat paling dibutuhkan — dan klien menyangka Send Test-nya gagal. */
let jejakJaringan = null;

function catatPengirimBaru(ip) {
  if (pengirimSudahDicatat[ip]) return;
  pengirimSudahDicatat[ip] = true;
  console.log('[relay] menerima paket dari ' + ip + ' — jaringan OK');

  // Baris yang sama juga dikirim ke halaman monitor. Waktu relay masih jalan
  // di laptop, terminal ini selalu kelihatan; begitu relay pindah ke server,
  // klien tidak punya cara apa pun untuk melihatnya.
  /* Yang dikirim angka epoch, bukan jam yang sudah jadi teks.

     Sengaja begitu karena relay-nya jalan di server, dan jam server itu UTC —
     kalau relay yang memformat, klien di Indonesia akan membaca jam yang
     meleset tujuh jam dari jam di tangannya sendiri, dan itu justru bikin dia
     ragu apakah paketnya benar-benar baru sampai. Browser klien tahu zona
     waktunya sendiri, jadi biar dia yang memformat. */
  jejakJaringan = { tipe: 'jaringan', ip: ip, waktu: Date.now() };
  siarkan(jejakJaringan);
}

soket.on('message', function (buf, rinfo) {
  catatPengirimBaru(rinfo.address);

  const daftarPesan = [];
  bacaPaketOsc(buf, daftarPesan);

  /* Paket sampai tapi tidak bisa dibaca sebagai OSC. Tetap dicatat sekali,
     karena diam-diam membuangnya justru menyesatkan: orang akan menyangka
     paketnya tidak pernah sampai, lalu sibuk memperbaiki jaringan yang
     sebenarnya sudah benar. */
  if (daftarPesan.length === 0) {
    catatAlamatBaru('(paket tidak dikenali, ' + buf.length + ' byte)', false);
    return;
  }

  daftarPesan.forEach(terimaPesan);
});

soket.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('\n[relay] Port UDP ' + PORT_UDP + ' sudah dipakai program lain.');
    console.error('[relay] Kemungkinan besar relay-nya sudah jalan di terminal lain.\n');
    process.exit(1);
  }
  console.error('[relay] error UDP:', err.message);
});

// Dengarkan di semua alamat jaringan (0.0.0.0), bukan cuma localhost —
// karena paketnya datang dari HP lewat WiFi, bukan dari laptop ini sendiri.
soket.bind(PORT_UDP, '0.0.0.0', function () {
  console.log('[relay] mendengarkan OSC di UDP port ' + PORT_UDP);
  console.log('[relay] arahkan aplikasi Muse di HP ke IP laptop ini, port ' + PORT_UDP);
  cetakAlamatIp();
});

/* Tampilkan alamat IP komputer ini, supaya tidak perlu cari-cari sendiri
   waktu mengisi kolom IP di aplikasi Android.

   Catatan kalau relay ini dijalankan di server (misalnya droplet DigitalOcean):
   yang tercetak di sini adalah alamat yang dilihat dari DALAM mesin itu. Di
   sebagian server, alamat publiknya beda dengan yang tercetak di sini (karena
   ada NAT di depannya). Kalau begitu, pakai alamat IP publik dari panel
   penyedia server, bukan yang di bawah ini. */
function cetakAlamatIp() {
  const kartuJaringan = require('os').networkInterfaces();
  Object.keys(kartuJaringan).forEach(function (nama) {
    kartuJaringan[nama].forEach(function (info) {
      if (info.family === 'IPv4' && !info.internal) {
        console.log('[relay] alamat IP mesin ini: ' + info.address + ' (' + nama + ')');
      }
    });
  });
}
