# Panduan Pemakaian Serenity

Panduan untuk menjalankan pengambilan data EEG dengan headset Muse dan aplikasi
Serenity.

Yang perlu disiapkan:

- Headset **Muse S Gen 2** (sudah terisi baterai)
- **HP Android** (Android 6 ke atas)
- **Laptop Windows** yang terhubung internet
- File **APK** dan **alamat website** yang dikirim Stefano

> Laptop tidak perlu dipasangi apa pun. Cukup buka website lewat Chrome.

---

## Gambaran alurnya

```
Headset Muse  →  HP  →  internet  →  Website Serenity di laptop
              Bluetooth
```

HP-nya bertugas sebagai perantara: dia yang menyambung ke headset lewat
Bluetooth, lalu mengirim datanya ke website. Jadi **HP harus tetap menyala dan
aplikasinya tetap terbuka** selama perekaman.

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

## 1.3 Isi alamat server

Gulir ke bawah sampai bagian **OSC output**. Ada tiga kolom:

| Kolom | Diisi |
|---|---|
| Kolom kiri (IP) | **alamat IP yang dikirim Stefano** |
| Kolom tengah (Port) | **7000** |
| Kotak centang "Enable" | biarkan dulu, nanti dicentang |

Isinya tersimpan otomatis, jadi cukup sekali diisi.

## 1.4 Tes koneksi — PENTING

Ketuk tombol **Send Test**.

Akan muncul pesan sekilas di bawah layar: *"Sent to ... — check laptop
terminal"*.

Lalu **kabari Stefano** untuk memastikan paketnya benar-benar sampai di server.
Pesan di HP cuma berarti "sudah dikirim", **bukan** berarti "sudah diterima" —
jadi konfirmasi dari sisi server itu wajib.

Kalau sudah dikonfirmasi sampai, persiapannya selesai. Bagian ini tidak perlu
diulang lagi.

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

## 2.4 Buka website di laptop

Buka **Google Chrome**, masuk ke alamat yang dikirim Stefano.

Isi nama peserta, lalu ikuti alurnya:

```
Nama → Kuesioner PSS-5 → SEES-10 → Skala Lapar → EEG Monitor → Hasil Akhir
```

## 2.5 Periksa kualitas sinyal

Di halaman **EEG Monitor**, perhatikan bagian **Kualitas Sinyal**. Keempat
elektroda harus **bagus**.

Kalau ada yang **sedang** atau **jelek**:

- rapikan lagi posisi headset
- pastikan kulit di titik elektroda tidak tertutup rambut
- minta peserta diam sebentar (banyak gerak bikin sinyal kacau)

Tombol **Mulai Rekam** memang sengaja dikunci selama masih ada elektroda yang
jelek. Ini bukan error — itu mencegah data sampah ikut terekam.

> Kalau ada satu elektroda yang benar-benar tidak mau bagus (misalnya rambut
> sangat tebal), ada centang **"Rekam saja walaupun ada elektroda yang jelek"**.
> Pakai ini seperlunya saja, dan **catat kejadiannya** — kualitas data peserta
> itu jadi lebih rendah dan itu perlu diketahui waktu analisis.

## 2.6 Rekam EEG 1 (baseline)

1. Pastikan angka Delta/Theta/Alpha/Beta/Gamma sudah bergerak
2. Ketuk **Mulai Rekam**
3. Peserta duduk tenang
4. Setelah dirasa cukup, ketuk **Stop Rekam**

Lama perekaman bebas, tapi sebaiknya **konsisten untuk semua peserta**
(misalnya semuanya 2 menit) supaya hasilnya bisa dibandingkan.

## 2.7 Aktivitas

Setelah EEG 1 selesai, halaman otomatis berganti ke **EEG 2**.

Lakukan aktivitas yang sudah direncanakan (misalnya tes memori atau
aritmatika). Headset **tetap dipakai**, jangan dilepas.

## 2.8 Rekam EEG 2

Ketuk **Mulai Rekam EEG 2**, lalu **Stop Rekam** setelah selesai. Usahakan
durasinya sama dengan EEG 1.

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
4. **HP masih ada internet?**
5. Coba ketuk **Send Test** lagi, lalu kabari Stefano untuk cek dari sisi
   server.

## Angka muncul tapi berhenti di tengah perekaman

Hampir selalu karena layar HP mati atau aplikasinya pindah ke belakang.
Ulangi perekaman peserta itu dari awal.

## Kualitas sinyal tidak mau bagus

- Basahi sedikit titik kontak di belakang telinga dengan air (jangan basah
  kuyup) — ini trik standar untuk EEG
- Pastikan headset tidak terlalu longgar
- Minta peserta tidak bicara dan tidak banyak mengunyah

## Headset tidak muncul waktu REFRESH

- Pastikan headset menyala (lampunya menyala)
- Matikan lalu nyalakan lagi Bluetooth di HP
- Pastikan headset tidak sedang tersambung ke HP/aplikasi lain

## Website terbuka tapi statusnya "Menunggu data dari HP..."

Berarti website-nya sehat, tapi data dari HP belum sampai. Ulangi pemeriksaan
di bagian pertama.

---

# Daftar periksa sebelum peserta datang

- [ ] Headset terisi baterai
- [ ] HP terisi baterai, waktu layar-mati sudah diperpanjang
- [ ] Aplikasi sudah terpasang, IP dan port sudah terisi
- [ ] **Send Test** sudah dicoba dan dikonfirmasi Stefano
- [ ] Website sudah bisa dibuka di Chrome
- [ ] Sudah coba rekam singkat sampai halaman Hasil Akhir
- [ ] Sudah coba unduh CSV dan filenya bisa dibuka di Excel
- [ ] Setelah percobaan, tekan **Mulai Sesi Baru** supaya data uji coba tidak
      tercampur dengan data peserta asli

---

# Yang perlu dilaporkan ke Stefano saat uji coba pertama

Karena ini pertama kalinya dipakai dengan headset sungguhan, tolong kabari:

1. Apakah **Send Test** berhasil sampai?
2. Setelah headset tersambung dan Enable dicentang, apakah **angka band power
   di website bergerak**?
3. Kalau angkanya **tidak** muncul padahal Send Test berhasil — ini kemungkinan
   perlu penyesuaian di aplikasi, dan Stefano perlu tahu untuk memperbaikinya.
4. Apakah **Kualitas Sinyal** bisa mencapai "bagus" di keempat elektroda?

Nomor 2 dan 3 yang paling penting — bagian itu belum pernah diuji dengan
headset asli karena alatnya ada di tangan Anda.
