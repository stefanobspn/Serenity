/* edf.js — utilitas pembuat file standar medis .EDF (European Data Format)
   ==========================================================================
   APA ITU FORMAT .EDF?

   EDF (European Data Format) adalah format file standar internasional yang
   dipakai oleh dokter saraf, psikolog, dan peneliti EEG di seluruh dunia.
   Format ini bisa dibuka langsung di software medis profesional gratis seperti
   EDFbrowser, EEGLAB (MATLAB), MNE-Python, dan Brainstorm.

   Dengan mengekspor ke .EDF, psikolog yang menguji penelitian Naura bisa:
   1. Membuka dan menelusuri gelombang dari detik 0 sampai akhir dengan mulus.
   2. Melakukan filter sinyal (misal notch filter 50Hz, bandpass filter).
   3. Melakukan pengukuran amplitudo gelombang dan analisis lanjutan.

   STRUKTUR FILE EDF:
   File EDF terdiri dari:
   - Header teks ASCII (256 byte pertama: identitas peserta, tanggal, durasi)
   - Header tiap kanal (256 byte x 5 band: label gelombang, satuan, rentang skala)
   - Data rekaman (bilangan bulat biner 16-bit signed integer per detik rekaman).
*/

function buatFileEdf(namaPeserta, sesiLabel, titikTitik) {
  if (!titikTitik || titikTitik.length === 0) return null;

  const durasiDetik = Math.ceil(titikTitik[titikTitik.length - 1].detik) || 1;
  const sampelPerDetik = 10; // ~10 sampel per detik (100ms interval)
  const jumlahKanal = BANDS.length; // 5 kanal (Delta, Theta, Alpha, Beta, Gamma)
  const totalSampelPerKanal = durasiDetik * sampelPerDetik;

  // Siapkan larik data untuk tiap kanal (di-resample/interpolasi ke 10 sampel/detik per kanal)
  const dataKanal = {};
  BANDS.forEach(function (band) {
    dataKanal[band.key] = new Float32Array(totalSampelPerKanal);
  });

  // Isi data kanal berdasarkan titik interval terdekat
  let indeksTitik = 0;
  for (let i = 0; i < totalSampelPerKanal; i++) {
    const waktuTarget = i / sampelPerDetik;
    while (indeksTitik < titikTitik.length - 1 && titikTitik[indeksTitik + 1].detik <= waktuTarget) {
      indeksTitik++;
    }
    const titik = titikTitik[indeksTitik];
    BANDS.forEach(function (band) {
      dataKanal[band.key][i] = titik ? titik[band.key] : 0;
    });
  }

  // Hitung ukuran header dan buffer biner
  const panjangHeaderUtama = 256;
  const panjangHeaderKanal = 256 * jumlahKanal;
  const panjangTotalHeader = panjangHeaderUtama + panjangHeaderKanal;
  const bytePerRekord = sampelPerDetik * 2 * jumlahKanal; // 2 byte per int16
  const totalByteData = bytePerRekord * durasiDetik;
  const bufferTotal = new ArrayBuffer(panjangTotalHeader + totalByteData);
  const viewByte = new Uint8Array(bufferTotal);
  const viewData = new DataView(bufferTotal);

  // Helper untuk menulis teks ASCII dengan padding spasi ke buffer
  function tulisAscii(teks, posisi, panjang) {
    const str = (teks || '').toString();
    for (let j = 0; j < panjang; j++) {
      viewByte[posisi + j] = j < str.length ? str.charCodeAt(j) : 32; // 32 = spasi ASCII
    }
  }

  const sekarang = new Date();
  const tglStr = String(sekarang.getDate()).padStart(2, '0') + '.' +
               String(sekarang.getMonth() + 1).padStart(2, '0') + '.' +
               String(sekarang.getFullYear()).slice(-2);
  const jamStr = String(sekarang.getHours()).padStart(2, '0') + '.' +
               String(sekarang.getMinutes()).padStart(2, '0') + '.' +
               String(sekarang.getSeconds()).padStart(2, '0');

  // --- 1. Header Utama EDF (256 bytes) ---
  tulisAscii('0', 0, 8); // Versi format (harus '0')
  tulisAscii(namaPeserta || 'Peserta', 8, 80); // Identitas pasien/peserta
  tulisAscii('Serenity EEG ' + sesiLabel, 88, 80); // Identitas rekaman
  tulisAscii(tglStr, 168, 8); // Tanggal mulai (dd.mm.yy)
  tulisAscii(jamStr, 176, 8); // Jam mulai (hh.mm.ss)
  tulisAscii(panjangTotalHeader.toString(), 184, 8); // Jumlah byte header
  tulisAscii('', 192, 44); // Reserved
  tulisAscii(durasiDetik.toString(), 236, 8); // Jumlah data records
  tulisAscii('1', 244, 8); // Durasi tiap record (1 detik)
  tulisAscii(jumlahKanal.toString(), 252, 4); // Jumlah sinyal / kanal

  // --- 2. Header Kanal (256 bytes x 5 kanal) ---
  // Urutan penulisan field EDF berselang-seling per blok field, bukan per kanal:
  let pos = panjangHeaderUtama;

  // Label kanal (16 bytes x 5)
  BANDS.forEach(function (band) {
    tulisAscii('EEG ' + band.label, pos, 16);
    pos += 16;
  });

  // Transducer type (80 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii('Muse S Gen 2 LibMuse', pos, 80);
    pos += 80;
  });

  // Physical dimension / satuan (8 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii('uV', pos, 8);
    pos += 8;
  });

  // Physical minimum (-100.0) (8 bytes x 5)
  const physMin = -50.0;
  const physMax = 150.0;
  BANDS.forEach(function () {
    tulisAscii(physMin.toFixed(1), pos, 8);
    pos += 8;
  });

  // Physical maximum (150.0) (8 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii(physMax.toFixed(1), pos, 8);
    pos += 8;
  });

  // Digital minimum (-32768) (8 bytes x 5)
  const digMin = -32768;
  const digMax = 32767;
  BANDS.forEach(function () {
    tulisAscii(digMin.toString(), pos, 8);
    pos += 8;
  });

  // Digital maximum (32767) (8 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii(digMax.toString(), pos, 8);
    pos += 8;
  });

  // Prefiltering (80 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii('FFT Band Power 10Hz', pos, 80);
    pos += 80;
  });

  // Samples per data record / detik (8 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii(sampelPerDetik.toString(), pos, 8);
    pos += 8;
  });

  // Reserved (32 bytes x 5)
  BANDS.forEach(function () {
    tulisAscii('', pos, 32);
    pos += 32;
  });

  // --- 3. Data Records (16-bit signed integer per detik) ---
  let offsetData = panjangTotalHeader;
  for (let sec = 0; sec < durasiDetik; sec++) {
    BANDS.forEach(function (band) {
      for (let s = 0; s < sampelPerDetik; s++) {
        const idxSampel = sec * sampelPerDetik + s;
        const valFloat = dataKanal[band.key][idxSampel] || 0;

        // Konversi dari nilai fisik (float) ke nilai digital (16-bit int)
        const valNorm = (valFloat - physMin) / (physMax - physMin);
        let valInt = Math.round(valNorm * (digMax - digMin) + digMin);
        if (valInt < digMin) valInt = digMin;
        if (valInt > digMax) valInt = digMax;

        // Tulis integer 16-bit (Little-Endian)
        viewData.setInt16(offsetData, valInt, true);
        offsetData += 2;
      }
    });
  }

  return new Blob([bufferTotal], { type: 'application/octet-stream' });
}

// Fungsi pembantu untuk memicu download file .EDF di browser
function unduhEdf(namaPeserta, sesiLabel, titikTitik) {
  const blob = buatFileEdf(namaPeserta, sesiLabel, titikTitik);
  if (!blob) return;

  const namaBersih = (namaPeserta || 'peserta').replace(/\s+/g, '_');
  const namaFile = 'eeg_' + sesiLabel + '_' + namaBersih + '.edf';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = namaFile;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
