/* bands.js — daftar gelombang otak + cara menampilkan angkanya
   ==========================================================
   Dipakai bareng-bareng oleh halaman monitor EEG (eegmonitor.html lewat
   eeg.js) dan halaman Hasil Akhir (hasilakhir.html lewat hasil.js).

   Dulu daftar ini datang dari library pihak ketiga MuseSGen2
   (MuseSGen2.BANDS dan MuseSGen2.formatPower). Library itu sudah tidak
   dipakai lagi — sekarang data EEG datang dari SDK resmi Muse lewat
   bridge/relay.js — jadi daftarnya kita simpan sendiri di file ini.

   Kenapa dipisah jadi file sendiri, bukan ditulis ulang di tiap halaman:
   warna dan label band HARUS sama persis antara grafik live di halaman
   monitor dan grafik tren di halaman Hasil Akhir. Kalau ditulis dua kali,
   cepat atau lambat yang satu diubah dan yang lain lupa diubah, lalu
   Alpha berwarna hijau di satu halaman tapi biru di halaman lain. */


/* Urutan di array ini menentukan urutan garis di legenda grafik, jadi
   sengaja diurutkan dari frekuensi paling rendah ke paling tinggi —
   sama seperti urutan kartu di eegmonitor.html. */
var BANDS = [
  { key: 'delta', label: 'Delta', color: '#3b82f6' },
  { key: 'theta', label: 'Theta', color: '#8b5cf6' },
  { key: 'alpha', label: 'Alpha', color: '#10b981' },
  { key: 'beta', label: 'Beta', color: '#f59e0b' },
  { key: 'gamma', label: 'Gamma', color: '#ef4444' }
];

// Beberapa tempat cuma butuh nama band-nya saja (tanpa label & warna),
// misalnya waktu mengisi kartu atau menyusun kolom CSV.
var BAND_KEYS = BANDS.map(function (band) {
  return band.key;
});


/* Ubah angka band power jadi teks yang enak dibaca di layar.

   Dibulatkan 2 angka di belakang koma karena angka aslinya panjang sekali
   (misal 1.2847193...) dan ketelitian sebanyak itu tidak berarti apa-apa
   buat mata peserta. Yang butuh angka presisi (hitungan rasio Theta/Beta
   di hasil.js) tidak memakai fungsi ini — mereka memakai angka mentahnya
   langsung, lihat properti ".raw" yang disimpan eeg.js.

   Penjagaan isFinite() dipasang karena data dari headset kadang berisi NaN
   (misalnya waktu satu elektroda lepas dari kulit). Tanpa ini, layar akan
   menampilkan tulisan "NaN" yang membingungkan peserta; lebih jelas
   menampilkan "-" yang artinya "belum ada data". */
function formatPower(value) {
  if (typeof value !== 'number' || !isFinite(value)) return '-';
  return value.toFixed(2);
}
