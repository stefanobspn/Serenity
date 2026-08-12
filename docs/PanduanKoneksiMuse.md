# Panduan Menyambungkan Muse ke Serenity (lewat HP Android)

Panduan langkah demi langkah untuk mengalirkan data dari headset Muse ke
aplikasi Serenity.

Disusun berdasarkan panduan resmi *Muse Lab Guide for SDK Users V1.7* (ada di
`muse_official_sdk/SDK - RDK/MuseLab/`). Tampilan aplikasi Muse bisa sedikit
berbeda tergantung versi — kalau nama menunya tidak persis sama, cari yang
paling mirip.

---

## Alur besarnya

```
Headset Muse  →  Aplikasi Muse di HP  →  WiFi  →  Laptop  →  Halaman Serenity
                 (Bluetooth)              (OSC/UDP)  (relay.js)   (browser)
```

HP-nya **wajib** ada di jalur ini. Aplikasi Muse resmi yang menyambung ke
headset lewat Bluetooth, lalu meneruskan datanya ke laptop lewat WiFi.

---

# BAGIAN 1 — Yang bisa dikerjakan SEKARANG (belum punya headset)

> ## ⚠️ Sudah dicoba: menu Developer Tools TIDAK ADA
>
> Aplikasi Muse dari Play Store sudah dipasang dan diperiksa (Agustus 2026):
> **menu DEVELOPER TOOLS → OSC Output tidak ada di Settings.**
>
> Dugaan terkuat: tangkapan layar di panduan resmi Muse Lab diambil dari versi
> aplikasi khusus pengembang, bukan aplikasi meditasi biasa yang ada di Play
> Store. Petunjuknya ada di tangkapan layar itu sendiri — ada bagian
> "INTERNAL DEVELOPER TOOLS" yang jelas bukan untuk pengguna umum.
>
> Aplikasi yang memang bisa mengirim OSC dari headset Muse:
>
> | Aplikasi | Pembuat | Platform | Bisa dipakai untuk lomba? |
> |---|---|---|---|
> | Muse Direct | Interaxon (resmi) | **iOS saja** | Ya, tapi butuh perangkat iOS |
> | Mind Monitor / Muse Monitor | pihak ketiga | Android + iOS | **Tidak** — bukan SDK resmi |
> | Aplikasi buatan sendiri | kita | Android | **Ya** — pakai SDK resmi |
>
> **Sudah diatasi:** kita membuat aplikasi Android sendiri dengan SDK resmi
> (lihat `docs/BridgeSdkResmi.md`). APK-nya sudah jadi dan sudah diuji. Aplikasi
> itu punya kolom IP/port sendiri **plus tombol "Kirim Tes"** — jadi
> langkah-langkah di bawah tetap berlaku, tinggal ganti "aplikasi Muse" jadi
> "aplikasi TestLibMuseAndroid".
>
> **Yang masih perlu dipastikan:** tanyakan ke Interaxon apakah ada versi
> aplikasi resmi dengan OSC Output untuk Android. Sekalian ditanyakan waktu
> mengurus izin/lisensi SDK untuk lomba — dua urusan, satu email.

Tujuan bagian ini: memastikan **jalur jaringan HP → laptop sudah tembus**,
supaya nanti waktu headset datang, tinggal urusan headset saja yang perlu
dipikirkan.

## 1.1 Pasang aplikasi pengirim OSC di HP

Sesuai catatan di atas, ini nantinya **aplikasi Android buatan sendiri** yang
dibangun dari contoh `TestLibMuseAndroid` di SDK resmi. Contoh itu sudah punya
kolom pengaturan IP dan port bawaan, jadi tampilannya mirip dengan yang
dijelaskan di sini.

## 1.2 Sambungkan HP dan laptop ke WiFi yang sama

Dua-duanya harus di jaringan yang sama. Kalau ragu, **pakai hotspot dari HP**
lalu sambungkan laptop ke hotspot itu — cara ini paling aman karena tidak ada
pengaturan WiFi asing yang bisa menghalangi (lihat Bagian 3).

## 1.3 Jalankan relay di laptop

Di terminal, dari folder proyek Serenity:

```
node bridge/relay.js
```

Yang muncul kira-kira begini:

```
[relay] Serenity siap di  http://localhost:8080/pages/userform.html
[relay] Cek aliran data:  curl http://localhost:8080/eeg-stream
[relay] mendengarkan OSC di UDP port 7000
[relay] arahkan aplikasi Muse di HP ke IP laptop ini, port 7000
[relay] IP laptop ini: 192.168.1.72 (wlan0)
```

**Catat angka IP di baris terakhir** (contoh di atas: `192.168.1.72`). Itu yang
diisikan ke aplikasi di HP. Angkanya beda-beda tiap jaringan, jadi jangan
menyalin contoh ini mentah-mentah.

Biarkan terminal ini terbuka. Semua pemeriksaan berikutnya dibaca dari sini.

## 1.3b Buka firewall laptop (SEKALI SAJA, tapi WAJIB)

**Ini pernah bikin bingung setengah jam waktu pertama kali disiapkan.** Kalau
laptop memakai firewall (`ufw` di Arch/Ubuntu, aktif secara bawaan di banyak
sistem), paket dari HP akan **sampai ke laptop lalu dibuang diam-diam** sebelum
relay sempat melihatnya.

Yang bikin menyesatkan: `ping` dari laptop ke HP tetap jalan (firewall biasanya
mengizinkan ping), aplikasi di HP juga bilang "Terkirim" — karena UDP memang
tidak pernah memberi kabar apakah paketnya diterima. Jadi semuanya kelihatan
normal padahal datanya hilang di depan pintu.

Cek dan buka:

```bash
sudo ufw status            # kalau hasilnya "inactive", tidak perlu apa-apa
sudo ufw allow 7000/udp
```

Kalau memakai firewall lain (firewalld, iptables), buka juga **UDP port 7000**.

## 1.4 Buka pengaturan pengiriman OSC di aplikasi

Di aplikasi buatan sendiri, kolom IP dan port ada langsung di layar utama
(begitu bawaan contoh `TestLibMuseAndroid`).

Sebagai catatan sejarah, di aplikasi versi pengembang milik Interaxon
jalurnya begini: **Me Screen** (ikon kanan bawah) → **Settings** (ikon gerigi
kanan atas) → gulir ke **DEVELOPER TOOLS** → **OSC Output**. Menu ini
**tidak ada** di aplikasi Play Store biasa — lihat peringatan di awal
BAGIAN 1.

## 1.5 Isi tujuan pengiriman

Di layar OSC Output:

| Kolom | Diisi apa |
|---|---|
| **IP Address** | angka IP laptop dari langkah 1.3 (misal `192.168.1.72`) |
| **Port** | `7000` |
| **Messages Prefix** | kosongkan saja |
| **Streaming Enabled** | nyalakan |

Soal **Port**: panduan resmi Muse mencontohkan `5001`, tapi relay ini
defaultnya `7000`. Yang penting **dua angkanya sama**. Kalau di aplikasi
angkanya tidak bisa diubah, relay-nya yang menyesuaikan:

```
node bridge/relay.js --port-udp=5001
```

Soal **Messages Prefix**: dikosongkan saja supaya tidak menambah variabel baru.
Tapi kalau terlanjur diisi, tidak apa-apa — relay sudah dibuat menerima awalan
apa pun.

## 1.6 Kirim satu paket percobaan

Begitu aplikasi Android buatan sendiri sudah bisa dipasang, nyalakan
streaming-nya sebentar (tanpa headset pun tidak apa-apa) lalu **lihat terminal
laptop**.

Selama aplikasi itu belum jadi, jalur jaringannya tetap bisa dites dari laptop
sendiri pakai simulator — lihat "Mau coba tanpa headset dan tanpa HP" di
Bagian 3.

### Kalau berhasil

Muncul baris seperti ini:

```
[relay] menerima paket dari 192.168.1.55 — jaringan OK
[relay] sinyal masuk: /muse/test  (diabaikan)
```

Artinya jalur HP → WiFi → laptop **sudah tembus**. Tulisan `(diabaikan)` itu
normal dan bukan error: pesan tes memang bukan data EEG, jadi Serenity tidak
memakainya. Yang penting paketnya sampai.

Sampai di sini, semua yang bisa disiapkan tanpa headset sudah beres.

### Kalau tidak muncul apa-apa

Berarti paketnya tidak sampai. Lihat Bagian 3 (Kalau ada masalah).

---

# BAGIAN 2 — Kalau headset Muse sudah ada

## 2.1 Pasang headset dan sambungkan ke aplikasi

1. Nyalakan headset Muse S Gen 2
2. Pasang di kepala: bantalan belakang telinga menempel di kulit, bagian dahi
   rapat, dan **singkirkan rambut yang terjepit di bawah elektroda** — ini
   penyebab sinyal jelek nomor satu
3. Di aplikasi Muse, ketuk ikon Bluetooth di kiri atas, sambungkan ke headset
4. Tunggu sampai aplikasi menunjukkan sinyalnya sudah bagus

## 2.2 Nyalakan streaming

Ulangi langkah 1.4 dan 1.5 (menu OSC Output, isi IP dan port, nyalakan
Streaming Enabled). Kalau sebelumnya sudah diisi, biasanya masih tersimpan.

## 2.3 Jaga layar HP tetap menyala

Panduan resmi memperingatkan: **kalau layar HP mati atau aplikasi pindah ke
belakang, streaming-nya ikut berhenti.** Saran panduan resmi: mulai sesi *mind
meditation* di aplikasi supaya layarnya tetap hidup selama perekaman.

Ini penting banget waktu sesi penelitian — data bisa berhenti di tengah jalan
tanpa ada yang sadar.

## 2.4 PEMERIKSAAN PENENTU — apakah band power ikut dikirim?

**Ini pemeriksaan paling penting di seluruh panduan ini.** Hasilnya menentukan
apakah masih ada kode yang harus ditulis atau tidak.

Setelah streaming menyala, **baca daftar "sinyal masuk" di terminal**.

### Hasil A — ada band power (yang kita harapkan)

```
[relay] sinyal masuk: /muse/elements/alpha_absolute  (dipakai)
[relay] sinyal masuk: /muse/elements/beta_absolute   (dipakai)
[relay] sinyal masuk: /muse/elements/theta_absolute  (dipakai)
[relay] sinyal masuk: /muse/elements/delta_absolute  (dipakai)
[relay] sinyal masuk: /muse/elements/gamma_absolute  (dipakai)
[relay] sinyal masuk: /muse/elements/horseshoe       (dipakai)
```

**Selesai.** Tidak ada kode yang perlu ditulis lagi. Buka
`http://localhost:8080/pages/eegmonitor.html` dan angkanya akan bergerak.

### Hasil B — cuma sinyal mentah

```
[relay] sinyal masuk: /muse/eeg   (diabaikan)
[relay] sinyal masuk: /muse/acc   (diabaikan)
[relay] sinyal masuk: /muse/gyro  (diabaikan)
[relay] sinyal masuk: /muse/ppg   (diabaikan)

[relay] PERHATIAN: data OSC masuk, tapi TIDAK ADA band power di dalamnya.
```

Artinya aplikasi Muse cuma mengirim sinyal mentah. Serenity butuh band power
dari DSP resmi Muse, bukan hitungan sendiri — jadi jalur ini tidak bisa dipakai
apa adanya, dan harus dibuatkan aplikasi Android sendiri memakai SDK resmi.
Lihat `docs/BridgeSdkResmi.md` bagian "Kalau harus jalur C".

Bukan kabar buruk-buruk amat: contoh Android bawaan SDK sudah punya pengirim
OSC yang berfungsi, jadi yang perlu ditambahkan tidak banyak.

## 2.5 Buka Serenity

Kalau hasilnya A, buka di browser laptop:

```
http://localhost:8080/pages/userform.html
```

**Penting:** halaman harus dibuka lewat alamat `http://localhost:8080/...`,
**bukan** dengan klik dua kali file HTML-nya. Kalau dibuka lewat `file://`,
datanya tidak akan pernah muncul — halaman monitor akan memberi tahu ini kalau
terjadi.

Di halaman EEG Monitor, yang harus terlihat:

- Status: **Terhubung — data mengalir dari SDK resmi Muse**
- Kartu Delta/Theta/Alpha/Beta/Gamma berisi angka yang bergerak
- Kualitas Sinyal: keempat elektroda **bagus**
- Grafik bergerak dari kanan ke kiri

Tombol **Mulai Rekam** akan terkunci selama masih ada elektroda yang jelek —
itu memang disengaja. Rapikan dulu posisi headset sampai keempatnya bagus.

---

# BAGIAN 3 — Kalau ada masalah

## Tidak ada baris "menerima paket dari ..." sama sekali

Berarti paket dari HP tidak sampai ke laptop. Urut dari yang paling sering:

1. **Firewall laptop memblokir UDP 7000.** *Penyebab paling sering, dan paling
   menyesatkan* — lihat langkah 1.3b. Gejalanya: HP bilang "Terkirim", ping
   jalan, tapi terminal relay diam saja. Cek: `sudo ufw status`.
2. **IP-nya salah.** IP laptop berubah tiap ganti jaringan. Baca ulang baris
   `[relay] IP laptop ini:` di terminal, jangan pakai angka lama.
3. **Beda jaringan.** HP dan laptop harus di WiFi yang sama persis. HP yang
   masih pakai data seluler juga bisa jadi penyebab.
4. **WiFi-nya memblokir komunikasi antar-perangkat.** Banyak WiFi sekolah dan
   tempat lomba melakukan ini (namanya *AP isolation*), dan tidak ada yang bisa
   diubah dari sisi kita. **Solusinya: pakai hotspot dari HP**, lalu sambungkan
   laptop ke hotspot itu.
   Cara membedakannya dari firewall: coba `ping <ip-hp>` dari laptop. Kalau
   ping gagal → AP isolation. Kalau ping jalan tapi paket tidak sampai →
   firewall.
5. **Port-nya beda** antara aplikasi dan relay.

Kalau ragu aplikasinya sudah mengirim atau belum, colok HP ke laptop lalu:

```bash
adb logcat | grep "Kirim Tes"
```

Kalau barisnya muncul tapi relay tetap diam, berarti aplikasinya sudah benar dan
masalahnya ada di jaringan/firewall.

## Muncul "(paket tidak dikenali, ... byte)"

Paketnya sampai (jaringan sudah benar), cuma isinya tidak terbaca sebagai OSC.
Biasanya ini pesan tes yang bentuknya tidak standar — tidak masalah. Yang
penting jaringannya sudah tembus.

## Data mengalir, tapi halaman tetap kosong

Cek dari terminal lain:

```
curl http://localhost:8080/eeg-stream
```

- Keluar `"tipe":"bandpower"` → relay sehat, masalahnya di browser. Pastikan
  halaman dibuka lewat `http://localhost:8080/...`, bukan `file://`.
- Cuma `"state":"disconnected"` → relay sehat, HP-nya yang belum mengirim.
- `curl` gagal → relay-nya belum jalan.

## "Port 8080 sudah dipakai"

Relay-nya sudah jalan di terminal lain. Tidak perlu dijalankan dua kali —
langsung buka halamannya saja.

## Mau coba tanpa headset dan tanpa HP

Di terminal terpisah:

```
node bridge/simulate-osc.js
```

Ini berpura-pura jadi HP dan mengirim data karangan, supaya seluruh alur
(grafik, rekam, sampai Hasil Akhir) bisa dicoba. **Angkanya bukan data EEG
asli**, cuma buat latihan dan pengetesan.

---

# BAGIAN 4 — Daftar periksa hari-H

Cetak atau catat, lalu periksa satu per satu sebelum peserta pertama datang:

- [ ] Headset Muse terisi baterai
- [ ] HP terisi baterai, dan **pengaturan layar-mati dimatikan/diperpanjang**
- [ ] Laptop terisi baterai / ada colokan
- [ ] HP dan laptop di jaringan yang sama (**hotspot HP paling aman**)
- [ ] Firewall laptop sudah membuka UDP 7000 (`sudo ufw status`)
- [ ] `node bridge/relay.js` sudah jalan, IP laptop sudah dicatat
- [ ] Tombol **Kirim Tes** di aplikasi sudah dicoba, dan terminal menampilkan
      `menerima paket dari ...` (lakukan ini SEBELUM peserta datang)
- [ ] IP dan port di aplikasi Muse sudah diisi, Streaming Enabled menyala
- [ ] Terminal sudah menampilkan `menerima paket dari ...`
- [ ] Terminal sudah menampilkan band power `(dipakai)`
- [ ] Halaman EEG Monitor dibuka lewat `http://localhost:8080/...`
- [ ] Kualitas sinyal keempat elektroda **bagus**
- [ ] Sudah dicoba rekam singkat sampai ke halaman Hasil Akhir, lalu
      `localStorage` dibersihkan lewat tombol **Mulai Sesi Baru**

Satu hal yang paling sering terlupa: **layar HP mati di tengah perekaman**.
Periksa ini dulu sebelum menyalahkan hal lain.
