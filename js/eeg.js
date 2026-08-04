/* eeg.js — kode utama halaman eeg.html
   ==========================================================
   Semua urusan Bluetooth, decode sinyal EEG, dan hitung FFT band power
   sudah ditangani oleh library eksternal MuseSGen2 (lihat eeg.html,
   di-load dari file musesgen2/script.js). Anggap library itu seperti
   "driver hardware": rumit di dalamnya, tapi cara pakainya sederhana —
   kita tinggal dengar beberapa event lewat muse.onXxx(...).

   Tugas file ini ada 4:
   1. Menyambungkan tombol Connect/Disconnect ke library
   2. Menampilkan status koneksi & battery ke halaman
   3. Menampilkan band power ke kartu + grafik garis
   4. Merekam data selama 1 menit, lalu simpan rata-ratanya dan pindah ke
      halaman Hasil Akhir (lihat hasil.html)

   Grafiknya digambar pakai library eksternal Chart.js (di-load dari CDN
   di eeg.html), diperlakukan sama seperti MuseSGen2: kita cuma isi
   data/options-nya lewat API-nya (chart.data, chart.update(), dst),
   tidak perlu tahu cara Chart.js menggambar garis di dalamnya. */


// --- Konstanta ---
var MAX_POINTS = 60; // jumlah titik riwayat yang ditampilkan di grafik
var DURASI_REKAM_DETIK = 60; // lama sesi rekam data EEG, dalam detik


// --- Ambil elemen-elemen HTML yang isinya akan kita ubah lewat JS ---
var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var batteryEl = document.getElementById('battery');
var recordBtn = document.getElementById('recordBtn');
var cancelRecordBtn = document.getElementById('cancelRecordBtn');
var recordStatusEl = document.getElementById('recordStatus');
var demoBtn = document.getElementById('demoBtn');


// --- Objek utama dari library MuseSGen2 ---
var muse = new MuseSGen2();


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

// Update satu kartu band (angka + panjang bar) berdasarkan nilai terbaru.
// maxValueAllBands dipakai supaya panjang bar itu relatif: band dengan
// nilai tertinggi saat itu barnya penuh (100%), yang lain proporsional.
function updateBandCard(band, value, maxValueAllBands) {
  var valueEl = document.getElementById('band-' + band.key);
  var barEl = document.getElementById('bar-' + band.key);

  valueEl.textContent = MuseSGen2.formatPower(value);
  barEl.style.width = persenBar(value, maxValueAllBands) + '%';
}

// Ubah satu nilai band jadi persen panjang bar (0-100), relatif terhadap
// nilai band tertinggi saat itu. Dipakai baik untuk update kartu band power
// secara live, maupun saat menghitung hasil akhir rekaman.
function persenBar(value, maxValueAllBands) {
  return Math.min(100, (value / maxValueAllBands) * 100);
}

// Kosongkan tampilan semua kartu band (dipanggil saat headset terputus)
function resetBandCards() {
  MuseSGen2.BANDS.forEach(function (band) {
    document.getElementById('band-' + band.key).textContent = '-';
    document.getElementById('bar-' + band.key).style.width = '0%';
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


/* ===== Sesi Rekam Data EEG (1 menit) =====
   Daripada mengambil satu snapshot band power sesaat, kita rekam selama
   DURASI_REKAM_DETIK detik lalu simpan RATA-RATA band power selama jendela
   waktu itu — supaya hasilnya lebih mewakili kondisi peserta, bukan cuma
   kebetulan satu titik data. */

var sedangMerekam = false;
var sisaWaktuDetik = 0;
var timerRekam = null; // penampung id dari setInterval, supaya bisa dibatalkan
var jumlahBandPower = {}; // total penjumlahan tiap band selama rekaman
var jumlahSampel = 0; // berapa kali onBandPower menembak selama rekaman

// Bersiap merekam: kosongkan akumulator, kunci tombol, mulai hitung mundur.
function mulaiRekam() {
  MuseSGen2.BANDS.forEach(function (band) {
    jumlahBandPower[band.key] = 0;
  });
  jumlahSampel = 0;

  sedangMerekam = true;
  recordBtn.disabled = true;
  cancelRecordBtn.hidden = false; // munculkan tombol batal selama rekam berlangsung

  sisaWaktuDetik = DURASI_REKAM_DETIK;
  recordStatusEl.textContent = 'Merekam... sisa ' + sisaWaktuDetik + ' detik';

  timerRekam = setInterval(function () {
    sisaWaktuDetik--;
    if (sisaWaktuDetik <= 0) {
      clearInterval(timerRekam);
      selesaiRekam();
    } else {
      recordStatusEl.textContent = 'Merekam... sisa ' + sisaWaktuDetik + ' detik';
    }
  }, 1000);
}

// Peserta menekan "Batalkan Rekam" di tengah sesi: hentikan hitung mundur,
// buang data yang sudah terkumpul, dan kembalikan tombol ke keadaan semula
// TANPA memutus koneksi headset (beda dengan muse.onReset di bawah).
function batalkanRekam() {
  clearInterval(timerRekam);
  sedangMerekam = false;
  recordBtn.disabled = false;
  cancelRecordBtn.hidden = true;
  recordStatusEl.textContent = 'Rekaman dibatalkan.';
}
cancelRecordBtn.addEventListener('click', batalkanRekam);

// Waktu rekam habis: hitung rata-rata, simpan ke localStorage, lalu pindah
// ke halaman Hasil Akhir.
function selesaiRekam() {
  sedangMerekam = false;
  cancelRecordBtn.hidden = true;

  var hasilEeg = null;

  if (jumlahSampel > 0) {
    var rataRata = {};
    MuseSGen2.BANDS.forEach(function (band) {
      rataRata[band.key] = jumlahBandPower[band.key] / jumlahSampel;
    });

    var maxValueRataRata = 1e-9;
    MuseSGen2.BANDS.forEach(function (band) {
      if (rataRata[band.key] > maxValueRataRata) maxValueRataRata = rataRata[band.key];
    });

    hasilEeg = {};
    MuseSGen2.BANDS.forEach(function (band) {
      hasilEeg[band.key] = {
        value: MuseSGen2.formatPower(rataRata[band.key]),
        percent: persenBar(rataRata[band.key], maxValueRataRata)
      };
    });
  }

  simpanHasilKuesioner('eeg', hasilEeg);
  window.location.href = 'hasil.html';
}

recordBtn.addEventListener('click', mulaiRekam);


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
  // terkunci selama proses rekam 1 menit sedang berjalan.
  recordBtn.disabled = state !== 'connected' || sedangMerekam;
}
muse.onStatusChange(handleStatusChange);

// Persentase baterai headset berubah
muse.onBattery(function (percent) {
  batteryEl.textContent = 'Battery: ' + Math.round(percent) + '%';
});

// Update angka & panjang bar di tiap kartu band (Delta/Theta/dst) sesuai
// data band power yang baru masuk.
function perbaruiKartuBand(powers) {
  // Cari nilai tertinggi di antara 5 band pada sampel saat ini,
  // dipakai sebagai skala panjang bar di kartu (lihat updateBandCard)
  var maxValueNow = 1e-9;
  MuseSGen2.BANDS.forEach(function (band) {
    if (powers[band.key] > maxValueNow) maxValueNow = powers[band.key];
  });

  MuseSGen2.BANDS.forEach(function (band) {
    updateBandCard(band, powers[band.key], maxValueNow);
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
    cancelRecordBtn.hidden = true;
    recordStatusEl.textContent = '';
  }
});

/* ===== Peringatan kalau halaman ditutup/ditinggalkan saat sedang merekam =====
   Tanpa ini, peserta bisa tidak sengaja pindah/menutup tab di tengah sesi
   rekam 1 menit dan seluruh data yang sudah terkumpul hilang begitu saja
   tanpa peringatan. Browser akan menampilkan dialog konfirmasi bawaannya
   sendiri kalau sedangMerekam bernilai true. */
window.addEventListener('beforeunload', function (event) {
  if (sedangMerekam) {
    event.preventDefault();
    event.returnValue = ''; // sebagian browser mewajibkan baris ini diisi
  }
});


/* ===== Tombol Demo (khusus development, tanpa headset asli) =====
   Kalau belum ada headset fisik di tangan, tombol ini bikin halaman
   "berpura-pura" terhubung dan mengirim band power acak, supaya sisa alur
   (kartu, grafik, rekam 1 menit, sampai ke hasil.html) tetap bisa dites. */

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
  // berpindah (misalnya redirect ke hasil.html setelah rekam selesai).
  var timerDemo = setInterval(function () {
    handleBandPower(buatDataDummy());
  }, 500);
});
