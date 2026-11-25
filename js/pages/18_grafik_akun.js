/* SIKOLAB BK v1.15 — js/pages/18_grafik_akun.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Tambahan: grafik SVG (tanpa CDN), akun saya, ganti PIN, tawaran WhatsApp
// ════════════════════════════════════════════════════════════
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function svgChartHtml(spec, W, H) {
  W = Math.max(220, W); H = Math.max(150, H);
  const T = 'var(--text-3)', G = 'var(--border)';
  const wrap = function (inner) { return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" role="img" aria-label="' + esc(spec.label || 'Grafik') + '" style="display:block">' + inner + '</svg>'; };
  const txt = function (x, y, s, anchor, extra) { return '<text x="' + x + '" y="' + y + '" fill="' + T + '" font-size="11" text-anchor="' + (anchor || 'middle') + '" ' + (extra || '') + '>' + esc(s) + '</text>'; };
  const n = (spec.labels || []).length;
  if (spec.kind === 'donut') {
    const tot = spec.data.reduce(function (a, b) { return a + b; }, 0);
    const r = Math.min(W, H) / 2 - 10, cx = W / 2, cy = H / 2, sw = r * 0.38, rr = r - sw / 2, C = 2 * Math.PI * rr;
    let off = 0, h = '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + G + '" stroke-width="' + sw + '"/>';
    if (tot > 0) spec.data.forEach(function (v, i) {
      if (!v) return;
      const len = v / tot * C;
      h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + spec.colors[i % spec.colors.length] + '" stroke-width="' + sw + '" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(spec.labels[i]) + ': ' + v + '</title></circle>';
      off += len;
    });
    h += '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text)" font-family="var(--font-h)">' + tot + '</text>' + txt(cx, cy + 18, spec.sub || 'total');
    return wrap(h);
  }
  if (spec.kind === 'hbar') {
    const mx = niceMax(Math.max.apply(null, spec.data.concat([1])));
    const lw = Math.min(150, Math.max.apply(null, spec.labels.map(function (l) { return String(l).length; }).concat([4])) * 6.2 + 8);
    const top = 6, rowH = Math.min(34, (H - top - 22) / Math.max(1, n)), bw = rowH * 0.58, x0 = lw, x1 = W - 34;
    let h = '';
    for (let t = 0; t <= 4; t++) { const x = x0 + (x1 - x0) * t / 4; h += '<line x1="' + x + '" x2="' + x + '" y1="' + top + '" y2="' + (top + rowH * n) + '" stroke="' + G + '"/>' + txt(x, top + rowH * n + 14, Math.round(mx * t / 4)); }
    spec.data.forEach(function (v, i) {
      const y = top + i * rowH + (rowH - bw) / 2, w = (x1 - x0) * v / mx;
      h += txt(lw - 6, y + bw / 2 + 4, String(spec.labels[i]).length > 22 ? String(spec.labels[i]).substr(0, 21) + '…' : spec.labels[i], 'end') +
        '<rect x="' + x0 + '" y="' + y + '" width="' + Math.max(w, v ? 2 : 0) + '" height="' + bw + '" rx="4" fill="' + spec.colors[i % spec.colors.length] + '"><title>' + esc(spec.labels[i]) + ': ' + v + '</title></rect>' + txt(x0 + w + 5, y + bw / 2 + 4, v, 'start', 'font-weight="700"');
    });
    return wrap(h);
  }
  // sumbu kartesius: stack | bar | line
  const L = 34, R = 10, Tp = 10, B = 26, pw = W - L - R, ph = H - Tp - B;
  const series = spec.kind === 'line' ? [{ data: spec.data, color: spec.color }] : (spec.kind === 'bar' ? [{ data: spec.data, color: spec.color }] : spec.series);
  let mx = 1;
  if (spec.kind === 'stack') for (let i = 0; i < n; i++) mx = Math.max(mx, series.reduce(function (a, s) { return a + (s.data[i] || 0); }, 0));
  else series.forEach(function (s) { s.data.forEach(function (v) { if (v !== null && v !== undefined && v > mx) mx = v; }); });
  const top = spec.max !== undefined ? spec.max : niceMax(mx), bot = spec.min !== undefined ? spec.min : 0;
  const Y = function (v) { return Tp + ph - (v - bot) / (top - bot) * ph; };
  let h = '';
  for (let t = 0; t <= 4; t++) { const v = bot + (top - bot) * t / 4, y = Y(v); h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="' + G + '"/>' + txt(L - 6, y + 4, Math.round(v * 10) / 10, 'end'); }
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 52))));
  const slot = pw / Math.max(1, n);
  if (spec.kind === 'line') {
    const pts = spec.data.map(function (v, i) { return v === null || v === undefined ? null : [L + slot * (i + 0.5), Y(v), v]; });
    let d = '', started = false, area = '', seg = [];
    const flush = function () { if (seg.length > 1) { area += '<path d="M' + seg[0][0] + ' ' + Y(bot) + ' ' + seg.map(function (p) { return 'L' + p[0] + ' ' + p[1]; }).join(' ') + ' L' + seg[seg.length - 1][0] + ' ' + Y(bot) + 'Z" fill="' + spec.color + '" opacity=".14"/>'; } seg = []; };
    pts.forEach(function (p) { if (!p) { flush(); started = false; return; } d += (started ? 'L' : 'M') + p[0] + ' ' + p[1] + ' '; started = true; seg.push(p); });
    flush();
    h += area + '<path d="' + d + '" fill="none" stroke="' + spec.color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function (p, i) { if (p) h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + spec.color + '"><title>' + esc(spec.labels[i]) + ': ' + p[2] + '</title></circle>'; });
  } else {
    const bw = Math.min(40, slot * 0.64);
    for (let i = 0; i < n; i++) {
      const cx = L + slot * (i + 0.5);
      let acc = 0;
      series.forEach(function (s, si) {
        const v = s.data[i] || 0; if (!v) return;
        const y0 = Y(acc), y1 = Y(acc + v); acc += v;
        h += '<rect x="' + (cx - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(0, y0 - y1) + '" rx="' + (spec.kind === 'stack' ? 2 : 4) + '" fill="' + (s.color || spec.color) + '"><title>' + esc((s.name ? s.name + ' · ' : '') + spec.labels[i] + ': ' + v) + '</title></rect>';
      });
    }
  }
  for (let i = 0; i < n; i += step) h += txt(L + slot * (i + 0.5), H - 8, String(spec.labels[i]).length > 9 ? String(spec.labels[i]).substr(0, 8) + '…' : spec.labels[i]);
  return wrap(h);
}
function killCharts() { Object.keys(S.charts).forEach(function (k) { try { S.charts[k].destroy(); } catch (e) { } }); S.charts = {}; }
function chart(id, spec) {
  let box = document.getElementById(id);
  if (!box) return;
  if (box.tagName === 'CANVAS') { const d = document.createElement('div'); d.id = id; d.className = 'svgc'; box.parentNode.replaceChild(d, box); box = d; }
  if (S.charts[id]) { try { S.charts[id].destroy(); } catch (e) { } }
  const draw = function () { box.innerHTML = svgChartHtml(spec, box.clientWidth || 320, box.clientHeight || 220); };
  let tm; const rs = function () { clearTimeout(tm); tm = setTimeout(draw, 150); };
  draw(); window.addEventListener('resize', rs);
  S.charts[id] = { destroy: function () { window.removeEventListener('resize', rs); } };
}

// ── Tawaran WhatsApp setelah aksi yang memberi tahu rekan kerja ──
function waOffer(list) {
  if (!list || !list.length) return;
  openModal({
    title: 'Beritahu lewat WhatsApp', sub: 'Pemberitahuan sudah dikirim lewat email. Agar lebih cepat dibaca, kirim juga lewat WhatsApp:',
    body: '<div class="col gap-8">' + list.map(function (w) {
      return '<a class="btn block" href="' + esc(w.link) + '" target="_blank" rel="noopener" style="justify-content:flex-start"><i class="bi bi-whatsapp" style="color:#16A34A"></i> Kirim ke ' + esc(w.nama) + '</a>';
    }).join('') + '</div><p class="xs muted mt-12">WhatsApp terbuka dengan pesan siap kirim (tanpa nama murid). Tekan tombol kirim di WhatsApp.</p>',
    foot: '<button class="btn" data-close>Lewati</button>'
  });
}

// ── Akun saya & ganti PIN ──
function pinFieldsHtml(prefix) {
  return fld({ name: 'pinLama', label: 'PIN saat ini', type: 'password', max: 6, inputmode: 'numeric', req: true, ac: 'current-password', id: prefix + 'lama' }) +
    fld({ name: 'pinBaru', label: 'PIN baru (6 digit)', type: 'password', max: 6, inputmode: 'numeric', req: true, ac: 'new-password', id: prefix + 'baru', hint: 'Tidak boleh angka sama semua atau berurutan.' }) +
    fld({ name: 'pinUlang', label: 'Ulangi PIN baru', type: 'password', max: 6, inputmode: 'numeric', req: true, ac: 'new-password', id: prefix + 'ulang' });
}
function pinRules() {
  return {
    pinLama: { label: 'PIN saat ini', req: true, re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.' },
    pinBaru: { label: 'PIN baru', req: true, re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.', fn: function (v) {
      if (/^(\d)\1{5}$/.test(v)) return 'PIN tidak boleh angka yang sama semua.';
      if ('0123456789'.indexOf(v) >= 0 || '9876543210'.indexOf(v) >= 0) return 'PIN tidak boleh berurutan.';
      return '';
    } },
    pinUlang: { label: 'Konfirmasi', req: true }
  };
}
function cekUlang(f, d) {
  if (d.pinBaru !== d.pinUlang) { setErr(f, 'pinUlang', 'Konfirmasi PIN tidak sama.'); return false; }
  if (d.pinBaru === d.pinLama) { setErr(f, 'pinBaru', 'PIN baru harus berbeda dari PIN saat ini.'); return false; }
  return true;
}
ACT.akun = function () {
  const u = S.user;
  const m = openModal({
    title: 'Akun saya', sub: u.nama + ' · ' + u.email, size: 'lg',
    body: '<div class="grid g-2"><div><h3>Nomor WhatsApp</h3><p class="xs muted mt-8" style="margin-top:2px">Dipakai untuk pemberitahuan kasus dan pengingat. Tidak ditampilkan kepada murid maupun orang tua.</p>' +
      '<form id="f-akun" class="form-grid mt-12" novalidate>' + fld({ name: 'no_wa', label: 'No. WhatsApp', type: 'tel', inputmode: 'tel', max: 20, value: u.noWa || '', ph: '0812xxxxxxx' }) + '</form><button class="btn primary mt-12" id="akun-simpan"><i class="bi bi-check-lg"></i> Simpan nomor</button></div>' +
      '<div><h3>Ganti PIN</h3><p class="xs muted mt-8" style="margin-top:2px">Gunakan PIN yang tidak dipakai di tempat lain.</p><form id="f-pin" class="form-grid mt-12" novalidate>' + pinFieldsHtml('ak_') + '</form><button class="btn dark mt-12" id="pin-simpan"><i class="bi bi-key"></i> Ganti PIN</button></div></div>',
    foot: '<button class="btn" data-close>Tutup</button>'
  });
  $('#akun-simpan', m.el).addEventListener('click', function (e) {
    const f = $('#f-akun', m.el), d = formData(f);
    if (!validate(f, d, { no_wa: { label: 'Nomor', re: /^[0-9+\-\s()]{8,20}$/, msg: 'Nomor tidak valid.' } })) return;
    run(e.currentTarget, api('akun.simpan', { no_wa: d.no_wa })).then(function (r) { S.user.noWa = r.no_wa; toast(r.no_wa ? 'Nomor WhatsApp tersimpan.' : 'Nomor WhatsApp dihapus.'); }).catch(fail);
  });
  $('#pin-simpan', m.el).addEventListener('click', function (e) {
    const f = $('#f-pin', m.el), d = formData(f);
    if (!validate(f, d, pinRules()) || !cekUlang(f, d)) return;
    run(e.currentTarget, api('auth.gantiPin', d)).then(function () { toast('PIN berhasil diganti.'); f.reset(); }).catch(fail);
  });
};
function renderGantiPinWajib(b) {
  authLayout('<div class="a-kicker">Keamanan akun</div><h2>Buat PIN baru Anda</h2><p class="muted" style="margin-top:4px">Halo, <b>' + esc(b.user.nama) + '</b>. PIN awal dari admin hanya untuk masuk pertama kali. Buat PIN pribadi sebelum melanjutkan.</p>' +
    '<form id="f-wajib" class="form-grid mt-16" novalidate>' + pinFieldsHtml('wj_').replace('PIN saat ini', 'PIN awal dari admin') + '</form><div id="wj-err" class="note rose mt-12 hide" role="alert"></div>' +
    '<button class="btn primary block mt-16" id="wj-ok" style="height:48px;font-size:15px">Simpan PIN & lanjutkan</button>' +
    '<button class="btn ghost block mt-8" data-act="logout-langsung"><i class="bi bi-box-arrow-left"></i> Keluar</button>', b.config);
  $('#wj-ok').addEventListener('click', function (e) {
    const f = $('#f-wajib'), d = formData(f);
    if (!validate(f, d, pinRules()) || !cekUlang(f, d)) return;
    $('#wj-err').classList.add('hide');
    run(e.currentTarget, api('auth.gantiPin', d)).then(function () { toast('PIN tersimpan.'); return startApp(); })
      .catch(function (err) { const x = $('#wj-err'); x.textContent = err.message; x.classList.remove('hide'); });
  });
}
