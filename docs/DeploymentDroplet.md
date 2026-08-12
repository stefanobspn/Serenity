# Deploy Serenity ke Droplet DigitalOcean

Panduan ini untuk **Stefano** (yang mengelola server), bukan untuk klien.
Panduan kliennya ada di `docs/PanduanKlien.md`.

---

## Kenapa relay-nya ikut di-hosting

Alur datanya begini:

```
Headset Muse → HP klien (aplikasi APK) → internet (OSC/UDP) → droplet → browser klien
```

Relay **harus** ikut di server, bukan cuma web-nya. Alasannya: browser tidak
bisa menerima UDP, jadi harus ada yang menerima UDP lalu meneruskannya ke
browser. Kalau cuma web statisnya yang di-hosting sementara relay-nya di laptop
klien, halaman HTTPS tidak akan diizinkan browser menghubungi `localhost`
(diblokir sebagai *mixed content*).

Untungnya relay ini sekaligus menyajikan file web-nya, jadi satu proses saja
sudah cukup — halaman dan aliran datanya otomatis satu origin, tidak ada urusan
CORS.

**Yang didapat klien:** cukup pasang APK di HP dan buka satu URL. **Tidak ada**
yang perlu dipasang di laptopnya.

---

## ⚠️ Baca ini dulu sebelum dipakai peserta sungguhan

Menaruh relay di internet publik ada konsekuensinya, dan ini keputusan yang
harus diambil sadar-sadar karena menyangkut data orang lain:

1. **Port UDP-nya terbuka untuk siapa saja.** Tidak ada kata sandi. Siapa pun
   yang tahu IP dan port-nya bisa mengirim paket OSC palsu, dan itu akan muncul
   di layar seolah data asli.
2. **Siapa pun yang tahu URL-nya bisa menonton sesi yang sedang berjalan.**
   Tidak ada login.
3. **Kalau pakai HTTP biasa (bukan HTTPS), semuanya lewat tanpa enkripsi** —
   termasuk nama peserta yang diketik di halaman awal.
4. **Relay ini menyimpan satu state global.** Kalau dua orang merekam
   bersamaan lewat server yang sama, datanya bercampur. Untuk satu peneliti
   dalam satu waktu tidak masalah.

Untuk penelitian yang melibatkan siswa, minimal lakukan dua hal:

- **Pakai HTTPS** kalau punya domain (lihat bagian "HTTPS" di bawah).
- **Matikan layanannya kalau sedang tidak dipakai:**
  `sudo systemctl stop serenity-relay`

Kalau data peserta tidak boleh keluar dari perangkat sama sekali, jangan pakai
cara hosting ini — jalankan relay di laptop klien (lihat
`docs/PanduanKoneksiMuse.md`).

---

## Langkah deploy

Dijalankan di droplet, sebagai user yang punya sudo.

### 1. Pasang Node

```bash
sudo apt update
sudo apt install -y nodejs git
node --version        # pastikan keluar angkanya
```

### 2. Ambil kode

Yang perlu diunggah **cuma folder web + bridge**. Folder `android/` dan
`muse_official_sdk/` **jangan** ikut — selain besar, isinya SDK Muse yang tidak
boleh disebarkan (lihat komentar di `.gitignore`).

```bash
sudo mkdir -p /opt/serenity
sudo chown $USER:$USER /opt/serenity
git clone <url-repo-mu> /opt/serenity
```

Isi minimal yang harus ada di `/opt/serenity`: `index.html`, `pages/`, `js/`,
`css/`, `bridge/`.

### 3. Buat user khusus untuk layanannya

Supaya relay tidak jalan sebagai root.

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin serenity
sudo chown -R serenity:serenity /opt/serenity
```

### 4. Pasang layanannya

```bash
sudo cp /opt/serenity/bridge/serenity-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now serenity-relay
sudo systemctl status serenity-relay
```

### 5. Buka firewall

**Ini yang paling sering terlewat**, dan gejalanya menyesatkan: semuanya
kelihatan normal tapi data tidak pernah sampai.

```bash
sudo ufw allow 80/tcp
sudo ufw allow 7000/udp
sudo ufw status
```

Kalau di panel DigitalOcean juga dipasang **Cloud Firewall**, aturannya harus
ditambahkan di sana juga — firewall panel itu terpisah dari `ufw` di dalam
mesin. Pastikan **UDP 7000** diizinkan, bukan cuma TCP.

### 6. Uji dari luar

Dari laptop sendiri (bukan dari dalam droplet):

```bash
curl http://<IP-DROPLET>/pages/userform.html   # harus keluar HTML
curl http://<IP-DROPLET>/eeg-stream            # harus keluar aliran "data: {...}"
```

Lalu uji jalur UDP-nya pakai simulator dari laptop:

```bash
# arahkan simulator ke droplet (ubah TUJUAN di bridge/simulate-osc.js
# atau jalankan simulatornya langsung di droplet untuk uji cepat)
sudo journalctl -u serenity-relay -f
```

Di log harus muncul `menerima paket dari ...` dan daftar `sinyal masuk`.

---

## HTTPS (disarankan kalau punya domain)

Cara paling ringkas pakai Caddy — sertifikatnya diurus otomatis:

```bash
sudo apt install -y caddy
```

Ubah `ExecStart` di service jadi `--port-web=8080` (biar Caddy yang pegang
port 80/443), lalu isi `/etc/caddy/Caddyfile`:

```
serenity.domainmu.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo systemctl restart caddy serenity-relay
```

**Perhatikan:** HTTPS mengamankan halaman web-nya saja. **Aliran OSC dari HP
tetap UDP polos tanpa enkripsi** — itu tidak berubah, karena aplikasi Android
mengirim OSC apa adanya.

---

## Operasional harian

```bash
sudo journalctl -u serenity-relay -f      # lihat log langsung
sudo systemctl restart serenity-relay     # setelah update kode
sudo systemctl stop serenity-relay        # matikan kalau tidak dipakai
cd /opt/serenity && git pull && sudo systemctl restart serenity-relay
```

Yang paling berguna dilihat di log:

```
[relay] menerima paket dari 103.x.x.x — jaringan OK
[relay] sinyal masuk: /muse/elements/alpha_absolute  (dipakai)
```

Baris pertama = HP klien berhasil menjangkau server.
Baris kedua = band power benar-benar dikirim (lihat catatan preset di
`docs/BridgeSdkResmi.md` kalau yang muncul cuma `/muse/eeg`).

---

## Yang perlu diberikan ke klien

1. File APK: `android/dist/Serenity-EEG-Bridge-<tanggal>.apk`
2. Alamat IP droplet (atau domainnya)
3. `docs/PanduanKlien.md`
