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

  var durasiDetik = Math.ceil(titikTitik[titikTitik.length - 1].detik) || 1;
  var sampelPerDetik = 10; // ~10 sampel per detik (100ms interval)
  var jumlahKanal = BANDS.length; // 5 kanal (Delta, Theta, Alpha, Beta, Gamma)
  var totalSampelPerKanal = durasiDetik * sampelPerDetik;

  // Siapkan larik data untuk tiap kanal (di-resample/interpolasi ke 10 sampel/detik per kanal)
  var dataKanal = {};
  BANDS.forEach(function (band) {
    dataKanal[band.key] = new Float32Array(totalSampelPerKanal);
  });

  // Isi data kanal berdasarkan titik interval terdekat
  var indeksTitik = 0;
  for (var i = 0; i < totalSampelPerKanal; i++) {
    var waktuTarget = i / sampelPerDetik;
    while (indeksTitik < titikTitik.length - 1 && titikTitik[indeksTitik + 1].detik <= waktuTarget) {
      indeksTitik++;
    }
    var titik = titikTitik[indeksTitik];
    BANDS.forEach(function (band) {
      dataKanal[band.key][i] = titik ? titik[band.key] : 0;
    });
  }

  // Hitung ukuran header dan buffer biner
  var panjangHeaderUtama = 256;
  var panjangHeaderKanal = 256 * jumlahKanal;
  var panjangTotalHeader = panjangHeaderUtama + panjangHeaderKanal;
  var bytePerRekord = sampelPerDetik * 2 * jumlahKanal; // 2 byte per int16
  var totalByteData = bytePerRekord * durasiDetik;
  var bufferTotal = new ArrayBuffer(panjangTotalHeader + totalByteData);
  var viewByte = new Uint8Array(bufferTotal);
  var viewData = new DataView(bufferTotal);

  // Helper untuk menulis teks ASCII dengan padding spasi ke buffer
  function tulisAscii(teks, posisi, panjang) {
    var str = (teks || '').toString();
    for (var j = 0; j < panjang; j++) {
      viewByte[posisi + j] = j < str.length ? str.charCodeAt(j) : 32; // 32 = spasi ASCII
    }
  }

  var sekarang = new Date();
  var tglStr = String(sekarang.getDate()).padStart(2, '0') + '.' +
               String(sekarang.getMonth() + 1).padStart(2, '0') + '.' +
               String(sekarang.getFullYear()).slice(-2);
  var jamStr = String(sekarang.getHours()).padStart(2, '0') + '.' +
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
  var pos = panjangHeaderUtama;

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
  var physMin = -50.0;
  var physMax = 150.0;
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
  var digMin = -32768;
  var digMax = 32767;
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
  var offsetData = panjangTotalHeader;
  for (var sec = 0; sec < durasiDetik; sec++) {
    BANDS.forEach(function (band) {
      for (var s = 0; s < sampelPerDetik; s++) {
        var idxSampel = sec * sampelPerDetik + s;
        var valFloat = dataKanal[band.key][idxSampel] || 0;

        // Konversi dari nilai fisik (float) ke nilai digital (16-bit int)
        var valNorm = (valFloat - physMin) / (physMax - physMin);
        var valInt = Math.round(valNorm * (digMax - digMin) + digMin);
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
  var blob = buatFileEdf(namaPeserta, sesiLabel, titikTitik);
  if (!blob) return;

  var namaBersih = (namaPeserta || 'peserta').replace(/\s+/g, '_');
  var namaFile = 'eeg_' + sesiLabel + '_' + namaBersih + '.edf';

  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = namaFile;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
