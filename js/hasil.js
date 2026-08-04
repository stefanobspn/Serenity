/* hasil.js — logika halaman hasil.html (Hasil Akhir)
   ==========================================================
   Halaman ini murni menampilkan data yang sudah tersimpan di localStorage
   (lewat storage.js) dari halaman-halaman sebelumnya: 3 kuesioner dan
   rata-rata band power dari sesi rekam 1 menit di eeg.html. Tidak ada
   koneksi Bluetooth atau library eksternal di sini sama sekali. */


/* ===== Ringkasan Kuesioner ===== */

// Tampilkan hasil PSS-5, SEES-10, dan Hunger Scale yang tersimpan di
// localStorage dari halaman-halaman kuesioner.
function tampilkanRingkasanKuesioner() {
  var hasil = ambilHasilKuesioner();
  var wadahEl = document.getElementById('ringkasan-kuesioner');

  var belumAdaData = !hasil.pss5 && !hasil.sees10 && !hasil.hunger;
  if (belumAdaData) {
    wadahEl.textContent = 'Belum ada data kuesioner (halaman ini dibuka langsung tanpa mengisi kuesioner).';
    return;
  }

  var baris = [];
  if (hasil.pss5) {
    baris.push('Stres (PSS-5): skor ' + hasil.pss5.skor + '/30 — ' + hasil.pss5.status);
  }
  if (hasil.sees10) {
    baris.push('Emotional Eating (SEES-10): rata-rata ' + hasil.sees10.rataRata.toFixed(2) + ' — ' + hasil.sees10.status);
  }
  if (hasil.hunger) {
    baris.push('Rasa Lapar: skor ' + hasil.hunger.skor + ' dari 10 (semakin rendah = semakin lapar)');
  }

  var daftarEl = document.createElement('ul');
  baris.forEach(function (teks) {
    var itemEl = document.createElement('li');
    itemEl.textContent = teks;
    daftarEl.appendChild(itemEl);
  });

  wadahEl.textContent = ''; // kosongkan dulu tulisan "Memuat..."
  wadahEl.appendChild(daftarEl);
}


/* ===== Hasil EEG (rata-rata band power dari sesi rekam 1 menit) ===== */

var BAND_KEYS = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

function tampilkanHasilEeg() {
  var hasil = ambilHasilKuesioner();
  var bandsEl = document.getElementById('bands');
  var kosongEl = document.getElementById('eegKosong');

  if (!hasil.eeg) {
    bandsEl.hidden = true;
    kosongEl.hidden = false;
    return;
  }

  BAND_KEYS.forEach(function (key) {
    var dataBand = hasil.eeg[key];
    document.getElementById('band-' + key).textContent = dataBand.value;
    document.getElementById('bar-' + key).style.width = dataBand.percent + '%';
  });
}


/* ===== Feedback bebas dari peserta ===== */

// Isi ulang textarea dengan feedback yang sudah pernah ditulis sebelumnya
// (kalau ada), mirip muatJawabanTersimpan() di halaman kuesioner tapi
// versi sederhana untuk satu textarea.
function muatFeedbackTersimpan() {
  var hasil = ambilHasilKuesioner();
  if (hasil.feedback) {
    document.getElementById('feedbackInput').value = hasil.feedback.teks;
  }
}

// Simpan isi textarea ke localStorage tiap kali peserta mengetik (event
// 'input'), bukan lewat tombol "Simpan" terpisah — konsisten dengan
// halaman lain di app ini yang juga tidak pernah minta klik simpan.
function simpanFeedback() {
  var teks = document.getElementById('feedbackInput').value;
  simpanHasilKuesioner('feedback', { teks: teks });
}


/* ===== Unduh CSV (kuesioner + EEG + feedback) ===== */

// Bungkus satu nilai supaya aman dipakai di dalam file CSV. Aturan CSV:
// kalau nilainya mengandung koma, tanda kutip dua, atau baris baru,
// seluruh nilai itu harus dibungkus tanda kutip dua, dan tiap tanda kutip
// dua di dalamnya digandakan jadi dua. Tanpa ini, feedback bebas dari
// peserta (yang boleh berisi koma/kutip/enter) bisa merusak susunan kolom
// CSV waktu dibuka di spreadsheet.
function escapeNilaiCsv(nilai) {
  var teks = String(nilai);
  var perluDibungkus = teks.indexOf(',') !== -1 || teks.indexOf('"') !== -1 || teks.indexOf('\n') !== -1;
  if (!perluDibungkus) return teks;
  return '"' + teks.replace(/"/g, '""') + '"';
}

// Kumpulkan semua kolom CSV sebagai daftar pasangan [namaKolom, nilai].
// Dipakai bentuk pasangan (bukan dua larik terpisah) supaya nama kolom
// dan nilainya selalu nempel jadi satu, tidak mungkin kegeser saling
// tidak sinkron kalau nanti ada yang menambah kolom baru.
//
// Kalau satu bagian belum pernah diisi (misal hasil.html dibuka langsung
// tanpa lewat alur kuesioner), nilainya diisi string kosong '' supaya
// tetap menghasilkan CSV yang valid, bukan error.
function siapkanDataCsv() {
  var hasil = ambilHasilKuesioner();

  return [
    ['waktu_unduh', new Date().toLocaleString('id-ID')],
    ['pss5_skor', hasil.pss5 ? hasil.pss5.skor : ''],
    ['pss5_status', hasil.pss5 ? hasil.pss5.status : ''],
    ['sees10_rata_rata', hasil.sees10 ? hasil.sees10.rataRata.toFixed(2) : ''],
    ['sees10_status', hasil.sees10 ? hasil.sees10.status : ''],
    ['hunger_skor', hasil.hunger ? hasil.hunger.skor : ''],
    ['eeg_delta', hasil.eeg ? hasil.eeg.delta.value : ''],
    ['eeg_theta', hasil.eeg ? hasil.eeg.theta.value : ''],
    ['eeg_alpha', hasil.eeg ? hasil.eeg.alpha.value : ''],
    ['eeg_beta', hasil.eeg ? hasil.eeg.beta.value : ''],
    ['eeg_gamma', hasil.eeg ? hasil.eeg.gamma.value : ''],
    ['feedback', hasil.feedback ? hasil.feedback.teks : '']
  ];
}

// Gabungkan data di atas jadi teks CSV: baris pertama nama kolom, baris
// kedua nilainya (format "wide" — satu peserta = satu baris), supaya
// beberapa file CSV dari beberapa peserta bisa ditumpuk jadi satu
// spreadsheet nanti.
function buatTeksCsv() {
  var kolomData = siapkanDataCsv();

  var barisHeader = kolomData.map(function (pasangan) { return escapeNilaiCsv(pasangan[0]); }).join(',');
  var barisNilai = kolomData.map(function (pasangan) { return escapeNilaiCsv(pasangan[1]); }).join(',');

  return barisHeader + '\n' + barisNilai;
}

// Buat file CSV di memori (Blob) lalu picu download-nya lewat elemen <a>
// tersembunyi yang diklik otomatis — ini trik standar buat "download file
// dari JS" tanpa perlu link asli yang kelihatan di halaman.
function unduhCsv() {
  // '﻿' (BOM) di depan teks supaya Excel membaca huruf non-ASCII
  // (misal dari feedback berbahasa Indonesia) dengan benar, bukan jadi
  // karakter aneh. Tanpa ini beberapa versi Excel salah tebak encoding-nya.
  var teksCsv = '﻿' + buatTeksCsv();
  var blob = new Blob([teksCsv], { type: 'text/csv;charset=utf-8' });

  var urlSementara = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = urlSementara;
  link.download = 'serenity-hasil-' + Date.now() + '.csv';
  link.click();

  // Lepas alamat sementara tadi — blob URL tidak otomatis dibersihkan
  // sendiri oleh browser, jadi harus di-revoke manual biar tidak
  // menumpuk di memori.
  URL.revokeObjectURL(urlSementara);
}


tampilkanRingkasanKuesioner();
tampilkanHasilEeg();
muatFeedbackTersimpan();

document.getElementById('feedbackInput').addEventListener('input', simpanFeedback);
document.getElementById('downloadCsvBtn').addEventListener('click', unduhCsv);


/* ===== Tombol "Mulai Sesi Baru" ===== */

// Hapus semua hasil tersimpan supaya peserta berikutnya mulai dari data
// yang bersih, lalu kembali ke landing page.
// Ini aksi yang tidak bisa dibatalkan (semua hasil hilang), jadi tanya
// dulu lewat confirm() sebelum benar-benar menghapus.
document.getElementById('mulaiLagiBtn').addEventListener('click', function () {
  var yakin = confirm('Yakin mau mulai sesi baru? Semua hasil kuesioner & EEG saat ini akan dihapus.');
  if (!yakin) return;

  localStorage.removeItem(KUESIONER_STORAGE_KEY);
  window.location.href = 'index.html';
});
