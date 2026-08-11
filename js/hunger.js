/* hunger.js — logika halaman hungerscale.html (Hunger Scale)
   ==========================================================
   Tugas file ini:
   1. Ambil angka yang dipilih peserta (1-10, makin rendah makin lapar)
   2. Simpan hasilnya (lewat storage.js), lalu lanjut ke halaman monitor EEG
   (Skala ini tidak punya kategori TINGGI/RENDAH seperti PSS-5 & SEES-10,
   jadi nilainya disimpan & ditampilkan apa adanya.) */

var form = document.getElementById('formHunger');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'hunger');

form.addEventListener('submit', function (event) {
  event.preventDefault(); // urus perpindahan halaman sendiri lewat JS

  var dataForm = new FormData(form);
  var skor = Number(dataForm.get('q1'));

  // jawaban disimpan mentah juga (walau di sini cuma 1 pertanyaan) supaya
  // konsisten dengan pss5.js & sees10.js dan bisa dipulihkan muatJawabanTersimpan()
  simpanHasilKuesioner('hunger', { skor: skor, jawaban: { q1: skor } });

  window.location.href = 'eegmonitor.html';
});
