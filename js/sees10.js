/* sees10.js — logika halaman sees10.html (SEES-10, emotional eating)
   ==========================================================
   Tugas file ini:
   1. Hitung rata-rata dari 10 jawaban (tiap jawaban bernilai 1-5)
   2. Tentukan status emotional eating berdasarkan rata-rata itu
   3. Simpan hasilnya (lewat storage.js), lalu lanjut ke kuesioner berikutnya */

var JUMLAH_PERTANYAAN = 10;

var form = document.getElementById('formSees10');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'sees10');

form.addEventListener('submit', function (event) {
  event.preventDefault(); // urus perpindahan halaman sendiri lewat JS

  var dataForm = new FormData(form);

  var totalSkor = 0;
  var jawaban = {}; // disimpan mentah, bukan cuma rata-rata, supaya bisa dipulihkan
  for (var i = 1; i <= JUMLAH_PERTANYAAN; i++) {
    var nilai = Number(dataForm.get('q' + i));
    totalSkor += nilai;
    jawaban['q' + i] = nilai;
  }
  var rataRata = totalSkor / JUMLAH_PERTANYAAN;

  var status;
  if (rataRata < 3) {
    status = 'RENDAH (UNDER EATING)';
  } else if (rataRata === 3) {
    status = 'SEDANG';
  } else {
    status = 'TINGGI (OVER EATING)';
  }

  simpanHasilKuesioner('sees10', { rataRata: rataRata, status: status, jawaban: jawaban });

  window.location.href = 'hungerscale.html';
});
