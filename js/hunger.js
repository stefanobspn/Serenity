/* hunger.js — logika halaman hungerscale.html (Hunger Scale)
   ==========================================================
   Tugas file ini:
   1. Validasi bahwa peserta sudah memilih salah satu skala lapar
   2. Ambil angka yang dipilih peserta (1-10, makin rendah makin lapar)
   3. Simpan hasilnya (lewat storage.js), lalu lanjut ke halaman monitor EEG
   (Skala ini tidak punya kategori TINGGI/RENDAH seperti PSS-5 & SEES-10,
   jadi nilainya disimpan & ditampilkan apa adanya.) */

var form = document.getElementById('formHunger');
var pesanValidasiEl = document.getElementById('pesanValidasi');

// Kalau peserta sempat pindah dari sini lalu tekan "Kembali", isi ulang
// jawaban yang sudah dipilih sebelumnya (lihat storage.js).
muatJawabanTersimpan(form, 'hunger');

form.addEventListener('submit', function (event) {
  event.preventDefault(); // urus perpindahan halaman sendiri lewat JS

  var dataForm = new FormData(form);
  var rawValue = dataForm.get('q1');

  if (!rawValue) {
    if (pesanValidasiEl) {
      pesanValidasiEl.textContent = 'Harap pilih salah satu skala rasa lapar sebelum lanjut.';
      pesanValidasiEl.hidden = false;
    }
    var targetField = document.getElementById('field-q1');
    if (targetField) {
      targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (pesanValidasiEl) pesanValidasiEl.hidden = true;

  var skor = Number(rawValue);

  // jawaban disimpan mentah juga (walau di sini cuma 1 pertanyaan) supaya
  // konsisten dengan pss5.js & sees10.js dan bisa dipulihkan muatJawabanTersimpan()
  simpanHasilKuesioner('hunger', { skor: skor, jawaban: { q1: skor } });

  window.location.href = 'eegmonitor.html';
});
