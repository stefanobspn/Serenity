# Panduan Pemakaian Serenity

Panduan untuk menjalankan pengambilan data EEG dengan headset Muse dan aplikasi
Serenity.

Yang perlu disiapkan:

- Headset **Muse S Gen 2** (sudah terisi baterai)
- **HP Android** (Android 6 ke atas)
- **Laptop** dengan **Node.js** terpasang, plus folder Serenity
- File **APK** yang dikirim Stefano
- **WiFi** yang bisa dipakai HP dan laptop bersama-sama

> Tidak ada server dan tidak butuh internet. Semua datanya berjalan di dalam
> jaringan WiFi Anda sendiri dan tidak pernah keluar dari ruangan.

---

## Gambaran alurnya

```
Headset Muse  →  HP  →  WiFi lokal  →  Relay di laptop  →  Halaman Serenity
              Bluetooth                (jendela hitam)      (di Chrome)
```

HP-nya bertugas sebagai perantara: dia yang menyambung ke headset lewat
Bluetooth, lalu mengirim datanya ke laptop lewat WiFi. Jadi **HP harus tetap
menyala dan aplikasinya tetap terbuka** selama perekaman.

Di laptop ada satu program kecil bernama **relay** yang harus berjalan selama
sesi. Dialah yang menerima data dari HP sekaligus menyajikan halaman
Serenity-nya. Kalau relay-nya ditutup, halamannya ikut mati.

> **Kenapa tidak pakai website di internet saja?** Dulu memang begitu, tapi
> cara itu dilepas. Menaruhnya di internet berarti nama peserta dan data
> EEG-nya melewati server publik tanpa login, dan port datanya terbuka untuk
> siapa saja. Untuk penelitian yang melibatkan siswa, menjalankannya di
> jaringan sendiri jauh lebih aman — dan kebetulan juga lebih sederhana.

---

# BAGIAN 1 — Persiapan (cukup sekali)

## 1.1 Pasang aplikasi di HP

1. Kirim file APK ke HP (lewat WhatsApp, Google Drive, atau kabel USB)
2. Buka file APK-nya di HP
3. Android akan menolak dan menampilkan peringatan seperti *"Demi keamanan,
   ponsel Anda tidak diizinkan memasang aplikasi tidak dikenal dari sumber
   ini"* — ini **normal**, karena aplikasinya tidak lewat Play Store
4. Ketuk **Setelan** pada peringatan itu, lalu nyalakan **Izinkan dari sumber
   ini**
5. Kembali, lalu ketuk **Pasang**

Setelah terpasang, aplikasinya bernama **TestLibMuseAndroid**.

> Tampilan aplikasinya berbahasa Inggris dan terlihat sederhana. Itu memang
> aplikasi teknis dari pabrik headset-nya, bukan aplikasi yang dipercantik.

## 1.2 Izinkan Bluetooth

Buka aplikasinya. Akan muncul permintaan izin Bluetooth — ketuk **Izinkan**.
Kalau tidak diizinkan, aplikasinya tidak akan bisa menemukan headset.

## 1.3 Jalankan relay di laptop

Buka folder Serenity di laptop, lalu jalankan:

```
node bridge/relay.js
```

Jendelanya akan menampilkan beberapa baris, dan **satu baris yang paling
penting**:

> `[relay] alamat IP mesin ini: 192.168.1.5 (wlan0)`

Catat angka itu — itulah alamat yang nanti diisi di HP. Angkanya berbeda-beda
tiap jaringan, dan **bisa berubah kalau laptop pindah WiFi atau di-restart**,
jadi periksa lagi baris ini tiap kali mau mulai sesi.

Biarkan jendela itu terbuka selama sesi berlangsung. Menutupnya sama dengan
mematikan aplikasinya.

## 1.4 Isi alamat di HP

Gulir ke bawah sampai bagian **OSC output** di aplikasi HP. Ada tiga kolom:

| Kolom | Diisi |
|---|---|
| Kolom kiri (IP) | **alamat IP laptop** dari langkah 1.3 |
| Kolom tengah (Port) | **7000** |
| Kotak centang "Enable" | biarkan dulu, nanti dicentang |

Isinya tersimpan otomatis, jadi cukup diisi ulang kalau alamat IP laptopnya
berubah.

Pastikan **HP dan laptop tersambung ke WiFi yang sama**. Kalau berbeda
jaringan, datanya tidak akan pernah sampai walaupun semua pengaturannya benar.

## 1.5 Tes koneksi — PENTING

Ketuk tombol **Send Test**.

Akan muncul pesan sekilas di bawah layar HP: *"Sent to ..."*. Pesan itu cuma
berarti "sudah dikirim", **bukan** "sudah diterima".

Yang membuktikan sampai adalah **website-nya sendiri**. Buka halaman EEG
Monitor di laptop, dan kalau paketnya benar-benar tiba akan muncul baris:

> Paket dari HP (192.168.x.x) pernah sampai jam 09.28.20 — jaringan OK.

Baris itu **menetap** di layar, jadi tidak masalah kalau Anda sedang tidak
menatap laptop waktu menekan Send Test. Kalau baris itu muncul, jaringannya
terbukti jalan dan persiapan ini tidak perlu diulang lagi.

Kalau setelah beberapa kali Send Test baris itu tidak juga muncul, kabari
Stefano — kemungkinan besar alamat IP-nya salah atau HP dan laptop tidak berada
di jaringan yang sama.

---

# BAGIAN 2 — Menjalankan sesi perekaman

## 2.1 Pasang headset

1. Nyalakan headset Muse
2. Pasang di kepala:
   - bagian dahi menempel rapat
   - bantalan di belakang telinga menyentuh kulit
   - **singkirkan rambut yang terjepit di bawah elektroda** — ini penyebab
     sinyal jelek nomor satu

## 2.2 Sambungkan headset ke HP

1. Buka aplikasi **TestLibMuseAndroid**
2. Ketuk **REFRESH** — nama headset akan muncul di daftar atas
3. Pilih headset itu, lalu ketuk **CONNECT**
4. Tunggu sampai **Connection Status** berubah jadi `connected`

## 2.3 Nyalakan pengiriman data

Centang kotak **Enable** di bagian OSC output.

**Mulai sekarang, jangan kunci layar HP dan jangan pindah ke aplikasi lain.**
Kalau layar mati, pengiriman datanya ikut berhenti dan perekaman gagal tanpa
peringatan. Kalau perlu, atur dulu *Setelan → Layar → Waktu layar mati* ke
durasi paling lama.

## 2.4 Buka halaman Serenity di laptop

Pastikan relay-nya masih berjalan (langkah 1.3 — jendela hitam itu masih
terbuka). Lalu buka **Google Chrome** di laptop yang sama, ke alamat:

```
http://localhost:8080/pages/userform.html
```

> Alamat `localhost` ini dibuka **di laptop yang menjalankan relay**, bukan di
> HP. HP tidak perlu membuka halaman apa pun — tugasnya cuma mengirim data.

Isi nama peserta, lalu ikuti alurnya:

```
Nama → Kuesioner PSS-5 → SEES-10 → Skala Lapar → EEG Monitor → Hasil Akhir
```

## 2.5 Periksa kualitas sinyal

Di halaman **EEG Monitor**, perhatikan bagian **Kualitas Sinyal**. Tiap
elektroda akan tertulis **bagus**, **sedang**, atau **jelek**.

**"Sedang" itu sudah cukup untuk merekam.** Jangan habiskan waktu mengejar
keempatnya jadi "bagus" — pada praktiknya hampir selalu ada satu yang bertahan
di "sedang", dan itu wajar. Tombol **Mulai Rekam** cuma dikunci kalau ada
elektroda yang benar-benar **jelek** (artinya lepas atau tidak menyentuh kulit
sama sekali).

Kalau ada yang **jelek**:

- rapikan lagi posisi headset
- pastikan kulit di titik elektroda tidak tertutup rambut
- minta peserta diam sebentar (banyak gerak bikin sinyal kacau)

> Kalau ada satu elektroda yang benar-benar tidak mau lepas dari "jelek"
> (misalnya rambut sangat tebal), ada centang **"Rekam saja walaupun ada
> elektroda yang jelek"**. Pakai ini seperlunya saja. Tidak perlu dicatat
> manual — aplikasinya sudah ikut menyimpan mutu sinyal tiap sesi ke file CSV
> (kolom `kualitas_terburuk_*`, `persen_jelek_*`, dan `kualitas_diabaikan`),
> jadi waktu analisis nanti ketahuan sendiri sesi mana yang diambil dalam
> kondisi kurang ideal.

## 2.6 Rekam EEG 1 (baseline)

1. Pastikan angka Delta/Theta/Alpha/Beta/Gamma sudah bergerak
2. Ketuk **Mulai Rekam**
3. Layar akan menampilkan **"Masa tenang... 30 detik lagi"** — ini normal,
   bukan macet. Selama 30 detik itu peserta duduk santai dan datanya sengaja
   **belum** dikumpulkan
4. Setelah hitungannya habis, tulisannya berubah jadi "Merekam... sekian detik
   berjalan". Baru dari sinilah datanya dihitung
5. Setelah 2 menit, ketuk **Stop Rekam**

> **Kenapa ada masa tenang.** Detik-detik awal tiap rekaman selalu bergolak —
> peserta masih membetulkan posisi duduk dan elektrodanya baru menyesuaikan
> diri. Waktu diuji, 50 detik pertama menghasilkan angka yang jauh berbeda dari
> 50 detik terakhir pada sesi yang sama. Kalau bagian itu ikut terekam, selisih
> antara Tahap Satu dan Tahap Dua jadi tercampur dengan gejolak awal ini, bukan
> murni efek yang diteliti. Biarkan centangnya menyala.
>
> Kalau menekan **Stop Rekam** selagi masa tenang masih berjalan, perekamannya
> dianggap **batal** — tidak ada data yang tersimpan dan tidak ada hasil lama
> yang tertimpa. Tinggal tekan Mulai Rekam lagi.

**Pakai lama yang sama untuk semua peserta dan untuk kedua sesi** — misalnya
2 menit untuk EEG 1 dan 2 menit untuk EEG 2. Durasi yang tidak sama membuat
kedua sesi tidak setara waktu dibandingkan.

## 2.7 Aktivitas

Setelah EEG 1 selesai, halaman otomatis berganti ke **EEG 2**.

Lakukan aktivitas yang sudah direncanakan (misalnya tes memori atau
aritmatika). Headset **tetap dipakai**, jangan dilepas.

## 2.8 Rekam EEG 2

Ketuk **Mulai Rekam EEG 2**. Masa tenang 30 detik berlaku lagi di sini, dan itu
justru pas: mulailah aktivitasnya lebih dulu, biarkan 30 detik itu lewat sambil
peserta masuk ke ritme tugasnya, baru datanya dikumpulkan.

Setelah durasinya sama dengan EEG 1 (misalnya 2 menit), ketuk **Stop Rekam**.

Halaman akan otomatis pindah ke **Hasil Akhir**.

## 2.9 Simpan hasilnya

Di halaman Hasil Akhir ada dua tombol unduhan:

- **Unduh Hasil (CSV)** — ringkasan satu peserta
- **Unduh Data Interval (CSV)** — data per potongan waktu, untuk analisis lebih
  detail

**Unduh keduanya sebelum menutup halaman.** Datanya tersimpan di browser saja,
dan akan hilang kalau menekan "Mulai Sesi Baru".

Beri nama file yang jelas, misalnya `peserta-01-tahap1.csv`.

## 2.10 Peserta berikutnya

Ketuk **Mulai Sesi Baru** di halaman Hasil Akhir, lalu ulangi dari 2.1.

---

# BAGIAN 3 — Kalau ada masalah

## Angka di website tidak muncul sama sekali

Periksa berurutan:

1. **Layar HP masih menyala?** Ini penyebab paling sering.
2. **Kotak "Enable" masih tercentang?**
3. **Connection Status di HP masih `connected`?**
4. **Jendela relay di laptop masih terbuka?** Kalau tertutup, jalankan lagi
   `node bridge/relay.js`.
5. **HP dan laptop masih di WiFi yang sama?**
6. **Alamat IP di HP masih cocok?** IP laptop bisa berubah setelah pindah WiFi
   atau restart. Bandingkan dengan baris `alamat IP mesin ini:` di jendela
   relay, dan perbaiki isian di HP kalau berbeda.
7. Coba ketuk **Send Test** lagi, lalu lihat apakah baris "jaringan OK" muncul
   di halaman EEG Monitor.

## Angka muncul tapi berhenti di tengah perekaman

Hampir selalu karena layar HP mati atau aplikasinya pindah ke belakang.
Ulangi perekaman peserta itu dari awal.

## Muncul "Headset tidak menempel di kepala"

Artinya paketnya tetap sampai, tapi elektrodanya sudah tidak menyentuh kulit —
biasanya headset-nya melorot atau terlepas. Angka band power akan berhenti
bergerak dan tombol rekam ikut terkunci sampai kontaknya pulih.

Pasang ulang headset-nya sampai angkanya bergerak lagi, lalu **ulangi
perekaman peserta itu dari awal**. Data yang terlanjur terkumpul sebelum
headset lepas tidak bisa dipakai.

> Peringatan ini sengaja dibuat, karena sebelumnya kegagalan ini tidak
> kelihatan sama sekali: layar tetap menampilkan angka yang meyakinkan padahal
> headset-nya tergeletak di meja.

## Kualitas sinyal tidak mau bagus

- Basahi sedikit titik kontak di belakang telinga dengan air (jangan basah
  kuyup) — ini trik standar untuk EEG
- Pastikan headset tidak terlalu longgar
- Minta peserta tidak bicara dan tidak banyak mengunyah

## Headset tidak muncul waktu REFRESH

- Pastikan headset menyala (lampunya menyala)
- Matikan lalu nyalakan lagi Bluetooth di HP
- Pastikan headset tidak sedang tersambung ke HP/aplikasi lain

## Halaman terbuka tapi statusnya "Menunggu data dari HP..."

Berarti relay dan halamannya sehat, tapi data dari HP belum sampai. Ulangi
pemeriksaan di bagian pertama.

## Halaman tidak mau terbuka sama sekali di Chrome

Relay-nya belum jalan. Buka lagi folder Serenity dan jalankan
`node bridge/relay.js`, lalu muat ulang halamannya.

## Muncul "Port 8080 sudah dipakai"

Berarti relay-nya sudah berjalan di jendela lain — tidak perlu dijalankan dua
kali. Cukup buka halamannya di Chrome.

---

# Daftar periksa sebelum peserta datang

- [ ] Headset terisi baterai
- [ ] HP terisi baterai, waktu layar-mati sudah diperpanjang
- [ ] HP dan laptop tersambung ke WiFi yang sama
- [ ] Relay sudah jalan di laptop, dan alamat IP-nya sudah dicatat
- [ ] Aplikasi sudah terpasang, IP dan port sudah terisi sesuai catatan itu
- [ ] **Send Test** sudah dicoba dan baris "jaringan OK" muncul di halaman
- [ ] Halaman sudah bisa dibuka di Chrome (`http://localhost:8080`)
- [ ] Sudah coba rekam singkat sampai halaman Hasil Akhir
- [ ] Sudah coba unduh CSV dan filenya bisa dibuka di Excel
- [ ] Setelah percobaan, tekan **Mulai Sesi Baru** supaya data uji coba tidak
      tercampur dengan data peserta asli

---

# Yang perlu dilaporkan ke Stefano saat uji coba pertama

Seluruh alur ini — dari headset, HP, sampai file CSV-nya — sudah diuji dengan
headset Muse sungguhan, jadi bagian dasarnya tidak lagi jadi pertanyaan
terbuka. Yang masih berguna untuk dikabari:

1. Apakah baris **"jaringan OK"** muncul waktu Send Test dicoba di tempat Anda?
   Ini satu-satunya bagian yang bergantung pada jaringan masing-masing.
2. Sampai level apa **Kualitas Sinyal** bisa dicapai di kepala peserta Anda —
   "bagus" semua, atau ada yang bertahan di "sedang"? (Sekali lagi: "sedang"
   itu tidak apa-apa, ini cuma untuk catatan.)
3. Kalau muncul pesan yang tidak dijelaskan di panduan ini, kirim fotonya.

Yang paling penting: **jangan menghapus file CSV yang sudah diunduh**, bahkan
dari sesi percobaan. Kalau ada yang janggal di datanya, file itu yang paling
cepat menunjukkan sebabnya.
