/* storage.js — helper kecil buat simpan & ambil hasil kuesioner
   ==========================================================
   Dipakai bareng-bareng oleh halaman kuesioner (pss5.html,
   sees10.html, hungerscale.html) dan halaman monitor EEG
   (eegmonitor.html), supaya cara baca/tulis localStorage-nya konsisten dan
   tidak perlu ditulis ulang di tiap halaman.

   localStorage itu "penyimpanan" kecil di browser yang isinya tetap ada
   walaupun pindah halaman atau browser ditutup lalu dibuka lagi (beda
   dengan variabel JS biasa yang hilang begitu pindah halaman). Cocok
   dipakai di sini karena tiap kuesioner ada di halaman terpisah, tapi
   hasilnya perlu "dibawa" sampai ke halaman EEG. */

const KUESIONER_STORAGE_KEY = 'serenity_kuesioner';

// Simpan hasil satu bagian kuesioner (misal 'pss5'), tanpa menghapus
// hasil bagian lain yang sudah tersimpan sebelumnya
function simpanHasilKuesioner(namaBagian, data) {
  const semuaHasil = ambilHasilKuesioner();
  semuaHasil[namaBagian] = data;

  // localStorage cuma bisa menyimpan teks, jadi objek JS-nya diubah
  // dulu jadi teks JSON pakai JSON.stringify()
  localStorage.setItem(KUESIONER_STORAGE_KEY, JSON.stringify(semuaHasil));
}

// Ambil semua hasil kuesioner yang tersimpan.
// Kalau belum ada data sama sekali, balikin objek kosong {} supaya
// halaman yang memanggil tidak perlu cek "null atau bukan" sendiri.
function ambilHasilKuesioner() {
  const teksTersimpan = localStorage.getItem(KUESIONER_STORAGE_KEY);
  if (!teksTersimpan) return {};
  return JSON.parse(teksTersimpan); // ubah teks JSON balik jadi objek JS
}

// Isi ulang radio button di form dengan jawaban yang sudah pernah dipilih
// sebelumnya (kalau ada). Dipanggil begitu halaman kuesioner dibuka.
//
// Tanpa ini: kalau peserta menekan link "Kembali" buat mengecek jawaban
// sebelumnya, formnya kelihatan kosong lagi (padahal sudah pernah diisi),
// karena tiap kali halaman dibuka browser mulai dari HTML polos, bukan
// dari jawaban terakhir. Jadi kita baca balik dari localStorage dan
// centang ulang pilihan yang cocok.
function muatJawabanTersimpan(form, namaBagian) {
  const hasil = ambilHasilKuesioner();
  const jawaban = hasil[namaBagian] && hasil[namaBagian].jawaban;
  if (!jawaban) return; // belum pernah diisi, biarkan form tetap kosong

  Object.keys(jawaban).forEach(function (namaInput) {
    const input = form.querySelector(
      'input[name="' + namaInput + '"][value="' + jawaban[namaInput] + '"]'
    );
    if (input) input.checked = true;
  });
}
