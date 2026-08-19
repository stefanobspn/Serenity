# Penjelasan Teknis & Metodologi: Sampling Rate dan Interval Data EEG

Dokumen ini disusun sebagai panduan ilmiah dan teknis untuk peneliti (klien) dalam menyusun **Bab Metodologi Penelitian** dan menjawab pertanyaan penguji/pembimbing terkait **interval waktu dan frekuensi sampling data EEG**.

---

## 1. Ringkasan Singkat

| Parameter | Nilai | Keterangan |
|---|---|---|
| **Frekuensi Sampling ADC Hardware (*Raw Signal*)** | **256 Hz** | Interval pencuplikan sinyal tegangan: **$\approx 0.0039\text{ detik} \approx 0.004\text{ detik}$** ($4\text{ ms}$) |
| **Frekuensi Ekstraksi *Band Power* (DSP / FFT)** | **10 Hz** | Interval pembaruan daya gelombang: **$0.1\text{ detik}$** ($100\text{ ms}$) |
| **Pencatatan Data di Aplikasi & CSV** | **Per Sampel (~0.1s)** | Setiap titik data *Band Power* terekam dengan timestamp desimal |

---

## 2. Mengapa Ada Dua Angka Waktu: 0.004 Detik vs 0.1 Detik?

Dalam pemrosesan sinyal biomedis EEG, terdapat perbedaan mendasar antara **pencuplikan sinyal mentah (*raw voltage*)** dan **analisis spektrum frekuensi (*band power*)**:

```
[Elektroda Kulit Kepala]
        │
        ▼ (Sinyal Analog Mikrovolt)
[ADC Hardware Headset Muse S]  ───► Sampling Rate: 256 Hz (Interval = 0.0039 s ≈ 0.004 s)
        │
        ▼ (Sinyal Digital Mentah / Raw EEG)
[DSP & Algoritma FFT libmuse]   ───► Ekstraksi Frekuensi (Sliding Window FFT)
        │
        ▼ (Daya Gelombang: Alpha, Beta, Theta, Delta, Gamma)
[Aliran Data & Aplikasi Serenity]──► Frekuensi Output: ~10 Hz (Interval = 0.1 s)
```

### A. Sinyal Mentah (*Raw EEG Signal*) — Interval 0.004 Detik (256 Hz)
- Sensor elektroda pada headband Muse S mengukur fluktuasi tegangan listrik di permukaan kulit kepala dalam satuan mikrovolt ($\mu\text{V}$).
- Konverter analog-ke-digital (*Analog-to-Digital Converter* / ADC) pada hardware mencuplik tegangan tersebut sebanyak **256 kali per detik** ($256\text{ Hz}$).
- Interval antar-cuplikan adalah:
  $$\Delta t = \frac{1}{256\text{ Hz}} \approx 0.00390625\text{ detik} \approx 0.004\text{ detik}\ (4\text{ ms})$$
- Frekuensi sampling ini memenuhi **Teorema Nyquist-Shannon** ($f_s \ge 2 \times f_{\max}$) untuk merekam gelombang otak hingga frekuensi Gamma ($>30-100\text{ Hz}$).

### B. Daya Gelombang (*Band Power*) — Interval 0.1 Detik (10 Hz)
- Parameter penelitian (seperti **Rasio Theta/Beta** untuk stres dan **Puncak Gelombang Alpha** untuk rasa lapar) tidak menggunakan nilai voltase mentah instan, melainkan **daya energi gelombang (*Band Power*)** pada rentang frekuensi tertentu:
  - **Delta**: $0.5 - 4\text{ Hz}$
  - **Theta**: $4 - 8\text{ Hz}$
  - **Alpha**: $8 - 13\text{ Hz}$
  - **Beta**: $13 - 30\text{ Hz}$
  - **Gamma**: $30 - 100\text{ Hz}$
- Untuk menghitung daya gelombang (terutama gelombang lambat seperti Delta $0.5\text{ Hz}$ yang satu siklus gelombangnya memerlukan waktu $2\text{ detik}$), algoritma *Fast Fourier Transform* (FFT) memerlukan jendela waktu (*time window*) sinyal mentah.
- DSP bawaan SDK resmi Interaxon (`libmuse`) menerapkan *sliding window FFT* yang diperbarui secara *real-time* setiap **$100\text{ ms}$ ($0.1\text{ detik}$ / $10\text{ Hz}$)**.

---

## 3. Contoh Teks untuk Bab Metodologi Karya Ilmiah

Peneliti dapat menyalin atau mengadaptasi narasi berikut untuk dimasukkan ke dalam **Bab III (Metodologi Penelitian)**:

> ### Instrumen dan Akuisisi Data EEG
> Pengukuran aktivitas kelistrikan otak dilakukan menggunakan perangkat EEG *headband* Muse S Gen 2 dengan konfigurasi 4 elektroda standar sistem 10-20 (TP9, AF7, AF8, TP10). 
>
> Sinyal tegangan mentah (*raw EEG*) dicuplik oleh *Analog-to-Digital Converter* (ADC) perangkat pada frekuensi sampling **256 Hz (interval pencuplikan $\Delta t \approx 0.004\text{ detik}$)**. Sinyal tersebut selanjutnya diproses secara *real-time* menggunakan algoritma *Digital Signal Processing* (DSP) dan *Fast Fourier Transform* (FFT) resmi dari Interaxon LibMuse untuk mengekstraksi daya absolut gelombang otak (*absolute band powers*), yaitu Delta (0.5–4 Hz), Theta (4–8 Hz), Alpha (8–13 Hz), Beta (13–30 Hz), dan Gamma (30–100 Hz). Nilai daya gelombang diperbarui dan dicatat dengan resolusi temporal **10 Hz (interval $0.1\text{ detik}$)** sepanjang sesi pengujian untuk menganalisis dinamika puncak gelombang Alpha dan rasio Theta/Beta.

---

## 4. Struktur Data pada File Ekspor Excel / CSV

File `.csv` yang diunduh dari halaman **Hasil Akhir** menyajikan data dengan struktur berikut:

- Setiap baris mewakili 1 sampel data *Band Power* (sekitar 10 baris per detik perekaman).
- Kolom `detik` mencatat waktu berjalan dalam format desimal (misal `0.10`, `0.20`, `0.30`, ...).
- Untuk sesi rekam 1 menit, terdapat sekitar $600$ baris data titik ukur, yang memudahkan analisis statistik mendalam, pembuatan grafik regresi, maupun pencarian nilai puncak (*peak detection*) di Microsoft Excel / SPSS / Python.
