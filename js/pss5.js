/* pss5.js — logika halaman pss5.html (Kuesioner Tingkat Stres, PSS-5)
   ==========================================================
   Tugas file ini:
   1. Validasi bahwa semua 5 pertanyaan sudah dijawab peserta
   2. Hitung skor total dari 5 jawaban (tiap jawaban bernilai 1-6)
   3. Tentukan status stres berdasarkan skor itu
   4. Simpan hasilnya (lewat storage.js), lalu lanjut ke kuesioner berikutnya */

var JUMLAH_PERTANYAAN = 5;
var BATAS_SKOR_TINGGI = 15; // skor >= ini dianggap stres TINGGI

var form = document.getElementById('formPss5');
var pesanValidasiEl = document.getElementById('pesanValidasi');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'pss5');

form.addEventListener('submit', function (event) {
  // Biasanya submit form bikin halaman reload. Kita cegah itu supaya
  // bisa urus sendiri lewat JS (hitung skor dulu, baru pindah halaman).
  event.preventDefault();

  var dataForm = new FormData(form);

  // Pastikan semua pertanyaan sudah dijawab sebelum menghitung skor.
  // Tanpa pengecekan ini, pertanyaan yang terlewat akan menghasilkan nilai 0
  // dan merusak validitas skor stres penelitian.
  var pertanyaanBelumDiisi = [];
  for (var i = 1; i <= JUMLAH_PERTANYAAN; i++) {
    if (!dataForm.get('q' + i)) {
      pertanyaanBelumDiisi.push(i);
    }
  }

  if (pertanyaanBelumDiisi.length > 0) {
    if (pesanValidasiEl) {
      pesanValidasiEl.textContent = 'Harap lengkapi semua pertanyaan sebelum lanjut. Pertanyaan yang belum diisi: nomor ' + pertanyaanBelumDiisi.join(', ');
      pesanValidasiEl.hidden = false;
    }
    var targetField = document.getElementById('field-q' + pertanyaanBelumDiisi[0]);
    if (targetField) {
      targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (pesanValidasiEl) pesanValidasiEl.hidden = true;

  var skor = 0;
  var jawaban = {}; // disimpan mentah, bukan cuma skor, supaya bisa dipulihkan
  for (var i = 1; i <= JUMLAH_PERTANYAAN; i++) {
    var nilai = Number(dataForm.get('q' + i));
    skor += nilai;
    jawaban['q' + i] = nilai;
  }

  var status = skor >= BATAS_SKOR_TINGGI ? 'TINGGI' : 'RENDAH';

  simpanHasilKuesioner('pss5', { skor: skor, status: status, jawaban: jawaban });

  window.location.href = 'sees10.html';
});
