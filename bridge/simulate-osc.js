/* simulate-osc.js — headset Muse palsu, buat ngetes tanpa hardware
   ==========================================================================
   CARA MENJALANKAN (di terminal terpisah, sementara relay.js sudah jalan):

     node bridge/simulate-osc.js            <- data bergerak, mirip sesi asli
     node bridge/simulate-osc.js --tetap    <- angka tetap, buat cek hitungan

   ---------------------------------------------------------------------------
   KENAPA FILE INI ADA

   Tanpa ini, mengetes apa pun butuh: headset Muse, HP Android yang sudah
   dipasangi aplikasi SDK, dan WiFi yang benar. Itu terlalu berat untuk
   sekadar memastikan grafik tidak error atau tombol rekam masih jalan.

   File ini berpura-pura jadi HP: dia mengirim paket OSC yang bentuknya sama
   persis dengan yang dikirim aplikasi Android, ke port UDP yang sama. Dari
   sudut pandang relay.js, tidak ada bedanya dengan headset asli. Jadi
   seluruh rantai (relay -> SSE -> halaman monitor -> rekam -> Hasil Akhir)
   bisa dites cukup dengan dua perintah di laptop.

   PERHATIAN: angka yang dikirim di sini ANGKA KARANGAN, bukan data EEG asli.
   Bentuk dan satuannya saja yang ditiru supaya realistis. */

const dgram = require('dgram');

const PORT_UDP = 7000;
const TUJUAN = '127.0.0.1';

// Mode "--tetap" mengirim angka yang sudah diketahui hasilnya, supaya
// konversi log->linear di relay.js bisa dicek dengan hitungan tangan.
// Contoh: alpha = 1.0 Bel harus muncul sebagai 10.00 di halaman monitor,
// karena 10 pangkat 1 = 10. Lihat BAGIAN 2 di relay.js.
const MODE_TETAP = process.argv.indexOf('--tetap') !== -1;

/* Mode "--mentah" meniru kegagalan yang paling mungkin terjadi dengan headset
   asli: aplikasi Muse streaming dengan lancar, tapi yang dikirim cuma sinyal
   mentah (/eeg) tanpa band power sama sekali. Contoh-contoh di panduan resmi
   Muse Lab semuanya begitu, jadi ini bukan kemungkinan yang mengada-ada.

   Gunanya di sini: memastikan peringatan di halaman monitor benar-benar
   muncul, tanpa harus menunggu headset aslinya ada di tangan. */
const MODE_MENTAH = process.argv.indexOf('--mentah') !== -1;

const soket = dgram.createSocket('udp4');


/* ==========================================================================
   MENULIS PAKET OSC

   Kebalikan dari pembaca OSC di relay.js. Aturannya sama: tiap teks diakhiri
   byte nol, lalu diganjal byte nol sampai panjangnya kelipatan 4. Argumen
   float ditulis 4 byte, urutan big-endian. */

function tulisTeksOsc(teks) {
  const panjang = Math.ceil((teks.length + 1) / 4) * 4;
  const buf = Buffer.alloc(panjang); // Buffer.alloc otomatis berisi nol semua
  buf.write(teks, 0, 'ascii');
  return buf;
}

function buatPesanOsc(alamat, nilai) {
  const bufAlamat = tulisTeksOsc(alamat);

  // Type tag: koma diikuti satu huruf 'f' per argumen float
  let typeTag = ',';
  for (let i = 0; i < nilai.length; i++) typeTag += 'f';
  const bufTypeTag = tulisTeksOsc(typeTag);

  const bufNilai = Buffer.alloc(nilai.length * 4);
  for (let j = 0; j < nilai.length; j++) {
    bufNilai.writeFloatBE(nilai[j], j * 4);
  }

  return Buffer.concat([bufAlamat, bufTypeTag, bufNilai]);
}

function kirim(alamat, nilai) {
  const paket = buatPesanOsc(alamat, nilai);
  soket.send(paket, 0, paket.length, PORT_UDP, TUJUAN);
}


/* ==========================================================================
   MEMBUAT ANGKA PALSU

   SDK resmi mengirim 4 angka per band (satu per elektroda: TP9, AF7, AF8,
   TP10) dalam satuan Bel — skala logaritmik, jadi angkanya kecil dan boleh
   negatif. Kisaran -1 sampai 1.5 Bel kira-kira sesuai data asli.

   Nilainya dibuat bergerak pelan pakai fungsi sinus, bukan acak murni,
   supaya grafiknya kelihatan seperti gelombang otak beneran (naik-turun
   halus) dan bukan seperti garis gemetar. Tiap band diberi kecepatan sinus
   berbeda supaya garisnya tidak bergerak seragam. */

const BAND_PALSU = [
  { nama: 'delta', tengah: 0.9, ayun: 0.35, kecepatan: 0.7 },
  { nama: 'theta', tengah: 0.5, ayun: 0.30, kecepatan: 1.1 },
  { nama: 'alpha', tengah: 0.7, ayun: 0.45, kecepatan: 0.5 },
  { nama: 'beta', tengah: 0.2, ayun: 0.25, kecepatan: 1.7 },
  { nama: 'gamma', tengah: -0.3, ayun: 0.20, kecepatan: 2.3 }
];

// Nilai tetap untuk mode --tetap. Sengaja dipilih angka bulat supaya hasil
// konversinya gampang dicek di kepala: 10^1 = 10, 10^0.5 = 3.16, 10^0 = 1.
const NILAI_TETAP = {
  delta: 0.0,   // -> 1.00
  theta: 1.0,   // -> 10.00
  alpha: 1.0,   // -> 10.00
  beta: 0.5,    // -> 3.16   (jadi rasio Theta/Beta = 10 / 3.16 = 3.16)
  gamma: 0.0    // -> 1.00
};

let detik = 0;

function kirimSatuPutaran() {
  // Cuma sinyal mentah: 4 kanal EEG dalam mikrovolt, tidak ada band power.
  // Relay akan menandainya "(diabaikan)" lalu memperingatkan setelah 5 detik.
  if (MODE_MENTAH) {
    kirim('/eeg', [820 + Math.random() * 20, 830 + Math.random() * 20,
                   825 + Math.random() * 20, 815 + Math.random() * 20]);
    kirim('/batt', [85]);
    detik += 0.1;
    return;
  }

  BAND_PALSU.forEach(function (band) {
    let nilaiKanal;

    if (MODE_TETAP) {
      nilaiKanal = [
        NILAI_TETAP[band.nama], NILAI_TETAP[band.nama],
        NILAI_TETAP[band.nama], NILAI_TETAP[band.nama]
      ];
    } else {
      // Tiap elektroda diberi sedikit selisih acak, meniru kenyataan bahwa
      // keempat elektroda tidak pernah membaca angka yang persis sama.
      const dasar = band.tengah + band.ayun * Math.sin(detik * band.kecepatan);
      nilaiKanal = [
        dasar + (Math.random() - 0.5) * 0.1,
        dasar + (Math.random() - 0.5) * 0.1,
        dasar + (Math.random() - 0.5) * 0.1,
        dasar + (Math.random() - 0.5) * 0.1
      ];
    }

    kirim('/elements/' + band.nama + '_absolute', nilaiKanal);
  });

  // Kualitas kontak elektroda: 1 = bagus, 2 = sedang, 4 = jelek.
  // Di mode normal, satu elektroda sesekali dibuat memburuk supaya
  // indikator kualitas sinyal di halaman monitor ikut kelihatan bekerja.
  const elektrodaJelek = !MODE_TETAP && Math.sin(detik * 0.15) > 0.8;
  kirim('/elements/horseshoe', [1, elektrodaJelek ? 4 : 1, 1, 1]);

  kirim('/batt', [85]);

  detik += 0.1;
}

soket.bind(function () {
  console.log('[simulator] mengirim OSC palsu ke ' + TUJUAN + ':' + PORT_UDP);
  console.log('[simulator] mode: ' +
    (MODE_MENTAH ? 'MENTAH (cuma /eeg, sengaja tanpa band power)'
                 : (MODE_TETAP ? 'TETAP (angka pasti)' : 'bergerak')));
  if (MODE_MENTAH) {
    console.log('[simulator] harapan di layar: setelah ~5 detik muncul peringatan merah,');
    console.log('[simulator] dan tombol "Mulai Rekam" tidak bisa ditekan');
  }
  if (MODE_TETAP) {
    console.log('[simulator] harapan di layar: delta 1.00, theta 10.00, alpha 10.00, beta 3.16, gamma 1.00');
  }
  console.log('[simulator] tekan Ctrl+C untuk berhenti');

  // 10x per detik, kira-kira sama dengan kecepatan band power dari headset asli
  setInterval(kirimSatuPutaran, 100);
});
