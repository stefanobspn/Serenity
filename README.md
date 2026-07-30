# Muse S Gen 2 - EEG Monitor

Web sederhana untuk terhubung ke headset **Muse S Gen 2** lewat Web Bluetooth,
lalu menampilkan status koneksi, battery, angka sinyal EEG per channel, dan
grafik gelombangnya secara langsung.

## Struktur file

- `index.html` — struktur halaman (tombol, status, canvas)
- `style.css` — tampilan/layout
- `script.js` — logika koneksi ke Muse, pengambilan data, dan penggambaran grafik

## Library yang dipakai

Koneksi Bluetooth ke headset Muse memakai library open-source
[MuseJS](https://github.com/Respiire/MuseJS), yang dimuat lewat CDN di
`index.html`. Library ini yang menangani protokol Bluetooth low-level
(service/characteristic UUID Muse) sehingga tidak perlu ditulis ulang dari nol.

Semua logika koneksi (tombol connect), pengambilan data channel EEG,
tampilan angka, status, battery, dan grafik di `script.js` ditulis sendiri.

## Cara jalankan

1. Nyalakan headset Muse S Gen 2, aktifkan Bluetooth di laptop.
2. Buka `index.html` di Chrome atau Edge (Web Bluetooth tidak didukung di
   Firefox/Safari).
   - Jika dialog Bluetooth tidak muncul saat dibuka langsung dari file,
     jalankan server lokal sederhana dari folder ini:
     `python3 -m http.server 8000`, lalu akses `http://localhost:8000`.
3. Klik "Connect ke Muse" dan pilih device dari dialog browser.
