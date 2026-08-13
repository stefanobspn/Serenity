/* eeg.js — kode utama halaman eegmonitor.html
   ==========================================================
   DARI MANA DATA EEG-nya DATANG

   Data EEG di halaman ini datang dari SDK RESMI Muse (libmuse), bukan dari
   library pihak ketiga. SDK resmi itu native (Java/C++) dan tidak punya versi
   JavaScript, jadi dia tidak bisa dipanggil langsung dari browser. Alurnya
   jadi begini:

     Headset Muse
        |  Bluetooth
     HP Android (menjalankan SDK resmi)
        |  OSC over UDP lewat WiFi
     bridge/relay.js (jalan di laptop)
        |  SSE (Server-Sent Events)
     halaman ini

   Kenapa berputar lewat HP dan relay: browser tidak bisa menerima UDP, dan
   SDK resmi tidak bisa jalan di browser. Penjelasan lengkapnya ada di
   komentar paling atas bridge/relay.js.

   Bagi file ini, semua kerumitan itu tidak kelihatan. Yang perlu diketahui
   cuma: ada aliran pesan JSON yang masuk lewat EventSource, isinya band power
   yang sudah siap pakai. Anggap saja seperti "kabel data" — kita tinggal
   dengarkan ujungnya.

   Tugas file ini ada 5:
   1. Menyambung ke aliran data dari relay
   2. Menampilkan status koneksi & battery ke halaman
   3. Menampilkan band power ke kartu + grafik garis
   4. Menampilkan kualitas kontak elektroda, dan mencegah perekaman
      dimulai kalau sinyalnya jelek
   5. Merekam data sampai peserta menekan "Stop Rekam", dua kali berturut-turut
      (EEG 1 lalu EEG 2 — lihat blok "Tahap rekam" di bawah), baru lalu pindah
      ke halaman Hasil Akhir (lihat hasilakhir.html)

   Daftar band (nama & warna) dan fungsi formatPower diambil dari bands.js,
   yang dipakai bareng dengan halaman Hasil Akhir. Grafiknya digambar pakai
   library eksternal Chart.js (di-load dari CDN di eegmonitor.html): kita cuma
   mengisi data/options-nya lewat API-nya (chart.data, chart.update(), dst),
   tidak perlu tahu cara Chart.js menggambar garis di dalamnya. */


// --- Konstanta ---
var MAX_POINTS = 60; // jumlah titik riwayat yang ditampilkan di grafik
var INTERVAL_DETIK = 10; // tiap berapa detik satu titik data interval disimpan (lihat "Sesi Rekam" di bawah)

/* Berapa detik pertama yang dibuang sebelum perekaman benar-benar dimulai.

   Angkanya bukan tebakan. Di rekaman asli pertama, baseline yang seharusnya
   datar justru meluncur turun sepanjang sesi: rasio Theta/Beta rata-rata
   4,243 di 50 detik pertama, lalu 1,844 di 50 detik terakhir. Bandingkan
   dengan sesi aktivitasnya yang cuma 1,435 — artinya sebagian besar dari
   "penurunan" yang tampak antara kedua sesi itu sebenarnya baseline yang
   belum tenang, bukan efek dari perlakuan yang sedang diteliti.

   Membuang detik-detik awal ini kelihatan seperti membuang data, padahal
   justru sebaliknya: yang dibuang adalah bagian yang mencemari perbandingan
   antara Tahap Satu dan Tahap Dua nanti. */
var DETIK_TENANG = 30;

// Nama elektroda sesuai posisinya di headset, urutannya sama dengan urutan
// angka yang dikirim SDK resmi lewat /elements/horseshoe.
var NAMA_ELEKTRODA = ['TP9 (kiri belakang)', 'AF7 (kiri depan)', 'AF8 (kanan depan)', 'TP10 (kanan belakang)'];


// --- Ambil elemen-elemen HTML yang isinya akan kita ubah lewat JS ---
var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var jejakJaringanEl = document.getElementById('jejakJaringan');
var batteryEl = document.getElementById('battery');
var recordBtn = document.getElementById('recordBtn');
var stopRecordBtn = document.getElementById('stopRecordBtn');
var recordStatusEl = document.getElementById('recordStatus');
var demoBtn = document.getElementById('demoBtn');
var rekamHeadingEl = document.getElementById('rekamHeading');
var rekamInstruksiEl = document.getElementById('rekamInstruksi');
var kualitasEl = document.getElementById('kualitas');
var kualitasPeringatanEl = document.getElementById('kualitasPeringatan');
var abaikanKualitasEl = document.getElementById('abaikanKualitas');
var lewatiAwalEl = document.getElementById('lewatiAwal');


/* ===== Tahap rekam: EEG 1 (baseline) lalu EEG 2 (setelah aktivitas) =====
   Halaman ini dipakai dua kali berturut-turut tanpa pindah halaman: sekali
   buat rekam EEG 1 (baseline, sebelum aktivitas), sekali lagi buat rekam
   EEG 2 (setelah peserta melakukan aktivitas yang diinstruksikan peneliti
   di luar aplikasi ini, misalnya tes memori/aritmatika — lihat
   docs/RingkasanKarya.md). Dipakai dua kali di halaman yang sama (bukan dua
   halaman terpisah) supaya aliran data dari headset tidak perlu disambung
   ulang di antara dua rekaman.

   Nomor tahap dicek dari localStorage waktu halaman dibuka (bukan cuma
   disimpan di variabel), supaya kalau peserta reload halaman di tengah
   alur (misal EEG 1 sudah kesimpan tapi belum sempat rekam EEG 2), tahapnya
   tetap benar begitu halaman dibuka lagi. */
var tahapEeg = ambilHasilKuesioner().eeg1 ? 2 : 1;

function tampilkanTahapEeg() {
  if (tahapEeg === 1) {
    rekamHeadingEl.textContent = 'Rekam Data — EEG 1 (Baseline)';
    rekamInstruksiEl.textContent = 'Pastikan data sudah mengalir dan band power sudah muncul di atas, baru tekan tombol ini. Tekan "Stop Rekam" kapan saja untuk menyelesaikan sesi ini.';
    recordBtn.textContent = 'Mulai Rekam';
  } else {
    rekamHeadingEl.textContent = 'Rekam Data — EEG 2 (Setelah Aktivitas)';
    rekamInstruksiEl.textContent = 'EEG 1 sudah selesai direkam. Sekarang lakukan aktivitas yang diinstruksikan peneliti (misalnya tes memori/aritmatika), lalu tekan tombol ini untuk merekam EEG 2. Tekan "Stop Rekam" kapan saja untuk menyelesaikan sesi ini.';
    recordBtn.textContent = 'Mulai Rekam EEG 2';
  }
}
tampilkanTahapEeg();


/* ===== Cek halaman ini dibuka dengan cara yang benar =====
   Halaman ini HARUS dibuka lewat http://localhost:8080/... (disajikan oleh
   bridge/relay.js), bukan dengan klik dua kali file HTML-nya di file manager.

   Kalau dibuka lewat file://, alamat "/eeg-stream" tidak menunjuk ke mana-mana
   dan datanya tidak akan pernah muncul — tanpa pesan error yang jelas.
   Karena itu kondisinya dicek dari awal dan dijelaskan apa yang harus
   dilakukan, daripada peserta bingung menunggu data yang tidak akan datang. */
var dibukaLewatFile = window.location.protocol === 'file:';


/* ===== Bagian Kartu Band Power ===== */

// Update angka di satu kartu band berdasarkan nilai terbaru.
function updateBandCard(band, value) {
  document.getElementById('band-' + band.key).textContent = formatPower(value);
}

// Kosongkan tampilan semua kartu band (dipanggil saat aliran data terputus)
function resetBandCards() {
  BANDS.forEach(function (band) {
    document.getElementById('band-' + band.key).textContent = '-';
  });
}


/* ===== Bagian Grafik (pakai library Chart.js) ===== */

// Bikin satu grafik garis dengan 5 dataset (satu per band). Tiap dataset
// mulai kosong, nanti diisi sedikit-sedikit tiap ada data band power baru
// (lihat handleBandPower di bawah).
var chart = new Chart(document.getElementById('eegChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: [],
    datasets: BANDS.map(function (band) {
      return {
        label: band.label,
        data: [],
        borderColor: band.color,
        backgroundColor: band.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      };
    })
  },
  options: {
    animation: false, // biar grafik langsung update, tidak nunggu animasi
    scales: {
      x: { display: false }, // sumbu X cuma urutan waktu, tidak perlu label angka
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12 } }
    }
  }
});


/* ===== Bagian Kualitas Sinyal (elektroda menempel dengan baik atau tidak) =====
   SDK resmi mengirim nilai "horseshoe"/HSI untuk tiap elektroda:
   1 = menempel bagus, 2 = sedang, 4 = jelek/lepas.

   Ini penting buat penelitian, bukan cuma hiasan: elektroda yang tidak
   menempel menghasilkan angka band power yang kelihatan wajar di grafik tapi
   sebenarnya sampah. Kalau itu ikut terekam, kesimpulan penelitiannya jadi
   salah tanpa ada tanda-tanda yang kelihatan.

   Makanya tombol "Mulai Rekam" sengaja dikunci selama ada elektroda yang
   jelek. Tapi disediakan juga centang "abaikan", karena kadang di lapangan
   ada satu elektroda yang memang susah bagus (rambut tebal, misalnya) dan
   penelitian tetap harus jalan — lebih baik peneliti memilih itu secara sadar
   daripada terjebak tidak bisa merekam sama sekali. */

var kualitasSekarang = null; // array 4 angka, atau null kalau belum ada data

/* Yang dikunci cuma nilai DI ATAS 2, yaitu elektroda yang benar-benar
   jelek/lepas — nilai 2 ("sedang") tetap boleh direkam.

   Kenapa bukan menuntut semua elektroda bernilai 1: di lapangan itu nyaris
   mustahil, terutama TP9/TP10 yang tertutup rambut. Kalau ambangnya dibuat
   ketat, yang terjadi bukan data jadi lebih bersih, tapi peneliti menghabiskan
   berpuluh menit membetulkan headband sebelum tiap peserta. Untuk penelitian
   stres, itu justru merusak: pesertanya keburu gelisah dan berkeringat, jadi
   baseline yang terekam bukan lagi kondisi netralnya. Data HSI 2 masih layak
   pakai; yang benar-benar merusak band power adalah elektroda yang lepas. */
function adaElektrodaJelek() {
  if (!kualitasSekarang) return false;
  return kualitasSekarang.some(function (nilai) { return nilai > 2; });
}

/* Selama sesi rekam berlangsung, catat nilai TERBURUK yang pernah muncul di
   tiap elektroda, supaya ikut tersimpan bersama hasilnya (lihat selesaiRekam).

   Kenapa nilai terburuk, bukan rata-rata atau nilai terakhir: yang penting
   buat menilai mutu data adalah "seburuk apa dia pernah jadi". Satu elektroda
   yang sempat lepas di tengah rekaman sudah terlanjur mencemari rata-rata band
   power sesi itu, walaupun di akhir sesi kelihatan bagus lagi. Rata-rata akan
   menyamarkan kejadian itu, nilai terakhir tidak akan melihatnya sama sekali.

   Tapi nilai terburuk saja TIDAK CUKUP. Kontak elektroda sering berkedip
   lepas sepersekian detik tanpa kelihatan di layar, jadi kalau cuma nilai
   terburuk yang dicatat, hampir semua sesi akan tercatat "pernah jelek" dan
   kolomnya jadi tidak bisa membedakan apa pun. Makanya dihitung juga berapa
   BANYAK data kualitas yang berstatus jelek dibanding seluruhnya: kedipan
   sekejap dan elektroda yang lepas separuh sesi akan kelihatan jauh berbeda. */
var kualitasTerburuk = null; // array 4 angka selama merekam, atau null
var jumlahCekKualitas = 0; // berapa kali data kualitas masuk selama sesi rekam
var jumlahJelekPerElektroda = [0, 0, 0, 0]; // berapa kali tiap elektroda berstatus jelek

function catatKualitasTerburuk(nilaiKualitas) {
  if (!sedangMerekam || !nilaiKualitas) return;

  jumlahCekKualitas++;
  nilaiKualitas.forEach(function (nilai, i) {
    // Ambang yang sama dengan adaElektrodaJelek(): di atas 2 = jelek/lepas.
    if (nilai > 2) jumlahJelekPerElektroda[i]++;
  });

  if (!kualitasTerburuk) {
    // slice() bikin SALINAN lariknya. Kalau lariknya dipakai langsung, isinya
    // ikut berubah tiap kali data kualitas baru datang, dan "terburuk"-nya
    // jadi tidak ada artinya.
    kualitasTerburuk = nilaiKualitas.slice();
    return;
  }

  nilaiKualitas.forEach(function (nilai, i) {
    if (nilai > kualitasTerburuk[i]) {
      kualitasTerburuk[i] = nilai; // angka lebih besar = kontak lebih buruk
    }
  });
}

function perbaruiKualitas(nilaiKualitas) {
  kualitasSekarang = nilaiKualitas;
  catatKualitasTerburuk(nilaiKualitas);

  if (!nilaiKualitas) {
    kualitasEl.textContent = 'Kualitas sinyal: belum ada data';
    return;
  }

  kualitasEl.textContent = ''; // kosongkan tampilan sebelumnya

  nilaiKualitas.forEach(function (nilai, i) {
    var itemEl = document.createElement('li');
    var status = nilai <= 1 ? 'bagus' : (nilai <= 2 ? 'sedang' : 'jelek');
    itemEl.textContent = NAMA_ELEKTRODA[i] + ': ' + status;
    itemEl.className = 'kualitas-' + status;
    kualitasEl.appendChild(itemEl);
  });

  perbaruiPeringatanKualitas();
}

// Tampilkan/sembunyikan peringatan, lalu kunci atau buka tombol rekam.
// Dipisah jadi fungsi sendiri karena dipanggil dari dua tempat: waktu data
// kualitas baru masuk, dan waktu peneliti mencentang "abaikan".
function perbaruiPeringatanKualitas() {
  var bermasalah = adaElektrodaJelek();

  kualitasPeringatanEl.hidden = !bermasalah;
  recordBtn.disabled = !bolehMulaiRekam();
}

// Satu tempat untuk semua syarat boleh-tidaknya mulai merekam, supaya
// syaratnya tidak tersebar dan tidak saling menimpa. Sebelumnya syarat ini
// ditulis langsung di beberapa tempat dan gampang jadi tidak konsisten.
function bolehMulaiRekam() {
  if (sedangMerekam) return false;
  if (statusKoneksi !== 'connected') return false;
  if (adaElektrodaJelek() && !abaikanKualitasEl.checked) return false;
  return true;
}

abaikanKualitasEl.addEventListener('change', perbaruiPeringatanKualitas);


/* ===== Sesi Rekam Data EEG (durasi bebas, distop manual) =====
   Daripada mengambil satu snapshot band power sesaat, kita rekam sampai
   peserta menekan "Stop Rekam", lalu simpan RATA-RATA band power selama
   jendela waktu itu — supaya hasilnya lebih mewakili kondisi peserta,
   bukan cuma kebetulan satu titik data. Tidak ada batas waktu tetap —
   lama rekaman terserah peserta/peneliti, cuma waktu yang sudah berjalan
   ditampilkan di layar (lihat mulaiRekam).

   Selain rata-rata keseluruhan sesi itu, kita JUGA menyimpan rata-rata per
   potongan waktu INTERVAL_DETIK detik (lihat array intervalHasil) — supaya
   halaman Hasil Akhir bisa menunjukkan tren band power sepanjang sesi
   (dipakai juga untuk cari puncak gelombang Alpha, bukan cuma rata-ratanya
   — lihat docs/RingkasanKarya.md), bukan cuma satu angka datar. Dua
   akumulator ini jalan berbarengan: satu untuk seluruh sesi (jumlahBandPower
   / jumlahSampel), satu lagi untuk potongan waktu yang sedang berjalan
   (jumlahBandPowerInterval / jumlahSampelInterval), yang di-reset tiap kali
   genap INTERVAL_DETIK detik. */

var sedangMerekam = false;
var waktuBerjalanDetik = 0;
var timerRekam = null; // penampung id dari setInterval, supaya bisa dibatalkan
var jumlahBandPower = {}; // total penjumlahan tiap band selama rekaman
var jumlahSampel = 0; // berapa kali data band power masuk selama rekaman
var jumlahBandPowerInterval = {}; // total penjumlahan tiap band, direset tiap INTERVAL_DETIK detik
var jumlahSampelInterval = 0; // jumlah sampel di potongan waktu yang sedang berjalan
var intervalHasil = []; // daftar titik data { detik, delta, theta, alpha, beta, gamma } sepanjang sesi
var sisaMasaTenang = 0; // sisa detik masa tenang; selama masih > 0, sampel yang masuk dibuang

// Hitung rata-rata potongan waktu yang sedang berjalan, simpan sebagai satu
// titik data di intervalHasil, lalu kosongkan akumulatornya supaya siap
// menghitung potongan waktu berikutnya. Dipanggil tiap genap INTERVAL_DETIK
// detik (lihat timerRekam di bawah), dan sekali lagi di selesaiRekam() untuk
// menyimpan sisa potongan terakhir yang belum genap INTERVAL_DETIK detik.
function flushIntervalBucket() {
  if (jumlahSampelInterval === 0) return; // tidak ada data masuk di potongan ini, jangan simpan titik kosong

  var titik = { detik: waktuBerjalanDetik };
  BANDS.forEach(function (band) {
    titik[band.key] = jumlahBandPowerInterval[band.key] / jumlahSampelInterval;
    jumlahBandPowerInterval[band.key] = 0;
  });
  intervalHasil.push(titik);
  jumlahSampelInterval = 0;
}

// Bersiap merekam: kosongkan akumulator, kunci tombol, mulai hitung waktu
// berjalan (naik terus sampai peserta menekan "Stop Rekam").
function mulaiRekam() {
  BANDS.forEach(function (band) {
    jumlahBandPower[band.key] = 0;
    jumlahBandPowerInterval[band.key] = 0;
  });
  jumlahSampel = 0;
  jumlahSampelInterval = 0;
  intervalHasil = [];
  // Catatan mutu sinyal dimulai dari nol tiap sesi.
  kualitasTerburuk = null;
  jumlahCekKualitas = 0;
  jumlahJelekPerElektroda = [0, 0, 0, 0];

  sedangMerekam = true;
  recordBtn.disabled = true;
  stopRecordBtn.hidden = false; // munculkan tombol stop selama rekam berlangsung

  waktuBerjalanDetik = 0;
  sisaMasaTenang = lewatiAwalEl.checked ? DETIK_TENANG : 0;
  perbaruiStatusRekam();

  timerRekam = setInterval(function () {
    /* Selama masa tenang, waktuBerjalanDetik sengaja TIDAK ikut naik. Jadi
       "detik ke-10" di file hasil selalu berarti sepuluh detik setelah
       pengumpulan data betul-betul dimulai, bukan sepuluh detik setelah
       tombolnya ditekan. Tanpa ini, rekaman dengan masa tenang dan rekaman
       tanpa masa tenang punya arti sumbu waktu yang berbeda, dan grafik
       trennya jadi tidak bisa dibandingkan satu sama lain. */
    if (sisaMasaTenang > 0) {
      sisaMasaTenang--;
      perbaruiStatusRekam();
      return;
    }

    waktuBerjalanDetik++;
    perbaruiStatusRekam();

    if (waktuBerjalanDetik % INTERVAL_DETIK === 0) {
      flushIntervalBucket();
    }
  }, 1000);
}

// Satu tempat untuk tulisan status di bawah tombol rekam, supaya kalimat
// masa tenang dan kalimat sedang-merekam tidak ditulis ulang di banyak tempat
// lalu lama-lama jadi tidak konsisten.
function perbaruiStatusRekam() {
  if (sisaMasaTenang > 0) {
    recordStatusEl.textContent = 'Masa tenang... ' + sisaMasaTenang +
      ' detik lagi sebelum perekaman dimulai. Duduk santai dulu.';
    return;
  }
  recordStatusEl.textContent = 'Merekam... ' + waktuBerjalanDetik + ' detik berjalan';
}
recordBtn.addEventListener('click', mulaiRekam);

// Peserta menekan "Stop Rekam": hentikan hitung waktu, lalu hitung
// rata-rata dan simpan (lihat selesaiRekam). Beda dengan aliran data yang
// terputus — di sini aliran datanya TIDAK ikut berhenti.
stopRecordBtn.addEventListener('click', selesaiRekam);

// Peserta menekan Stop: hentikan timer, hitung rata-rata, simpan ke
// localStorage. Kalau ini baru selesai EEG 1, lanjut ke tahap EEG 2 di
// halaman yang sama (lihat blok "Tahap rekam" di atas). Kalau ini baru
// selesai EEG 2, pindah ke halaman Hasil Akhir.
function selesaiRekam() {
  clearInterval(timerRekam);
  sedangMerekam = false;
  stopRecordBtn.hidden = true;

  /* Distop sebelum masa tenang habis. Belum ada satu sampel pun yang
     terkumpul, jadi ini diperlakukan sebagai BATAL, bukan sebagai sesi kosong.

     Bedanya penting: kalau diteruskan, jumlahSampel masih 0 sehingga hasilEeg
     bernilai null, dan null itu akan disimpan menimpa hasil sesi ini — untuk
     EEG 2 artinya peserta langsung dilempar ke halaman Hasil Akhir dengan
     data yang hilang. Salah pencet selama menunggu tidak boleh sampai
     menghapus rekaman. */
  if (sisaMasaTenang > 0) {
    sisaMasaTenang = 0;
    recordStatusEl.textContent = 'Perekaman dibatalkan — masa tenang belum selesai, belum ada data yang terkumpul.';
    recordBtn.disabled = !bolehMulaiRekam();
    return;
  }

  /* Sisa potongan waktu terakhir yang belum genap INTERVAL_DETIK detik.

     Dulu potongan sisa ini SELALU disimpan, dan itu bikin masalah nyata di
     data rekaman pertama: sesi yang distop di detik 100 sekian menghasilkan
     dua baris berlabel "detik 100" — satu dari potongan 90-100 yang utuh,
     satu lagi dari sisa nol koma sekian detik sesudahnya. Baris sisa itu
     cuma berisi segelintir sampel, jadi angkanya jauh lebih goyah daripada
     tetangganya, dan sendirian dia menarik rata-rata baseline dari 3,105 ke
     2,934. Di Excel dua baris itu terlihat seperti dua pengukuran pada detik
     yang sama, tanpa ada yang menandakan bahwa yang satu jauh lebih pendek.

     Jadi potongan sisa cuma disimpan kalau panjangnya minimal setengah
     interval. Kecualinya: kalau sampai selesai belum ada satu titik pun
     tersimpan (rekaman yang sangat pendek), potongan sisa tetap disimpan —
     satu titik yang pendek masih lebih berguna daripada grafik kosong. */
  var detikSisa = waktuBerjalanDetik % INTERVAL_DETIK;
  if (detikSisa >= INTERVAL_DETIK / 2 || intervalHasil.length === 0) {
    flushIntervalBucket();
  }

  var hasilEeg = null;

  if (jumlahSampel > 0) {
    hasilEeg = {};
    BANDS.forEach(function (band) {
      var rataRata = jumlahBandPower[band.key] / jumlahSampel;
      // "raw" (angka mentah, belum dibulatkan) disimpan terpisah dari
      // "value" (teks siap tampil) supaya halaman Hasil Akhir bisa hitung
      // rasio Theta/Beta secara presisi, tanpa harus parsing balik teks.
      hasilEeg[band.key] = { value: formatPower(rataRata), raw: rataRata };
    });
    // Titik-titik data per INTERVAL_DETIK detik sepanjang sesi ini, dipakai
    // halaman Hasil Akhir untuk grafik tren dan untuk cari puncak Alpha.
    hasilEeg.interval = intervalHasil;

    /* Catatan mutu data: seburuk apa kontak elektroda pernah jadi selama sesi
       ini, dan apakah peneliti sengaja menembus kunci kualitas lewat centang
       "abaikan". Ini ikut disimpan supaya angka band power di atas tidak
       pernah berdiri sendiri tanpa konteks — tanpa catatan ini, data yang
       diambil dengan satu elektroda lepas kelihatan persis sama sahihnya
       dengan data yang diambil dalam kondisi sempurna, dan tidak akan ada
       yang bisa membedakannya waktu hasilnya dianalisis nanti. */
    hasilEeg.kualitas = {
      terburuk: kualitasTerburuk,
      persenJelek: jumlahJelekPerElektroda.map(function (jumlah) {
        // Kalau tidak ada satu pun data kualitas yang masuk, jangan bagi
        // dengan nol — hasilnya NaN dan bikin file CSV-nya kotor.
        if (jumlahCekKualitas === 0) return null;
        return (jumlah / jumlahCekKualitas) * 100;
      }),
      diabaikan: abaikanKualitasEl.checked
    };
  }

  if (tahapEeg === 1) {
    simpanHasilKuesioner('eeg1', hasilEeg);
    tahapEeg = 2;
    tampilkanTahapEeg();
    recordBtn.disabled = !bolehMulaiRekam();
    recordStatusEl.textContent = 'EEG 1 selesai direkam.';
  } else {
    simpanHasilKuesioner('eeg2', hasilEeg);
    window.location.href = 'hasilakhir.html';
  }
}


/* ===== Menampilkan status koneksi ===== */

var statusKoneksi = 'disconnected';

// Ditulis sebagai fungsi bernama (bukan langsung di dalam penerima pesan SSE)
// supaya bisa dipanggil ulang secara manual oleh tombol Demo di bawah.
function handleStatusChange(text, state) {
  statusKoneksi = state;
  statusEl.textContent = 'Status: ' + text;
  // Tandai secara visual (bukan cuma lewat teks) kalau statusnya error,
  // supaya kelihatan beda dari status biasa seperti "menghubungkan..."
  statusEl.classList.toggle('status-error', state === 'error');
  connectBtn.disabled = state === 'connecting';

  // Tombol rekam cuma boleh ditekan kalau data sedang mengalir, sinyalnya
  // layak, dan tidak sedang merekam (lihat bolehMulaiRekam).
  recordBtn.disabled = !bolehMulaiRekam();
}


/* ===== Menerima data dari bridge (SSE) =====
   EventSource itu fitur bawaan browser untuk menerima aliran pesan dari
   server lewat HTTP biasa. Kelebihannya buat kita: kalau relay-nya di-restart
   atau WiFi sempat putus, browser menyambung ulang SENDIRI tanpa perlu kode
   tambahan — cocok untuk sesi lab yang bisa saja tercolok-cabut. */

var sumberData = null;

function hubungkanKeBridge() {
  if (dibukaLewatFile) {
    handleStatusChange(
      'halaman ini dibuka langsung dari file. Jalankan "node bridge/relay.js" lalu buka http://localhost:8080/pages/eegmonitor.html',
      'error'
    );
    return;
  }

  if (sumberData) sumberData.close(); // tutup koneksi lama sebelum bikin baru

  handleStatusChange('menghubungkan ke bridge...', 'connecting');
  sumberData = new EventSource('/eeg-stream');

  sumberData.onmessage = function (event) {
    var pesan = JSON.parse(event.data);

    if (pesan.tipe === 'status') {
      terimaStatusDariRelay(pesan);
    } else if (pesan.tipe === 'bandpower') {
      handleBandPower(pesan.powers);
      perbaruiKualitas(pesan.kualitas);
      if (pesan.battery !== null && pesan.battery !== undefined) {
        batteryEl.textContent = 'Battery: ' + Math.round(pesan.battery) + '%';
      }
    } else if (pesan.tipe === 'jaringan') {
      tampilkanJejakJaringan(pesan);
    }
  };

  sumberData.onerror = function () {
    // Ini berarti browser tidak bisa menghubungi relay-nya sama sekali
    // (relay belum dijalankan, atau baru saja dimatikan). Browser akan
    // mencoba menyambung lagi sendiri, jadi di sini cukup memberi tahu.
    handleStatusChange('bridge tidak bisa dihubungi. Pastikan "node bridge/relay.js" sedang jalan.', 'error');
  };
}

// Relay memberi tahu apakah data dari HP sedang mengalir atau tidak.
// Perhatikan bedanya dengan onerror di atas: yang ini artinya relay-nya
// hidup dan bisa dihubungi, tapi HP-nya yang belum mengirim apa-apa.
function terimaStatusDariRelay(pesan) {
  handleStatusChange(pesan.teks, pesan.state);

  if (pesan.state !== 'connected') {
    kosongkanTampilan();
  }
}

/* Bukti bahwa paket dari HP pernah sampai ke relay.

   Perhatikan: baris ini sengaja TIDAK ikut dihapus kosongkanTampilan(). Dia
   catatan sejarah ("jam sekian pernah sampai"), bukan status hidup-mati —
   dan justru di situ gunanya. Tombol Send Test di aplikasi cuma mengirim
   paket sekali, jadi status "Terhubung" yang biasa cuma menyala sekitar dua
   detik lalu padam lagi. Tanpa baris yang menetap ini, klien yang kebetulan
   tidak sedang menatap layar akan menyimpulkan Send Test-nya gagal, padahal
   jaringannya justru baru saja terbukti jalan. */
function tampilkanJejakJaringan(pesan) {
  // Relay mengirim angka epoch; jam-nya dirangkai di sini supaya yang tampil
  // adalah jam di komputer yang sedang dipakai, bukan jam server (UTC).
  var jam = new Date(pesan.waktu).toLocaleTimeString('id-ID');

  jejakJaringanEl.textContent =
    'Paket dari HP (' + pesan.ip + ') pernah sampai jam ' + jam + ' — jaringan OK.';
  jejakJaringanEl.hidden = false;
}

// Aliran data berhenti -> kosongkan semua tampilan supaya tidak ada angka
// basi yang menempel di layar dan disangka masih data terbaru.
function kosongkanTampilan() {
  resetBandCards();
  chart.data.labels = [];
  chart.data.datasets.forEach(function (ds) { ds.data = []; });
  chart.update('none');
  perbaruiKualitas(null);
  batteryEl.textContent = 'Battery -'; // jangan biarkan persen terakhir menempel seolah masih terbaru

  // Kalau aliran data putus di tengah sesi rekam, batalkan rekamannya supaya
  // tidak nyangkut di status "Merekam..." selamanya
  if (sedangMerekam) {
    clearInterval(timerRekam);
    sedangMerekam = false;
    stopRecordBtn.hidden = true;
    recordStatusEl.textContent = 'Rekaman dibatalkan karena aliran data terputus.';
  }
}

// Tombol ini sebenarnya jarang dibutuhkan, karena EventSource menyambung
// ulang sendiri. Disediakan untuk keadaan yang benar-benar mentok — misalnya
// relay-nya baru saja dijalankan setelah halaman ini terlanjur dibuka.
connectBtn.addEventListener('click', hubungkanKeBridge);

// Langsung sambung begitu halaman dibuka. Tidak ada yang perlu diklik
// peserta: kalau relay dan HP-nya sudah siap, datanya langsung muncul.
hubungkanKeBridge();


/* ===== Mengolah data band power yang masuk ===== */

// Update angka di tiap kartu band (Delta/Theta/dst) sesuai data band power
// yang baru masuk.
function perbaruiKartuBand(powers) {
  BANDS.forEach(function (band) {
    updateBandCard(band, powers[band.key]);
  });
}

// Tambahkan satu titik data baru ke tiap garis di grafik, buang titik
// paling lama kalau sudah kepenuhan (supaya grafik selalu menampilkan
// MAX_POINTS data paling baru saja, tidak melebar terus-menerus)
function tambahTitikGrafik(powers) {
  BANDS.forEach(function (band, i) {
    var data = chart.data.datasets[i].data;
    data.push(powers[band.key]);
    if (data.length > MAX_POINTS) {
      data.shift(); // buang titik paling lama (paling kiri di grafik)
    }
  });
  chart.data.labels = chart.data.datasets[0].data.map(function (_, i) { return i; });
  chart.update('none'); // 'none' = gambar ulang tanpa animasi transisi
}

// Kalau sedang dalam sesi rekam, tambahkan sampel ini ke akumulator
// supaya nanti bisa dirata-ratakan di selesaiRekam()
function tambahSampelJikaSedangRekam(powers) {
  if (!sedangMerekam) return;
  // Masa tenang belum habis: data yang masuk tetap tampil di layar dan di
  // grafik (supaya peneliti bisa memantau kualitas sinyal sambil menunggu),
  // tapi sengaja tidak ikut dijumlahkan ke hasil.
  if (sisaMasaTenang > 0) return;

  BANDS.forEach(function (band) {
    jumlahBandPower[band.key] += powers[band.key];
    jumlahBandPowerInterval[band.key] += powers[band.key];
  });
  jumlahSampel++;
  jumlahSampelInterval++;
}

// Data band power baru datang (dikirim relay ~10 kali per detik).
// Sama seperti handleStatusChange, dipisah jadi fungsi bernama supaya bisa
// "disuapi" data palsu oleh tombol Demo, seolah-olah data itu datang dari
// headset asli.
//
// Fungsi ini sendiri cuma daftar 3 langkah — detail tiap langkah dipisah
// ke fungsi sendiri-sendiri di atas, supaya masing-masing bisa dibaca dan
// dipahami satu per satu tanpa harus mikirin ketiganya sekaligus.
function handleBandPower(powers) {
  perbaruiKartuBand(powers);
  tambahTitikGrafik(powers);
  tambahSampelJikaSedangRekam(powers);
}


/* ===== Peringatan kalau halaman ditutup/ditinggalkan saat sedang merekam =====
   Tanpa ini, peserta bisa tidak sengaja pindah/menutup tab di tengah sesi
   rekam dan seluruh data yang sudah terkumpul hilang begitu saja tanpa
   peringatan. Browser akan menampilkan dialog konfirmasi bawaannya sendiri
   kalau sedangMerekam bernilai true. */
window.addEventListener('beforeunload', function (event) {
  if (sedangMerekam) {
    event.preventDefault();
    event.returnValue = ''; // sebagian browser mewajibkan baris ini diisi
  }
});


/* ===== Tombol Demo (khusus development, tanpa headset asli) =====
   Kalau belum ada headset fisik di tangan, tombol ini bikin halaman
   "berpura-pura" terhubung dan mengirim band power acak, supaya sisa alur
   (kartu, grafik, rekam data, sampai ke hasilakhir.html) tetap bisa dites.

   Bedanya dengan bridge/simulate-osc.js: simulator itu meniru HP-nya, jadi
   ikut menguji relay dan parsing OSC-nya juga. Tombol Demo ini lebih dangkal
   — dia melewati relay sama sekali, cuma menguji tampilan halaman ini.
   Keduanya berguna: Demo buat cek cepat tampilan, simulator buat cek rantai
   datanya benar-benar nyambung. */

// Buat angka band power acak, cuma buat simulasi waktu belum ada headset
// fisik. Range-nya sekadar mendekati skala data asli, BUKAN data EEG asli.
function buatDataDummy() {
  var powers = {};
  BANDS.forEach(function (band) {
    powers[band.key] = Math.random() * 2 + 0.1;
  });
  return powers;
}

demoBtn.addEventListener('click', function () {
  demoBtn.disabled = true;
  connectBtn.disabled = true; // cegah nyoba sambung ke bridge bareng demo jalan

  if (sumberData) sumberData.close(); // hentikan data asli supaya tidak campur

  handleStatusChange('Terhubung (data dummy, khusus development)', 'connected');
  batteryEl.textContent = 'Battery: 85% (dummy)';
  perbaruiKualitas([1, 1, 1, 1]); // pura-pura semua elektroda menempel bagus

  // ~2x per detik, mirip kecepatan data asli dari headset. Tidak perlu
  // tombol "stop" — interval ini otomatis berhenti begitu halaman
  // berpindah (misalnya redirect ke hasilakhir.html setelah rekam selesai).
  var timerDemo = setInterval(function () {
    handleBandPower(buatDataDummy());
  }, 500);
});
