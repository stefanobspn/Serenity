/* hasil.js — logika halaman hasilakhir.html (Hasil Akhir)
   ==========================================================
   Halaman ini murni menampilkan data yang sudah tersimpan di localStorage
   (lewat storage.js) dari halaman-halaman sebelumnya: 3 kuesioner dan
   rata-rata band power dari dua sesi rekam 1 menit (EEG 1 & EEG 2) di
   eegmonitor.html. Tidak ada koneksi Bluetooth atau library eksternal di
   sini sama sekali. */


/* ===== Ringkasan Kuesioner ===== */

// Tampilkan hasil PSS-5, SEES-10, dan Hunger Scale yang tersimpan di
// localStorage dari halaman-halaman kuesioner.
function tampilkanRingkasanKuesioner() {
  const hasil = ambilHasilKuesioner();
  const wadahEl = document.getElementById('ringkasan-kuesioner');

  const belumAdaData = !hasil.pss5 && !hasil.sees10 && !hasil.hunger;
  if (belumAdaData) {
    wadahEl.textContent = 'Belum ada data kuesioner (halaman ini dibuka langsung tanpa mengisi kuesioner).';
    return;
  }

  wadahEl.innerHTML = ''; // kosongkan dulu tulisan "Memuat..."

  if (hasil.peserta && hasil.peserta.nama) {
    const namaEl = document.createElement('div');
    namaEl.className = 'catatan';
    namaEl.style.fontSize = '14px';
    namaEl.style.fontWeight = '600';
    namaEl.style.marginBottom = '12px';
    namaEl.innerHTML = 'Nama Peserta: <span style="color: var(--color-primary);">' + hasil.peserta.nama + '</span>';
    wadahEl.appendChild(namaEl);
  }

  const cardsGrid = document.createElement('div');
  cardsGrid.className = 'summary-cards-grid';

  if (hasil.pss5) {
    const cardPss5 = document.createElement('div');
    cardPss5.className = 'summary-card';
    const isStresTinggi = hasil.pss5.status === 'TINGGI';
    const badgeClass = isStresTinggi ? 'summary-badge-high' : 'summary-badge-low';
    cardPss5.innerHTML = 
      '<div class="summary-card-title">Tingkat Stres (PSS-5)</div>' +
      '<div class="summary-card-value">Skor ' + hasil.pss5.skor + ' <small style="font-size: 13px; font-weight: normal; color: var(--color-text-muted);">/ 30</small></div>' +
      '<div><span class="summary-card-badge ' + badgeClass + '">' + hasil.pss5.status + '</span></div>';
    cardsGrid.appendChild(cardPss5);
  }

  if (hasil.sees10) {
    const cardSees = document.createElement('div');
    cardSees.className = 'summary-card';
    const isOver = hasil.sees10.status.indexOf('OVER') !== -1;
    const isUnder = hasil.sees10.status.indexOf('UNDER') !== -1;
    const badgeSees = isOver ? 'summary-badge-high' : (isUnder ? 'summary-badge-mid' : 'summary-badge-low');
    cardSees.innerHTML = 
      '<div class="summary-card-title">Emotional Eating (SEES-10)</div>' +
      '<div class="summary-card-value">Rata-rata ' + hasil.sees10.rataRata.toFixed(2) + ' <small style="font-size: 13px; font-weight: normal; color: var(--color-text-muted);">/ 5.0</small></div>' +
      '<div><span class="summary-card-badge ' + badgeSees + '">' + hasil.sees10.status + '</span></div>';
    cardsGrid.appendChild(cardSees);
  }

  if (hasil.hunger) {
    const cardHunger = document.createElement('div');
    cardHunger.className = 'summary-card';
    const labelHunger = hasil.hunger.skor <= 3 ? 'Sangat Lapar' : (hasil.hunger.skor <= 6 ? 'Netral / Cukup' : 'Kenyang');
    cardHunger.innerHTML = 
      '<div class="summary-card-title">Skala Rasa Lapar</div>' +
      '<div class="summary-card-value">Skor ' + hasil.hunger.skor + ' <small style="font-size: 13px; font-weight: normal; color: var(--color-text-muted);">/ 10</small></div>' +
      '<div><span class="summary-card-badge summary-badge-info">' + labelHunger + '</span></div>';
    cardsGrid.appendChild(cardHunger);
  }

  wadahEl.appendChild(cardsGrid);
}


/* ===== Hasil EEG (rata-rata band power dari EEG 1 & EEG 2) ===== */

// Daftar band (BANDS) dan daftar namanya saja (BAND_KEYS) datang dari
// bands.js, yang dimuat duluan di hasilakhir.html. Dulu daftar itu ditulis
// ulang di file ini, dan warnanya harus dijaga manual supaya sama dengan
// grafik live di eegmonitor.html. Sekarang dua halaman itu membaca daftar
// yang sama persis, jadi warna Alpha di sini pasti sama dengan warna Alpha
// di halaman monitor tanpa perlu diingat-ingat.

// Gambar satu grafik garis tren band power bertingkat ("grafik rumput" klinis)
// sepanjang satu sesi rekam (EEG 1 atau EEG 2), dari titik-titik data per-sampel.
// Memakai 5 sumbu Y bertingkat (stack: 'eeg_stack') agar Delta, Theta, Alpha, Beta,
// dan Gamma masing-masing memiliki jalurnya sendiri dan tidak saling tumpang tindih.
function gambarGrafikEeg(prefix, dataEeg) {
  const titikTitik = dataEeg.interval;
  const canvas = document.getElementById('eegChart-' + prefix);
  if (!canvas) return;

  const scalesConfig = {
    x: {
      title: { display: true, text: 'Waktu (detik)', font: { size: 12 } },
      ticks: { maxTicksLimit: 15 }
    }
  };

  BANDS.forEach(function (band) {
    const axisId = 'y_' + band.key;
    scalesConfig[axisId] = {
      type: 'linear',
      stack: 'eeg_stack',
      stackWeight: 1,
      grid: { drawOnChartArea: true, color: '#f1f5f9' },
      title: {
        display: true,
        text: band.label,
        color: band.color,
        font: { weight: 'bold', size: 11 }
      },
      ticks: {
        maxTicksLimit: 2,
        color: band.color,
        font: { size: 9 }
      }
    };
  });

  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: titikTitik.map(function (titik) { return titik.detik + 's'; }),
      datasets: BANDS.map(function (band) {
        return {
          label: band.label,
          data: titikTitik.map(function (titik) { return titik[band.key]; }),
          borderColor: band.color,
          backgroundColor: band.color,
          yAxisID: 'y_' + band.key,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.2
        };
      })
    },
    options: {
      responsive: true,
      animation: false,
      scales: scalesConfig,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 12 }
        }
      }
    }
  });
}

// Isi satu set kartu band (EEG 1 atau EEG 2) — prefix contohnya 'eeg1'
// atau 'eeg2', dipakai buat cocokin id="band-eeg1-delta" dst di HTML.
function isiKartuBand(prefix, dataEeg) {
  BAND_KEYS.forEach(function (key) {
    document.getElementById('band-' + prefix + '-' + key).textContent = dataEeg[key].value;
  });
}

// Bandingkan rasio Theta/Beta EEG 1 (baseline) dengan EEG 2 (setelah
// aktivitas). Aturan dari proposal penelitian (docs/RingkasanKarya.md):
// rasio turun = stres naik, rasio naik = stres turun. Dipakai .raw (angka
// mentah dari eeg.js), bukan .value (teks siap tampil), supaya hitungannya
// presisi.
function hitungVerdictStres(eeg1, eeg2) {
  const rasio1 = eeg1.theta.raw / eeg1.beta.raw;
  const rasio2 = eeg2.theta.raw / eeg2.beta.raw;
  const arah = rasio2 < rasio1 ? 'naik' : (rasio2 > rasio1 ? 'turun' : 'stabil');
  return { arah: arah, rasio1: rasio1, rasio2: rasio2 };
}

// Cari nilai tertinggi (puncak) dari satu band pada daftar titik interval.
// Ditulis pakai loop biasa daripada Math.max.apply supaya aman untuk
// daftar data panjang (ribuan sampel) tanpa risiko call-stack overflow.
function cariNilaiPuncak(titikTitik, bandKey) {
  if (!titikTitik || titikTitik.length === 0) return 0;
  let puncak = titikTitik[0][bandKey];
  for (let i = 1; i < titikTitik.length; i++) {
    if (titikTitik[i][bandKey] > puncak) {
      puncak = titikTitik[i][bandKey];
    }
  }
  return puncak;
}

// Bandingkan PUNCAK power Alpha EEG 1 vs EEG 2 sebagai sinyal rasa lapar,
// sesuai docs/RingkasanKarya.md ("berdasarkan puncak gelombang Alpha").
// Dipakai nilai maksimum dari titik-titik data per-sampel (dataEeg.interval,
// lihat eeg.js), bukan rata-rata keseluruhan sesi — karena rata-rata bisa
// meratakan/menyembunyikan puncak yang cuma muncul sesaat di tengah sesi.
function hitungVerdictLapar(eeg1, eeg2) {
  const alpha1 = cariNilaiPuncak(eeg1.interval, 'alpha');
  const alpha2 = cariNilaiPuncak(eeg2.interval, 'alpha');
  const arah = alpha2 > alpha1 ? 'naik' : (alpha2 < alpha1 ? 'turun' : 'stabil');
  return { arah: arah, alpha1: alpha1, alpha2: alpha2 };
}

function teksVerdictStres(v) {
  if (v.arah === 'naik') return 'Stres meningkat setelah aktivitas (rasio Theta/Beta turun dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  if (v.arah === 'turun') return 'Stres menurun setelah aktivitas (rasio Theta/Beta naik dari ' + v.rasio1.toFixed(2) + ' ke ' + v.rasio2.toFixed(2) + ').';
  return 'Stres relatif stabil setelah aktivitas (rasio Theta/Beta tidak berubah).';
}

function teksVerdictLapar(v) {
  if (v.arah === 'naik') return 'Puncak gelombang Alpha meningkat setelah aktivitas. Bisa jadi tanda rasa lapar berkurang.';
  if (v.arah === 'turun') return 'Puncak gelombang Alpha menurun setelah aktivitas. Bisa jadi tanda rasa lapar bertambah.';
  return 'Puncak gelombang Alpha relatif stabil setelah aktivitas.';
}

function tampilkanHasilEeg() {
  const hasil = ambilHasilKuesioner();
  const kosongEl = document.getElementById('eegKosong');
  const perbandinganEl = document.getElementById('eegPerbandingan');

  if (!hasil.eeg1 || !hasil.eeg2) {
    kosongEl.hidden = false;
    kosongEl.textContent = !hasil.eeg1
      ? 'Belum ada data EEG (EEG 1 belum pernah direkam).'
      : 'EEG 1 sudah ada, tapi EEG 2 belum pernah direkam.';
    perbandinganEl.hidden = true;
    return;
  }

  kosongEl.hidden = true;
  perbandinganEl.hidden = false;

  isiKartuBand('eeg1', hasil.eeg1);
  isiKartuBand('eeg2', hasil.eeg2);
  gambarGrafikEeg('eeg1', hasil.eeg1);
  gambarGrafikEeg('eeg2', hasil.eeg2);

  document.getElementById('verdictStres').textContent = teksVerdictStres(hitungVerdictStres(hasil.eeg1, hasil.eeg2));
  document.getElementById('verdictLapar').textContent = teksVerdictLapar(hitungVerdictLapar(hasil.eeg1, hasil.eeg2));
}


/* ===== Rekomendasi Aksi (Berdasarkan PSS-5, SEES-10, & EEG) =====
   Aturan rekomendasi:
   - Rekomendasi A diberikan jika:
     1. Stres kuesioner tinggi (skor PSS-5 > 14 atau status === 'TINGGI')
     2. Emotional eating tinggi / overeating (rata-rata SEES-10 > 3)
     3. Terjadi peningkatan stres dari data EEG (rasio Theta/Beta menurun)
     4. Penurunan nafsu makan / emotional under-eating (rata-rata SEES-10 < 3)
     - Rekomendasi B diberikan jika:
     Kondisi stres rendah (skor PSS-5 < 15), emotional eating moderate/stabil
     (rata-rata SEES-10 < 4), tidak ada peningkatan stres, dan tidak ada
     perubahan nafsu makan berlebih. */

function evaluasiRekomendasi(hasil, verdictStresData) {
  const pemicu = [];

  const stresTinggi = hasil.pss5 && hasil.pss5.skor > 14;
  if (stresTinggi) {
    pemicu.push('Tingkat stres kuesioner tinggi (skor PSS-5: ' + hasil.pss5.skor + '/30)');
  }

  const overEating = hasil.sees10 && hasil.sees10.rataRata > 3;
  if (overEating) {
    pemicu.push('Kecenderungan makan berlebih saat stres / overeating (rata-rata SEES-10: ' + hasil.sees10.rataRata.toFixed(2) + ')');
  }

  const underEating = hasil.sees10 && hasil.sees10.rataRata < 3;
  if (underEating) {
    pemicu.push('Kecenderungan penurunan nafsu makan saat stres / under-eating (rata-rata SEES-10: ' + hasil.sees10.rataRata.toFixed(2) + ')');
  }

  const stresEegNaik = !!verdictStresData && verdictStresData.arah === 'naik';
  if (stresEegNaik) {
    pemicu.push('Peningkatan stres terdeteksi pada EEG (rasio Theta/Beta menurun)');
  }

  // Jika ada salah satu kriteria stres tinggi, emotional eating, atau peningkatan stres
  if (stresTinggi || overEating || underEating || stresEegNaik) {
    return {
      tipe: 'A',
      alasan: pemicu.length > 0 ? pemicu : ['Terdeteksi indikasi stres tinggi, peningkatan stres, atau perubahan nafsu makan.']
    };
  }

  // Jika kondisi stabil / rendah
  const alasanB = [];
  if (hasil.pss5) {
    alasanB.push('Tingkat stres kuesioner rendah (skor PSS-5: ' + hasil.pss5.skor + '/30)');
  }
  if (hasil.sees10) {
    alasanB.push('Pola makan stabil / tidak berlebih (rata-rata SEES-10: ' + hasil.sees10.rataRata.toFixed(2) + ')');
  }
  if (verdictStresData && verdictStresData.arah !== 'naik') {
    alasanB.push('Kondisi stres EEG terpantau stabil/menurun');
  }
  if (alasanB.length === 0) {
    alasanB.push('Kondisi stres dan pola makan terpantau baik dan stabil.');
  }

  return {
    tipe: 'B',
    alasan: alasanB
  };
}

function buatHtmlRekomendasiA(alasanList) {
  const teksAlasan = alasanList.join(', ');
  return '' +
    '<div class="rekomendasi-card rekomendasi-card-a">' +
      '<div class="rekomendasi-header">' +
        '<span class="rekomendasi-badge rekomendasi-badge-a">Rekomendasi A</span>' +
        '<h3 class="rekomendasi-judul">Intervensi Relaksasi & Regulasi Pola Makan</h3>' +
      '</div>' +
      '<div class="rekomendasi-kondisi">' +
        '<p><strong>Kondisi:</strong> Jika stres tinggi atau terjadi peningkatan stres atau penurunan nafsu makan.</p>' +
        '<p class="rekomendasi-alasan-detail"><strong>Indikator saat ini:</strong> ' + teksAlasan + '</p>' +
      '</div>' +
      '<p class="rekomendasi-instruksi">Lakukan relaksasi dengan:</p>' +
      '<ol class="rekomendasi-ol">' +
        '<li>' +
          '<strong>Latihan pernapasan</strong> (Relaksasi diulang setiap hari selama minimal 5 - 10 menit)<br>' +
          'Dapat dilakukan dengan cara:' +
          '<ul class="rekomendasi-sublist">' +
            '<li>Duduk dengan mata terpejam (posisi santai nyaman), membayangkan hal yang menyenangkan;</li>' +
            '<li>Menarik napas melalui hidung, kemudian menahan 3 hitungan, dan selanjutnya dihembuskan melalui hidung, sambil membayangkan semua beban pikiran dilepaskan;</li>' +
            '<li>Mensyukuri nikmat Tuhan YME.</li>' +
          '</ul>' +
        '</li>' +
        '<li>' +
          '<strong>Dapat dilanjutkan dengan:</strong>' +
          '<ol type="a" class="rekomendasi-sublist-alpha">' +
            '<li>' +
              '<strong>Aktivitas meditasi:</strong>' +
              '<ul class="rekomendasi-sublist">' +
                '<li>Duduk tenang (dengan posisi tegap), sambil memejamkan mata dan mengatur pernapasan perlahan dan teratur (10-20 menit);</li>' +
                '<li>Fokuskan perhatian anda pada tarikan napas dan hati/perasaan anda;</li>' +
                '<li>Fokuskan pikiran pada berbagai bagian tubuh secara bergantian, sambil terus menarik napas perlahan. Sadari apa yang Anda rasakan di bagian-bagian tubuh tersebut. Anda juga bisa menyelingi sesi meditasi untuk berdoa, bersyukur, atau <em>positive self talk</em>.</li>' +
              '</ul>' +
            '</li>' +
            '<li><strong>Mendengarkan musik</strong> (referensi: <a href="https://repository.rskariadi.id//index.php?p=show_detail&id=617" target="_blank" rel="noopener noreferrer" class="rekomendasi-link">repository.rskariadi.id</a>)</li>' +
            '<li><strong>Aromaterapi</strong> dengan cengkeh, serai dan vanila (rasio = 2:1:2)</li>' +
            '<li><strong>Aktivitas yoga</strong></li>' +
          '</ol>' +
        '</li>' +
        '<li>' +
          '<strong>Makan makanan yang bergizi dan latih Mindful eating</strong> atau makan dengan kesadaran penuh merupakan praktik makan dengan perhatian dan apresiasi penuh terhadap makanan yang tersaji di atas piring. Secara spesifik, <em>mindful eating</em> termasuk memerhatikan aroma, tekstur, hingga rasa makanan yang sedang dikonsumsi. Jangan lupa juga untuk memerhatikan porsi camilan maupun makanan utama agar tidak berlebihan.' +
        '</li>' +
      '</ol>' +
    '</div>';
}

function buatHtmlRekomendasiB(alasanList) {
  const teksAlasan = alasanList.join(', ');
  return '' +
    '<div class="rekomendasi-card rekomendasi-card-b">' +
      '<div class="rekomendasi-header">' +
        '<span class="rekomendasi-badge rekomendasi-badge-b">Rekomendasi B</span>' +
        '<h3 class="rekomendasi-judul">Pemeliharaan Kondisi Positif & Relaksasi Preventif</h3>' +
      '</div>' +
      '<div class="rekomendasi-kondisi">' +
        '<p><strong>Kondisi:</strong> Jika stres rendah atau tidak ada peningkatan stres dan tidak ada perubahan nafsu makan / makan yang berlebih.</p>' +
        '<p class="rekomendasi-alasan-detail"><strong>Indikator saat ini:</strong> ' + teksAlasan + '</p>' +
      '</div>' +
      '<ol class="rekomendasi-ol">' +
        '<li><strong>Jaga hal, rasa, kegiatan, dan lingkungan supaya tetap positif.</strong></li>' +
        '<li>' +
          '<strong>Dapat melakukan kegiatan relaksasi berikut jika dirasakan mengalami hal yang dapat memicu stres, yaitu:</strong>' +
          '<ol type="a" class="rekomendasi-sublist-alpha">' +
            '<li>' +
              '<strong>Latihan pernapasan</strong> (Relaksasi diulang setiap hari selama minimal 5 - 10 menit)<br>' +
              'Dapat dilakukan dengan cara:' +
              '<ul class="rekomendasi-sublist">' +
                '<li>Duduk dengan mata terpejam (posisi santai nyaman), membayangkan hal yang menyenangkan;</li>' +
                '<li>Menarik napas melalui hidung, kemudian menahan 3 hitungan, dan selanjutnya dihembuskan melalui hidung, sambil membayangkan semua beban pikiran dilepaskan;</li>' +
                '<li>Mensyukuri nikmat Tuhan YME.</li>' +
              '</ul>' +
            '</li>' +
            '<li>' +
              '<strong>Aktivitas meditasi:</strong>' +
              '<ul class="rekomendasi-sublist">' +
                '<li>Duduk tenang (dengan posisi tegap), sambil memejamkan mata dan mengatur pernapasan perlahan dan teratur (10-20 menit);</li>' +
                '<li>Fokuskan perhatian anda pada tarikan napas dan hati/perasaan anda;</li>' +
                '<li>Fokuskan pikiran pada berbagai bagian tubuh secara bergantian, sambil terus menarik napas perlahan. Sadari apa yang Anda rasakan di bagian-bagian tubuh tersebut. Anda juga bisa menyelingi sesi meditasi untuk berdoa, bersyukur, atau <em>positive self talk</em>.</li>' +
              '</ul>' +
            '</li>' +
            '<li><strong>Mendengarkan musik</strong> (referensi: <a href="https://repository.rskariadi.id//index.php?p=show_detail&id=617" target="_blank" rel="noopener noreferrer" class="rekomendasi-link">repository.rskariadi.id</a>)</li>' +
            '<li><strong>Aromaterapi</strong> dengan cengkeh, serai dan vanila (rasio = 2:1:2)</li>' +
            '<li><strong>Aktivitas yoga</strong></li>' +
          '</ol>' +
        '</li>' +
        '<li>' +
          '<strong>Makan makanan yang bergizi dan latih Mindful eating</strong> atau makan dengan kesadaran penuh merupakan praktik makan dengan perhatian dan apresiasi penuh terhadap makanan yang tersaji di atas piring. Secara spesifik, <em>mindful eating</em> termasuk memerhatikan aroma, tekstur, hingga rasa makanan yang sedang dikonsumsi. Jangan lupa juga untuk memerhatikan porsi camilan maupun makanan utama agar tidak berlebihan.' +
        '</li>' +
      '</ol>' +
    '</div>';
}

function tampilkanRekomendasi() {
  const hasil = ambilHasilKuesioner();
  const wadahEl = document.getElementById('rekomendasi');

  const belumAdaKuesioner = !hasil.pss5 && !hasil.sees10 && !hasil.hunger;
  if (belumAdaKuesioner) {
    wadahEl.textContent = 'Belum ada data kuesioner untuk dibuatkan rekomendasi.';
    return;
  }

  const verdictStresData = (hasil.eeg1 && hasil.eeg2) ? hitungVerdictStres(hasil.eeg1, hasil.eeg2) : null;
  const evaluasi = evaluasiRekomendasi(hasil, verdictStresData);

  if (evaluasi.tipe === 'A') {
    wadahEl.innerHTML = buatHtmlRekomendasiA(evaluasi.alasan);
  } else {
    wadahEl.innerHTML = buatHtmlRekomendasiB(evaluasi.alasan);
  }
}


/* ===== Fitur Ekspor: Gambar Grafik (PNG), File Medis (.EDF), & CSV ===== */

// Bungkus satu nilai supaya aman dipakai di dalam file CSV.
function escapeNilaiCsv(nilai) {
  const teks = String(nilai === null || nilai === undefined ? '' : nilai);
  const perluDibungkus = teks.indexOf(',') !== -1 || teks.indexOf('"') !== -1 || teks.indexOf('\n') !== -1;
  if (!perluDibungkus) return teks;
  return '"' + teks.replace(/"/g, '""') + '"';
}

/* 1. CSV Ringkasan: 1 Baris per Peserta (Sangat Rapi untuk Excel / SPSS)
   Menyimpan seluruh data identitas, hasil kuesioner, nilai rata-rata tiap
   band EEG 1 & EEG 2, rasio Theta/Beta, puncak Alpha, kesimpulan, dan mutu sinyal.
   Format ini membuat data 30-50 peserta penelitian bisa langsung ditumpuk
   ke bawah menjadi satu tabel spreadsheet master tanpa ribuan baris berserakan. */
function buatCsvRingkasan() {
  const hasil = ambilHasilKuesioner();
  const waktuUnduh = new Date().toLocaleString('id-ID');

  const header = [
    'waktu_unduh',
    'nama_peserta',
    'pss5_skor',
    'pss5_status',
    'sees10_rata_rata',
    'sees10_status',
    'hunger_skor',
    'rekomendasi_aksi',
    'eeg1_delta',
    'eeg1_theta',
    'eeg1_alpha',
    'eeg1_beta',
    'eeg1_gamma',
    'eeg1_rasio_theta_beta',
    'eeg1_puncak_alpha',
    'eeg2_delta',
    'eeg2_theta',
    'eeg2_alpha',
    'eeg2_beta',
    'eeg2_gamma',
    'eeg2_rasio_theta_beta',
    'eeg2_puncak_alpha',
    'kesimpulan_stres',
    'kesimpulan_lapar',
    'eeg1_mutu_diabaikan',
    'eeg2_mutu_diabaikan'
  ];

  const eeg1 = hasil.eeg1;
  const eeg2 = hasil.eeg2;

  const eeg1Rasio = (eeg1 && eeg1.theta && eeg1.beta && eeg1.beta.raw) ? (eeg1.theta.raw / eeg1.beta.raw).toFixed(2) : '';
  const eeg2Rasio = (eeg2 && eeg2.theta && eeg2.beta && eeg2.beta.raw) ? (eeg2.theta.raw / eeg2.beta.raw).toFixed(2) : '';
  const eeg1PuncakAlpha = (eeg1 && eeg1.interval) ? cariNilaiPuncak(eeg1.interval, 'alpha').toFixed(3) : '';
  const eeg2PuncakAlpha = (eeg2 && eeg2.interval) ? cariNilaiPuncak(eeg2.interval, 'alpha').toFixed(3) : '';

  const verdictStresData = (eeg1 && eeg2) ? hitungVerdictStres(eeg1, eeg2) : null;
  const verdictStres = verdictStresData ? teksVerdictStres(verdictStresData) : '';
  const verdictLapar = (eeg1 && eeg2) ? teksVerdictLapar(hitungVerdictLapar(eeg1, eeg2)) : '';

  const adaKuesioner = !!(hasil.pss5 || hasil.sees10 || hasil.hunger);
  const hasilRekom = adaKuesioner ? evaluasiRekomendasi(hasil, verdictStresData) : null;
  const teksRekomendasi = hasilRekom ? ('Rekomendasi ' + hasilRekom.tipe) : '';

  const baris = [
    waktuUnduh,
    hasil.peserta ? hasil.peserta.nama : '',
    hasil.pss5 ? hasil.pss5.skor : '',
    hasil.pss5 ? hasil.pss5.status : '',
    hasil.sees10 ? hasil.sees10.rataRata.toFixed(2) : '',
    hasil.sees10 ? hasil.sees10.status : '',
    hasil.hunger ? hasil.hunger.skor : '',
    teksRekomendasi,
    (eeg1 && eeg1.delta) ? eeg1.delta.value : '',
    (eeg1 && eeg1.theta) ? eeg1.theta.value : '',
    (eeg1 && eeg1.alpha) ? eeg1.alpha.value : '',
    (eeg1 && eeg1.beta) ? eeg1.beta.value : '',
    (eeg1 && eeg1.gamma) ? eeg1.gamma.value : '',
    eeg1Rasio,
    eeg1PuncakAlpha,
    (eeg2 && eeg2.delta) ? eeg2.delta.value : '',
    (eeg2 && eeg2.theta) ? eeg2.theta.value : '',
    (eeg2 && eeg2.alpha) ? eeg2.alpha.value : '',
    (eeg2 && eeg2.beta) ? eeg2.beta.value : '',
    (eeg2 && eeg2.gamma) ? eeg2.gamma.value : '',
    eeg2Rasio,
    eeg2PuncakAlpha,
    verdictStres,
    verdictLapar,
    (eeg1 && eeg1.kualitas) ? (eeg1.kualitas.diabaikan ? 'ya' : 'tidak') : '',
    (eeg2 && eeg2.kualitas) ? (eeg2.kualitas.diabaikan ? 'ya' : 'tidak') : ''
  ];

  return [header, baris].map(function (b) {
    return b.map(escapeNilaiCsv).join(',');
  }).join('\n');
}

function unduhCsvRingkasan() {
  const teksCsv = '﻿' + buatCsvRingkasan();
  const blob = new Blob([teksCsv], { type: 'text/csv;charset=utf-8' });
  const urlSementara = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const hasil = ambilHasilKuesioner();
  const namaBersih = (hasil.peserta && hasil.peserta.nama) ? hasil.peserta.nama.replace(/\s+/g, '_') : 'peserta';
  link.href = urlSementara;
  link.download = 'ringkasan_hasil_' + namaBersih + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(urlSementara);
}

/* 2. CSV Detail Titik Waktu: Format panjang time-series (~10 baris per detik) */
function siapkanDataCsvDetail() {
  const hasil = ambilHasilKuesioner();
  const waktuUnduh = new Date().toLocaleString('id-ID');

  const kolomPeserta = [
    waktuUnduh,
    hasil.peserta ? hasil.peserta.nama : '',
    hasil.pss5 ? hasil.pss5.skor : '',
    hasil.pss5 ? hasil.pss5.status : '',
    hasil.sees10 ? hasil.sees10.rataRata.toFixed(2) : '',
    hasil.sees10 ? hasil.sees10.status : '',
    hasil.hunger ? hasil.hunger.skor : ''
  ];

  const barisBarisData = [];

  ['eeg1', 'eeg2'].forEach(function (sesi) {
    const dataEeg = hasil[sesi];
    if (!dataEeg || !dataEeg.interval) return;

    const mutu = dataEeg.kualitas;
    const kosong = ['', '', '', ''];
    const nilaiTerburuk = (mutu && mutu.terburuk) ? mutu.terburuk : kosong;
    const persenJelek = (mutu && mutu.persenJelek) ? mutu.persenJelek : kosong;

    const kolomMutu = nilaiTerburuk.slice(0, 4).concat(
      persenJelek.slice(0, 4).map(function (persen) {
        return (persen === '' || persen === null) ? '' : persen.toFixed(1);
      })
    ).concat([
      mutu ? (mutu.diabaikan ? 'ya' : 'tidak') : ''
    ]);

    dataEeg.interval.forEach(function (titik) {
      const teksDetik = typeof titik.detik === 'number' ? titik.detik.toFixed(2) : titik.detik;
      barisBarisData.push(kolomPeserta.concat([
        sesi,
        teksDetik,
        titik.delta.toFixed(3),
        titik.theta.toFixed(3),
        titik.alpha.toFixed(3),
        titik.beta.toFixed(3),
        titik.gamma.toFixed(3)
      ]).concat(kolomMutu));
    });
  });

  return barisBarisData;
}

function buatTeksCsvDetail() {
  const header = [
    'waktu_unduh', 'nama_peserta',
    'pss5_skor', 'pss5_status',
    'sees10_rata_rata', 'sees10_status',
    'hunger_skor',
    'sesi', 'detik',
    'delta', 'theta', 'alpha', 'beta', 'gamma',
    'kualitas_terburuk_tp9', 'kualitas_terburuk_af7',
    'kualitas_terburuk_af8', 'kualitas_terburuk_tp10',
    'persen_jelek_tp9', 'persen_jelek_af7',
    'persen_jelek_af8', 'persen_jelek_tp10',
    'kualitas_diabaikan'
  ];
  const semuaBaris = [header].concat(siapkanDataCsvDetail());

  return semuaBaris.map(function (baris) {
    return baris.map(escapeNilaiCsv).join(',');
  }).join('\n');
}

function unduhCsvDetail() {
  const teksCsv = '﻿' + buatTeksCsvDetail();
  const blob = new Blob([teksCsv], { type: 'text/csv;charset=utf-8' });
  const urlSementara = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const hasil = ambilHasilKuesioner();
  const namaBersih = (hasil.peserta && hasil.peserta.nama) ? hasil.peserta.nama.replace(/\s+/g, '_') : 'peserta';
  link.href = urlSementara;
  link.download = 'detail_titik_waktu_' + namaBersih + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(urlSementara);
}

/* 3. Unduh Gambar Grafik Rumput (PNG dengan latar belakang putih bersih) */
function unduhGambarGrafik(prefix) {
  const hasil = ambilHasilKuesioner();
  const namaBersih = (hasil.peserta && hasil.peserta.nama) ? hasil.peserta.nama.replace(/\s+/g, '_') : 'peserta';
  const canvas = document.getElementById('eegChart-' + prefix);
  if (!canvas) return;

  // Bikin canvas sementara dengan background putih agar tidak transparan waktu dibuka
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = 'grafik_rumput_' + prefix + '_' + namaBersih + '.png';
  link.href = tempCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* 4. Unduh File Standar Medis .EDF (European Data Format) */
function unduhEdfSesi(prefix) {
  const hasil = ambilHasilKuesioner();
  const dataEeg = hasil[prefix];
  if (!dataEeg || !dataEeg.interval || dataEeg.interval.length === 0) {
    alert('Belum ada data rekaman untuk ' + prefix.toUpperCase());
    return;
  }
  const namaPeserta = (hasil.peserta && hasil.peserta.nama) ? hasil.peserta.nama : 'peserta';
  unduhEdf(namaPeserta, prefix.toUpperCase(), dataEeg.interval);
}

function unduhSemuaEdf() {
  const hasil = ambilHasilKuesioner();
  const adaEeg1 = !!(hasil.eeg1 && hasil.eeg1.interval && hasil.eeg1.interval.length > 0);
  const adaEeg2 = !!(hasil.eeg2 && hasil.eeg2.interval && hasil.eeg2.interval.length > 0);

  if (!adaEeg1 && !adaEeg2) {
    alert('Belum ada data rekaman EEG.');
    return;
  }

  if (adaEeg1) unduhEdfSesi('eeg1');
  if (adaEeg2) {
    setTimeout(function () {
      unduhEdfSesi('eeg2');
    }, 600);
  }
}

// Atur tombol aksi (enable/disable jika belum ada data)
function aturTombolUnduh() {
  const hasil = ambilHasilKuesioner();
  const adaEeg1 = !!(hasil.eeg1 && hasil.eeg1.interval && hasil.eeg1.interval.length > 0);
  const adaEeg2 = !!(hasil.eeg2 && hasil.eeg2.interval && hasil.eeg2.interval.length > 0);
  const adaDataEeg = adaEeg1 || adaEeg2;

  const ringkasBtn = document.getElementById('downloadCsvRingkasBtn');
  const detailBtn = document.getElementById('downloadCsvDetailBtn');
  const edfAllBtn = document.getElementById('downloadEdfAllBtn');
  const pngEeg1Btn = document.getElementById('unduhPngEeg1Btn');
  const edfEeg1Btn = document.getElementById('unduhEdfEeg1Btn');
  const pngEeg2Btn = document.getElementById('unduhPngEeg2Btn');
  const edfEeg2Btn = document.getElementById('unduhEdfEeg2Btn');
  const csvKosongEl = document.getElementById('csvKosong');

  if (ringkasBtn) ringkasBtn.disabled = !adaDataEeg;
  if (detailBtn) detailBtn.disabled = !adaDataEeg;
  if (edfAllBtn) edfAllBtn.disabled = !adaDataEeg;
  if (pngEeg1Btn) pngEeg1Btn.disabled = !adaEeg1;
  if (edfEeg1Btn) edfEeg1Btn.disabled = !adaEeg1;
  if (pngEeg2Btn) pngEeg2Btn.disabled = !adaEeg2;
  if (edfEeg2Btn) edfEeg2Btn.disabled = !adaEeg2;
  if (csvKosongEl) csvKosongEl.hidden = adaDataEeg;
}

tampilkanRingkasanKuesioner();
tampilkanHasilEeg();
tampilkanRekomendasi();
aturTombolUnduh();

// Event listeners untuk semua tombol ekspor
const ringkasBtn = document.getElementById('downloadCsvRingkasBtn');
if (ringkasBtn) ringkasBtn.addEventListener('click', unduhCsvRingkasan);

const detailBtn = document.getElementById('downloadCsvDetailBtn');
if (detailBtn) detailBtn.addEventListener('click', unduhCsvDetail);

const edfAllBtn = document.getElementById('downloadEdfAllBtn');
if (edfAllBtn) edfAllBtn.addEventListener('click', unduhSemuaEdf);

const pngEeg1Btn = document.getElementById('unduhPngEeg1Btn');
if (pngEeg1Btn) pngEeg1Btn.addEventListener('click', function () { unduhGambarGrafik('eeg1'); });

const edfEeg1Btn = document.getElementById('unduhEdfEeg1Btn');
if (edfEeg1Btn) edfEeg1Btn.addEventListener('click', function () { unduhEdfSesi('eeg1'); });

const pngEeg2Btn = document.getElementById('unduhPngEeg2Btn');
if (pngEeg2Btn) pngEeg2Btn.addEventListener('click', function () { unduhGambarGrafik('eeg2'); });

const edfEeg2Btn = document.getElementById('unduhEdfEeg2Btn');
if (edfEeg2Btn) edfEeg2Btn.addEventListener('click', function () { unduhEdfSesi('eeg2'); });

/* ===== Tombol "Mulai Sesi Baru" ===== */
const mulaiLagiBtn = document.getElementById('mulaiLagiBtn');
if (mulaiLagiBtn) {
  mulaiLagiBtn.addEventListener('click', function () {
    const yakin = confirm('Yakin mau mulai sesi baru? Semua hasil kuesioner & EEG saat ini akan dihapus.');
    if (!yakin) return;

    localStorage.removeItem(KUESIONER_STORAGE_KEY);
    window.location.href = '../index.html';
  });
}
