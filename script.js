/* Koneksi langsung ke Muse via Web Bluetooth GATT — protokol yang sama dipakai
   di halaman Health ScentraVN-Serenity (js/eeg-muse.js). Library MuseJS versi
   CDN yang dipakai sebelumnya tidak bisa decode paket Muse S Gen 2 (Athena)
   dengan benar (EEG kosong, battery selalu '-'), jadi kita bicara langsung ke
   headset lewat UUID service/characteristic aslinya. Data ditampilkan sebagai
   band power (Delta/Theta/Alpha/Beta/Gamma) dari FFT, persis seperti kartu EEG
   di halaman Health ScentraVN-Serenity, bukan angka mentah per-channel lagi. */

var MUSE_SERVICE = '0000fe8d-0000-1000-8000-00805f9b34fb';
var MUSE_CHAR = {
  control: '273e0001-4c4d-454d-96be-f03bac821358',
  tp9:     '273e0003-4c4d-454d-96be-f03bac821358',
  af7:     '273e0004-4c4d-454d-96be-f03bac821358',
  af8:     '273e0005-4c4d-454d-96be-f03bac821358',
  tp10:    '273e0006-4c4d-454d-96be-f03bac821358',
  battery: '273e000b-4c4d-454d-96be-f03bac821358'
};

// Standard BLE Battery Service (0x180F / 0x2A19) — kalau tersedia, ini persentase
// paling akurat (sama seperti app Muse resmi). Kalau tidak ada, fallback ke reply
// status control-channel ("bp"), lalu ke telemetry proprietary (273e000b).
var BATTERY_SERVICE = 0x180f;
var BATTERY_LEVEL_CHAR = 0x2a19;

var PRESET_GEN2 = 'p1035';     // Muse S Gen 2 (Athena): EEG + PPG + IMU
var ADC_MIDPOINT = 2048;       // pusat 12-bit unsigned (0..4095)
var UV_PER_UNIT = 0.48828125;  // 1 unit ADC -> microvolt
var SAMPLES_PER_PACKET = 12;

var MUSE_SAMPLE_RATE = 256;    // Hz
var FFT_SIZE = 256;            // ~1 detik per window analisis

// Definisi pita gelombang otak (Hz) — sama seperti kartu EEG di health.js ScentraVN-Serenity
var BAND_DEFS = [
  { key: 'delta', color: '#3b82f6', range: [0.5, 4] },
  { key: 'theta', color: '#8b5cf6', range: [4, 8] },
  { key: 'alpha', color: '#10b981', range: [8, 13] },
  { key: 'beta',  color: '#f59e0b', range: [13, 30] },
  { key: 'gamma', color: '#ef4444', range: [30, 100] }
];

var connectBtn = document.getElementById('connectBtn');
var statusEl = document.getElementById('status');
var batteryEl = document.getElementById('battery');
var canvas = document.getElementById('eegChart');
var ctx = canvas.getContext('2d');

var MAX_BAND_POINTS = 60;   // jumlah titik riwayat untuk grafik (sama seperti ScentraVN)

// Buffer sample mentah per channel (dipakai untuk FFT, bukan ditampilkan langsung)
var buffers = { tp9: [], af7: [], af8: [], tp10: [] };

// Riwayat band power untuk grafik garis
var bandHistory = {};
BAND_DEFS.forEach(function (b) { bandHistory[b.key] = []; });

var eegPacketCount = 0;

var device = null;
var server = null;
var service = null;
var controlChar = null;
var isConnected = false;

var stdBatteryChar = null;
var stdBatteryAvailable = false;
var ctrlBatteryReceived = false;
var ctrlBuf = '';
var battPollTimer = null;

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function setBattery(pct) {
  batteryEl.textContent = 'Battery: ' + Math.round(pct) + '%';
}

// Perintah ke Muse dikirim sebagai [panjang][teks perintah + '\n'] lewat control characteristic
async function sendCommand(cmd) {
  if (!controlChar) return;
  var encoded = new TextEncoder().encode(cmd + '\n');
  var packet = new Uint8Array(encoded.length + 1);
  packet[0] = encoded.length;
  packet.set(encoded, 1);
  await controlChar.writeValue(packet);
}

// Reply JSON dari perintah 's' (status) membawa field "bp" = persentase baterai langsung
function onControlReply(dataView) {
  try {
    var len = dataView.getUint8(0);
    var s = '';
    for (var i = 1; i <= len && i < dataView.byteLength; i++) {
      s += String.fromCharCode(dataView.getUint8(i));
    }
    ctrlBuf += s;
    if (ctrlBuf.indexOf('}') !== -1) {
      if (!stdBatteryAvailable) {
        var m = ctrlBuf.match(/"bp"\s*:\s*([\d.]+)/);
        if (m) {
          var pct = Math.max(0, Math.min(100, parseFloat(m[1])));
          if (isFinite(pct)) {
            ctrlBatteryReceived = true;
            setBattery(pct);
          }
        }
      }
      ctrlBuf = '';
    }
  } catch (e) { /* abaikan reply yang tidak lengkap */ }
}

// Fallback battery telemetry proprietary: offset 2 = raw uint16, raw/512 = persen
function applyPropBattery(dv) {
  if (!dv || dv.byteLength < 6) return;
  var raw = dv.getUint16(2, false);
  var pct = raw / 512;
  if (!isFinite(pct) || pct < 0) return;
  setBattery(Math.max(0, Math.min(100, pct)));
}

/* ── FFT & band power (port dari js/eeg-muse.js ScentraVN-Serenity) ──────── */

function fft(re, im, N) {
  var j = 0;
  for (var i = 1; i < N; i++) {
    var bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      var tr = re[i]; re[i] = re[j]; re[j] = tr;
      var ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (var len = 2; len <= N; len <<= 1) {
    var ang = -2 * Math.PI / len;
    var wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (var start = 0; start < N; start += len) {
      var curRe = 1, curIm = 0;
      for (var k = 0; k < len / 2; k++) {
        var uRe = re[start + k], uIm = im[start + k];
        var vRe = re[start + k + len / 2] * curRe - im[start + k + len / 2] * curIm;
        var vIm = re[start + k + len / 2] * curIm + im[start + k + len / 2] * curRe;
        re[start + k]           = uRe + vRe;
        im[start + k]           = uIm + vIm;
        re[start + k + len / 2] = uRe - vRe;
        im[start + k + len / 2] = uIm - vIm;
        var tmp = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = tmp;
      }
    }
  }
}

// Hann-window PSD lalu integrasi per pita -> daya absolut (uV^2) per band
function bandPowers(samples) {
  var N = samples.length;
  var mean = samples.reduce(function (a, s) { return a + s; }, 0) / N;
  var re = new Float64Array(N);
  var im = new Float64Array(N);
  var U = 0;
  for (var n = 0; n < N; n++) {
    var w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1));
    re[n] = (samples[n] - mean) * w;
    U += w * w;
  }
  fft(re, im, N);

  var freqRes = MUSE_SAMPLE_RATE / N;
  var half = N >> 1;
  var norm = 2 / (MUSE_SAMPLE_RATE * U);
  var psd = new Float64Array(half);
  for (var k = 1; k < half; k++) {
    psd[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
  }

  var powers = {};
  BAND_DEFS.forEach(function (b) {
    var lo = b.range[0], hi = b.range[1];
    var p = 0;
    for (var kk = Math.ceil(lo / freqRes); kk <= Math.floor(hi / freqRes) && kk < half; kk++) {
      p += psd[kk] * freqRes;
    }
    powers[b.key] = p;
  });
  return powers;
}

function meanPowers(a, b) {
  var out = {};
  BAND_DEFS.forEach(function (bd) {
    out[bd.key] = ((a[bd.key] || 0) + (b[bd.key] || 0)) / 2;
  });
  return out;
}

function fmtBandPower(v) {
  if (v == null || !isFinite(v)) return '-';
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

// Update kartu Delta/Theta/Alpha/Beta/Gamma + bar + riwayat grafik
function updateBands(powers) {
  var max = 1e-9;
  BAND_DEFS.forEach(function (b) { if (powers[b.key] > max) max = powers[b.key]; });

  BAND_DEFS.forEach(function (b) {
    var val = powers[b.key];
    var valEl = document.getElementById('band-' + b.key);
    if (valEl) valEl.textContent = fmtBandPower(val);
    var barEl = document.getElementById('bar-' + b.key);
    if (barEl) barEl.style.width = Math.min(100, (val / max) * 100) + '%';

    var hist = bandHistory[b.key];
    hist.push(val);
    if (hist.length > MAX_BAND_POINTS) hist.shift();
  });
}

function resetBandsUI() {
  BAND_DEFS.forEach(function (b) {
    var valEl = document.getElementById('band-' + b.key);
    if (valEl) valEl.textContent = '-';
    var barEl = document.getElementById('bar-' + b.key);
    if (barEl) barEl.style.width = '0%';
    bandHistory[b.key] = [];
  });
}

/* ── Decode paket EEG & pemicu perhitungan band power ────────────────────── */

// Paket EEG 20-byte: [0-1] index sample, [2-19] 12 sample x 12-bit unsigned (big-endian)
function onEEGPacket(key, dataView) {
  var buf = buffers[key];
  var fits = Math.max(0, Math.floor(((dataView.byteLength - 2) * 8) / 12));
  var count = Math.min(SAMPLES_PER_PACKET, fits);

  for (var i = 0; i < count; i++) {
    var bitIndex = i * 12;
    var byteOffset = 2 + (bitIndex >> 3);
    var bitOffset = bitIndex & 7;
    var word = (dataView.getUint8(byteOffset) << 8) | dataView.getUint8(byteOffset + 1);
    var raw12 = (word >> (4 - bitOffset)) & 0x0fff;
    var uv = (raw12 - ADC_MIDPOINT) * UV_PER_UNIT;
    buf.push(uv);
  }
  if (buf.length > FFT_SIZE * 2) buf.splice(0, buf.length - FFT_SIZE * 2);

  // Hitung band power dari channel frontal AF7 (+AF8 kalau ada), tiap ~200ms
  // (persis seperti _onEEGPacket di js/eeg-muse.js ScentraVN-Serenity)
  if (key === 'af7' && buf.length >= FFT_SIZE) {
    eegPacketCount++;
    if (eegPacketCount % 8 === 0) {
      var pAF7 = bandPowers(buf.slice(-FFT_SIZE));
      var af8Buf = buffers.af8;
      var combined = pAF7;
      if (af8Buf.length >= FFT_SIZE) {
        combined = meanPowers(pAF7, bandPowers(af8Buf.slice(-FFT_SIZE)));
      }
      updateBands(combined);
    }
  }
}

/* ── Baterai ──────────────────────────────────────────────────────────── */

// Baterai kadang jarang di-notify, jadi di-poll berkala supaya angkanya tidak beku
async function pollBattery() {
  try {
    if (!isConnected || !device || !device.gatt || !device.gatt.connected) return;
    if (stdBatteryAvailable && stdBatteryChar) {
      var dv = await stdBatteryChar.readValue();
      if (dv && dv.byteLength >= 1) setBattery(dv.getUint8(0));
    } else {
      try { await sendCommand('s'); } catch (e) { /* abaikan */ }
    }
  } catch (e) { /* koneksi mungkin sedang putus */ }
}

/* ── Koneksi BLE ──────────────────────────────────────────────────────── */

async function connectMuse() {
  if (!navigator.bluetooth) {
    alert('Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome atau Edge di laptop/PC.');
    return;
  }

  connectBtn.disabled = true;
  statusEl.textContent = 'Status: menghubungkan...';

  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Muse' },
        { services: [MUSE_SERVICE] }
      ],
      optionalServices: [MUSE_SERVICE, BATTERY_SERVICE]
    });
    device.addEventListener('gattserverdisconnected', onDisconnected);

    server = await device.gatt.connect();
    service = await server.getPrimaryService(MUSE_SERVICE);

    // Control characteristic dulu — Muse S Gen 2 (Athena) perlu di-halt sebelum ganti preset
    controlChar = await service.getCharacteristic(MUSE_CHAR.control);
    try {
      await controlChar.startNotifications();
      controlChar.addEventListener('characteristicvaluechanged', function (e) {
        onControlReply(e.target.value);
      });
    } catch (e) { /* notify control opsional */ }

    await sendCommand('h');   // halt streaming lama sebelum mulai yang baru
    await delay(200);

    // Subscribe ke 4 channel EEG mentah (dipakai sebagai input FFT band power)
    for (const key of ['tp9', 'af7', 'af8', 'tp10']) {
      const char = await service.getCharacteristic(MUSE_CHAR[key]);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', function (e) {
        onEEGPacket(key, e.target.value);
      });
    }

    // Baterai: coba BLE Battery Service standar dulu (paling akurat)
    stdBatteryAvailable = false;
    try {
      var battSvc = await server.getPrimaryService(BATTERY_SERVICE);
      stdBatteryChar = await battSvc.getCharacteristic(BATTERY_LEVEL_CHAR);
      var dv0 = await stdBatteryChar.readValue();
      if (dv0 && dv0.byteLength >= 1) setBattery(dv0.getUint8(0));
      stdBatteryAvailable = true;
      try {
        await stdBatteryChar.startNotifications();
        stdBatteryChar.addEventListener('characteristicvaluechanged', function (e) {
          if (e.target.value && e.target.value.byteLength >= 1) setBattery(e.target.value.getUint8(0));
        });
      } catch (e) { /* read-only juga tidak apa */ }
    } catch (e) {
      // Battery Service standar tidak ada -> nanti pakai reply "bp" atau telemetry proprietary
    }

    // Fallback: telemetry proprietary (dipakai hanya kalau dua sumber lain belum ada)
    try {
      var battChar = await service.getCharacteristic(MUSE_CHAR.battery);
      await battChar.startNotifications();
      battChar.addEventListener('characteristicvaluechanged', function (e) {
        if (!stdBatteryAvailable && !ctrlBatteryReceived) applyPropBattery(e.target.value);
      });
    } catch (e) { /* battery char tidak selalu ada */ }

    // Mulai streaming dengan preset Muse S Gen 2, lalu minta status (battery) dan mulai data
    await sendCommand(PRESET_GEN2);
    await sendCommand('s');
    await sendCommand('d');

    if (battPollTimer) clearInterval(battPollTimer);
    battPollTimer = setInterval(pollBattery, 30000);

    isConnected = true;
    connectBtn.disabled = false;
    connectBtn.textContent = 'Disconnect';
    statusEl.textContent = 'Status: terhubung (' + (device.name || 'Muse') + ')';
  } catch (err) {
    connectBtn.disabled = false;
    if (err && err.name === 'NotFoundError') {
      statusEl.textContent = 'Status: tidak ada perangkat Muse yang dipilih';
    } else {
      statusEl.textContent = 'Status: gagal terhubung (coba lagi)';
    }
  }
}

async function disconnectMuse() {
  try { await sendCommand('h'); } catch (e) { /* abaikan */ }
  if (device && device.gatt && device.gatt.connected) device.gatt.disconnect();
}

// Kalau headset diputus (misal dimatikan atau di luar jangkauan), balikin status di tampilan
function onDisconnected() {
  isConnected = false;
  if (battPollTimer) { clearInterval(battPollTimer); battPollTimer = null; }
  controlChar = null;
  stdBatteryChar = null;
  stdBatteryAvailable = false;
  ctrlBatteryReceived = false;
  ctrlBuf = '';
  eegPacketCount = 0;
  buffers.tp9 = []; buffers.af7 = []; buffers.af8 = []; buffers.tp10 = [];
  resetBandsUI();

  connectBtn.disabled = false;
  connectBtn.textContent = 'Connect ke Muse';
  statusEl.textContent = 'Status: terputus';
}

connectBtn.addEventListener('click', function () {
  if (isConnected) {
    disconnectMuse();
  } else {
    connectMuse();
  }
});

/* ── Grafik: 5 garis band power (Delta/Theta/Alpha/Beta/Gamma) dari waktu ke waktu ── */

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var max = 1e-9;
  BAND_DEFS.forEach(function (b) {
    bandHistory[b.key].forEach(function (v) { if (v > max) max = v; });
  });

  // Garis grid horizontal
  ctx.strokeStyle = '#eee';
  for (var g = 1; g <= 3; g++) {
    var gy = canvas.height - (canvas.height / 4) * g;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(canvas.width, gy);
    ctx.stroke();
  }

  var step = canvas.width / (MAX_BAND_POINTS - 1);
  BAND_DEFS.forEach(function (b) {
    var hist = bandHistory[b.key];
    if (!hist.length) return;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    hist.forEach(function (v, idx) {
      var x = idx * step;
      var y = canvas.height - (v / max) * (canvas.height - 10) - 5;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.lineWidth = 1;

  // Legenda
  BAND_DEFS.forEach(function (b, i) {
    var x = 10 + i * 90;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, 8, 10, 10);
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.fillText(b.key.charAt(0).toUpperCase() + b.key.slice(1), x + 14, 17);
  });
}

// Loop utama: jalan terus supaya grafik selalu update (nilai band & battery
// sudah di-update langsung dari event BLE, bukan dari sini)
function loop() {
  drawChart();
  requestAnimationFrame(loop);
}
loop();
