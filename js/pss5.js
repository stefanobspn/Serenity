/* pss5.js — logika halaman pss5.html (Kuesioner Tingkat Stres, PSS-5)
   ==========================================================
   Tugas file ini:
   1. Hitung skor total dari 5 jawaban (tiap jawaban bernilai 1-6)
   2. Tentukan status stres berdasarkan skor itu
   3. Simpan hasilnya (lewat storage.js), lalu lanjut ke kuesioner berikutnya */

var JUMLAH_PERTANYAAN = 5;
var BATAS_SKOR_TINGGI = 15; // skor >= ini dianggap stres TINGGI

var form = document.getElementById('formPss5');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'pss5');

form.addEventListener('submit', function (event) {
  // Biasanya submit form bikin halaman reload. Kita cegah itu supaya
  // bisa urus sendiri lewat JS (hitung skor dulu, baru pindah halaman).
  event.preventDefault();

  var dataForm = new FormData(form);

  var skor = 0;
  var jawaban = {}; // disimpan mentah, bukan cuma skor, supaya bisa dipulihkan
  for (var i = 1; i <= JUMLAH_PERTANYAAN; i++) {
    var nilai = Number(dataForm.get('q' + i));
    skor += nilai;
    jawaban['q' + i] = nilai;
  }

  var status = skor >= BATAS_SKOR_TINGGI ? 'TINGGI' : 'RENDAH';

  simpanHasilKuesioner('pss5', { skor: skor, status: status, jawaban: jawaban });

  window.location.href = 'kuesioner-makan.html';
});
