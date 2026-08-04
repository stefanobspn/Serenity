# Materi Ajar — Serenity (EEG + Kuesioner)

**Proyek yang dipelajari:** Serenity — web app OPSI 2026, alur lengkap
`index.html` → 3 kuesioner (PSS-5, SEES-10, Hunger Scale) → monitor EEG
(`eeg.html`) → halaman hasil (`hasil.html`).
**Tujuan akhir:** anak paham alur & logika tiap halaman sampai bisa
**menulis ulang kodenya dari nol** tanpa contekan, dan bisa menjawab
"kode ini buat apa/kenapa begini" untuk tiap bagian saat ditanya juri.

Dokumen ini menggantikan total jadwal lama (yang ditulis untuk versi
project lama, cuma 1 halaman EEG monitor tanpa kuesioner). Materi
disusun per **tahap**, bukan per tanggal — supaya bebas diatur sesuai
waktu yang tersedia nanti, bukan terikat ke satu deadline.

---

## Cara Pakai Dokumen Ini

Teknik yang dipakai untuk tiap tahap (terbukti efektif dari persiapan
sebelumnya, dipertahankan karena sifatnya generik, bukan spesifik ke
satu struktur file):

1. **Jangan ngajarin di luar file yang relevan buat tahap itu.** Skip
   materi umum yang gak dipakai di project ini — fokus ke pola yang
   benar-benar ada di kode Serenity. Scope sempit = cepat paham.
2. **Teknik "Lihat–Tutup–Tulis–Cek"**: baca satu blok kode, tutup, tulis
   dari ingatan, cocokkan lagi. Ulangi sampai benar 2x berturut-turut.
3. **Suruh jelasin pakai kata-kata sendiri dulu** sebelum nulis kode
   (teknik Feynman). Kalau bisa jelasin alurnya pakai bahasa sendiri
   ("tombol Lanjut diklik → jawaban dikumpulkan → dihitung skornya →
   disimpan → pindah halaman"), kode akan lebih gampang direkonstruksi
   walau lupa detail sintaks.
4. **Interleaving, bukan blok per topik.** Tiap sesi mulai dengan quiz
   kilat 5 menit dari tahap sebelumnya, baru lanjut tahap baru.
5. **Variasi kode itu OK.** Nulis ulang beda urutan atribut/nama
   variabel tapi logika sama & jalan — itu bagus, bukti paham konsep
   bukan hafalan robot.
6. **Sebelum hari-H lomba**, ulangi Rebuild dengan timer tanpa
   gangguan (lihat Tahap Akhir) supaya terbiasa tekanan karantina asli.

---

## Tahap 0 — HTML & CSS Dasar

**File acuan:** `index.html`, `css/style.css`

**Konsep baru:**
- Struktur dasar HTML: `<head>`, `<body>`, `<main>`, tag teks (`<h1>`, `<p>`)
- Atribut, terutama `id` dan `class` — bedanya apa (id = satu elemen unik,
  class = bisa dipakai berkali-kali)
- Selector CSS `#id` vs `.class`, dan box model (`padding`, `margin`,
  `border-radius`)
- Flexbox dasar lewat `.tombol-baris` (`display: flex; gap: 12px;`) —
  cara menaruh beberapa elemen berdampingan dengan jarak rapi

**Checklist:**
- [ ] Bisa jelasin struktur `index.html` baris per baris
- [ ] Bisa bikin ulang tombol `.btn-mulai` dari nol (warna, padding, radius)
- [ ] Paham kenapa `.tombol-baris` dipakai di beberapa halaman berbeda

---

## Tahap 1 — JavaScript Paling Dasar

**File acuan:** `js/hunger.js` (paling sederhana — TANPA loop/percabangan)

**Konsep baru:**
- Variabel (`var`), memanggil elemen HTML lewat `document.getElementById`
- Function, dan `form.addEventListener('submit', function(event) {...})`
- `event.preventDefault()` — kenapa dibutuhkan (biar halaman gak reload
  otomatis kayak submit form biasa)
- `new FormData(form)` + `.get('nama')` — cara ambil isi form tanpa
  baca satu-satu manual
- `window.location.href = '...'` — pindah halaman lewat JS

**Checklist:**
- [ ] Bisa jelasin alur: klik Lanjut → ambil jawaban → simpan → pindah halaman
- [ ] Coba tulis ulang `hunger.js` dari nol sambil lihat contoh

---

## Tahap 2 — Loop & Percabangan

**File acuan:** `js/pss5.js`, lalu `js/sees10.js`

**Konsep baru (pss5.js):**
- `for` loop buat ambil 5 jawaban (`'q' + i`)
- Menjumlah nilai ke satu variabel (running total)
- Ternary (`kondisi ? nilaiA : nilaiB`) — cara singkat nulis if/else

**Konsep baru (sees10.js):**
- Pembagian buat hitung rata-rata
- `if / else if / else` (versi panjang dari ternary, dipakai karena
  kategorinya ada 3, bukan cuma 2 seperti pss5.js)

**Checklist:**
- [ ] Bisa jelasin kenapa pss5.js pakai ternary tapi sees10.js pakai if/else-if
- [ ] Coba tulis ulang salah satu file ini dari nol

---

## Tahap 3 — Simpan & Ambil Data (`localStorage`)

**File acuan:** `js/storage.js`

**Konsep baru:**
- `localStorage.setItem`/`getItem` — data tersimpan walau halaman
  ditutup/pindah
- `JSON.stringify`/`JSON.parse` — kenapa dibutuhkan (localStorage cuma
  bisa simpan teks, bukan object JS langsung)
- `Object.keys(...).forEach(...)` — cara ulang-ulang tiap properti
  sebuah object

**Checklist:**
- [ ] Bisa jelasin kenapa harus di-`JSON.stringify` dulu sebelum disimpan
- [ ] Paham alur `simpanHasilKuesioner` dipanggil dari semua halaman kuesioner

---

## Tahap 4 — Tampilkan Data Tersimpan

**File acuan:** `js/hasil.js`, HANYA bagian
`tampilkanRingkasanKuesioner`, `tampilkanHasilEeg`, dan
`muatFeedbackTersimpan` (baris 1-87) — belum masuk bagian unduh CSV.

**Konsep baru:**
- `document.createElement('li')` + `.appendChild(...)` — bikin elemen
  HTML baru lewat JS (beda dari sekadar ganti `textContent`)
- `array.forEach(function (item) {...})` — pola "lakukan ini buat tiap
  item", dibandingkan dengan `for` loop yang sudah dipelajari di Tahap 2
- Pola guard/early return: `if (belumAdaData) { ...; return; }` — cek
  dulu sebelum lanjut, biar gak error kalau data belum ada

**Checklist:**
- [ ] Bisa jelasin bedanya `for` loop (Tahap 2) vs `.forEach` (di sini) —
      dua alat buat tugas yang mirip
- [ ] Paham kenapa ada pengecekan "belum ada data" di awal fungsi

---

## Tahap 5 — Pakai Library Eksternal (Versi Sederhana, TANPA Tombol Demo)

**File acuan:** `eeg.html`/`js/eeg.js`, tapi diajarkan dulu pakai
**versi yang disederhanakan** (contoh di bawah, bukan file terpisah di
project) — supaya belum perlu mikirin tombol Demo dulu.

MuseSGen2 (Bluetooth + hitung band power) dan Chart.js (gambar grafik)
diperlakukan sebagai **library siap pakai** — "driver hardware", tidak
perlu tahu isi dalamnya, cukup tahu cara pakai API-nya lewat
`muse.onXxx(...)`.

Contoh versi sederhana (belum ada tombol Demo, jadi callback-nya boleh
ditulis langsung inline, tidak perlu jadi fungsi bernama terpisah):

```js
var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var muse = new MuseSGen2();

connectBtn.addEventListener('click', function () {
  muse.connect();
});

muse.onStatusChange(function (text, state) {
  statusEl.textContent = 'Status: ' + text;
});

muse.onBandPower(function (powers) {
  document.getElementById('band-delta').textContent = powers.delta;
  // ...dan seterusnya buat band lain
});
```

**Konsep baru:**
- Memanggil object dari library eksternal (`new MuseSGen2()`)
- "Daftar" fungsi callback lewat `muse.onXxx(function (...) {...})` —
  fungsi itu baru dijalankan NANTI, waktu library-nya punya data baru,
  bukan langsung saat baris itu dieksekusi
- Chart.js sebagai object konfigurasi: isi `data`/`options`-nya sesuai
  "resep", tidak perlu tahu cara Chart.js menggambar di dalamnya

**Checklist:**
- [ ] Bisa jelasin kenapa isi function di dalam `muse.onBandPower(...)`
      tidak langsung jalan pas halaman dibuka
- [ ] Coba tulis ulang versi sederhana ini dari nol (tanpa grafik dulu,
      cukup tampilkan angka band power)

---

## Tahap 6 — Timer & Akumulator (Fitur Rekam 1 Menit)

**File acuan:** `js/eeg.js` bagian `mulaiRekam`/`selesaiRekam`
(baris ~122-195)

Sebelum masuk ke kode aslinya, latihan dulu pakai contoh mini berdiri
sendiri — supaya `setInterval` dan pola akumulator dipahami sebagai
konsep sendiri dulu, baru dikaitkan ke kode yang lebih ramai:

```js
var sisaDetik = 5;
var timer = setInterval(function () {
  sisaDetik--;
  console.log('Sisa: ' + sisaDetik);
  if (sisaDetik <= 0) {
    clearInterval(timer);
    console.log('Selesai!');
  }
}, 1000);
```

**Konsep baru:**
- `setInterval(function () {...}, ms)` — jalankan sesuatu berulang
  tiap sekian milidetik
- `clearInterval(timer)` — cara menghentikannya, dan kenapa perlu
  disimpan ke variabel dulu (`timer`) supaya bisa dihentikan nanti
- Pola akumulator: jumlahkan nilai tiap kali data baru masuk
  (`jumlahBandPower[band.key] += powers[band.key]`), baru dibagi
  jadi rata-rata SEKALI di akhir (`selesaiRekam`)

**Checklist:**
- [ ] Bisa jelasin kenapa variabel `timerRekam` perlu disimpan, bukan
      langsung `setInterval(...)` tanpa ditampung
- [ ] Bisa jelasin alur penuh: Mulai Rekam → tiap detik dihitung mundur →
      tiap ada data band power ditambah ke total → waktu habis →
      dibagi jadi rata-rata → disimpan → pindah ke hasil.html

---

## Tahap 7 (Lanjutan) — Tombol Demo

**File acuan:** `js/eeg.js` versi ASLI lengkap (baris 213-227, 235-293,
320-349)

Sekarang bandingkan versi sederhana di Tahap 5 dengan kode asli. Kode
asli punya tombol "Demo (Data Dummy)" buat testing tanpa headset fisik
— ini alasan kenapa `handleStatusChange` dan `handleBandPower` (yang di
Tahap 5 cukup ditulis inline) di kode asli ditulis sebagai **fungsi
bernama terpisah**: supaya bisa dipanggil dua cara — otomatis lewat
`muse.onXxx(handleBandPower)`, ATAU dipanggil manual dari tombol Demo
seolah-olah data itu datang dari headset asli.

**Konsep baru:**
- Function sebagai "nilai" yang bisa disimpan ke variabel, dioper ke
  tempat lain, dan dipanggil dari lebih dari satu tempat
- Kenapa pola ini dipilih dibanding menulis dua kali logika yang sama
  (sekali buat data asli, sekali buat data dummy)

**Checklist:**
- [ ] Bisa jelasin bedanya versi Tahap 5 vs versi asli, dan KENAPA
      bedanya ada (jawabannya: tombol Demo)
- [ ] Bisa jelasin fungsi `handleBandPower` yang sekarang cuma 3 baris
      (baris 284-288) — tiap baris manggil satu fungsi kecil terpisah
      (`perbaruiKartuBand`, `tambahTitikGrafik`,
      `tambahSampelJikaSedangRekam`), tiap fungsi kecil itu ngerjain
      satu tugas doang

---

## Tahap 8 (Lanjutan) — Unduh Hasil sebagai CSV

**File acuan:** `js/hasil.js` baris 90-165

Modul mandiri, dipelajari terakhir karena triknya lompatan konsep besar
tanpa nyambung ke bagian lain app ini.

**Konsep baru:**
- Kenapa nilai CSV yang mengandung koma/kutip/enter harus "dibungkus"
  (`escapeNilaiCsv`, baris 92-103) — supaya spreadsheet gak salah baca
  kolom
- `Blob` — bikin file di memori tanpa lewat server
- `URL.createObjectURL(blob)` + elemen `<a download>` yang diklik
  otomatis lewat JS — trik standar "download file dari JS"
- Kenapa ada karakter BOM di depan teks CSV (baris 149-151) — supaya
  Excel baca huruf non-ASCII (misal dari feedback bahasa Indonesia)
  dengan benar

**Checklist:**
- [ ] Bisa jelasin alur `unduhCsv()` dari atas ke bawah
- [ ] Paham ini "resep" tersendiri yang boleh dihafal polanya (bukan
      diturunkan dari konsep JS lain yang sudah dipelajari)

---

## Tahap Akhir — Rebuild dari Nol

Setelah semua tahap di atas dikuasai satu-satu, gabungkan jadi satu
project utuh:

1. **Rebuild #1** — contekan cuma nama file/fungsi/variabel, isi kosong.
   Review & benerin bagian lemah di hari yang sama.
2. **Rebuild #2** — blind total tanpa contekan, belum pakai timer.
3. **Rebuild #3 — simulasi karantina asli** — blind + timer (60-90
   menit), tanpa gangguan. Ini yang paling menentukan siap/tidaknya.

Kalau di Rebuild #2 masih banyak lupa detail besar (bukan cuma typo),
prioritaskan paham alur logika & bisa jelasin tiap blok dengan kata
sendiri, daripada maksain hafal persis tapi bingung saat ditanya. Juri
biasanya lebih menghargai paham konsep daripada kode identik.
