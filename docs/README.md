# Muse S Gen 2 - EEG Monitor

Web sederhana untuk terhubung ke headset **Muse S Gen 2** lewat Web
Bluetooth, lalu menampilkan status koneksi, battery, kartu band power
(Delta/Theta/Alpha/Beta/Gamma), dan grafiknya secara langsung.

## Struktur file

- `index.html` — struktur halaman (tombol, status, kartu band, canvas)
- `style.css` — tampilan/layout
- `script.js` — kode utama halaman: pasang tombol Connect/Disconnect,
  tampilkan status/battery, dan update kartu + grafik saat ada data baru.
  Pendek karena bagian rumitnya (Bluetooth, decode EEG, FFT) sudah
  ditangani oleh library MuseSGen2 (lihat di bawah).

## Library yang dipakai

- **[MuseSGen2](https://github.com/enuma-technology/musesgen2)** — library
  koneksi Bluetooth + perhitungan band power, di-maintain sebagai repo
  terpisah dan dimuat lewat CDN jsdelivr di `index.html`:
  ```html
  <script src="https://cdn.jsdelivr.net/gh/enuma-technology/musesgen2@main/script.js"></script>
  ```
- **[Chart.js](https://www.chartjs.org/)** — dipakai di `script.js` untuk
  menggambar grafik band power, dimuat lewat CDN di `index.html`.

## Cara jalankan

1. Nyalakan headset Muse S Gen 2, aktifkan Bluetooth di laptop.
2. Buka `index.html` di Chrome atau Edge (Web Bluetooth tidak didukung di
   Firefox/Safari).
   - Jika dialog Bluetooth tidak muncul saat dibuka langsung dari file,
     jalankan server lokal sederhana dari folder ini:
     `python3 -m http.server 8000`, lalu akses `http://localhost:8000`.
3. Klik "Connect ke Muse" dan pilih device dari dialog browser.
