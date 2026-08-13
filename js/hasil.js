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

// Daftar band (BANDS) dan daftar namanya saja (BAND_KEYS) datang dari
// bands.js, yang dimuat duluan di hasilakhir.html. Dulu daftar itu ditulis
// ulang di file ini, dan warnanya harus dijaga manual supaya sama dengan
// grafik live di eegmonitor.html. Sekarang dua halaman itu membaca daftar
// yang sama persis, jadi warna Alpha di sini pasti sama dengan warna Alpha
// di halaman monitor tanpa perlu diingat-ingat.

// Gambar satu grafik garis tren band power sepanjang satu sesi rekam (EEG 1
// atau EEG 2), dari titik-titik data per-interval yang disimpan eeg.js
// (lihat dataEeg.interval, tiap titik = rata-rata INTERVAL_DETIK detik).
// Beda dengan grafik live di eeg.js: grafik di sini statis, semua datanya
// sudah lengkap begitu halaman ini dibuka, jadi tidak perlu logic
// tambah-titik/geser-titik seperti grafik live itu.
function gambarGrafikEeg(prefix, dataEeg) {
  var titikTitik = dataEeg.interval;

  new Chart(document.getElementById('eegChart-' + prefix).getContext('2d'), {
    type: 'line',
    data: {
      labels: titikTitik.map(function (titik) { return titik.detik + 's'; }),
      datasets: BANDS.map(function (band) {
        return {
          label: band.label,
          data: titikTitik.map(function (titik) { return titik[band.key]; }),
          borderColor: band.color,
          backgroundColor: band.color,
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.25
        };
      })
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
    }
  });
}

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

// Bandingkan PUNCAK power Alpha EEG 1 vs EEG 2 sebagai sinyal rasa lapar,
// sesuai docs/RingkasanKarya.md ("berdasarkan puncak gelombang Alpha").
// Dipakai nilai maksimum dari titik-titik data per-interval (dataEeg.interval,
// lihat eeg.js), bukan rata-rata keseluruhan sesi — karena rata-rata bisa
// meratakan/menyembunyikan puncak yang cuma muncul sesaat di tengah sesi.
function hitungVerdictLapar(eeg1, eeg2) {
  var alpha1 = Math.max.apply(null, eeg1.interval.map(function (titik) { return titik.alpha; }));
  var alpha2 = Math.max.apply(null, eeg2.interval.map(function (titik) { return titik.alpha; }));
  var arah = alpha2 > alpha1 ? 'naik' : (alpha2 < alpha1 ? 'turun' : 'stabil');
  return { arah: arah, alpha1: alpha1, alpha2: alpha2 };
}

function teksVerdictStres(v) {
  if (v.arah === 'naik') return 'Stres meningkat setelah aktivitas (rasio Theta/Beta turun dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  if (v.arah === 'turun') return 'Stres menurun setelah aktivitas (rasio Theta/Beta naik dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  return 'Stres relatif stabil setelah aktivitas (rasio Theta/Beta tidak berubah).';
}

function teksVerdictLapar(v) {
  if (v.arah === 'naik') return 'Puncak gelombang Alpha meningkat setelah aktivitas — bisa jadi tanda rasa lapar berkurang.';
  if (v.arah === 'turun') return 'Puncak gelombang Alpha menurun setelah aktivitas — bisa jadi tanda rasa lapar bertambah.';
  return 'Puncak gelombang Alpha relatif stabil setelah aktivitas.';
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
  gambarGrafikEeg('eeg1', hasil.eeg1);
  gambarGrafikEeg('eeg2', hasil.eeg2);

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
// dua di dalamnya digandakan jadi dua. Tanpa ini, nama peserta yang
// mengandung koma (misal "Ani, S.Pd") bisa terbaca sebagai dua kolom dan
// menggeser semua kolom setelahnya waktu file dibuka di spreadsheet.
function escapeNilaiCsv(nilai) {
  var teks = String(nilai);
  var perluDibungkus = teks.indexOf(',') !== -1 || teks.indexOf('"') !== -1 || teks.indexOf('\n') !== -1;
  if (!perluDibungkus) return teks;
  return '"' + teks.replace(/"/g, '""') + '"';
}

/* Bentuk file yang dipakai: format "panjang" (long) — satu baris = satu
   titik data per INTERVAL_DETIK detik (lihat eeg.js), bukan satu baris =
   satu peserta. Kolom identitas & kuesioner sengaja diulang sama persis di
   tiap baris.

   Kenapa begitu, padahal kelihatannya boros? Karena lama rekam tiap peserta
   tidak pernah sama, jadi jumlah titik datanya juga beda-beda. Kalau tiap
   titik dijadikan kolom sendiri (detik_10, detik_20, detik_30, ...), peserta
   yang rekamnya lama akan punya lebih banyak kolom daripada yang sebentar —
   file antar-peserta jadi tidak seragam dan tidak bisa ditumpuk jadi satu
   spreadsheet. Dengan format panjang, perbedaan lama rekam ditampung di
   jumlah BARIS, sementara jumlah kolomnya selalu tetap. Menumpuk file
   beberapa peserta tinggal menempelkan barisnya ke bawah.

   Angka olahan (rata-rata band, rasio Theta/Beta, verdict) sengaja tidak
   ikut diekspor: semuanya bisa dihitung ulang di spreadsheet dari kolom
   mentah di file ini (AVERAGE untuk rata-rata, kolom theta dibagi kolom
   beta untuk rasio, MAX untuk puncak Alpha). Yang disimpan di sini cukup
   data mentahnya saja. */

// Kumpulkan satu baris data per titik interval dari EEG 1 dan EEG 2.
//
// Kalau satu bagian kuesioner belum pernah diisi (misal hasilakhir.html
// dibuka langsung tanpa lewat alur kuesioner), nilainya diisi string kosong
// '' supaya tetap menghasilkan CSV yang valid, bukan error.
function siapkanDataCsv() {
  var hasil = ambilHasilKuesioner();

  // Waktu unduh diambil SEKALI di sini, bukan di dalam loop di bawah. Kalau
  // dipanggil per baris, tiap baris bisa dapat detik yang berbeda dan kolom
  // ini jadi tidak bisa dipakai sebagai penanda "satu file = satu sesi unduh".
  var waktuUnduh = new Date().toLocaleString('id-ID');

  // Bagian yang nilainya sama untuk semua baris (identitas + kuesioner)
  // disusun sekali di luar loop, lalu dipakai ulang. Selain lebih hemat,
  // ini menjamin semua baris benar-benar berisi angka yang sama persis.
  var kolomPeserta = [
    waktuUnduh,
    hasil.peserta ? hasil.peserta.nama : '',
    hasil.pss5 ? hasil.pss5.skor : '',
    hasil.pss5 ? hasil.pss5.status : '',
    hasil.sees10 ? hasil.sees10.rataRata.toFixed(2) : '',
    hasil.sees10 ? hasil.sees10.status : '',
    hasil.hunger ? hasil.hunger.skor : ''
  ];

  var barisBarisData = [];

  ['eeg1', 'eeg2'].forEach(function (sesi) {
    var dataEeg = hasil[sesi];
    if (!dataEeg) return;

    /* Catatan mutu sinyal sesi ini (dibuat di selesaiRekam() pada js/eeg.js):
       nilai kontak elektroda TERBURUK selama sesi, 1 = bagus, 2 = sedang,
       4 = jelek/lepas. Nilainya sama untuk semua baris sesi ini, jadi disusun
       sekali di luar loop seperti kolomPeserta.

       Rekaman yang dibuat sebelum kolom ini ada tidak punya dataEeg.kualitas,
       jadi diisi '' — sama seperti perlakuan untuk kuesioner yang belum diisi
       di atas, supaya file CSV-nya tetap valid dan bukan malah error. */
    var mutu = dataEeg.kualitas;
    var kosong = ['', '', '', ''];
    var nilaiTerburuk = (mutu && mutu.terburuk) ? mutu.terburuk : kosong;
    var persenJelek = (mutu && mutu.persenJelek) ? mutu.persenJelek : kosong;

    // Urutan elektroda: TP9 (kiri belakang), AF7 (kiri depan),
    // AF8 (kanan depan), TP10 (kanan belakang) — sama dengan NAMA_ELEKTRODA
    // di js/eeg.js, karena angkanya memang datang dari larik yang sama.
    var kolomMutu = nilaiTerburuk.slice(0, 4).concat(
      persenJelek.slice(0, 4).map(function (persen) {
        // null = tidak ada data kualitas sama sekali selama sesi itu; dibedakan
        // dari angka 0 yang artinya "ada datanya, dan tidak pernah jelek".
        return (persen === '' || persen === null) ? '' : persen.toFixed(1);
      })
    ).concat([
      mutu ? (mutu.diabaikan ? 'ya' : 'tidak') : ''
    ]);

    dataEeg.interval.forEach(function (titik) {
      // concat() bikin larik BARU tiap baris — kolomPeserta-nya sendiri tidak
      // ikut berubah, jadi aman dipakai berulang untuk baris berikutnya.
      barisBarisData.push(kolomPeserta.concat([
        sesi,
        titik.detik,
        titik.delta.toFixed(3),
        titik.theta.toFixed(3),
        titik.alpha.toFixed(3),
        titik.beta.toFixed(3),
        titik.gamma.toFixed(3)
      ]).concat(kolomMutu));
    });
  });

  return barisBarisData;
}

// Gabungkan jadi teks CSV: baris pertama nama kolom, sisanya data.
// Urutan nama kolom di sini WAJIB sama persis dengan urutan nilai yang
// disusun siapkanDataCsv() di atas — kalau salah satu diubah, yang satunya
// harus ikut diubah, kalau tidak isi kolomnya jadi bergeser.
function buatTeksCsv() {
  var header = [
    'waktu_unduh', 'nama_peserta',
    'pss5_skor', 'pss5_status',
    'sees10_rata_rata', 'sees10_status',
    'hunger_skor',
    'sesi', 'detik',
    'delta', 'theta', 'alpha', 'beta', 'gamma',
    /* Mutu kontak elektroda selama sesi, dua ukuran yang saling melengkapi:
       - kualitas_terburuk_* : nilai terburuk yang pernah muncul.
         1 = bagus, 2 = sedang, 4 = jelek/lepas.
       - persen_jelek_*      : berapa persen waktu elektroda itu berstatus
         jelek. Ini yang sebenarnya menentukan data layak pakai atau tidak —
         terburuk 4 dengan persen 0,3 cuma kedipan sesaat, sedangkan terburuk 4
         dengan persen 40 berarti sesi itu sebaiknya diulang.
       Kolom terakhir menandai apakah peneliti merekam sambil menembus kunci
       kualitas ("ya"/"tidak"). */
    'kualitas_terburuk_tp9', 'kualitas_terburuk_af7',
    'kualitas_terburuk_af8', 'kualitas_terburuk_tp10',
    'persen_jelek_tp9', 'persen_jelek_af7',
    'persen_jelek_af8', 'persen_jelek_tp10',
    'kualitas_diabaikan'
  ];
  var semuaBaris = [header].concat(siapkanDataCsv());

  return semuaBaris.map(function (baris) {
    return baris.map(escapeNilaiCsv).join(',');
  }).join('\n');
}

// Buat file CSV di memori (Blob) lalu picu download-nya lewat elemen <a>
// tersembunyi yang diklik otomatis — ini trik standar buat "download file
// dari JS" tanpa perlu link asli yang kelihatan di halaman.
function unduhCsv() {
  // '﻿' (BOM) di depan teks supaya Excel membaca huruf non-ASCII
  // (misal nama peserta yang pakai huruf beraksen) dengan benar, bukan
  // jadi karakter aneh. Tanpa ini beberapa versi Excel salah tebak encoding-nya.
  var teksCsv = '﻿' + buatTeksCsv();
  var blob = new Blob([teksCsv], { type: 'text/csv;charset=utf-8' });

  var urlSementara = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = urlSementara;
  link.download = 'serenity-data-' + Date.now() + '.csv';
  link.click();

  // Lepas alamat sementara tadi — blob URL tidak otomatis dibersihkan
  // sendiri oleh browser, jadi harus di-revoke manual biar tidak
  // menumpuk di memori.
  URL.revokeObjectURL(urlSementara);
}


// Kunci tombol unduh selama belum ada satu pun sesi EEG yang tersimpan.
//
// Kenapa dikunci, bukan dibiarkan tetap bisa diklik? Karena isi file ini
// adalah baris-baris titik data EEG — tanpa data EEG, yang keluar cuma baris
// nama kolom tanpa isi. File seperti itu gampang dikira rusak, dan yang lebih
// bahaya: peserta bisa merasa datanya sudah aman terunduh padahal rekamannya
// belum tersimpan sama sekali. Lebih jujur kalau tombolnya kelihatan mati
// plus diberi catatan alasannya.
//
// Cukup salah satu sesi ada (eeg1 ATAU eeg2), karena satu sesi saja sudah
// menghasilkan baris data yang valid — kolom "sesi" yang menandai baris itu
// milik rekaman yang mana.
function aturTombolUnduh() {
  var hasil = ambilHasilKuesioner();
  var adaDataEeg = !!(hasil.eeg1 || hasil.eeg2);

  document.getElementById('downloadCsvBtn').disabled = !adaDataEeg;
  document.getElementById('csvKosong').hidden = adaDataEeg;
}


tampilkanRingkasanKuesioner();
tampilkanHasilEeg();
tampilkanRekomendasi();
aturTombolUnduh();

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
