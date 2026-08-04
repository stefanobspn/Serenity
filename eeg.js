/* script.js — kode utama halaman ini
   Semua urusan Bluetooth, decode EEG, dan FFT sudah ditangani oleh
   library MuseSGen2 (musesgen2/script.js). Di sini kita cuma:
   1. Menyambungkan tombol Connect/Disconnect
   2. Menampilkan status & battery ke halaman
   3. Menampilkan band power ke kartu + grafik (Chart.js) */

var MAX_POINTS = 60; // jumlah titik riwayat di grafik

var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var batteryEl = document.getElementById('battery');

var muse = new MuseSGen2();

var chart = new Chart(document.getElementById('eegChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: [],
    datasets: MuseSGen2.BANDS.map(function (b) {
      return {
        label: b.label,
        data: [],
        borderColor: b.color,
        backgroundColor: b.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      };
    })
  },
  options: {
    animation: false,
    scales: {
      x: { display: false },
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12 } }
    }
  }
});

connectBtn.addEventListener('click', function () {
  if (muse.isConnected) {
    muse.disconnect();
  } else {
    muse.connect();
  }
});

muse.onStatusChange(function (text, state) {
  statusEl.textContent = 'Status: ' + text;
  connectBtn.disabled = state === 'connecting';
  connectBtn.textContent = state === 'connected' ? 'Disconnect' : 'Connect ke Muse';
});

muse.onBattery(function (pct) {
  batteryEl.textContent = 'Battery: ' + Math.round(pct) + '%';
});

muse.onBandPower(function (powers) {
  var max = 1e-9;
  MuseSGen2.BANDS.forEach(function (b) { if (powers[b.key] > max) max = powers[b.key]; });

  MuseSGen2.BANDS.forEach(function (b, i) {
    var val = powers[b.key];
    document.getElementById('band-' + b.key).textContent = MuseSGen2.formatPower(val);
    document.getElementById('bar-' + b.key).style.width = Math.min(100, (val / max) * 100) + '%';

    var data = chart.data.datasets[i].data;
    data.push(val);
    if (data.length > MAX_POINTS) data.shift();
  });

  chart.data.labels = chart.data.datasets[0].data.map(function (_, i) { return i; });
  chart.update('none');
});

muse.onReset(function () {
  MuseSGen2.BANDS.forEach(function (b) {
    document.getElementById('band-' + b.key).textContent = '-';
    document.getElementById('bar-' + b.key).style.width = '0%';
  });
  chart.data.labels = [];
  chart.data.datasets.forEach(function (ds) { ds.data = []; });
  chart.update('none');
});
