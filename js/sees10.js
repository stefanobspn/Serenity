/* sees10.js — logika halaman sees10.html (SEES-10, emotional eating)
   ==========================================================
   Tugas file ini:
   1. Validasi bahwa semua 10 pertanyaan sudah dijawab peserta
   2. Hitung rata-rata dari 10 jawaban (tiap jawaban bernilai 1-5)
   3. Tentukan status emotional eating berdasarkan rata-rata itu
   4. Simpan hasilnya (lewat storage.js), lalu lanjut ke kuesioner berikutnya */

var JUMLAH_PERTANYAAN = 10;

var form = document.getElementById('formSees10');
var pesanValidasiEl = document.getElementById('pesanValidasi');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'sees10');

form.addEventListener('submit', function (event) {
  event.preventDefault(); // urus perpindahan halaman sendiri lewat JS

  var dataForm = new FormData(form);

  // Pastikan semua 10 pertanyaan sudah terisi.
  // Tanpa pengecekan ini, pertanyaan yang terlewat bernilai 0 dan menurunkan
  // rata-rata skor sehingga peserta salah terklasifikasi sebagai UNDER EATING.
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
