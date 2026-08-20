/* userform.js — logika halaman userform.html (Data Peserta)
   ==========================================================
   Tugas file ini:
   1. Ambil nama yang diisi peserta
   2. Simpan hasilnya (lewat storage.js), lalu lanjut ke kuesioner pertama */

var form = document.getElementById('formUser');
var inputNamaEl = document.getElementById('inputNama');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// nama yang sudah pernah ditulis sebelumnya (lihat storage.js).
var hasilTersimpan = ambilHasilKuesioner();
if (hasilTersimpan.peserta) {
  inputNamaEl.value = hasilTersimpan.peserta.nama;
}

form.addEventListener('submit', function (event) {
  event.preventDefault(); // urus perpindahan halaman sendiri lewat JS

  var nama = inputNamaEl.value.trim();
  if (!nama) {
    inputNamaEl.focus();
    return;
  }

  simpanHasilKuesioner('peserta', { nama: nama });

  window.location.href = 'pss5.html';
});
