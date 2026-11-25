/* SIKOLAB BK v1.15 — js/pages/32_pindai.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Pindai Hadir — petugas piket memindai kartu QR murid di gerbang
//  - Nama tampil seketika dari daftar kartu di perangkat (tanpa menunggu server).
//  - Hasil pindai masuk antrean di perangkat dan dikirim bertahap; aman saat sinyal putus.
// ════════════════════════════════════════════════════════════
const PND = { d: null, map: {}, sudah: {}, q: [], last: {}, recent: [], sending: false, online: true, timer: null, cam: null, mode: '', wake: null,
  berhenti: function () { pndKameraStop(); clearInterval(PND.timer); PND.timer = null; if (PND.wake) { try { PND.wake.release(); } catch (e) { } PND.wake = null; } } };
function pndQKey() { return 'sk_pq_' + (S.user ? S.user.email : ''); }
function pndSimpanQ() { lstore(pndQKey(), JSON.stringify(PND.q)); }
PAGES.pindai = function (params, tok) {
  try { PND.q = JSON.parse(lstore(pndQKey()) || '[]') || []; } catch (e) { PND.q = []; }
  // Daftar kartu hari ini dari perangkat (bila ada) → halaman tampil seketika, lalu diperbarui diam-diam dari server.
  let c = null; try { c = JSON.parse(lstore('sk_pnd') || 'null'); } catch (x) { c = null; }
  const simpanan = c && c.hariIni === ymd(new Date()) && c.murid ? c : null;
  const mulai = function (d) {
    PND.d = d; PND.map = {}; PND.sudah = d.sudah || {}; PND.recent = PND.recent.filter(function (x) { return x.tgl === d.hariIni; });
    d.murid.forEach(function (m) { PND.map[m.k] = m; });
    pndGambar();
    clearInterval(PND.timer); PND.timer = setInterval(pndKirim, 2500);
    pndKirim();
    if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (w) { PND.wake = w; }).catch(function () { });
  };
  const segar = api('pindai.siap', {}, !!simpanan).then(function (d) {
    lstore('sk_pnd', JSON.stringify(d));
    return d;
  });
  if (simpanan) {
    if (stale(tok)) return Promise.resolve();
    mulai(simpanan);
    segar.then(function (d) {
      if (stale(tok) || S.page !== 'pindai' || !PND.d) return;
      const ubahTampilan = d.libur !== PND.d.libur || d.jamMasuk !== PND.d.jamMasuk;
      // Tanda yang dicatat di perangkat tetap dipakai; data server melengkapinya.
      const sudah = Object.assign({}, PND.sudah, d.sudah || {});
      PND.d = d; PND.map = {}; PND.sudah = sudah; d.sudah = sudah;
      d.murid.forEach(function (m) { PND.map[m.k] = m; });
      if (ubahTampilan && PND.mode !== 'kamera') pndGambar(); else pndStat();
    }).catch(function () { PND.online = false; });
    return Promise.resolve();
  }
  return segar.catch(function (e) {
    // Sinyal putus: pakai daftar kartu terakhir di perangkat bila masih hari yang sama.
    if (c && c.hariIni === ymd(new Date())) { toast('Sedang luring: memakai daftar kartu tersimpan. Hasil pindai dikirim saat sinyal kembali.', 'warn'); PND.online = false; return c; }
    throw e;
  }).then(function (d) {
    if (stale(tok)) return;
    mulai(d);
  });
};
function pndGambar() {
  const d = PND.d;
  const kartu = hasAny(['admin', 'guru_bk', 'waka']);
  let h = pageHead('Absensi digital', 'Pindai Hadir', 'Arahkan kartu QR murid ke pemindai atau kamera. Hadir/Terlambat ditentukan otomatis dari batas jam masuk ' + d.jamMasuk + '.',
    (kartu ? '<button class="btn" data-act="kartu-modal"><i class="bi bi-qr-code"></i> Cetak kartu</button>' : '') + '<button class="btn" data-act="pnd-daftar"><i class="bi bi-list-check"></i> Daftar hadir</button>');
  if (d.libur) h += '<div class="note rose mb-16"><i class="bi bi-calendar-heart"></i><div><b>Hari ini libur: ' + esc(d.libur) + '.</b> Pemindaian tidak dicatat.</div></div>';
  h += '<div class="pnd-grid"><div class="col gap-16">' +
    '<div class="pnd-hasil" id="pnd-hasil"><div class="pnd-ic"><i class="bi bi-qr-code-scan"></i></div><div><div class="pnd-nama">Siap memindai</div><div class="pnd-ket">Tunjukkan kartu ke pemindai</div></div></div>' +
    '<div class="card pad"><div class="seg-lg" id="pnd-mode"><button type="button" data-act="pnd-mode" data-m="alat" class="on"><i class="bi bi-upc-scan"></i> Pemindai / ketik kode</button><button type="button" data-act="pnd-mode" data-m="kamera"><i class="bi bi-camera"></i> Kamera</button></div>' +
    '<div id="pnd-alat" class="mt-12"><input class="input pnd-input" id="pnd-in" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Pindai kartu di sini…" aria-label="Kode kartu"><div class="hint mt-8">Pemindai USB/Bluetooth bekerja seperti papan ketik: arahkan ke kartu, kode terisi lalu tercatat otomatis.</div></div>' +
    '<div id="pnd-kam" class="mt-12 hide"><div class="pnd-video"><video id="pnd-video" playsinline muted></video><div class="pnd-bingkai"></div></div><div class="hint mt-8" id="pnd-kam-ket">Izinkan akses kamera bila diminta.</div></div>' +
    '<div class="field mt-12"><label for="pnd-cari">Kartu tertinggal? Cari nama murid</label><input class="input" id="pnd-cari" type="search" autocomplete="off" placeholder="Ketik minimal 3 huruf…"><div id="pnd-cari-hasil"></div></div></div></div>' +
    '<div class="col gap-16"><div class="card pad"><div class="row between"><h3>Hari ini</h3><span class="chip neutral" id="pnd-sinyal"></span></div><div class="pnd-stat mt-12" id="pnd-stat"></div></div>' +
    '<div class="card"><div class="card-head"><h3>Pindaian terakhir</h3></div><div id="pnd-recent" class="card-body" style="padding-top:0"></div></div></div></div>';
  $('#app-container').innerHTML = h;
  const inp = $('#pnd-in');
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); const v = inp.value; inp.value = ''; pndPindai(v); } });
  inp.addEventListener('blur', function () { setTimeout(function () { if (S.page === 'pindai' && PND.mode !== 'kamera' && !OV.length && (document.activeElement === document.body || !document.activeElement)) { try { inp.focus(); } catch (x) { } } }, 250); });
  $('#pnd-cari').addEventListener('input', debounce(pndCari, 150));
  PND.mode = 'alat';
  setTimeout(function () { try { inp.focus(); } catch (x) { } }, 80);
  pndStat(); pndRecent();
}
function pndCari() {
  const q = ($('#pnd-cari').value || '').trim().toLowerCase(), box = $('#pnd-cari-hasil');
  if (q.length < 3) { box.innerHTML = ''; return; }
  const hasil = PND.d.murid.filter(function (m) { return m.n.toLowerCase().indexOf(q) >= 0 || String(m.s).indexOf(q) >= 0; }).slice(0, 6);
  box.innerHTML = hasil.length ? '<div class="col gap-8 mt-8">' + hasil.map(function (m) { const s = PND.sudah[m.i]; return '<button class="pick-row" data-act="pnd-pilih" data-k="' + esc(m.k) + '"><div class="grow"><b>' + esc(m.n) + '</b><div class="xs muted">' + esc(m.c) + ' · NIS ' + esc(m.s) + '</div></div>' + (s ? chipAbs(s.s) : '<span class="chip blue">Catat</span>') + '</button>'; }).join('') + '</div>' : '<div class="xs muted mt-8">Tidak ditemukan.</div>';
}
ACT['pnd-pilih'] = function (el) { pndPindai(el.dataset.k, true); $('#pnd-cari').value = ''; $('#pnd-cari-hasil').innerHTML = ''; };
ACT['pnd-daftar'] = function () { navigateTo('absensi', { tab: 'daftar' }); };
ACT['pnd-mode'] = function (el) {
  const m = el.dataset.m;
  $$('#pnd-mode button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
  PND.mode = m;
  show('#pnd-alat', m === 'alat'); show('#pnd-kam', m === 'kamera');
  if (m === 'kamera') pndKameraMulai(); else { pndKameraStop(); setTimeout(function () { const i = $('#pnd-in'); if (i) i.focus(); }, 50); }
};
/** Proses satu kode (dari pemindai, kamera, atau pencarian nama). */
function pndPindai(raw, manual) {
  const d = PND.d; if (!d) return;
  const k = normKode(raw); if (!k) return;
  const now = Date.now();
  if (!manual && PND.last[k] && now - PND.last[k] < 4000) return; // kamera membaca kartu yang sama berulang
  PND.last[k] = now;
  const m = PND.map[k];
  if (!m) { pndTampil({ ok: false, nama: 'Kartu tidak dikenal', ket: 'Kode ' + k + '. Kartu mungkin sudah diganti; gunakan pencarian nama.' }); pndBunyi('gagal'); return; }
  if (d.libur) { pndTampil({ ok: false, nama: m.n, ket: 'Hari libur: ' + d.libur + '. Tidak dicatat.' }); pndBunyi('gagal'); return; }
  const s = PND.sudah[m.i];
  if (s && !(s.s === 'A' && !s.q)) { pndTampil({ ok: true, dup: true, nama: m.n, ket: m.c + ' · sudah tercatat ' + (ST_NAMA[s.s] || s.s) + (s.j ? ' pukul ' + s.j : '') }); pndBunyi('dup'); return; }
  const jam = hhmm(now), st = jam > d.jamMasuk ? 'T' : 'H';
  PND.sudah[m.i] = { s: st, j: jam, q: 1, tunggu: 1 };
  PND.q.push({ k: k, t: now }); pndSimpanQ();
  PND.recent.unshift({ tgl: d.hariIni, k: k, nama: m.n, kelas: m.c, st: st, j: jam, tunggu: true });
  PND.recent = PND.recent.slice(0, 30);
  pndTampil({ ok: true, st: st, nama: m.n, ket: m.c + ' · ' + (st === 'T' ? 'Terlambat' : 'Hadir') + ' pukul ' + jam });
  pndBunyi(st);
  pndStat(); pndRecent();
  setTimeout(pndKirim, 600);
}
function pndTampil(o) {
  const el = $('#pnd-hasil'); if (!el) return;
  const cls = !o.ok ? 'gagal' : o.dup ? 'dup' : o.st === 'T' ? 'telat' : 'ok';
  const ic = !o.ok ? 'bi-x-octagon' : o.dup ? 'bi-check2-all' : o.st === 'T' ? 'bi-clock' : 'bi-check-circle-fill';
  el.className = 'pnd-hasil ' + cls;
  el.innerHTML = '<div class="pnd-ic"><i class="bi ' + ic + '"></i></div><div class="grow" style="min-width:0"><div class="pnd-nama">' + esc(o.nama) + '</div><div class="pnd-ket">' + esc(o.ket || '') + '</div></div>';
}
let PND_AC = null;
function pndBunyi(jenis) {
  try {
    if (navigator.vibrate) navigator.vibrate(jenis === 'gagal' ? [80, 60, 80] : 60);
    PND_AC = PND_AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = PND_AC.createOscillator(), g = PND_AC.createGain();
    o.frequency.value = jenis === 'gagal' ? 220 : jenis === 'dup' ? 520 : jenis === 'T' ? 700 : 940;
    g.gain.value = 0.08; o.connect(g); g.connect(PND_AC.destination);
    o.start(); o.stop(PND_AC.currentTime + (jenis === 'gagal' ? 0.35 : 0.12));
  } catch (e) { /* tanpa suara */ }
}
function pndStat() {
  const el = $('#pnd-stat'); if (!el || !PND.d) return;
  const c = { H: 0, T: 0, lain: 0 }, ids = Object.keys(PND.sudah);
  ids.forEach(function (i) { const s = PND.sudah[i].s; if (s === 'H') c.H++; else if (s === 'T') c.T++; else c.lain++; });
  const n = PND.d.murid.length;
  el.innerHTML = '<div><b>' + ids.length + '</b><span>dari ' + n + ' murid tercatat</span></div><div><b style="color:var(--teal)">' + c.H + '</b><span>hadir tepat waktu</span></div><div><b style="color:#D97706">' + c.T + '</b><span>terlambat</span></div><div><b>' + c.lain + '</b><span>izin/sakit/alpa (wali kelas)</span></div>' +
    '<div class="bar mt-8" style="grid-column:1/-1"><i style="width:' + (n ? Math.round(ids.length * 100 / n) : 0) + '%"></i></div>';
  const sg = $('#pnd-sinyal');
  if (sg) sg.innerHTML = PND.q.length ? (PND.online ? '<i class="bi bi-cloud-arrow-up"></i> Mengirim ' + PND.q.length : '<i class="bi bi-cloud-slash"></i> Luring · ' + PND.q.length + ' menunggu') : '<i class="bi bi-cloud-check"></i> Tersimpan';
}
function pndRecent() {
  const el = $('#pnd-recent'); if (!el) return;
  el.innerHTML = PND.recent.length ? '<div class="col">' + PND.recent.slice(0, 15).map(function (x) {
    return '<div class="pnd-r"><div class="grow" style="min-width:0"><div class="fw6 trunc">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.kelas) + ' · ' + esc(x.j) + (x.pesan ? ' · ' + esc(x.pesan) : '') + '</div></div>' + (x.gagal ? '<span class="chip ab-A">Gagal</span>' : chipAbs(x.st)) + (x.tunggu ? '<i class="bi bi-cloud-arrow-up muted" title="Menunggu terkirim"></i>' : '') + '</div>';
  }).join('') + '</div>' : empty('bi-qr-code-scan', 'Belum ada pindaian');
}
/** Kirim antrean ke server (bertahap, maks. 100 per kiriman). */
function pndKirim() {
  if (PND.sending || !PND.q.length) { pndStat(); return; }
  PND.sending = true;
  const batch = PND.q.slice(0, 100);
  api('pindai.kirim', { scan: batch }).then(function (r) {
    PND.q.splice(0, batch.length); pndSimpanQ(); PND.online = true;
    (r.hasil || []).forEach(function (h) {
      const rc = PND.recent.filter(function (x) { return x.k === h.k && x.tunggu; })[0];
      if (rc) rc.tunggu = false;
      if (!h.ok) {
        if (rc) { rc.gagal = true; rc.pesan = h.pesan; }
        if (h.id && PND.sudah[h.id] && PND.sudah[h.id].tunggu) delete PND.sudah[h.id];
        toast((h.nama ? h.nama + ': ' : '') + h.pesan, 'err');
      } else if (h.id) {
        PND.sudah[h.id] = { s: h.st, j: h.j, q: 1 };
        if (rc && rc.st !== h.st) { rc.st = h.st; rc.pesan = h.pesan || ''; }
      }
    });
  }).catch(function (e) {
    const sementara = /koneksi|sibuk|jaringan|timeout|server/i.test(e.message || '');
    if (sementara) { PND.online = false; return; }
    // Kesalahan tetap (mis. QR dimatikan admin): buang kiriman ini agar antrean tidak macet.
    PND.q.splice(0, batch.length); pndSimpanQ();
    toast(e.message, 'err');
  }).then(function () {
    PND.sending = false;
    if (S.page === 'pindai') { pndStat(); pndRecent(); }
    if (PND.q.length && PND.online) setTimeout(pndKirim, 300);
  });
}
// ── Kamera: BarcodeDetector bawaan peramban; bila tidak ada, pustaka jsQR dimuat sekali dari CDN ──
function muatSkrip(src) {
  return new Promise(function (ok, gagal) { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { gagal(new Error('Gagal memuat pustaka pemindai.')); }; document.head.appendChild(s); });
}
function pndKameraMulai() {
  const ket = $('#pnd-kam-ket'), v = $('#pnd-video');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { ket.textContent = 'Peramban ini tidak mendukung kamera. Gunakan pemindai USB atau buka di Chrome terbaru.'; return; }
  pndKameraStop();
  // Coba kamera belakang dulu; bila gagal (mis. webcam laptop tidak mendukung pengaturan itu), coba pengaturan paling sederhana.
  const buka = function () {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .catch(function (e1) { if (e1 && e1.name === 'NotAllowedError') throw e1; return navigator.mediaDevices.getUserMedia({ video: true, audio: false }); });
  };
  ket.textContent = 'Membuka kamera…';
  buka().then(function (stream) {
    PND.cam = { stream: stream, aktif: true };
    v.srcObject = stream; v.play().catch(function () { });
    let detektor = null;
    const pakaiJsQR = function () {
      ket.textContent = 'Menyiapkan pemindai…';
      return (window.jsQR ? Promise.resolve() : muatSkrip('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js')).then(function () { ket.textContent = 'Arahkan kartu ke dalam bingkai.'; });
    };
    const siap = ('BarcodeDetector' in window) ? window.BarcodeDetector.getSupportedFormats().then(function (f) {
      if (f.indexOf('qr_code') >= 0) { detektor = new window.BarcodeDetector({ formats: ['qr_code'] }); ket.textContent = 'Arahkan kartu ke dalam bingkai.'; return; }
      return pakaiJsQR();
    }).catch(pakaiJsQR) : pakaiJsQR();
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    const loop = function () {
      if (!PND.cam || !PND.cam.aktif || S.page !== 'pindai') return;
      if (v.readyState >= 2) {
        if (detektor) {
          detektor.detect(v).then(function (r) { if (r && r.length) pndPindai(r[0].rawValue); }).catch(function () { }).then(function () { setTimeout(loop, 220); });
          return;
        }
        if (window.jsQR) {
          const w = 480, hgt = Math.round(v.videoHeight * w / (v.videoWidth || w)) || 360;
          cv.width = w; cv.height = hgt; cx.drawImage(v, 0, 0, w, hgt);
          const r = window.jsQR(cx.getImageData(0, 0, w, hgt).data, w, hgt, { inversionAttempts: 'dontInvert' });
          if (r && r.data) pndPindai(r.data);
        }
      }
      setTimeout(loop, 220);
    };
    siap.then(loop).catch(function (e) { ket.textContent = e.message + ' Gunakan pemindai USB.'; });
  }).catch(function (e) {
    const n = (e && e.name) || '', alasan = {
      NotAllowedError: 'Izin kamera ditolak, atau kamera diblokir oleh bingkai halaman (mis. saat disematkan di Blogger tanpa allow="camera"). Ketuk ikon gembok di kiri alamat → Kamera → Izinkan, lalu muat ulang.',
      NotReadableError: 'Kamera sedang dipakai aplikasi lain (Zoom, Meet, WhatsApp, aplikasi kamera) atau tab lain. Tutup aplikasi/tab tersebut, lalu coba lagi.',
      TrackStartError: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi/tab tersebut, lalu coba lagi.',
      NotFoundError: 'Kamera tidak ditemukan. Pastikan webcam terpasang dan tidak dimatikan (tombol/penutup kamera, atau Pengaturan Windows → Privasi → Kamera).',
      SecurityError: 'Peramban memblokir kamera pada halaman ini. Buka alamat /exec langsung di Chrome.',
      OverconstrainedError: 'Pengaturan kamera tidak didukung perangkat ini.'
    }[n] || 'Penyebab tidak dikenal.';
    ket.innerHTML = '<b>Kamera tidak dapat dibuka.</b> ' + esc(alasan) + '<br><span class="xs muted">Kode teknis: ' + esc(n || '-') + (e && e.message ? ' — ' + esc(e.message) : '') + '</span><br><button type="button" class="btn sm mt-8" data-act="pnd-mode" data-m="kamera"><i class="bi bi-arrow-repeat"></i> Coba lagi</button> <span class="xs muted">Sementara itu, gunakan pemindai USB/Bluetooth atau pencarian nama.</span>';
  });
}
function pndKameraStop() {
  if (PND.cam && PND.cam.stream) PND.cam.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { } });
  PND.cam = null;
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && S.page === 'pindai') pndKirim(); });
window.addEventListener('online', function () { PND.online = true; if (S.page === 'pindai') pndKirim(); });
