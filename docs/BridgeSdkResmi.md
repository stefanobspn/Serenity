# Bridge ke SDK Resmi Muse

Dokumen ini menjelaskan dari mana data EEG di Serenity berasal, kenapa jalurnya
berputar lewat HP dan sebuah program perantara, dan apa saja yang masih harus
dikerjakan.

---

## Kenapa jalurnya begini

Proyek ini diikutkan lomba, dan lomba mensyaratkan izin/lisensi resmi dari
produsen hardware (Interaxon / Muse). Artinya data EEG harus terbukti berasal
dari **SDK resmi**, bukan dari library komunitas.

Sebelumnya Serenity memakai library pihak ketiga **MuseSGen2** dari CDN, yang
menyambung ke headset lewat Web Bluetooth di browser lalu menghitung FFT band
power sendiri di JavaScript. Library itu **sudah tidak dipakai lagi**.

Masalahnya, SDK resmi (`libmuse`) cuma tersedia untuk Android, iOS/macOS,
Windows, dan Unity — **tidak ada versi JavaScript, dan tidak ada versi Linux**.
Jadi SDK resmi tidak bisa dipanggil dari browser. Cara resmi mengeluarkan
datanya adalah lewat **OSC over UDP**.

Tapi **browser tidak bisa menerima UDP sama sekali**. Itu batasan keras browser,
bukan sesuatu yang bisa diakali. Karena itu harus ada perantara:

```
Headset Muse S Gen 2
   │  Bluetooth
Sumber data resmi  ← lihat tabel "Pilihan sumber data" di bawah
   │  OSC over UDP, WiFi
bridge/relay.js  ← jalan di laptop, TANPA dependensi npm
   │  SSE (Server-Sent Events), port 8080
pages/eegmonitor.html
```

`bridge/relay.js` sengaja dibuat **tidak peduli sumbernya apa** — dia cuma
mendengarkan OSC di UDP. Jadi pilihan sumber data di bawah bisa diganti-ganti
tanpa mengubah kode relay maupun halaman web sama sekali.

---

## Pilihan sumber data

Ada tiga jalur, dan pilihannya **bukan** soal Windows vs Linux — laptopnya
boleh yang mana saja, karena relay-nya cuma menerima UDP.

| Jalur | Perlu HP? | Perlu ngoding? | Band power dijamin ada? |
|---|---|---|---|
| ~~**A.** Aplikasi Muse Play Store → OSC Output~~ | — | — | **TIDAK BISA** (lihat bawah) |
| **B.** libmuse Windows (DLL C++) | Tidak | Ya (C++ + Visual Studio) | **Ya** (sudah dicek di header SDK) |
| **C.** libmuse Android | Ya | Ya (Android Studio) | **Ya** — **jalur yang dipilih** |

### Kenapa jalur A gugur

Sudah dicoba (Agustus 2026): aplikasi Muse dari Play Store **tidak punya menu
DEVELOPER TOOLS → OSC Output**. Tangkapan layar di panduan resmi Muse Lab
tampaknya diambil dari versi aplikasi khusus pengembang — di tangkapan layar
itu ada bagian "INTERNAL DEVELOPER TOOLS" yang jelas bukan untuk pengguna umum.

Aplikasi lain yang bisa mengirim OSC: **Muse Direct** (resmi Interaxon, tapi
**iOS saja**, dan tidak ikut disertakan di folder SDK ini — cuma ada video
demonya) dan **Mind Monitor / Muse Monitor** (pihak ketiga, jadi **tidak
memenuhi syarat lomba** — justru itu yang mau dihindari).

Masih perlu dipastikan langsung ke Interaxon apakah ada aplikasi resmi ber-OSC
untuk Android. Tanyakan sekalian waktu mengurus izin/lisensi SDK.

### Hal penting yang sering disalahpahami

**MuseLab TIDAK bisa menyambung ke headset sendiri.** Dia cuma penerima OSC —
persis peran yang sekarang dipegang `bridge/relay.js`. Menurut panduan resmi
(*Muse Lab Guide for SDK Users V1.7*, bagian 2a), satu-satunya cara menyambung
yang didokumentasikan adalah lewat **aplikasi Muse di HP**:

1. Aplikasi Muse di HP tersambung ke headset lewat Bluetooth
2. Di aplikasi: **Me Screen → Settings → Developer Tools → OSC Output**
3. Isi **IP Address** laptop dan **Port** (panduan resmi mencontohkan 5001;
   relay ini defaultnya 7000 — yang penting kedua angkanya sama)
4. Kolom **Messages Prefix** boleh diisi atau dikosongkan — relay menerima
   keduanya (lihat "Toleransi awalan alamat" di bawah)
5. Nyalakan **Streaming Enabled**

Jadi memasang MuseLab di Windows **tidak menghilangkan kebutuhan akan HP**.
Satu-satunya jalur yang benar-benar tanpa HP adalah jalur B (libmuse Windows),
dan itu justru yang paling banyak ngodingnya — contoh `GettingData` dan
`GettingData32` di SDK Windows **tidak punya kode pengirim OSC sama sekali**,
jadi bagian pengiriman UDP-nya harus ditulis sendiri pakai Winsock.

### Catatan operasional jalur A

Panduan resmi memperingatkan: **HP harus tetap menyala dan aplikasinya tetap di
layar aktif**, kalau tidak koneksinya putus dan sinyal hilang. Saran panduan:
mulai sesi "mind meditation" di aplikasi supaya layarnya tetap hidup. Ini perlu
diperhitungkan waktu sesi perekaman.

### Toleransi awalan alamat

Relay mencocokkan alamat OSC dari **belakang**, bukan sama persis. Jadi ketiga
bentuk ini sama-sama terbaca:

```
/elements/alpha_absolute
/muse/elements/alpha_absolute
/apapun/elements/alpha_absolute      <- kalau "Messages Prefix" diisi
```

Tanpa ini, mengisi kolom Messages Prefix di aplikasi Muse akan bikin data
"masuk tapi tidak muncul" tanpa petunjuk apa pun.

---

## Cara menjalankan

Dua perintah, di dua terminal terpisah.

**Terminal 1 — relay (wajib):**

```
node bridge/relay.js
```

Relay ini sekaligus menyajikan halaman Serenity. Jadi halaman **harus** dibuka
lewat alamat di bawah, bukan dengan klik dua kali file HTML-nya:

```
http://localhost:8080/pages/userform.html
```

Waktu dijalankan, relay mencetak alamat IP laptop. Alamat itulah yang diisikan
ke kolom IP di aplikasi Muse di HP (port 7000).

**Terminal 2 — simulator (opsional, buat ngetes tanpa hardware):**

```
node bridge/simulate-osc.js            # data bergerak, mirip sesi asli
node bridge/simulate-osc.js --tetap    # angka tetap, buat cek hitungan
```

Kalau port di aplikasi Muse tidak bisa diubah ke 7000, relay-nya yang
menyesuaikan:

```
node bridge/relay.js --port-udp=5001
```

### Cara cepat mencari sumber masalah

**1. Lihat terminal relay.** Tiap alamat OSC yang masuk dicatat sekali, dengan
tanda apakah dipakai atau diabaikan:

```
[relay] sinyal masuk: /muse/elements/alpha_absolute  (dipakai)
[relay] sinyal masuk: /muse/eeg                      (diabaikan)
```

Kalau data masuk tapi tidak ada satu pun band power, relay akan memperingatkan
sendiri setelah 5 detik. Ini penting: tanpa peringatan itu, halaman monitor
cuma diam saja tanpa error, seolah tidak terjadi apa-apa.

**2. Cek aliran ke browser:**

```
curl http://localhost:8080/eeg-stream
```

- Keluar aliran teks `data: {...}` dengan `"tipe":"bandpower"` → semuanya sehat,
  masalahnya di browser.
- Cuma `"state":"disconnected"` → relay sehat, sumbernya yang belum mengirim.
- `curl` gagal total → relay-nya belum jalan.

---

## Bagian yang paling gampang salah: satuan

SDK resmi memberi band power dalam bentuk yang **berbeda** dari yang dipakai
halaman web:

| | MuseSGen2 (lama) | SDK resmi (sekarang) |
|---|---|---|
| Jumlah angka per band | 1 | 4 (satu per elektroda) |
| Skala | linear | **logaritmik (Bel)** |
| Bisa negatif? | tidak | **ya** |
| Bisa NaN? | tidak | **ya** (elektroda lepas) |

`bridge/relay.js` mengubahnya dengan urutan yang **tidak boleh dibalik**:

1. Buang nilai NaN
2. Ubah tiap kanal dari log ke linear: `linear = Math.pow(10, bel)`
3. Baru dirata-rata

Kenapa harus linear dulu baru dirata-rata: merata-ratakan angka logaritmik sama
dengan menghitung rata-rata geometrik, bukan yang kita mau.

Kenapa hasil akhirnya wajib linear: `js/hasil.js` menghitung parameter stres
sebagai rasio Theta dibagi Beta. **Pembagian angka logaritmik tidak sama dengan
logaritma hasil pembagian** — kalau angka Bel dikirim mentah-mentah, rasionya
jadi tidak bermakna dan bisa berbalik tanda waktu nilainya melewati nol.

Cara mengeceknya: jalankan simulator mode `--tetap`. Angka yang harus muncul di
halaman monitor sudah dihitung di muka:

| Band | Dikirim (Bel) | Harus tampil |
|---|---|---|
| Delta | 0.0 | 1.00 |
| Theta | 1.0 | 10.00 |
| Alpha | 1.0 | 10.00 |
| Beta | 0.5 | 3.16 |
| Gamma | 0.0 | 1.00 |

Rasio Theta/Beta harus keluar 3.16.

---

## Catatan penting soal data lama

Angka band power sekarang **beda skalanya** dengan data yang pernah direkam
pakai MuseSGen2. Data pilot lama tidak bisa dibandingkan langsung dengan data
baru — kalau sudah ada, harus direkam ulang.

Sisi baiknya: band power sekarang berasal dari DSP tervalidasi Interaxon, bukan
FFT buatan sendiri di browser. Ini layak disebut di laporan penelitian.

---

## Fitur baru: kualitas sinyal

SDK resmi mengirim nilai horseshoe/HSI per elektroda (1 = bagus, 2 = sedang,
4 = jelek) — sesuatu yang tidak tersedia di setup lama.

Halaman monitor menampilkannya, dan **mengunci tombol "Mulai Rekam" selama ada
elektroda yang jelek**. Ini penting: elektroda yang tidak menempel tetap
menghasilkan angka yang kelihatan wajar di grafik padahal isinya sampah, dan
kalau ikut terekam, kesimpulan penelitiannya salah tanpa tanda yang kelihatan.

Ada centang "abaikan" untuk keadaan di lapangan yang memang susah (rambut tebal,
misalnya). Kalau dicentang, tombol terbuka **tapi peringatannya tetap tampil** —
supaya peneliti memilih secara sadar, dan bisa mencatat kejadiannya.

---

## Status pengerjaan

| Fase | Isi | Status |
|---|---|---|
| 1 | `bridge/relay.js` + `bridge/simulate-osc.js` | **Selesai** |
| 2 | `js/bands.js`, `js/eeg.js` + `eegmonitor.html` pakai SSE | **Selesai** |
| 3 | Indikator & penguncian kualitas sinyal | **Selesai** |
| 4 | Aplikasi Android (jalur C) — kode & build | **Selesai** — APK sudah jadi |
| 5 | Uji dengan headset asli | **Belum** — butuh HP + headset |
| 6 | Gladi bersih di lokasi | **Belum** |

Fase 1-3 sudah dites lewat simulator: konversi satuan, grafik live, rekam EEG 1
& EEG 2, rasio Theta/Beta, puncak Alpha, grafik interval di Hasil Akhir, dan
jalur-jalur gagal (relay mati, sumber berhenti mengirim, elektroda jelek,
alamat berprefix, dan sumber yang cuma mengirim sinyal mentah).

### Fase 4 — LANGKAH BERIKUTNYA: bikin aplikasi Android (jalur C)

Jalur A sudah gugur (lihat "Kenapa jalur A gugur" di atas), jadi tidak ada lagi
jalan pintas tanpa ngoding. **Jalur C yang dipilih**, karena contoh Android
bawaan SDK sudah punya pengirim OSC yang berfungsi, sementara contoh Windows
tidak punya kode jaringan sama sekali.

Alamat OSC yang harus dikirim sudah dipastikan benar — cocok antara header SDK
resmi dan pemakaian umum di lapangan:

```
/muse/elements/delta_absolute     4 angka (per elektroda), satuan Bel
/muse/elements/theta_absolute
/muse/elements/alpha_absolute
/muse/elements/beta_absolute
/muse/elements/gamma_absolute
/muse/elements/horseshoe          4 angka: 1 bagus / 2 sedang / 4 jelek
/muse/batt                        persen baterai
```

`bridge/relay.js` sudah bisa membaca semua alamat itu, dengan atau tanpa awalan
`/muse` — sudah diuji. Jadi begitu aplikasi Android-nya mengirim dengan alamat
di atas, sisi laptop tidak perlu diubah sama sekali.

### Cara build aplikasi Android-nya

Sudah dikerjakan dan **berhasil di-build** (Agustus 2026). Kodenya ada di folder
`android/` — hasil ekstrak contoh `TestLibMuseAndroid` dari SDK resmi, dengan
tambahan pengiriman band power.

> **`android/` sengaja di-gitignore.** Perjanjian lisensi Muse melarang
> menerbitkan SDK-nya di tempat umum, dan folder itu berisi `libmuse_android.jar`
> beserta empat file `.so`. APK hasil build boleh dibagikan; isi mentah folder
> itu tidak. Lihat komentar di `.gitignore`.

Perkakas yang dibutuhkan di laptop (semuanya sudah terpasang):

| Perkakas | Versi | Cara pasang |
|---|---|---|
| JDK | **17** | `sudo pacman -S jdk17-openjdk` |
| adb | 36.x | `sudo pacman -S android-tools` |
| cmdline-tools | 22.0 | unduh dari developer.android.com, taruh di `~/Android/Sdk/cmdline-tools/latest` |
| SDK Platform | **`android-37.0`** | `sdkmanager "platforms;android-37.0"` |
| Build-Tools | **37.0.0** | `sdkmanager "build-tools;37.0.0"` |
| Gradle | 9.4.1 | **tidak perlu dipasang** — `gradlew` mengunduh sendiri |

Perhatikan nama platformnya: **`android-37.0`, bukan `android-37`**. Google
sekarang memakai versi minor untuk platform, jadi nama lama tidak ketemu.

Perintah build:

```bash
cd android
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
./gradlew assembleDebug
```

Build pertama lama (~10 menit) karena Gradle dan dependensinya diunduh dulu
(~700 MB). Build berikutnya jauh lebih cepat. Hasilnya:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Pasang ke HP (aktifkan dulu Developer options → USB debugging di HP: Settings →
About phone → ketuk "Build number" 7 kali):

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat | grep -i muse      # buat lihat log kalau ada masalah
```

Peringatan `Unable to strip ... libmuse_android.so` waktu build itu normal —
file itu memang datang dari Interaxon tanpa simbol debug, tidak ada yang salah.

### Apa yang diubah di contoh SDK

Semua di `android/app/src/main/java/com/choosemuse/example/libmuse/MainActivity.java`:

1. Daftarkan lima paket band absolut (`DELTA/THETA/ALPHA/BETA/GAMMA_ABSOLUTE`).
   Tanpa didaftarkan, headset tidak akan pernah mengirimnya.
2. Kirim tiap band ke `/muse/elements/<band>_absolute`.
3. Isi `case BATTERY` yang tadinya kosong → kirim `/muse/batt`.
4. Ubah horseshoe jadi `/muse/elements/horseshoe` biar seragam.
5. Tambah `import com.choosemuse.libmuse.Battery;`.
6. Tambah fungsi `getBandValues()` — **ini yang paling gampang salah.** Fungsi
   bawaan `getEegChannelValues()` mengisi **6** nilai: 4 elektroda kepala plus
   `AUX_LEFT`/`AUX_RIGHT` (colokan tambahan yang tidak dipakai). Kalau ikut
   dikirim, dua nilai itu akan ikut dirata-rata di relay dan menggeser hasil
   band power tanpa ada tanda apa pun di grafik. `getBandValues()` cuma mengambil
   4 elektroda kepala.

Nilai dikirim **apa adanya dalam satuan Bel** (skala log, boleh negatif).
Konversi ke linear tetap di `bridge/relay.js`, supaya yang menghitung band power
tetap DSP resmi Muse — bukan kita. Ini inti argumen kepatuhan untuk lomba.

### Kalau harus jalur B (libmuse Windows)

Basis: `libmuse_windows_8.0.9/examples/GettingData32/` (MFC Win32) atau
`GettingData/` (UWP). Keduanya sudah bisa menyambung ke headset lewat Bluetooth
dan menerima data, tapi **tidak punya kode jaringan sama sekali**. Yang perlu
ditambahkan:

1. Daftarkan listener untuk kelima band absolut: `ALPHA_ABSOLUTE`,
   `BETA_ABSOLUTE`, `DELTA_ABSOLUTE`, `THETA_ABSOLUTE`, `GAMMA_ABSOLUTE`
   (sudah dipastikan ada di `bridge_muse_data_packet_type.h`)
2. Tulis pengirim OSC UDP sederhana pakai Winsock (~40 baris), kirim ke
   `/elements/<band>_absolute`
3. Kirim juga `/elements/horseshoe` dan `/batt`
4. **Verifikasi preset** `MuseConfiguration` mana yang memancarkan absolute band
   power

Butuh Visual Studio. Bentuk paket OSC-nya bisa dicontek dari
`bridge/simulate-osc.js` (fungsi `tulisTeksOsc` dan `buatPesanOsc`) — aturan
padding dan urutan byte-nya sama persis.

### Kalau harus jalur C (libmuse Android)

Basis: `libmuse_android_8.0.9/examples/TestLibMuseAndroid/`. Ini yang paling
sedikit kerjaannya dari dua jalur "ngoding", karena contohnya **sudah** punya
`OscSender.java` yang berfungsi dan UI pengaturan IP/port. Langkahnya sama
seperti jalur B nomor 1, 3, 4 — bagian pengiriman OSC-nya tinggal dipakai.
Butuh Android Studio (jalan di Linux).

---

## Risiko yang belum tertutup

1. **Lisensi/registrasi SDK ke Interaxon.** Tugas administratif, dan justru ini
   inti alasan seluruh perubahan ini. Perlu dipastikan apakah lomba menuntut
   bukti registrasi tertulis, bukan sekadar memakai kode SDK resmi.
2. **WiFi di lokasi.** HP dan laptop harus satu jaringan, dan banyak WiFi
   sekolah/lomba memblokir komunikasi antar-perangkat (AP isolation). Mitigasi:
   hotspot HP atau USB tethering. **Wajib dites di lokasi sebelum hari-H.**
3. **UDP itu lossy.** Paket bisa hilang. Untuk monitor live tidak masalah (data
   datang ~10x/detik lalu dirata-rata), tapi jangan dipakai untuk hitungan yang
   menuntut setiap sampel utuh.
4. **Build Android** butuh Android Studio (jalan di Linux) + perangkat Android 8+.
