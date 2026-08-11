/* eeg.js — kode utama halaman eegmonitor.html
   ==========================================================
   Semua urusan Bluetooth, decode sinyal EEG, dan hitung FFT band power
   sudah ditangani oleh library eksternal MuseSGen2 (lihat eegmonitor.html,
   di-load dari file musesgen2/script.js). Anggap library itu seperti
   "driver hardware": rumit di dalamnya, tapi cara pakainya sederhana —
   kita tinggal dengar beberapa event lewat muse.onXxx(...).

   Tugas file ini ada 4:
   1. Menyambungkan tombol Connect/Disconnect ke library
   2. Menampilkan status koneksi & battery ke halaman
   3. Menampilkan band power ke kartu + grafik garis
   4. Merekam data sampai peserta menekan "Stop Rekam", dua kali
      berturut-turut (EEG 1 lalu EEG 2 — lihat blok "Tahap rekam" di
      bawah), baru lalu pindah ke halaman Hasil Akhir (lihat hasilakhir.html)

   Grafiknya digambar pakai library eksternal Chart.js (di-load dari CDN
   di eegmonitor.html), diperlakukan sama seperti MuseSGen2: kita cuma isi
   data/options-nya lewat API-nya (chart.data, chart.update(), dst),
   tidak perlu tahu cara Chart.js menggambar garis di dalamnya. */


// --- Konstanta ---
var MAX_POINTS = 60; // jumlah titik riwayat yang ditampilkan di grafik


// --- Ambil elemen-elemen HTML yang isinya akan kita ubah lewat JS ---
var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var batteryEl = document.getElementById('battery');
var recordBtn = document.getElementById('recordBtn');
var stopRecordBtn = document.getElementById('stopRecordBtn');
var recordStatusEl = document.getElementById('recordStatus');
var demoBtn = document.getElementById('demoBtn');
var rekamHeadingEl = document.getElementById('rekamHeading');
var rekamInstruksiEl = document.getElementById('rekamInstruksi');


// --- Objek utama dari library MuseSGen2 ---
var muse = new MuseSGen2();


/* ===== Tahap rekam: EEG 1 (baseline) lalu EEG 2 (setelah aktivitas) =====
   Halaman ini dipakai dua kali berturut-turut tanpa pindah halaman: sekali
   buat rekam EEG 1 (baseline, sebelum aktivitas), sekali lagi buat rekam
   EEG 2 (setelah peserta melakukan aktivitas yang diinstruksikan peneliti
   di luar aplikasi ini, misalnya tes memori/aritmatika — lihat
   docs/RingkasanKarya.md). Dipakai dua kali di halaman yang sama (bukan dua
   halaman terpisah) supaya koneksi Bluetooth ke headset tidak perlu
   disambung ulang di antara dua rekaman.

   Nomor tahap dicek dari localStorage waktu halaman dibuka (bukan cuma
   disimpan di variabel), supaya kalau peserta reload halaman di tengah
   alur (misal EEG 1 sudah kesimpan tapi belum sempat rekam EEG 2), tahapnya
   tetap benar begitu halaman dibuka lagi. */
var tahapEeg = ambilHasilKuesioner().eeg1 ? 2 : 1;

function tampilkanTahapEeg() {
  if (tahapEeg === 1) {
    rekamHeadingEl.textContent = 'Rekam Data — EEG 1 (Baseline)';
    rekamInstruksiEl.textContent = 'Pastikan sudah terhubung ke headset dan band power sudah muncul di atas, baru tekan tombol ini. Tekan "Stop Rekam" kapan saja untuk menyelesaikan sesi ini.';
    recordBtn.textContent = 'Mulai Rekam';
  } else {
    rekamHeadingEl.textContent = 'Rekam Data — EEG 2 (Setelah Aktivitas)';
    rekamInstruksiEl.textContent = 'EEG 1 sudah selesai direkam. Sekarang lakukan aktivitas yang diinstruksikan peneliti (misalnya tes memori/aritmatika), lalu tekan tombol ini untuk merekam EEG 2. Tekan "Stop Rekam" kapan saja untuk menyelesaikan sesi ini.';
    recordBtn.textContent = 'Mulai Rekam EEG 2';
  }
}
tampilkanTahapEeg();


/* ===== Cek dukungan Bluetooth di browser ini =====
   Fitur Web Bluetooth (yang dipakai library MuseSGen2 buat konek ke
   headset) cuma didukung Chrome/Edge, dan cuma jalan kalau halamannya
   dibuka lewat HTTPS (atau localhost). Kalau tidak didukung, mending
   kasih tahu dari awal daripada tombol Connect ditekan tapi tidak
   terjadi apa-apa tanpa penjelasan. */
if (!navigator.bluetooth) {
  statusEl.textContent = 'Status: browser ini tidak mendukung Bluetooth. Buka halaman ini pakai Chrome atau Edge.';
  connectBtn.disabled = true;
}


/* ===== Bagian Kartu Band Power ===== */

// Update angka di satu kartu band berdasarkan nilai terbaru.
function updateBandCard(band, value) {
  document.getElementById('band-' + band.key).textContent = MuseSGen2.formatPower(value);
}

// Kosongkan tampilan semua kartu band (dipanggil saat headset terputus)
function resetBandCards() {
  MuseSGen2.BANDS.forEach(function (band) {
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
    datasets: MuseSGen2.BANDS.map(function (band) {
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


/* ===== Sesi Rekam Data EEG (durasi bebas, distop manual) =====
   Daripada mengambil satu snapshot band power sesaat, kita rekam sampai
   peserta menekan "Stop Rekam", lalu simpan RATA-RATA band power selama
   jendela waktu itu — supaya hasilnya lebih mewakili kondisi peserta,
   bukan cuma kebetulan satu titik data. Tidak ada batas waktu tetap —
   lama rekaman terserah peserta/peneliti, cuma waktu yang sudah berjalan
   ditampilkan di layar (lihat mulaiRekam). */

var sedangMerekam = false;
var waktuBerjalanDetik = 0;
var timerRekam = null; // penampung id dari setInterval, supaya bisa dibatalkan
var jumlahBandPower = {}; // total penjumlahan tiap band selama rekaman
var jumlahSampel = 0; // berapa kali onBandPower menembak selama rekaman

// Bersiap merekam: kosongkan akumulator, kunci tombol, mulai hitung waktu
// berjalan (naik terus sampai peserta menekan "Stop Rekam").
function mulaiRekam() {
  MuseSGen2.BANDS.forEach(function (band) {
    jumlahBandPower[band.key] = 0;
  });
  jumlahSampel = 0;

  sedangMerekam = true;
  recordBtn.disabled = true;
  stopRecordBtn.hidden = false; // munculkan tombol stop selama rekam berlangsung

  waktuBerjalanDetik = 0;
  recordStatusEl.textContent = 'Merekam... ' + waktuBerjalanDetik + ' detik berjalan';

  timerRekam = setInterval(function () {
    waktuBerjalanDetik++;
    recordStatusEl.textContent = 'Merekam... ' + waktuBerjalanDetik + ' detik berjalan';
  }, 1000);
}
recordBtn.addEventListener('click', mulaiRekam);

// Peserta menekan "Stop Rekam": hentikan hitung waktu, lalu hitung
// rata-rata dan simpan (lihat selesaiRekam). Beda dengan muse.onReset di
// bawah — di sini koneksi headset TIDAK ikut terputus.
stopRecordBtn.addEventListener('click', selesaiRekam);

// Peserta menekan Stop: hentikan timer, hitung rata-rata, simpan ke
// localStorage. Kalau ini baru selesai EEG 1, lanjut ke tahap EEG 2 di
// halaman yang sama (lihat blok "Tahap rekam" di atas). Kalau ini baru
// selesai EEG 2, pindah ke halaman Hasil Akhir.
function selesaiRekam() {
  clearInterval(timerRekam);
  sedangMerekam = false;
  stopRecordBtn.hidden = true;

  var hasilEeg = null;

  if (jumlahSampel > 0) {
    hasilEeg = {};
    MuseSGen2.BANDS.forEach(function (band) {
      var rataRata = jumlahBandPower[band.key] / jumlahSampel;
      // "raw" (angka mentah, belum dibulatkan) disimpan terpisah dari
      // "value" (teks siap tampil) supaya halaman Hasil Akhir bisa hitung
      // rasio Theta/Beta secara presisi, tanpa harus parsing balik teks.
      hasilEeg[band.key] = { value: MuseSGen2.formatPower(rataRata), raw: rataRata };
    });
  }

  if (tahapEeg === 1) {
    simpanHasilKuesioner('eeg1', hasilEeg);
    tahapEeg = 2;
    tampilkanTahapEeg();
    recordBtn.disabled = false;
    recordStatusEl.textContent = 'EEG 1 selesai direkam.';
  } else {
    simpanHasilKuesioner('eeg2', hasilEeg);
    window.location.href = 'hasilakhir.html';
  }
}


/* ===== Hubungkan tombol Connect/Disconnect ===== */

connectBtn.addEventListener('click', function () {
  if (muse.isConnected) {
    muse.disconnect();
  } else {
    muse.connect();
  }
});


/* ===== Dengarkan event-event dari library MuseSGen2 ===== */

// Status koneksi berubah (menghubungkan / terhubung / terputus / error).
// Ditulis sebagai fungsi bernama (bukan langsung di dalam muse.onStatusChange)
// supaya bisa dipanggil ulang secara manual oleh tombol Demo di bawah.
function handleStatusChange(text, state) {
  statusEl.textContent = 'Status: ' + text;
  // Tandai secara visual (bukan cuma lewat teks) kalau statusnya error,
  // supaya kelihatan beda dari status biasa seperti "menghubungkan..."
  statusEl.classList.toggle('status-error', state === 'error');
  connectBtn.disabled = state === 'connecting';
  connectBtn.textContent = state === 'connected' ? 'Disconnect' : 'Connect ke Muse';

  // Tombol rekam cuma boleh ditekan kalau sudah terhubung, dan tetap
  // terkunci selama proses rekam sedang berjalan.
  recordBtn.disabled = state !== 'connected' || sedangMerekam;
}
muse.onStatusChange(handleStatusChange);

// Persentase baterai headset berubah
muse.onBattery(function (percent) {
  batteryEl.textContent = 'Battery: ' + Math.round(percent) + '%';
});

// Update angka di tiap kartu band (Delta/Theta/dst) sesuai data band power
// yang baru masuk.
function perbaruiKartuBand(powers) {
  MuseSGen2.BANDS.forEach(function (band) {
    updateBandCard(band, powers[band.key]);
  });
}

// Tambahkan satu titik data baru ke tiap garis di grafik, buang titik
// paling lama kalau sudah kepenuhan (supaya grafik selalu menampilkan
// MAX_POINTS data paling baru saja, tidak melebar terus-menerus)
function tambahTitikGrafik(powers) {
  MuseSGen2.BANDS.forEach(function (band, i) {
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

  MuseSGen2.BANDS.forEach(function (band) {
    jumlahBandPower[band.key] += powers[band.key];
  });
  jumlahSampel++;
}

// Data band power baru datang (dikirim library beberapa kali per detik).
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
muse.onBandPower(handleBandPower);

// Headset baru saja terputus -> kosongkan semua tampilan
muse.onReset(function () {
  resetBandCards();
  chart.data.labels = [];
  chart.data.datasets.forEach(function (ds) { ds.data = []; });
  chart.update('none');

  // Kalau koneksi putus di tengah sesi rekam, batalkan rekamannya supaya
  // tidak nyangkut di status "Merekam..." selamanya
  if (sedangMerekam) {
    clearInterval(timerRekam);
    sedangMerekam = false;
    stopRecordBtn.hidden = true;
    recordStatusEl.textContent = '';
  }
});

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
   (kartu, grafik, rekam data, sampai ke hasilakhir.html) tetap bisa dites. */

// Buat angka band power acak, cuma buat simulasi waktu belum ada headset
// fisik. Range-nya sekadar mendekati skala data asli, BUKAN data EEG asli.
function buatDataDummy() {
  var powers = {};
  MuseSGen2.BANDS.forEach(function (band) {
    powers[band.key] = Math.random() * 2 + 0.1;
  });
  return powers;
}

demoBtn.addEventListener('click', function () {
  demoBtn.disabled = true;
  connectBtn.disabled = true; // cegah nyoba connect asli bareng demo jalan

  handleStatusChange('Terhubung (data dummy, khusus development)', 'connected');
  batteryEl.textContent = 'Battery: 85% (dummy)';

  // ~2x per detik, mirip kecepatan data asli dari headset. Tidak perlu
  // tombol "stop" — interval ini otomatis berhenti begitu halaman
  // berpindah (misalnya redirect ke hasilakhir.html setelah rekam selesai).
  var timerDemo = setInterval(function () {
    handleBandPower(buatDataDummy());
  }, 500);
});
