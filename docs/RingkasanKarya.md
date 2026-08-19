# Ringkasan Proposal Karya Ilmiah Remaja SMA

**Judul:** Efek Green Scent Terapi dengan Eksplorasi Sistem Personalized Alarm-Feedback Berbasis EEG untuk Parameter Stress dan Eating Response  
**Peneliti:** NAURA KAYANA HANANIA  
**Lokasi Penelitian:** SMA Negeri 1 Surakarta  

---

## Latar Belakang & Tujuan
Kondisi *stress* dan *hunger* dapat menyebabkan perubahan gelombang pada EEG (Wen, 2020; Kalahasti, 2025)[cite: 1]. Gelombang EEG dapat digunakan untuk pengukuran secara kuantitatif dan perubahan secara *real-time* (Wen, 2020)[cite: 1]. 

Oleh karena itu, perlu dilakukan penelitian ini dengan tujuan mengembangkan sistem yang dapat menggabungkan pengukuran status stres dan *eating response-hunger* berbasis EEG pada individu (*personalized system alarm-feedback*)[cite: 1]. 

Di ruang kelas digunakan *diffuser* atsiri sebagai aromaterapi (*green scent therapy*)[cite: 1]. Minyak atsiri seperti cengkeh dapat digunakan untuk terapi pada stres, ansietas, dan kesedihan (Sadaf, 2025) serta dapat meningkatkan nafsu makan (Nguyen, 2023)[cite: 1]. Hal ini dapat digunakan untuk personalisasi strategi dalam deteksi dini maupun pemantauan efek stres[cite: 1].

---

## Metode Penelitian

### 1. Tahap Satu
* **Pengukuran EEG:** Mengukur gelombang otak manusia menggunakan headset Muse S Gen 2 (ADC sampling rate **256 Hz**, interval cuplikan mentah $\Delta t \approx 0.004\text{ detik}$, diekstraksi ke *Band Power* via FFT resmi LibMuse pada resolusi **10 Hz / interval 0.1 detik** — lihat detail di `docs/PenjelasanSamplingRateEEG.md`):
  * Alpha (8–13 Hz)[cite: 1]
  * Beta (14–26 Hz)[cite: 1]
  * Delta (0.5–4.0 Hz)[cite: 1]
  * Gamma (>30 Hz)[cite: 1]
  * Theta (4–8 Hz) (Khakim, 2021)[cite: 1]
* **Parameter Stres:** Menggunakan data rasio Theta/Beta berbasis EEG (Wen, 2020) setelah tes, yang kemudian dibandingkan dengan nilai *baseline* (kondisi sebelum mengerjakan tes memori/aritmatika di sekolah)[cite: 1].
  * Nilai amplitudo EEG dipantau:
    * Jika nilai rasio **turun** $\rightarrow$ Menunjukkan terjadi **peningkatan stres**[cite: 1].
    * Jika nilai rasio **meningkat** $\rightarrow$ Menunjukkan **stres menurun**[cite: 1].
* **Parameter Rasa Lapar:** Berdasarkan puncak gelombang Alpha pada EEG (Kalahasti, 2025)[cite: 1].
* Dampak terapi dilihat berdasarkan perubahan nilai gelombang (Talakoub, 2025)[cite: 1].

### 2. Tahap Dua
* Prosedur dilakukan sama seperti pada Tahap Satu, namun tes dilakukan di dalam ruangan yang dilengkapi dengan *diffuser* aromaterapi[cite: 1].
* Perubahan tingkat stres dinilai setelah tes dan dibandingkan dengan nilai *baseline*[cite: 1].

---

## Analisis Data
Terdapat dua jenis analisis data:
1. **Analisis Pertama:** Melihat perubahan data sebelum dan sesudah pengukuran EEG pada Tahap Satu dan Tahap Dua[cite: 1].
2. **Analisis Kedua:** Membandingkan nilai antara Tahap Satu dan Tahap Dua untuk melihat efek penggunaan *diffuser* aromaterapi (*green scent*)[cite: 1].