# Hosting di Droplet — DIHENTIKAN

> **Status: tidak dipakai lagi sejak 13 Agustus 2026.**
> Serenity sekarang dijalankan sebagai relay lokal di laptop peneliti.
> Panduan yang berlaku: `docs/PanduanKlien.md` dan `docs/PanduanKoneksiMuse.md`.

Dokumen ini dulu berisi langkah-langkah menaruh relay Serenity di droplet
DigitalOcean supaya klien cukup membuka satu URL. Cara itu sudah dibongkar dan
langkahnya sengaja tidak disimpan di sini, supaya tidak ada yang mengikuti
petunjuk ke server yang sudah tidak ada. Riwayat lengkapnya masih bisa dilihat
lewat `git log` kalau suatu saat diperlukan.

## Apa yang dihapus

Di droplet `143.198.196.39`, yang dilepas hanya bagian Serenity:

- layanan systemd `serenity-relay` beserta drop-in `caddy.conf`
- folder `/opt/serenity`
- blok `serenity.stefanonirwana.dev` di `/etc/caddy/Caddyfile`
- user sistem `serenity`
- aturan firewall `7000/udp`

Yang **tidak** disentuh: Caddy sendiri, blok `ai.stefanonirwana.dev`, serta
port 22/80/443. Cadangan Caddyfile sebelum perubahan ada di
`/root/Caddyfile.sebelum-hapus-serenity.bak`.

Catatan DNS: record `serenity.stefanonirwana.dev` masih mengarah ke droplet.
Menghapusnya dilakukan di panel DNS, bukan di server.

## Kenapa dihentikan

Alasannya bukan teknis, melainkan soal data peserta — dan ini yang perlu
diingat kalau suatu saat muncul godaan untuk menghosting ulang:

1. **Port UDP-nya harus terbuka untuk publik.** Tidak ada kata sandi pada OSC.
   Siapa pun yang tahu IP dan portnya bisa mengirim paket palsu yang muncul di
   layar seolah-olah data asli.
2. **Tidak ada login di halamannya.** Siapa pun yang tahu URL-nya bisa menonton
   sesi yang sedang berjalan, termasuk nama peserta yang sedang diketik.
3. **Relay menyimpan satu state global.** Dua sesi bersamaan lewat server yang
   sama akan bercampur datanya.
4. **Aliran OSC dari HP tetap UDP polos**, bahkan waktu halamannya sudah HTTPS.
   HTTPS mengamankan halaman web-nya saja, bukan datanya dalam perjalanan dari
   HP.

Untuk penelitian yang melibatkan siswa SMA, keempat hal itu tidak sebanding
dengan kenyamanan "cukup buka satu URL". Menjalankan relay di laptop membuat
data EEG dan nama peserta tidak pernah meninggalkan jaringan ruangan itu.

Sebagai bonus, jalur lokal justru lebih sederhana: tidak ada server yang harus
dibayar, dijaga, dan diperbarui, dan tidak ada lagi kemungkinan sesi gagal
gara-gara internet sekolah sedang bermasalah.

## Kalau suatu saat perlu dihosting lagi

Pertimbangkan dulu apakah masalahnya benar-benar butuh server. Kebutuhan yang
sering disangka butuh hosting, padahal tidak:

- **Peneliti dan peserta di ruangan yang sama** — ini justru kasus terbaik untuk
  relay lokal.
- **Ingin datanya terkumpul di satu tempat** — cukup kumpulkan file CSV-nya;
  aplikasinya memang dirancang mengekspor per peserta.

Kalau ternyata memang perlu, syarat minimalnya: halaman diberi login, port UDP
dibatasi hanya untuk IP yang dikenal, dan layanannya dimatikan waktu tidak
dipakai.
