/* hasil.js — logika halaman hasilakhir.html (Hasil Akhir)
   ==========================================================
   Halaman ini murni menampilkan data yang sudah tersimpan di localStorage
   (lewat storage.js) dari halaman-halaman sebelumnya: 3 kuesioner dan
   rata-rata band power dari dua sesi rekam 1 menit (EEG 1 & EEG 2) di
   eegmonitor.html. Tidak ada koneksi Bluetooth atau library eksternal di
   sini sama sekali. */


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

  // Nama peserta (dari userform.html) ditampilkan terpisah dari daftar
  // kuesioner di atas <ul>, bukan ikut jadi salah satu <li>, karena bukan
  // hasil kuesioner.
  if (hasil.peserta && hasil.peserta.nama) {
    var namaEl = document.createElement('p');
    namaEl.textContent = 'Nama: ' + hasil.peserta.nama;
    wadahEl.appendChild(namaEl);
  }

  wadahEl.appendChild(daftarEl);
}


/* ===== Hasil EEG (rata-rata band power dari EEG 1 & EEG 2) ===== */

var BAND_KEYS = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

// Isi satu set kartu band (EEG 1 atau EEG 2) — prefix contohnya 'eeg1'
// atau 'eeg2', dipakai buat cocokin id="band-eeg1-delta" dst di HTML.
function isiKartuBand(prefix, dataEeg) {
  BAND_KEYS.forEach(function (key) {
    document.getElementById('band-' + prefix + '-' + key).textContent = dataEeg[key].value;
  });
}

// Bandingkan rasio Theta/Beta EEG 1 (baseline) dengan EEG 2 (setelah
// aktivitas). Aturan dari proposal penelitian (docs/RingkasanKarya.md):
// rasio turun = stres naik, rasio naik = stres turun. Dipakai .raw (angka
// mentah dari eeg.js), bukan .value (teks siap tampil), supaya hitungannya
// presisi.
function hitungVerdictStres(eeg1, eeg2) {
  var rasio1 = eeg1.theta.raw / eeg1.beta.raw;
  var rasio2 = eeg2.theta.raw / eeg2.beta.raw;
  var arah = rasio2 < rasio1 ? 'naik' : (rasio2 > rasio1 ? 'turun' : 'stabil');
  return { arah: arah, rasio1: rasio1, rasio2: rasio2 };
}

// Bandingkan power Alpha EEG 1 vs EEG 2 sebagai sinyal rasa lapar
// (berdasarkan gelombang Alpha, per docs/RingkasanKarya.md). Catatan: ini
// versi sederhana dari "puncak gelombang Alpha" di proposal, karena
// aplikasi ini cuma punya rata-rata band power, bukan spektrum frekuensi
// penuh — kalau butuh lebih presisi, ini bagian yang perlu diganti.
function hitungVerdictLapar(eeg1, eeg2) {
  var alpha1 = eeg1.alpha.raw;
  var alpha2 = eeg2.alpha.raw;
  var arah = alpha2 > alpha1 ? 'naik' : (alpha2 < alpha1 ? 'turun' : 'stabil');
  return { arah: arah, alpha1: alpha1, alpha2: alpha2 };
}

function teksVerdictStres(v) {
  if (v.arah === 'naik') return 'Stres meningkat setelah aktivitas (rasio Theta/Beta turun dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  if (v.arah === 'turun') return 'Stres menurun setelah aktivitas (rasio Theta/Beta naik dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  return 'Stres relatif stabil setelah aktivitas (rasio Theta/Beta tidak berubah).';
}

function teksVerdictLapar(v) {
  if (v.arah === 'naik') return 'Gelombang Alpha meningkat setelah aktivitas — bisa jadi tanda rasa lapar berkurang.';
  if (v.arah === 'turun') return 'Gelombang Alpha menurun setelah aktivitas — bisa jadi tanda rasa lapar bertambah.';
  return 'Gelombang Alpha relatif stabil setelah aktivitas.';
}

function tampilkanHasilEeg() {
  var hasil = ambilHasilKuesioner();
  var kosongEl = document.getElementById('eegKosong');
  var perbandinganEl = document.getElementById('eegPerbandingan');

  if (!hasil.eeg1 || !hasil.eeg2) {
    kosongEl.hidden = false;
    kosongEl.textContent = !hasil.eeg1
      ? 'Belum ada data EEG (EEG 1 belum pernah direkam).'
      : 'EEG 1 sudah ada, tapi EEG 2 belum pernah direkam.';
    perbandinganEl.hidden = true;
    return;
  }

  kosongEl.hidden = true;
  perbandinganEl.hidden = false;

  isiKartuBand('eeg1', hasil.eeg1);
  isiKartuBand('eeg2', hasil.eeg2);

  document.getElementById('verdictStres').textContent = teksVerdictStres(hitungVerdictStres(hasil.eeg1, hasil.eeg2));
  document.getElementById('verdictLapar').textContent = teksVerdictLapar(hitungVerdictLapar(hasil.eeg1, hasil.eeg2));
}


/* ===== Rekomendasi Aksi (gabungan kuesioner + verdict stres EEG) =====
   Draft aturan pertama — tiap aturan dilewati kalau data yang dibutuhkan
   belum ada, supaya tidak menampilkan rekomendasi dari data kosong. */

function buatDaftarRekomendasi(hasil, verdictStresData) {
  var daftar = [];
  var stresNaik = !!verdictStresData && verdictStresData.arah === 'naik';
  var stresTurunAtauStabil = !!verdictStresData && verdictStresData.arah !== 'naik';

  if (stresNaik || (hasil.pss5 && hasil.pss5.status === 'TINGGI')) {
    daftar.push('Tingkat stres terpantau tinggi/meningkat. Disarankan melakukan teknik relaksasi (napas dalam, istirahat sejenak, atau aromaterapi) sebelum melanjutkan aktivitas.');
  }
  if (stresTurunAtauStabil && hasil.pss5 && hasil.pss5.status === 'RENDAH') {
    daftar.push('Kondisi stres tergolong baik. Pertahankan pola istirahat dan aktivitas saat ini.');
  }
  if (stresNaik && hasil.sees10 && hasil.sees10.status === 'TINGGI (OVER EATING)') {
    daftar.push('Kecenderungan makan berlebih saat stres terdeteksi. Disarankan mengenali pemicu stres dan mencari alternatif selain makan, seperti journaling atau olahraga ringan.');
  }
  if (stresNaik && hasil.sees10 && hasil.sees10.status === 'RENDAH (UNDER EATING)') {
    daftar.push('Kecenderungan makan berkurang saat stres terdeteksi. Pastikan tetap makan teratur meski dalam kondisi stres.');
  }
  if (hasil.hunger && hasil.hunger.skor <= 4) {
    daftar.push('Rasa lapar cukup tinggi. Disarankan makan/minum sebelum melanjutkan aktivitas berikutnya.');
  }
  if (hasil.hunger && hasil.hunger.skor >= 7) {
    daftar.push('Kondisi kenyang terpantau. Hindari makan berlebih lebih lanjut.');
  }

  if (daftar.length === 0) {
    daftar.push('Kondisi stres dan pola makan tergolong stabil. Tidak ada rekomendasi khusus saat ini.');
  }
  return daftar;
}

function tampilkanRekomendasi() {
  var hasil = ambilHasilKuesioner();
  var wadahEl = document.getElementById('rekomendasi');

  var belumAdaKuesioner = !hasil.pss5 && !hasil.sees10 && !hasil.hunger;
  if (belumAdaKuesioner) {
    wadahEl.textContent = 'Belum ada data kuesioner untuk dibuatkan rekomendasi.';
    return;
  }

  var verdictStresData = (hasil.eeg1 && hasil.eeg2) ? hitungVerdictStres(hasil.eeg1, hasil.eeg2) : null;
  var daftar = buatDaftarRekomendasi(hasil, verdictStresData);

  var daftarEl = document.createElement('ul');
  daftar.forEach(function (teks) {
    var itemEl = document.createElement('li');
    itemEl.textContent = teks;
    daftarEl.appendChild(itemEl);
  });

  wadahEl.textContent = '';
  wadahEl.appendChild(daftarEl);
}


/* ===== Unduh CSV (kuesioner + EEG) ===== */

// Bungkus satu nilai supaya aman dipakai di dalam file CSV. Aturan CSV:
// kalau nilainya mengandung koma, tanda kutip dua, atau baris baru,
// seluruh nilai itu harus dibungkus tanda kutip dua, dan tiap tanda kutip
// dua di dalamnya digandakan jadi dua. Tanpa ini, kolom rekomendasi (yang
// menggabungkan beberapa kalimat dengan " | ") bisa merusak susunan kolom
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
// Kalau satu bagian belum pernah diisi (misal hasilakhir.html dibuka langsung
// tanpa lewat alur kuesioner), nilainya diisi string kosong '' supaya
// tetap menghasilkan CSV yang valid, bukan error.
function siapkanDataCsv() {
  var hasil = ambilHasilKuesioner();
  var adaKeduaEeg = hasil.eeg1 && hasil.eeg2;
  var verdictStresData = adaKeduaEeg ? hitungVerdictStres(hasil.eeg1, hasil.eeg2) : null;
  var verdictLaparData = adaKeduaEeg ? hitungVerdictLapar(hasil.eeg1, hasil.eeg2) : null;

  return [
    ['waktu_unduh', new Date().toLocaleString('id-ID')],
    ['nama_peserta', hasil.peserta ? hasil.peserta.nama : ''],
    ['pss5_skor', hasil.pss5 ? hasil.pss5.skor : ''],
    ['pss5_status', hasil.pss5 ? hasil.pss5.status : ''],
    ['sees10_rata_rata', hasil.sees10 ? hasil.sees10.rataRata.toFixed(2) : ''],
    ['sees10_status', hasil.sees10 ? hasil.sees10.status : ''],
    ['hunger_skor', hasil.hunger ? hasil.hunger.skor : ''],
    ['eeg1_delta', hasil.eeg1 ? hasil.eeg1.delta.value : ''],
    ['eeg1_theta', hasil.eeg1 ? hasil.eeg1.theta.value : ''],
    ['eeg1_alpha', hasil.eeg1 ? hasil.eeg1.alpha.value : ''],
    ['eeg1_beta', hasil.eeg1 ? hasil.eeg1.beta.value : ''],
    ['eeg1_gamma', hasil.eeg1 ? hasil.eeg1.gamma.value : ''],
    ['eeg2_delta', hasil.eeg2 ? hasil.eeg2.delta.value : ''],
    ['eeg2_theta', hasil.eeg2 ? hasil.eeg2.theta.value : ''],
    ['eeg2_alpha', hasil.eeg2 ? hasil.eeg2.alpha.value : ''],
    ['eeg2_beta', hasil.eeg2 ? hasil.eeg2.beta.value : ''],
    ['eeg2_gamma', hasil.eeg2 ? hasil.eeg2.gamma.value : ''],
    ['rasio_tb_eeg1', verdictStresData ? verdictStresData.rasio1.toFixed(3) : ''],
    ['rasio_tb_eeg2', verdictStresData ? verdictStresData.rasio2.toFixed(3) : ''],
    ['verdict_stres', verdictStresData ? verdictStresData.arah : ''],
    ['verdict_alpha_lapar', verdictLaparData ? verdictLaparData.arah : ''],
    ['rekomendasi', buatDaftarRekomendasi(hasil, verdictStresData).join(' | ')]
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
  // (misal dari kolom rekomendasi berbahasa Indonesia) dengan benar, bukan
  // jadi karakter aneh. Tanpa ini beberapa versi Excel salah tebak encoding-nya.
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
tampilkanRekomendasi();

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
