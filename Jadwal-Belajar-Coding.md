# Jadwal Belajar Coding — Persiapan Lomba (Karantina)

**Proyek yang dipelajari:** Muse S Gen 2 – EEG Monitor (`index.html`, `script.js`, `style.css`)
**Tujuan akhir:** Anak paham alur & logika proyek sampai bisa **menulis ulang kodenya dari nol** tanpa contekan saat karantina lomba, dan bisa menjawab "kode ini buat apa/kenapa begini" untuk tiap bagian.
**Target siap:** Senin, 3 Agustus 2026
**Mulai:** Selasa, 28 Juli 2026

---

## Jadwal

| Tanggal | Jenis Hari | Durasi | Fokus |
|---|---|---|---|
| Sel, 28 Jul | Sekolah (malam, ringan) | ~1 jam | HTML dasar kilat — tag, atribut, `id` — langsung ke `index.html` asli, tanpa teori umum |
| Rab, 29 Jul | Sekolah (malam, ringan) | ~1 jam | CSS dasar kilat + JS dasar (variabel, if/for — bridge dari Python) |
| **Kam, 30 Jul** | **DISPEN (full)** | 3–4 jam | JS function, array/object, DOM & event, async/await — semua langsung dari kode asli proyek. Tutup sesi dengan **copy-along**: ngetik ulang 3 file sambil boleh lihat (bangun muscle memory) |
| Jum, 31 Jul | Sekolah (malam, ringan) | ~1 jam | Canvas API + `requestAnimationFrame` + pola buffer (`while read()!==null`, `MAX_POINTS`+`shift`) — fokus jawab "kenapa", bukan hafal syntax |
| **Sab, 1 Ags** | Weekend (full, libur otomatis) | 3–4 jam | **Rebuild #1** — contekan cuma nama fungsi/variabel, isi kosong. Review & benerin bagian lemah di hari yang sama |
| **Min, 2 Ags** | Weekend (full) | 3–4 jam | **Rebuild #2** — blind total tanpa contekan, belum pakai timer. Review, ulang sekali lagi kalau sempat |
| **Sen, 3 Ags** | **DISPEN (full)** | 3–4 jam | **Rebuild #3 — simulasi karantina asli**: blind + timer 60–90 menit. Lanjut review akhir + tes tambah 1 fitur kecil (opsional, cek pemahaman bukan hafalan) |

---

## Cara Cepat Biar Cepat Paham & Bisa

1. **Jangan ngajarin di luar 3 file proyek ini.** Skip semua materi HTML/CSS/JS umum yang gak dipakai — fokus 100% ke pola yang ada di proyek. Scope sempit = cepat.
2. **Teknik "Lihat–Tutup–Tulis–Cek"**: baca satu blok kode, tutup, tulis dari ingatan, cocokkan lagi. Ulangi sampai benar 2x berturut-turut.
3. **Suruh jelasin pakai kata-kata sendiri dulu** sebelum nulis kode (teknik Feynman). Kalau bisa jelasin alurnya ("tombol diklik → connect → data masuk buffer → digambar tiap frame") pakai bahasa sendiri, kode akan lebih gampang direkonstruksi walau lupa detail sintaks.
4. **Interleaving, bukan blok per topik.** Tiap sesi mulai dengan quiz kilat 5 menit dari materi sebelumnya (campur HTML+CSS+JS), baru materi baru.
5. **Variasi kode itu OK.** Kalau nulis ulang beda urutan atribut/nama variabel tapi logika sama & jalan — itu bagus, bukti paham konsep bukan hafalan robot.
6. **Rebuild #3 harus bertimer & tanpa gangguan** — biar terbiasa tekanan karantina asli, gak kaget pas hari-H.
7. **Tidur cukup**, jangan begadang 1–2 hari sebelum lomba — konsolidasi memori terjadi pas tidur.

---

## Kalau Waktu Mepet — Urutan yang Boleh Dipotong

1. **Jangan pernah potong Rebuild #1–#3** (Sabtu–Senin) — ini inti penentu siap/enggak.
2. Kalau harus ngirit waktu, gabung sesi Selasa+Rabu jadi satu sesi malam lebih panjang.
3. Tes tambah fitur di hari terakhir **boleh dilewati** kalau waktu Rebuild #3 molor.
4. Kalau di Rebuild #2 masih banyak lupa detail besar (bukan cuma typo), prioritaskan dia **paham alur logika & bisa jelasin tiap blok** dengan kata sendiri, daripada maksain hafal persis tapi bingung saat ditanya. Juri karantina biasanya lebih menghargai paham konsep daripada kode identik.

---

## Checklist Materi per Blok Kode

- [ ] `index.html` — struktur head/body, section, `id` (connectBtn, status, battery, values, eegChart)
- [ ] `style.css` — selector `#id`/`.class`, flexbox pada `#values`, box model `.card`
- [ ] `script.js` — objek `muse`, array `channels` (`name`, `color`, `buffer`, `history`)
- [ ] `script.js` — event listener `connectBtn` (async/await, `navigator.bluetooth`)
- [ ] `script.js` — `muse.onDisconnected`
- [ ] `script.js` — `updateData()` (pola buffer `while...read()!==null`, `MAX_POINTS`+`shift`)
- [ ] `script.js` — `drawChart()` (Canvas: `clearRect`, `moveTo`/`lineTo`/`stroke`, perhitungan `baseY`/`step`)
- [ ] `script.js` — `loop()` + `requestAnimationFrame`
