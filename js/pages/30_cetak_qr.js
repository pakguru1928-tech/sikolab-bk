/* SIKOLAB BK v1.15 — js/pages/30_cetak_qr.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.3 — Cetak, kartu QR, Pindai Hadir, daftar hadir, hari libur, permintaan murid, WhatsApp cepat
// ════════════════════════════════════════════════════════════
/* QR Code pembuat (mode byte, koreksi galat M, versi 1–15) — ringkas, tanpa pustaka luar. */
var QR = (function () {
  var ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];   // kode koreksi per blok (level M)
  var BLK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];                    // jumlah blok (level M)
  function mul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function rsDiv(deg) { var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1); var root = 1; for (i = 0; i < deg; i++) { for (var j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; }
  function rsRem(data, div) { var r = div.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= mul(c, f); }); }); return r; }
  function rawMods(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  function dataCap(v) { return Math.floor(rawMods(v) / 8) - ECC[v] * BLK[v]; }
  function alignPos(v) { if (v === 1) return []; var n = Math.floor(v / 7) + 2, size = v * 4 + 17; var step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2; var r = [6]; for (var p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; }
  function utf8(s) { var o = []; s = unescape(encodeURIComponent(s)); for (var i = 0; i < s.length; i++) o.push(s.charCodeAt(i)); return o; }
  function encode(text) {
    var bytes = utf8(String(text)), v;
    for (v = 1; v <= 15; v++) { var cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCap(v) * 8) break; }
    if (v > 15) throw new Error('Teks terlalu panjang untuk QR.');
    var bits = [], push = function (val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4); push(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { push(b, 8); });
    var cap = dataCap(v) * 8;
    push(0, Math.min(4, cap - bits.length)); push(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var data = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    // Blok + koreksi galat, lalu disisipkan berselang-seling
    var nb = BLK[v], el = ECC[v], raw = Math.floor(rawMods(v) / 8), nShort = nb - raw % nb, sLen = Math.floor(raw / nb), div = rsDiv(el), blocks = [], k = 0;
    for (i = 0; i < nb; i++) { var d = data.slice(k, k + sLen - el + (i < nShort ? 0 : 1)); k += d.length; var e = rsRem(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e)); }
    var cw = []; for (i = 0; i < blocks[0].length; i++) for (j = 0; j < blocks.length; j++) if (i !== sLen - el || j >= nShort) cw.push(blocks[j][i]);
    // Matriks
    var size = v * 4 + 17, M = [], F = [];
    for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    var set = function (x, y, dark) { M[y][x] = dark; F[y][x] = true; };
    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = c[0] + dx, yy = c[1] + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) { var dist = Math.max(Math.abs(dx), Math.abs(dy)); set(xx, yy, dist !== 2 && dist !== 4); } } });
    var ap = alignPos(v), na = ap.length;
    for (i = 0; i < na; i++) for (j = 0; j < na; j++) { if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue; for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) set(ap[i] + dx2, ap[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1); }
    var drawFormat = function (mask) {
      var dat = (0 << 3) | mask, rem = dat; for (var t = 0; t < 10; t++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((dat << 10) | rem) ^ 0x5412, bit = function (n) { return ((fb >>> n) & 1) !== 0; };
      for (var a = 0; a <= 5; a++) set(8, a, bit(a));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (a = 9; a < 15; a++) set(14 - a, 8, bit(a));
      for (a = 0; a < 8; a++) set(size - 1 - a, 8, bit(a));
      for (a = 8; a < 15; a++) set(8, size - 15 + a, bit(a));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (v >= 7) { var rv = v; for (i = 0; i < 12; i++) rv = (rv << 1) ^ ((rv >>> 11) * 0x1F25); var vb = (v << 12) | rv; for (i = 0; i < 18; i++) { var bt = ((vb >>> i) & 1) !== 0, a1 = size - 11 + i % 3, b1 = Math.floor(i / 3); set(a1, b1, bt); set(b1, a1, bt); } }
    // Isi kode
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!F[y][x] && idx < cw.length * 8) { M[y][x] = ((cw[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0; idx++; }
      }
    }
    // Pilih mask dengan penalti terkecil
    var maskFn = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return x * y % 2 + x * y % 3 === 0; }, function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
    var applyMask = function (m) { for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) if (!F[yy][xx] && maskFn[m](xx, yy)) M[yy][xx] = !M[yy][xx]; };
    var penalty = function () {
      var p = 0, dark = 0, yy, xx, run, c;
      for (yy = 0; yy < size; yy++) { run = 1; for (xx = 1; xx < size; xx++) { if (M[yy][xx] === M[yy][xx - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (xx = 0; xx < size; xx++) { run = 1; for (yy = 1; yy < size; yy++) { if (M[yy][xx] === M[yy - 1][xx]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (yy = 0; yy < size - 1; yy++) for (xx = 0; xx < size - 1; xx++) { c = M[yy][xx]; if (c === M[yy][xx + 1] && c === M[yy + 1][xx] && c === M[yy + 1][xx + 1]) p += 3; }
      var pat = function (g) { return g(0) && !g(1) && g(2) && g(3) && g(4) && !g(5) && g(6); };
      for (yy = 0; yy < size; yy++) for (xx = 0; xx + 6 < size; xx++) {
        if (pat(function (i) { return M[yy][xx + i]; })) { var l = xx >= 4 && !M[yy][xx - 1] && !M[yy][xx - 2] && !M[yy][xx - 3] && !M[yy][xx - 4], r = xx + 10 < size && !M[yy][xx + 7] && !M[yy][xx + 8] && !M[yy][xx + 9] && !M[yy][xx + 10]; if (l || r) p += 40; }
        if (pat(function (i) { return M[xx + i][yy]; })) { var u = xx >= 4 && !M[xx - 1][yy] && !M[xx - 2][yy] && !M[xx - 3][yy] && !M[xx - 4][yy], dn = xx + 10 < size && !M[xx + 7][yy] && !M[xx + 8][yy] && !M[xx + 9][yy] && !M[xx + 10][yy]; if (u || dn) p += 40; }
      }
      for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) if (M[yy][xx]) dark++;
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) { applyMask(m); drawFormat(m); var pp = penalty(); if (pp < bestP) { bestP = pp; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return M;
  }
  /** SVG (vektor, tajam saat dicetak). o.margin = zona tenang (modul), bawaan 4. */
  function svg(text, o) {
    o = o || {};
    var M = encode(text), n = M.length, q = o.margin === undefined ? 4 : o.margin, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (M[y][x]) d += 'M' + (x + q) + ',' + (y + q) + 'h1v1h-1z';
    var w = n + q * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + w + '" shape-rendering="crispEdges"' + (o.cls ? ' class="' + o.cls + '"' : '') + ' role="img" aria-label="Kode QR"><rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  return { encode: encode, svg: svg };
})();
function normKode(v) { let t = String(v || '').toUpperCase().trim(); const i = t.lastIndexOf(':'); if (i >= 0) t = t.substr(i + 1); return t.replace(/[^A-Z0-9]/g, '').substr(0, 16); }
function hhmm(ms) { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function salin(teks, pesan) {
  const ok = function () { toast(pesan || 'Disalin.'); };
  const cad = function () { const t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Tidak dapat menyalin otomatis. Salin manual.', 'warn'); } t.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, cad); else cad();
}
function chipAbs(st) { return st ? '<span class="chip ab-' + esc(st) + '">' + esc(ST_NAMA[st] || st) + '</span>' : '<span class="chip ab-B">Belum</span>'; }

// ── Pratinjau cetak: dokumen tampil di layar penuh (bisa dicetak ulang), lalu dialog cetak dibuka ──
function cetakHtml(html, opt) {
  opt = opt || {};
  let root = $('#print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = '<div class="pr-bar no-print"><div class="grow"><b>' + esc(opt.judul || 'Pratinjau cetak') + '</b><span>' + esc(String(opt.ket || 'Pilih "Simpan sebagai PDF" bila ingin berkas digital.').replace(/\bA4\b/, kertasNama())) + '</span></div><button class="btn" data-act="pr-tutup"><i class="bi bi-x-lg"></i> Tutup</button><button class="btn primary" data-act="pr-cetak"><i class="bi bi-printer"></i> Cetak</button></div>' + html;
  let st = $('#print-page');
  if (!st) { st = document.createElement('style'); st.id = 'print-page'; document.head.appendChild(st); }
  const ks = KERTAS_CSS[(KOP || {}).kertas] || KERTAS_CSS.A4;
  st.textContent = '@page{size:' + (opt.landscape ? ks.h + ' ' + ks.w : ks.w + ' ' + ks.h) + ';margin:' + (opt.margin || '12mm') + '}' +
    '#print-root .pr-doc,#print-root .paper{font-family:' + hurufCss((KOP || {}).huruf) + '}#print-root .pr-doc{max-width:' + (opt.landscape ? ks.h : ks.w) + '}';
  document.body.classList.add('printing');
  window.scrollTo(0, 0);
  setTimeout(function () { try { window.print(); } catch (e) { /* pengguna dapat menekan tombol Cetak */ } }, 350);
}
function tutupCetak() { document.body.classList.remove('printing'); const r = $('#print-root'); if (r) r.innerHTML = ''; }
ACT['pr-cetak'] = function () { window.print(); };
ACT['pr-tutup'] = tutupCetak;
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('printing')) tutupCetak(); });
function kopCetak(d) {
  const k = Object.assign({}, d || {}, KOP || {});
  const al = [k.alamat, k.kontak].filter(Boolean).join(' · ');
  const teks = (k.kop1 ? '<div>' + esc(k.kop1) + '</div>' : '') + (k.kop2 ? '<div class="pr-k2">' + esc(k.kop2) + '</div>' : '') + '<div class="pr-sek">' + esc(k.sekolah || S.cfg.namaSekolah || '') + '</div>' + (al ? '<div class="pr-al">' + esc(al) + '</div>' : '');
  if (!k.logoKiri && !k.logoKanan) return '<div class="pr-kop">' + teks + '</div>';
  return '<div class="pr-kop berlogo"><div class="pr-lg">' + (k.logoKiri ? '<img alt="" src="' + k.logoKiri + '">' : '') + '</div><div>' + teks + '</div><div class="pr-lg">' + (k.logoKanan ? '<img alt="" src="' + k.logoKanan + '">' : '') + '</div></div>';
}
/** Kolom tanda tangan: jabatan, ruang tanda tangan, nama tebal bergaris bawah, pangkat, NIP. */
function ttdOrang(jabatan, nama, nip, pangkat) {
  return jabatan + '<br><br><br><br><b><u>' + esc(nama || '(....................................)') + '</u></b>' + (pangkat ? '<br>' + esc(pangkat) : '') + (nip ? '<br>NIP. ' + esc(nip) : '');
}
function ttdKepsek() {
  const k = KOP || {};
  return k.kepsek ? ttdOrang('Mengetahui,<br>' + esc(k.jabKepsek || 'Kepala Sekolah') + ',', k.kepsek, k.nipKepsek, k.pangkatKepsek) : '';
}
function ttdCetak(kiri, kanan, kota) {
  const tgl = new Date();
  if (!kota && KOP) kota = KOP.kota;
  return '<div class="pr-ttd"><div>' + kiri + '</div><div>' + esc((kota ? kota + ', ' : '') + tgl.getDate() + ' ' + ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][tgl.getMonth()] + ' ' + tgl.getFullYear()) + '<br>' + kanan + '</div></div>';
}
