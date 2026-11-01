'use strict';
/* ============================================================
   SIKOLAB BK — Aplikasi klien (SPA)
   Dikembangkan oleh Iwa Salji Elbi Satria, UPT SMPN 3 Batipuh. © 2026.
   Boleh dipakai dan diubah oleh sekolah lain dengan tetap mencantumkan nama pengembang.
   - Semua data lewat satu pintu: google.script.run.api(token, aksi, data)
   - Hak akses DITEGAKKAN di server; menu di sini hanya kenyamanan tampilan
   - Semua keluaran dinamis melewati esc() (anti-XSS)
   ============================================================ */

// ── Util ──
const PENGEMBANG = 'Iwa Salji Elbi Satria', PENGEMBANG_SEKOLAH = 'UPT SMPN 3 Batipuh', VERSI_APP = '1.10';
const $ = function (s, r) { return (r || document).querySelector(s); };
// Pengaman: callback lama yang selesai setelah pengguna pindah halaman tidak boleh memunculkan galat.
window.addEventListener('unhandledrejection', function (e) { const m = String(e.reason && e.reason.message || ''); if (/of null|of undefined/.test(m)) { e.preventDefault(); if (window.console) console.warn('[diabaikan]', m); } });
// ── Jam di bilah atas (WIB), diperbarui setiap 15 detik ──
const JAM_FMT = (function () {
  try {
    const t = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const d = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short' });
    return function (x) { return { t: t.format(x).replace(':', '.'), d: d.format(x) }; };
  } catch (e) { return function (x) { return { t: String(x.getHours()).padStart(2, '0') + '.' + String(x.getMinutes()).padStart(2, '0'), d: '' }; }; }
})();
function jamTampil() {
  const el = document.getElementById('jam-chip'); if (!el) return;
  const j = JAM_FMT(new Date());
  el.innerHTML = '<i class="bi bi-clock"></i><span class="jam-d">' + j.d + '</span><b>' + j.t + '</b>';
}
setInterval(jamTampil, 15000);
function isiHtml(sel, html) { const el = $(sel); if (el) el.innerHTML = html; }
const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HRI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function fTgl(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '';
  return parseInt(s.substr(8, 2), 10) + ' ' + BLN[parseInt(s.substr(5, 2), 10) - 1] + ' ' + s.substr(0, 4);
}
function fTs(s) {
  if (!s || s.length < 16) return fTgl(s);
  const d = s.substr(0, 10), t = s.substr(11, 5);
  return (d === S.today ? 'Hari ini' : fTgl(d)) + ' · ' + t;
}
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addD(s, n) { const d = new Date(+s.substr(0, 4), +s.substr(5, 2) - 1, +s.substr(8, 2), 12); d.setDate(d.getDate() + n); return ymd(d); }
function initials(n) { const p = String(n || '').replace(/,.*$/, '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')).toUpperCase() || '?'; }
function slug(s) { return String(s || '').replace(/\s+/g, '-'); }
function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
function lstore(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function lhapus(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
// Sesi di perangkat: "Ingat saya" → localStorage (tetap masuk walau tab/peramban ditutup); bila tidak → sessionStorage.
function ingatAktif() { return lstore('sk_ingat') === '1'; }
function sget(k) { return store(k) || (ingatAktif() ? lstore(k) : null); }
function sset(k, v) { if (v === null) { store(k, null); lhapus(k); return; } if (ingatAktif()) lstore(k, v); else store(k, v); }
function hapusSesiLokal() {
  ['sk_token', 'sk_mode', 'sk_email'].forEach(function (k) { sset(k, null); });
  [window.localStorage, window.sessionStorage].forEach(function (st) {
    try { Object.keys(st).forEach(function (k) { if (k.indexOf('sk_boot_') === 0 || k.indexOf('sk_cc_') === 0) st.removeItem(k); }); } catch (e) { /* abaikan */ }
  });
}
function hasRole(r) { return !!S.user && S.user.roles.indexOf(r) >= 0; }
function hasAny(rs) { return rs.some(hasRole); }

// ── Status global ──
const S = { mode: '', token: '', user: null, cfg: {}, menu: [], refs: { kelas: [], mapel: [], kejadian: [], urgensi: [], statusKasus: [] }, page: '', params: {}, today: '', pending: 0, navTok: 0, charts: {}, notif: { total: 0, items: [] }, kelasWali: [] };
const P = {}; // status per halaman

// ── Indikator pemuatan ──
function loadBegin() { S.pending++; $('#topload').classList.add('on'); }
function loadEnd() { S.pending = Math.max(0, S.pending - 1); if (!S.pending) $('#topload').classList.remove('on'); }

// ── Cache klien: hasil baca disimpan sebentar agar berpindah menu terasa instan.
// Setiap aksi yang mengubah data otomatis mengosongkan cache sehingga tampilan tidak basi.
const READ_ACTIONS = { 'auth.status': 1, 'boot': 1, 'notif.get': 1, 'dashboard.get': 1, 'dashboard.distribusi': 1, 'laporan.rekap': 1, 'murid.cari': 1, 'absensi.meta': 1, 'absensi.riwayat': 1, 'absensi.roster': 1, 'harian.meta': 1, 'harian.roster': 1, 'harian.rekap': 1, 'pola.list': 1, 'kasus.list': 1, 'kasus.detail': 1, 'bk.daftar': 1, 'layanan.daftar': 1, 'layanan.get': 1, 'pengguna.ringkas': 1, 'monitoring.daftar': 1, 'ortu.siapkan': 1, 'ortu.riwayat': 1, 'riwayat.murid': 1, 'admin.meta': 1, 'admin.pengampuInfo': 1, 'admin.list': 1, 'admin.config.get': 1, 'admin.kasusAktif': 1, 'admin.pemeliharaan': 1, 'admin.log': 1, 'arsip.ringkasan': 1, 'naik.pratinjau': 1, 'program.daftar': 1, 'program.detail': 1, 'instrumen.daftar': 1, 'instrumen.get': 1, 'instrumen.responden': 1, 'instrumen.jawabGet': 1, 'instrumen.hasil': 1, 'instrumen.perMurid': 1, 'instrumen.jawabDetail': 1, 'instrumen.ekspor': 1, 'rekap.tahunan': 1, 'kelas.saya': 1, 'kop.get': 1, 'harian.periode': 1, 'instrumen.profilKelas': 1, 'instrumen.cetakProfil': 1, 'program.kebutuhan': 1, 'program.dokumen': 1 };
const CACHEABLE = { 'dashboard.get': 1, 'dashboard.distribusi': 1, 'murid.cari': 1, 'absensi.meta': 1, 'harian.meta': 1, 'kasus.list': 1, 'kasus.detail': 1, 'bk.daftar': 1, 'layanan.daftar': 1, 'pengguna.ringkas': 1, 'monitoring.daftar': 1, 'riwayat.murid': 1, 'admin.meta': 1, 'admin.list': 1, 'program.daftar': 1, 'program.detail': 1, 'instrumen.daftar': 1, 'instrumen.hasil': 1, 'instrumen.perMurid': 1, 'rekap.tahunan': 1, 'kelas.saya': 1, 'laporan.rekap': 1, 'harian.rekap': 1, 'absensi.riwayat': 1, 'hadir.daftar': 1, 'temu.daftar': 1, 'ortu.riwayat': 1, 'ortu.siapkan': 1, 'ortu.riwayat': 1, 'layanan.get': 1, 'instrumen.get': 1, 'instrumen.responden': 1, 'instrumen.jawabDetail': 1, 'instrumen.jawabGet': 1, 'kehadiran.get': 1, 'admin.config.get': 1, 'admin.pengampuInfo': 1, 'admin.kasusAktif': 1, 'arsip.ringkasan': 1, 'admin.pemeliharaan': 1, 'temu.daftar': 1, 'naik.pratinjau': 1, 'kop.get': 1, 'harian.periode': 1, 'instrumen.profilKelas': 1, 'program.kebutuhan': 1, 'program.dokumen': 1 };
['poin.meta', 'poin.daftar', 'poin.murid', 'poin.saya', 'poin.verifikasi', 'poin.rekap', 'hadir.daftar', 'temu.daftar', 'pindai.siap', 'kehadiran.get', 'muat.banyak', 'ortu.suratPratinjau', 'surat.contoh', 'admin.diagSurat', 'kartu.data', 'berkas.ambil', 'laporan.pdf', 'rekap.tahunanPdf'].forEach(function (a) { READ_ACTIONS[a] = 1; });
// Cache klien "tampilkan dulu, perbarui kemudian" (stale-while-revalidate):
//  - Data segar (≤ 2 menit) dipakai langsung.
//  - Data lebih tua (≤ 30 menit) tetap DITAMPILKAN SEKETIKA, lalu diperbarui diam-diam; bila berubah dan pengguna belum
//    berinteraksi, halaman digambar ulang tanpa layar muat.
//  - Penyimpanan data menghapus cache yang berkaitan, cache lain hanya ditandai lama (tetap tampil seketika lalu diperbarui).
const CC = {}; const CC_TTL = 120000; const CC_SWR = 1800000;
const CC_REL = {
  harian: ['harian', 'hadir', 'absensi', 'kelas', 'riwayat', 'dashboard'], absensi: ['absensi', 'harian', 'hadir', 'riwayat', 'kelas', 'dashboard'], pindai: ['harian', 'hadir', 'dashboard'],
  kejadian: ['kasus', 'riwayat', 'kelas', 'dashboard', 'layanan', 'poin'], kasus: ['kasus', 'riwayat', 'kelas', 'dashboard', 'layanan'], rujukan: ['kasus', 'riwayat', 'dashboard'], bimbingan: ['kasus', 'riwayat'], monitoring: ['kasus', 'monitoring', 'riwayat'],
  layanan: ['layanan', 'program', 'riwayat', 'kasus', 'dashboard', 'temu'], temu: ['temu', 'riwayat', 'layanan'], ortu: ['ortu', 'riwayat', 'kelas', 'dashboard'], kelas: ['kelas', 'ortu', 'riwayat'],
  program: ['program', 'layanan'], instrumen: ['instrumen', 'riwayat'],
  wali: ['kasus', 'riwayat', 'kelas', 'dashboard', 'monitoring'], notif: ['notif'],
  poin: ['poin', 'riwayat', 'kelas', 'kasus', 'notif']
};
function ccClear(action) {
  const dom = action ? action.split('.')[0] : '';
  const rel = CC_REL[dom];
  Object.keys(CC).forEach(function (k) {
    const d = k.split('.')[0];
    if (!action || !rel || rel.indexOf(d) >= 0) delete CC[k]; else CC[k].t = 0;
  });
  ccSimpanNanti();
}
// ── Cache klien yang bertahan setelah aplikasi ditutup: halaman yang pernah dibuka tampil seketika saat dibuka lagi. ──
// Disimpan di perangkat (localStorage bila "Ingat saya", selain itu sessionStorage). Data sangat rahasia tidak disimpan.
['poin.meta', 'poin.daftar', 'poin.rekap'].forEach(function (a) { CACHEABLE[a] = 1; });
const CC_TIDAK_DISIMPAN = { 'poin.daftar': 1, 'kasus.detail': 1, 'layanan.get': 1, 'instrumen.jawabDetail': 1, 'instrumen.jawabGet': 1, 'riwayat.murid': 1, 'instrumen.perMurid': 1, 'ortu.siapkan': 1, 'admin.config.get': 1 };
const CC_SIMPAN_MAKS = 1800000, CC_UMUR_SIMPAN = 12 * 3600000;
let CC_TMR = 0;
function ccSimpanKey() { const e = sget('sk_email') || (S.user && S.user.email) || ''; return e ? 'sk_cc_' + e : ''; }
function ccSimpanNanti() { clearTimeout(CC_TMR); CC_TMR = setTimeout(ccSimpan, 1500); }
function ccSimpan() {
  const key = ccSimpanKey(); if (!key || !S.user) return;
  const out = {}; let n = 0;
  Object.keys(CC).sort(function (a, b) { return (CC[b].at || 0) - (CC[a].at || 0); }).forEach(function (k) {
    const e = CC[k];
    if (e.v === undefined || !e.at || CC_TIDAK_DISIMPAN[k.split('|')[0]]) return;
    const sv = JSON.stringify(e.v);
    if (sv.length > 250000 || n + sv.length > CC_SIMPAN_MAKS) return;
    n += sv.length; out[k] = { at: e.at, v: e.v };
  });
  try { (ingatAktif() ? localStorage : sessionStorage).setItem(key, JSON.stringify(out)); } catch (e) { /* penyimpanan penuh: abaikan */ }
}
function ccMuatSimpanan() {
  const key = ccSimpanKey(); if (!key) return;
  let o = null;
  try { o = JSON.parse((ingatAktif() ? localStorage : sessionStorage).getItem(key) || 'null'); } catch (e) { o = null; }
  if (!o) return;
  const now = Date.now();
  Object.keys(o).forEach(function (k) {
    if (CC[k] || !o[k] || now - o[k].at > CC_UMUR_SIMPAN) return;
    CC[k] = { t: 0, p: Promise.resolve(o[k].v), v: o[k].v, at: o[k].at, simpanan: true };
  });
}
window.addEventListener('pagehide', function () { try { ccSimpan(); } catch (e) { /* abaikan */ } });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { try { ccSimpan(); } catch (e) { /* abaikan */ } } });
function ccKey(action, payload) {
  // Urutan kunci diseragamkan agar payload yang sama dari formulir dan prafetch memakai cache yang sama
  const o = {}; Object.keys(payload || {}).sort().forEach(function (k) { o[k] = payload[k]; });
  return action + '|' + S.mode + '|' + JSON.stringify(o);
}
function ccSeed(action, payload, val) { const k = ccKey(action, payload); CC[k] = { t: Date.now(), p: Promise.resolve(val), v: val, at: Date.now() }; }
function ccFetch(k, action, payload, diam) {
  const prev = CC[k];
  const p = api(action, payload, diam);
  const ent = CC[k] = { t: Date.now(), p: p, v: prev ? prev.v : undefined, at: prev ? prev.at : 0, pending: true };
  p.then(function (v) { ent.pending = false; if (CC[k] === ent) { ent.v = v; ent.at = Date.now(); ccSimpanNanti(); } }, function () { ent.pending = false; if (CC[k] === ent) { if (ent.v === undefined) delete CC[k]; else { ent.t = 0; ent.p = Promise.resolve(ent.v); } } });
  return p;
}
/** Seperti api(), tetapi memakai cache klien untuk aksi baca (lihat keterangan di atas). */
function apiC(action, payload) {
  if (!CACHEABLE[action]) return api(action, payload);
  const k = ccKey(action, payload), hit = CC[k], now = Date.now();
  if (S.recPage && now < S.recUntil && S.page === S.recPage) pfRecord(action, payload);
  if (hit && now - hit.t < CC_TTL) {
    // Sedang diperbarui di latar belakang tetapi data lama ada: tampilkan data lama seketika, gambar ulang diam-diam bila berubah.
    if (hit.pending && hit.v !== undefined) { ccTungguUlang(hit); return Promise.resolve(hit.v); }
    return hit.p;
  }
  if (hit && hit.v !== undefined && now - hit.at < (hit.simpanan ? CC_UMUR_SIMPAN : CC_SWR)) {
    ccRevalidate(k, action, payload, hit);
    return Promise.resolve(hit.v);
  }
  return ccFetch(k, action, payload);
}
function ccTungguUlang(hit) {
  if (hit.tunggu) return;
  hit.tunggu = true;
  const tok = S.navTok, lama = JSON.stringify(hit.v);
  hit.p.then(function (v) {
    if (JSON.stringify(v) === lama || tok !== S.navTok || OV.length || S.touched) return;
    navigateTo(S.page, S.params, true, true);
  }).catch(function () { });
}
function ccRevalidate(k, action, payload, hit) {
  if (hit.rv) return;
  hit.rv = true;
  const tok = S.navTok, lama = JSON.stringify(hit.v);
  ccFetch(k, action, payload, true).then(function (v) {
    if (JSON.stringify(v) === lama || tok !== S.navTok) return;
    if (OV.length || S.touched) return; // pengguna sedang bekerja di halaman ini: jangan diganggu
    navigateTo(S.page, S.params, true, true);
  }).catch(function () { });
}
// ── Prafetch: saat kursor/jari menyentuh menu, data halaman tujuan diambil lebih dulu. ──
// Aksi yang dipanggil tiap halaman direkam otomatis saat halaman dibuka dari menu.
const PF = (function () { try { return JSON.parse(localStorage.getItem('sk_pf2') || '{}') || {}; } catch (e) { return {}; } })();
function pfKey(page) { return (S.mode || (S.user && S.user.roles.join('+')) || '') + ':' + page; }
// Tanggal di payload disimpan relatif terhadap hari ini ("@0" = hari ini, "@-29" = 29 hari lalu, "@bln" = bulan ini),
// supaya prafetch tetap tepat esok hari.
function pfHari(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
function pfNorm(p) {
  const o = {};
  Object.keys(p || {}).forEach(function (k) {
    const v = p[k];
    o[k] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && S.today ? '@' + pfHari(S.today, v) : (typeof v === 'string' && S.today && v === S.today.substr(0, 7) ? '@bln' : v);
  });
  return o;
}
function pfMat(x) {
  const o = {};
  Object.keys(x.p || {}).forEach(function (k) {
    const v = x.p[k];
    o[k] = v === '@bln' ? S.today.substr(0, 7) : (typeof v === 'string' && /^@-?\d+$/.test(v) ? addD(S.today, +v.substr(1)) : v);
  });
  return { a: x.a, p: o };
}
/** Bawaan prafetch per peran & halaman (dipakai sebelum kebiasaan pengguna terekam). */
const PF_BAWAAN = {"admin:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"admin:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"admin:admin":[{"a":"admin.meta","p":{}},{"a":"admin.list","p":{"entity":"users","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"guru_bk:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"guru_bk:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_bk:layanan":[{"a":"layanan.daftar","p":{"q":"","komponen":"","sasaran":"","bulan":""}},{"a":"temu.daftar","p":{}}],"guru_bk:riwayat":[{"a":"murid.cari","p":{"q":""}}],"guru_bk:ortu":[{"a":"murid.cari","p":{"q":""}}],"guru_bk:program":[{"a":"program.daftar","p":{}}],"guru_bk:instrumen":[{"a":"instrumen.daftar","p":{}}],"guru_bk:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"guru_mapel:absensi":[{"a":"absensi.meta","p":{}},{"a":"absensi.riwayat","p":{"id_kelas":""}}],"guru_mapel:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_mapel:riwayat":[{"a":"murid.cari","p":{"q":""}}],"guru_mapel:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"wali_kelas:kelas":[{"a":"kelas.saya","p":{"id_kelas":""}}],"wali_kelas:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"wali_kelas:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"wali_kelas:riwayat":[{"a":"murid.cari","p":{"q":""}}],"wali_kelas:ortu":[{"a":"murid.cari","p":{"q":""}}],"wali_kelas:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"waka:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"waka:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"waka:riwayat":[{"a":"murid.cari","p":{"q":""}}],"waka:program":[{"a":"program.daftar","p":{}}],"waka:instrumen":[{"a":"instrumen.daftar","p":{}}],"waka:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"kepsek:program":[{"a":"program.daftar","p":{}}],"kepsek:instrumen":[{"a":"instrumen.daftar","p":{}}],"kepsek:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}]};
function pfDaftar(page) {
  const k = pfKey(page);
  let l = PF[k];
  if (!l) { const r = (S.mode || (S.user && S.user.roles[0]) || ''); l = PF_BAWAAN[r + ':' + page]; }
  return (l || []).map(pfMat);
}
function pfRecord(action, payload) {
  payload = pfNorm(payload);
  const key = pfKey(S.recPage), list = PF[key] = PF[key] || [];
  const sig = action + JSON.stringify(payload || {});
  if (list.some(function (x) { return x.a + JSON.stringify(x.p || {}) === sig; }) || list.length >= 3) return;
  list.push({ a: action, p: payload || {} });
  try { localStorage.setItem('sk_pf2', JSON.stringify(PF)); } catch (e) { /* abaikan */ }
}
/**
 * Ambil beberapa data baca dalam SATU panggilan server (muat.banyak). Setiap butir langsung masuk cache klien,
 * jadi halaman yang memakainya tampil seketika. Butir yang masih segar dilewati.
 */
function muatBanyak(list) {
  const now = Date.now(), seen = {};
  const todo = list.filter(function (x) {
    if (!CACHEABLE[x.a]) return false;
    const k = ccKey(x.a, x.p);
    if (seen[k]) return false; seen[k] = 1;
    const hit = CC[k];
    return !(hit && now - hit.t < CC_TTL);
  }).slice(0, 15);
  if (!todo.length) return Promise.resolve();
  if (todo.length === 1) return ccFetch(ccKey(todo[0].a, todo[0].p), todo[0].a, todo[0].p, true).catch(function () { });
  const batch = api('muat.banyak', { daftar: todo.map(function (x) { return { a: x.a, p: x.p || {} }; }) }, true);
  todo.forEach(function (x, i) {
    const k = ccKey(x.a, x.p), prev = CC[k];
    const p = batch.then(function (r) { const it = r && r[i]; if (it && it.ok) return it.data; throw new Error((it && it.pesan) || 'Gagal memuat.'); });
    const ent = CC[k] = { t: Date.now(), p: p, v: prev ? prev.v : undefined, at: prev ? prev.at : 0, pending: true };
    p.then(function (v) { ent.pending = false; if (CC[k] === ent) { ent.v = v; ent.at = Date.now(); ccSimpanNanti(); } }, function () { ent.pending = false; if (CC[k] === ent) { if (ent.v === undefined) delete CC[k]; else { ent.t = 0; ent.p = Promise.resolve(ent.v); } } });
  });
  return batch.catch(function () { });
}
function prefetch(page) {
  if (!S.user || page === S.page) return;
  muatBanyak(pfDaftar(page));
}

['mouseover', 'touchstart', 'focusin'].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    const b = e.target.closest && e.target.closest('[data-act="nav"][data-page],[data-act="kpi"][data-go]');
    if (b) prefetch(b.dataset.page || b.dataset.go);
  }, { passive: true });
});
/** Panggil server. Resolve dengan data, reject dengan Error(pesan ramah). */
function api(action, payload, diam) {
  return new Promise(function (resolve, reject) {
    if (!(window.google && google.script && google.script.run)) { reject(new Error('Aplikasi harus dibuka dari URL Web App Google Apps Script.')); return; }
    if (!diam) loadBegin();
    google.script.run
      .withSuccessHandler(function (res) {
        if (!diam) loadEnd();
        if (!res) { reject(new Error('Server tidak memberi respons. Coba lagi.')); return; }
        if (res.success) {
          if (!READ_ACTIONS[action]) ccClear(action);
          resolve(res.data);
          if (res.data && res.data.wa && res.data.wa.length) setTimeout(function () { waOffer(res.data.wa); }, 350);
          return;
        }
        const err = new Error(res.message || 'Terjadi kesalahan.');
        err.code = res.data && res.data.code;
        if (err.code === 'AUTH' && S.user) { sessionLost(); }
        if (err.code === 'PINCHG') { startApp().catch(function () { }); }
        reject(err);
      })
      .withFailureHandler(function (e) {
        if (!diam) loadEnd();
        reject(new Error((e && e.message) ? 'Koneksi bermasalah: ' + e.message : 'Koneksi bermasalah. Periksa jaringan lalu coba lagi.'));
      })
      .api(S.token, action, S.mode ? Object.assign({ __mode: S.mode }, payload || {}) : (payload || {}));
  });
}

// ── Toast ──
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  t.innerHTML = '<i class="bi ' + (type === 'err' ? 'bi-x-octagon' : type === 'warn' ? 'bi-exclamation-triangle' : 'bi-check-circle') + '"></i><span>' + esc(msg) + '</span>';
  $('#toasts').appendChild(t);
  setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, type === 'err' ? 6000 : 3600);
}
function fail(e) { toast(e && e.message ? e.message : 'Terjadi kesalahan.', 'err'); }

// ── Tombol dengan indikator ──
function busy(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.html = btn.innerHTML; btn.classList.add('loading'); btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.busy ? esc(btn.dataset.busy) : ''); }
  else { btn.classList.remove('loading'); if (btn.dataset.html !== undefined) btn.innerHTML = btn.dataset.html; }
}
function run(btn, promise) { busy(btn, true); return promise.then(function (r) { busy(btn, false); return r; }, function (e) { busy(btn, false); throw e; }); }

// ── Overlay: modal / bottom-sheet ──
const OV = [];
function openModal(o) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '">' +
    '<div class="m-grab"></div><div class="m-head"><div class="grow"><h3>' + esc(o.title || '') + '</h3>' + (o.sub ? '<div class="xs muted mt-8" style="margin-top:2px">' + esc(o.sub) + '</div>' : '') + '</div>' +
    '<button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>' +
    '<div class="m-body">' + (o.body || '') + '</div>' + (o.foot ? '<div class="m-foot">' + o.foot + '</div>' : '') + '</div>';
  const h = { el: wrap, body: $('.m-body', wrap), close: function () { const i = OV.indexOf(h); if (i >= 0) OV.splice(i, 1); wrap.remove(); if (o.onClose) o.onClose(); } };
  wrap.addEventListener('mousedown', function (e) { if (e.target === wrap && !o.sticky) h.close(); });
  wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) h.close(); });
  $('#overlay-root').appendChild(wrap);
  OV.push(h);
  if (o.onMount) o.onMount(h);
  const f = $('input:not([type=hidden]),select,textarea', wrap); if (f && !o.noFocus) setTimeout(function () { try { f.focus(); } catch (e) { } }, 60);
  return h;
}
function openDrawer(o) {
  const wrap = document.createElement('div');
  wrap.className = 'drawer-wrap';
  wrap.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true"><div class="d-head">' + (o.head || '') + '<button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div><div class="d-body">' + (o.body || '') + '</div>' + (o.foot ? '<div class="d-foot">' + o.foot + '</div>' : '') + '</aside>';
  const h = { el: wrap, body: $('.d-body', wrap), foot: null, close: function () { const i = OV.indexOf(h); if (i >= 0) OV.splice(i, 1); wrap.remove(); if (o.onClose) o.onClose(); } };
  wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) h.close(); });
  wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) h.close(); });
  $('#overlay-root').appendChild(wrap);
  OV.push(h);
  return h;
}
function closeTop() { const h = OV[OV.length - 1]; if (h) h.close(); return !!h; }
function closeAllOverlays() { while (OV.length) OV[OV.length - 1].close(); }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!closeTop()) { closePop(); } } });

function confirmDlg(msg, okLabel, danger, title) {
  return new Promise(function (resolve) {
    let done = false;
    const m = openModal({
      title: title || 'Konfirmasi', body: '<p>' + esc(msg) + '</p>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-ok>' + esc(okLabel || 'Ya, lanjutkan') + '</button>',
      onClose: function () { if (!done) resolve(false); }
    });
    $('[data-ok]', m.el).addEventListener('click', function () { done = true; m.close(); resolve(true); });
  });
}

// ── Form ──
function fld(o) {
  const id = o.id || ('f_' + o.name);
  const req = o.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
  let ctl = '';
  const common = ' id="' + esc(id) + '" name="' + esc(o.name) + '"' + (o.req ? ' required' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.ro ? ' readonly' : '') + (o.dis ? ' disabled' : '');
  const val = o.value === undefined || o.value === null ? '' : o.value;
  if (o.type === 'select') {
    ctl = '<select class="select"' + common + '>' + (o.blank !== undefined ? '<option value="">' + esc(o.blank) + '</option>' : '') + (o.opts || []).map(function (x) {
      const v = typeof x === 'object' ? x.v : x, l = typeof x === 'object' ? x.l : x;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('') + '</select>';
  } else if (o.type === 'textarea') {
    ctl = '<textarea class="textarea"' + common + ' rows="' + (o.rows || 4) + '">' + esc(val) + '</textarea>';
  } else if (o.type === 'multi') {
    ctl = '<div class="checks" data-multi="' + esc(o.name) + '">' + (o.opts || []).map(function (x) {
      const on = String(val).split(',').indexOf(x.v) >= 0;
      return '<label class="check"><input type="checkbox" value="' + esc(x.v) + '"' + (on ? ' checked' : '') + '> ' + esc(x.l) + '</label>';
    }).join('') + '</div>';
  } else {
    ctl = '<input class="input" type="' + (o.type || 'text') + '"' + common + ' value="' + esc(val) + '"' + (o.pattern ? ' pattern="' + esc(o.pattern) + '"' : '') + (o.min ? ' min="' + o.min + '"' : '') + (o.maxv ? ' max="' + o.maxv + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + ' autocomplete="' + (o.ac || 'off') + '">';
  }
  return '<div class="field" data-f="' + esc(o.name) + '"><label for="' + esc(id) + '">' + esc(o.label) + req + '</label>' + ctl +
    (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : '') + '<div class="err" role="alert"></div></div>';
}
function formData(root) {
  const d = {};
  $$('[name]', root).forEach(function (el) { if (el.type === 'checkbox') return; d[el.name] = el.value; });
  $$('[data-multi]', root).forEach(function (g) { d[g.dataset.multi] = $$('input:checked', g).map(function (i) { return i.value; }); });
  return d;
}
function setErr(root, name, msg) {
  const f = $('[data-f="' + name + '"]', root);
  if (!f) return;
  if (msg) { f.classList.add('invalid'); $('.err', f).textContent = msg; } else { f.classList.remove('invalid'); $('.err', f).textContent = ''; }
}
/** rules: { nama: {label, req, min, max, re, msg, fn} } — validasi sisi klien (server tetap memvalidasi ulang). */
function validate(root, d, rules) {
  let first = null, ok = true;
  Object.keys(rules).forEach(function (k) {
    const r = rules[k], v = d[k];
    const s = Array.isArray(v) ? v.join(',') : String(v === undefined ? '' : v).trim();
    let m = '';
    if (r.req && !s) m = (r.label || k) + ' wajib diisi.';
    else if (s && r.min && s.length < r.min) m = (r.label || k) + ' minimal ' + r.min + ' karakter.';
    else if (s && r.re && !r.re.test(s)) m = r.msg || ((r.label || k) + ' tidak valid.');
    else if (s && r.fn) m = r.fn(s) || '';
    setErr(root, k, m);
    if (m) { ok = false; if (!first) first = k; }
  });
  if (first) { const el = $('[name="' + first + '"]', root) || $('[data-f="' + first + '"]', root); if (el && el.focus) el.focus(); }
  return ok;
}
function readFileB64(file, maxBytes) {
  return new Promise(function (resolve, reject) {
    if (!file) { resolve(null); return; }
    if (file.size > maxBytes) { reject(new Error('Ukuran berkas maksimal 5 MB.')); return; }
    if (['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].indexOf(file.type) < 0) { reject(new Error('Gunakan berkas PDF, PNG, JPG, atau WEBP.')); return; }
    const fr = new FileReader();
    fr.onload = function () { const s = String(fr.result); resolve({ nama: file.name, base64: s.substr(s.indexOf(',') + 1) }); };
    fr.onerror = function () { reject(new Error('Gagal membaca berkas.')); };
    fr.readAsDataURL(file);
  });
}

// ── Komponen kecil ──
function chipStatus(s) { return '<span class="chip st-' + esc(slug(s)) + '">' + esc(s) + '</span>'; }
function urgIdx(u) { const i = S.refs.urgensi.map(function (x) { return x.nama; }).indexOf(u); return i; }
function chipUrg(u) {
  const i = urgIdx(u);
  const cls = i === 0 ? 'u-Mendesak' : i === 1 ? 'u-Sedang' : i === 2 ? 'u-Pemantauan' : 'neutral';
  return '<span class="chip ' + cls + '">' + (i === 0 ? '<i class="bi bi-circle-fill"></i>' : '') + esc(u) + '</span>';
}
function chipLevel(l) { const t = { kritis: 'Kritis', perhatian: 'Perhatian', pantau: 'Pantau' }[l] || l; return '<span class="chip lv-' + esc(l) + '">' + esc(t) + '</span>'; }
function empty(icon, msg, sub) { return '<div class="empty"><i class="bi ' + icon + '"></i><div class="fw6" style="color:var(--text-2)">' + esc(msg) + '</div>' + (sub ? '<div class="xs mt-8">' + esc(sub) + '</div>' : '') + '</div>'; }
function skeleton(n) { let h = '<div class="col gap-12">'; for (let i = 0; i < (n || 3); i++) h += '<div class="skel" style="height:' + (i === 0 ? 96 : 64) + 'px"></div>'; return h + '</div>'; }
function pageHead(crumb, title, sub, actions) {
  return '<div class="page-head"><div class="grow">' + (crumb ? '<div class="crumb">' + esc(crumb) + '</div>' : '') + '<h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + (actions ? '<div class="head-actions">' + actions + '</div>' : '') + '</div>';
}
function errBox(e, retry) {
  return '<div class="card pad">' + empty('bi-cloud-slash', e.message || 'Gagal memuat data.', 'Periksa koneksi lalu coba lagi.') + (retry ? '<div style="text-align:center"><button class="btn" data-act="retry">Muat ulang</button></div>' : '') + '</div>';
}
function pager(info, name) {
  if (!info || info.pages <= 1) return info && info.total ? '<div class="pager"><span class="xs muted">' + info.total + ' data</span></div>' : '';
  const pg = []; const a = Math.max(1, info.page - 2), b = Math.min(info.pages, info.page + 2);
  for (let i = a; i <= b; i++) pg.push('<button class="' + (i === info.page ? 'on' : '') + '" data-act="' + name + '" data-page="' + i + '">' + i + '</button>');
  return '<div class="pager"><span class="xs muted">Halaman ' + info.page + ' dari ' + info.pages + ' · ' + info.total + ' data</span><div class="pgs"><button data-act="' + name + '" data-page="' + (info.page - 1) + '"' + (info.page <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>' + pg.join('') + '<button data-act="' + name + '" data-page="' + (info.page + 1) + '"' + (info.page >= info.pages ? ' disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div></div>';
}
function kelasOpts(blank) { return S.refs.kelas.map(function (k) { return { v: k.id, l: k.nama }; }); }
function namaKelas(id) { const k = S.refs.kelas.filter(function (x) { return x.id === id; })[0]; return k ? k.nama : '-'; }

// ── Grafik ──
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
const KAT_COL = ['#EF4444', '#F59E0B', '#4F46E5', '#8B5CF6', '#0D9488', '#3B82F6', '#64748B', '#EC4899'];

// ── Unduh / pratinjau berkas ──
function b64ToBlob(b64, mime) {
  const bin = atob(b64), n = bin.length, u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
}
// ── Pratinjau dokumen ──
// Peramban memblokir PDF di dalam bingkai ber-sandbox (halaman Apps Script), jadi:
//  • surat/laporan buatan aplikasi dipratinjau sebagai HTML dari blok yang sama dengan PDF-nya,
//  • PDF lain digambar dengan pdf.js (cdnjs), dan bila gagal tetap tersedia tombol Unduh.
var _pdfP = null;
function loadPdfJs() {
  if (_pdfP) return _pdfP;
  const B = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  _pdfP = new Promise(function (res, rej) {
    if (window.pdfjsLib) return res();
    const s = document.createElement('script'); s.src = B + 'pdf.min.js'; s.onload = function () { res(); }; s.onerror = function () { rej(new Error('pdf.js')); };
    document.head.appendChild(s);
  }).then(function () { return fetch(B + 'pdf.worker.min.js'); }).then(function (r) { if (!r.ok) throw new Error('worker'); return r.text(); })
    .then(function (t) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([t], { type: 'text/javascript' })); return window.pdfjsLib; });
  _pdfP.catch(function () { _pdfP = null; });
  return _pdfP;
}
function renderPdfInto(el, b64) {
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  el.innerHTML = '<div class="muted xs" style="padding:24px">Memuat pratinjau…</div>';
  return loadPdfJs().then(function (lib) { return lib.getDocument({ data: u8 }).promise; }).then(function (pdf) {
    el.innerHTML = '';
    const n = Math.min(pdf.numPages, 20);
    let chain = Promise.resolve();
    for (let i = 1; i <= n; i++) {
      chain = chain.then(function () { return pdf.getPage(i); }).then(function (page) {
        const w = Math.max(280, el.clientWidth - 16);
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: (w / vp0.width) * (window.devicePixelRatio || 1) });
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = '100%'; c.className = 'pdf-page';
        el.appendChild(c);
        return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      });
    }
    return chain;
  }).catch(function () {
    el.innerHTML = '<div style="padding:24px;text-align:center" class="muted">Pratinjau PDF tidak dapat ditampilkan di peramban ini.<br>Gunakan tombol <b>Unduh</b> untuk membukanya.</div>';
  });
}
/** Kertas A4 dari blok dokumen (sama dengan yang dikirim ke pembuat PDF di server). */
function renderBlokHtml(blok) {
  const K = KOP || {}, ks = KERTAS_CSS[K.kertas] || KERTAS_CSS.A4;
  return '<div class="paper-wrap"><div class="paper" style="width:' + ks.px + 'px;min-height:' + ks.tinggi + 'px;font-family:' + esc(hurufCss(K.huruf)) + '">' + blok.map(function (b) {
    if (b.t === 'kop') {
      const teks = b.baris.map(function (r) { return '<div style="font-size:' + (r.size || 12) + 'pt;font-weight:' + (r.bold ? 700 : 400) + '">' + esc(r.text) + '</div>'; }).join('');
      const lg = (b.logoKiri || b.logoKanan) && (K.logoKiri || K.logoKanan);
      if (!lg) return '<div class="p-kop">' + teks + '</div><div class="p-rule"></div>';
      return '<div class="p-kop berlogo"><div class="p-lg">' + (K.logoKiri ? '<img alt="" src="' + K.logoKiri + '">' : '') + '</div><div>' + teks + '</div><div class="p-lg">' + (K.logoKanan ? '<img alt="" src="' + K.logoKanan + '">' : '') + '</div></div><div class="p-rule"></div>';
    }
    if (b.t === 'h') return '<div class="p-h' + (b.size === 1 ? '1' : '2') + (b.center ? ' c' : '') + '">' + esc(b.text) + '</div>';
    if (b.t === 'p') {
      const cls = 'p-p' + (b.center ? ' c' : '') + (b.right ? ' r' : '') + (b.justify ? ' j' : '') + (b.indent ? ' i' : '') + (b.bold ? ' b' : '') + (b.underline ? ' u' : '');
      return '<p class="' + cls + '" style="margin:' + (b.before || 0) + 'pt 0 ' + (b.after === undefined ? 6 : b.after) + 'pt;' + (b.size ? 'font-size:' + b.size + 'pt;' : '') + '">' + (esc(b.text) || '&nbsp;') + '</p>';
    }
    if (b.t === 'kv') return '<table class="p-kv" style="' + (b.indent ? 'margin-left:36pt' : '') + '">' + b.rows.map(function (r, i) { return '<tr><td>' + esc(r[0]) + '</td><td' + (b.bold && b.bold.indexOf(i) >= 0 ? ' class="b"' : '') + '>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    if (b.t === 'ttd') {
      const col = function (ls, bi) { return '<div>' + ls.map(function (l, i) { return '<div class="' + (i === bi && l ? 'b u' : '') + '">' + (l === null ? '&nbsp;' : (esc(l) || '&nbsp;')) + '</div>'; }).join('') + '</div>'; };
      return '<div class="p-ttd">' + col(b.kiri, b.bKiri === undefined ? -1 : b.bKiri) + col(b.kanan, b.bKanan === undefined ? b.kanan.length - 2 : b.bKanan) + '</div>';
    }
    if (b.t === 'table') return '<table class="p-tbl">' + b.rows.map(function (r, i) { return '<tr>' + r.map(function (c) { return (i === 0 && b.header ? '<th>' : '<td>') + esc(c) + (i === 0 && b.header ? '</th>' : '</td>'); }).join('') + '</tr>'; }).join('') + '</table>';
    if (b.t === 'hr') return '<div class="p-rule thin"></div>';
    if (b.t === 'br') return '<div style="height:10pt"></div>';
    return '';
  }).join('') + '</div></div>';
}
function fitPaper(root) {
  const wrap = $('.paper-wrap', root); if (!wrap) return;
  const paper = $('.paper', wrap);
  const avail = wrap.parentElement.clientWidth - 8, lebar = paper.offsetWidth || 794;
  const sc = Math.min(1, avail / lebar);
  paper.style.transform = 'scale(' + sc + ')';
  wrap.style.height = Math.ceil(paper.offsetHeight * sc) + 'px';
  wrap.style.width = Math.ceil(lebar * sc) + 'px';
}
/** Modal pratinjau dengan tombol Tutup dan Unduh. file = {nama, mime, base64, blok?} */
function previewFile(file) {
  const blob = b64ToBlob(file.base64, file.mime);
  const url = URL.createObjectURL(blob);
  const isImg = /^image\//.test(file.mime), isPdf = file.mime === 'application/pdf';
  const body = '<div class="preview' + (file.blok || isPdf ? ' doc' : '') + '" id="pv-body">' + (file.blok ? renderBlokHtml(file.blok) : isImg ? '<img alt="' + esc(file.nama) + '" src="' + url + '">' : isPdf ? '' : empty('bi-file-earmark', 'Pratinjau tidak tersedia untuk jenis berkas ini')) + '</div>';
  const m = openModal({ title: file.nama, sub: file.blok ? 'Pratinjau dokumen · berkas PDF tersimpan di Drive' : file.mime, size: 'lg', body: body, foot: '<button class="btn" data-close><i class="bi bi-x-lg"></i> Tutup</button><button class="btn primary" data-dl><i class="bi bi-download"></i> Unduh PDF</button>', onClose: function () { setTimeout(function () { URL.revokeObjectURL(url); }, 500); } });
  $('[data-dl]', m.el).addEventListener('click', function () { downloadBlob(blob, file.nama); });
  if (file.blok) {
    const ft = $('[data-dl]', m.el).parentElement, b = document.createElement('button');
    b.className = 'btn'; b.innerHTML = '<i class="bi bi-printer"></i> Cetak';
    ft.insertBefore(b, $('[data-dl]', m.el));
    b.addEventListener('click', function () {
      siapKop().then(function () {
        m.close();
        cetakHtml('<div class="pr-surat">' + renderBlokHtml(file.blok) + '</div>', { judul: file.nama.replace(/\.pdf$/i, ''), ket: 'Kertas ' + kertasNama() + ' tegak', margin: '0', polos: true });
      });
    });
  }
  const pv = $('#pv-body', m.el);
  if (file.blok) { fitPaper(m.el); setTimeout(function () { fitPaper(m.el); }, 150); }
  else if (isPdf && pv) renderPdfInto(pv, file.base64);
}
function bukaBerkas(id, btn) {
  const p = api('berkas.ambil', { id: id });
  (btn ? run(btn, p) : p).then(previewFile).catch(fail);
}

'use strict';
// ════════════════════════════════════════════════════════════
// Autentikasi, shell, navigasi (router SPA)
// ════════════════════════════════════════════════════════════
const ACT = {};      // registri aksi data-act
const PAGES = {};    // registri halaman

function show(id, on) { $(id).classList.toggle('hide', !on); }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#08111F' : '#0A2A66';
  const b = $('#theme-btn'); if (b) b.innerHTML = '<i class="bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars') + '"></i>';
}
function initTheme() {
  let t = lstore('sk_theme');
  if (t !== 'dark' && t !== 'light') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  applyTheme(t);
}
ACT.theme = function () {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  lstore('sk_theme', t); applyTheme(t);
  if (S.page && S.user) navigateTo(S.page, S.params, true);
};

// ── Halaman masuk ──
/** Lambang aplikasi SIKOLAB BK (tertanam di Stylesheet, tanpa unduhan tambahan). */
function logoHtml() { return '<span class="logo-emblem" role="img" aria-label="Logo SIKOLAB BK"></span>'; }
function logoSekolah(cfg) { return cfg && cfg.logoUrl && /^(https:\/\/|data:image\/(png|jpeg);base64,)/i.test(cfg.logoUrl) ? '<img class="sch-logo" alt="" src="' + esc(cfg.logoUrl) + '" onerror="this.remove()">' : ''; }
const JURUS7 = ['Kenali Potensi', 'Kelola Emosi', 'Tumbuhkan Resiliensi', 'Jaga Konsistensi', 'Jalin Koneksi', 'Bangun Kolaborasi', 'Menata Situasi'];
// ── Kerangka halaman masuk: panel identitas (biru pendidikan + aksen emas) + panel formulir ──
function authLayout(inner, st) {
  st = st || {};
  show('#splash', false); show('#shell', false); show('#login-root', true);
  const thn = new Date().getFullYear();
  $('#login-root').innerHTML =
    '<div class="auth"><aside class="auth-brand">' +
      '<div class="ab-top"><span class="ab-pill"><i class="bi bi-shield-check"></i> Portal Layanan Bimbingan dan Konseling</span></div>' +
      '<div class="ab-mid"><div class="ab-logo"><span class="logo-full" role="img" aria-label="Logo SIKOLAB BK"></span></div>' +
        '<h1>Setiap murid berhak<br><span>dibimbing dan didengar.</span></h1>' +
        '<p class="ab-lead">Satu ruang kerja bagi guru mata pelajaran, wali kelas, dan Guru BK untuk mendampingi murid sejak dini: layanan untuk semua, kolaboratif, dan menjaga kerahasiaan.</p>' +
        '<div class="ab-jurus"><div class="ab-jurus-h"><i class="bi bi-stars"></i> Selaras dengan 7 Jurus BK Hebat</div><div class="ab-jurus-l">' + JURUS7.map(function (j, i) { return '<span><b>' + (i + 1) + '</b>' + esc(j) + '</span>'; }).join('') + '</div></div>' +
      '</div>' +
      '<div class="ab-foot"><div>' + logoSekolah(st) + (st.namaSekolah ? '<b>' + esc(st.namaSekolah) + '</b>' : '<b>SIKOLAB BK</b>') + '<span>' + (st.tahunAjaran ? 'Tahun Ajaran ' + esc(st.tahunAjaran) + ' · Semester ' + esc(st.semester || '') : 'Sistem Informasi Kolaborasi Bimbingan dan Konseling') + '</span></div><span class="ab-copy">© ' + thn + ' SIKOLAB BK</span></div>' +
    '</aside>' +
    '<main class="auth-main"><div class="auth-stripe" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<div class="auth-mobile-head"><span class="logo-full sm" role="img" aria-label="Logo SIKOLAB BK"></span><div><b>SIKOLAB BK</b><span>' + esc(st.namaSekolah || 'Sistem Informasi Kolaborasi Bimbingan dan Konseling') + '</span></div></div>' +
    '<div class="auth-card">' + inner + '</div>' +
    '<div class="auth-trust"><span><i class="bi bi-lock-fill"></i> Sambungan terenkripsi</span><span><i class="bi bi-person-check"></i> Akses sesuai peran</span><span><i class="bi bi-journal-check"></i> Setiap akses tercatat</span></div>' +
    '<p class="kredit">Dikembangkan oleh ' + PENGEMBANG + ' · ' + PENGEMBANG_SEKOLAH + '</p></main></div>';
}
function renderBelum() {
  authLayout('<div class="a-kicker">Pemberitahuan</div><h2>Aplikasi belum disiapkan</h2><p class="muted mt-8">Pemilik aplikasi perlu menyelesaikan pengaturan awal terlebih dahulu. Hubungi admin sekolah Anda.</p>' +
    '<div class="note info mt-16"><i class="bi bi-info-circle"></i><div class="xs">Bila Anda pemilik proyek tetapi halaman ini yang muncul, buka kembali alamat aplikasi dengan akun Google yang sama dengan yang memasang skrip, atau jalankan <code>setupAppEnvironment</code> dari editor Apps Script.</div></div>');
}
function renderSetup(st) {
  const now = new Date(), y = now.getFullYear(), gen = now.getMonth() >= 6;
  authLayout('<div class="a-kicker">Langkah pertama</div><h2>Pengaturan awal</h2><p class="muted mt-8" style="margin-top:4px">Anda masuk sebagai pemilik (<b>' + esc(st.ownerEmail) + '</b>). Isi data sekolah; semua dapat diubah nanti di menu Administrasi.</p>' +
    '<form id="setup-form" class="form-grid c2 mt-16" novalidate>' +
    '<div style="grid-column:1/-1">' + fld({ name: 'nama_sekolah', label: 'Nama sekolah', req: true, max: 120, ph: 'SMA Negeri 1 …' }) + '</div>' +
    fld({ name: 'kota', label: 'Kota / kabupaten', max: 60 }) + fld({ name: 'nama_admin', label: 'Nama Anda', max: 100, ph: 'Nama lengkap dengan gelar' }) +
    fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, max: 9, value: gen ? y + '/' + (y + 1) : (y - 1) + '/' + y, hint: 'Format 2026/2027' }) +
    fld({ name: 'semester', label: 'Semester', type: 'select', value: gen ? 'Ganjil' : 'Genap', opts: ['Ganjil', 'Genap'] }) +
    '<div style="grid-column:1/-1" class="col gap-8">' +
    '<label class="check"><input type="checkbox" name="jugabk" checked> Saya juga Guru BK di sekolah ini</label>' +
    '<label class="check"><input type="checkbox" name="contoh"> Isi dengan data contoh untuk mencoba (dapat dihapus kapan saja)</label></div></form>' +
    '<div id="setup-err" class="note rose mt-12 hide" role="alert"></div>' +
    '<button class="btn dark block mt-16" id="setup-go" style="height:46px">Siapkan aplikasi</button>' +
    '<p class="xs muted mt-12">Proses ini membuat folder Drive, Spreadsheet basis data, akun admin Anda, serta pengingat dan cadangan harian. Memerlukan ± 20–40 detik.</p>', st);
  $('#setup-go').addEventListener('click', function (e) {
    const f = $('#setup-form'), d = formData(f);
    const ok = validate(f, d, { nama_sekolah: { label: 'Nama sekolah', req: true }, tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' } });
    if (!ok) return;
    $('#setup-err').classList.add('hide');
    const p = { nama_sekolah: d.nama_sekolah, kota: d.kota, nama_admin: d.nama_admin, tahun_ajaran: d.tahun_ajaran, semester: d.semester, bukan_bk: !f.querySelector('[name=jugabk]').checked, contoh: f.querySelector('[name=contoh]').checked };
    run(e.currentTarget, api('setup.run', p)).then(function (r) { setupSelesai(r); })
      .catch(function (err) { const b = $('#setup-err'); b.textContent = err.message; b.classList.remove('hide'); });
  });
}
function setupSelesai(r) {
  authLayout('<div class="a-kicker">Berhasil</div><h2>Aplikasi siap dipakai</h2><p class="muted mt-8" style="margin-top:4px">Catat akun admin Anda. <b>PIN hanya ditampilkan sekali ini.</b></p>' +
    '<div class="note info mt-16"><div style="width:100%"><div class="xs muted">Email</div><div class="fw6">' + esc(r.email) + '</div><div class="xs muted mt-8">PIN</div><div class="mono" style="font-size:28px;letter-spacing:6px">' + esc(r.pin || '—') + '</div></div></div>' +
    '<ul class="muted-2 xs" style="padding-left:18px;line-height:20px;margin-top:12px"><li>Anda akan diminta mengganti PIN awal ini saat masuk pertama. Ubah lagi kapan saja lewat Akun saya.</li><li>' + (r.trigger ? 'Pengingat dan cadangan harian sudah terpasang.' : 'Pengingat harian belum terpasang; pasang dari Administrasi → Pengaturan.') + '</li><li>' + (r.contoh ? 'Data contoh terisi. Hapus dari Administrasi → Pengaturan → Pemeliharaan sebelum dipakai sungguhan.' : 'Mulai isi kelas, pengguna, dan murid di menu Administrasi.') + '</li></ul>' +
    '<button class="btn dark block mt-16" id="setup-masuk" style="height:46px">Masuk sekarang</button>');
  $('#setup-masuk').addEventListener('click', function (e) {
    run(e.currentTarget, api('auth.login', { email: r.email, pin: r.pin })).then(function (t) {
      lstore('sk_ingat', '1'); lstore('sk_email_terakhir', r.email);
      S.token = t.token; sset('sk_token', t.token); sset('sk_manual', '1'); S.mode = '';
      if (t.boot) { show('#login-root', false); return terimaBoot(t.boot, null); }
      return startApp();
    }).catch(fail);
  });
}
function renderLogin(st) {
  if (st && st.state === 'setup') return renderSetup(st);
  if (st && st.state === 'belum') return renderBelum();
  const cfg = st || {};
  authLayout('<form id="login-form" novalidate><div class="a-kicker">Selamat datang</div><h2>Masuk ke akun Anda</h2><p class="muted mt-8" style="margin-top:4px">' + esc(cfg.namaSekolah || 'Gunakan email dan PIN yang diberikan admin sekolah.') + '</p>' +
    (st && st.state === 'denied' ? '<div class="note rose mt-16"><i class="bi bi-shield-exclamation"></i><div>Akun Google <b>' + esc(st.email) + '</b> belum terdaftar atau tidak aktif. Hubungi admin sekolah, atau masuk dengan email dan PIN di bawah.</div></div>' : '') +
    '<div class="form-grid mt-16">' +
    '<div class="field ifield" data-f="email"><label for="f_email">Email</label><div class="iwrap"><i class="bi bi-envelope"></i><input class="input" id="f_email" name="email" type="email" required autocomplete="username" placeholder="nama@sekolah.sch.id" inputmode="email"></div><div class="err" role="alert"></div></div>' +
    '<div class="field ifield" data-f="pin"><label for="f_pin">PIN 6 digit</label><div class="iwrap"><i class="bi bi-key"></i><input class="input" id="f_pin" name="pin" type="password" required maxlength="6" inputmode="numeric" autocomplete="current-password" placeholder="••••••"><button type="button" class="eye" data-act="pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div><div class="err" role="alert"></div></div>' +
    '</div><label class="check mt-12"><input type="checkbox" name="ingat"' + (lstore('sk_ingat') === '0' ? '' : ' checked') + '> Ingat saya di perangkat ini (30 hari)</label><div class="xs muted" style="margin:2px 0 0 26px">Jangan dicentang di komputer bersama.</div>' +
    '<div id="login-err" class="note rose mt-12 hide" role="alert"></div>' +
    '<button class="btn primary block mt-16 btn-login" type="submit">Masuk <i class="bi bi-arrow-right"></i></button>' +
    '<p class="xs muted mt-16" style="text-align:center">Lupa PIN? Hubungi admin sekolah untuk mengatur ulang.</p></form>', st);
  const f = $('#login-form');
  const terakhir = lstore('sk_email_terakhir');
  if (terakhir) { $('[name=email]', f).value = terakhir; setTimeout(function () { try { $('[name=pin]', f).focus(); } catch (x) { } }, 60); }
  // PIN 6 digit lengkap → langsung masuk (tanpa harus menekan tombol)
  $('[name=pin]', f).addEventListener('input', function (e) { if (/^\d{6}$/.test(e.target.value) && /\S+@\S+\.\S+/.test($('[name=email]', f).value) && !$('button[type=submit]', f).classList.contains('loading')) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit')); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    const d = formData(f);
    d.email = d.email.trim().toLowerCase();
    const ingat = $('[name=ingat]', f).checked;
    const ok = validate(f, d, { email: { label: 'Email', req: true, re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Format email tidak valid.' }, pin: { label: 'PIN', req: true, re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.' } });
    if (!ok) return;
    const btn = $('button[type=submit]', f);
    $('#login-err').classList.add('hide');
    lstore('sk_ingat', ingat ? '1' : '0');
    run(btn, api('auth.login', { email: d.email, pin: d.pin, ingat: ingat, mode: lstore('sk_mode_' + d.email) || '' })).then(function (r) {
      lstore('sk_email_terakhir', d.email);
      S.token = r.token; sset('sk_token', r.token); sset('sk_manual', '1'); S.mode = '';
      // Login sekali jalan: data awal aplikasi sudah ikut dalam jawaban login.
      if (r.boot) { show('#login-root', false); return terimaBoot(r.boot, null); }
      return startApp();
    }).catch(function (err) { const b = $('#login-err'); b.textContent = err.message; b.classList.remove('hide'); $('[name=pin]', f).value = ''; $('[name=pin]', f).focus(); });
  });
}
ACT['pin-eye'] = function (el) {
  const i = $('input', el.parentElement), show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  el.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>';
  el.setAttribute('aria-label', show ? 'Sembunyikan PIN' : 'Tampilkan PIN');
};

// ── Pilihan peran (satu akun, beberapa peran) ──
const ROLE_ICON = { guru_mapel: 'bi-journal-text', wali_kelas: 'bi-people', guru_bk: 'bi-heart-pulse', waka: 'bi-shield-check', kepsek: 'bi-building', admin: 'bi-gear' };
function renderPilihPeran(b) {
  authLayout('<div class="a-kicker">Satu akun, beberapa peran</div><h2>Masuk sebagai apa?</h2><p class="muted mt-8" style="margin-top:4px">Halo, <b>' + esc(b.user.nama) + '</b>. Pilih peran untuk sesi ini. Anda dapat menggantinya kapan saja dari menu samping.</p>' +
    '<div class="role-pick mt-16">' + b.pilihanPeran.map(function (r) {
      return '<button class="role-opt" data-act="pilih-peran" data-role="' + esc(r.role) + '"><span class="ro-ic"><i class="bi ' + (ROLE_ICON[r.role] || 'bi-person') + '"></i></span><span class="ro-tx"><b>' + esc(r.label) + '</b><span>' + esc(r.ket) + '</span></span><i class="bi bi-chevron-right ro-go"></i></button>';
    }).join('') + '</div>' +
    '<button class="btn ghost block mt-16" data-act="logout-langsung"><i class="bi bi-box-arrow-left"></i> Bukan Anda? Keluar</button>', b.config);
}
ACT['pilih-peran'] = function (el) {
  S.mode = el.dataset.role; sset('sk_mode', S.mode);
  if (S.email) { lstore('sk_mode_' + S.email, S.mode); sset('sk_email', S.email); }
  el.classList.add('loading');
  startApp(true).catch(fail);
};
ACT['ganti-peran'] = function () {
  ccClear(); S.mode = ''; sset('sk_mode', null); if (S.email) lhapus('sk_mode_' + S.email); closeAllOverlays(); killCharts();
  show('#shell', false);
  startApp().catch(fail);
};
ACT['logout-langsung'] = function () {
  ccClear();
  const tok = S.token;
  hapusSesiLokal(); sset('sk_manual', '1'); lstore('sk_manual', '1');
  S.user = null; S.token = ''; S.mode = '';
  tampilMasuk();
  if (tok) google.script.run.api(tok, 'auth.logout', {});
};

function sessionLost() {
  clearTimeout(CC_TMR); ccClear(); clearTimeout(CC_TMR);
  hapusSesiLokal();
  closeAllOverlays(); S.user = null; S.token = ''; S.mode = '';
  show('#shell', false);
  tampilMasuk('Sesi berakhir. Silakan masuk kembali.');
}
ACT.logout = function () {
  const antre = obMuat().length;
  confirmDlg(antre ? 'Masih ada ' + antre + ' data yang sedang dikirim ke server. Data itu tetap tersimpan di perangkat ini dan terkirim saat Anda masuk lagi dengan akun yang sama. Tetap keluar?' : 'Keluar dari aplikasi?', 'Keluar', !!antre, 'Keluar').then(function (ok) {
    if (!ok) return;
    ccClear(); clearTimeout(CC_TMR);
    const tok = S.token;
    hapusSesiLokal(); sset('sk_manual', '1'); lstore('sk_manual', '1');
    S.user = null; S.token = ''; S.mode = ''; closeAllOverlays(); killCharts();
    show('#shell', false);
    tampilMasuk();
    // Keluar dari server di latar belakang (layar masuk sudah tampil).
    if (tok) google.script.run.api(tok, 'auth.logout', {});
  });
};

// ── Shell ──
function renderShell() {
  const u = S.user, cfg = S.cfg;
  const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
  const cari = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka', 'admin']);
  $('#sidebar').innerHTML =
    '<div class="sb-brand"><div class="logo">' + logoHtml(cfg) + '</div><div><b>SIKOLAB BK</b><span>Kolaborasi Bimbingan</span></div></div>' +
    '<div class="sb-school">' + logoSekolah(cfg) + '<div><b>' + esc(cfg.namaSekolah) + '</b><div class="xs">Semester ' + esc(cfg.semester) + ' ' + esc(cfg.tahunAjaran) + '</div></div></div>' +
    '<nav class="sb-nav"><div class="lbl">Menu utama</div>' + S.menu.map(function (m) {
      return '<button class="nav-item" data-act="nav" data-page="' + esc(m.id) + '" title="' + esc(m.label) + '"><i class="bi ' + esc(m.icon) + '"></i><span>' + esc(m.label) + '</span>' + (m.badge ? '<em class="badge-r" style="font-style:normal">' + esc(m.badge) + '</em>' : '') + '</button>';
    }).join('') + '</nav>' +
    '<div class="sb-foot"><div class="role-card"><div class="avatar">' + esc(u.inisial) + '</div><div class="grow"><b class="trunc">' + esc(u.nama) + '</b><span>' + esc(u.peran.join(' · ')) + '</span></div></div>' +
    '<button class="nav-item mt-8" data-act="akun" title="Akun saya"><i class="bi bi-person-gear"></i><span>Akun saya</span></button>' + (u.allRoles && u.allRoles.length > 1 ? '<button class="nav-item mt-8" data-act="ganti-peran" title="Ganti peran"><i class="bi bi-arrow-left-right"></i><span>Ganti peran</span></button>' : '') + '<button class="nav-item mt-8" data-act="logout" title="Keluar"><i class="bi bi-box-arrow-right"></i><span>Keluar</span></button><div class="kredit sb-kredit" title="Dikembangkan oleh ' + PENGEMBANG + ', ' + PENGEMBANG_SEKOLAH + '">SIKOLAB BK v' + VERSI_APP + ' · © ' + PENGEMBANG + '</div></div>';
  $('#topbar').innerHTML =
    '<button class="icon-btn" id="burger" data-act="sidebar" aria-label="Buka menu"><i class="bi bi-list"></i></button>' +
    (cari ? '<div class="search"><i class="bi bi-search"></i><input id="gsearch" type="search" placeholder="' + (window.innerWidth < 600 ? 'Cari murid…' : 'Cari murid (nama atau NIS)…') + '" autocomplete="off" aria-label="Cari murid"><div class="search-res hide" id="gres"></div></div>' : '<div class="grow"></div>') +
    '<div class="grow"></div>' +
    '<span class="top-chip"><i class="bi bi-calendar3"></i>' + esc(cfg.semester) + ' ' + esc(cfg.tahunAjaran) + '</span>' +
    '<span class="jam-chip" id="jam-chip" title="Waktu sekarang (WIB)"></span>' +
    (lapor ? '<button class="btn primary only-md" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '') +
    '<button class="icon-btn" id="theme-btn" data-act="theme" aria-label="Ganti tema"></button>' +
    '<button class="icon-btn" id="bell" data-act="bell" aria-label="Notifikasi"><i class="bi bi-bell"></i><span class="dot hide" id="bell-dot"></span></button>' +
    '<div class="top-user" data-act="akun" style="cursor:pointer" title="Akun saya"><div class="avatar">' + esc(u.inisial) + '</div><div><b>' + esc(u.nama) + '</b><span>' + esc(u.peran[0]) + '</span></div></div>';
  jamTampil();
  // Bottom nav: 4 menu + tombol tengah (+)
  const items = S.menu.filter(function (m) { return m.id !== 'lapor' && m.id !== 'admin'; }).slice(0, 4);
  const bi = function (m) { return '<button class="bn-item" data-act="nav" data-page="' + esc(m.id) + '"><i class="bi ' + esc(m.icon) + '"></i><span>' + esc(m.label.split(' ')[0]) + '</span></button>'; };
  let bn = items.slice(0, 2).map(bi).join('');
  bn += lapor ? '<button class="bn-fab" data-act="nav" data-page="lapor" aria-label="Lapor kejadian"><i class="bi bi-plus-lg"></i></button>' : '';
  bn += items.slice(2).map(bi).join('');
  bn += '<button class="bn-item" data-act="sidebar"><i class="bi bi-list"></i><span>Menu</span></button>';
  $('#bottom-nav').innerHTML = bn;
  applyTheme(document.documentElement.getAttribute('data-theme'));
  const gs = $('#gsearch');
  if (gs) {
    gs.addEventListener('input', debounce(function () { globalSearch(gs.value.trim()); }, 260));
    gs.addEventListener('focus', function () { if (gs.value.trim().length >= 2) globalSearch(gs.value.trim()); });
  }
}
ACT.sidebar = function () { $('#sidebar').classList.toggle('open'); $('#scrim').classList.toggle('on', $('#sidebar').classList.contains('open')); };
$('#scrim').addEventListener('click', function () { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); });
function setNavActive(page) {
  $$('.nav-item[data-page]').forEach(function (b) { b.classList.toggle('active', b.dataset.page === page); });
  $$('.bn-item[data-page]').forEach(function (b) { b.classList.toggle('active', b.dataset.page === page); });
}

// ── Pencarian global ──
function globalSearch(q) {
  const box = $('#gres'); if (!box) return;
  if (q.length < 2) { box.classList.add('hide'); return; }
  apiC('murid.cari', { q: q }).then(function (rows) {
    box.classList.remove('hide');
    box.innerHTML = rows.length ? rows.slice(0, 8).map(function (m) {
      return '<button data-act="open-murid" data-id="' + esc(m.id) + '"><div class="avatar" style="width:32px;height:32px;font-size:11px">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + '</div></div>' + (m.pola ? chipLevel(m.pola) : '') + '</button>';
    }).join('') : '<div class="empty xs" style="padding:16px">Tidak ada murid yang cocok.</div>';
  }).catch(function () { box.classList.add('hide'); });
}
ACT['open-murid'] = function (el) {
  const g = $('#gres'); if (g) g.classList.add('hide'); const gs = $('#gsearch'); if (gs) gs.value = '';
  navigateTo('riwayat', { id_murid: el.dataset.id });
};
document.addEventListener('click', function (e) {
  if (!e.target.closest('.search')) { const g = $('#gres'); if (g) g.classList.add('hide'); }
  if (!e.target.closest('.pop') && !e.target.closest('#bell')) closePop();
});

// ── Notifikasi ──
function closePop() { const p = $('#pop-notif'); if (p) p.remove(); }
function updateBell() {
  const d = $('#bell-dot'); if (!d) return;
  d.classList.toggle('hide', !S.notif.total); d.textContent = S.notif.total > 9 ? '9+' : S.notif.total;
}
function loadNotif() {
  if (!S.user || document.hidden) return;
  api('notif.get', {}, true).then(function (n) { S.notif = n; updateBell(); }).catch(function () { });
}
ACT.bell = function () {
  if ($('#pop-notif')) { closePop(); return; }
  const n = S.notif;
  const el = document.createElement('div'); el.className = 'pop'; el.id = 'pop-notif';
  el.innerHTML = notifHtml(n);
  $('#topbar').style.position = 'sticky'; $('#topbar').appendChild(el);
};
function notifHtml(n) {
  return '<div class="row between" style="padding:10px 14px;border-bottom:1px solid var(--border);gap:8px"><b class="fw7" style="font-family:var(--font-h)">Notifikasi</b>' +
    (n.adaDibaca ? '<button class="btn sm ghost" data-act="notif-baca" title="Pemberitahuan peristiwa tidak dihitung lagi. Tugas (mis. kasus dilimpahkan) tetap tampil sampai dikerjakan."><i class="bi bi-check2-all"></i> Tandai sudah dibaca</button>' : '<span class="xs muted">' + n.total + ' belum dibaca</span>') + '</div>' +
    (n.items.length ? n.items.map(function (x, i) {
      const ic = { monitoring: 'bi-alarm', rujukan: 'bi-inbox', pola: 'bi-exclamation-triangle', tahun: 'bi-calendar-event', harian: 'bi-calendar-check', kasus: 'bi-folder2-open', temu: 'bi-person-raised-hand', kapasitas: 'bi-database', limpah: 'bi-arrow-left-right', poin: 'bi-award' }[x.tipe] || 'bi-bell';
      return '<button class="p-item' + (x.baru === false ? ' dibaca' : '') + '" data-act="notif-go" data-i="' + i + '"><i class="bi ' + ic + '" style="font-size:18px;color:var(--indigo)"></i><div class="grow"><div class="fw6">' + esc(x.judul) + '</div><div class="xs muted">' + esc(x.sub) + '</div></div>' + (x.baru !== false && x.ts ? '<span class="nt-dot" aria-label="baru"></span>' : '') + '</button>';
    }).join('') : empty('bi-bell-slash', 'Tidak ada notifikasi baru'));
}
ACT['notif-baca'] = function () {
  const n = S.notif; if (!n) return;
  n.items.forEach(function (x) { if (x.ts) x.baru = false; });
  n.total = n.items.filter(function (x) { return x.baru !== false; }).length; n.adaDibaca = false;
  updateBell(); const pop = $('#pop-notif'); if (pop) pop.innerHTML = notifHtml(n);
  api('notif.baca', {}, true).then(function (r) { S.notif = r; updateBell(); }).catch(function () { });
};
ACT['notif-go'] = function (el) {
  const x = S.notif.items[+el.dataset.i]; closePop();
  if (!x) return;
  navigateTo(x.go || 'beranda', x.go === 'kasus' && x.id ? { open: x.id } : (x.go === 'poin' && x.id ? { id_murid: x.id, tab: 'daftar' } : (x.tab ? { tab: x.tab } : (x.filter ? { filter: x.filter } : {}))));
};

// ── Router SPA ──
function navigateTo(page, params, keepScroll, quiet) {
  if (!PAGES[page]) page = 'beranda';
  if (!S.menu.some(function (m) { return m.id === page; })) page = 'beranda';
  if (S.page === 'pindai' && page !== 'pindai' && typeof PND !== 'undefined') PND.berhenti();
  const tok = ++S.navTok;
  S.page = page; S.params = params || {};
  S.touched = false;
  S.recPage = Object.keys(S.params).length ? '' : page; S.recUntil = Date.now() + 4000;
  killCharts(); closePop();
  $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on');
  setNavActive(page);
  const c = $('#app-container');
  if (!quiet) c.innerHTML = skeleton(3);
  if (!keepScroll) window.scrollTo(0, 0);
  Promise.resolve().then(function () { return PAGES[page](S.params, tok); }).catch(function (e) {
    if (tok !== S.navTok) return;
    c.innerHTML = errBox(e, true);
  });
}
function stale(tok) { return tok !== S.navTok; }
ACT.nav = function (el) { navigateTo(el.dataset.page, {}); };
ACT.retry = function () { navigateTo(S.page, S.params, true); };

// Halaman yang sudah disentuh pengguna tidak digambar ulang otomatis oleh pembaruan latar belakang.
['click', 'input', 'change'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { const c = $('#app-container'); if (c && c.contains(e.target)) S.touched = true; }, true);
});
// Delegasi klik global: <... data-act="nama">
document.addEventListener('click', function (e) {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled || t.classList.contains('loading')) return;
  const fn = ACT[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t, e); }
});

// ── Mulai aplikasi ──
// Data boot terakhir disimpan di sessionStorage sehingga saat halaman dibuka ulang, aplikasi langsung tampil,
// lalu diperbarui diam-diam dari server.
function bootKey() { return 'sk_boot_' + (sget('sk_email') || S.token || 'g') + '_' + (S.mode || ''); }
function applyBoot(b, dariCache) {
  S.mode = b.user.mode || '';
  S.user = b.user; ccMuatSimpanan(); S.cfg = b.config; S.menu = b.menu; S.refs = b.refs; S.today = b.hariIni; S.kelasWali = b.kelasWali || []; S.kelasAkses = b.kelasAkses || null; S.batasKoreksi = b.batasKoreksi; S.jamMaks = b.jamMaks || 10; S.saranTA = b.saranTA || null;
  if (b.notif) S.notif = b.notif;
  document.title = (b.config.namaSekolah ? b.config.namaSekolah + ' · ' : '') + 'SIKOLAB BK';
  show('#splash', false); show('#login-root', false); show('#shell', true);
  renderShell();
  updateBell();
}
function startApp(bolehCache) {
  show('#login-root', false);
  let cached = null;
  if (bolehCache) { try { cached = JSON.parse(sget(bootKey()) || 'null'); } catch (e) { cached = null; } }
  if (cached && cached.user) {
    // Tampil seketika dari data terakhir di perangkat, lalu diperbarui diam-diam.
    applyBoot(cached, true);
    S.pre = cached.beranda ? { beranda: cached.beranda } : null;
    navigateTo('beranda', {});
  }
  return api('boot').then(function (b) { terimaBoot(b, cached); });
}
/** Olah data awal dari server (dari "boot" atau langsung dari login). */
function terimaBoot(b, cached) {
  if (b.user && b.user.email) S.email = b.user.email;
  if (b.wajibGantiPin) { S.user = null; sset(bootKey(), null); return renderGantiPinWajib(b); }
  if (b.perluPilihPeran) { S.mode = ''; sset('sk_mode', null); return renderPilihPeran(b); }
  S.mode = b.user.mode || '';
  sset('sk_email', b.user.email); sset('sk_mode', S.mode || null);
  if (S.mode) lstore('sk_mode_' + b.user.email, S.mode);
  try { sset(bootKey(), JSON.stringify(b)); } catch (e) { /* kuota penuh: abaikan */ }
  if (cached && cached.user) {
    const ubahMenu = JSON.stringify(cached.menu) !== JSON.stringify(b.menu) || JSON.stringify(cached.user.roles) !== JSON.stringify(b.user.roles);
    const halaman = S.page, param = S.params;
    applyBoot(b, false);
    setNavActive(halaman);
    if (ubahMenu) navigateTo('beranda', {});
    else if (halaman === 'beranda' && b.beranda && !S.touched) { S.pre = { beranda: b.beranda }; navigateTo('beranda', param, true, true); }
    pfIdle(); obKirim();
    return;
  }
  S.pre = b.beranda ? { beranda: b.beranda } : null;
  applyBoot(b, false);
  navigateTo('beranda', {});
  if (!b.notif) loadNotif();
  pfIdle(); obKirim();
}
/** Setelah aplikasi tampil dan tenang, ambil lebih dulu data 3 menu teratas (yang pernah dibuka) di latar belakang. */
/** Setelah aplikasi tenang: siapkan data semua menu yang pernah dibuka (dan kop surat) dalam satu panggilan. */
function pfIdle() {
  setTimeout(function () {
    if (!S.user) return;
    let list = [{ a: 'kop.get', p: {} }];
    S.menu.forEach(function (m) { if (m.id !== S.page) list = list.concat(pfDaftar(m.id)); });
    muatBanyak(list).then(function () { const e = CC[ccKey('kop.get', {})]; if (e && e.v) KOP = e.v; });
  }, 500);
}
/** Layar masuk tanpa menunggu server: memakai status awal yang ikut terkirim bersama halaman. */
function tampilMasuk(pesan) {
  const st = Object.assign({}, window.SK_AWAL || {}, S.cfg && S.cfg.namaSekolah ? { namaSekolah: S.cfg.namaSekolah, tahunAjaran: S.cfg.tahunAjaran, semester: S.cfg.semester, logoUrl: S.cfg.logoUrl } : {});
  if (st.state !== 'setup' && st.state !== 'belum') st.state = 'login';
  show('#splash', false);
  renderLogin(st);
  if (pesan) setTimeout(function () { toast(pesan, 'warn'); }, 100);
}
function init() {
  initTheme();
  S.token = sget('sk_token') || '';
  S.mode = sget('sk_mode') || '';
  const gagal = function (e) {
    show('#splash', false); show('#login-root', true);
    $('#login-root').innerHTML = '<div class="login"><div class="login-card"><div class="logo">' + logoHtml() + '</div><h2>Tidak dapat memuat aplikasi</h2><p class="muted mt-8">' + esc(e.message) + '</p><button class="btn dark block mt-16" onclick="init()">Coba lagi</button></div></div>';
  };
  const lewatStatus = function () {
    const awal = window.SK_AWAL;
    if (awal && awal.state) {
      // Tanpa perjalanan ke server: langsung tampilkan layar yang tepat.
      if (awal.state === 'ok' && !sget('sk_manual') && !lstore('sk_manual')) return startApp().catch(function () { tampilMasuk(); });
      if (awal.state === 'ok' || awal.state === 'login') return tampilMasuk();
      show('#splash', false); return renderLogin(awal);
    }
    api('auth.status', { manual: !!sget('sk_manual') }).then(function (st) {
      if (st.state === 'ok') return startApp().catch(function (e) { show('#splash', false); renderLogin({}); if (e && e.message) setTimeout(function () { toast(e.message, 'err'); }, 100); });
      show('#splash', false); renderLogin(st);
    }).catch(gagal);
  };
  if (S.token) { startApp(true).catch(function (e) { if (e && e.code === 'AUTH') { S.token = ''; hapusSesiLokal(); lewatStatus(); } else { show('#splash', false); lewatStatus(); } }); }
  else lewatStatus();
  setInterval(loadNotif, 180000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadNotif(); });
  window.addEventListener('online', function () { obKirim(); });
}

'use strict';
// ════════════════════════════════════════════════════════════
// Beranda (dashboard) — insight bergaya AI, deteksi dini, distribusi
// ════════════════════════════════════════════════════════════
function sapaan() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
function tglPanjang(s) { const d = new Date(+s.substr(0, 4), +s.substr(5, 2) - 1, +s.substr(8, 2)); return HRI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
const ROLE_DESC = {
  guru_bk: 'Layani semua murid: tinjau laporan guru, tanggapi rujukan, pantau pola kehadiran, dan catat layanan BK hari ini.',
  wali_kelas: 'Ringkasan kelas perwalian. Buka Kelas Saya untuk melihat kondisi setiap murid.',
  guru_mapel: 'Catat kehadiran kelas yang Anda ampu dan laporkan kejadian dengan cepat.',
  waka: 'Kasus yang dieskalasikan ke kesiswaan beserta tindak lanjut Anda.',
  kepsek: 'Gambaran menyeluruh kehadiran dan penanganan kasus (data agregat, tanpa nama murid).',
  admin: 'Kelola pengguna, data master, dan pengaturan sistem.'
};

function homeType() { return ['guru_bk', 'kepsek', 'waka', 'wali_kelas', 'guru_mapel', 'admin'].filter(hasRole)[0]; }

PAGES.beranda = function (_, tok) {
  const pre = S.pre && S.pre.beranda; S.pre = null;
  if (pre) ccSeed('dashboard.get', undefined, pre);
  return (pre ? Promise.resolve(pre) : apiC('dashboard.get')).then(function (d) {
    if (stale(tok)) return;
    P.home = d;
    const first = S.user.nama.replace(/,.*$/, '').split(' ').slice(0, 2).join(' ');
    const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
    const acts = (hasRole('guru_mapel') ? '<button class="btn" data-act="nav" data-page="absensi"><i class="bi bi-person-check"></i> Presensi Kelas</button>' : '') +
      (lapor ? '<button class="btn primary" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '');
    const nk = d.kpis.length;
    let h = pageHead(tglPanjang(d.tanggal), sapaan() + ', ' + first, ROLE_DESC[d.tipe] || '', acts);
    h += '<div class="grid g-kpi ' + (nk >= 6 ? 'k6' : nk === 5 ? 'k5' : 'k4') + '">' + d.kpis.map(function (k) {
      return '<button class="kpi ' + esc(k.color) + '" data-act="kpi" data-go="' + esc(k.go) + '" data-filter="' + esc(k.filter) + '"><span class="k-ic"><i class="bi ' + esc(k.icon) + '"></i></span><div class="k-lb">' + esc(k.label) + '</div><div><div class="k-v">' + esc(k.value) + '</div><div class="k-s">' + esc(k.sub) + '</div></div></button>';
    }).join('') + '</div>';

    if (d.kelasHariIni && d.kelasHariIni.length) {
      h += '<div class="card mt-16"><div class="card-head"><h3>Kelas yang Anda ampu</h3><span class="xs muted">Ketuk untuk mulai absensi</span></div><div class="card-body"><div class="grid g-3">' + d.kelasHariIni.map(function (k) {
        return '<button class="card pad" style="text-align:left;cursor:pointer;color:inherit" data-act="absen-go" data-k="' + esc(k.id_kelas) + '" data-m="' + esc(k.id_mapel) + '"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.kelas) + '</b>' + (k.sudah ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : '<span class="chip st-Baru">Belum</span>') + '</div><div class="xs muted mt-8">' + esc(k.mapel) + '</div></button>';
      }).join('') + '</div></div></div>';
    }

    if (d.harian && d.harian.length) {
      const hs = d.harian.filter(function (x) { return x.tercatat; }).length;
      h += '<div class="card mt-16"><div class="card-head"><div><h3><i class="bi bi-calendar-check" style="color:var(--teal)"></i> Absensi Harian Hari Ini</h3><div class="xs muted">' + hs + ' dari ' + d.harian.length + ' kelas sudah dicatat</div></div><button class="btn sm ghost" data-act="ke-harian">Buka <i class="bi bi-arrow-right"></i></button></div><div class="card-body"><div class="grid g-3">' + d.harian.slice(0, 12).map(function (k) {
        return '<button class="card pad har-kls" data-act="ke-harian"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.nama) + '</b>' + (k.tercatat ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : (k.qr ? '<span class="chip blue">Sebagian</span>' : '<span class="chip st-Baru">Belum</span>')) + '</div><div class="xs muted mt-8">' + (k.tercatat ? 'Hadir ' + k.hadir + '/' + k.jumlah + (k.S ? ' · S ' + k.S : '') + (k.I ? ' · I ' + k.I : '') + (k.A ? ' · <b style="color:var(--rose)">A ' + k.A + '</b>' : '') : (k.qr ? '<i class="bi bi-qr-code-scan"></i> ' + k.qr + '/' + k.jumlah + ' sudah memindai · lengkapi' : k.jumlah + ' murid')) + '</div></button>';
      }).join('') + '</div></div></div>';
    }
    h += '<div class="grid g-2 mt-16"><div class="col gap-16">';
    if (d.tipe === 'guru_bk' || d.tipe === 'wali_kelas') {
      h += '<div class="card"><div class="card-head"><div><h3><i class="bi bi-radar" style="color:var(--rose)"></i> Deteksi Dini Pola Kehadiran</h3><div class="xs muted">30 hari terakhir · ' + d.polaTotal + ' murid ditandai' + (d.polaKritis ? ' · ' + d.polaKritis + ' kritis' : '') + '</div></div></div><div style="margin-top:8px">' +
        (d.pola.length ? d.pola.map(function (x) {
          return '<div class="pola-item"><div class="row between wrap"><div class="row"><div class="avatar" style="width:34px;height:34px;font-size:11px;background:' + (x.level === 'kritis' ? 'var(--rose)' : x.level === 'perhatian' ? 'var(--amber)' : 'var(--teal)') + '">' + esc(initials(x.nama)) + '</div><div><div class="fw7" style="font-family:var(--font-h)">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.kelas) + ' · NIS ' + esc(x.nis) + '</div></div></div>' + chipLevel(x.level) + '</div>' +
            '<div class="muted-2">' + esc(x.deskripsi) + '</div><div class="row wrap"><button class="btn sm" data-act="open-murid" data-id="' + esc(x.id_murid) + '"><i class="bi bi-activity"></i> Garis waktu</button><button class="btn sm dark" data-act="pola-rujuk" data-id="' + esc(x.id_murid) + '"><i class="bi bi-send"></i> Buat rujukan</button></div></div>';
        }).join('') : empty('bi-shield-check', 'Tidak ada pola yang mengkhawatirkan', 'Sistem memeriksa pola alpa berulang, bolos di tengah hari, dan keterlambatan.')) + '</div></div>';
      P.polaIdx = {}; d.pola.forEach(function (x) { P.polaIdx[x.id_murid] = x; });
    }
    if (d.rujukanTerkini && d.rujukanTerkini.length) {
      h += '<div class="card"><div class="card-head"><h3>Kasus terbaru</h3><button class="btn sm ghost" data-act="nav" data-page="kasus">Lihat semua <i class="bi bi-arrow-right"></i></button></div><div class="cases" style="margin-top:8px">' + d.rujukanTerkini.map(caseRow).join('') + '</div></div>';
    }
    if (d.tipe === 'admin') {
      if (S.saranTA && S.saranTA.perlu) h += '<div class="card pad" style="border-color:var(--amber)"><div class="row"><span class="step-n"><i class="bi bi-calendar-event"></i></span><div class="grow"><h3>Saatnya pergantian tahun ajaran?</h3><div class="xs muted">Kalender: ' + esc(S.saranTA.tahun_ajaran) + ' ' + esc(S.saranTA.semester) + ' · aplikasi: ' + esc(S.saranTA.sekarang) + '</div></div></div><button class="btn dark block mt-12" data-act="ke-tahun"><i class="bi bi-archive"></i> Arsip, kenaikan kelas & tahun ajaran baru</button></div>';
      h += '<div class="card pad"><h3>Mulai dari sini</h3><p class="muted mt-8" style="margin-top:4px">Lengkapi data master agar guru dapat bekerja: kelas, murid, mata pelajaran, lalu penugasan pengampu.</p><div class="row wrap mt-16"><button class="btn dark" data-act="nav" data-page="admin"><i class="bi bi-gear"></i> Buka Administrasi</button><button class="btn" data-act="nav" data-page="laporan"><i class="bi bi-bar-chart"></i> Laporan & Rekap</button></div></div>';
    }
    if (d.tipe === 'kepsek') {
      h += '<div class="card pad"><h3>Laporan resmi</h3><p class="muted mt-8" style="margin-top:4px">Unduh rekap kehadiran dan kasus per periode dalam bentuk PDF untuk rapat dan pelaporan.</p><div class="row wrap mt-16"><button class="btn dark" data-act="nav" data-page="laporan"><i class="bi bi-file-earmark-pdf"></i> Laporan & Rekap</button></div></div>';
    }
    h += '</div><div class="col gap-16">';
    if (d.insight && d.insight.length) {
      h += '<div class="insight"><span class="ai-tag"><i class="bi bi-stars"></i> Insight otomatis</span><ul>' + d.insight.map(function (t) { return '<li><i class="bi bi-lightbulb"></i><span>' + esc(t) + '</span></li>'; }).join('') + '</ul><div class="xs muted mt-12">Dihitung dari data absensi dan kasus (agregat). Bukan diagnosis.</div></div>';
    }
    if (d.distribusi) {
      h += '<div class="card"><div class="card-head"><div><h3>Distribusi Kasus</h3><div class="xs muted">Per kategori kejadian</div></div><div class="fchips" id="dist-tabs">' + ['minggu', 'bulan', 'semester'].map(function (r) { return '<button class="fchip ' + (r === 'bulan' ? 'active' : '') + '" data-act="dist" data-r="' + r + '">' + { minggu: 'Minggu', bulan: 'Bulan', semester: 'Semester' }[r] + '</button>'; }).join('') + '</div></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-dist" aria-label="Grafik distribusi kasus"></canvas></div><div class="legend mt-12" id="dist-leg"></div></div></div>';
    }
    h += '</div></div>';
    $('#app-container').innerHTML = h;
    if (d.distribusi) drawDist(d.distribusi);
  });
};
ACT.kpi = function (el) {
  const go = el.dataset.go;
  if (!go) return;
  if (!S.menu.some(function (m) { return m.id === go; })) return;
  const f = el.dataset.filter;
  if (go === 'absensi') { navigateTo('absensi', f ? { tab: f } : {}); return; }
  if (f === 'tinjau') { navigateTo('kasus', { filter: 'tinjau' }); return; }
  navigateTo(go, f ? { status: f === 'Baru' && go === 'kasus' ? '' : f, rujukan: go === 'kasus' && f === 'Baru' ? 'Baru' : '' } : {});
};
function drawDist(dist) {
  chart('ch-dist', { kind: 'stack', labels: dist.labels, series: dist.series.map(function (s, i) { return { name: s.nama, data: s.data, color: KAT_COL[i % KAT_COL.length] }; }), label: 'Distribusi kasus' });
  $('#dist-leg').innerHTML = dist.total ? dist.perKategori.map(function (k, i) { return '<div><span class="dotc" style="background:' + KAT_COL[i % KAT_COL.length] + '"></span>' + esc(k.nama) + '<b>' + k.persen + '%</b></div>'; }).join('') : '<div class="xs muted" style="grid-column:1/-1">Belum ada kasus pada rentang ini.</div>';
}
ACT.dist = function (el) {
  $$('#dist-tabs .fchip').forEach(function (b) { b.classList.toggle('active', b === el); });
  apiC('dashboard.distribusi', { rentang: el.dataset.r }).then(drawDist).catch(fail);
};
ACT['ke-harian'] = function () { navigateTo('absensi', { tab: 'harian' }); };
ACT['ke-tahun'] = function () { navigateTo('admin', { tab: 'tahun' }); };
ACT['absen-go'] = function (el) { navigateTo('absensi', { id_kelas: el.dataset.k, id_mapel: el.dataset.m }); };

/** Baris kasus (dipakai di beranda dan daftar kasus). */
function caseRow(k) {
  return '<button class="case" data-act="kasus-open" data-id="' + esc(k.id) + '"><div class="c-main"><div class="c-top"><span class="mono muted">' + esc(k.kode) + '</span>' + chipUrg(k.urgensi) + chipStatus(k.status) + (k.eskalasi ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-up-right"></i> Waka</span>' : '') + (k.berulang ? '<span class="chip st-Eskalasi" title="Dilaporkan ' + k.ulang + ' kali dalam 30 hari"><i class="bi bi-arrow-repeat"></i> Berulang ' + k.ulang + '×</span>' : '') + (k.limpah ? '<span class="chip st-Ditangani-Wali-Kelas" title="Dilimpahkan ke wali kelas"><i class="bi bi-arrow-left-right"></i> ' + esc(k.limpah) + '</span>' : '') + (k.mode === 'info' ? '<span class="chip st-Pembinaan-Guru" title="Pelapor sudah membina; BK cukup mengetahui"><i class="bi bi-check2"></i> Sudah dibina guru</span>' : '') + (k.perluTinjau && hasRole('guru_bk') ? '<span class="chip blue"><i class="bi bi-eye"></i> Belum ditinjau</span>' : (k.ditinjau ? '<span class="chip neutral" title="Sudah ditinjau Guru BK"><i class="bi bi-check2-all"></i> Ditinjau BK</span>' : '')) + '</div>' +
    '<div class="c-name" style="margin-top:4px">' + esc(k.murid) + ' <span class="muted fw6" style="font-size:12px">· ' + esc(k.kelas) + '</span></div>' +
    '<div class="xs muted-2 mt-8" style="margin-top:2px">' + esc(k.kategori) + ' — ' + esc(k.ringkas) + '</div></div>' +
    '<div class="xs muted" style="text-align:right;flex:none">' + esc(fTgl(k.tanggal)) + '<br>' + esc(k.pelapor) + (k.penangani ? '<br><span class="muted-2"><i class="bi bi-person-badge"></i> ' + esc(k.penangani) + '</span>' : (k.pj ? '<br><span class="muted-2"><i class="bi bi-person-badge"></i> ' + esc(k.pj) + '</span>' : '')) + '</div></button>';
}

// ── Rujukan langsung dari deteksi pola ──
ACT['pola-rujuk'] = function (el) {
  const x = (P.polaIdx || {})[el.dataset.id]; if (!x) return;
  const urg = S.refs.urgensi.map(function (u) { return u.nama; });
  const defU = x.level === 'kritis' ? urg[0] : x.level === 'perhatian' ? (urg[1] || urg[0]) : (urg[2] || urg[urg.length - 1]);
  const kat = S.refs.kejadian.indexOf('Kehadiran') >= 0 ? 'Kehadiran' : S.refs.kejadian[0];
  const m = openModal({
    title: 'Rujuk ke Guru BK', sub: x.nama + ' · ' + x.kelas,
    body: '<div class="note info"><i class="bi bi-info-circle"></i><div>Pola terdeteksi sistem: <b>' + esc(x.deskripsi) + '</b>. Sistem akan membuat laporan kejadian otomatis lalu rujukan.</div></div><form class="form-grid mt-12" id="f-pr" novalidate>' +
      fld({ name: 'kategori', label: 'Kategori', type: 'select', opts: S.refs.kejadian, value: kat }) +
      fld({ name: 'urgensi', label: 'Tingkat urgensi', type: 'select', opts: urg, value: defU }) +
      fld({ name: 'alasan', label: 'Alasan rujukan', type: 'textarea', req: true, rows: 3, max: 1500, value: 'Pola ketidakhadiran: ' + x.deskripsi }) +
      fld({ name: 'kronologi', label: 'Kronologi / catatan', type: 'textarea', req: true, rows: 3, max: 5000, value: 'Terdeteksi dari data absensi 30 hari terakhir: ' + x.deskripsi + '.' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pr-ok">Kirim rujukan</button>'
  });
  $('#pr-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pr', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true }, kronologi: { label: 'Kronologi', req: true } })) return;
    d.id_murid = x.id_murid;
    run(e.currentTarget, api('rujukan.buat', d)).then(function (r) { m.close(); toast('Rujukan terkirim (' + r.kode + ').'); navigateTo('kasus', { open: r.id_laporan }); }).catch(fail);
  });
};

/** Modal rujukan untuk kasus yang sudah ada. */
function openRujukanModal(idLap, kode, defUrg, after) {
  const urg = S.refs.urgensi.map(function (u) { return u.nama; });
  const m = openModal({
    title: 'Rujuk ke Guru BK', sub: kode,
    body: '<form class="form-grid" id="f-rj" novalidate>' +
      fld({ name: 'urgensi', label: 'Tingkat urgensi', type: 'select', opts: urg, value: defUrg || urg[1] || urg[0] }) +
      fld({ name: 'alasan', label: 'Alasan rujukan', type: 'textarea', req: true, rows: 4, max: 1500, ph: 'Mengapa kasus ini perlu penanganan Guru BK?' }) + '</form>' +
      '<div class="xs muted mt-12">Ringkasan pembimbingan awal akan dilampirkan otomatis. Guru BK dapat menerima, menunda, atau menolak disertai alasan.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="rj-ok">Kirim rujukan</button>'
  });
  $('#rj-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-rj', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan rujukan', req: true, min: 10 } })) return;
    d.id_laporan = idLap;
    run(e.currentTarget, api('rujukan.buat', d)).then(function () { m.close(); toast('Rujukan terkirim ke Guru BK.'); if (after) after(); }).catch(fail);
  });
}

// ════════════════════════════════════════════════════════════
// Absensi (F2) — tab Mapel (per jam pelajaran) & Harian (sekali sehari per kelas)
// Jam pelajaran fleksibel: jam mulai + jumlah JP (mis. 3 JP = jam ke-3 s.d. 5)
// ════════════════════════════════════════════════════════════
const ST_NAMA = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa', T: 'Terlambat' };
const ST_COL = { H: '#10B981', S: '#3B82F6', I: '#4F46E5', A: '#EF4444', T: '#F59E0B' };
function jamMaks() { return S.jamMaks || 10; }
function jamStr(mulai, jp) { mulai = +mulai; jp = +jp; return jp <= 1 ? String(mulai) : mulai + '-' + (mulai + jp - 1); }
function jamParse(s) { const p = String(s || '1').split('-'); const a = parseInt(p[0], 10) || 1, b = p[1] ? (parseInt(p[1], 10) || a) : a; return { mulai: a, jp: b - a + 1 }; }
function jamLabel(s) { const j = jamParse(s); return j.jp <= 1 ? 'Jam ke-' + j.mulai + ' (1 JP)' : 'Jam ke-' + j.mulai + ' s.d. ' + (j.mulai + j.jp - 1) + ' (' + j.jp + ' JP)'; }
function opsiJamMulai() { const o = []; for (let i = 1; i <= jamMaks(); i++) o.push({ v: i, l: 'Jam ke-' + i }); return o; }
function opsiJp(mulai) { const o = [], mx = Math.min(8, jamMaks() - (+mulai || 1) + 1); for (let i = 1; i <= Math.max(1, mx); i++) o.push({ v: i, l: i + ' JP' }); return o; }
function canHarian() { return hasAny(['wali_kelas', 'guru_bk', 'waka', 'admin']); }

PAGES.absensi = function (params, tok) {
  const mapelOk = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka', 'admin']);
  const harOk = canHarian();
  let tab = (params.tab === 'harian' || params.tab === 'daftar' || params.tab === 'rekap' || params.tab === 'periode') && harOk ? params.tab : params.tab === 'mapel' ? 'mapel' : (hasRole('guru_mapel') || !harOk ? 'mapel' : 'harian');
  if (params.id_kelas && params.id_mapel) tab = 'mapel';
  P.absTab = tab;
  const judul = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka']) ? 'Absensi Murid' : 'Rekap Absensi';
  let h = pageHead('Presensi', judul, 'Absensi harian dicatat sekali sehari per kelas oleh wali kelas. Absensi mata pelajaran dicatat guru setiap sesi mengajar.', '');
  h += '<div class="tabs mb-16" id="abs-tabs">' + (mapelOk ? '<button class="tab ' + (tab === 'mapel' ? 'active' : '') + '" data-act="abs-tab" data-t="mapel"><i class="bi bi-journal-text"></i> Per mata pelajaran</button>' : '') + (harOk ? '<button class="tab ' + (tab === 'harian' ? 'active' : '') + '" data-act="abs-tab" data-t="harian"><i class="bi bi-calendar-check"></i> Harian</button><button class="tab ' + (tab === 'rekap' ? 'active' : '') + '" data-act="abs-tab" data-t="rekap"><i class="bi bi-table"></i> Rekap bulanan</button><button class="tab ' + (tab === 'periode' ? 'active' : '') + '" data-act="abs-tab" data-t="periode"><i class="bi bi-calendar-range"></i> Rekap periode</button><button class="tab ' + (tab === 'daftar' ? 'active' : '') + '" data-act="abs-tab" data-t="daftar"><i class="bi bi-printer"></i> Daftar hadir</button>' : '') + '</div><div id="abs-body"></div>';
  $('#app-container').innerHTML = h;
  const akt = $('#abs-tabs .tab.active'); if (akt && akt.scrollIntoView) { try { akt.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* abaikan */ } }
  return absTabLoad(tab, params, tok);
};
ACT['abs-tab'] = function (el) {
  P.absTab = el.dataset.t;
  $$('#abs-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  absTabLoad(P.absTab, {}, S.navTok).catch(function (e) { isiHtml('#abs-body', errBox(e, true)); });
};
function absTabLoad(tab, params, tok) {
  $('#abs-body').innerHTML = skeleton(3);
  if (tab === 'harian') return harPage(params, tok);
  if (tab === 'rekap') return rkPage(params, tok);
  if (tab === 'daftar') return dhPage(params, tok);
  if (tab === 'periode') return rpPage(params, tok);
  return mapelPage(params, tok);
}

// ── Tab: per mata pelajaran ──
function mapelPage(params, tok) {
  return apiC('absensi.meta').then(function (meta) {
    if (stale(tok)) return;
    if (meta.jamMaks) S.jamMaks = meta.jamMaks;
    P.abs = { meta: meta, rows: null, roster: null, sel: '', tanggal: meta.hariIni, jam: '1-2' };
    const canInput = meta.bolehInput && meta.diampu.length;
    let h = '';
    if (meta.bolehInput && !meta.diampu.length) h += '<div class="note mb-16"><i class="bi bi-info-circle"></i><div>Anda belum memiliki penugasan mengajar. Minta admin menambahkan penugasan di menu Administrasi → Pengampu.</div></div>';
    if (canInput) {
      h += '<div class="card pad"><form class="form-grid c2" id="f-abs" novalidate>' +
        '<div style="grid-column:1/-1">' + fld({ name: 'sel', label: 'Kelas & mata pelajaran', type: 'select', req: true, blank: 'Pilih kelas…', opts: meta.diampu.map(function (x, i) { return { v: i, l: x.kelas + ' · ' + x.mapel + ' (' + x.jumlah + ' murid)' }; }) }) + '</div>' +
        fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: meta.hariIni, maxv: meta.hariIni, min: addD(meta.hariIni, -14) }) +
        '<div class="field"><label>Jam pelajaran <span class="req">*</span></label><div class="jam-pick"><select class="select" name="jam_mulai" id="f_jam_mulai" aria-label="Jam mulai">' + opsiJamMulai().map(function (o) { return '<option value="' + o.v + '"' + (o.v === 1 ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') + '</select><select class="select" name="jam_jp" id="f_jam_jp" aria-label="Jumlah jam pelajaran"></select></div><div class="hint" id="jam-info"></div></div>' +
        '<div class="field" style="grid-column:1/-1"><button type="submit" class="btn dark"><i class="bi bi-people"></i> Muat daftar murid</button></div></form></div>';
      h += '<div id="roster-box" class="mt-16"></div>';
    } else if (!meta.bolehInput) {
      h += '<div class="note info"><i class="bi bi-info-circle"></i><div>Absensi per mata pelajaran diisi oleh guru pengampu. Anda dapat memantau riwayatnya di bawah.</div></div>';
    }
    h += '<div class="card mt-16"><div class="card-head"><div><h3>Riwayat absensi mapel</h3><div class="xs muted">Per sesi · 30 hari terakhir</div></div></div><div class="card-body"><form class="form-grid c2" id="f-hist">' +
      fld({ name: 'id_kelas', label: 'Kelas', type: 'select', blank: 'Semua kelas', opts: meta.kelas.map(function (k) { return { v: k.id, l: k.nama }; }) }) +
      '<div class="field"><label>&nbsp;</label><button type="submit" class="btn"><i class="bi bi-funnel"></i> Terapkan</button></div></form></div><div id="hist-box"></div></div>';
    $('#abs-body').innerHTML = h;
    const f = $('#f-abs');
    if (f) {
      $('#f_jam_mulai').addEventListener('change', function () { jamSyncJp(); });
      $('#f_jam_jp').addEventListener('change', jamInfo);
      $('[name=sel]', f).addEventListener('change', function () { jamIngat(); });
      jamSyncJp(2);
      f.addEventListener('submit', function (e) { e.preventDefault(); absLoad($('button[type=submit]', f)); });
      if (params.id_kelas) {
        const i = meta.diampu.findIndex(function (x) { return x.id_kelas === params.id_kelas && x.id_mapel === params.id_mapel; });
        if (i >= 0) { $('[name=sel]', f).value = i; jamIngat(); absLoad(); }
      }
    }
    $('#f-hist').addEventListener('submit', function (e) { e.preventDefault(); histLoad(); });
    histLoad();
  });
}
/** Isi pilihan jumlah JP sesuai jam mulai (tidak boleh melewati jam terakhir). */
function jamSyncJp(pilih) {
  const m = +$('#f_jam_mulai').value, sel = $('#f_jam_jp');
  const cur = pilih || +sel.value || 1;
  const o = opsiJp(m);
  sel.innerHTML = o.map(function (x) { return '<option value="' + x.v + '"' + (x.v === Math.min(cur, o.length) ? ' selected' : '') + '>' + x.l + '</option>'; }).join('');
  jamInfo();
}
function jamInfo() {
  const s = jamStr($('#f_jam_mulai').value, $('#f_jam_jp').value);
  $('#jam-info').textContent = jamLabel(s);
  return s;
}
/** Ingat jam terakhir per kelas+mapel di peramban ini (kemudahan saja). */
function jamIngat() {
  const f = $('#f-abs'), x = P.abs.meta.diampu[+$('[name=sel]', f).value];
  if (!x) return;
  const s = lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel);
  if (s) { const j = jamParse(s); $('#f_jam_mulai').value = j.mulai; jamSyncJp(j.jp); }
}
function setJamForm(s) { const j = jamParse(s); $('#f_jam_mulai').value = j.mulai; jamSyncJp(j.jp); }
function absLoad(btn) {
  const f = $('#f-abs'), d = formData(f);
  if (!validate(f, d, { sel: { label: 'Kelas & mata pelajaran', req: true }, tanggal: { label: 'Tanggal', req: true } })) return;
  const x = P.abs.meta.diampu[+d.sel];
  const jam = jamInfo();
  P.abs.sel = x; P.abs.tanggal = d.tanggal; P.abs.jam = jam;
  lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel, jam);
  if (obAda('abs|' + x.id_kelas + '|' + x.id_mapel + '|' + d.tanggal + '|' + jam)) { obKirim(); toast('Sesi ini masih dikirim ke server. Tunggu beberapa detik lalu muat lagi.', 'warn'); return; }
  const p = api('absensi.roster', { id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: d.tanggal, jam_ke: jam });
  (btn ? run(btn, p) : p).then(function (r) {
    P.abs.roster = r;
    P.abs.rows = r.murid.map(function (m) { return { id: m.id, nama: m.nama, nis: m.nis, persen: m.persen, lebihAwal: m.lebihAwal, status: m.status, catatan: m.catatan, harian: m.harian }; });
    drawRoster();
  }).catch(fail);
}
function absCounts(rows) {
  const c = { H: 0, S: 0, I: 0, A: 0, T: 0 };
  (rows || P.abs.rows).forEach(function (r) { c[r.status]++; });
  return c;
}
function drawRoster() {
  const a = P.abs, r = a.roster, x = a.sel;
  if (!r.murid.length) { $('#roster-box').innerHTML = '<div class="card pad">' + empty('bi-people', 'Kelas ini belum memiliki murid aktif') + '</div>'; return; }
  const kor = r.ada, lock = kor && !r.bolehSimpan;
  let note = kor ? (r.bolehSimpan ? '<div class="note info"><i class="bi bi-pencil-square"></i><div>Absensi sesi ini sudah tersimpan. Anda masih dapat mengoreksinya, termasuk mengubah jam pelajaran, sampai <b>' + r.sisaJam + ' jam</b> lagi.</div></div>' : '<div class="note rose"><i class="bi bi-lock"></i><div>Absensi sesi ini sudah tersimpan dan tidak dapat Anda ubah (batas koreksi terlewati atau dicatat guru lain). Hubungi admin bila perlu koreksi.</div></div>') : '';
  if (r.bentrok) note += '<div class="note rose mt-8"><i class="bi bi-exclamation-triangle"></i><div><b>Jam bertabrakan.</b> Pada tanggal ini sudah ada sesi lain di kelas ini pada jam yang sama. Periksa kembali jam pelajaran Anda sebelum menyimpan.</div></div>';
  if (r.sesiLain && r.sesiLain.length) note += '<div class="note mt-8"><i class="bi bi-clock-history"></i><div>Sesi lain yang sudah tercatat hari itu: ' + r.sesiLain.map(function (s) { return '<span class="chip ' + (s.bentrok ? 'st-Eskalasi' : 'neutral') + '">Jam ' + esc(s.jam) + ' · ' + esc(s.mapel) + '</span>'; }).join(' ') + '</div></div>';
  if (!kor && r.adaHarian) note += '<div class="note info mt-8"><i class="bi bi-calendar-check"></i><div>Murid yang tercatat <b>Sakit, Izin, atau Alpa</b> pada absensi harian sudah ditandai otomatis. Periksa lalu sesuaikan bila berbeda.</div></div>';
  $('#roster-box').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>' + esc(x.kelas) + ' · ' + esc(x.mapel) + '</h3><div class="xs muted">' + esc(tglPanjang(r.tanggal)) + ' · ' + esc(jamLabel(r.jam_ke)) + '</div></div><div class="row wrap">' +
    (kor && r.bolehSimpan ? '<button class="btn sm" data-act="abs-ubahjam"><i class="bi bi-clock"></i> Ubah jam</button>' : '') +
    '<button class="btn sm" data-act="abs-allh"' + (lock ? ' disabled' : '') + '><i class="bi bi-check2-all"></i> Semua hadir</button></div></div>' +
    '<div class="card-body" style="padding-bottom:0">' + note + '<div class="sumbar mt-12" id="abs-sum"></div></div><div class="roster mt-12" id="roster-rows">' + a.rows.map(rosterRow).join('') + '</div></div>' +
    '<div class="sticky-save"><div class="xs muted-2" id="abs-sum2"></div><button class="btn primary" data-act="abs-save"' + (lock ? ' disabled' : '') + '><i class="bi bi-check-circle"></i> ' + (kor ? 'Simpan koreksi' : 'Simpan absensi') + '</button></div>';
  absSum();
  $('#roster-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function segHtml(m, lock, act) {
  return '<div class="seg ' + (lock ? 'ro' : '') + '" role="group" aria-label="Status ' + esc(m.nama) + '">' + ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<button type="button" data-act="' + act + '" data-id="' + esc(m.id) + '" data-s="' + s + '" class="' + (m.status === s ? 'on' : '') + '" aria-pressed="' + (m.status === s) + '" title="' + ST_NAMA[s] + '">' + s + '</button>'; }).join('') + '</div>';
}
function rosterRow(m) {
  const lock = P.abs.roster.ada && !P.abs.roster.bolehSimpan;
  const early = (m.lebihAwal || []).map(function (e) { return '<span class="chip neutral" title="Status pada jam lain hari ini">Jam ' + esc(e.jam) + ': ' + esc(e.status) + '</span>'; }).join(' ');
  const har = m.harian && m.harian !== 'H' ? '<span class="chip ' + (m.harian === 'A' ? 'st-Eskalasi' : 'blue') + '" title="Absensi harian">Harian: ' + esc(ST_NAMA[m.harian] || m.harian) + '</span>' : '';
  const flag = (m.lebihAwal || []).some(function (e) { return (e.status === 'H' || e.status === 'T') && jamParse(e.jam).mulai < jamParse(P.abs.roster.jam_ke).mulai; }) && m.status === 'A';
  return '<div class="r-row ' + (flag ? 'flag' : '') + '" data-rid="' + esc(m.id) + '"><div class="r-id"><div class="av">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6 trunc">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' · Kehadiran ' + m.persen + '% ' + har + ' ' + early + '</div></div></div>' +
    '<div class="col" style="gap:6px;align-items:flex-end">' + segHtml(m, lock, 'abs-set') +
    (m.status !== 'H' ? '<input class="input" style="min-height:34px;font-size:13px" data-cat="' + esc(m.id) + '" maxlength="200" placeholder="Catatan (opsional)" value="' + esc(m.catatan) + '"' + (lock ? ' disabled' : '') + '>' : '') + '</div>' +
    (flag ? '<div class="xs" style="color:#DC2626"><i class="bi bi-exclamation-triangle"></i> Tercatat hadir di jam sebelumnya, periksa kembali.</div>' : '') + '</div>';
}
function absSum() {
  const c = absCounts();
  $('#abs-sum').innerHTML = ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + c[s] + '</b></span>'; }).join('');
  $('#abs-sum2').innerHTML = '<b>' + P.abs.rows.length + '</b> murid · Hadir <b>' + (c.H + c.T) + '</b> · Tidak hadir <b>' + (c.S + c.I + c.A) + '</b>';
}
ACT['abs-set'] = function (el) {
  const row = P.abs.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!row) return;
  row.status = el.dataset.s;
  const old = $('[data-rid="' + el.dataset.id + '"]');
  if (old) { const tmp = document.createElement('div'); tmp.innerHTML = rosterRow(row); old.replaceWith(tmp.firstChild); }
  absSum();
};
document.addEventListener('input', function (e) {
  const id = e.target && e.target.dataset ? e.target.dataset.cat : null;
  if (id && P.abs && P.abs.rows) { const r = P.abs.rows.filter(function (x) { return x.id === id; })[0]; if (r) r.catatan = e.target.value; }
  const hid = e.target && e.target.dataset ? e.target.dataset.hcat : null;
  if (hid && P.har && P.har.rows) { const r2 = P.har.rows.filter(function (x) { return x.id === hid; })[0]; if (r2) r2.catatan = e.target.value; }
});
ACT['abs-allh'] = function () {
  P.abs.rows.forEach(function (r) { r.status = 'H'; r.catatan = ''; });
  $('#roster-rows').innerHTML = P.abs.rows.map(rosterRow).join(''); absSum();
};
ACT['abs-save'] = function (el) {
  const a = P.abs, x = a.sel, r = a.roster;
  const c = absCounts();
  const go = function () {
    const payload = {
      id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: r.tanggal, jam_ke: r.jam_ke, koreksi: r.ada === true,
      entries: a.rows.map(function (m) { return { id_murid: m.id, status: m.status, catatan: m.catatan || '' }; })
    };
    const label = 'Absensi ' + x.kelas + ' · ' + x.mapel + ' · ' + jamLabel(r.jam_ke) + ' · ' + fTgl(r.tanggal);
    // Optimistis: langsung selesai di layar; pengiriman berjalan di latar belakang.
    obTambah('absensi.simpan', payload, label, 'abs|' + x.id_kelas + '|' + x.id_mapel + '|' + r.tanggal + '|' + r.jam_ke, function () { if (S.page === 'absensi' && $('#hist-box')) histLoad(); });
    toast((r.ada ? 'Koreksi disimpan' : 'Absensi disimpan') + ': ' + a.rows.length + ' murid · H ' + (c.H + c.T) + ' · S ' + c.S + ' · I ' + c.I + ' · A ' + c.A + '.');
    a.roster = null;
    $('#roster-box').innerHTML = '<div class="card pad">' + empty('bi-check2-circle', 'Absensi ' + x.kelas + ' · ' + x.mapel + ' tersimpan', 'Dikirim ke server di latar belakang; Anda bisa langsung mencatat kelas berikutnya.') + '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  if (c.A >= Math.ceil(a.rows.length / 2) && a.rows.length >= 4) {
    confirmDlg('Lebih dari separuh murid ditandai Alpa (' + c.A + ' dari ' + a.rows.length + '). Mohon dipastikan sebelum menyimpan.', 'Ya, simpan', false, 'Periksa kembali').then(function (ok) { if (ok) go(); });
  } else go();
};
/** Perbaiki jam pelajaran sesi yang sudah tersimpan (mis. tercatat 2 JP padahal mengajar 3 JP). */
ACT['abs-ubahjam'] = function () {
  const a = P.abs, r = a.roster, x = a.sel, j = jamParse(r.jam_ke);
  const m = openModal({
    title: 'Ubah jam pelajaran', sub: x.kelas + ' · ' + x.mapel + ' · ' + tglPanjang(r.tanggal),
    body: '<p class="muted-2">Tercatat saat ini: <b>' + esc(jamLabel(r.jam_ke)) + '</b>. Status kehadiran murid tidak berubah.</p><div class="jam-pick mt-12"><select class="select" id="uj-m">' + opsiJamMulai().map(function (o) { return '<option value="' + o.v + '"' + (o.v === j.mulai ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') + '</select><select class="select" id="uj-jp"></select></div><div class="hint mt-8" id="uj-info"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="uj-ok">Simpan jam</button>'
  });
  const sync = function (p) {
    const mm = +$('#uj-m', m.el).value, o = opsiJp(mm), cur = p || +$('#uj-jp', m.el).value || 1;
    $('#uj-jp', m.el).innerHTML = o.map(function (q) { return '<option value="' + q.v + '"' + (q.v === Math.min(cur, o.length) ? ' selected' : '') + '>' + q.l + '</option>'; }).join('');
    info();
  };
  const info = function () { $('#uj-info', m.el).textContent = 'Menjadi: ' + jamLabel(jamStr($('#uj-m', m.el).value, $('#uj-jp', m.el).value)); };
  $('#uj-m', m.el).addEventListener('change', function () { sync(); });
  $('#uj-jp', m.el).addEventListener('change', info);
  sync(j.jp);
  $('#uj-ok', m.el).addEventListener('click', function (e) {
    const baru = jamStr($('#uj-m', m.el).value, $('#uj-jp', m.el).value);
    run(e.currentTarget, api('absensi.ubahJam', { id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: r.tanggal, jam_lama: r.jam_ke, jam_baru: baru })).then(function (res) {
      m.close(); toast('Jam pelajaran diubah menjadi ' + jamLabel(res.jam_ke) + '.');
      lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel, res.jam_ke);
      setJamForm(res.jam_ke); absLoad(); histLoad();
    }).catch(fail);
  });
};
function histLoad() {
  const f = $('#f-hist'); if (!f) return;
  const d = formData(f);
  $('#hist-box').innerHTML = '<div class="card-body">' + skeleton(2) + '</div>';
  apiC('absensi.riwayat', { id_kelas: d.id_kelas }).then(function (rows) {
    P.abs.hist = rows;
    const ajar = hasRole('guru_mapel') && P.abs.meta.diampu.length;
    $('#hist-box').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Jam</th><th>Kelas</th><th>Mata pelajaran</th><th>H</th><th>S</th><th>I</th><th>A</th><th>T</th><th>Pencatat</th>' + (ajar ? '<th></th>' : '') + '</tr></thead><tbody>' + rows.slice(0, 80).map(function (r, i) {
      const j = jamParse(r.jam_ke);
      return '<tr><td>' + esc(fTgl(r.tanggal)) + '</td><td style="white-space:nowrap">' + esc(r.jam_ke) + ' <span class="xs muted">(' + j.jp + ' JP)</span></td><td>' + esc(r.kelas) + '</td><td>' + esc(r.mapel) + '</td><td>' + r.H + '</td><td>' + r.S + '</td><td>' + r.I + '</td><td' + (r.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + r.A + '</td><td>' + r.T + '</td><td class="xs">' + esc(r.pencatat) + '</td>' + (ajar ? '<td>' + (r.milik ? '<button class="btn sm" data-act="abs-open" data-i="' + i + '">Buka</button>' : '') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-calendar-x', 'Belum ada riwayat absensi mapel') + '</div>';
  }).catch(function (e) { $('#hist-box').innerHTML = '<div class="card-body">' + errBox(e) + '</div>'; });
}
ACT['abs-open'] = function (el) {
  const r = (P.abs.hist || [])[+el.dataset.i]; if (!r) return;
  const i = P.abs.meta.diampu.findIndex(function (x) { return x.id_kelas === r.id_kelas && x.id_mapel === r.id_mapel; });
  if (i < 0) { toast('Anda bukan pengampu sesi ini.', 'warn'); return; }
  const f = $('#f-abs'); $('[name=sel]', f).value = i; $('[name=tanggal]', f).value = r.tanggal; setJamForm(r.jam_ke);
  absLoad();
};

// ── Tab: absensi harian ──
function harPage(params, tok) {
  const tgl = params.tanggal || (P.harTgl && P.harTgl >= addD(S.today, -14) ? P.harTgl : S.today);
  return apiC('harian.meta', { tanggal: tgl }).then(function (meta) {
    if (stale(tok)) return;
    P.harMeta = meta; P.harTgl = meta.tanggal;
    let h = '<div class="card pad"><div class="row between wrap" style="gap:12px"><div><h3>Absensi harian</h3><div class="xs muted">Dicatat sekali sehari per kelas, idealnya pada jam pertama. Hasilnya menjadi nilai awal absensi tiap mata pelajaran.</div></div>' +
      '<div class="row" style="gap:8px"><input class="input" type="date" id="har-tgl" value="' + esc(meta.tanggal) + '" max="' + esc(meta.hariIni) + '" min="' + esc(addD(meta.hariIni, -14)) + '" style="max-width:170px" aria-label="Tanggal"></div></div></div>';
    if (!meta.input.length) {
      h += '<div class="card pad mt-16">' + empty('bi-calendar-x', 'Tidak ada kelas yang dapat Anda catat', hasRole('wali_kelas') ? 'Akun Anda belum ditetapkan sebagai wali kelas pada kelas mana pun. Hubungi admin.' : 'Absensi harian dicatat oleh wali kelas. Gunakan tab Rekap bulanan untuk memantau.') + '</div>';
    } else {
      const sudah = meta.input.filter(function (k) { return k.tercatat; }).length;
      h += '<div class="card mt-16"><div class="card-head"><div><h3>' + esc(tglPanjang(meta.tanggal)) + '</h3><div class="xs muted">' + sudah + ' dari ' + meta.input.length + ' kelas sudah dicatat</div></div></div><div class="card-body"><div class="grid g-3">' + meta.input.map(function (k) {
        const t = k.tercatat;
        return '<button class="card pad har-kls" data-act="har-open" data-id="' + esc(k.id) + '"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.nama) + '</b>' + (t ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : k.sebagian ? '<span class="chip blue">Sebagian</span>' : '<span class="chip st-Baru">Belum</span>') + '</div>' +
          '<div class="xs muted mt-8">' + (t ? 'Hadir ' + t.hadir + '/' + k.jumlah + (t.S ? ' · S ' + t.S : '') + (t.I ? ' · I ' + t.I : '') + (t.A ? ' · <b style="color:var(--rose)">A ' + t.A + '</b>' : '') + (t.T ? ' · T ' + t.T : '') + '<br>oleh ' + esc(t.pencatat) + (t.qr ? ' · ' + t.qr + ' lewat QR' : '') : k.sebagian ? '<i class="bi bi-qr-code-scan"></i> ' + k.sebagian.n + '/' + k.jumlah + ' sudah memindai' + (k.sebagian.T ? ' · ' + k.sebagian.T + ' terlambat' : '') + '<br>ketuk untuk melengkapi' : k.jumlah + ' murid · ketuk untuk mencatat') + '</div></button>';
      }).join('') + '</div></div></div>';
    }
    if (meta.libur) h = '<div class="note mb-16"><i class="bi bi-calendar-heart"></i><div><b>' + esc(tglPanjang(meta.tanggal)) + ': ' + esc(meta.libur) + '.</b> Tanggal ini tercatat sebagai hari libur.</div></div>' + h;
    h += '<div id="har-box" class="mt-16"></div>';
    $('#abs-body').innerHTML = h;
    $('#har-tgl').addEventListener('change', function (e) { if (e.target.value) { P.harTgl = e.target.value; harPage({ tanggal: e.target.value }, S.navTok).catch(fail); } });
    if (meta.input.length === 1 && !meta.input[0].tercatat && meta.tanggal === meta.hariIni) harOpen(meta.input[0].id);
  });
}
ACT['har-open'] = function (el) { harOpen(el.dataset.id, el); };
function harOpen(id, btn) {
  if (obAda('har|' + id + '|' + P.harTgl)) { obKirim(); toast('Absensi harian kelas ini masih dikirim ke server. Tunggu beberapa detik.', 'warn'); return; }
  const p = api('harian.roster', { id_kelas: id, tanggal: P.harTgl });
  (btn ? run(btn, p) : p).then(function (r) {
    P.har = { roster: r, rows: r.murid.map(function (m) { return { id: m.id, nama: m.nama, nis: m.nis, status: m.status, catatan: m.catatan, mapel: m.mapel, qr: m.qr, jam: m.jam, belum: m.belum }; }) };
    harDraw();
  }).catch(fail);
}
function harLock() { return P.har.roster.ada && !P.har.roster.bolehSimpan; }
function harRow(m) {
  const lock = harLock();
  const qr = m.qr ? '<span class="chip blue" title="Tercatat dari pindai kartu QR"><i class="bi bi-qr-code-scan"></i> ' + esc(m.jam || 'QR') + '</span>' : (m.belum && !m.status ? '<span class="chip ab-B">Belum memindai</span>' : '');
  const mp = (m.mapel || []).filter(function (x) { return x.status !== 'H'; }).map(function (x) { return '<span class="chip neutral" title="' + esc(x.mapel) + '">Jam ' + esc(x.jam) + ': ' + esc(x.status) + '</span>'; }).join(' ');
  return '<div class="r-row" data-hid="' + esc(m.id) + '"><div class="r-id"><div class="av">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6 trunc">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' ' + qr + ' ' + mp + '</div></div></div>' +
    '<div class="col" style="gap:6px;align-items:flex-end">' + segHtml(m, lock, 'har-set') +
    (m.status && m.status !== 'H' ? '<input class="input" style="min-height:34px;font-size:13px" data-hcat="' + esc(m.id) + '" maxlength="200" placeholder="' + (m.status === 'S' ? 'mis. surat dokter' : m.status === 'I' ? 'mis. izin orang tua' : m.status === 'T' ? 'mis. datang 07.25' : 'Catatan (opsional)') + '" value="' + esc(m.catatan) + '"' + (lock ? ' disabled' : '') + '>' : '') + '</div></div>';
}
function harDraw() {
  const r = P.har.roster, lock = harLock();
  if (!r.murid.length) { $('#har-box').innerHTML = '<div class="card pad">' + empty('bi-people', 'Kelas ini belum memiliki murid aktif') + '</div>'; return; }
  let note = r.ada ? (r.bolehSimpan ? '<div class="note info"><i class="bi bi-pencil-square"></i><div>Sudah dicatat oleh <b>' + esc(r.pencatat) + '</b>. Koreksi masih dapat dilakukan sampai <b>' + r.sisaJam + ' jam</b> lagi.</div></div>' : '<div class="note rose"><i class="bi bi-lock"></i><div>Batas koreksi sudah terlewati. Hubungi admin bila perlu perubahan.</div></div>') : '';
  const belum = P.har.rows.filter(function (x) { return !x.status; }).length;
  if (!r.ada && r.modeQr) note += '<div class="note info' + (note ? ' mt-8' : '') + '"><i class="bi bi-qr-code-scan"></i><div><b>' + r.nQr + ' murid</b> sudah memindai kartu (Hadir/Terlambat terisi otomatis, batas jam masuk ' + esc(r.jamMasuk) + '). ' + (belum ? 'Tentukan status <b>' + belum + ' murid</b> yang belum memindai: Sakit, Izin, Alpa, atau Hadir bila kartunya tertinggal.' : 'Semua murid sudah tercatat.') + '</div></div>';
  if (r.libur) note += '<div class="note' + (note ? ' mt-8' : '') + '"><i class="bi bi-calendar-heart"></i><div>Tanggal ini tercatat sebagai <b>hari libur: ' + esc(r.libur) + '</b>. Absensi harian biasanya tidak perlu dicatat.</div></div>';
  $('#har-box').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>Absensi harian ' + esc(r.kelas) + '</h3><div class="xs muted">' + esc(tglPanjang(r.tanggal)) + '</div></div><button class="btn sm" data-act="har-allh"' + (lock ? ' disabled' : '') + '><i class="bi bi-check2-all"></i> ' + (r.modeQr && !r.ada ? 'Sisanya hadir' : 'Semua hadir') + '</button></div>' +
    '<div class="card-body" style="padding-bottom:0">' + note + '<div class="sumbar mt-12" id="har-sum"></div></div><div class="roster mt-12" id="har-rows">' + P.har.rows.map(harRow).join('') + '</div></div>' +
    '<div class="sticky-save"><div class="xs muted-2" id="har-sum2"></div><button class="btn primary" data-act="har-save"' + (lock ? ' disabled' : '') + '><i class="bi bi-check-circle"></i> ' + (r.ada ? 'Simpan koreksi' : r.nQr ? 'Lengkapi & simpan' : 'Simpan absensi harian') + '</button></div>';
  harSum();
  $('#har-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function harSum() {
  const c = absCounts(P.har.rows);
  $('#har-sum').innerHTML = ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + c[s] + '</b></span>'; }).join('');
  const b = P.har.rows.filter(function (x) { return !x.status; }).length;
  $('#har-sum2').innerHTML = '<b>' + P.har.rows.length + '</b> murid · Masuk <b>' + (c.H + c.T) + '</b> · Tidak masuk <b>' + (c.S + c.I + c.A) + '</b>' + (b ? ' · <b style="color:#D97706">' + b + ' belum ditentukan</b>' : '');
}
ACT['har-set'] = function (el) {
  const row = P.har.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!row) return;
  row.status = el.dataset.s;
  const old = $('[data-hid="' + el.dataset.id + '"]');
  if (old) { const tmp = document.createElement('div'); tmp.innerHTML = harRow(row); old.replaceWith(tmp.firstChild); }
  harSum();
};
ACT['har-allh'] = function () {
  const sisa = P.har.roster.modeQr && !P.har.roster.ada;
  P.har.rows.forEach(function (r) { if (sisa && r.status) return; r.status = 'H'; if (!sisa) r.catatan = ''; else r.catatan = r.catatan || 'Hadir (tanpa pindai kartu)'; });
  $('#har-rows').innerHTML = P.har.rows.map(harRow).join(''); harSum();
};
ACT['har-save'] = function (el) {
  const r = P.har.roster;
  const kosong = P.har.rows.filter(function (x) { return !x.status; });
  if (kosong.length) {
    toast(kosong.length + ' murid belum ditentukan statusnya. Pilih H/S/I/A/T atau tekan "Sisanya hadir".', 'err');
    const row = $('[data-hid="' + kosong[0].id + '"]'); if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const payloadH = { id_kelas: r.id_kelas, tanggal: r.tanggal, koreksi: r.ada === true, entries: P.har.rows.map(function (m) { return { id_murid: m.id, status: m.status, catatan: m.catatan || '' }; }) };
  const cH = absCounts(P.har.rows);
  obTambah('harian.simpan', payloadH, 'Absensi harian ' + r.kelas + ' · ' + fTgl(r.tanggal), 'har|' + r.id_kelas + '|' + r.tanggal, function (res) {
    if (res.alpa && res.alpa.length && res.bolehOrtu && S.page === 'absensi') harTawarOrtu(res.alpa, r.tanggal);
    if (S.page === 'absensi' && P.absTab === 'harian' && $('#har-tgl')) harPage({ tanggal: r.tanggal }, S.navTok).catch(function () { });
  });
  toast('Absensi harian ' + r.kelas + ' disimpan: masuk ' + (cH.H + cH.T) + ' · S ' + cH.S + ' · I ' + cH.I + ' · A ' + cH.A + '.');
  // Kartu kelas langsung berstatus tercatat (optimistis)
  const kk = P.harMeta && P.harMeta.input.filter(function (k) { return k.id === r.id_kelas; })[0];
  if (kk && P.harMeta.tanggal === r.tanggal) { kk.tercatat = { n: P.har.rows.length, hadir: cH.H + cH.T, S: cH.S, I: cH.I, A: cH.A, T: cH.T, qr: 0, pencatat: S.user.nama + ' (mengirim…)' }; kk.sebagian = null; }
  if (kk && P.harMeta.tanggal === r.tanggal) { ccSeed('harian.meta', { tanggal: r.tanggal }, P.harMeta); harPage({ tanggal: r.tanggal }, S.navTok).catch(function () { }); }
  else $('#har-box').innerHTML = '<div class="card pad">' + empty('bi-check2-circle', 'Absensi harian ' + r.kelas + ' tersimpan', 'Dikirim ke server di latar belakang.') + '</div>';
};
/** Setelah menyimpan: tawarkan menghubungi orang tua murid yang Alpa (templat pemberitahuan ketidakhadiran). */
function harTawarOrtu(list, tgl) {
  openModal({
    title: 'Beri tahu orang tua?', sub: list.length + ' murid tercatat Alpa pada ' + tglPanjang(tgl),
    body: '<p class="muted-2">Pesan pemberitahuan ketidakhadiran sudah disiapkan dari templat. Ketuk Hubungi, kirim lewat WhatsApp, lalu satu ketukan untuk mencatatnya.</p><div class="col gap-8 mt-12">' + list.map(function (m) { return '<div class="row between sec"><b>' + esc(m.nama) + '</b><button class="btn sm blue" data-act="har-ortu" data-id="' + esc(m.id) + '" data-t="' + esc(tgl) + '"><i class="bi bi-whatsapp"></i> Hubungi</button></div>'; }).join('') + '</div>',
    foot: '<button class="btn" data-close>Nanti saja</button>'
  });
}
ACT['har-ortu'] = function (el) { closeAllOverlays(); waModal({ id_murid: el.dataset.id, templat: 'absen', tanggal: el.dataset.t }); };

// ── Tab: rekap bulanan absensi harian ──
function rkPage(params, tok) {
  const metaP = P.harMeta ? Promise.resolve(P.harMeta) : apiC('harian.meta', {});
  return metaP.then(function (meta) {
    if (stale(tok)) return;
    P.harMeta = meta;
    if (!meta.lihat.length) { $('#abs-body').innerHTML = '<div class="card pad">' + empty('bi-table', 'Tidak ada kelas yang dapat Anda lihat') + '</div>'; return; }
    const def = P.rkKelas || (S.kelasWali && S.kelasWali[0]) || meta.lihat[0].id;
    $('#abs-body').innerHTML = '<div class="card pad"><form class="form-grid c2" id="f-rk" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      fld({ name: 'id_kelas', label: 'Kelas', type: 'select', opts: meta.lihat.map(function (k) { return { v: k.id, l: k.nama }; }), value: def }) +
      fld({ name: 'bulan', label: 'Bulan', type: 'month', value: P.rkBulan || S.today.substr(0, 7), maxv: S.today.substr(0, 7) }) +
      '<div class="field"><label>&nbsp;</label><button class="btn dark" type="submit"><i class="bi bi-funnel"></i> Tampilkan</button></div></form></div><div id="rk-box" class="mt-16"></div>';
    $('#f-rk').addEventListener('submit', function (e) { e.preventDefault(); rkLoad($('button[type=submit]', e.target)); });
    return rkLoad();
  });
}
function rkLoad(btn) {
  const d = formData($('#f-rk'));
  P.rkKelas = d.id_kelas; P.rkBulan = d.bulan;
  const p = apiC('harian.rekap', d);
  if (!btn) $('#rk-box').innerHTML = skeleton(2);
  return (btn ? run(btn, p) : p).then(function (r) {
    P.rk = r;
    const t = r.total;
    let h = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>Rekap harian ' + esc(r.kelas) + '</h3><div class="xs muted">' + esc(blnPanjang(r.bulan)) + ' · ' + r.hari.length + ' hari tercatat · Wali kelas: ' + esc(r.wali || '-') + '</div></div><div class="row" style="gap:6px"><button class="btn sm" data-act="rk-cetak"' + (r.hari.length ? '' : ' disabled') + '><i class="bi bi-printer"></i> Cetak</button><button class="btn sm" data-act="rk-csv"' + (r.hari.length ? '' : ' disabled') + '><i class="bi bi-filetype-csv"></i> Ekspor CSV</button></div></div>';
    if (!r.hari.length) { $('#rk-box').innerHTML = h + '<div class="card-body">' + empty('bi-calendar-x', 'Belum ada absensi harian pada bulan ini') + '</div></div>'; return; }
    const kol = rkKolom(r), bel = kol.filter(function (k) { return k.t === 'miss'; });
    h += '<div class="card-body"><div class="sumbar">' + ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + t[s] + '</b></span>'; }).join('') + '<span class="sum">Kehadiran <b>' + (r.hadir === null ? '-' : r.hadir + '%') + '</b></span>' +
      '<span class="sum"><span class="dotc" style="background:' + RK_WARNA.miss + ';border:1px solid #F59E0B"></span>Belum diabsen <b>' + bel.length + ' hari</b></span></div>' +
      (bel.length ? '<div class="xs mt-8" style="color:#B45309"><i class="bi bi-exclamation-triangle"></i> Hari sekolah belum diabsen: tanggal ' + bel.map(function (k) { return +k.d.substr(8, 2); }).join(', ') + '. Catat lewat tab Harian dengan memilih tanggalnya.</div>' : '') + '</div>';
    h += '<div class="tbl-wrap"><table class="tbl rk-tbl"><thead><tr><th class="rk-nm">Nama murid</th>' + kol.map(function (k) { return '<th title="' + esc(tglPanjang(k.d) + (k.ket ? ' · ' + k.ket : '')) + '"' + rkGaya(k) + '>' + (+k.d.substr(8, 2)) + '<br><span class="xs muted">' + k.hr + '</span></th>'; }).join('') + '<th>S</th><th>I</th><th>A</th><th>T</th><th>%</th></tr></thead><tbody>' +
      r.murid.map(function (m) {
        return '<tr><td class="rk-nm"><div class="fw6 trunc">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.nis) + '</div></td>' + kol.map(function (k) {
          const x = m.st[k.d];
          if (x) return '<td class="rk-c rk-' + x.s + '"' + (x.c ? ' title="' + esc(x.c) + '"' : '') + '>' + (x.s === 'H' ? '•' : x.s) + '</td>';
          if (k.t === 'rec') return '<td class="rk-c muted">-</td>';
          return '<td class="rk-c muted"' + rkGaya(k) + (k.ket ? ' title="' + esc(k.ket) + '"' : '') + '>' + (k.t === 'lib' ? 'L' : '') + '</td>';
        }).join('') +
          '<td>' + m.S + '</td><td>' + m.I + '</td><td' + (m.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + m.A + '</td><td>' + m.T + '</td><td class="fw6">' + (m.hadir === null ? '-' : m.hadir) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="card-body xs muted">• = hadir · S sakit · I izin · A alpa · T terlambat · <b>L</b> = libur (abu-abu) · kolom kuning = hari sekolah belum diabsen. Persentase dihitung dari hari yang sudah diabsen. Arahkan kursor ke sel untuk melihat catatan.' + (r.qr ? ' ' + r.qr + ' dari ' + r.catatan + ' catatan berasal dari pindai kartu QR.' : '') + rkKetLibur(kol, fTgl) + '</div></div>';
    $('#rk-box').innerHTML = h;
  }).catch(function (e) { isiHtml('#rk-box', errBox(e)); });
}
// Kolom rekap bulanan: semua tanggal 1–akhir bulan.
// t: 'rec' sudah diabsen · 'lib' akhir pekan/libur · 'miss' hari sekolah belum diabsen · 'fut' belum tiba.
const RK_WARNA = { lib: 'rgba(148,163,184,.22)', miss: 'rgba(245,158,11,.22)' };
function rkKolom(r) {
  const y = +r.bulan.substr(0, 4), mo = +r.bulan.substr(5, 2), n = new Date(y, mo, 0).getDate();
  const ada = {}, lib = {}, hs = r.hs === 6 ? 6 : 5, out = [];
  r.hari.forEach(function (d) { ada[d] = 1; });
  (r.libur || []).forEach(function (x) { lib[x.tanggal] = x.k; });
  for (let i = 1; i <= n; i++) {
    const d = r.bulan + '-' + (i < 10 ? '0' : '') + i, w = new Date(y, mo - 1, i).getDay();
    const pekan = w === 0 || (w === 6 && hs === 5), ket = lib[d] || (pekan ? (w === 0 ? 'Hari Minggu' : 'Hari Sabtu') : '');
    const t = ada[d] ? 'rec' : (lib[d] || pekan) ? 'lib' : d > S.today ? 'fut' : 'miss';
    out.push({ d: d, t: t, ket: ket, libKhusus: !!lib[d], hr: HRI[w].substr(0, 3) });
  }
  return out;
}
function rkGaya(k) { return k.t === 'lib' || k.t === 'miss' ? ' style="background:' + RK_WARNA[k.t] + ';-webkit-print-color-adjust:exact;print-color-adjust:exact"' : ''; }
function rkKetLibur(kol, fmt) {
  const l = kol.filter(function (k) { return k.libKhusus; });
  return l.length ? '<br>Hari libur bulan ini: ' + l.map(function (k) { return esc(fmt(k.d)) + ' (' + esc(k.ket) + ')'; }).join(', ') + '. Akhir pekan ditandai L.' : '<br>Akhir pekan ditandai L. Belum ada hari libur lain yang diisi admin untuk bulan ini.';
}
function blnPanjang(b) { const n = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return n[+b.substr(5, 2) - 1] + ' ' + b.substr(0, 4); }
ACT['rk-csv'] = function () {
  const r = P.rk; if (!r) return;
  const kol = rkKolom(r), bel = kol.filter(function (k) { return k.t === 'miss'; }), lk = kol.filter(function (k) { return k.libKhusus; });
  const rows = [['Rekap absensi harian', r.kelas, blnPanjang(r.bulan)], [], ['NIS', 'Nama'].concat(kol.map(function (k) { return k.d.substr(8, 2); })).concat(['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Kehadiran (%)'])]
    .concat(r.murid.map(function (m) { return [m.nis, m.nama].concat(kol.map(function (k) { return m.st[k.d] ? m.st[k.d].s : k.t === 'lib' ? 'L' : k.t === 'miss' ? '?' : ''; })).concat([m.H, m.S, m.I, m.A, m.T, m.hadir === null ? '' : m.hadir]); }))
    .concat([[], ['Keterangan: H hadir, S sakit, I izin, A alpa, T terlambat, L libur, ? hari sekolah belum diabsen. Persentase dihitung dari hari yang sudah diabsen.'],
      ['Hari libur: ' + (lk.length ? lk.map(function (k) { return +k.d.substr(8, 2) + ' (' + k.ket + ')'; }).join('; ') : '-') + '; akhir pekan ditandai L.'],
      ['Belum diabsen: ' + (bel.length ? 'tanggal ' + bel.map(function (k) { return +k.d.substr(8, 2); }).join(', ') : '-')]]);
  const csv = '﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'absensi_harian_' + r.kelas.replace(/\s+/g, '_') + '_' + r.bulan + '.csv');
  toast('CSV diunduh.');
};

// ════════════════════════════════════════════════════════════
// Lapor Kejadian (F3)
// ════════════════════════════════════════════════════════════
// Kejadian yang sering terjadi: mengisi kategori, contoh kronologi, dan cara penanganan yang lazim (tetap dapat diubah).
const KEJADIAN_CEPAT = [
  { t: 'Terlambat masuk kelas', k: 'Kehadiran', m: 'info', kr: 'Terlambat masuk kelas pada jam pelajaran saya sekitar ... menit. Alasan yang disampaikan murid: ...' },
  { t: 'Tidak mengerjakan tugas', k: 'Akademik', m: 'info', kr: 'Tidak mengerjakan/mengumpulkan tugas ... yang diberikan pada tanggal .... Saat ditanya, murid menyampaikan: ...' },
  { t: 'Tidak membawa perlengkapan', k: 'Akademik', m: 'info', kr: 'Tidak membawa buku/perlengkapan belajar yang diperlukan pada pelajaran ....' },
  { t: 'Mengganggu pembelajaran', k: 'Perilaku', m: 'info', kr: 'Selama pembelajaran berbicara/bercanda berulang kali sehingga teman terganggu. Sudah diingatkan ... kali.' },
  { t: 'Bermain HP saat pelajaran', k: 'Perilaku', m: 'info', kr: 'Menggunakan telepon genggam untuk ... saat pembelajaran berlangsung tanpa izin.' },
  { t: 'Meninggalkan kelas tanpa izin', k: 'Kehadiran', m: 'rujuk_bina', kr: 'Meninggalkan kelas pada jam pelajaran ke-... tanpa izin dan kembali setelah ... menit / tidak kembali.' },
  { t: 'Tampak murung / menarik diri', k: 'Sosial-Emosional', m: 'rujuk', kr: 'Dalam beberapa hari terakhir terlihat murung, tidak mau berinteraksi dengan teman, dan ....' },
  { t: 'Konflik dengan teman', k: 'Perilaku', m: 'rujuk', kr: 'Terjadi pertengkaran dengan ... di ... sekitar pukul .... Yang terlihat: ....' },
  { t: 'Dugaan perundungan', k: 'Sosial-Emosional', m: 'rujuk', u: 0, kr: 'Teramati/diterima informasi bahwa murid ... oleh/terhadap ... di .... Bentuknya: ....' }
];
const MODE_LAPOR = [
  { v: 'info', t: 'Sudah saya bina', s: 'Sebagai informasi untuk BK. Tidak perlu ditangani segera.', ic: 'bi-check2-circle', cls: 'low' },
  { v: 'rujuk_bina', t: 'Sudah dibina, perlu tindak lanjut BK', s: 'Pembinaan belum cukup; BK diminta menindaklanjuti.', ic: 'bi-arrow-right-circle', cls: 'mid' },
  { v: 'rujuk', t: 'Mohon ditangani Guru BK', s: 'Belum ditangani; perlu keahlian BK.', ic: 'bi-send', cls: '' }
];
PAGES.lapor = function (params, tok) {
  const isBK = hasRole('guru_bk');
  P.lap = { murid: null, murids: [], pkKelas: '', kategori: S.refs.kejadian[0] || '', urgensi: ((isBK ? S.refs.urgensi[1] : S.refs.urgensi[S.refs.urgensi.length - 1]) || S.refs.urgensi[0] || {}).nama || '', file: null, mode: isBK ? 'rujuk' : 'info' };
  const render = function () {
    if (stale(tok)) return;
    const l = P.lap;
    let h = pageHead('Kolaborasi BK', 'Lapor Kejadian Murid', 'Catat kejadian secara objektif. Pilih apakah Anda sudah membina sendiri (cukup sebagai informasi untuk BK) atau perlu ditangani Guru BK.', '');
    h += '<div class="card pad" style="max-width:860px"><form id="f-lap" class="col gap-16" novalidate>' +
      '<div class="field" data-f="id_murid"><span class="flabel">Murid terkait <span class="req">*</span></span><div id="lap-murid">' + muridPickerHtml() + '</div><div class="err" role="alert"></div></div>' +
      '<div class="field"><span class="flabel">Kejadian yang sering terjadi <span class="xs muted">(opsional, mengisi otomatis)</span></span><div class="fchips wrapc">' + KEJADIAN_CEPAT.map(function (x, i) { return '<button type="button" class="fchip" data-act="lap-cepat" data-i="' + i + '">' + esc(x.t) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="flabel">Kategori kejadian</span><div class="fchips wrapc" id="lap-kats">' + S.refs.kejadian.map(function (k) { return '<button type="button" class="fchip ' + (k === l.kategori ? 'active' : '') + '" data-act="lap-kat" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="flabel">Tingkat urgensi</span><div class="opt-tiles" id="lap-urgs">' + S.refs.urgensi.map(function (u, i) { return '<button type="button" class="opt-tile ' + (u.nama === l.urgensi ? 'on ' + (i === 1 ? 'mid' : i >= 2 ? 'low' : '') : '') + '" data-act="lap-urg" data-v="' + esc(u.nama) + '" data-i="' + i + '">' + esc(u.nama) + '<small>' + esc(u.ket) + '</small></button>'; }).join('') + '</div></div>' +
      (S.cfg.poinAktif && S.refs.poinAturan && S.refs.poinAturan.some(function (a) { return a.j === 'L'; }) ? '<div class="field"><label for="lap-poin">Pelanggaran tata tertib (poin) <span class="xs muted">— opsional</span></label><select class="select" id="lap-poin" name="id_aturan"><option value="">— Bukan pelanggaran tata tertib / tanpa poin —</option>' + pnAturanOpts(S.refs.poinAturan.map(function (a) { return Object.assign({ a: 1 }, a); }), 'L') + '</select><div class="hint">' + (isBK ? 'Poin dari Guru BK langsung sah.' : 'Poin dicatat untuk setiap murid yang dipilih dan menunggu verifikasi Guru BK.') + '</div></div>' : '') +
      '<div class="form-grid c2">' + fld({ name: 'tanggal', label: 'Tanggal kejadian', type: 'date', req: true, value: S.today, maxv: S.today }) + fld({ name: 'jam_ke', label: 'Jam ke- (opsional)', ph: 'mis. 5 atau 5-6', max: 6 }) + '</div>' +
      fld({ name: 'lokasi', label: 'Lokasi / tempat (opsional)', max: 120, ph: 'mis. Ruang kelas, kantin' }) +
      '<div class="field" data-f="kronologi"><label for="f_kronologi">Kronologi faktual & objektif <span class="req">*</span></label><textarea class="textarea" id="f_kronologi" name="kronologi" rows="5" maxlength="5000" placeholder="Tuliskan apa yang terlihat/terdengar: waktu, tindakan yang teramati, respons murid. Hindari pelabelan sifat."></textarea><div class="row between"><span class="hint">Minimal 20 karakter. Hindari label seperti "anak nakal".</span><span class="hint" id="kr-count">0 / 5000</span></div><div class="err" role="alert"></div></div>' +
      (isBK ? '' : '<div class="field"><span class="flabel">Bagaimana penanganannya? <span class="req">*</span></span><div class="mode-tiles" id="lap-modes">' + MODE_LAPOR.map(function (x) { return '<button type="button" class="mode-tile ' + (x.v === l.mode ? 'on' : '') + ' ' + x.cls + '" data-act="lap-mode" data-v="' + x.v + '"><i class="bi ' + x.ic + '"></i><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></button>'; }).join('') + '</div></div>' +
        '<div id="lap-bina" class="sub-panel">' + fld({ name: 'tindakan', label: 'Pembinaan yang sudah Anda lakukan', type: 'textarea', rows: 3, max: 1500, req: true, ph: 'mis. Menegur secara pribadi setelah pelajaran, mengajak murid merefleksikan dampaknya, membuat kesepakatan datang tepat waktu.' }) + fld({ name: 'hasil', label: 'Respons / hasil (opsional)', type: 'textarea', rows: 2, max: 1500, ph: 'mis. Murid mengakui dan berjanji tidak mengulangi.' }) + '</div>' +
        '<div id="lap-rj" class="sub-panel hide">' + fld({ name: 'alasan', label: 'Mengapa perlu Guru BK? (opsional)', type: 'textarea', rows: 2, max: 1500, ph: 'mis. Sudah ketiga kalinya dalam bulan ini; murid tampak ada masalah di rumah.' }) + '</div>') +
      '<div class="field"><span class="flabel">Lampiran (opsional)</span><label class="drop" id="drop-lap" for="file-lap"><i class="bi bi-paperclip"></i> <span id="drop-nm">Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)</span></label><input type="file" id="file-lap" class="sr" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"></div>' +
      '<div id="lap-info" class="note info"></div>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="nav" data-page="beranda">Batal</button><button type="submit" class="btn primary" id="lap-kirim"><i class="bi bi-send"></i> Kirim laporan</button></div></form></div>';
    $('#app-container').innerHTML = h;
    const f = $('#f-lap');
    $('#f_kronologi').addEventListener('input', function (e) { $('#kr-count').textContent = e.target.value.length + ' / 5000'; });
    $('#file-lap').addEventListener('change', function (e) {
      const fl = e.target.files[0];
      readFileB64(fl, 5 * 1024 * 1024).then(function (b) { P.lap.file = b; $('#drop-nm').textContent = b ? b.nama : 'Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)'; $('#drop-lap').classList.toggle('has', !!b); })
        .catch(function (er) { e.target.value = ''; P.lap.file = null; $('#drop-lap').classList.remove('has'); fail(er); });
    });
    lapModeUI();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      const d = formData(f);
      d.id_murid = P.lap.murids.length ? P.lap.murids[0].id : '';
      if (P.lap.murids.length > 1) d.id_murid_list = P.lap.murids.map(function (m) { return m.id; });
      const rules = { id_murid: { label: 'Murid', req: true }, kronologi: { label: 'Kronologi', req: true, min: 20 }, tanggal: { label: 'Tanggal', req: true } };
      if (!isBK && P.lap.mode !== 'rujuk') rules.tindakan = { label: 'Pembinaan yang sudah dilakukan', req: true, min: 5 };
      if (!validate(f, d, rules)) return;
      if (!isBK && P.lap.mode === 'info' && urgIdx(P.lap.urgensi) === 0) { toast('Laporan mendesak harus ditangani Guru BK. Pilih cara penanganan lain.', 'err'); return; }
      d.kategori = P.lap.kategori; d.urgensi = P.lap.urgensi; d.berkas = P.lap.file; d.mode = P.lap.mode;
      run($('#lap-kirim'), api('kejadian.buat', d)).then(function (r) { lapSukses(r); }).catch(fail);
    });
    wirePicker();
  };
  if (params.id_murid) {
    apiC('murid.cari', { q: params.nama || '' }).then(function (rows) { const m = rows.filter(function (x) { return x.id === params.id_murid; })[0]; if (m) { P.lap.murids = [m]; P.lap.pkKelas = m.id_kelas; } render(); }).catch(function () { render(); });
  } else render();
};
function lapModeUI() {
  const md = P.lap.mode, bina = $('#lap-bina'), rj = $('#lap-rj'), info = $('#lap-info');
  if (bina) bina.classList.toggle('hide', md === 'rujuk');
  if (rj) rj.classList.toggle('hide', md === 'info');
  $$('#lap-modes .mode-tile').forEach(function (b) { b.classList.toggle('on', b.dataset.v === md); });
  if (info) info.innerHTML = '<i class="bi bi-info-circle"></i><div>' + (hasRole('guru_bk') ? 'Laporan dari Guru BK langsung berstatus <b>Diproses</b> dengan Anda sebagai penanggung jawab.' :
    md === 'info' ? 'Laporan tercatat sebagai <b>pembinaan guru</b>. Guru BK menerima pemberitahuan untuk <b>mengetahui dan memantau</b>, tanpa harus menangani segera. Bila kejadian berulang, sistem menandainya.' :
    md === 'rujuk_bina' ? 'Pembinaan Anda tercatat, lalu <b>rujukan otomatis</b> dikirim ke Guru BK untuk ditindaklanjuti.' :
    'Laporan dikirim sebagai <b>rujukan</b> kepada Guru BK untuk ditangani.' + (urgIdx(P.lap.urgensi) === 0 ? ' Karena mendesak, Guru BK langsung diberi tahu.' : '')) + '</div>';
}
ACT['lap-mode'] = function (el) { P.lap.mode = el.dataset.v; lapModeUI(); };
ACT['lap-cepat'] = function (el) {
  const x = KEJADIAN_CEPAT[+el.dataset.i]; if (!x) return;
  $$('[data-act=lap-cepat]').forEach(function (b) { b.classList.toggle('active', b === el); });
  const kat = S.refs.kejadian.indexOf(x.k) >= 0 ? x.k : P.lap.kategori;
  P.lap.kategori = kat;
  $$('[data-act=lap-kat]').forEach(function (b) { b.classList.toggle('active', b.dataset.v === kat); });
  const ui = x.u === 0 ? 0 : (x.m === 'info' ? 2 : 1);
  const urg = S.refs.urgensi[Math.min(ui, S.refs.urgensi.length - 1)];
  if (urg) { const t = $$('[data-act=lap-urg]').filter(function (b) { return b.dataset.v === urg.nama; })[0]; if (t) ACT['lap-urg'](t); }
  if (!hasRole('guru_bk')) P.lap.mode = x.m;
  const k = $('#f_kronologi');
  if (k && (!k.value.trim() || k.dataset.auto === '1')) { k.value = x.kr; k.dataset.auto = '1'; k.dispatchEvent(new Event('input')); }
  lapModeUI();
};
// ── Pemilih murid: pilih kelas → ketuk nama (boleh lebih dari satu murid), atau ketik nama/NIS ──
function lapKelasList() {
  const ids = S.kelasAkses || null;
  return S.refs.kelas.filter(function (k) { return !ids || ids.indexOf(k.id) >= 0; });
}
function muridPickerHtml() {
  const l = P.lap, kl = lapKelasList();
  if (!l.pkKelas) l.pkKelas = (S.kelasWali && S.kelasWali[0] && kl.some(function (k) { return k.id === S.kelasWali[0]; })) ? S.kelasWali[0] : (kl.length === 1 ? kl[0].id : '');
  const terpilih = l.murids.length ? '<div class="pk-sel">' + l.murids.map(function (m, i) { return '<span class="pk-chip"><b>' + esc(m.nama) + '</b> · ' + esc(m.kelas) + '<button type="button" data-act="lap-lepas" data-i="' + i + '" aria-label="Hapus ' + esc(m.nama) + '"><i class="bi bi-x-lg"></i></button></span>'; }).join('') +
    (l.murids.length > 1 ? '<span class="xs muted">' + l.murids.length + ' murid · masing-masing mendapat catatan kasus sendiri</span>' : '') + '</div>' : '';
  return terpilih +
    '<div class="pk-kelas fchips" role="group" aria-label="Pilih kelas">' + kl.map(function (k) { return '<button type="button" class="fchip ' + (k.id === l.pkKelas ? 'active' : '') + '" data-act="lap-kelas" data-id="' + esc(k.id) + '">' + esc(k.nama) + '</button>'; }).join('') + '</div>' +
    '<div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="lap-q" class="input" style="padding-left:36px" type="search" placeholder="' + (l.pkKelas ? 'Saring nama di kelas ini, atau ketik nama/NIS dari kelas lain…' : 'Pilih kelas di atas, atau ketik nama/NIS murid…') + '" autocomplete="off"></div>' +
    '<div id="lap-daftar" class="pk-daftar mt-8">' + (l.pkKelas ? '<div class="xs muted">Memuat daftar murid…</div>' : '') + '</div>';
}
function lapDaftarGambar(rows, q) {
  const box = $('#lap-daftar'); if (!box) return;
  P.lap.hits = rows;
  const ada = {}; P.lap.murids.forEach(function (m) { ada[m.id] = true; });
  box.innerHTML = rows.length ? rows.map(function (m, i) {
    return '<button type="button" class="pk-m' + (ada[m.id] ? ' on' : '') + '" data-act="lap-pick" data-i="' + i + '" aria-pressed="' + !!ada[m.id] + '"><i class="bi ' + (ada[m.id] ? 'bi-check-circle' : 'bi-circle') + '"></i><span><b>' + esc(m.nama) + '</b><small>' + (q ? esc(m.kelas) + ' · ' : '') + 'NIS ' + esc(m.nis) + '</small></span></button>';
  }).join('') : '<div class="xs muted">Tidak ada murid yang cocok.</div>';
}
function lapMuatDaftar() {
  const q = ($('#lap-q') || {}).value ? $('#lap-q').value.trim() : '';
  const kls = P.lap.pkKelas;
  if (!kls && q.length < 2) { const b = $('#lap-daftar'); if (b) b.innerHTML = ''; return; }
  const lokal = kls && q.length < 2;
  apiC('murid.cari', lokal ? { q: '', id_kelas: kls } : { q: q }).then(function (rows) {
    if (lokal || !kls) return lapDaftarGambar(rows, !lokal);
    // Ketik saat kelas terpilih: utamakan murid kelas itu, tetap tampilkan dari kelas lain.
    rows = rows.slice().sort(function (a, b) { return (a.id_kelas === kls ? 0 : 1) - (b.id_kelas === kls ? 0 : 1); });
    lapDaftarGambar(rows, true);
  }).catch(fail);
}
function wirePicker() {
  const q = $('#lap-q'); if (!q) return;
  q.addEventListener('input', debounce(lapMuatDaftar, 220));
  lapMuatDaftar();
}
function lapPickerUlang() { $('#lap-murid').innerHTML = muridPickerHtml(); wirePicker(); }
ACT['lap-kelas'] = function (el) { P.lap.pkKelas = el.dataset.id; lapPickerUlang(); };
ACT['lap-pick'] = function (el) {
  const m = P.lap.hits[+el.dataset.i]; if (!m) return;
  const i = P.lap.murids.map(function (x) { return x.id; }).indexOf(m.id);
  if (i >= 0) P.lap.murids.splice(i, 1);
  else { if (P.lap.murids.length >= 10) { toast('Paling banyak 10 murid dalam satu laporan.', 'warn'); return; } P.lap.murids.push(m); }
  setErr($('#f-lap'), 'id_murid', '');
  const q = $('#lap-q'), qv = q ? q.value : '';
  $('#lap-murid').innerHTML = muridPickerHtml(); wirePicker();
  if (qv && $('#lap-q')) { $('#lap-q').value = qv; lapMuatDaftar(); }
};
ACT['lap-lepas'] = function (el) { P.lap.murids.splice(+el.dataset.i, 1); lapPickerUlang(); };
ACT['lap-ganti'] = function () { P.lap.murids = []; lapPickerUlang(); };
ACT['lap-kat'] = function (el) { P.lap.kategori = el.dataset.v; $$('[data-act=lap-kat]').forEach(function (b) { b.classList.toggle('active', b === el); }); };
ACT['lap-urg'] = function (el) {
  P.lap.urgensi = el.dataset.v;
  $$('[data-act=lap-urg]').forEach(function (b) { b.className = 'opt-tile' + (b === el ? ' on ' + (b.dataset.i === '1' ? 'mid' : +b.dataset.i >= 2 ? 'low' : '') : ''); });
  if (+el.dataset.i === 0 && P.lap.mode === 'info') P.lap.mode = 'rujuk_bina';
  lapModeUI();
};
function lapSukses(r) {
  const pesan = r.mode === 'info' ? 'Laporan dan pembinaan Anda tercatat. Guru BK diberi tahu sebagai informasi dan akan meninjau. Anda akan menerima pemberitahuan setelah ditinjau.'
    : r.mode === 'rujuk_bina' ? 'Pembinaan Anda tercatat dan rujukan sudah dikirim ke Guru BK untuk ditindaklanjuti.'
    : hasRole('guru_bk') ? 'Laporan tercatat dengan status Diproses.' : 'Laporan sudah dikirim ke Guru BK sebagai rujukan.';
  $('#app-container').innerHTML = pageHead('Kolaborasi BK', 'Laporan terkirim', '', '') +
    '<div class="card pad" style="max-width:640px;text-align:center"><div style="font-size:48px;color:var(--teal)"><i class="bi bi-check-circle-fill"></i></div><h2 class="mt-8">' + esc(r.banyak ? r.banyak.length + ' laporan tercatat' : r.kode) + '</h2>' +
    (r.banyak ? '<div class="xs muted mt-8">' + r.banyak.map(function (x) { return esc(x.kode) + ' · ' + esc(x.nama); }).join('<br>') + '</div>' : '') + '<p class="muted mt-8">' + esc(pesan) + '</p>' +
    (r.poin ? '<div class="note info mt-12" style="text-align:left"><i class="bi bi-award"></i><div><b>Poin tata tertib:</b> ' + esc(r.poin.aturan) + ' (+' + r.poin.poin + ')' + (r.poin.n > 1 ? ' untuk ' + r.poin.n + ' murid' : '') + ' · ' + (r.poin.status === 'Sah' ? 'langsung sah.' : 'menunggu verifikasi Guru BK.') + (r.poin.dup ? ' <b>Perhatian:</b> sudah ada catatan serupa pada tanggal yang sama; Guru BK akan memeriksanya.' : '') + '</div></div>' : '') +
    (r.berulang ? '<div class="note rose mt-12" style="text-align:left"><i class="bi bi-arrow-repeat"></i><div><b>Kejadian berulang.</b> Murid ini sudah ' + r.ulang + ' kali dilaporkan dalam 30 hari terakhir.' + (r.mode === 'info' ? ' Pertimbangkan merujuk ke Guru BK.' : '') + '</div></div>' : '') +
    '<div class="row wrap mt-16" style="justify-content:center">' + (r.mode === 'info' && r.berulang ? '<button class="btn primary" data-act="lap-rujuk" data-id="' + esc(r.id) + '" data-k="' + esc(r.kode) + '"><i class="bi bi-send"></i> Rujuk ke Guru BK</button>' : '') + '<button class="btn" data-act="kasus-open-nav" data-id="' + esc(r.id) + '">Lihat laporan</button><button class="btn ghost" data-act="nav" data-page="lapor">Lapor lagi</button></div></div>';
  window.scrollTo(0, 0);
}
ACT['lap-rujuk'] = function (el) { openRujukanModal(el.dataset.id, el.dataset.k, P.lap && P.lap.urgensi, function () { navigateTo('kasus', { open: el.dataset.id }); }); };
ACT['kasus-open-nav'] = function (el) { navigateTo('kasus', { open: el.dataset.id }); };

'use strict';
// ════════════════════════════════════════════════════════════
// Rujukan & Kasus (F4, F5, F8) + drawer rincian
// ════════════════════════════════════════════════════════════
PAGES.kasus = function (params, tok) {
  P.ks = { saya: false, tinjau: params.filter === 'tinjau', status: params.status || '', rujukan: params.rujukan || '', kategori: '', urgensi: '', id_kelas: '', q: '', page: 1, tab: 'kasus', counts: null };
  const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
  let h = pageHead('Kolaborasi penanganan', 'Rujukan & Alur Penanganan Kasus', 'Kolaborasi guru mapel, wali kelas, dan Guru BK dalam menangani permasalahan murid secara terstruktur.', lapor ? '<button class="btn primary" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '');
  if (hasRole('guru_bk')) h += '<div class="banner mb-16"><i class="bi bi-shield-lock"></i><div><b>Prinsip Kerahasiaan BK</b><div class="xs" style="margin-top:2px">Asesmen dan catatan konseling hanya dapat dibuka oleh Guru BK. Wali kelas dan guru mapel hanya melihat status alur dan rekomendasi bimbingan.</div></div></div>';
  h += '<div class="tabs mb-16" id="ks-tabs"><button class="tab active" data-act="ks-tab" data-t="kasus">Kasus</button><button class="tab" data-act="ks-tab" data-t="tl">Tindak lanjut</button></div><div id="ks-body"></div>';
  $('#app-container').innerHTML = h;
  return ksLoad(true).then(function () { if (!stale(tok) && params.open) openKasus(params.open); });
};
ACT['ks-tab'] = function (el) {
  P.ks.tab = el.dataset.t;
  $$('#ks-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  if (P.ks.tab === 'kasus') ksLoad(true); else tlLoad();
};
function ksParams() { const k = P.ks; return { saya: k.saya ? 1 : 0, tinjau: k.tinjau ? 1 : 0, status: k.status, kategori: k.kategori, urgensi: k.urgensi, id_kelas: k.id_kelas, q: k.q, rujukan: k.rujukan, page: k.page }; }
function ksLoad(full) {
  return apiC('kasus.list', ksParams()).then(function (r) {
    P.ks.counts = r.counts;
    const k = P.ks;
    if (full || !$('#ks-list')) {
      const st = ['Semua'].concat(S.refs.statusKasus);
      $('#ks-body').innerHTML = '<div class="fchips mb-8" id="ks-chips"></div>' +
        '<div class="card pad mb-16"><div class="form-grid c2" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"><div class="field"><label>Cari</label><input class="input" id="ks-q" type="search" placeholder="Nama, NIS, kode, pelapor…" value="' + esc(k.q) + '"></div>' +
        fld({ name: 'kategori', id: 'ks-kat', label: 'Kategori', type: 'select', blank: 'Semua kategori', opts: S.refs.kejadian, value: k.kategori }) +
        fld({ name: 'urgensi', id: 'ks-urg', label: 'Urgensi', type: 'select', blank: 'Semua urgensi', opts: S.refs.urgensi.map(function (u) { return u.nama; }), value: k.urgensi }) +
        fld({ name: 'id_kelas', id: 'ks-kls', label: 'Kelas', type: 'select', blank: 'Semua kelas', opts: kelasOpts(), value: k.id_kelas }) +
        '<div class="field"><label>&nbsp;</label><button class="btn" data-act="ks-reset"><i class="bi bi-funnel"></i> Reset</button></div></div></div><div class="card" id="ks-list"></div>';
      $('#ks-q').addEventListener('input', debounce(function (e) { P.ks.q = e.target.value.trim(); P.ks.page = 1; ksLoad(); }, 300));
      ['ks-kat', 'ks-urg', 'ks-kls'].forEach(function (id) { $('#' + id).addEventListener('change', function (e) { P.ks[{ 'ks-kat': 'kategori', 'ks-urg': 'urgensi', 'ks-kls': 'id_kelas' }[id]] = e.target.value; P.ks.page = 1; ksLoad(); }); });
    }
    const total = r.totalSemua;
    $('#ks-chips').innerHTML = ['Semua'].concat(S.refs.statusKasus).map(function (s) {
      const n = s === 'Semua' ? total : (r.counts.status[s] || 0);
      const on = (k.status || 'Semua') === s;
      return '<button class="fchip ' + (on ? 'active' : '') + '" data-act="ks-status" data-s="' + esc(s) + '">' + esc(s) + ' (' + n + ')</button>';
    }).join('') + (k.rujukan ? '<button class="fchip active" data-act="ks-rj-off"><i class="bi bi-x"></i> Rujukan ' + esc(k.rujukan) + '</button>' : '') +
      (hasRole('guru_bk') ? '<button class="fchip ' + (k.tinjau ? 'active' : '') + '" data-act="ks-tinjau" title="Laporan guru yang belum Anda tinjau, termasuk yang sudah dibina guru"><i class="bi bi-eye"></i> Perlu ditinjau</button><button class="fchip ' + (k.saya ? 'active' : '') + '" data-act="ks-saya" title="Kasus yang menjadi tanggung jawab Anda atau belum memiliki penanggung jawab"><i class="bi bi-person-check"></i> Kasus saya</button>' : (hasRole('wali_kelas') ? '<button class="fchip ' + (k.saya ? 'active' : '') + '" data-act="ks-saya" title="Kasus yang dilimpahkan Guru BK kepada Anda"><i class="bi bi-arrow-left-right"></i> Dilimpahkan ke saya</button>' : ''));
    $('#ks-list').innerHTML = r.rows.length ? '<div class="cases">' + r.rows.map(caseRow).join('') + '</div>' + pager(r, 'ks-page') : empty('bi-inbox', 'Tidak ada kasus yang cocok', 'Ubah filter atau laporkan kejadian baru.');
  });
}
ACT['ks-status'] = function (el) { P.ks.status = el.dataset.s === 'Semua' ? '' : el.dataset.s; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-tinjau'] = function () { P.ks.tinjau = !P.ks.tinjau; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-saya'] = function () { P.ks.saya = !P.ks.saya; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-rj-off'] = function () { P.ks.rujukan = ''; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-reset'] = function () { P.ks = Object.assign(P.ks, { saya: false, tinjau: false, status: '', rujukan: '', kategori: '', urgensi: '', id_kelas: '', q: '', page: 1 }); ksLoad(true).catch(fail); };
ACT['ks-page'] = function (el) { P.ks.page = +el.dataset.page; ksLoad().catch(fail); const c = $('#ks-list'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
ACT['kasus-open'] = function (el) { openKasus(el.dataset.id); };

function tlLoad() {
  $('#ks-body').innerHTML = skeleton(3);
  apiC('monitoring.daftar').then(function (rows) {
    if (!$('#ks-body')) return;
    $('#ks-body').innerHTML = '<div class="card">' + (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kasus</th><th>Murid</th><th>Tindak lanjut</th><th>Penanggung jawab</th><th>Status</th><th>Tinjau</th></tr></thead><tbody>' + rows.map(function (x) {
      return '<tr class="click" data-act="kasus-open" data-id="' + esc(x.id_kasus) + '"><td class="mono">' + esc(x.kode) + '</td><td class="fw6">' + esc(x.murid) + '</td><td>' + esc(x.tindak_lanjut) + '</td><td>' + esc(x.pj_nama) + '</td><td><span class="chip ' + (x.status === 'Selesai' ? 'st-Selesai' : x.status === 'Berjalan' ? 'st-Diproses' : 'st-Baru') + '">' + esc(x.status) + '</span></td><td' + (x.lewat ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + esc(fTgl(x.tinjau) || '-') + (x.lewat ? ' <i class="bi bi-alarm"></i>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('bi-list-check', 'Belum ada tindak lanjut')) + '</div>';
  }).catch(function (e) { isiHtml('#ks-body', errBox(e)); });
}

// ── Drawer rincian kasus ──
function openKasus(id, noReload) {
  let dr = P.drawer;
  if (!dr || !document.body.contains(dr.el)) {
    dr = P.drawer = openDrawer({ head: '<div class="grow"><div class="skel" style="height:44px"></div></div>', body: skeleton(3), onClose: function () { P.drawer = null; P.kd = null; } });
  } else { dr.body.innerHTML = skeleton(3); }
  return apiC('kasus.detail', { id: id }).then(function (d) {
    if (!document.body.contains(dr.el)) return;
    P.kd = d; renderKasus(dr, d);
  }).catch(function (e) { dr.close(); fail(e); });
}
function refreshKasus() {
  if (!P.kd) return Promise.resolve();
  const id = P.kd.laporan.id;
  return apiC('kasus.detail', { id: id }).then(function (d) {
    P.kd = d; if (P.drawer && document.body.contains(P.drawer.el)) renderKasus(P.drawer, d);
    if (S.page === 'kasus' && P.ks && P.ks.tab === 'kasus') ksLoad().catch(function () { });
    loadNotif();
  });
}
function secHtml(icon, label, body, extra) { return '<div class="sec"' + (extra || '') + '><div class="lbl"><i class="bi ' + icon + '"></i> ' + label + '</div>' + body + '</div>'; }
function renderKasus(dr, d) {
  const l = d.laporan, m = d.murid, a = d.aksi;
  const head = dr.el.querySelector('.d-head');
  head.innerHTML = '<div class="grow"><div class="row wrap"><span class="mono muted">' + esc(l.kode) + '</span>' + chipUrg(l.urgensi) + chipStatus(l.status) + (d.berulang ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-repeat"></i> Berulang ' + d.ulang + '×</span>' : '') + (l.eskalasi ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-up-right"></i> Eskalasi Waka</span>' : '') + '</div>' +
    '<h2 style="margin-top:6px">' + esc(m.nama) + ' <span class="muted fw6" style="font-size:14px">(' + esc(m.kelas) + ')</span></h2><div class="xs muted">Kategori: ' + esc(l.kategori) + ' · Pelapor: ' + esc(l.pelapor) + ' · ' + esc(fTgl(l.tanggal)) + '</div></div><button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';
  let b = '';
  if (l.modeLabel || l.ditinjau) b += '<div class="note ' + (l.ditinjau ? 'info' : '') + '"><i class="bi ' + (l.ditinjau ? 'bi-check2-all' : 'bi-info-circle') + '"></i><div>' + (l.modeLabel ? '<b>Penanganan pelapor:</b> ' + esc(l.modeLabel) + '.' : '') + (l.ditinjau ? ' <b>Ditinjau Guru BK</b> (' + esc(l.ditinjau.oleh) + ', ' + esc(fTs(l.ditinjau.ts)) + ').' : (hasRole('guru_bk') ? ' Belum ditinjau Guru BK.' : ' Menunggu tinjauan Guru BK.')) + (l.tanggapan_bk ? '<br><b>Pesan BK:</b> ' + esc(l.tanggapan_bk) : '') + '</div></div>';
  if (l.limpah) {
    const lp = l.limpah;
    b += '<div class="note ' + (lp.konfirmasi ? 'info' : 'warn') + ' limpah-note"><i class="bi bi-arrow-left-right"></i><div>' +
      (lp.konfirmasi ? '<b>Wali kelas (' + esc(lp.wali) + ') melaporkan penanganan selesai.</b> ' + (hasRole('guru_bk') ? 'Periksa tindakan wali kelas di bawah, lalu konfirmasi penutupan.' : 'Menunggu konfirmasi Guru BK.')
        : '<b>Dilimpahkan Guru BK ke wali kelas' + (lp.saya ? ' (Anda)' : ' ' + esc(lp.wali)) + '.</b>' + (lp.tinjau ? ' Tinjau bersama BK: <b>' + esc(fTgl(lp.tinjau)) + '</b>.' : '')) +
      (lp.arahan ? '<div class="mt-8"><span class="xs muted">Arahan Guru BK:</span><div class="body" style="line-height:20px">' + esc(lp.arahan) + '</div></div>' : '') + '</div></div>';
  }
  b += secHtml('bi-journal-text', 'Kronologi awal' + (l.jam_ke ? ' · jam ke-' + esc(l.jam_ke) : '') + (l.lokasi ? ' · ' + esc(l.lokasi) : ''), '<div class="body">' + esc(l.kronologi) + '</div>' +
    (d.berkas.length ? '<div class="row wrap mt-12"><span class="xs muted">Lampiran:</span>' + d.berkas.map(function (f) { return '<button class="chip blue" style="border:0;cursor:pointer" data-act="berkas" data-id="' + esc(f.id) + '"><i class="bi bi-paperclip"></i> ' + esc(f.nama) + '</button>'; }).join('') + '</div>' : ''));
  b += secHtml('bi-people', 'Pembimbingan awal (guru / wali kelas)', d.bimbingan.length ? d.bimbingan.map(function (x) {
    return '<div class="mt-8" style="padding-top:8px;border-top:1px dashed var(--border)"><div class="row between"><b class="fw6">' + esc(x.oleh) + '</b><span class="xs muted">' + esc(fTgl(x.tanggal)) + '</span></div><div class="body" style="line-height:20px">' + esc(x.tindakan) + (x.hasil ? '\n→ Hasil: ' + esc(x.hasil) : '') + '</div>' + (x.milik || a.tambahBimbingan ? '<button class="btn sm ghost" data-act="bimb-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Ubah</button>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada catatan pembimbingan awal.</div>');
  b += secHtml('bi-inbox', 'Rujukan ke Guru BK', d.rujukan.length ? d.rujukan.slice().reverse().map(function (r, i) {
    return '<div class="' + (i ? 'mt-8' : '') + '"><div class="row between wrap"><div class="row">' + chipStatus(r.status) + chipUrg(r.urgensi) + '</div><span class="xs muted">' + esc(fTgl(r.tanggal)) + ' · ' + esc(r.pengirim) + '</span></div><div class="body mt-8" style="line-height:20px">' + esc(r.alasan) + '</div>' + (r.ringkasan ? '<div class="xs muted mt-8">Ringkasan bimbingan: ' + esc(r.ringkasan) + '</div>' : '') + (r.tanggapan ? '<div class="note info mt-8"><i class="bi bi-chat-left-text"></i><div>Tanggapan BK: ' + esc(r.tanggapan) + '</div></div>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada rujukan.</div>');
  if (d.poin && d.poin.length) b += secHtml('bi-award', 'Poin tata tertib' + (d.poinRingkas ? ' · poin bersih murid ' + d.poinRingkas.B + (d.poinRingkas.tahap ? ' (' + esc(d.poinRingkas.tahap.n) + ')' : '') : ''), d.poin.map(pnItemHtml).join(''));
  if (hasRole('guru_bk')) {
    b += '<div class="lock"><div class="l-head"><i class="bi bi-lock-fill"></i> Catatan Klinis & Layanan Guru BK <span class="chip purple" style="margin-left:auto">Rahasia</span></div><div class="xs muted mt-8">Hanya Guru BK. Setiap pembukaan dicatat.</div>' +
      (d.layanan.length ? d.layanan.map(function (x) { return '<button class="btn block mt-8" style="justify-content:space-between;height:auto;min-height:40px;white-space:normal;text-align:left" data-act="layanan-buka" data-id="' + esc(x.id) + '"><span>' + esc(fTgl(x.tanggal)) + ' · ' + esc(x.jenis_layanan) + (x.topik ? ' — ' + esc(x.topik) : '') + '</span><i class="bi bi-chevron-right"></i></button>'; }).join('') : '<div class="muted mt-8">Belum ada sesi layanan untuk kasus ini.</div>') + '</div>';
  } else if (d.layananAda) {
    b += '<div class="lock-flat"><i class="bi bi-lock-fill"></i><div><b>Dalam Layanan BK</b><div class="xs">Detail layanan bersifat rahasia dan hanya dapat dibuka oleh Guru BK.</div></div></div>';
  }
  b += secHtml('bi-list-check', 'Tindak lanjut & pemantauan', d.monitoring.length ? d.monitoring.map(function (x) {
    return '<div class="mt-8" style="padding-top:8px;border-top:1px dashed var(--border)"><div class="row between wrap"><b class="fw6">' + esc(x.pj_nama) + '</b><span class="chip ' + (x.status === 'Selesai' ? 'st-Selesai' : x.status === 'Berjalan' ? 'st-Diproses' : 'st-Baru') + '">' + esc(x.status) + '</span></div><div class="body" style="line-height:20px">' + esc(x.tindak_lanjut) + (x.hasil_evaluasi ? '\n→ Evaluasi: ' + esc(x.hasil_evaluasi) : '') + '</div><div class="xs muted">Tinjau berikutnya: ' + esc(fTgl(x.tinjau) || '-') + '</div>' + (a.monitoring ? '<button class="btn sm ghost" data-act="mon-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Ubah</button>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada tindak lanjut.</div>');
  b += '<div class="sec"><div class="lbl"><i class="bi bi-activity"></i> Garis waktu penanganan</div>' + timelineHtml(d.timeline) + '</div>';
  dr.body.innerHTML = b;
  const act = [];
  if (a.waliTindak) act.push('<button class="btn primary" data-act="wl-tindak"><i class="bi bi-clipboard-check"></i> Catat tindakan wali kelas</button>');
  if (a.konfirmasi) act.push('<button class="btn primary" data-act="ks-tinjau-buka" data-k="selesai"><i class="bi bi-check2-all"></i> Konfirmasi hasil wali kelas</button>');
  else if (a.tinjau && !l.ditinjau) act.push('<button class="btn primary" data-act="ks-tinjau-buka"><i class="bi bi-eye"></i> Tinjau laporan</button>');
  if (hasRole('guru_bk') && l.status === 'Ditangani Wali Kelas') act.push('<button class="btn primary" data-act="ks-ambil-alih"><i class="bi bi-arrow-left-right"></i> Ambil alih dari wali kelas</button>');
  if (a.limpah && !a.konfirmasi) act.push('<button class="btn teal" data-act="ks-tinjau-buka" data-k="limpah"><i class="bi bi-arrow-left-right"></i> Limpahkan ke wali kelas</button>');
  if (a.tanggapiRujukan) act.push('<button class="btn teal" data-act="rj-tanggapi"><i class="bi bi-reply"></i> Tanggapi rujukan</button>');
  if (a.buatRujukan) act.push('<button class="btn primary" data-act="rj-baru"><i class="bi bi-send"></i> Rujuk ke Guru BK</button>');
  if (a.tambahBimbingan) act.push('<button class="btn" data-act="bimb-baru"><i class="bi bi-plus-circle"></i> Pembimbingan awal</button>');
  if (a.catatLayanan) act.push('<button class="btn purple" data-act="layanan-baru-kasus"><i class="bi bi-journal-plus"></i> Catat layanan</button>');
  if (a.ubahStatus) act.push('<button class="btn" data-act="ks-ubah"><i class="bi bi-arrow-repeat"></i> Ubah status</button>');
  if (a.alihkan) act.push('<button class="btn" data-act="ks-alihkan"><i class="bi bi-arrow-left-right"></i> Alihkan / ambil alih</button>');
  if (a.monitoring) act.push('<button class="btn" data-act="mon-baru"><i class="bi bi-list-check"></i> Tindak lanjut</button>');
  if (a.ortu) act.push('<button class="btn blue" data-act="ortu-dari-kasus"><i class="bi bi-chat-dots"></i> Hubungi orang tua</button>');
  if (a.eskalasi) act.push('<button class="btn soft-danger" data-act="ks-eskalasi"><i class="bi bi-arrow-up-right-circle"></i> Eskalasi Waka</button>');
  act.push('<button class="btn ghost" data-act="open-murid-drawer" data-id="' + esc(m.id) + '"><i class="bi bi-person-lines-fill"></i> Garis waktu murid</button>');
  let foot = dr.el.querySelector('.d-foot');
  if (!foot) { foot = document.createElement('div'); foot.className = 'd-foot'; dr.el.querySelector('.drawer').appendChild(foot); }
  foot.innerHTML = act.join('');
}
function timelineHtml(ev) {
  if (!ev || !ev.length) return '<div class="muted">Belum ada peristiwa.</div>';
  return '<div class="tl">' + ev.map(function (e) {
    return '<div class="tl-item ' + esc(e.warna || 'slate') + '"><div class="t-date">' + esc(fTs(e.ts && e.ts.length > 10 ? e.ts : e.tanggal)) + (e.meta ? ' · ' + esc(e.meta) : '') + '</div><div class="t-title">' + esc(e.judul) + '</div>' + (e.isi ? '<div class="t-body">' + esc(e.isi) + '</div>' : '') + (e.oleh ? '<div class="t-by">' + esc(e.oleh) + '</div>' : '') + '</div>';
  }).join('') + '</div>';
}
ACT.berkas = function (el) { bukaBerkas(el.dataset.id, null); };
ACT['open-murid-drawer'] = function (el) { closeAllOverlays(); navigateTo('riwayat', { id_murid: el.dataset.id }); };
ACT['layanan-buka'] = function (el) { closeAllOverlays(); navigateTo('layanan', { open: el.dataset.id }); };
ACT['layanan-baru-kasus'] = function () { const k = P.kd; closeAllOverlays(); navigateTo('layanan', { kasus: k.laporan.id, murid: { id: k.murid.id, nama: k.murid.nama, kelas: k.murid.kelas } }); };
ACT['ks-tinjau-buka'] = function (el) {
  const k = P.kd, l = k.laporan, pilih = (el && el.dataset.k) || (l.mode === 'info' ? 'tinjau' : 'tangani');
  const konf = k.aksi.konfirmasi;
  const opsi = (konf ? [['selesai', 'Konfirmasi selesai, tutup kasus', 'Penanganan wali kelas sudah memadai.'], ['pantau', 'Pantau dulu', 'Status menjadi Dipantau; BK mengamati perkembangan.'], ['limpah', 'Kembalikan ke wali kelas', 'Wali kelas melanjutkan dengan arahan baru.'], ['tangani', 'Ambil alih oleh BK', 'Status menjadi Diproses dan Anda menjadi penanggung jawab.']]
    : [['tinjau', 'Sudah saya ketahui', 'Status tidak berubah. Pelapor tahu laporannya sudah dibaca.'], ['pantau', 'Pantau', 'Status menjadi Dipantau; cocok bila pembinaan guru sudah memadai tetapi perlu diamati.'], ['tangani', 'Tangani oleh BK', 'Status menjadi Diproses dan Anda menjadi penanggung jawab.'],
      ['limpah', 'Limpahkan ke wali kelas', 'Wali kelas (' + (k.murid.wali || '-') + ') menangani dengan arahan Anda, lalu melapor ke BK. Kasus tetap tercatat atas nama Anda.'], ['selesai', 'Cukup, tutup kasus', 'Pembinaan guru sudah menyelesaikan masalah.']])
    .filter(function (x) { return x[0] !== 'limpah' || k.aksi.limpah || konf; });
  const m = openModal({
    title: konf ? 'Konfirmasi hasil wali kelas' : pilih === 'limpah' ? 'Limpahkan ke wali kelas' : 'Tinjau laporan', sub: l.kode + ' · ' + k.murid.nama + ' (' + k.murid.kelas + ')',
    body: (l.modeLabel && !konf ? '<div class="note info"><i class="bi bi-info-circle"></i><div>' + esc(l.modeLabel) + '</div></div>' : '') +
      '<form id="f-tj" class="form-grid mt-12"><div class="field"><span class="flabel">Keputusan Guru BK</span><div class="col gap-8">' +
      opsi.map(function (x) {
        return '<label class="pick-row"><input type="radio" name="keputusan" value="' + x[0] + '"' + (x[0] === pilih ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + esc(x[2]) + '</small></span></label>';
      }).join('') + '</div></div>' +
      '<div id="tj-limpah" class="form-grid">' + fld({ name: 'arahan', label: 'Arahan untuk wali kelas', type: 'textarea', rows: 3, max: 800, req: true, ph: 'Mis. Mohon temui ananda dan pantau kehadiran 2 minggu; hubungi orang tua bila alpa lagi. Laporkan hasilnya ke BK.' }) +
        fld({ name: 'tinjau', label: 'Tinjau bersama BK pada', type: 'date', req: true, value: addD(S.today, 7), min: S.today, hint: 'Wali kelas dan Anda diingatkan lewat lonceng pada tanggal ini.' }) + '</div>' +
      '<div id="tj-pesan">' + fld({ name: 'pesan', label: 'Pesan untuk pelapor (opsional)', type: 'textarea', rows: 3, max: 800, ph: 'Mis. Terima kasih, pembinaan sudah tepat. BK akan memantau kehadiran ananda.' }) + '</div>' +
      '<div class="xs muted">Wali kelas diberi tahu lewat lonceng di aplikasi (tanpa email).</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tj-ok">Simpan</button>'
  });
  const f = $('#f-tj', m.el);
  const atur = function () {
    const v = ($('input[name=keputusan]:checked', f) || {}).value;
    $('#tj-limpah', m.el).style.display = v === 'limpah' ? '' : 'none';
    $('#tj-pesan', m.el).style.display = v === 'limpah' ? 'none' : '';
  };
  f.addEventListener('change', atur); atur();
  $('#tj-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f);
    d.keputusan = ($('input[name=keputusan]:checked', f) || {}).value; d.id = l.id;
    if (d.keputusan === 'limpah') {
      if (!d.arahan) { toast('Tuliskan arahan untuk wali kelas.', 'err'); return; }
      d.pesan = d.arahan;
    }
    run(e.currentTarget, api('kasus.tinjau', d)).then(function () {
      m.close();
      toast(d.keputusan === 'limpah' ? 'Kasus dilimpahkan. Wali kelas diberi tahu lewat lonceng.' : d.keputusan === 'selesai' && konf ? 'Kasus ditutup.' : 'Tinjauan tersimpan dan pelapor diberi tahu.');
      refreshKasus();
    }).catch(fail);
  });
};
ACT['ks-ambil-alih'] = function (el) {
  const l = P.kd.laporan;
  confirmDlg('Kasus ini sedang ditangani wali kelas (' + (l.limpah ? l.limpah.wali : '') + '). Ambil alih dan tangani sendiri oleh Guru BK? Tindak lanjut wali kelas ditutup dan catatannya tetap tersimpan.', 'Ambil alih', false, 'Ambil alih kasus').then(function (ok) {
    if (ok) run(el, api('kasus.tinjau', { id: l.id, keputusan: 'tangani' })).then(function () { toast('Kasus diambil alih Guru BK (status Diproses).'); refreshKasus(); }).catch(fail);
  });
};
ACT['wl-tindak'] = function () {
  const k = P.kd, l = k.laporan;
  const m = openModal({
    title: 'Catat tindakan wali kelas', sub: l.kode + ' · ' + k.murid.nama + ' (' + k.murid.kelas + ')',
    body: (l.limpah && l.limpah.arahan ? '<div class="note info"><i class="bi bi-info-circle"></i><div><b>Arahan Guru BK:</b> ' + esc(l.limpah.arahan) + '</div></div>' : '') +
      '<form id="f-wl" class="form-grid mt-12">' +
      fld({ name: 'tindakan', label: 'Tindakan yang Anda lakukan', type: 'textarea', rows: 3, max: 1500, req: true, ph: 'Mis. Memanggil ananda setelah jam pelajaran, menanyakan penyebab sering terlambat, menghubungi ibunya lewat WA.' }) +
      fld({ name: 'hasil', label: 'Hasil / keterangan', type: 'textarea', rows: 2, max: 1500, ph: 'Mis. Ananda berjanji datang tepat waktu; orang tua akan mengantar.' }) +
      '<div class="field"><span class="flabel">Langkah berikutnya</span><div class="col gap-8">' +
      [['catat', 'Masih berjalan', 'Catatan disimpan; Anda melanjutkan penanganan.'], ['selesai', 'Selesai, laporkan ke BK', 'Guru BK akan mengonfirmasi penutupan kasus.'], ['kembali', 'Kembalikan ke BK', 'Perlu penanganan Guru BK (tuliskan alasannya di Hasil/keterangan).']].map(function (x, i) {
        return '<label class="pick-row"><input type="radio" name="keputusan" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></label>';
      }).join('') + '</div></div>' +
      '<div id="wl-tgl">' + fld({ name: 'tinjau', label: 'Tinjau lagi pada (opsional)', type: 'date', min: S.today, value: l.limpah && l.limpah.tinjau >= S.today ? l.limpah.tinjau : '' }) + '</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="wl-ok">Simpan</button>'
  });
  const f = $('#f-wl', m.el);
  f.addEventListener('change', function () { $('#wl-tgl', m.el).style.display = (($('input[name=keputusan]:checked', f) || {}).value === 'catat') ? '' : 'none'; });
  $('#wl-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f); d.keputusan = ($('input[name=keputusan]:checked', f) || {}).value; d.id_kasus = l.id;
    if (!d.tindakan) { toast('Isi tindakan yang Anda lakukan.', 'err'); return; }
    if (d.keputusan === 'kembali' && !d.hasil) { toast('Tuliskan alasan dikembalikan ke BK.', 'err'); return; }
    run(e.currentTarget, api('wali.tindak', d)).then(function () {
      m.close(); toast(d.keputusan === 'catat' ? 'Tindakan tersimpan.' : d.keputusan === 'selesai' ? 'Dilaporkan ke Guru BK untuk dikonfirmasi.' : 'Kasus dikembalikan ke Guru BK.');
      refreshKasus();
    }).catch(fail);
  });
};
ACT['ortu-dari-kasus'] = function () { const k = P.kd; waModal({ id_murid: k.murid.id, id_kasus: k.laporan.id }); };

// ── Tindakan pada kasus ──
ACT['rj-baru'] = function () { const k = P.kd; openRujukanModal(k.laporan.id, k.laporan.kode, k.laporan.urgensi, refreshKasus); };
ACT['rj-tanggapi'] = function () {
  const k = P.kd; const r = k.rujukan.filter(function (x) { return x.status === 'Baru' || x.status === 'Ditunda'; }).slice(-1)[0]; if (!r) return;
  const m = openModal({
    title: 'Tanggapi rujukan', sub: k.laporan.kode + ' · ' + k.murid.nama,
    body: '<div class="note info"><i class="bi bi-inbox"></i><div><b>Alasan rujukan:</b> ' + esc(r.alasan) + (r.ringkasan ? '<br><span class="muted">Ringkasan bimbingan: ' + esc(r.ringkasan) + '</span>' : '') + '</div></div><form class="form-grid mt-12" id="f-tg" novalidate>' +
      '<div class="field"><span class="flabel">Keputusan</span><div class="checks">' + [['terima', 'Terima'], ['tunda', 'Tunda'], ['tolak', 'Tolak']].map(function (x, i) { return '<label class="check"><input type="radio" name="aksi" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') + '</div></div>' +
      fld({ name: 'alasan', label: 'Alasan / catatan', type: 'textarea', rows: 3, max: 800, hint: 'Wajib diisi bila rujukan ditunda atau ditolak.' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn teal" id="tg-ok">Kirim tanggapan</button>'
  });
  $('#tg-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-tg', m.el); const d = formData(f);
    d.aksi = ($('input[name=aksi]:checked', f) || {}).value;
    if (d.aksi !== 'terima' && !d.alasan.trim()) { setErr(f, 'alasan', 'Alasan wajib diisi untuk menunda atau menolak.'); return; }
    d.id = r.id;
    run(e.currentTarget, api('rujukan.tanggapi', d)).then(function () { m.close(); toast('Tanggapan terkirim.'); refreshKasus(); }).catch(fail);
  });
};
ACT['ks-ubah'] = function () {
  const k = P.kd;
  const m = openModal({
    title: 'Ubah status kasus', sub: k.laporan.kode,
    body: '<form id="f-st" class="form-grid">' + fld({ name: 'status', label: 'Status baru', type: 'select', req: true, value: ['Ditangani Wali Kelas', 'Menunggu Konfirmasi BK'].indexOf(k.laporan.status) >= 0 ? 'Diproses' : k.laporan.status, opts: S.refs.statusKasus.filter(function (s) { return ['Eskalasi', 'Ditangani Wali Kelas', 'Menunggu Konfirmasi BK'].indexOf(s) < 0; }) }) + '</form><div class="xs muted mt-12">Pelapor dan wali kelas diberi tahu lewat email bila status berubah.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="st-ok">Simpan</button>'
  });
  $('#st-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-st', m.el));
    const go = function () { run(e.currentTarget, api('kasus.ubahStatus', { id: k.laporan.id, status: d.status })).then(function () { m.close(); toast('Status diperbarui.'); refreshKasus(); }).catch(fail); };
    if (d.status === 'Selesai') confirmDlg('Menandai kasus selesai tidak dapat dibuka kembali dari sini. Lanjutkan?', 'Tandai selesai').then(function (ok) { if (ok) go(); }); else go();
  });
};
ACT['ks-alihkan'] = function () {
  const k = P.kd;
  apiC('bk.daftar').then(function (bks) {
    const pj = k.laporan.penangani || '';
    const m = openModal({
      title: 'Alihkan penanganan kasus', sub: k.laporan.kode + ' · ' + k.murid.nama,
      body: '<div class="note"><i class="bi bi-info-circle"></i><div>Penanggung jawab saat ini: <b>' + esc(pj || 'belum ditentukan') + '</b>. Guru BK tujuan akan menerima email, dan peralihan tercatat di log.</div></div><form id="f-al" class="form-grid mt-12">' +
        fld({ name: 'email', label: 'Guru BK tujuan', type: 'select', blank: 'Saya sendiri (ambil alih)', opts: bks.filter(function (x) { return x.email !== S.user.email; }).map(function (x) { return { v: x.email, l: x.nama }; }) }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="al-ok">Alihkan</button>'
    });
    $('#al-ok', m.el).addEventListener('click', function (e) {
      const d = formData($('#f-al', m.el));
      run(e.currentTarget, api('kasus.alihkan', { id: k.laporan.id, email: d.email })).then(function (r) { m.close(); toast('Kasus kini ditangani ' + r.penangani + '.'); refreshKasus(); }).catch(fail);
    });
  }).catch(fail);
};
ACT['ks-eskalasi'] = function () {
  const k = P.kd;
  const m = openModal({
    title: 'Eskalasi ke Waka Kesiswaan', sub: k.laporan.kode + ' · ' + k.murid.nama,
    body: '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>Waka Kesiswaan hanya akan melihat kronologi, rujukan, dan tindak lanjut. <b>Isi konseling tetap rahasia.</b></div></div><form id="f-es" class="form-grid mt-12">' + fld({ name: 'alasan', label: 'Alasan eskalasi', type: 'textarea', req: true, rows: 3, max: 1000 }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn danger" id="es-ok">Eskalasikan</button>'
  });
  $('#es-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-es', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 5 } })) return;
    d.id = k.laporan.id;
    run(e.currentTarget, api('kasus.eskalasi', d)).then(function () { m.close(); toast('Kasus dieskalasikan ke Waka Kesiswaan.'); refreshKasus(); }).catch(fail);
  });
};
function bimbModal(x) {
  const k = P.kd;
  const m = openModal({
    title: x ? 'Ubah pembimbingan awal' : 'Pembimbingan awal', sub: k.laporan.kode,
    body: '<form id="f-bm" class="form-grid">' + fld({ name: 'tindakan', label: 'Tindakan yang dilakukan', type: 'textarea', req: true, rows: 4, max: 1500, value: x ? x.tindakan : '', ph: 'mis. Dipanggil ke ruang guru untuk teguran lisan tingkat 1.' }) + fld({ name: 'hasil', label: 'Hasil / respons murid', type: 'textarea', rows: 3, max: 1500, value: x ? x.hasil : '' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="bm-ok">Simpan</button>'
  });
  $('#bm-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-bm', m.el), d = formData(f);
    if (!validate(f, d, { tindakan: { label: 'Tindakan', req: true, min: 5 } })) return;
    d.id_laporan = k.laporan.id; if (x) d.id = x.id;
    run(e.currentTarget, api('bimbingan.simpan', d)).then(function () { m.close(); toast('Pembimbingan tersimpan.'); refreshKasus(); }).catch(fail);
  });
}
ACT['bimb-baru'] = function () { bimbModal(null); };
ACT['bimb-edit'] = function (el) { bimbModal(P.kd.bimbingan.filter(function (b) { return b.id === el.dataset.id; })[0]); };
function monModal(x) {
  const k = P.kd;
  const open = function (staff) {
    const meEmail = S.user.email;
    const pjOpts = staff.length ? staff.map(function (s) { return { v: s.email, l: s.nama + ' — ' + s.peran }; }) : [{ v: meEmail, l: S.user.nama }];
    const m = openModal({
      title: x ? 'Ubah tindak lanjut' : 'Tindak lanjut baru', sub: k.laporan.kode,
      body: '<form id="f-mn" class="form-grid">' + fld({ name: 'tindak_lanjut', label: 'Tindak lanjut', type: 'textarea', req: true, rows: 3, max: 1500, value: x ? x.tindak_lanjut : '' }) +
        (hasRole('guru_bk') ? fld({ name: 'penanggung_jawab', label: 'Penanggung jawab', type: 'select', value: x ? x.penanggung_jawab : meEmail, opts: pjOpts }) : '') +
        '<div class="form-grid c2">' + fld({ name: 'status', label: 'Status', type: 'select', value: x ? x.status : 'Berjalan', opts: ['Direncanakan', 'Berjalan', 'Selesai'] }) + fld({ name: 'tanggal_tinjau_berikut', label: 'Tinjau berikutnya', type: 'date', value: x ? x.tinjau : addD(S.today, 7), min: S.today }) + '</div>' +
        fld({ name: 'hasil_evaluasi', label: 'Hasil evaluasi (bila ada)', type: 'textarea', rows: 2, max: 1500, value: x ? x.hasil_evaluasi : '' }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="mn-ok">Simpan</button>'
    });
    $('#mn-ok', m.el).addEventListener('click', function (e) {
      const f = $('#f-mn', m.el), d = formData(f);
      if (!validate(f, d, { tindak_lanjut: { label: 'Tindak lanjut', req: true, min: 5 }, tanggal_tinjau_berikut: { label: 'Tanggal tinjau', fn: function () { return ''; } } })) return;
      if (d.status !== 'Selesai' && !d.tanggal_tinjau_berikut) { setErr(f, 'tanggal_tinjau_berikut', 'Wajib diisi bila belum selesai.'); return; }
      d.id_kasus = k.laporan.id; if (x) d.id = x.id;
      run(e.currentTarget, api('monitoring.simpan', d)).then(function () { m.close(); toast('Tindak lanjut tersimpan.'); refreshKasus(); }).catch(fail);
    });
  };
  if (hasRole('guru_bk')) apiC('pengguna.ringkas').then(open).catch(function () { open([]); }); else open([]);
}
ACT['mon-baru'] = function () { monModal(null); };
ACT['mon-edit'] = function (el) { monModal(P.kd.monitoring.filter(function (b) { return b.id === el.dataset.id; })[0]); };

// ════════════════════════════════════════════════════════════
// Layanan BK (F6) — untuk SEMUA murid: layanan dasar, peminatan, responsif, dukungan sistem
// ════════════════════════════════════════════════════════════
const KOMP_INFO = {
  'Layanan Dasar': { c: 'teal', ic: 'bi-people', d: 'Untuk semua murid: bimbingan klasikal, kelompok, orientasi, informasi.' },
  'Peminatan & Perencanaan Individual': { c: 'blue', ic: 'bi-compass', d: 'Membantu murid merencanakan studi lanjut, karier, dan masa depan.' },
  'Responsif': { c: 'purple', ic: 'bi-heart-pulse', d: 'Konseling, konsultasi, mediasi untuk kebutuhan atau masalah tertentu. Rahasia.' },
  'Dukungan Sistem': { c: 'amber', ic: 'bi-diagram-3', d: 'Asesmen, kolaborasi dengan orang tua, guru, dan lembaga.' }
};
function chipKomp(k) { const i = KOMP_INFO[k] || { c: 'slate', ic: 'bi-dot' }; return '<span class="chip kc-' + i.c + '"><i class="bi ' + i.ic + '"></i> ' + esc(k) + '</span>'; }

PAGES.layanan = function (params, tok) {
  P.ly = { q: '', komponen: params.komponen || '', sasaran: '', bulan: '', data: null };
  return lyLoad(tok).then(function () {
    if (stale(tok)) return;
    temuRingkas();
    if (params.open) lyBuka(params.open);
    else if (params.tab === 'permintaan') temuDrawer('aktif');
    else if (params.kasus || params.murid || params.peserta || params.program || params.baru) lyForm(null, params);
  });
};
function lyLoad(tok) {
  const f = { q: P.ly.q, komponen: P.ly.komponen, sasaran: P.ly.sasaran, bulan: P.ly.bulan };
  return apiC('layanan.daftar', f).then(function (d) {
    if (tok !== undefined && stale(tok)) return;
    P.ly.data = d;
    const st = d.statistik;
    if (!$('#ly-list')) {
      $('#app-container').innerHTML = pageHead('Layanan Bimbingan dan Konseling', 'Layanan BK', 'Catat semua layanan BK, bukan hanya penanganan kasus: bimbingan klasikal dan kelompok, perencanaan individual, konseling, hingga kolaborasi dengan orang tua.', '<button class="btn primary" data-act="ly-baru"><i class="bi bi-plus-lg"></i> Catat layanan</button>') +
        '<div id="ly-temu" class="mb-16"></div><div id="ly-stat"></div>' +
        '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div class="fchips" id="ly-komp"></div></div>' +
        '<div class="card-body" style="padding-bottom:0"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="field"><label for="ly-q">Cari</label><input class="input" id="ly-q" type="search" placeholder="Topik, nama murid, NIS…"></div>' +
        '<div class="field"><label for="ly-sas">Sasaran</label><select class="select" id="ly-sas"><option value="">Semua sasaran</option><option>Individu</option><option>Kelompok</option><option>Klasikal</option></select></div>' +
        '<div class="field"><label for="ly-bln">Bulan</label><input class="input" type="month" id="ly-bln"></div></div></div><div id="ly-list" class="mt-12"></div></div>';
      $('#ly-q').addEventListener('input', debounce(function (e) { P.ly.q = e.target.value.trim(); lyLoad(); }, 300));
      $('#ly-sas').addEventListener('change', function (e) { P.ly.sasaran = e.target.value; lyLoad(); });
      $('#ly-bln').addEventListener('change', function (e) { P.ly.bulan = e.target.value; lyLoad(); });
    }
    const pk = st.perKomponen || {};
    $('#ly-stat').innerHTML = '<div class="grid g-kpi k4">' + [
      ['indigo', 'bi-calendar-check', 'Layanan Bulan Ini', st.bulanIni, 'pelaksanaan tercatat'],
      ['teal', 'bi-people', 'Murid Terlayani', st.murid, 'sejak awal tahun ajaran'],
      ['blue', 'bi-grid-1x2', 'Layanan Dasar & Peminatan', (pk['Layanan Dasar'] || 0) + (pk['Peminatan & Perencanaan Individual'] || 0), 'untuk semua murid'],
      ['purple', 'bi-heart-pulse', 'Layanan Responsif', pk['Responsif'] || 0, 'konseling · rahasia']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    $('#ly-komp').innerHTML = ['', 'Layanan Dasar', 'Peminatan & Perencanaan Individual', 'Responsif', 'Dukungan Sistem'].map(function (k) {
      return '<button class="fchip ' + (P.ly.komponen === k ? 'active' : '') + '" data-act="ly-komp" data-k="' + esc(k) + '">' + (k ? esc(k) + ' (' + (pk[k] || 0) + ')' : 'Semua (' + st.total + ')') + '</button>';
    }).join('');
    $('#ly-list').innerHTML = d.sesi.length ? '<div class="ly-list">' + d.sesi.map(lyRow).join('') + '</div>' :
      '<div class="card-body">' + empty('bi-heart-pulse', 'Belum ada layanan pada filter ini', 'Catat bimbingan klasikal, konseling individual, atau layanan lain dengan tombol Catat layanan.') + '</div>';
  });
}
function lyRow(x) {
  const d = x.tanggal || '';
  return '<button class="ly-row" data-act="ly-buka" data-id="' + esc(x.id) + '"><div class="ly-date"><b>' + esc(d.substr(8, 2)) + '</b><span>' + esc(BLN[+d.substr(5, 2) - 1] || '') + ' ' + esc(d.substr(2, 2)) + '</span></div>' +
    '<div class="grow" style="min-width:0"><div class="row wrap" style="gap:6px">' + chipKomp(x.komponen) + '<span class="chip neutral">' + esc(x.jenis_layanan) + '</span><span class="chip neutral"><i class="bi bi-person"></i> ' + esc(x.sasaran) + '</span>' + (x.rahasia ? '<span class="chip purple"><i class="bi bi-lock-fill"></i> Rahasia</span>' : '') + '</div>' +
    '<div class="fw7 mt-8" style="font-family:var(--font-h)">' + esc(x.topik) + '</div><div class="xs muted-2">' + esc(x.peserta) + (x.bidang ? ' · Bidang ' + esc(x.bidang) : '') + '</div>' +
    '<div class="row wrap mt-8" style="gap:6px">' + (x.program ? '<span class="chip blue"><i class="bi bi-journal-check"></i> ' + esc(x.program) + '</span>' : '') + (x.kode ? '<span class="chip st-Diproses"><i class="bi bi-folder2-open"></i> ' + esc(x.kode) + '</span>' : '') + (x.jurus ? '<span class="chip gold"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + (x.berkas ? '<span class="chip neutral"><i class="bi bi-paperclip"></i> ' + x.berkas + '</span>' : '') + '</div></div>' +
    '<i class="bi bi-chevron-right muted"></i></button>';
}
ACT['ly-komp'] = function (el) { P.ly.komponen = el.dataset.k; lyLoad().catch(fail); };
ACT['ly-buka'] = function (el) { lyBuka(el.dataset.id); };
ACT['ly-baru'] = function () { lyForm(null, {}); };
function lyBuka(id) { apiC('layanan.get', { id: id }).then(function (x) { lyForm(x, {}); }).catch(fail); }

/** Formulir layanan BK. x = data lama (ubah) atau null (baru). pre = isian awal dari halaman lain. */
function lyForm(x, pre) {
  pre = pre || {};
  const R = P.ly && P.ly.data ? P.ly.data.refs : null;
  if (!R) { apiC('layanan.daftar', {}).then(function (d) { P.ly = P.ly || {}; P.ly.data = d; lyForm(x, pre); }).catch(fail); return; }
  const kasusPre = pre.kasus ? R.kasusAktif.filter(function (k) { return k.id === pre.kasus; })[0] : null;
  const progPre = pre.program ? R.program.filter(function (p) { return p.id === pre.program; })[0] : null;
  let jenis0 = x ? x.jenis_layanan : (pre.jenis || (kasusPre ? 'Konseling Individual' : 'Konseling Individual'));
  let komp0 = x ? x.komponen : Object.keys(R.komponen).filter(function (k) { return R.komponen[k].indexOf(jenis0) >= 0; })[0] || 'Responsif';
  if (!x && pre.komponen) { komp0 = pre.komponen; jenis0 = pre.jenis && R.komponen[komp0].indexOf(pre.jenis) >= 0 ? pre.jenis : R.komponen[komp0][0]; }
  const st = {
    komponen: komp0, sasaran: x ? x.sasaran : (pre.sasaran || (komp0 === 'Layanan Dasar' ? 'Klasikal' : 'Individu')),
    peserta: x ? x.pesertaList.map(function (m) { return { id: m.id, nama: m.nama, kelas: m.kelas }; }) : (pre.peserta ? pre.peserta.slice() : pre.murid ? [pre.murid] : (kasusPre ? [{ id: kasusPre.id_murid, nama: kasusPre.murid, kelas: kasusPre.kelas }] : [])),
    file: null
  };
  const kasusOpts = R.kasusAktif.map(function (k) { return { v: k.id, l: k.kode + ' — ' + k.murid + ' (' + k.kelas + ') · ' + k.kategori }; });
  if (x && x.id_laporan && !kasusOpts.some(function (o) { return o.v === x.id_laporan; })) kasusOpts.push({ v: x.id_laporan, l: x.kode || 'Kasus terkait' });
  const progOpts = R.program.map(function (p) { return { v: p.id, l: '[' + p.bidang + '] ' + p.topik }; });
  const berkasList = x && x.berkas && x.berkas.length ? '<div class="row wrap mt-8"><span class="xs muted">Lampiran:</span>' + x.berkas.map(function (f) { return '<button type="button" class="chip blue" style="border:0;cursor:pointer" data-act="berkas" data-id="' + esc(f.id) + '"><i class="bi bi-paperclip"></i> ' + esc(f.nama) + '</button>'; }).join('') + '</div>' : '';
  const m = openModal({
    title: x ? 'Catatan layanan BK' : 'Catat layanan BK', sub: x ? (x.oleh ? 'Dicatat oleh ' + x.oleh : '') : 'Untuk satu murid, sekelompok murid, atau satu kelas', size: 'xl', sticky: true, noFocus: true,
    body: '<form id="f-ly" class="col gap-16" novalidate>' +
      '<div class="field"><span class="flabel">Komponen layanan</span><div class="komp-tiles" id="ly-kt">' + Object.keys(R.komponen).map(function (k) { const i = KOMP_INFO[k]; return '<button type="button" class="komp-tile kc-' + i.c + (k === st.komponen ? ' on' : '') + '" data-act="ly-kt" data-k="' + esc(k) + '"><i class="bi ' + i.ic + '"></i><b>' + esc(k) + '</b><small>' + esc(i.d) + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="form-grid c2"><div class="field"><label for="ly-jenis">Jenis layanan <span class="req">*</span></label><select class="select" id="ly-jenis" name="jenis_layanan"></select></div>' +
      fld({ name: 'tanggal', label: 'Tanggal pelaksanaan', type: 'date', req: true, value: x ? x.tanggal : S.today, maxv: S.today }) +
      fld({ name: 'bidang', label: 'Bidang', type: 'select', value: x ? x.bidang : (progPre ? progPre.bidang : (pre.bidang || 'Pribadi')), opts: R.bidang }) +
      fld({ name: 'sumber', label: 'Asal layanan', type: 'select', blank: '— Pilih —', value: x ? x.sumber : (pre.sumber || (kasusPre ? 'Laporan kejadian' : (progPre ? 'Program BK' : ''))), opts: R.sumber }) +
      fld({ name: 'jurus', label: 'Fokus 7 Jurus BK Hebat (opsional)', type: 'select', blank: '— Tidak dipilih —', value: x ? x.jurus : (progPre ? progPre.jurus : ''), opts: R.jurus }) +
      fld({ name: 'id_program', label: 'Kegiatan Program BK (opsional)', type: 'select', blank: '— Tidak terkait program —', value: x ? x.id_program : (progPre ? progPre.id : ''), opts: progOpts, hint: 'Bila dipilih, realisasi program bertambah otomatis.' }) + '</div>' +
      '<div class="field"><span class="flabel">Sasaran layanan</span><div class="seg-lg" id="ly-sas-seg">' + R.sasaran.map(function (s) { return '<button type="button" class="' + (s === st.sasaran ? 'on' : '') + '" data-act="ly-sas" data-s="' + s + '">' + { Individu: '<i class="bi bi-person"></i> Individu', Kelompok: '<i class="bi bi-people"></i> Kelompok', Klasikal: '<i class="bi bi-grid-3x3-gap"></i> Klasikal (satu kelas)' }[s] + '</button>'; }).join('') + '</div></div>' +
      '<div id="ly-peserta"></div>' +
      fld({ name: 'id_laporan', label: 'Kasus terkait (opsional)', type: 'select', blank: '— Tidak terkait kasus —', value: x ? x.id_laporan : (kasusPre ? kasusPre.id : ''), opts: kasusOpts }) +
      fld({ name: 'topik', label: 'Topik / masalah', req: true, max: 200, value: x ? x.topik : (progPre ? progPre.topik : (pre.topik || '')), ph: 'mis. Cara belajar efektif · Kesulitan beradaptasi · Pilihan SMA/SMK' }) +
      '<div id="ly-asesmen">' + fld({ name: 'asesmen', label: 'Asesmen / identifikasi kebutuhan', type: 'textarea', rows: 3, max: 5000, value: x ? x.asesmen : '' }) + '</div>' +
      '<div id="ly-catatan">' + fld({ name: 'catatan_konseling', label: 'Catatan', type: 'textarea', req: true, rows: 5, max: 8000, value: x ? x.catatan_konseling : '' }) + '</div>' +
      '<div class="form-grid c2">' + fld({ name: 'hasil', label: 'Hasil / evaluasi', type: 'textarea', rows: 3, max: 3000, value: x ? x.hasil : '' }) + fld({ name: 'rencana_tindak', label: 'Rencana tindak lanjut', type: 'textarea', rows: 3, max: 3000, value: x ? x.rencana_tindak : '' }) + '</div>' +
      '<div class="field"><span class="flabel">Lampiran (opsional)</span><input type="file" id="ly-file" class="input" accept=".pdf,.png,.jpg,.jpeg,.webp">' + berkasList + '</div>' +
      '<div id="ly-note"></div></form>',
    foot: (x ? '<button class="btn soft-danger" data-act="ly-hapus" data-id="' + esc(x.id) + '" style="flex:0 0 auto"><i class="bi bi-trash3"></i></button>' : '') + '<button class="btn" data-close>Tutup</button><button class="btn primary" id="ly-ok"><i class="bi bi-check-lg"></i> Simpan</button>'
  });
  P.lyf = { st: st, R: R, m: m, x: x };
  const f = $('#f-ly', m.el);
  lyJenisOpts(jenis0); lyKompUI(); lyPesertaUI();
  $('#ly-file', m.el).addEventListener('change', function (e) { readFileB64(e.target.files[0], 5 * 1024 * 1024).then(function (b) { st.file = b; }).catch(function (er) { e.target.value = ''; st.file = null; fail(er); }); });
  $('[name=id_laporan]', f).addEventListener('change', function (e) {
    const k = R.kasusAktif.filter(function (z) { return z.id === e.target.value; })[0];
    if (k && !st.peserta.some(function (p) { return p.id === k.id_murid; })) {
      if (st.sasaran === 'Klasikal') { st.sasaran = 'Individu'; $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === 'Individu'); }); }
      if (st.sasaran === 'Individu') st.peserta = [];
      st.peserta.push({ id: k.id_murid, nama: k.murid, kelas: k.kelas });
      lyPesertaUI();
    }
    if (k && !$('[name=sumber]', f).value) $('[name=sumber]', f).value = 'Laporan kejadian';
  });
  $('[name=id_program]', f).addEventListener('change', function (e) {
    const p = R.program.filter(function (z) { return z.id === e.target.value; })[0];
    if (!p) return;
    if (!$('[name=topik]', f).value.trim()) $('[name=topik]', f).value = p.topik;
    $('[name=bidang]', f).value = p.bidang;
    if (p.jurus && !$('[name=jurus]', f).value) $('[name=jurus]', f).value = p.jurus;
    if (!$('[name=sumber]', f).value) $('[name=sumber]', f).value = 'Program BK';
  });
  $('#ly-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f);
    if (!validate(f, d, { topik: { label: 'Topik', req: true }, catatan_konseling: { label: 'Catatan', req: true, min: 5 }, tanggal: { label: 'Tanggal', req: true } })) return;
    d.komponen = st.komponen; d.sasaran = st.sasaran;
    if (st.sasaran === 'Klasikal') { if (!d.id_kelas) { toast('Pilih kelas sasaran.', 'err'); return; } }
    else {
      d.peserta = st.peserta.map(function (p) { return p.id; });
      if (st.sasaran === 'Individu' && d.peserta.length !== 1) { toast('Pilih satu murid.', 'err'); return; }
      if (st.sasaran === 'Kelompok' && d.peserta.length < 2) { toast('Layanan kelompok memerlukan minimal 2 murid.', 'err'); return; }
    }
    if (x) d.id = x.id; d.berkas = st.file;
    run(e.currentTarget, api('layanan.simpan', d)).then(function (res) {
      m.close(); toast('Layanan BK tersimpan.');
      if (!x && pre.permintaan) api('temu.ubah', { id: pre.permintaan, status: 'Selesai', id_layanan: res && res.id ? res.id : '' }).then(function () { if (S.page === 'layanan') temuRingkas(); }).catch(fail);
      if (S.page === 'layanan') lyLoad(); else if (S.page === 'program') pgProgram();
    }).catch(fail);
  });
}
function lyJenisOpts(sel) {
  const L = P.lyf, list = L.R.komponen[L.st.komponen] || [];
  const opts = list.slice();
  if (sel && opts.indexOf(sel) < 0 && L.x && L.x.jenis_layanan === sel) opts.push(sel);
  $('#ly-jenis').innerHTML = opts.map(function (j) { return '<option' + (j === sel ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('');
}
function lyKompUI() {
  const L = P.lyf, k = L.st.komponen, rah = k === 'Responsif';
  $$('#ly-kt .komp-tile').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); });
  $('#ly-asesmen').classList.toggle('hide', !(rah || k === 'Peminatan & Perencanaan Individual'));
  const lbl = $('#ly-catatan label');
  if (lbl) lbl.innerHTML = (rah ? 'Catatan konseling' : 'Uraian pelaksanaan') + ' <span class="req">*</span>';
  const ta = $('#ly-catatan textarea');
  if (ta) ta.placeholder = rah ? 'Catatan sesi: permasalahan yang disampaikan, proses, kesepakatan.' : 'Uraikan kegiatan: tujuan, metode/media, jalannya kegiatan, partisipasi murid.';
  $('#ly-note').innerHTML = rah ? '<div class="lock"><div class="l-head"><i class="bi bi-lock-fill"></i> Layanan responsif bersifat rahasia</div><div class="xs muted mt-8">Hanya Guru BK yang dapat membuka catatan ini. Wali kelas dan guru lain hanya melihat status kasus, tidak melihat isi maupun keberadaan sesi konseling di luar kasus.</div></div>'
    : '<div class="note info"><i class="bi bi-info-circle"></i><div>Topik layanan ini akan tampil di garis waktu murid bagi wali kelas (mis. "Mengikuti bimbingan klasikal: Cara belajar efektif"). Uraian pelaksanaan hanya dibaca Guru BK.</div></div>';
}
ACT['ly-kt'] = function (el) {
  const L = P.lyf; L.st.komponen = el.dataset.k;
  lyJenisOpts((L.R.komponen[L.st.komponen] || [])[0]); lyKompUI();
  if (L.st.komponen === 'Layanan Dasar' && L.st.sasaran === 'Individu' && !L.st.peserta.length) { L.st.sasaran = 'Klasikal'; $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === 'Klasikal'); }); lyPesertaUI(); }
};
ACT['ly-sas'] = function (el) {
  const st = P.lyf.st; st.sasaran = el.dataset.s;
  if (st.sasaran === 'Individu' && st.peserta.length > 1) st.peserta = st.peserta.slice(0, 1);
  $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b === el); });
  lyPesertaUI();
};
function lyPesertaUI() {
  const L = P.lyf, st = L.st, box = $('#ly-peserta');
  if (st.sasaran === 'Klasikal') {
    box.innerHTML = fld({ name: 'id_kelas', label: 'Kelas sasaran', type: 'select', req: true, blank: 'Pilih kelas…', value: L.x ? L.x.id_kelas : '', opts: kelasOpts(), hint: 'Seluruh murid aktif di kelas ini tercatat sebagai peserta.' });
    return;
  }
  box.innerHTML = '<div class="field"><span class="flabel">' + (st.sasaran === 'Individu' ? 'Murid' : 'Murid peserta (2–40)') + ' <span class="req">*</span></span>' +
    '<div class="chips-sel" id="ly-chips">' + (st.peserta.length ? st.peserta.map(function (p, i) { return '<span class="chip-sel"><b>' + esc(p.nama) + '</b><span class="xs muted">' + esc(p.kelas || '') + '</span><button type="button" data-act="ly-rm" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-x"></i></button></span>'; }).join('') : '<span class="xs muted">Belum ada murid dipilih.</span>') + '</div>' +
    '<div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="ly-mq" class="input" style="padding-left:36px" type="search" placeholder="Ketik nama atau NIS untuk ' + (st.sasaran === 'Individu' ? 'memilih' : 'menambah') + ' murid…" autocomplete="off"><div class="search-res hide" id="ly-mres"></div></div></div>';
  const q = $('#ly-mq');
  q.addEventListener('input', debounce(function () {
    const v = q.value.trim(), res = $('#ly-mres');
    if (v.length < 2) { res.classList.add('hide'); return; }
    apiC('murid.cari', { q: v }).then(function (rows) {
      L.hits = rows; res.classList.remove('hide');
      res.innerHTML = rows.length ? rows.map(function (m, i) { return '<button type="button" data-act="ly-pick" data-i="' + i + '"><div class="avatar" style="width:30px;height:30px;font-size:11px">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</div></div></button>'; }).join('') : '<div class="empty xs" style="padding:12px">Tidak ditemukan.</div>';
    }).catch(fail);
  }, 250));
}
ACT['ly-pick'] = function (el) {
  const L = P.lyf, m = L.hits[+el.dataset.i]; if (!m) return;
  if (L.st.sasaran === 'Individu') L.st.peserta = [];
  if (!L.st.peserta.some(function (p) { return p.id === m.id; })) L.st.peserta.push({ id: m.id, nama: m.nama, kelas: m.kelas });
  lyPesertaUI(); const q = $('#ly-mq'); if (q) q.focus();
};
ACT['ly-rm'] = function (el) { P.lyf.st.peserta.splice(+el.dataset.i, 1); lyPesertaUI(); };
ACT['ly-hapus'] = function (el) {
  confirmDlg('Hapus catatan layanan ini? Realisasi program yang terkait ikut berkurang.', 'Hapus', true, 'Hapus layanan').then(function (ok) {
    if (!ok) return;
    api('layanan.hapus', { id: el.dataset.id }).then(function () { closeAllOverlays(); toast('Layanan dihapus.'); if (S.page === 'layanan') lyLoad(); }).catch(fail);
  });
};

'use strict';
// ════════════════════════════════════════════════════════════
// Garis Waktu Murid / Riwayat (F9)
// ════════════════════════════════════════════════════════════
PAGES.riwayat = function (params, tok) {
  if (params.id_murid) return rwLoad(params.id_murid, tok);
  P.rw = { q: '' };
  $('#app-container').innerHTML = pageHead('Profil & riwayat murid', 'Garis Waktu Murid', 'Pilih murid untuk melihat seluruh catatannya dalam satu tempat: kehadiran, laporan kejadian, pembinaan guru, layanan BK, komunikasi orang tua, dan hasil instrumen.', '') +
    '<div class="card pad"><div class="search" style="max-width:none"><i class="bi bi-search"></i><input id="rw-q" class="input" style="padding-left:36px" type="search" placeholder="Cari nama atau NIS murid…" autocomplete="off"></div></div><div id="rw-list" class="card mt-16"></div>';
  const go = function () {
    apiC('murid.cari', { q: $('#rw-q').value.trim() }).then(function (rows) {
      if (!$('#rw-list')) return;
      $('#rw-list').innerHTML = rows.length ? '<div class="cases">' + rows.map(function (m) {
        return '<button class="case" data-act="open-murid" data-id="' + esc(m.id) + '" style="flex-direction:row;align-items:center"><div class="avatar">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="c-name">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</div></div>' + (m.pola ? chipLevel(m.pola) : '') + '<i class="bi bi-chevron-right muted"></i></button>';
      }).join('') + '</div>' : empty('bi-person-x', 'Murid tidak ditemukan');
    }).catch(function (e) { isiHtml('#rw-list', errBox(e)); });
  };
  $('#rw-q').addEventListener('input', debounce(go, 280));
  go();
};
function chipStatusT(cls, text) { return '<span class="chip st-' + esc(slug(cls)) + '">' + esc(text) + '</span>'; }
const TIPE_LABEL = { permintaan: 'Permintaan murid', semua: 'Semua', harian: 'Absensi harian', absensi: 'Absensi mapel', kejadian: 'Kejadian', bimbingan: 'Pembinaan guru', rujukan: 'Rujukan', tinjau: 'Tinjauan BK', monitoring: 'Tindak lanjut', layanan: 'Layanan BK', layanan_privasi: 'Layanan BK', ortu: 'Orang tua', instrumen: 'Instrumen' };
const TIPE_IKON = { permintaan: 'bi-person-raised-hand', harian: 'bi-calendar-check', absensi: 'bi-person-check', kejadian: 'bi-exclamation-triangle', bimbingan: 'bi-people', rujukan: 'bi-send', tinjau: 'bi-eye', monitoring: 'bi-list-check', layanan: 'bi-heart-pulse', layanan_privasi: 'bi-lock-fill', ortu: 'bi-chat-dots', instrumen: 'bi-clipboard-data', poin: 'bi-award' };
function rwLoad(id, tok) {
  return apiC('riwayat.murid', { id_murid: id }).then(function (d) {
    if (stale(tok)) return;
    P.rwd = d; P.rwTab = P.rwTab && P.rwId === id ? P.rwTab : 'tl'; P.rwFilter = 'semua'; P.rwId = id;
    const m = d.murid, r = d.ringkas;
    const act = [];
    if (d.bolehLayanan) act.push('<button class="btn primary" data-act="rw-layanan"><i class="bi bi-heart-pulse"></i> Catat layanan BK</button>');
    if (d.bolehLapor) act.push('<button class="btn" data-act="lap-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '"><i class="bi bi-plus-circle"></i> Lapor kejadian</button>');
    if (d.bolehOrtu) act.push('<button class="btn blue" data-act="wa-murid" data-id="' + esc(m.id) + '"><i class="bi bi-whatsapp"></i> Hubungi orang tua</button>');
    act.push('<button class="btn ghost" data-act="rw-cetak" title="Cetak ringkasan"><i class="bi bi-printer"></i></button>');
    const ab = r.absenHarian || {};
    let h = '<button class="btn sm ghost mb-8 no-print" data-act="nav" data-page="riwayat"><i class="bi bi-arrow-left"></i> Daftar murid</button>' +
      '<div class="card pad rw-head"><div class="row between wrap" style="gap:16px"><div class="profile-head"><div class="big-av">' + esc(initials(m.nama)) + '</div><div><h2>' + esc(m.nama) + '</h2><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + ' · Wali kelas: ' + esc(m.wali || '-') + (d.kolaborasi.guruBk ? ' · Guru BK: ' + esc(d.kolaborasi.guruBk) : '') + (m.status !== 'Aktif' ? ' · <b>' + esc(m.status) + '</b>' : '') + '</div>' +
      '<div class="row wrap mt-8">' + chipStatusT(r.progres === 'Belum ada kasus' ? 'Selesai' : r.progres, r.progres === 'Belum ada kasus' ? 'Tidak ada kasus' : 'Kasus terakhir: ' + r.progres) + (r.pola ? '<span class="chip lv-perhatian"><i class="bi bi-exclamation-triangle"></i> ' + esc(r.pola) + '</span>' : '') + '</div></div></div>' +
      '<div class="row wrap no-print">' + act.join('') + '</div></div></div>' +
      '<div class="stat-row s6 mt-16">' +
        '<div class="stat"><span class="lbl">Masuk sekolah · 6 bln</span><b>' + (r.kehadiranHarian === null || r.kehadiranHarian === undefined ? '-' : r.kehadiranHarian + '%') + '</b><span class="xs muted">S ' + (ab.S || 0) + ' · I ' + (ab.I || 0) + ' · A ' + (ab.A || 0) + ' · T ' + (ab.T || 0) + '</span></div>' +
        '<div class="stat"><span class="lbl">Hadir per mapel · 6 bln</span><b>' + (r.kehadiran === null ? '-' : r.kehadiran + '%') + '</b></div>' +
        '<div class="stat"><span class="lbl">Laporan kejadian</span><b>' + r.laporan + '</b><span class="xs muted">' + r.laporanAktif + ' masih aktif</span></div>' +
        '<div class="stat"><span class="lbl">Layanan BK diikuti</span><b>' + r.layanan + '</b><span class="xs muted">Ind ' + r.layananPer.Individu + ' · Kel ' + r.layananPer.Kelompok + ' · Klas ' + r.layananPer.Klasikal + '</span></div>' +
        (d.bolehLayanan ? '<div class="stat"><span class="lbl">Instrumen diisi</span><b>' + r.instrumen + '</b></div>' : '') +
        '<div class="stat"><span class="lbl">Kontak orang tua</span><b>' + d.komunikasi.length + '</b></div>' +
        (r.poin ? '<div class="stat click" data-act="pn-murid" data-id="' + esc(m.id) + '" style="cursor:pointer"><span class="lbl">Poin tata tertib</span><b>' + r.poin.B + '</b><span class="xs muted">' + esc(r.poin.tahap ? r.poin.tahap.n : 'Belum mencapai tahap') + '</span></div>' : '') + '</div>' +
      '<div class="card mt-16"><div class="tabs" id="rw-tabs">' + [['tl', 'Garis waktu'], ['hadir', 'Kehadiran'], ['kasus', 'Kasus (' + d.kasus.length + ')'], ['layanan', 'Layanan BK (' + d.layanan.length + ')']].concat(d.bolehLayanan ? [['instrumen', 'Instrumen (' + d.instrumen.length + ')']] : []).concat([['kom', 'Orang tua (' + d.komunikasi.length + ')'], ['dok', 'Dokumen (' + d.dokumen.length + ')'], ['kol', 'Kolaborasi']]).map(function (t) { return '<button class="tab ' + (t[0] === P.rwTab ? 'active' : '') + '" data-act="rw-tab" data-t="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div><div class="card-body" id="rw-body"></div></div>';
    $('#app-container').innerHTML = h;
    rwDraw();
  });
}
function rwDraw() {
  const d = P.rwd, b = $('#rw-body'), t = P.rwTab;
  killCharts();
  if (t === 'tl') {
    const seen = {};
    d.timeline.forEach(function (e) { seen[e.tipe === 'layanan_privasi' ? 'layanan' : e.tipe] = 1; });
    const types = ['semua'].concat(['harian', 'absensi', 'kejadian', 'bimbingan', 'rujukan', 'tinjau', 'monitoring', 'layanan', 'permintaan', 'ortu', 'instrumen'].filter(function (x) { return seen[x]; }));
    const ev = d.timeline.filter(function (e) { return P.rwFilter === 'semua' || (e.tipe === 'layanan_privasi' ? 'layanan' : e.tipe) === P.rwFilter; });
    b.innerHTML = '<div class="note info mb-16"><i class="bi bi-info-circle"></i><div>Semua catatan tentang murid ini, dari yang terbaru. Titik berwarna menandai jenisnya; gunakan tombol di bawah untuk menyaring. Kehadiran hanya menampilkan hari tidak hadir/terlambat (1 tahun terakhir).' + '</div></div>' +
      '<div class="fchips wrapc mb-16">' + types.map(function (x) { return '<button class="fchip ' + (x === P.rwFilter ? 'active' : '') + '" data-act="rw-filter" data-t="' + esc(x) + '">' + esc(TIPE_LABEL[x] || x) + '</button>'; }).join('') + '</div>' +
      (ev.length ? '<div class="tl">' + ev.map(function (e) {
        const priv = e.tipe === 'layanan_privasi';
        let btn = '';
        if (e.id_layanan) btn = '<button class="btn sm ghost" data-act="layanan-buka" data-id="' + esc(e.id_layanan) + '">Buka catatan layanan</button>';
        else if (e.id_instrumen) btn = '<button class="btn sm ghost" data-act="in-detail" data-id="' + esc(e.id_instrumen) + '" data-m="' + esc(d.murid.id) + '">Lihat jawaban</button>';
        else if (e.id_kasus && !priv && e.tipe !== 'absensi' && e.tipe !== 'harian') btn = '<button class="btn sm ghost" data-act="kasus-open" data-id="' + esc(e.id_kasus) + '">Buka kasus ' + esc(e.kode || '') + '</button>';
        return '<div class="tl-item ' + esc(e.warna || 'slate') + '"><div class="t-date">' + esc(fTs(e.ts && e.ts.length > 10 && e.tipe !== 'absensi' && e.tipe !== 'harian' ? e.ts : e.tanggal)) + ' · <span class="t-type"><i class="bi ' + (TIPE_IKON[e.tipe] || 'bi-dot') + '"></i> ' + esc(TIPE_LABEL[e.tipe] || '') + '</span>' + (e.meta ? ' · ' + esc(e.meta) : '') + '</div><div class="t-title">' + esc(e.judul) + '</div>' + (e.isi ? '<div class="t-body">' + esc(e.isi) + '</div>' : '') + (e.oleh ? '<div class="t-by">' + esc(e.oleh) + '</div>' : '') + btn + '</div>';
      }).join('') + '</div>' : empty('bi-clock-history', 'Belum ada catatan', 'Catatan muncul setelah ada absensi tidak hadir, laporan, layanan BK, atau komunikasi orang tua.'));
  } else if (t === 'hadir') {
    const rb = d.rekapBulan;
    b.innerHTML = '<div class="chart-box sm"><canvas id="ch-rwh"></canvas></div><div class="tbl-wrap mt-16"><table class="tbl" style="min-width:520px"><thead><tr><th>Bulan</th><th>Hari tercatat</th><th>Kehadiran</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Terlambat</th><th>Alpa mapel</th></tr></thead><tbody>' +
      rb.map(function (x) { return '<tr><td class="fw6">' + esc(blnPanjang(x.bulan)) + '</td><td>' + x.hari + '</td><td>' + (x.hadir === null ? '-' : x.hadir + '%') + '</td><td>' + x.S + '</td><td>' + x.I + '</td><td' + (x.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + x.A + '</td><td>' + x.T + '</td><td>' + x.alpaMapel + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="xs muted mt-12">Persentase dari absensi harian (masuk sekolah). Rincian per hari ada di tab Garis waktu dengan filter Absensi.</p>';
    chart('ch-rwh', { kind: 'bar', labels: rb.map(function (x) { return x.label; }), data: rb.map(function (x) { return x.hadir === null ? 0 : x.hadir; }), color: '#0EA5A4', max: 100, label: 'Kehadiran harian per bulan' });
  } else if (t === 'kasus') {
    b.innerHTML = d.kasus.length ? '<div class="cases">' + d.kasus.map(function (k) { return '<button class="case" data-act="kasus-open" data-id="' + esc(k.id) + '"><div class="c-main"><div class="c-top"><span class="mono muted">' + esc(k.kode) + '</span>' + chipUrg(k.urgensi) + chipStatus(k.status) + '</div><div class="fw6 mt-8">' + esc(k.kategori) + '</div><div class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.pelapor) + (k.mode ? ' · ' + esc(k.mode) : '') + '</div></div><i class="bi bi-chevron-right muted"></i></button>'; }).join('') + '</div>' : empty('bi-folder2-open', 'Tidak ada laporan kejadian');
  } else if (t === 'layanan') {
    b.innerHTML = d.layanan.length ? '<div class="ly-list">' + d.layanan.map(function (x) {
      return '<div class="ly-row static"><div class="ly-date"><b>' + esc(x.tanggal.substr(8, 2)) + '</b><span>' + esc(BLN[+x.tanggal.substr(5, 2) - 1] || '') + ' ' + esc(x.tanggal.substr(2, 2)) + '</span></div><div class="grow"><div class="row wrap" style="gap:6px">' + chipKomp(x.komponen) + '<span class="chip neutral">' + esc(x.jenis_layanan) + '</span><span class="chip neutral">' + esc(x.sasaran) + '</span></div><div class="fw6 mt-8">' + esc(x.topik) + '</div><div class="xs muted">' + esc(x.oleh) + (x.bidang ? ' · Bidang ' + esc(x.bidang) : '') + '</div></div>' + (x.bolehBuka ? '<button class="btn sm" data-act="layanan-buka" data-id="' + esc(x.id) + '">Buka</button>' : '') + '</div>';
    }).join('') + '</div>' : empty('bi-heart-pulse', 'Belum ada layanan BK', d.bolehLayanan ? 'Catat layanan dengan tombol "Catat layanan BK".' : 'Layanan BK yang bersifat umum (mis. bimbingan klasikal) akan tampil di sini.');
  } else if (t === 'instrumen') {
    b.innerHTML = d.instrumen.length ? d.instrumen.map(function (x) { return '<div class="sec mb-8"><div class="row between wrap"><div><span class="chip neutral">' + esc(x.jenis) + '</span> <b>' + esc(x.judul) + '</b></div><span class="xs muted">' + esc(fTs(x.ts)) + ' · ' + (x.sumber === 'guru' ? 'diinput Guru BK' : 'diisi murid') + '</span></div><div class="muted-2 mt-8">' + esc(x.ringkas) + '</div><button class="btn sm mt-8" data-act="in-detail" data-id="' + esc(x.id) + '" data-m="' + esc(d.murid.id) + '"><i class="bi bi-eye"></i> Lihat jawaban</button></div>'; }).join('') : empty('bi-clipboard-data', 'Murid ini belum mengisi instrumen');
  } else if (t === 'kom') {
    b.innerHTML = d.komunikasi.length ? d.komunikasi.map(function (k) { return '<div class="sec mb-8"><div class="row between wrap"><span class="chip blue"><i class="bi bi-chat-dots"></i> ' + esc(k.media) + '</span><span class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.oleh) + '</span></div><div class="fw6 mt-8">' + esc(k.tujuan) + '</div><div class="body muted-2" style="line-height:20px">' + esc(k.ringkasan) + '</div>' + (k.hasil ? '<div class="xs mt-8"><b>Hasil:</b> ' + esc(k.hasil) + '</div>' : '') + '</div>'; }).join('') : empty('bi-chat-square', 'Belum ada komunikasi tercatat');
  } else if (t === 'dok') {
    b.innerHTML = d.dokumen.length ? d.dokumen.map(function (x) { return '<div class="row between sec mb-8"><div><div class="fw6">' + esc(x.judul) + '</div><div class="xs muted">' + esc(fTgl(x.tanggal)) + '</div></div><button class="btn sm" data-act="berkas" data-id="' + esc(x.id) + '"><i class="bi bi-eye"></i> Buka</button></div>'; }).join('') : empty('bi-file-earmark', 'Belum ada dokumen');
  } else {
    const k = d.kolaborasi;
    b.innerHTML = '<dl class="kv"><dt>Wali kelas</dt><dd>' + esc(k.wali || '-') + '</dd><dt>Guru BK kelas</dt><dd>' + esc(k.guruBk || 'Semua Guru BK') + '</dd><dt>Guru BK penangani kasus</dt><dd>' + esc(k.penangani || '-') + '</dd><dt>Guru pelapor</dt><dd>' + (k.pelapor.length ? k.pelapor.map(esc).join(', ') : '-') + '</dd>' +
      (d.ortu ? '<dt>Orang tua</dt><dd>' + esc(d.ortu.nama || '-') + '</dd><dt>No. WhatsApp</dt><dd>' + esc(d.ortu.hp || '-') + (d.ortu.hp && !d.ortu.hpValid ? ' <span class="chip st-Baru">format perlu diperbaiki</span>' : '') + '</dd><dt>Email</dt><dd>' + esc(d.ortu.email || '-') + '</dd>' : '') + '</dl>';
  }
}
ACT['rw-tab'] = function (el) { P.rwTab = el.dataset.t; $$('#rw-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); rwDraw(); };
ACT['rw-filter'] = function (el) { P.rwFilter = el.dataset.t; rwDraw(); };
ACT['rw-layanan'] = function () { const m = P.rwd.murid; navigateTo('layanan', { murid: { id: m.id, nama: m.nama, kelas: m.kelas } }); };
ACT['rw-cetak'] = function () { P.rwTab = 'tl'; P.rwFilter = 'semua'; rwDraw(); setTimeout(function () { window.print(); }, 200); };
ACT['lap-murid'] = function (el) { navigateTo('lapor', { id_murid: el.dataset.id, nama: el.dataset.n }); };
ACT['ortu-murid'] = function (el) { navigateTo('ortu', { id_murid: el.dataset.id }); };

// ════════════════════════════════════════════════════════════
// Hubungi Orang Tua (F7) — tautan WhatsApp/email, bukan kirim otomatis
// ════════════════════════════════════════════════════════════
PAGES.ortu = function (params, tok) {
  P.or = { q: '', kasus: params.id_kasus || '' };
  if (params.id_murid) return orLoad(params.id_murid, tok, params.templat, params.tanggal);
  $('#app-container').innerHTML = pageHead('Kemitraan orang tua', 'Hubungi Orang Tua', 'Siapkan pesan WhatsApp dari templat, buat surat panggilan resmi, dan catat setiap komunikasi.', '') +
    '<div class="card pad"><div class="search" style="max-width:none"><i class="bi bi-search"></i><input id="or-q" class="input" style="padding-left:36px" type="search" placeholder="Cari murid (nama atau NIS)…" autocomplete="off"></div></div><div id="or-list" class="card mt-16"></div>';
  const go = function () {
    apiC('murid.cari', { q: $('#or-q').value.trim() }).then(function (rows) {
      if (!$('#or-list')) return;
      $('#or-list').innerHTML = rows.length ? '<div class="cases">' + rows.map(function (m) {
        return '<button class="case" data-act="ortu-murid" data-id="' + esc(m.id) + '" style="flex-direction:row;align-items:center"><div class="avatar">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="c-name">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</div></div><i class="bi bi-chevron-right muted"></i></button>';
      }).join('') + '</div>' : empty('bi-person-x', 'Murid tidak ditemukan', 'Wali kelas hanya dapat menghubungi orang tua murid perwaliannya.');
    }).catch(function (e) { isiHtml('#or-list', errBox(e)); });
  };
  $('#or-q').addEventListener('input', debounce(go, 280));
  go();
};
function orLoad(id, tok, tpl, tgl) {
  tpl = waTpl().some(function (t) { return t[0] === tpl; }) ? tpl : 'undangan';
  return Promise.all([apiC('ortu.siapkan', { id_murid: id, templat: tpl, tanggal: tgl || '' }), apiC('ortu.riwayat', { id_murid: id })]).then(function (res) {
    if (stale(tok)) return;
    const s = res[0], rw = res[1];
    P.or.id = id; P.or.s = s; P.or.rw = rw; P.or.templat = tpl;
    let h = '<button class="btn sm ghost mb-8" data-act="nav" data-page="ortu"><i class="bi bi-arrow-left"></i> Daftar murid</button>' + pageHead('Kemitraan orang tua', 'Hubungi Orang Tua — ' + s.nama_murid, s.kelas + ' · ' + (s.nama_ortu || 'Orang tua/wali belum tercatat'), '<button class="btn" data-act="or-surat"><i class="bi bi-file-earmark-text"></i> Surat panggilan</button><button class="btn primary" data-act="or-catat"><i class="bi bi-journal-plus"></i> Catat komunikasi</button>');
    h += '<div class="grid g-2"><div class="col gap-16"><div class="card pad"><div class="row between wrap"><h3><i class="bi bi-whatsapp" style="color:#25D366"></i> Pesan WhatsApp</h3><div class="fchips" id="or-tpl">' + waTpl().map(function (t, i) { return '<button class="fchip ' + (t[0] === tpl ? 'active' : '') + '" data-act="or-tpl" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="note info mt-12"><i class="bi bi-info-circle"></i><div>Sistem menyiapkan tautan WhatsApp. Pesan <b>tidak dikirim otomatis</b> — Anda yang menekan kirim di aplikasi WhatsApp.</div></div>' +
      '<div class="field mt-12"><label for="or-msg">Isi pesan (dapat diubah)</label><textarea id="or-msg" class="textarea" rows="6" maxlength="1000">' + esc(s.pesan) + '</textarea></div>' +
      '<div class="row wrap mt-12" id="or-links"></div><div id="or-sesudah" class="wa-after hide"><i class="bi bi-chat-dots"></i><div class="grow"><b>Sudah terkirim?</b><span>Satu ketukan untuk mencatat.</span></div><button class="btn sm" data-act="or-belum">Belum</button><button class="btn sm primary" data-act="or-cepat"><i class="bi bi-check-lg"></i> Ya, catat</button></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>Riwayat komunikasi</h3></div><div class="card-body" id="or-hist"></div></div></div>';
    $('#app-container').innerHTML = h;
    orLinks(); orHist();
    $('#or-msg').addEventListener('input', orLinks);
  });
}
function orLinks() {
  const s = P.or.s, msg = ($('#or-msg') || {}).value || '';
  const wa = s.hp ? 'https://wa.me/' + s.hp + '?text=' + encodeURIComponent(msg) : '';
  const mail = s.email ? 'mailto:' + s.email + '?subject=' + encodeURIComponent('Informasi dari ' + S.cfg.namaSekolah) + '&body=' + encodeURIComponent(msg) : '';
  $('#or-links').innerHTML = (wa ? '<a class="btn teal" style="background:#25D366;border-color:#25D366" href="' + esc(wa) + '" target="_blank" rel="noopener" id="or-wa"><i class="bi bi-whatsapp"></i> Buka WhatsApp</a>' : '<span class="chip st-Baru"><i class="bi bi-exclamation-triangle"></i> No. WhatsApp orang tua belum valid — perbaiki di data murid</span>') +
    (mail ? '<a class="btn" href="' + esc(mail) + '"><i class="bi bi-envelope"></i> Buka email</a>' : '') + '<button class="btn" data-act="or-copy"><i class="bi bi-clipboard"></i> Salin pesan</button>';
  const a = $('#or-wa'); if (a) a.addEventListener('click', function () { setTimeout(function () { show('#or-sesudah', true); }, 500); });
}
ACT['or-belum'] = function () { show('#or-sesudah', false); };
ACT['or-cepat'] = function () {
  const tpl = (waTpl().filter(function (t) { return t[0] === P.or.templat; })[0] || ['', 'Komunikasi'])[1];
  const d = { id_murid: P.or.id, tanggal: S.today, media: 'WhatsApp', tujuan: tpl, ringkasan_pembahasan: $('#or-msg').value, hasil: 'Pesan terkirim; menunggu tanggapan orang tua.' };
  if (P.or.kasus) d.id_kasus = P.or.kasus;
  show('#or-sesudah', false); toast('Komunikasi tercatat.');
  api('ortu.catat', d).then(function () { return apiC('ortu.riwayat', { id_murid: P.or.id }); }).then(function (rw) { P.or.rw = rw; orHist(); }).catch(function (e) { toast('Gagal mencatat: ' + e.message, 'err'); });
};
ACT['or-copy'] = function () {
  const t = $('#or-msg').value;
  const ok = function () { toast('Pesan disalin.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { $('#or-msg').select(); document.execCommand('copy'); ok(); });
  else { $('#or-msg').select(); document.execCommand('copy'); ok(); }
};
ACT['or-tpl'] = function (el) {
  $$('#or-tpl .fchip').forEach(function (b) { b.classList.toggle('active', b === el); });
  P.or.templat = el.dataset.t;
  apiC('ortu.siapkan', { id_murid: P.or.id, templat: el.dataset.t }).then(function (s) { P.or.s = s; $('#or-msg').value = s.pesan; orLinks(); }).catch(fail);
};
function orHist() {
  const rw = P.or.rw;
  $('#or-hist').innerHTML = rw.length ? rw.map(function (k) {
    return '<div class="sec mb-8"><div class="row between wrap"><span class="chip blue">' + esc(k.media) + '</span><span class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.oleh) + '</span></div><div class="fw6 mt-8">' + esc(k.tujuan) + '</div><div class="muted-2" style="line-height:20px">' + esc(k.ringkasan) + '</div>' + (k.hasil ? '<div class="xs mt-8"><b>Hasil:</b> ' + esc(k.hasil) + '</div>' : '') + (k.id_berkas ? '<button class="btn sm mt-8" data-act="berkas" data-id="' + esc(String(k.id_berkas).split(',')[0]) + '"><i class="bi bi-file-earmark-pdf"></i> Buka surat</button>' : '') + '</div>';
  }).join('') : empty('bi-chat-square-dots', 'Belum ada komunikasi', 'Catat setiap kontak dengan orang tua agar tampil di garis waktu murid.');
}
ACT['or-catat'] = function () {
  const m = openModal({
    title: 'Catat komunikasi orang tua', sub: P.or.s.nama_murid,
    body: '<form id="f-oc" class="form-grid" novalidate><div class="form-grid c2">' + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: S.today, maxv: S.today }) + fld({ name: 'media', label: 'Media', type: 'select', req: true, value: 'WhatsApp', opts: ['WhatsApp', 'Email', 'Telepon', 'Tatap muka', 'Surat Panggilan'] }) + '</div>' +
      fld({ name: 'tujuan', label: 'Tujuan komunikasi', req: true, max: 300, ph: 'mis. Undangan diskusi perkembangan' }) +
      fld({ name: 'ringkasan_pembahasan', label: 'Ringkasan pembahasan', type: 'textarea', req: true, rows: 4, max: 2000 }) + fld({ name: 'hasil', label: 'Hasil / kesepakatan', type: 'textarea', rows: 2, max: 1500 }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="oc-ok">Simpan</button>'
  });
  $('#oc-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-oc', m.el), d = formData(f);
    if (!validate(f, d, { tujuan: { label: 'Tujuan', req: true, min: 3 }, ringkasan_pembahasan: { label: 'Ringkasan', req: true, min: 5 } })) return;
    d.id_murid = P.or.id; if (P.or.kasus) d.id_kasus = P.or.kasus;
    run(e.currentTarget, api('ortu.catat', d)).then(function () { m.close(); toast('Komunikasi tercatat.'); return apiC('ortu.riwayat', { id_murid: P.or.id }); }).then(function (rw) { P.or.rw = rw; orHist(); }).catch(fail);
  });
};
ACT['or-surat'] = function () { siapKop().then(orSuratModal); };
/** Ganti isian {..} yang sudah diketahui di layar; sisanya ({tanggal}, {jam}, …) diisi server saat surat dibuat. */
function isiSuratLokal(t) {
  const s = P.or.s || {}, v = { nama_murid: s.nama_murid, kelas: s.kelas, nama_ortu: s.nama_ortu || 'Bapak/Ibu', sekolah: (KOP && KOP.sekolah) || S.cfg.namaSekolah, pengirim: S.user.nama };
  return String(t || '').replace(/\{([a-z_]+)\}/g, function (a, k) { return v[k] ? v[k] : a; });
}
function orSuratModal() {
  const J = [{ v: 'panggilan', l: 'Surat panggilan (pertemuan)' }, { v: 'pemberitahuan', l: 'Surat pemberitahuan' }, { v: 'konseling', l: 'Persetujuan layanan konseling' }];
  const T = (KOP && KOP.templat) || {}, B = (KOP && KOP.bagian) || {};
  const kalimat = function (j) {
    return Object.keys(T[j] || {}).map(function (k) {
      const isi = k === 'isi';
      return '<div class="field"><label for="sr-t-' + j + '-' + k + '">' + esc(B[k] || k) + (isi ? ' <span class="req">*</span>' : '') + '</label><textarea class="textarea" id="sr-t-' + j + '-' + k + '" data-bg="' + k + '" rows="' + (isi ? 7 : k === 'salam' ? 1 : 3) + '"' + (k === 'salam' ? ' style="min-height:44px"' : '') + ' maxlength="' + (isi ? 3000 : 1500) + '">' + esc(isiSuratLokal(T[j][k])) + '</textarea></div>';
    }).join('');
  };
  const m = openModal({
    title: 'Buat surat untuk orang tua', sub: P.or.s.nama_murid + ' · ' + (P.or.s.kelas || ''), size: 'lg',
    body: '<form id="f-sr" class="form-grid" novalidate>' + fld({ name: 'jenis', label: 'Jenis surat', type: 'select', req: true, value: 'panggilan', opts: J }) +
      '<div data-j="panggilan" class="form-grid"><div class="form-grid c2">' + fld({ name: 'tanggal_pertemuan', label: 'Tanggal pertemuan', type: 'date', min: S.today, value: addD(S.today, 3) }) + fld({ name: 'jam', label: 'Pukul', max: 20, value: '09.00 WIB' }) + '</div>' +
      fld({ name: 'tempat', label: 'Tempat', max: 120, value: 'Ruang BK' }) + fld({ name: 'keperluan', id: 'sr_kep_p', label: 'Keperluan', type: 'textarea', rows: 2, max: 400, value: 'Diskusi perkembangan dan pendampingan ananda' }) + '</div>' +
      '<div data-j="pemberitahuan" class="form-grid hide">' + fld({ name: 'perihal', label: 'Perihal', max: 100, ph: 'Contoh: Pemberitahuan ketidakhadiran ananda' }) + '</div>' +
      '<div data-j="konseling" class="form-grid hide">' + fld({ name: 'ket_konseling', label: 'Keterangan tambahan (opsional)', type: 'textarea', rows: 2, max: 400, hint: 'Jangan menuliskan isi permasalahan yang bersifat rahasia.' }) + '</div></form>' +
      '<div class="sr-kal mt-16"><div class="row between wrap" style="gap:8px"><div><b>Kalimat surat</b><div class="xs muted">Terisi dari templat sekolah. Ubah seperlunya untuk surat ini saja. Tanda {…} diisi otomatis.</div></div><button class="btn sm ghost" type="button" id="sr-reset"><i class="bi bi-arrow-counterclockwise"></i> Kembalikan ke templat</button></div>' +
      J.map(function (x) { return '<div class="form-grid mt-12' + (x.v === 'panggilan' ? '' : ' hide') + '" data-jk="' + x.v + '">' + kalimat(x.v) + '</div>'; }).join('') + '</div>' +
      '<div class="xs muted mt-12">Kop, nomor, dan tanda tangan mengikuti Administrasi → Surat &amp; Cetak. <b>Pratinjau</b> tidak memakai nomor surat; nomor resmi diberikan saat <b>Terbitkan</b>.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn" id="sr-prev"><i class="bi bi-eye"></i> Pratinjau</button><button class="btn primary" id="sr-ok"><i class="bi bi-file-earmark-check"></i> Terbitkan</button>'
  });
  const f = $('#f-sr', m.el);
  const jenis = function () { return $('[name=jenis]', f).value; };
  $('[name=jenis]', f).addEventListener('change', function (e) {
    $$('[data-j]', f).forEach(function (x) { x.classList.toggle('hide', x.dataset.j !== e.target.value); });
    $$('[data-jk]', m.el).forEach(function (x) { x.classList.toggle('hide', x.dataset.jk !== e.target.value); });
  });
  $('#sr-reset', m.el).addEventListener('click', function () {
    const j = jenis();
    $$('[data-jk="' + j + '"] [data-bg]', m.el).forEach(function (ta) { ta.value = isiSuratLokal(T[j][ta.dataset.bg]); });
    toast('Kalimat dikembalikan ke templat sekolah.');
  });
  const kumpul = function () {
    const d = formData(f), j = d.jenis;
    const rules = j === 'panggilan' ? { tanggal_pertemuan: { label: 'Tanggal', req: true }, jam: { label: 'Pukul', req: true }, tempat: { label: 'Tempat', req: true }, keperluan: { label: 'Keperluan', req: true, min: 5 } } : j === 'pemberitahuan' ? { perihal: { label: 'Perihal', req: true } } : {};
    if (!validate(f, d, rules)) return null;
    const teks = {};
    $$('[data-jk="' + j + '"] [data-bg]', m.el).forEach(function (ta) { teks[ta.dataset.bg] = ta.value.trim(); });
    if (j === 'pemberitahuan') {
      const ta = $('[data-jk="pemberitahuan"] [data-bg="isi"]', m.el);
      if (teks.isi.length < 10 || /\.\.\./.test(teks.isi)) { toast(teks.isi.length < 10 ? 'Isi surat wajib diisi.' : 'Lengkapi bagian "..." pada isi surat.', 'warn'); ta.focus(); return null; }
    }
    const p = { jenis: j, id_murid: P.or.id, teks: teks };
    if (P.or.kasus) p.id_kasus = P.or.kasus;
    if (j === 'panggilan') Object.assign(p, { tanggal_pertemuan: d.tanggal_pertemuan, jam: d.jam, tempat: d.tempat, keperluan: d.keperluan });
    else if (j === 'pemberitahuan') Object.assign(p, { perihal: d.perihal });
    else p.keperluan = d.ket_konseling || '';
    return p;
  };
  const terbit = function (btn, pv) {
    const p = kumpul(); if (!p) return;
    run(btn, api('ortu.surat', p)).then(function (r) {
      if (pv) pv.close();
      m.close(); toast('Surat ' + r.nomor + ' diterbitkan.');
      apiC('ortu.riwayat', { id_murid: P.or.id }).then(function (rw) { P.or.rw = rw; orHist(); });
      previewFile({ nama: r.nama, mime: r.mime, base64: r.base64, blok: r.blok });
    }).catch(fail);
  };
  $('#sr-ok', m.el).addEventListener('click', function (e) { terbit(e.currentTarget); });
  $('#sr-prev', m.el).addEventListener('click', function (e) {
    const p = kumpul(); if (!p) return;
    run(e.currentTarget, api('ortu.suratPratinjau', p)).then(function (r) {
      const pv = openModal({
        title: 'Pratinjau surat', sub: 'Nomor ' + r.nomor + ' masih sementara · belum tersimpan', size: 'lg',
        body: '<div class="preview doc" id="sp-body">' + renderBlokHtml(r.blok) + '</div>',
        foot: '<button class="btn" data-close><i class="bi bi-pencil"></i> Kembali menyunting</button><button class="btn primary" id="sp-ok"><i class="bi bi-file-earmark-check"></i> Terbitkan</button>'
      });
      fitPaper(pv.el); setTimeout(function () { fitPaper(pv.el); }, 150);
      $('#sp-ok', pv.el).addEventListener('click', function (ev) { terbit(ev.currentTarget, pv); });
    }).catch(fail);
  });
}

// ════════════════════════════════════════════════════════════
// Laporan & Rekap (F11)
// ════════════════════════════════════════════════════════════
PAGES.laporan = function (params, tok) {
  const to = S.today, from = addD(to, -29);
  P.lp = { dari: from, sampai: to, id_kelas: '', id_mapel: '', kategori: '', status: '' };
  $('#app-container').innerHTML = pageHead('Pelaporan', 'Laporan & Rekap', hasAny(['kepsek', 'admin']) && !hasAny(['guru_bk', 'waka', 'wali_kelas', 'guru_mapel']) ? 'Ringkasan agregat tanpa nama murid.' : 'Rekap kehadiran dan kasus sesuai hak akses Anda.', '<button class="btn" data-act="lp-csv"><i class="bi bi-filetype-csv"></i> Ekspor CSV</button><button class="btn primary" data-act="lp-pdf"><i class="bi bi-file-earmark-pdf"></i> Unduh PDF</button>') +
    '<div class="card pad"><form id="f-lp" class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
    fld({ name: 'dari', label: 'Dari', type: 'date', value: from, maxv: to }) + fld({ name: 'sampai', label: 'Sampai', type: 'date', value: to, maxv: to }) +
    fld({ name: 'id_kelas', label: 'Kelas', type: 'select', blank: 'Semua kelas', opts: kelasOpts() }) + fld({ name: 'id_mapel', label: 'Mata pelajaran', type: 'select', blank: 'Semua mapel', opts: S.refs.mapel.map(function (m) { return { v: m.id, l: m.nama }; }) }) + fld({ name: 'kategori', label: 'Kategori', type: 'select', blank: 'Semua', opts: S.refs.kejadian }) + fld({ name: 'status', label: 'Status kasus', type: 'select', blank: 'Semua', opts: S.refs.statusKasus }) +
    '<div class="field"><label>&nbsp;</label><button class="btn dark" type="submit"><i class="bi bi-funnel"></i> Terapkan</button></div></form></div><div id="lp-body" class="mt-16"></div>';
  $('#f-lp').addEventListener('submit', function (e) { e.preventDefault(); lpLoad(); });
  return lpLoad(tok);
};
function lpParams() { const f = $('#f-lp'); const d = formData(f); P.lp = d; return d; }
function lpLoad(tok) {
  const d = lpParams();
  if (d.dari && d.sampai && d.dari > d.sampai) { toast('Tanggal awal tidak boleh setelah tanggal akhir.', 'err'); return Promise.resolve(); }
  $('#lp-body').innerHTML = skeleton(3);
  return apiC('laporan.rekap', d).then(function (r) {
    if (tok !== undefined && stale(tok)) return;
    P.lpd = r;
    // Pilihan mapel disesuaikan dengan data yang boleh dilihat (guru mapel: mapel yang ia ajar).
    const selM = $('#f-lp [name=id_mapel]');
    if (selM && r.pilihanMapel) {
      const v = selM.value;
      selM.innerHTML = '<option value="">Semua mapel</option>' + r.pilihanMapel.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === v ? ' selected' : '') + '>' + esc(m.nama) + '</option>'; }).join('');
    }
    const k = r.ringkas, st = r.status;
    let h = '<div class="grid g-kpi k5" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      [['teal', 'bi-calendar-check', 'Masuk sekolah (harian)', k.hadirHarian === null || k.hadirHarian === undefined ? '-' : k.hadirHarian + '%', (r.harian ? r.harian.catatan : 0) + ' catatan harian'], ['blue', 'bi-person-check', (P.lp.id_mapel ? 'Hadir · ' + ((r.pilihanMapel || []).filter(function (m) { return m.id === P.lp.id_mapel; })[0] || { nama: 'mapel' }).nama : 'Hadir (semua mapel)'), k.hadir + '%', k.catatan + ' catatan'], ['rose', 'bi-x-octagon', 'Alpa', k.alpa, 'catatan'], ['indigo', 'bi-folder2-open', 'Kasus pada periode', k.kasus, k.aktif + ' aktif'], ['purple', 'bi-check2-circle', 'Selesai', k.selesai, k.kasus ? Math.round(k.selesai * 100 / k.kasus) + '% dari kasus' : '-'], ['amber', 'bi-radar', 'Pola ditandai', r.pola.ringkas.kritis + r.pola.ringkas.perhatian + r.pola.ringkas.pantau, r.pola.ringkas.kritis + ' kritis']].map(function (x) {
        return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
      }).join('') + '</div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Tren kehadiran (%)</h3></div><div class="card-body"><div class="chart-box"><canvas id="ch-tren"></canvas></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>Status kehadiran</h3></div><div class="card-body"><div class="chart-box"><canvas id="ch-st"></canvas></div><div class="legend mt-12">' + ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<div><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + '<b>' + st[s] + '</b></div>'; }).join('') + '</div></div></div></div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Kasus per kategori</h3></div><div class="card-body">' + (r.kategori.length ? '<div class="chart-box sm"><canvas id="ch-kat"></canvas></div>' : empty('bi-bar-chart', 'Tidak ada kasus pada periode ini')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Kehadiran per kelas' + (P.lp.id_mapel ? ' (mapel terpilih)' : ' (semua mapel)') + '</h3></div>' + (r.kelas.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:380px"><thead><tr><th>Kelas</th><th>Catatan</th><th>Kehadiran</th><th>Alpa</th></tr></thead><tbody>' + r.kelas.map(function (x) { return '<tr><td class="fw6">' + esc(x.kelas) + '</td><td>' + x.catatan + '</td><td>' + x.hadir + '%</td><td' + (x.alpa ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + x.alpa + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-table', 'Belum ada data absensi')) + '</div></div></div>';
    if (r.perMapel && r.perMapel.length) h += '<div class="card mt-16"><div class="card-head"><div><h3>Kehadiran per mata pelajaran</h3><div class="xs muted">' + (P.lp.id_mapel ? 'Mapel terpilih' : r.perMapel.length > 1 ? 'Setiap mapel dihitung terpisah' : 'Absensi mapel pada periode ini') + '</div></div></div><div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Mata pelajaran</th><th>Catatan</th><th>Kehadiran</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Terlambat</th></tr></thead><tbody>' +
      r.perMapel.map(function (x) { return '<tr><td class="fw6">' + esc(x.mapel) + '</td><td>' + x.catatan + '</td><td class="fw6">' + x.hadir + '%</td><td>' + x.S + '</td><td>' + x.I + '</td><td' + (x.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + x.A + '</td><td>' + x.T + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    if (r.harian && r.harian.kelas.length) h += '<div class="card mt-16"><div class="card-head"><div><h3>Absensi harian per kelas</h3><div class="xs muted">Kehadiran masuk sekolah pada periode ini</div></div></div><div class="tbl-wrap" style="margin-top:12px"><table class="tbl" style="min-width:480px"><thead><tr><th>Kelas</th><th>Hari tercatat</th><th>Kehadiran</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Terlambat</th></tr></thead><tbody>' + r.harian.kelas.map(function (x) { return '<tr><td class="fw6">' + esc(x.kelas) + '</td><td>' + x.hari + '</td><td>' + x.hadir + '%</td><td>' + x.S + '</td><td>' + x.I + '</td><td' + (x.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + x.A + '</td><td>' + x.T + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    h += '<div class="card mt-16"><div class="card-head"><div><h3>Status penanganan kasus</h3></div></div><div class="card-body"><div class="row wrap">' + r.statusKasus.map(function (s) { return chipStatusT(s.nama, s.nama + ' · ' + s.jumlah); }).join('') + '</div></div></div>';
    if (!r.agregat) {
      h += '<div class="card mt-16"><div class="card-head"><h3>Daftar kasus (' + r.kasusTotal + ')</h3></div>' + (r.kasusDaftar.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Tanggal</th><th>Murid</th><th>Kelas</th><th>Kategori</th><th>Urgensi</th><th>Status</th></tr></thead><tbody>' + r.kasusDaftar.map(function (x) { return '<tr><td class="mono">' + esc(x.kode) + '</td><td>' + esc(fTgl(x.tanggal)) + '</td><td class="fw6">' + esc(x.murid) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(x.kategori) + '</td><td>' + chipUrg(x.urgensi) + '</td><td>' + chipStatus(x.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-inbox', 'Tidak ada kasus pada periode ini') + '</div>') + '</div>';
      if (r.pola.daftar.length) h += '<div class="card mt-16"><div class="card-head"><h3>Murid dengan pola kehadiran</h3></div><div style="margin-top:8px">' + r.pola.daftar.map(function (x) { return '<div class="pola-item"><div class="row between wrap"><div><b>' + esc(x.nama) + '</b> <span class="xs muted">' + esc(x.kelas) + '</span></div>' + chipLevel(x.level) + '</div><div class="xs muted-2">' + esc(x.deskripsi) + '</div></div>'; }).join('') + '</div></div>';
    } else {
      h += '<div class="note info mt-16"><i class="bi bi-shield-check"></i><div>Tampilan agregat: nama murid dan isi kasus tidak ditampilkan untuk peran ini.</div></div>';
    }
    $('#lp-body').innerHTML = h;
    chart('ch-tren', { kind: 'line', labels: r.tren.labels, data: r.tren.data, color: '#0D9488', min: 0, max: 100, label: 'Tren kehadiran' });
    chart('ch-st', { kind: 'donut', labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'], data: ['H', 'S', 'I', 'A', 'T'].map(function (s) { return st[s]; }), colors: ['H', 'S', 'I', 'A', 'T'].map(function (s) { return ST_COL[s]; }), sub: 'catatan', label: 'Status kehadiran' });
    if (r.kategori.length) chart('ch-kat', { kind: 'hbar', labels: r.kategori.map(function (x) { return x.nama; }), data: r.kategori.map(function (x) { return x.jumlah; }), colors: KAT_COL, label: 'Kasus per kategori' });
  }).catch(function (e) { isiHtml('#lp-body', errBox(e, true)); });
}
ACT['lp-pdf'] = function (el) {
  const d = lpParams();
  run(el, api('laporan.pdf', d)).then(function (f) { previewFile({ nama: f.nama, mime: f.mime, base64: f.base64, blok: f.blok }); }).catch(fail);
};
function csvCell(v) { v = String(v === null || v === undefined ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
ACT['lp-csv'] = function () {
  const r = P.lpd; if (!r) return;
  const rows = [['Periode', r.periode.dari + ' s.d. ' + r.periode.sampai], [], ['Indikator', 'Nilai'], ['Kehadiran harian (%)', r.harian && r.harian.catatan ? r.harian.hadir : ''], ['Kehadiran per mapel (%)', r.ringkas.hadir], ['Alpa', r.ringkas.alpa], ['Kasus', r.ringkas.kasus], ['Selesai', r.ringkas.selesai], [], ['Kelas', 'Catatan', 'Kehadiran (%)', 'Alpa']]
    .concat(r.kelas.map(function (k) { return [k.kelas, k.catatan, k.hadir, k.alpa]; }))
    .concat(r.perMapel && r.perMapel.length ? [[], ['Mata pelajaran', 'Catatan', 'Kehadiran (%)', 'Sakit', 'Izin', 'Alpa', 'Terlambat']].concat(r.perMapel.map(function (x) { return [x.mapel, x.catatan, x.hadir, x.S, x.I, x.A, x.T]; })) : [])
    .concat(r.harian && r.harian.kelas.length ? [[], ['Absensi harian: kelas', 'Hari tercatat', 'Kehadiran (%)', 'Sakit', 'Izin', 'Alpa', 'Terlambat']].concat(r.harian.kelas.map(function (k) { return [k.kelas, k.hari, k.hadir, k.S, k.I, k.A, k.T]; })) : []);
  if (!r.agregat) rows.push([], ['Kode', 'Tanggal', 'Murid', 'Kelas', 'Kategori', 'Urgensi', 'Status']), r.kasusDaftar.forEach(function (k) { rows.push([k.kode, k.tanggal, k.murid, k.kelas, k.kategori, k.urgensi, k.status]); });
  const csv = '﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'rekap_' + r.periode.dari + '_' + r.periode.sampai + '.csv');
  toast('CSV diunduh.');
};

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

'use strict';
// ════════════════════════════════════════════════════════════
// Administrasi → Tahun Ajaran: arsip, kenaikan kelas, tahun ajaran baru
// ════════════════════════════════════════════════════════════
const NAMA_SHEET = { Absensi: 'Catatan absensi', LaporanKejadian: 'Laporan kejadian', PembimbinganAwal: 'Pembinaan awal guru', Rujukan: 'Rujukan', LayananBK: 'Layanan konseling', Monitoring: 'Tindak lanjut', KomunikasiOrtu: 'Komunikasi orang tua', InstrumenJawab: 'Jawaban instrumen', LogAktivitas: 'Log aktivitas' };
function adTahun() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('arsip.ringkasan').then(function (r) {
    P.ar = r;
    const sa = r.saran;
    let h = '';
    if (sa.perlu) {
      h += '<div class="note info mb-16"><i class="bi bi-calendar-event"></i><div><b>Kalender menunjukkan tahun ajaran ' + esc(sa.tahun_ajaran) + ' semester ' + esc(sa.semester) + '</b>, sedangkan aplikasi masih di ' + esc(sa.sekarang) + '. Ikuti tiga langkah di bawah (urutannya penting).</div></div>';
    } else {
      h += '<div class="note info mb-16"><i class="bi bi-check-circle"></i><div>Tahun ajaran aplikasi (<b>' + esc(r.tahun_ajaran) + ' ' + esc(r.semester) + '</b>) sudah sesuai kalender. Gunakan halaman ini saat pergantian semester atau tahun ajaran.</div></div>';
    }
    // Langkah 1
    const rows = Object.keys(r.jumlah).map(function (k) { return '<tr><td>' + esc(NAMA_SHEET[k] || k) + '</td><td style="text-align:right" class="fw6">' + r.jumlah[k] + '</td></tr>'; }).join('');
    h += '<div class="grid g-2 eq"><div class="card pad"><div class="row"><span class="step-n">1</span><div><h3>Arsipkan & bersihkan data</h3><div class="xs muted">Akhir tahun ajaran</div></div></div>' +
      '<p class="muted-2 mt-12" style="margin-top:12px">Seluruh basis data disalin ke folder Drive <b>Arsip</b> (termasuk ringkasan statistik untuk laporan tahunan). Setelah salinan terverifikasi, data transaksi dikosongkan agar aplikasi kembali ringan. Data master (pengguna, kelas, murid, mapel, program & kerangka instrumen) tetap ada.</p>' +
      '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Data yang akan dikosongkan</th><th style="text-align:right">Baris</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<label class="check mt-12"><input type="checkbox" id="ar-bawa" checked> Bawa <b>' + r.kasusAktif + '</b> kasus yang belum selesai (beserta rujukan, layanan, tindak lanjut) ke tahun ajaran baru</label>' +
      '<div class="note mt-12"><i class="bi bi-exclamation-triangle"></i><div class="xs">Kode kasus yang dibawa akan dinomori ulang. Berkas di Drive tidak dihapus. Jalankan <b>setelah</b> semua laporan tahun ini selesai dicatat.</div></div>' +
      '<div class="field mt-12" data-f="ar_konf"><label for="ar-konf">Ketik <b>ARSIP</b> untuk melanjutkan</label><input class="input" id="ar-konf" autocomplete="off" placeholder="ARSIP"><div class="err"></div></div>' +
      '<button class="btn dark block mt-12" data-act="ar-jalan"><i class="bi bi-archive"></i> Arsipkan sekarang</button><div id="ar-hasil" class="mt-12"></div></div>';
    // Langkah 2 dan 3
    h += '<div class="col gap-16"><div class="card pad"><div class="row"><span class="step-n">2</span><div><h3>Kenaikan kelas</h3><div class="xs muted">Awal tahun ajaran baru · ' + r.murid + ' murid aktif, ' + r.kelas + ' kelas</div></div></div>' +
      '<p class="muted-2 mt-12" style="margin-top:12px">Aplikasi menyarankan tujuan tiap kelas dari namanya (X → XI → XII → lulus). Anda dapat mengubah tujuan dan menandai murid yang tinggal kelas sebelum menjalankan. Cadangan otomatis dibuat sebelum perubahan.</p>' +
      '<button class="btn block mt-12" data-act="naik-buka"><i class="bi bi-mortarboard"></i> Buka pratinjau kenaikan kelas</button></div>' +
      '<div class="card pad"><div class="row"><span class="step-n">3</span><div><h3>Tahun ajaran & semester baru</h3><div class="xs muted">Berlaku di seluruh aplikasi</div></div></div>' +
      '<form id="f-tb" class="form-grid c2 mt-12" novalidate>' + fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, max: 9, value: sa.tahun_ajaran, hint: 'Format 2026/2027' }) + fld({ name: 'semester', label: 'Semester', type: 'select', value: sa.semester, opts: ['Ganjil', 'Genap'] }) + '</form>' +
      '<div class="col gap-8 mt-12"><label class="check"><input type="checkbox" id="tb-wali"> Kosongkan wali kelas (isi ulang di Administrasi → Kelas)</label><label class="check"><input type="checkbox" id="tb-peng"> Hapus semua penugasan pengampu mapel (isi ulang di Pengampu)</label></div>' +
      '<p class="xs muted mt-12">Untuk pergantian semester saja (Ganjil → Genap), biarkan tahun ajaran dan kosongkan kedua pilihan di atas.</p>' +
      '<button class="btn primary block mt-12" data-act="tb-simpan"><i class="bi bi-calendar-event"></i> Terapkan</button></div></div></div>';
    h += '<div class="card mt-16"><div class="card-head"><div><h3>Riwayat arsip</h3><div class="xs muted">Salinan basis data tiap tahun ajaran (hanya admin yang dapat membukanya)</div></div></div>' +
      (r.arsip.length ? '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Tahun ajaran</th><th>Tanggal</th><th>Kasus dibawa</th><th></th></tr></thead><tbody>' + r.arsip.map(function (a) { return '<tr><td class="fw6">' + esc(a.tahun_ajaran) + ' ' + esc(a.semester) + '</td><td>' + esc(fTgl(a.tanggal)) + '</td><td>' + esc(a.dibawa) + '</td><td style="text-align:right"><a class="btn sm" href="' + esc(a.url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Buka</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('bi-archive', 'Belum ada arsip')) + '</div>';
    $('#ad-body').innerHTML = h;
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
ACT['ar-jalan'] = function (el) {
  const k = $('#ar-konf').value.trim();
  if (k !== 'ARSIP') { setErr($('#ad-body'), 'ar_konf', 'Ketik ARSIP (huruf besar) untuk melanjutkan.'); return; }
  setErr($('#ad-body'), 'ar_konf', '');
  confirmDlg('Seluruh data transaksi tahun ajaran ' + P.ar.tahun_ajaran + ' akan disalin ke arsip lalu dikosongkan dari aplikasi. Tindakan ini tidak dapat dibatalkan dari aplikasi (salinan tetap ada di Drive). Lanjutkan?', 'Ya, arsipkan', true, 'Arsipkan tahun ajaran').then(function (ok) {
    if (!ok) return;
    run(el, api('arsip.jalankan', { konfirmasi: k, bawaAktif: $('#ar-bawa').checked })).then(function (r) {
      toast('Arsip dibuat dan data dibersihkan.');
      adTahun();
      setTimeout(function () {
        openModal({ title: 'Arsip selesai', body: '<div class="note info"><i class="bi bi-check-circle"></i><div>Salinan <b>' + esc(r.nama) + '</b> tersimpan di folder Arsip. ' + r.dibawa + ' kasus aktif dibawa ke tahun ajaran baru.</div></div><a class="btn block mt-12" href="' + esc(r.url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Buka arsip</a><p class="xs muted mt-12">Langkah berikutnya: kenaikan kelas, lalu terapkan tahun ajaran baru.</p>', foot: '<button class="btn" data-close>Tutup</button>' });
      }, 400);
    }).catch(fail);
  });
};

// ── Kenaikan kelas ──
function naikBuka() {
  return apiC('naik.pratinjau', { tingkatAkhir: P.naik ? P.naik.akhir : '' }).then(function (d) {
    const peta = {};
    d.kelas.forEach(function (k) { peta[k.id] = { aksi: k.saran.aksi, ke: k.saran.ke || (k.saran.namaBaru ? '__baru' : ''), namaBaru: k.saran.namaBaru || '', tinggal: {} }; });
    P.naik = { d: d, peta: peta, akhir: d.tingkatAkhir };
    naikGambar();
  });
}
ACT['naik-buka'] = function (el) { run(el, naikBuka()).catch(fail); };
function naikGambar() {
  const n = P.naik, d = n.d;
  const opsiKelas = function (selfId, sel) {
    return d.daftarKelas.filter(function (k) { return k.v !== selfId; }).map(function (k) { return '<option value="' + esc(k.v) + '"' + (sel === k.v ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '<option value="__baru"' + (sel === '__baru' ? ' selected' : '') + '>+ Kelas baru…</option>';
  };
  const rows = d.kelas.map(function (k) {
    const p = n.peta[k.id];
    const tg = Object.keys(p.tinggal).filter(function (x) { return p.tinggal[x]; }).length;
    return '<tr data-k="' + esc(k.id) + '"><td class="fw6">' + esc(k.nama) + '<div class="xs muted">' + k.murid.length + ' murid</div></td>' +
      '<td><select class="select" data-nk="aksi" style="min-height:38px"><option value="pindah"' + (p.aksi === 'pindah' ? ' selected' : '') + '>Naik ke kelas…</option><option value="lulus"' + (p.aksi === 'lulus' ? ' selected' : '') + '>Lulus</option><option value="tetap"' + (p.aksi === 'tetap' ? ' selected' : '') + '>Tetap di kelas ini</option><option value="nonaktif"' + (p.aksi === 'nonaktif' ? ' selected' : '') + '>Nonaktifkan (pindah/keluar)</option></select></td>' +
      '<td>' + (p.aksi === 'pindah' ? '<select class="select" data-nk="ke" style="min-height:38px"><option value="">Pilih…</option>' + opsiKelas(k.id, p.ke) + '</select>' + (p.ke === '__baru' ? '<input class="input mt-8" data-nk="namaBaru" maxlength="30" placeholder="Nama kelas baru" value="' + esc(p.namaBaru) + '" style="min-height:38px">' : '') : '<span class="muted">—</span>') + '</td>' +
      '<td style="text-align:right"><button class="btn sm' + (tg ? ' soft-danger' : '') + '" data-act="naik-tinggal" data-k="' + esc(k.id) + '"' + (k.murid.length ? '' : ' disabled') + '>Tinggal kelas' + (tg ? ' (' + tg + ')' : '') + '</button></td></tr>';
  }).join('');
  const m = openModal({
    title: 'Kenaikan kelas', sub: 'Periksa setiap baris. Kelas tertinggi dianggap lulus.', size: 'xl', sticky: true,
    body: '<div class="row wrap mb-16"><span class="xs muted">Tingkat akhir jenjang:</span><select class="select" id="nk-akhir" style="width:auto;min-height:38px">' + [[6, 'Kelas 6 (SD)'], [9, 'Kelas 9 (SMP)'], [12, 'Kelas 12 (SMA/SMK)']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === n.akhir ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select><span class="xs muted">Diubah → saran dihitung ulang.</span></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="nk-tbl" style="min-width:640px"><thead><tr><th>Kelas asal</th><th>Tindakan</th><th>Tujuan</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="note mt-16"><i class="bi bi-info-circle"></i><div class="xs">Murid yang <b>tinggal kelas</b> tetap di kelas asalnya. Wali kelas dan pengampu tidak berubah di langkah ini (atur di Langkah 3 atau Administrasi). Cadangan otomatis dibuat sebelum perubahan.</div></div>' +
      '<div class="field mt-12" data-f="nk_konf"><label for="nk-konf">Ketik <b>NAIKKAN</b> untuk melanjutkan</label><input class="input" id="nk-konf" autocomplete="off" placeholder="NAIKKAN"><div class="err"></div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="nk-jalan"><i class="bi bi-mortarboard"></i> Jalankan kenaikan kelas</button>'
  });
  P.naik.m = m;
  const tb = $('#nk-tbl', m.el);
  tb.addEventListener('change', function (e) {
    const tr = e.target.closest('tr[data-k]'); if (!tr) return;
    const p = n.peta[tr.dataset.k], f = e.target.dataset.nk;
    if (f === 'aksi') { p.aksi = e.target.value; if (p.aksi === 'pindah' && !p.ke) p.ke = ''; }
    if (f === 'ke') { p.ke = e.target.value; }
    if (f === 'namaBaru') { p.namaBaru = e.target.value; return; }
    keepNaikScroll(m, function () { m.close(); naikGambar(); });
  });
  tb.addEventListener('input', function (e) { const tr = e.target.closest('tr[data-k]'); if (tr && e.target.dataset.nk === 'namaBaru') n.peta[tr.dataset.k].namaBaru = e.target.value; });
  $('#nk-akhir', m.el).addEventListener('change', function (e) { n.akhir = +e.target.value; m.close(); P.naik.d = null; naikBuka().catch(fail); });
  $('#nk-jalan', m.el).addEventListener('click', function (e) {
    if ($('#nk-konf', m.el).value.trim() !== 'NAIKKAN') { setErr(m.el, 'nk_konf', 'Ketik NAIKKAN (huruf besar).'); return; }
    const pemetaan = [];
    for (let i = 0; i < d.kelas.length; i++) {
      const k = d.kelas[i], p = n.peta[k.id];
      if (p.aksi === 'pindah' && !p.ke) { toast('Pilih kelas tujuan untuk ' + k.nama + '.', 'err'); return; }
      if (p.aksi === 'pindah' && p.ke === '__baru' && !p.namaBaru.trim()) { toast('Isi nama kelas baru untuk tujuan ' + k.nama + '.', 'err'); return; }
      pemetaan.push({ dari: k.id, aksi: p.aksi, ke: p.ke === '__baru' ? '' : p.ke, namaBaru: p.ke === '__baru' ? p.namaBaru.trim() : '', tinggal: Object.keys(p.tinggal).filter(function (x) { return p.tinggal[x]; }) });
    }
    confirmDlg('Murid akan dipindahkan sesuai tabel. Proses ini mengubah kelas ' + d.kelas.reduce(function (a, k) { return a + k.murid.length; }, 0) + ' murid aktif. Lanjutkan?', 'Ya, jalankan', false, 'Konfirmasi kenaikan kelas').then(function (ok) {
      if (!ok) return;
      run(e.currentTarget, api('naik.jalankan', { pemetaan: pemetaan, konfirmasi: 'NAIKKAN' })).then(function (r) {
        m.close(); P.naik = null;
        toast(r.naik + ' murid naik, ' + r.lulus + ' lulus, ' + r.tinggal + ' tinggal kelas.');
        return api('boot').then(function (b) { S.refs = b.refs; });
      }).catch(fail);
    });
  });
}
function keepNaikScroll(m, fn) { const sc = $('.m-body', m.el).scrollTop; fn(); const nb = P.naik.m && $('.m-body', P.naik.m.el); if (nb) nb.scrollTop = sc; }
ACT['naik-tinggal'] = function (el) {
  const n = P.naik, k = n.d.kelas.filter(function (x) { return x.id === el.dataset.k; })[0], p = n.peta[k.id];
  const m = openModal({
    title: 'Murid tinggal kelas — ' + k.nama, sub: 'Centang murid yang TIDAK naik / tidak lulus.',
    body: '<div class="col gap-8" style="max-height:50vh;overflow:auto">' + k.murid.map(function (s) { return '<label class="check"><input type="checkbox" value="' + esc(s.id) + '"' + (p.tinggal[s.id] ? ' checked' : '') + '> ' + esc(s.nama) + ' <span class="xs muted">NIS ' + esc(s.nis) + '</span></label>'; }).join('') + '</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" data-ok>Simpan</button>'
  });
  $('[data-ok]', m.el).addEventListener('click', function () {
    p.tinggal = {}; $$('input:checked', m.el).forEach(function (i) { p.tinggal[i.value] = true; });
    m.close(); const top = P.naik.m; keepNaikScroll(top, function () { top.close(); naikGambar(); });
  });
};
ACT['tb-simpan'] = function (el) {
  const f = $('#f-tb'), d = formData(f);
  if (!validate(f, d, { tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' } })) return;
  confirmDlg('Tahun ajaran ' + d.tahun_ajaran + ' semester ' + d.semester + ' akan diterapkan ke seluruh kelas' + ($('#tb-peng').checked ? ', dan semua penugasan pengampu dihapus' : '') + '. Lanjutkan?', 'Terapkan', false, 'Tahun ajaran baru').then(function (ok) {
    if (!ok) return;
    run(el, api('tahun.baru', { tahun_ajaran: d.tahun_ajaran, semester: d.semester, kosongkanWali: $('#tb-wali').checked, kosongkanPengampu: $('#tb-peng').checked })).then(function () {
      toast('Tahun ajaran diperbarui.');
      return api('boot').then(function (b) { S.cfg = b.config; S.refs = b.refs; S.saranTA = b.saranTA; renderShell(); setNavActive('admin'); adTahun(); });
    }).catch(fail);
  });
};

// ── Pengaturan: gerbang WhatsApp otomatis ──
function waCardHtml(wa) {
  return '<div class="card pad" id="wa-card"><h3><i class="bi bi-whatsapp" style="color:#16A34A"></i> Pemberitahuan WhatsApp</h3>' +
    '<p class="muted mt-8" style="margin-top:4px">Tanpa pengaturan ini, setiap aksi yang perlu diketahui rekan kerja menampilkan tombol <b>WhatsApp</b> siap kirim (pengirim menekan kirim sendiri). Bila Anda memakai layanan gerbang WhatsApp berbayar (mis. Fonnte), pesan dapat dikirim otomatis.</p>' +
    '<form id="f-wa" class="form-grid mt-12" novalidate>' + fld({ name: 'aktif', label: 'Pengiriman otomatis', type: 'select', value: wa.aktif ? '1' : '0', opts: [{ v: '0', l: 'Nonaktif (tombol WhatsApp manual)' }, { v: '1', l: 'Aktif (kirim otomatis lewat gerbang)' }] }) +
    fld({ name: 'url', label: 'URL gerbang', type: 'url', max: 200, value: wa.url, hint: 'Bawaan: https://api.fonnte.com/send' }) +
    fld({ name: 'token', label: 'Token gerbang', type: 'password', max: 200, ac: 'off', ph: wa.adaToken ? '•••••• (tersimpan; kosongkan bila tidak diubah)' : 'Tempel token dari penyedia', hint: 'Disimpan aman di server, tidak pernah ditampilkan kembali.' }) + '</form>' +
    '<div class="row wrap mt-12"><button class="btn primary" data-act="wa-simpan"><i class="bi bi-check-lg"></i> Simpan</button><button class="btn" data-act="wa-uji"><i class="bi bi-send"></i> Kirim uji ke nomor saya</button></div>' +
    '<p class="xs muted mt-12">Isi nomor WhatsApp tiap pengguna di Administrasi → Pengguna. Pesan tidak memuat nama murid.</p></div>';
}
ACT['wa-simpan'] = function (el) {
  const f = $('#f-wa'), d = formData(f);
  if (d.url && !/^https:\/\/\S+$/i.test(d.url)) { setErr(f, 'url', 'URL harus diawali https://'); return; }
  setErr(f, 'url', '');
  if (d.aktif === '1' && !d.token && !(P.waAda)) { setErr(f, 'token', 'Token wajib diisi untuk mengaktifkan.'); return; }
  run(el, api('admin.waSimpan', { aktif: d.aktif === '1', url: d.url, token: d.token })).then(function (r) { P.waAda = r.adaToken; toast(r.aktif ? 'Pengiriman otomatis aktif.' : 'Pengaturan WhatsApp disimpan.'); $('[name=token]', f).value = ''; }).catch(fail);
};
ACT['wa-uji'] = function (el) { run(el, api('admin.waUji')).then(function () { toast('Pesan uji dikirim. Periksa WhatsApp Anda.'); }).catch(fail); };

'use strict';
// ════════════════════════════════════════════════════════════
// Program BK: program layanan tahunan (dapat disunting) + rekap tahunan
// ════════════════════════════════════════════════════════════
const BLN_PNJ = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const COL_BIDANG = { Pribadi: '#4F46E5', Sosial: '#0D9488', Belajar: '#F59E0B', Karier: '#8B5CF6', Umum: '#64748B' };
PAGES.program = function (params, tok) {
  P.pg = { tab: params.tab || 'program', arsip: '', tampil: (P.pg && P.pg.tampil) || 'daftar' };
  const bk = hasRole('guru_bk');
  $('#app-container').innerHTML = pageHead('Program layanan BK', 'Program BK', bk ? 'Analisis kebutuhan → susun kegiatan tahunan & semesteran → RPL → catat pelaksanaan → laporan. Semua dokumen dicetak dari satu tombol.' : 'Rencana dan realisasi program layanan BK (tampilan baca).',
    '<button class="btn primary" data-act="pg-dok"><i class="bi bi-printer"></i> Cetak dokumen program</button>') +
    '<div class="tabs mb-16" id="pg-tabs">' + [['kebutuhan', 'bi-clipboard-data', 'Analisis kebutuhan'], ['program', 'bi-journal-check', 'Program tahunan & semester'], ['rekap', 'bi-graph-up-arrow', 'Rekap & laporan']].map(function (t) {
      return '<button class="tab ' + (P.pg.tab === t[0] ? 'active' : '') + '" data-act="pg-tab" data-t="' + t[0] + '"><i class="bi ' + t[1] + '"></i> ' + t[2] + '</button>';
    }).join('') + '</div><div id="pg-body"></div>';
  return pgDraw();
};
ACT['pg-tab'] = function (el) {
  P.pg.tab = el.dataset.t;
  $$('#pg-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  pgDraw();
};
function pgDraw() { return P.pg.tab === 'rekap' ? pgRekap() : P.pg.tab === 'kebutuhan' ? pgKebutuhan() : pgProgram(); }
const BLN_TA = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
function semBulan(sem) { return sem === 'Genap' ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]; }
/** Minggu pelaksanaan: yang ditetapkan Guru BK, atau perkiraan (minggu ke-2) bila belum diisi. */
function pgMinggu(x) { return x.minggu && x.minggu.length ? { m: x.minggu, kira: false } : { m: x.bulan ? [2] : [], kira: true }; }

// ── Analisis kebutuhan ──
function pgKebutuhan() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('program.kebutuhan').then(function (d) {
    if (P.pg.tab !== 'kebutuhan' || !$('#pg-body')) return;
    P.pg.kb = d;
    const ubah = hasRole('guru_bk');
    let h = '<div class="note info mb-16"><i class="bi bi-lightbulb"></i><div>Kebutuhan dihitung dari instrumen yang sudah diisi minimal 3 murid (AKPD, angket kebutuhan, kesejahteraan, kebiasaan belajar, gaya belajar, minat karier). Usulan kegiatan bersifat <b>perkiraan</b>: periksa, lalu tambahkan ke program dan sesuaikan.</div></div>';
    if (!d.instrumen.length) {
      $('#pg-body').innerHTML = h + '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada data instrumen', 'Laksanakan AKPD atau angket kebutuhan lebih dulu (menu Instrumen BK). Program tetap dapat disusun dari contoh.') + '<div style="text-align:center"><button class="btn" data-act="nav" data-page="instrumen"><i class="bi bi-clipboard-data"></i> Buka Instrumen BK</button></div></div>';
      return;
    }
    h += '<div class="card mb-16"><div class="card-head"><h3>Usulan kegiatan program</h3><span class="xs muted">diurutkan dari prioritas tertinggi</span></div>' + (d.usulan.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Prioritas</th><th>Usulan kegiatan</th><th>Bidang · komponen</th><th>Dasar kebutuhan</th><th style="text-align:right"></th></tr></thead><tbody>' + d.usulan.map(function (x, i) {
      return '<tr><td><span class="chip ' + (x.tingkat === 'Tinggi' ? 'st-Eskalasi' : x.tingkat === 'Sedang' ? 'st-Baru' : 'neutral') + '">' + x.tingkat + '</span></td><td class="fw6">' + esc(x.topik) + '</td><td class="xs">' + esc(x.bidang) + '<br><span class="muted">' + esc(x.layanan) + '</span></td><td class="xs muted-2">' + esc(x.dasar) + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (x.sudah ? '<span class="chip st-Selesai"><i class="bi bi-check2"></i> Sudah di program</span>' : ubah ? '<button class="btn sm primary" data-act="pg-usul" data-i="' + i + '"><i class="bi bi-plus-lg"></i> Tambahkan</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body muted">Belum ada aspek yang menonjol.</div>') + '</div>';
    h += '<div class="grid g-2">' + d.instrumen.map(function (ins) {
      return '<div class="card pad"><div class="row between wrap"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[ins.jenis] || 'var(--text-3)') + '">' + esc(ins.jenis) + '</span><span class="xs muted">' + ins.responden + '/' + ins.target + ' murid</span></div><h3 class="mt-8" style="margin-top:8px">' + esc(ins.judul) + '</h3>' +
        (ins.dominan ? ins.dominan.map(function (x) { return hbar(x.kelompok, x.persen, x.persen + '%', 'var(--indigo)', 'dominan'); }).join('') :
          ins.kelompok.slice().sort(function (a, b) { return (b.skor || 0) - (a.skor || 0); }).map(function (g) { return hbar(g.kelompok, g.skor || 0, (g.persenPerlu ? g.persenPerlu + '% perlu' : (g.skor || 0) + '%'), g.persenPerlu >= 25 ? 'var(--rose)' : 'var(--amber)', ins.tafsir === 'kekuatan' ? 'skor terbalik' : ''); }).join('')) + '</div>';
    }).join('') + '</div>';
    $('#pg-body').innerHTML = h;
  }).catch(function (e) { isiHtml('#pg-body', errBox(e)); });
}
ACT['pg-usul'] = function (el) {
  const x = P.pg.kb.usulan[+el.dataset.i];
  const go = function () { pgForm(null, { bidang: x.bidang, layanan: x.layanan, topik: x.topik, dasar: x.dasar, sasaran: 'Semua kelas', target: 1 }); };
  if (P.pg.d) go(); else apiC('program.daftar').then(function (r) { P.pg.d = r; go(); }).catch(fail);
};

// ── Program tahunan & semester ──
function pgProgram() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('program.daftar').then(function (r) {
    if (P.pg.tab !== 'program' || !$('#pg-body')) return;
    P.pg.d = r;
    const ubah = r.bolehUbah;
    const tot = r.rows.reduce(function (a, x) { a.t += x.target; a.r += Math.min(x.total, x.target || x.total); a.l += x.tercatat; return a; }, { t: 0, r: 0, l: 0 });
    let h = '<div class="grid g-kpi k4">' + [
      ['indigo', 'bi-journal-check', 'Kegiatan Program', r.rows.length, 'tahun ajaran ' + r.tahun_ajaran],
      ['teal', 'bi-graph-up-arrow', 'Capaian Target', (tot.t ? Math.round(tot.r * 100 / tot.t) : 0) + '%', tot.r + ' dari ' + tot.t + ' pelaksanaan'],
      ['blue', 'bi-file-earmark-text', 'RPL Siap', r.rows.filter(function (x) { return x.adaRpl; }).length, 'dari ' + r.rows.filter(pgPerluRpl).length + ' kegiatan klasikal/kelompok'],
      ['amber', 'bi-check2-circle', 'Kegiatan Terlaksana', r.rows.filter(function (x) { return x.status === 'Terlaksana'; }).length, 'mencapai target']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div><h3>Program layanan BK ' + esc(r.tahun_ajaran) + '</h3><div class="xs muted">' + (ubah ? 'Tekan <b>Catat</b> setelah kegiatan dilakukan: layanan tercatat dan realisasi bertambah otomatis.' : 'Ketuk kegiatan untuk melihat pelaksanaannya.') + '</div></div>' +
      '<div class="row wrap" style="gap:8px"><div class="seg-lg" id="pg-tampil"><button class="' + (P.pg.tampil === 'daftar' ? 'on' : '') + '" data-act="pg-tampil" data-v="daftar"><i class="bi bi-list-check"></i> Daftar</button><button class="' + (P.pg.tampil === 'kalender' ? 'on' : '') + '" data-act="pg-tampil" data-v="kalender"><i class="bi bi-calendar-check"></i> Kalender</button></div>' +
      (ubah ? '<button class="btn" data-act="pg-narasi" title="Rasional, tujuan, dan evaluasi pada dokumen program"><i class="bi bi-pencil"></i> Narasi dokumen</button><button class="btn primary" data-act="pg-baru"><i class="bi bi-plus-lg"></i> Tambah kegiatan</button>' : '') + '</div></div>';
    if (!r.rows.length) {
      h += empty('bi-journal-check', 'Belum ada program', ubah ? 'Mulai dari Analisis kebutuhan, dari contoh program (dapat diedit seluruhnya), atau tambahkan sendiri.' : 'Guru BK belum menyusun program.') + (ubah ? '<div class="row" style="justify-content:center;padding-bottom:16px"><button class="btn" data-act="pg-tab-kb"><i class="bi bi-clipboard-data"></i> Lihat analisis kebutuhan</button><button class="btn dark" data-act="pg-contoh"><i class="bi bi-stars"></i> Isi dari contoh</button></div>' : '');
    } else if (P.pg.tampil === 'kalender') {
      h += '<div class="card-body">' + ['Ganjil', 'Genap'].map(function (sem) { return pgKalender(r.rows, sem, false); }).join('') + '<div class="xs muted mt-8">● minggu yang ditetapkan · ○ perkiraan (minggu ke-2), atur di Ubah kegiatan → Minggu pelaksanaan. Sesuaikan dengan kalender pendidikan sekolah.</div></div>';
    } else {
      ['Ganjil', 'Genap'].forEach(function (sem) {
        const rows = r.rows.filter(function (x) { return x.semester === sem; });
        if (!rows.length) return;
        h += '<div class="pg-sem">Semester ' + sem + '</div><div class="tbl-wrap"><table class="tbl" style="min-width:860px"><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Waktu</th><th style="min-width:160px">Realisasi / target</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' + rows.map(function (x) {
          const mg = pgMinggu(x);
          return '<tr><td><span class="chip" style="background:' + COL_BIDANG[x.bidang] + '22;color:' + COL_BIDANG[x.bidang] + '">' + esc(x.bidang) + '</span></td><td class="click" data-act="pg-detail" data-id="' + esc(x.id) + '" style="cursor:pointer"><div class="fw6">' + esc(x.topik) + '</div><div class="xs muted">' + esc(x.layanan) + (x.sasaran ? ' · ' + esc(x.sasaran) : '') + '</div>' + (x.jurus ? '<span class="chip gold mt-4"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + '</td>' +
            '<td class="xs">' + (x.bulan ? esc(BLN_PNJ[x.bulan - 1]) + (mg.m.length ? '<br><span class="' + (mg.kira ? 'muted' : '') + '">minggu ke-' + mg.m.join(', ') + (mg.kira ? ' (perkiraan)' : '') + '</span>' : '') : '<span class="muted">Fleksibel</span>') + '</td>' +
            '<td><div class="row"><div class="bar grow"><i style="width:' + x.persen + '%"></i></div><b>' + x.total + '/' + x.target + '</b></div><div class="xs muted">' + (x.tercatat ? x.tercatat + ' dari layanan' + (x.murid ? ' · ' + x.murid + ' murid' : '') : 'belum ada layanan tercatat') + (x.realisasi ? ' · +' + x.realisasi + ' manual' : '') + '</div></td>' +
            '<td>' + chipStatusT(x.status === 'Terlaksana' ? 'Selesai' : x.status === 'Berjalan' ? 'Diproses' : x.status === 'Tidak terlaksana' ? 'Eskalasi' : 'Baru', x.status) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' + (ubah ? '<button class="btn sm primary" data-act="pg-catat" data-id="' + esc(x.id) + '" title="Catat pelaksanaan sebagai layanan BK"><i class="bi bi-plus-lg"></i> Catat</button> ' + (pgPerluRpl(x) ? '<button class="btn sm' + (x.adaRpl ? '' : ' soft-amber') + '" data-act="pg-rpl" data-id="' + esc(x.id) + '" title="Rencana Pelaksanaan Layanan"><i class="bi bi-file-earmark-text"></i> RPL' + (x.adaRpl ? '' : ' (draf)') + '</button> ' : '') + '<button class="btn sm" data-act="pg-edit" data-id="' + esc(x.id) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button> <button class="btn sm soft-danger" data-act="pg-hapus" data-id="' + esc(x.id) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button>' : '<button class="btn sm" data-act="pg-detail" data-id="' + esc(x.id) + '">Rincian</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      });
    }
    $('#pg-body').innerHTML = h + '</div>';
  }).catch(function (e) { isiHtml('#pg-body', errBox(e)); });
}
function pgPerluRpl(x) { return /Klasikal|Orientasi|Kelompok|Perencanaan/.test(x.layanan); }
ACT['pg-tampil'] = function (el) { P.pg.tampil = el.dataset.v; pgProgram(); };
ACT['pg-tab-kb'] = function () { const t = $('#pg-tabs [data-t=kebutuhan]'); if (t) ACT['pg-tab'](t); };
/** Matriks semester: kegiatan × bulan × minggu (dipakai di layar dan dokumen cetak). */
function pgKalender(rows, sem, cetak) {
  const bl = semBulan(sem), rs = rows.filter(function (x) { return x.semester === sem; });
  if (!rs.length) return '';
  const cls = cetak ? 'pr-tbl pr-mini' : 'tbl kal-tbl';
  return '<div class="' + (cetak ? '' : 'pg-sem') + '"' + (cetak ? '' : '') + '>' + (cetak ? '' : 'Semester ' + sem) + '</div><div class="' + (cetak ? '' : 'tbl-wrap') + '"><table class="' + cls + '"><thead><tr><th rowspan="2">No</th><th rowspan="2" style="min-width:' + (cetak ? '0' : '200px') + '">Kegiatan</th><th rowspan="2">Bidang</th>' + bl.map(function (b) { return '<th colspan="4">' + BLN_PNJ[b - 1].substr(0, 3) + '</th>'; }).join('') + '</tr><tr>' + bl.map(function () { return '<th>1</th><th>2</th><th>3</th><th>4</th>'; }).join('') + '</tr></thead><tbody>' +
    rs.map(function (x, i) {
      const mg = pgMinggu(x);
      return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td>' + bl.map(function (b) {
        return [1, 2, 3, 4].map(function (w) { const on = +x.bulan === b && (mg.m.indexOf(w) >= 0 || (w === 4 && mg.m.indexOf(5) >= 0)); return '<td class="' + (on ? 'kal-on' : '') + '">' + (on ? (mg.kira ? '○' : '●') : '') + '</td>'; }).join('');
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
}
ACT['pg-contoh'] = function (el) { run(el, api('program.contoh')).then(function (r) { toast(r.jumlah + ' kegiatan contoh ditambahkan. Silakan sesuaikan.'); pgProgram(); }).catch(fail); };
ACT['pg-catat'] = function (el) {
  const x = P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
  const pre = { program: x.id, jenis: x.jenisDefault || '', sumber: 'Program BK' };
  if (/Klasikal|Orientasi/.test(x.layanan)) { pre.sasaran = 'Klasikal'; pre.komponen = 'Layanan Dasar'; }
  else if (/Kelompok/.test(x.layanan)) pre.sasaran = 'Kelompok';
  if (x.jenisDefault) { pre.jenis = x.jenisDefault; pre.komponen = ''; }
  apiC('layanan.daftar', {}).then(function (d) {
    P.ly = P.ly || {}; P.ly.data = d;
    if (pre.jenis) pre.komponen = Object.keys(d.refs.komponen).filter(function (k) { return d.refs.komponen[k].indexOf(pre.jenis) >= 0; })[0] || pre.komponen;
    lyForm(null, pre);
    if (pre.jenis) { const s = $('#ly-jenis'); if (s) s.value = pre.jenis; }
  }).catch(fail);
};
ACT['pg-detail'] = function (el) {
  apiC('program.detail', { id: el.dataset.id }).then(function (d) {
    const x = d.program;
    openModal({
      title: x.topik, sub: x.bidang + ' · ' + x.layanan + ' · Semester ' + x.semester, size: 'lg',
      body: '<div class="row wrap">' + (x.jurus ? '<span class="chip gold"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + '<span class="chip neutral">Sasaran: ' + esc(x.sasaran || '-') + '</span><span class="chip neutral">Target ' + x.target + '</span>' + chipStatusT(x.status === 'Terlaksana' ? 'Selesai' : 'Diproses', x.status) + '</div>' +
        (x.tujuan ? '<p class="mt-12"><b>Tujuan:</b> ' + esc(x.tujuan) + '</p>' : '') + (x.dasar ? '<p class="xs muted"><b>Dasar kebutuhan:</b> ' + esc(x.dasar) + '</p>' : '') +
        '<div class="row mt-12"><div class="bar grow"><i style="width:' + x.persen + '%"></i></div><b>' + x.total + '/' + x.target + '</b></div><div class="xs muted mt-8">' + x.tercatat + ' pelaksanaan tercatat dari layanan BK' + (x.realisasi ? ' + ' + x.realisasi + ' dicatat manual' : '') + (x.murid ? ' · ' + x.murid + ' murid' : '') + '</div>' +
        '<h4 class="mt-16">Pelaksanaan</h4>' + (d.pelaksanaan.length ? '<div class="tbl-wrap mt-8"><table class="tbl" style="min-width:520px"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Peserta</th><th>Topik</th><th></th></tr></thead><tbody>' + d.pelaksanaan.map(function (p) { return '<tr><td>' + esc(fTgl(p.tanggal)) + '</td><td>' + esc(p.jenis_layanan) + '</td><td>' + esc(p.peserta) + '</td><td>' + esc(p.topik || '') + '</td><td>' + (p.bolehBuka ? '<button class="btn sm" data-act="layanan-buka" data-id="' + esc(p.id) + '">Buka</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="muted mt-8">Belum ada pelaksanaan tercatat.</div>'),
      foot: '<button class="btn" data-close>Tutup</button>' + (P.pg.d && P.pg.d.bolehUbah ? (pgPerluRpl(x) ? '<button class="btn" data-act="pg-rpl" data-id="' + esc(x.id) + '"><i class="bi bi-file-earmark-text"></i> RPL</button>' : '') + '<button class="btn primary" data-act="pg-catat" data-id="' + esc(x.id) + '"><i class="bi bi-plus-lg"></i> Catat pelaksanaan</button>' : '')
    });
  }).catch(fail);
};
ACT['pg-baru'] = function () { pgForm(null); };
ACT['pg-edit'] = function (el) { pgForm(P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]); };
ACT['pg-hapus'] = function (el) {
  confirmDlg('Hapus kegiatan ini dari program? Catatan layanan yang terkait tetap tersimpan.', 'Hapus', true, 'Hapus kegiatan').then(function (ok) {
    if (ok) api('program.hapus', { id: el.dataset.id }).then(function () { toast('Kegiatan dihapus.'); pgProgram(); }).catch(fail);
  });
};
function pgForm(x, pre) {
  const d = P.pg.d; pre = pre || {};
  const v0 = function (k, def) { return x ? x[k] : (pre[k] !== undefined ? pre[k] : def); };
  const mg = x && x.minggu ? x.minggu : [];
  const m = openModal({
    title: x ? 'Ubah kegiatan' : 'Tambah kegiatan', sub: pre.dasar ? 'Dari analisis kebutuhan: ' + pre.dasar : '', size: 'lg',
    body: '<form id="f-pg" class="form-grid c2" novalidate>' + fld({ name: 'bidang', label: 'Bidang', type: 'select', req: true, value: v0('bidang', 'Pribadi'), opts: d.bidang }) + fld({ name: 'layanan', label: 'Komponen layanan', type: 'select', req: true, value: v0('layanan', d.layanan[0]), opts: d.layanan }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'topik', label: 'Topik / kegiatan', req: true, max: 200, value: v0('topik', '') }) + '</div>' +
      '<div style="grid-column:1/-1">' + fld({ name: 'tujuan', label: 'Tujuan layanan (opsional)', type: 'textarea', rows: 2, max: 400, value: v0('tujuan', ''), ph: 'mis. Murid mampu menyusun jadwal belajar mandiri.' }) + '</div>' +
      fld({ name: 'sasaran', label: 'Sasaran', max: 100, value: v0('sasaran', ''), ph: 'Mis. Kelas VII' }) + fld({ name: 'jurus', label: 'Fokus 7 Jurus BK Hebat', type: 'select', blank: '— Tidak dipilih —', value: v0('jurus', ''), opts: d.jurus }) +
      fld({ name: 'semester', label: 'Semester', type: 'select', req: true, value: v0('semester', S.cfg.semester), opts: ['Ganjil', 'Genap'] }) +
      fld({ name: 'bulan', label: 'Bulan pelaksanaan', type: 'select', blank: '— Fleksibel —', value: x ? String(x.bulan) : '', opts: BLN_TA.map(function (i) { return { v: String(i), l: BLN_PNJ[i - 1] }; }) }) +
      '<div class="field" style="grid-column:1/-1"><span class="flabel">Minggu pelaksanaan</span><div class="checks" id="pg-mg">' + [1, 2, 3, 4, 5].map(function (w) { return '<label class="check"><input type="checkbox" value="' + w + '"' + (mg.indexOf(w) >= 0 ? ' checked' : '') + '> Minggu ke-' + w + '</label>'; }).join('') + '</div><div class="hint">Untuk matriks program semester. Kosongkan bila belum pasti (dicetak sebagai perkiraan minggu ke-2).</div></div>' +
      fld({ name: 'target', label: 'Target (kali pelaksanaan)', type: 'number', inputmode: 'numeric', value: v0('target', 1) }) + fld({ name: 'realisasi', label: 'Realisasi manual (di luar aplikasi)', type: 'number', inputmode: 'numeric', value: x ? x.realisasi : 0, hint: 'Pelaksanaan yang dicatat lewat Layanan BK dihitung otomatis.' }) +
      fld({ name: 'status', label: 'Status', type: 'select', value: x ? (x.statusSimpan || x.status) : 'Rencana', opts: d.status, hint: 'Berjalan/Terlaksana diperbarui otomatis dari realisasi.' }) + fld({ name: 'dasar', label: 'Dasar kebutuhan (opsional)', max: 300, value: v0('dasar', ''), ph: 'Mis. AKPD: Belajar 45% murid' }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'keterangan', label: 'Keterangan', type: 'textarea', rows: 2, max: 300, value: x ? x.keterangan : '' }) + '</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pg-ok">Simpan</button>'
  });
  $('#pg-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pg', m.el), v = formData(f);
    if (!validate(f, v, { topik: { label: 'Topik', req: true }, target: { label: 'Target', re: /^\d{1,3}$/, msg: 'Angka 0–999.' }, realisasi: { label: 'Realisasi', re: /^\d{1,3}$/, msg: 'Angka 0–999.' } })) return;
    v.minggu = $$('#pg-mg input:checked', m.el).map(function (c) { return +c.value; });
    if (x) v.id = x.id;
    run(e.currentTarget, api('program.simpan', v)).then(function () { m.close(); toast('Program tersimpan.'); if (P.pg.tab === 'program') pgProgram(); else pgKebutuhan(); }).catch(fail);
  });
}
// ── RPL ──
const RPL_LABEL = [['waktu', 'Alokasi waktu', 1], ['tempat', 'Tempat', 1], ['metode', 'Metode/teknik', 1], ['media', 'Media dan alat', 1], ['materi', 'Materi', 2], ['awal', 'Kegiatan awal', 2], ['inti', 'Kegiatan inti', 4], ['penutup', 'Kegiatan penutup', 2], ['evaluasi_proses', 'Evaluasi proses', 2], ['evaluasi_hasil', 'Evaluasi hasil', 2]];
ACT['pg-rpl'] = function (el) {
  const x = P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
  const r = x.rpl || x.rplDraf || {};
  closeAllOverlays();
  const m = openModal({
    title: 'RPL: ' + x.topik, sub: x.layanan + ' · ' + x.bidang + (x.rpl ? '' : ' · DRAF otomatis, sunting lalu simpan'), size: 'lg',
    body: (x.rpl ? '' : '<div class="note mb-12"><i class="bi bi-info-circle"></i><div>Isian di bawah adalah draf perkiraan sesuai komponen layanan. Sesuaikan dengan kondisi kelas Anda.</div></div>') +
      '<form id="f-rpl" class="form-grid c2" novalidate>' + RPL_LABEL.map(function (k) {
        return '<div' + (k[2] > 1 ? ' style="grid-column:1/-1"' : '') + '>' + fld({ name: k[0], label: k[1], type: k[2] > 1 ? 'textarea' : 'text', rows: k[2], max: k[0] === 'inti' ? 2000 : 800, value: r[k[0]] || '' }) + '</div>';
      }).join('') + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn" id="rpl-cetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn primary" id="rpl-ok">Simpan RPL</button>'
  });
  $('#rpl-ok', m.el).addEventListener('click', function (e) {
    const v = formData($('#f-rpl', m.el)); v.id = x.id;
    run(e.currentTarget, api('program.rpl', v)).then(function (res) { x.rpl = res.rpl; x.adaRpl = true; m.close(); toast('RPL tersimpan.'); pgProgram(); }).catch(fail);
  });
  $('#rpl-cetak', m.el).addEventListener('click', function () {
    const v = formData($('#f-rpl', m.el));
    siapKop().then(function () { cetakHtml(rplCetak(Object.assign({}, x, { rpl: v }), P.pg.d.tahun_ajaran), { judul: 'RPL ' + x.topik, ket: 'Rencana Pelaksanaan Layanan · A4 tegak' }); });
  });
};
ACT['pg-narasi'] = function () {
  apiC('program.dokumen').then(function (d) {
    const n = d.narasi;
    const m = openModal({
      title: 'Narasi dokumen program', sub: 'Dipakai pada dokumen Program Tahunan dan Laporan Pelaksanaan. Isian awal adalah contoh yang dapat Anda ubah.', size: 'lg',
      body: '<form id="f-nr" class="form-grid">' + fld({ name: 'program_rasional', label: 'A. Rasional', type: 'textarea', rows: 5, max: 3000, value: n.program_rasional }) + fld({ name: 'program_tujuan', label: 'C. Tujuan layanan', type: 'textarea', rows: 4, max: 3000, value: n.program_tujuan }) + fld({ name: 'program_evaluasi', label: 'G. Evaluasi, pelaporan, dan tindak lanjut', type: 'textarea', rows: 4, max: 3000, value: n.program_evaluasi }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="nr-ok">Simpan</button>'
    });
    $('#nr-ok', m.el).addEventListener('click', function (e) { run(e.currentTarget, api('program.narasi', formData($('#f-nr', m.el)))).then(function () { m.close(); toast('Narasi tersimpan.'); }).catch(fail); });
  }).catch(fail);
};
// ── Dokumen program: satu tombol ──
const DOK_PROGRAM = [['kebutuhan', 'Analisis kebutuhan murid', 'dari hasil instrumen'], ['tahunan', 'Program tahunan', 'rasional, kebutuhan, tujuan, komponen, rencana kegiatan, kalender, evaluasi'], ['ganjil', 'Program semester Ganjil', 'matriks bulan × minggu'], ['genap', 'Program semester Genap', 'matriks bulan × minggu'], ['rpl', 'RPL semua kegiatan klasikal/kelompok', 'satu halaman per kegiatan'], ['laporan', 'Laporan pelaksanaan program', 'target, realisasi, capaian, evaluasi']];
ACT['pg-dok'] = function () {
  const m = openModal({
    title: 'Cetak dokumen program BK', sub: 'Pilih dokumen yang dicetak. Setiap dokumen dimulai di halaman baru, berkop dan bertanda tangan.',
    body: '<div class="col gap-8" id="dok-pil">' + DOK_PROGRAM.map(function (d) { return '<label class="pick-row"><input type="checkbox" value="' + d[0] + '" checked><span><b>' + d[1] + '</b><small>' + d[2] + '</small></span></label>'; }).join('') + '</div>' +
      '<p class="xs muted mt-12">RPL yang belum disunting dicetak dari draf otomatis. Bagian yang belum pasti (minggu pelaksanaan, narasi) memakai perkiraan dan dapat disesuaikan.</p>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="dok-ok"><i class="bi bi-printer"></i> Siapkan cetak</button>'
  });
  $('#dok-ok', m.el).addEventListener('click', function (e) {
    const pil = $$('#dok-pil input:checked', m.el).map(function (c) { return c.value; });
    if (!pil.length) { toast('Pilih minimal satu dokumen.', 'err'); return; }
    run(e.currentTarget, Promise.all([api('program.dokumen'), api('rekap.tahunan', {}), siapKop()])).then(function (r) {
      m.close();
      const d = r[0], rk = r[1].data;
      const bag = [];
      if (pil.indexOf('kebutuhan') >= 0) bag.push(dokKebutuhan(d));
      if (pil.indexOf('tahunan') >= 0) bag.push(dokTahunan(d));
      if (pil.indexOf('ganjil') >= 0) bag.push(dokSemester(d, 'Ganjil'));
      if (pil.indexOf('genap') >= 0) bag.push(dokSemester(d, 'Genap'));
      if (pil.indexOf('rpl') >= 0) d.rows.filter(pgPerluRpl).forEach(function (x) { bag.push(rplCetak(Object.assign({}, x, { rpl: x.rpl || x.rplDraf }), d.tahun_ajaran)); });
      if (pil.indexOf('laporan') >= 0) bag.push(dokLaporan(d, rk));
      cetakHtml(bag.filter(Boolean).join(''), { judul: 'Dokumen Program BK ' + d.tahun_ajaran, ket: bag.length + ' dokumen · ' + kertasNama() });
    }).catch(fail);
  });
};
function dokTtd() { const bk = hasRole('guru_bk'); return ttdCetak(ttdKepsek(), ttdOrang('Guru Bimbingan dan Konseling,', bk ? S.user.nama : '', bk ? S.user.nip : '')); }
function dokKepala(judul, d, sub) { return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">' + esc(judul) + '</h2><div class="pr-sub">' + esc((KOP && KOP.sekolah) || S.cfg.namaSekolah || '') + ' · Tahun Ajaran ' + esc(d.tahun_ajaran) + (sub ? ' · ' + esc(sub) : '') + '</div>'; }
function dokKebutuhanTabel(d) {
  const u = d.kebutuhan.usulan;
  return u.length ? '<table class="pr-tbl"><thead><tr><th>No</th><th>Kebutuhan / usulan kegiatan</th><th>Bidang</th><th>Dasar data</th><th>Prioritas</th></tr></thead><tbody>' + u.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.dasar) + '</td><td style="text-align:center">' + x.tingkat + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>Belum ada data instrumen yang cukup; kebutuhan ditetapkan dari pengamatan dan informasi guru serta wali kelas.</p>';
}
function dokKebutuhan(d) {
  let h = dokKepala('ANALISIS KEBUTUHAN MURID', d);
  h += '<p>Jumlah murid aktif: ' + d.sekolah.murid + ' orang dalam ' + d.sekolah.kelas + ' kelas. Data diambil dari instrumen BK yang telah diisi murid.</p>';
  d.kebutuhan.instrumen.forEach(function (ins) {
    h += '<table class="pr-tbl"><thead><tr><th colspan="3">' + esc(ins.judul) + ' (' + esc(ins.jenis) + ') · ' + ins.responden + ' dari ' + ins.target + ' murid</th></tr><tr><th>Aspek</th><th>' + (ins.dominan ? '% murid dominan' : 'Skor rata-rata') + '</th><th>' + (ins.dominan ? 'Jumlah' : '% murid perlu perhatian') + '</th></tr></thead><tbody>' +
      (ins.dominan ? ins.dominan.map(function (x) { return '<tr><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.persen + '%</td><td style="text-align:center">' + x.jumlah + '</td></tr>'; }).join('')
        : ins.kelompok.map(function (g) { return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + g.rata + '%</td><td style="text-align:center">' + g.persenPerlu + '%</td></tr>'; }).join('')) + '</tbody></table>';
  });
  h += '<h3 style="font-size:11pt;margin:10px 0 4px">Prioritas kebutuhan dan usulan kegiatan</h3>' + dokKebutuhanTabel(d) + dokTtd() + '</div>';
  return h;
}
function dokTahunan(d) {
  const n = d.narasi, rows = d.rows;
  const komp = {};
  rows.forEach(function (x) { const k = komp[x.layanan] = komp[x.layanan] || {}; k[x.bidang] = (k[x.bidang] || 0) + 1; });
  const bid = ['Pribadi', 'Sosial', 'Belajar', 'Karier', 'Umum'].filter(function (b) { return rows.some(function (x) { return x.bidang === b; }); });
  let h = dokKepala('PROGRAM TAHUNAN BIMBINGAN DAN KONSELING', d);
  h += '<h3 class="pr-h3">A. Rasional</h3><p>' + esc(n.program_rasional) + '</p>';
  h += '<h3 class="pr-h3">B. Deskripsi kebutuhan</h3>' + dokKebutuhanTabel(d);
  h += '<h3 class="pr-h3">C. Tujuan layanan</h3><p>' + esc(n.program_tujuan) + '</p>';
  h += '<h3 class="pr-h3">D. Komponen dan bidang layanan</h3><table class="pr-tbl"><thead><tr><th>Komponen layanan</th>' + bid.map(function (b) { return '<th>' + b + '</th>'; }).join('') + '<th>Jumlah</th></tr></thead><tbody>' + Object.keys(komp).map(function (k) { const t = bid.reduce(function (a, b) { return a + (komp[k][b] || 0); }, 0); return '<tr><td>' + esc(k) + '</td>' + bid.map(function (b) { return '<td style="text-align:center">' + (komp[k][b] || '') + '</td>'; }).join('') + '<td style="text-align:center">' + t + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">E. Rencana kegiatan</h3><table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan / topik</th><th>Bidang</th><th>Komponen</th><th>Sasaran</th><th>Waktu</th><th>Target</th></tr></thead><tbody>' + rows.map(function (x, i) {
    return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + (x.tujuan ? '<div style="font-size:8.5pt">Tujuan: ' + esc(x.tujuan) + '</div>' : '') + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.layanan) + '</td><td>' + esc(x.sasaran || '-') + '</td><td>' + esc(x.semester) + (x.bulan ? ', ' + BLN_PNJ[x.bulan - 1] : '') + '</td><td style="text-align:center">' + x.target + '×</td></tr>';
  }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">F. Kalender kegiatan</h3><table class="pr-tbl pr-mini"><thead><tr><th>No</th><th>Kegiatan</th>' + BLN_TA.map(function (b) { return '<th>' + BLN_PNJ[b - 1].substr(0, 3) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x.topik) + '</td>' + BLN_TA.map(function (b) { return '<td>' + (+x.bulan === b ? '●' : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">G. Evaluasi, pelaporan, dan tindak lanjut</h3><p>' + esc(n.program_evaluasi) + '</p>' + dokTtd() + '</div>';
  return h;
}
function dokSemester(d, sem) {
  const rows = d.rows.filter(function (x) { return x.semester === sem; });
  if (!rows.length) return '';
  let h = dokKepala('PROGRAM SEMESTER ' + sem.toUpperCase() + ' BIMBINGAN DAN KONSELING', d);
  h += '<table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan / topik</th><th>Bidang</th><th>Komponen</th><th>Sasaran</th><th>Bulan</th><th>Target</th></tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.layanan) + '</td><td>' + esc(x.sasaran || '-') + '</td><td>' + (x.bulan ? BLN_PNJ[x.bulan - 1] : 'Fleksibel') + '</td><td style="text-align:center">' + x.target + '×</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">Matriks pelaksanaan (bulan × minggu)</h3>' + pgKalender(d.rows, sem, true) + '<div style="font-size:8.5pt">● minggu yang ditetapkan · ○ perkiraan; menyesuaikan kalender pendidikan sekolah.</div>' + dokTtd() + '</div>';
  return h;
}
function rplCetak(x, ta) {
  const r = x.rpl || {};
  const baris = function (l, v) { return '<tr><td style="width:30%">' + l + '</td><td>' + esc(v || '-').replace(/\n/g, '<br>') + '</td></tr>'; };
  return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">RENCANA PELAKSANAAN LAYANAN (RPL)</h2><div class="pr-sub">' + esc(x.layanan) + ' · Tahun Ajaran ' + esc(ta) + ' · Semester ' + esc(x.semester) + '</div>' +
    '<table class="pr-tbl"><tbody>' + baris('Komponen layanan', x.layanan) + baris('Bidang layanan', x.bidang) + baris('Topik / tema', x.topik) + (x.jurus ? baris('Fokus 7 Jurus BK Hebat', x.jurus) : '') + baris('Tujuan', x.tujuan || 'Murid memahami dan mampu menerapkan ' + x.topik.toLowerCase() + '.') + baris('Sasaran', x.sasaran) + baris('Waktu', (x.bulan ? BLN_PNJ[x.bulan - 1] + ' · ' : '') + (r.waktu || '')) + baris('Tempat', r.tempat) + baris('Metode/teknik', r.metode) + baris('Media dan alat', r.media) + baris('Materi', r.materi) + '</tbody></table>' +
    '<table class="pr-tbl"><thead><tr><th colspan="2">Langkah-langkah kegiatan</th></tr></thead><tbody>' + baris('1. Kegiatan awal', r.awal) + baris('2. Kegiatan inti', r.inti) + baris('3. Kegiatan penutup', r.penutup) + '</tbody></table>' +
    '<table class="pr-tbl"><thead><tr><th colspan="2">Evaluasi</th></tr></thead><tbody>' + baris('Evaluasi proses', r.evaluasi_proses) + baris('Evaluasi hasil', r.evaluasi_hasil) + '</tbody></table>' + dokTtd() + '</div>';
}
function dokLaporan(d, rk) {
  const rows = d.rows;
  const t = rows.reduce(function (a, x) { a[0] += x.target; a[1] += Math.min(x.total, x.target || x.total); return a; }, [0, 0]);
  let h = dokKepala('LAPORAN PELAKSANAAN PROGRAM BIMBINGAN DAN KONSELING', d, 'dicetak ' + fTgl(ymd(new Date())));
  h += '<h3 class="pr-h3">A. Ringkasan</h3><table class="pr-tbl"><tbody><tr><td style="width:55%">Kegiatan program</td><td>' + rows.length + ' kegiatan</td></tr><tr><td>Capaian target pelaksanaan</td><td>' + t[1] + ' dari ' + t[0] + ' (' + (t[0] ? Math.round(t[1] * 100 / t[0]) : 0) + '%)</td></tr><tr><td>Kegiatan terlaksana (mencapai target)</td><td>' + rows.filter(function (x) { return x.status === 'Terlaksana'; }).length + '</td></tr>' +
    '<tr><td>Layanan BK tercatat / murid terlayani</td><td>' + rk.layanan.total + ' / ' + rk.layanan.murid + ' murid</td></tr><tr><td>Laporan kejadian / kasus selesai</td><td>' + rk.kasus.total + ' / ' + rk.kasus.selesai + '</td></tr><tr><td>Komunikasi dengan orang tua</td><td>' + rk.ortu.total + '</td></tr></tbody></table>';
  h += '<h3 class="pr-h3">B. Realisasi per kegiatan</h3><table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan</th><th>Bidang</th><th>Target</th><th>Realisasi</th><th>%</th><th>Status</th><th>Terakhir</th></tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td style="text-align:center">' + x.target + '</td><td style="text-align:center">' + x.total + '</td><td style="text-align:center">' + x.persen + '%</td><td>' + esc(x.status) + '</td><td>' + (x.terakhir ? esc(fTgl(x.terakhir)) : '-') + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">C. Capaian per bidang</h3><table class="pr-tbl"><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Target</th><th>Realisasi</th><th>Capaian</th></tr></thead><tbody>' + rk.program.perBidang.map(function (x) { return '<tr><td>' + esc(x.bidang) + '</td><td style="text-align:center">' + x.kegiatan + '</td><td style="text-align:center">' + x.target + '</td><td style="text-align:center">' + x.realisasi + '</td><td style="text-align:center">' + x.persen + '%</td></tr>'; }).join('') + '</tbody></table>';
  const belum = rows.filter(function (x) { return x.status !== 'Terlaksana'; });
  h += '<h3 class="pr-h3">D. Evaluasi dan tindak lanjut</h3><p>' + esc(d.narasi.program_evaluasi) + '</p>' + (belum.length ? '<p>Kegiatan yang belum mencapai target (' + belum.length + '): ' + belum.slice(0, 15).map(function (x) { return esc(x.topik); }).join('; ') + '. Kegiatan tersebut dijadwalkan ulang atau disesuaikan pada semester berikutnya.</p>' : '<p>Seluruh kegiatan telah mencapai target.</p>') + dokTtd() + '</div>';
  return h;
}

// ── Rekap tahunan ──
function pgRekap() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('rekap.tahunan', { arsip: P.pg.arsip }).then(function (r) {
    if (P.pg.tab !== 'rekap' || !$('#pg-body')) return;
    P.pg.rk = r.data;
    const d = r.data;
    const tot = d.program.perBidang.reduce(function (a, x) { return [a[0] + x.target, a[1] + x.realisasi]; }, [0, 0]);
    let h = '<div class="card pad"><div class="row between wrap"><div><h3>Laporan program layanan BK</h3><div class="xs muted">TA ' + esc(d.tahun_ajaran) + ' · ' + esc(d.semester) + (d.arsip ? ' · dari arsip' : ' · data berjalan sejak arsip terakhir') + '</div></div>' +
      '<div class="row wrap"><select class="select" id="pg-arsip" style="width:auto;min-height:40px"><option value="">Tahun berjalan</option>' + r.arsip.map(function (a) { return '<option value="' + esc(a.id) + '"' + (P.pg.arsip === a.id ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('') + '</select>' +
      '<button class="btn" data-act="pg-csv"><i class="bi bi-filetype-csv"></i> CSV</button><button class="btn primary" data-act="rk-pdf"><i class="bi bi-file-earmark-pdf"></i> PDF untuk pengawas</button></div></div></div>';
    h += '<div class="grid g-kpi k5 mt-16" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' + [
      ['indigo', 'bi-journal-check', 'Capaian program', (tot[0] ? Math.min(100, Math.round(tot[1] * 100 / tot[0])) : 0) + '%', tot[1] + ' dari ' + tot[0] + ' target'],
      ['teal', 'bi-heart-pulse', 'Layanan BK', d.layanan.total, d.layanan.murid + ' murid terlayani'],
      ['amber', 'bi-folder2-open', 'Laporan kejadian', d.kasus.total, d.kasus.selesai + ' selesai'],
      ['blue', 'bi-send', 'Rujukan ke BK', d.rujukan.total, d.pembinaanGuru + ' pembinaan awal guru'],
      ['rose', 'bi-chat-dots', 'Komunikasi orang tua', d.ortu.total, 'tercatat']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Target vs realisasi per bidang</h3></div><div class="card-body">' + (d.program.perBidang.length ? d.program.perBidang.map(function (x) {
      return '<div class="mb-12"><div class="row between"><span class="fw6">' + esc(x.bidang) + '</span><span class="xs muted">' + x.realisasi + '/' + x.target + ' · ' + x.persen + '%</span></div><div class="bar"><i style="width:' + x.persen + '%;background:' + COL_BIDANG[x.bidang] + '"></i></div></div>';
    }).join('') : empty('bi-journal-check', 'Belum ada program')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Pelaksanaan layanan BK per bulan</h3></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-lb"></canvas></div></div></div></div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Laporan kejadian per kategori</h3></div><div class="card-body">' + (d.kasus.kategori.length ? '<div class="chart-box sm"><canvas id="ch-kk"></canvas></div>' : empty('bi-bar-chart', 'Belum ada laporan')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Layanan menurut komponen & jenis</h3></div>' + ((d.layanan.komponen || []).length ? '<div class="card-body" style="padding-bottom:0">' + d.layanan.komponen.map(function (x) { return hbar(x.nama, d.layanan.total ? x.jumlah * 100 / d.layanan.total : 0, x.jumlah, 'var(--teal)'); }).join('') + '</div>' : '') + (d.layanan.jenis.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jenis</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>' + d.layanan.jenis.map(function (x) { return '<tr><td>' + esc(x.nama) + '</td><td style="text-align:right" class="fw6">' + x.jumlah + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-chat-square', 'Belum ada layanan tercatat') + '</div>') + '</div></div>';
    h += '<div class="card mt-16"><div class="card-head"><h3>Pengumpulan data (instrumen)</h3></div>' + (d.instrumen.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Instrumen</th><th>Jenis</th><th>Sasaran</th><th style="text-align:right">Responden</th></tr></thead><tbody>' + d.instrumen.map(function (x) { return '<tr><td class="fw6">' + esc(x.judul) + '</td><td>' + esc(x.jenis) + '</td><td>' + esc(x.kelas) + '</td><td style="text-align:right">' + x.responden + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-clipboard-data', 'Belum ada instrumen') + '</div>') + '</div>';
    h += '<div class="note info mt-16"><i class="bi bi-shield-check"></i><div>Laporan hanya memuat angka agregat; tidak ada nama murid atau isi konseling. Tahun yang sudah diarsipkan tetap dapat dibuka dari pilihan di kanan atas.</div></div>';
    $('#pg-body').innerHTML = h;
    $('#pg-arsip').addEventListener('change', function (e) { P.pg.arsip = e.target.value; pgRekap(); });
    chart('ch-lb', { kind: 'bar', labels: BLN_PNJ.map(function (b) { return b.substr(0, 3); }), data: d.layanan.perBulan, color: '#0D9488', label: 'Layanan per bulan' });
    if (d.kasus.kategori.length) chart('ch-kk', { kind: 'hbar', labels: d.kasus.kategori.map(function (x) { return x.nama; }), data: d.kasus.kategori.map(function (x) { return x.jumlah; }), colors: KAT_COL, label: 'Kejadian per kategori' });
  }).catch(function (e) { isiHtml('#pg-body', errBox(e, true)); });
}
ACT['rk-pdf'] = function (el) { run(el, api('rekap.tahunanPdf', { arsip: P.pg.arsip })).then(function (f) { previewFile({ nama: f.nama, mime: f.mime, base64: f.base64, blok: f.blok }); }).catch(fail); };
ACT['pg-csv'] = function () {
  const d = P.pg.rk; if (!d) return;
  const rows = [['Laporan program layanan BK'], ['Tahun ajaran', d.tahun_ajaran], ['Semester', d.semester], [], ['Bidang', 'Kegiatan', 'Target', 'Realisasi', 'Capaian (%)']]
    .concat(d.program.perBidang.map(function (x) { return [x.bidang, x.kegiatan, x.target, x.realisasi, x.persen]; }))
    .concat([[], ['Daftar kegiatan'], ['Bidang', 'Komponen', 'Topik', 'Sasaran', 'Semester', 'Target', 'Realisasi', 'Status']])
    .concat(d.program.daftar.map(function (x) { return [x.bidang, x.layanan, x.topik, x.sasaran, x.semester, x.target, x.realisasi, x.status]; }))
    .concat([[], ['Indikator', 'Jumlah'], ['Layanan konseling', d.layanan.total], ['Murid dilayani', d.layanan.murid], ['Laporan kejadian', d.kasus.total], ['Kasus selesai', d.kasus.selesai], ['Rujukan', d.rujukan.total], ['Pembinaan awal guru', d.pembinaanGuru], ['Komunikasi orang tua', d.ortu.total], [], ['Layanan per bulan']])
    .concat(BLN_PNJ.map(function (b, i) { return [b, d.layanan.perBulan[i]]; }));
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'program_bk_' + d.tahun_ajaran.replace('/', '-') + '.csv');
  toast('CSV diunduh.');
};

'use strict';
// ════════════════════════════════════════════════════════════
// Instrumen BK: AKPD, sosiometri, angket kebutuhan (templat dapat diedit Guru BK)
// ════════════════════════════════════════════════════════════
const TIPE_NAMA = { masalah: 'Pernyataan (centang)', skala: 'Skala 1–4', pilihan: 'Pilihan tunggal', banyak: 'Pilihan ganda', isian: 'Isian bebas', teman: 'Pilih teman (sosiometri)' };
const JENIS_COL = { 'AKPD': 'var(--indigo)', 'Sosiometri': 'var(--teal)', 'Angket Kebutuhan': 'var(--amber)', 'Gaya Belajar': 'var(--blue)', 'Minat & Karier': 'var(--purple)', 'Kesejahteraan': 'var(--rose)', 'Kebiasaan Belajar': 'var(--teal)', 'Lainnya': 'var(--text-3)' };
PAGES.instrumen = function (params, tok) {
  if (params.hasil) return inHasil(params.hasil, tok);
  if (params.edit) return inEdit(params.edit, tok);
  if (params.isi) return inIsi(params.isi, tok);
  return inList(tok);
};
function inBack() { return '<button class="btn ghost sm mb-16" data-act="in-list"><i class="bi bi-arrow-left"></i> Semua instrumen</button>'; }
ACT['in-list'] = function () { navigateTo('instrumen', {}); };

function chipInstrumen(st) { return '<span class="chip ' + (st === 'Dibuka' ? 'st-Dipantau' : st === 'Ditutup' ? 'st-Selesai' : 'st-Baru') + '">' + esc(st) + '</span>'; }
function inList(tok) {
  return apiC('instrumen.daftar').then(function (r) {
    if (stale(tok)) return;
    P.inl = r;
    const ubah = r.bolehUbah;
    let h = pageHead('Pengumpulan data', 'Instrumen BK', ubah ? 'AKPD, gaya belajar, minat karier, kesejahteraan, kebiasaan belajar, sosiometri, dan angket buatan sendiri. Semua butir dapat Anda ubah.' : 'Hasil instrumen BK dalam bentuk agregat (tanpa nama murid).', ubah ? '<button class="btn primary" data-act="in-baru"><i class="bi bi-plus-lg"></i> Buat instrumen</button>' : '');
    if (!r.rows.length) {
      h += '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada instrumen', ubah ? 'Mulai dari templat siap pakai atau kerangka untuk instrumen buatan sendiri.' : 'Guru BK belum membuat instrumen.') + (ubah ? '<div style="text-align:center"><button class="btn dark" data-act="in-baru"><i class="bi bi-plus-lg"></i> Buat instrumen</button></div>' : '') + '</div>';
    } else {
      h += '<div class="grid g-3">' + r.rows.map(function (x) {
        const pct = x.target ? Math.round(x.responden * 100 / x.target) : 0;
        return '<div class="card pad"><div class="row between wrap" style="gap:6px"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[x.jenis] || 'var(--text-3)') + '">' + esc(x.jenis) + '</span><span class="row" style="gap:4px">' + (x.templat ? '<span class="chip blue" title="Muncul di pilihan Buat instrumen"><i class="bi bi-bookmark"></i> Templat</span>' : '') + chipInstrumen(x.status) + '</span></div>' +
          '<h3 class="mt-12" style="margin-top:12px">' + esc(x.judul) + '</h3><div class="xs muted">' + esc(x.kelas) + ' · ' + x.butir + ' butir' +
          (x.tutup ? ' · ' + (x.tutupOtomatis ? 'ditutup otomatis ' : 'tutup ') + esc(fTgl(x.tutup)) : '') + '</div>' +
          '<div class="row mt-12"><div class="bar grow"><i style="width:' + pct + '%"></i></div><b class="xs">' + x.responden + '/' + x.target + '</b></div>' +
          '<div class="row wrap mt-12"><button class="btn sm dark" data-act="in-hasil" data-id="' + esc(x.id) + '"><i class="bi bi-graph-up-arrow"></i> Hasil</button>' +
          (ubah ? '<button class="btn sm" data-act="in-isi" data-id="' + esc(x.id) + '"><i class="bi bi-link"></i> Pengisian</button><button class="btn sm" data-act="in-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Sunting</button><button class="btn sm soft-danger" data-act="in-hapus" data-id="' + esc(x.id) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button>' : '') + '</div></div>';
      }).join('') + '</div>';
    }
    $('#app-container').innerHTML = h;
  });
}
ACT['in-hasil'] = function (el) { navigateTo('instrumen', { hasil: el.dataset.id }); };
ACT['in-edit'] = function (el) { navigateTo('instrumen', { edit: el.dataset.id }); };
ACT['in-isi'] = function (el) { navigateTo('instrumen', { isi: el.dataset.id }); };
ACT['in-hapus'] = function (el) {
  confirmDlg('Instrumen beserta semua jawabannya akan dihapus. Lanjutkan?', 'Hapus', true, 'Hapus instrumen').then(function (ok) {
    if (ok) api('instrumen.hapus', { id: el.dataset.id }).then(function () { toast('Instrumen dihapus.'); navigateTo('instrumen', {}); }).catch(fail);
  });
};
ACT['in-baru'] = function () {
  const T = P.inl.templat;
  const GRUP = [['siap', 'Templat siap pakai', 'Butir disusun untuk murid SMP; untuk skrining, bukan instrumen baku. Semua butir dapat Anda ubah.'], ['sekolah', 'Templat sekolah', 'Instrumen yang Anda tandai sebagai templat.'], ['kerangka', 'Kerangka instrumen buatan sendiri', 'Struktur siap isi: ganti teks contoh bertanda [Ganti] dengan butir Anda.']];
  const IKON = { akpd: 'bi-list-check', angket: 'bi-clipboard-data', gaya: 'bi-eye', karier: 'bi-compass', sejahtera: 'bi-heart-pulse', kebiasaan: 'bi-calendar-check', sosiometri: 'bi-people', k_skala: 'bi-sliders', k_cek: 'bi-check2-square', k_kuesioner: 'bi-ui-checks' };
  const m = openModal({
    title: 'Buat instrumen', sub: 'Pilih titik awal. Anda dapat mengubah, menambah, atau menghapus butir setelahnya.', size: 'lg',
    body: '<div id="in-tpl">' + GRUP.map(function (g) {
      const isi = T.filter(function (t) { return (t.grup || 'siap') === g[0]; });
      if (!isi.length) return '';
      return '<div class="in-grp"><div class="fw7">' + g[1] + '</div><div class="xs muted mb-8">' + g[2] + '</div><div class="role-pick">' + isi.map(function (t) {
        return '<button class="role-opt' + (t.kode === T[0].kode ? ' on' : '') + '" data-act="in-tpl" data-k="' + esc(t.kode) + '"><span class="ro-ic"><i class="bi ' + (IKON[t.kode] || 'bi-bookmark') + '"></i></span><span class="ro-tx"><b>' + esc(t.judul) + '</b><span>' + esc(t.ket) + '</span></span></button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>' +
      '<form id="f-inb" class="form-grid c2 mt-16" novalidate>' + fld({ name: 'id_kelas', label: 'Sasaran kelas', type: 'select', blank: 'Semua kelas', opts: kelasOpts(), hint: 'Wajib dipilih untuk sosiometri (dilaksanakan per kelas).' }) + fld({ name: 'judul', label: 'Judul (opsional)', max: 150, ph: 'Mengikuti nama templat' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="inb-ok">Buat</button>'
  });
  P.intpl = T[0].kode;
  $('#inb-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-inb', m.el));
    if (P.intpl === 'sosiometri' && !d.id_kelas) { setErr(m.el, 'id_kelas', 'Pilih kelas untuk sosiometri.'); return; }
    run(e.currentTarget, api('instrumen.buat', { templat: P.intpl, id_kelas: d.id_kelas, judul: d.judul })).then(function (r) { m.close(); toast('Instrumen dibuat. Periksa dan sesuaikan butirnya.'); navigateTo('instrumen', { edit: r.id }); }).catch(fail);
  });
};
ACT['in-tpl'] = function (el) { P.intpl = el.dataset.k; $$('#in-tpl .role-opt').forEach(function (b) { b.classList.toggle('on', b === el); }); };

// ── Penyusun butir ──
function inEdit(id, tok) {
  return apiC('instrumen.get', { id: id }).then(function (d) {
    if (stale(tok)) return;
    P.ine = d;
    P.ine.kunci = d.responden > 0;
    P.ine.butir.forEach(function (b) { if (b.opsi) b.opsiTeks = b.opsi.join('\n'); });
    const aksi = '<button class="btn" data-act="in-pratinjau"><i class="bi bi-eye"></i> Pratinjau</button>' +
      '<button class="btn" data-act="in-salin" title="Salinan Draf tanpa jawaban; susunan butir bebas diubah"><i class="bi bi-files"></i> Salin jadi versi baru</button>' +
      '<button class="btn" data-act="in-jadi-templat" data-on="' + (d.atur.templat ? '0' : '1') + '"><i class="bi bi-bookmark"></i> ' + (d.atur.templat ? 'Lepas dari templat' : 'Jadikan templat sekolah') + '</button>' +
      '<button class="btn primary" data-act="in-simpan"><i class="bi bi-check-lg"></i> Simpan</button>';
    const adaSkala = d.butir.some(function (b) { return b.tipe === 'skala'; });
    $('#app-container').innerHTML = inBack() + pageHead('Sunting instrumen', d.judul, 'Atur judul, sasaran, dan butir. Simpan sebelum membuka pengisian.', aksi) +
      (P.ine.kunci ? '<div class="note mb-16"><i class="bi bi-lock"></i><div><b>Sudah ada ' + d.responden + ' jawaban.</b> Anda tetap boleh memperbaiki kata-kata (teks butir, pilihan, kelompok, judul, petunjuk). Menambah, menghapus, atau mengubah urutan/jenis butir dikunci agar jawaban lama tetap terbaca benar. Perlu susunan baru? Pakai <b>Salin jadi versi baru</b>.</div></div>' : '') +
      '<div class="card pad"><form id="f-ine" class="form-grid c2" novalidate>' + fld({ name: 'judul', label: 'Judul', req: true, max: 150, value: d.judul }) + fld({ name: 'jenis', label: 'Jenis', type: 'select', value: d.jenis, opts: d.jenisOpsi }) +
      fld({ name: 'id_kelas', label: 'Sasaran kelas', type: 'select', blank: 'Semua kelas', value: d.id_kelas, opts: d.kelas, dis: P.ine.kunci }) +
      fld({ name: 'tutup', label: 'Tutup otomatis pada (opsional)', type: 'date', value: d.atur.tutup || '', hint: 'Setelah tanggal ini murid tidak dapat mengisi lagi.' }) +
      '<div id="ine-tafsir" style="grid-column:1/-1' + (adaSkala ? '' : ';display:none') + '">' + fld({ name: 'tafsir', label: 'Cara membaca skor skala', type: 'select', value: d.atur.tafsir, opts: d.tafsirOpsi, hint: 'Menentukan urutan "perlu perhatian", kelompok kebutuhan, dan rekomendasi pada hasil.' }) + '</div>' +
      '<div style="grid-column:1/-1">' + fld({ name: 'deskripsi', label: 'Petunjuk untuk murid', type: 'textarea', rows: 2, max: 600, value: d.deskripsi }) + '</div></form></div>' +
      '<div class="row between wrap mt-16 mb-16"><h3>Butir (<span id="ine-n">0</span>)</h3><div class="row wrap">' + (P.ine.kunci ? '' : '<button class="btn" data-act="in-tempel"><i class="bi bi-list-check"></i> Tempel banyak butir</button><button class="btn dark" data-act="in-tambah"><i class="bi bi-plus-lg"></i> Tambah butir</button>') + '</div></div><div id="ine-list" class="col gap-12"></div>' +
      '<div class="row wrap mt-16" style="justify-content:flex-end"><button class="btn" data-act="in-pratinjau"><i class="bi bi-eye"></i> Pratinjau</button><button class="btn primary" data-act="in-simpan"><i class="bi bi-check-lg"></i> Simpan</button></div>';
    inEditDraw();
    const list = $('#ine-list');
    list.addEventListener('input', inEditInput); list.addEventListener('change', inEditInput);
  });
}
function inEditInput(e) {
  const card = e.target.closest('.bt'); if (!card) return;
  const b = P.ine.butir[+card.dataset.i], f = e.target.dataset.bf; if (!f) return;
  if (f === 'wajib') b.wajib = e.target.checked;
  else if (f === 'maks') b.maks = +e.target.value;
  else if (f === 'tipe') { b.tipe = e.target.value; if (b.tipe === 'teman') { b.maks = b.maks || 3; b.arah = b.arah || 'pilih'; } if (['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0 && !b.opsiTeks) b.opsiTeks = b.tipe === 'skala' ? 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh' : 'Pilihan A\nPilihan B'; inEditDraw(); return; }
  else b[f] = e.target.value;
}
function inEditDraw() {
  const butir = P.ine.butir, kunci = P.ine.kunci;
  $('#ine-n').textContent = butir.length;
  const t = $('#ine-tafsir'); if (t) t.style.display = butir.some(function (b) { return b.tipe === 'skala'; }) ? '' : 'none';
  $('#ine-list').innerHTML = butir.map(function (b, i) {
    const opsi = ['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0;
    const ganti = /^\[Ganti\]/.test(b.teks || '');
    return '<div class="card pad bt' + (ganti ? ' bt-ganti' : '') + '" data-i="' + i + '"><div class="row between wrap"><div class="row"><span class="step-n sm">' + (i + 1) + '</span>' +
      (kunci ? '<span class="chip neutral">' + TIPE_NAMA[b.tipe] + '</span>' : '<select class="select" data-bf="tipe" style="min-height:36px;width:auto" aria-label="Jenis butir">' + Object.keys(TIPE_NAMA).map(function (t) { return '<option value="' + t + '"' + (b.tipe === t ? ' selected' : '') + '>' + TIPE_NAMA[t] + '</option>'; }).join('') + '</select>') +
      (ganti ? '<span class="chip st-Baru">Ganti teks contoh</span>' : '') + '</div>' +
      (kunci ? '' : '<div class="row"><button class="btn sm" data-act="in-naik" data-i="' + i + '" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '><i class="bi bi-arrow-up"></i></button><button class="btn sm" data-act="in-turun" data-i="' + i + '" aria-label="Turunkan"' + (i === butir.length - 1 ? ' disabled' : '') + '><i class="bi bi-arrow-down"></i></button><button class="btn sm" data-act="in-dup" data-i="' + i + '" aria-label="Duplikat butir" title="Duplikat"><i class="bi bi-files"></i></button><button class="btn sm soft-danger" data-act="in-del" data-i="' + i + '" aria-label="Hapus butir"><i class="bi bi-trash3"></i></button></div>') + '</div>' +
      '<div class="form-grid mt-12"><div class="field"><label>Teks ' + (b.tipe === 'masalah' ? 'pernyataan' : 'pertanyaan') + '</label><textarea class="textarea" rows="2" maxlength="300" data-bf="teks">' + esc(b.teks) + '</textarea></div>' +
      '<div class="form-grid c2"><div class="field"><label>Kelompok / bidang</label><input class="input" maxlength="60" data-bf="kelompok" value="' + esc(b.kelompok || '') + '" placeholder="Mis. Pribadi"></div>' +
      (b.tipe !== 'masalah' ? '<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" data-bf="wajib"' + (b.wajib ? ' checked' : '') + '> Wajib diisi</label></div>' : '<div></div>') + '</div>' +
      (opsi ? '<div class="field"><label>Pilihan (satu per baris)</label><textarea class="textarea" rows="' + Math.min(6, Math.max(3, (b.opsiTeks || '').split('\n').length)) + '" data-bf="opsiTeks">' + esc(b.opsiTeks || '') + '</textarea>' + (b.tipe === 'skala' ? '<div class="hint">Urutan dari terendah (1) ke tertinggi.' + (kunci ? ' Jumlah pilihan tidak dapat diubah.' : '') + '</div>' : (kunci ? '<div class="hint">Jumlah pilihan tidak dapat diubah.</div>' : '')) + '</div>' : '') +
      (b.tipe === 'teman' ? '<div class="form-grid c2"><div class="field"><label>Maksimal pilihan</label><select class="select" data-bf="maks">' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + ((b.maks || 3) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div class="field"><label>Arah</label><select class="select" data-bf="arah"' + (kunci ? ' disabled' : '') + '><option value="pilih"' + (b.arah !== 'tolak' ? ' selected' : '') + '>Pilihan positif (disukai)</option><option value="tolak"' + (b.arah === 'tolak' ? ' selected' : '') + '>Penolakan (kurang disukai)</option></select></div></div>' : '') + '</div></div>';
  }).join('') || empty('bi-clipboard', 'Belum ada butir', 'Tambahkan butir pertama.');
}
function inBaruButir(tipe, teks, kel) {
  const b = { id: '', tipe: tipe, teks: teks || '', kelompok: kel || '', wajib: false };
  if (tipe === 'skala') b.opsiTeks = 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh';
  if (tipe === 'pilihan' || tipe === 'banyak') b.opsiTeks = 'Pilihan A\nPilihan B';
  if (tipe === 'teman') { b.maks = 3; b.arah = 'pilih'; }
  return b;
}
ACT['in-tambah'] = function () {
  const a = P.ine.butir, prev = a[a.length - 1];
  const b = prev ? Object.assign({}, prev, { id: '', teks: '', tanda: '' }) : inBaruButir('pilihan', '', ''); // ikuti jenis & kelompok butir terakhir
  a.push(b); inEditDraw();
  const l = $('#ine-list'); if (l.lastElementChild) { l.lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' }); const ta = $('textarea', l.lastElementChild); if (ta) setTimeout(function () { ta.focus(); }, 300); }
};
ACT['in-naik'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (i > 0) { const t = a[i]; a[i] = a[i - 1]; a[i - 1] = t; inEditDraw(); } };
ACT['in-turun'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (i < a.length - 1) { const t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; inEditDraw(); } };
ACT['in-dup'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (a.length >= 120) { toast('Maksimal 120 butir.', 'err'); return; } a.splice(i + 1, 0, Object.assign({}, a[i], { id: '', tanda: '' })); inEditDraw(); toast('Butir diduplikat.'); };
ACT['in-del'] = function (el) { P.ine.butir.splice(+el.dataset.i, 1); inEditDraw(); };
ACT['in-tempel'] = function () {
  const m = openModal({
    title: 'Tempel banyak butir', sub: 'Satu butir per baris, dari Word, Excel, atau Google Docs.',
    body: '<form id="f-tp" class="form-grid" novalidate>' + '<div class="form-grid c2">' + fld({ name: 'tipe', label: 'Jenis butir', type: 'select', value: 'masalah', opts: Object.keys(TIPE_NAMA).filter(function (t) { return t !== 'teman'; }).map(function (t) { return { v: t, l: TIPE_NAMA[t] }; }) }) + fld({ name: 'kelompok', label: 'Kelompok / bidang', max: 60, ph: 'Mis. Pribadi' }) + '</div>' +
      fld({ name: 'baris', label: 'Daftar butir', type: 'textarea', rows: 9, max: 12000, req: true, ph: 'Saya sulit berkonsentrasi saat belajar.\nBelajar | Saya sering menunda tugas.\nSosial | Saya sulit bergaul dengan teman baru.', hint: 'Nomor/tanda di awal baris dibuang otomatis. Tulis "Kelompok | teks" untuk menetapkan kelompok per baris (tanpa itu memakai kelompok di atas).' }) +
      '<div id="tp-skala" class="hide">' + fld({ name: 'opsi', label: 'Pilihan (pisahkan dengan koma)', value: ((P.ine.butir.filter(function (b) { return b.tipe === 'skala' && b.opsiTeks; })[0] || {}).opsiTeks || 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh').split('\n').join(', '), max: 300, hint: 'Untuk skala: urut dari terendah ke tertinggi.' }) + '</div><div id="tp-info" class="xs muted"></div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tp-ok">Tambahkan</button>'
  });
  const f = $('#f-tp', m.el);
  const urai = function () {
    const d = formData(f);
    return d.baris.split(/\r?\n/).map(function (s) { return s.replace(/^[\s\-•*–\d.)]+/, '').trim(); }).filter(Boolean).map(function (s) {
      const k = s.indexOf('|');
      return k > 0 && k < 60 ? { kel: s.substr(0, k).trim(), teks: s.substr(k + 1).trim() } : { kel: d.kelompok, teks: s };
    }).filter(function (x) { return x.teks; });
  };
  const info = function () {
    const d = formData(f), a = urai(), kel = {};
    a.forEach(function (x) { kel[x.kel || '(tanpa kelompok)'] = (kel[x.kel || '(tanpa kelompok)'] || 0) + 1; });
    $('#tp-skala', m.el).classList.toggle('hide', ['skala', 'pilihan', 'banyak'].indexOf(d.tipe) < 0);
    $('#tp-info', m.el).textContent = a.length ? a.length + ' butir terbaca: ' + Object.keys(kel).map(function (k) { return k + ' ' + kel[k]; }).join(', ') : '';
  };
  f.addEventListener('input', info); f.addEventListener('change', info);
  $('#tp-ok', m.el).addEventListener('click', function () {
    const d = formData(f), a = urai();
    if (!a.length) { setErr(m.el, 'baris', 'Tempel minimal satu baris.'); return; }
    if (P.ine.butir.length + a.length > 120) { setErr(m.el, 'baris', 'Total butir maksimal 120.'); return; }
    const opsi = (d.opsi || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    a.forEach(function (x) {
      const b = inBaruButir(d.tipe, x.teks.substr(0, 300), x.kel);
      if (['skala', 'pilihan', 'banyak'].indexOf(d.tipe) >= 0 && opsi.length >= 2) b.opsiTeks = opsi.join('\n');
      P.ine.butir.push(b);
    });
    m.close(); inEditDraw(); toast(a.length + ' butir ditambahkan. Jangan lupa Simpan.');
  });
};
function inButirKirim() {
  return P.ine.butir.map(function (b) {
    const o = { id: b.id, tipe: b.tipe, teks: (b.teks || '').trim(), kelompok: (b.kelompok || '').trim(), wajib: !!b.wajib };
    if (b.opsiTeks !== undefined && ['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0) o.opsi = b.opsiTeks.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (b.tipe === 'teman') { o.maks = b.maks || 3; o.arah = b.arah || 'pilih'; }
    if (b.tanda) o.tanda = b.tanda;
    return o;
  });
}
ACT['in-simpan'] = function (el) {
  const f = $('#f-ine'), d = formData(f);
  if (!validate(f, d, { judul: { label: 'Judul', req: true } })) return;
  const butir = inButirKirim();
  for (let i = 0; i < butir.length; i++) if (!butir[i].teks) { toast('Butir ' + (i + 1) + ' belum memiliki teks.', 'err'); return; }
  const sisa = butir.filter(function (b) { return /^\[Ganti\]/.test(b.teks); }).length;
  const kirim = function () {
    return run(el, api('instrumen.simpan', { id: P.ine.id, judul: d.judul, jenis: d.jenis, id_kelas: P.ine.kunci ? P.ine.id_kelas : d.id_kelas, deskripsi: d.deskripsi, butir: butir, tafsir: d.tafsir || P.ine.atur.tafsir, tutup: d.tutup || '' }))
      .then(function () { toast('Instrumen tersimpan.'); navigateTo('instrumen', { edit: P.ine.id }); }).catch(fail);
  };
  if (sisa) confirmDlg(sisa + ' butir masih berisi teks contoh [Ganti]. Simpan tetap?', 'Simpan', false, 'Teks contoh belum diganti').then(function (ok) { if (ok) kirim(); });
  else kirim();
};
ACT['in-salin'] = function (el) {
  confirmDlg('Buat salinan Draf dari instrumen ini (tanpa jawaban)? Instrumen lama beserta jawabannya tetap tersimpan.', 'Salin', false, 'Salin jadi versi baru').then(function (ok) {
    if (ok) run(el, api('instrumen.salin', { id: P.ine.id })).then(function (r) { toast('Versi baru dibuat: ' + r.judul); navigateTo('instrumen', { edit: r.id }); }).catch(fail);
  });
};
ACT['in-jadi-templat'] = function (el) {
  const on = el.dataset.on === '1';
  run(el, api('instrumen.templat', { id: P.ine.id, aktif: on })).then(function () {
    toast(on ? 'Instrumen ini muncul di pilihan Buat instrumen (Templat sekolah).' : 'Dilepas dari templat sekolah.');
    P.ine.atur.templat = on; el.dataset.on = on ? '0' : '1'; el.innerHTML = '<i class="bi bi-bookmark"></i> ' + (on ? 'Lepas dari templat' : 'Jadikan templat sekolah');
  }).catch(fail);
};
/** Pratinjau tampilan murid (tidak menyimpan apa pun). */
ACT['in-pratinjau'] = function () {
  const f = $('#f-ine'), d = f ? formData(f) : { judul: P.ine.judul, deskripsi: P.ine.deskripsi };
  const butir = inButirKirim();
  let last = null;
  const body = butir.map(function (b, i) {
    let g = '';
    if (b.kelompok && b.kelompok !== last) { g = '<div class="jw-grp">' + esc(b.kelompok) + '</div>'; last = b.kelompok; }
    const nm = 'pv' + i;
    let ctl = '';
    if (b.tipe === 'masalah') ctl = '<label class="check"><input type="checkbox"> ' + esc(b.teks) + '</label>';
    else if (b.tipe === 'skala' || b.tipe === 'pilihan') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + (b.wajib ? ' <span class="req">*</span>' : '') + '</div><div class="pv-ops">' + (b.opsi || []).map(function (o) { return '<label class="pv-op"><input type="radio" name="' + nm + '"> ' + esc(o) + '</label>'; }).join('') + '</div>';
    else if (b.tipe === 'banyak') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><div class="pv-ops">' + (b.opsi || []).map(function (o) { return '<label class="pv-op"><input type="checkbox"> ' + esc(o) + '</label>'; }).join('') + '</div>';
    else if (b.tipe === 'isian') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><textarea class="textarea" rows="2"></textarea>';
    else if (b.tipe === 'teman') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><div class="xs muted">Murid memilih maksimal ' + (b.maks || 3) + ' nama teman sekelas dari daftar.</div>';
    return g + '<div class="pv-item">' + ctl + '</div>';
  }).join('');
  openModal({ title: 'Pratinjau: ' + (d.judul || ''), sub: 'Tampilan yang dilihat murid. Jawaban di sini tidak disimpan.', size: 'lg',
    body: (d.deskripsi ? '<div class="note info"><i class="bi bi-info-circle"></i><div>' + esc(d.deskripsi) + '</div></div>' : '') + '<div class="pv mt-12">' + body + '</div>',
    foot: '<button class="btn primary" data-close>Selesai</button>' });
};

// ── Pengisian: tautan murid, status, input manual ──
function inIsi(id, tok) {
  return Promise.all([apiC('instrumen.get', { id: id }), apiC('instrumen.responden', { id: id })]).then(function (r) {
    if (stale(tok)) return;
    const d = r[0], rs = r[1].rows;
    P.ini = { d: d, rs: rs };
    const buka = d.status === 'Dibuka';
    const sudah = rs.filter(function (x) { return x.sudah; }).length;
    let h = inBack() + pageHead('Pengisian instrumen', d.judul, sudah + ' dari ' + rs.length + ' murid sudah mengisi.', '') +
      '<div class="card pad"><div class="row between wrap"><div class="row">' + chipInstrumen(d.status) + '<span class="muted xs">' + (buka ? 'Murid dapat mengisi lewat tautan di bawah.' : 'Buka pengisian agar murid dapat mengisi sendiri, atau input jawaban manual dari kertas.') + '</span></div>' +
      '<div class="row wrap">' + (buka ? '<button class="btn" data-act="in-kode-baru"><i class="bi bi-arrow-repeat"></i> Kode baru</button><button class="btn" data-act="in-status" data-s="Ditutup"><i class="bi bi-lock"></i> Tutup pengisian</button>' : '<button class="btn primary" data-act="in-status" data-s="Dibuka"><i class="bi bi-link"></i> Buka pengisian</button>') + '</div></div>';
    if (buka) {
      h += '<div class="note info mt-12"><i class="bi bi-info-circle"></i><div style="width:100%"><div class="xs muted">Kode pengisian</div><div class="mono" style="font-size:26px;letter-spacing:5px">' + esc(d.kode) + '</div>' +
        '<div class="xs muted mt-8">Tautan untuk dibagikan ke murid (kode sudah terisi; murid cukup memasukkan NIS)</div><div class="row wrap mt-8"><input class="input grow" readonly id="in-link" value="' + esc(d.tautan) + '" onclick="this.select()"><button class="btn" data-act="in-copy"><i class="bi bi-copy"></i> Salin</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Silakan isi ' + d.judul + ' melalui tautan berikut (gunakan NIS): ' + d.tautan) + '"><i class="bi bi-whatsapp" style="color:#16A34A"></i> Bagikan</a></div></div></div>' +
        '<div class="xs muted mt-8">Murid hanya dapat mengisi satu kali. Jawaban hanya terlihat oleh Guru BK. Tutup pengisian setelah semua selesai.</div>';
    }
    h += '</div><div class="card mt-16"><div class="card-head"><div><h3>Daftar murid sasaran</h3><div class="xs muted">Input manual untuk jawaban kertas atau murid tanpa gawai</div></div></div><div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Murid</th><th>Kelas</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' + rs.map(function (x, i) {
      return '<tr><td class="fw6">' + esc(x.nama) + '<div class="xs muted">NIS ' + esc(x.nis) + '</div></td><td>' + esc(x.kelas) + '</td><td>' + (x.sudah ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Sudah' + (x.sudah === 'guru' ? ' (input guru)' : '') + '</span>' : '<span class="chip st-Baru">Belum</span>') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (x.sudah ? '<button class="btn sm" data-act="in-detail" data-id="' + esc(P.ini.d.id) + '" data-m="' + esc(x.id) + '"><i class="bi bi-eye"></i> Lihat</button> ' : '') + '<button class="btn sm" data-act="in-manual" data-i="' + i + '"><i class="bi bi-pencil-square"></i> ' + (x.sudah ? 'Ubah' : 'Input') + '</button>' + (x.sudah ? ' <button class="btn sm soft-danger" data-act="in-jdel" data-i="' + i + '" aria-label="Hapus jawaban"><i class="bi bi-trash3"></i></button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
    $('#app-container').innerHTML = h;
  });
}
ACT['in-status'] = function (el) {
  const id = P.ini.d.id;
  run(el, api('instrumen.status', { id: id, status: el.dataset.s })).then(function () { toast(el.dataset.s === 'Dibuka' ? 'Pengisian dibuka.' : 'Pengisian ditutup.'); navigateTo('instrumen', { isi: id }); }).catch(fail);
};
ACT['in-kode-baru'] = function (el) {
  confirmDlg('Kode lama tidak akan berlaku lagi. Tautan yang sudah dibagikan perlu dikirim ulang. Lanjutkan?', 'Buat kode baru', false, 'Kode baru').then(function (ok) {
    if (ok) run(el, api('instrumen.status', { id: P.ini.d.id, status: 'Dibuka', kodeBaru: true })).then(function () { navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
  });
};
ACT['in-copy'] = function () {
  const t = $('#in-link').value;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Tautan disalin.'); }, function () { $('#in-link').select(); toast('Salin manual (Ctrl+C).', 'warn'); });
  else { $('#in-link').select(); toast('Salin manual (Ctrl+C).', 'warn'); }
};
ACT['in-jdel'] = function (el) {
  const x = P.ini.rs[+el.dataset.i];
  confirmDlg('Hapus jawaban ' + x.nama + '? Murid dapat mengisi ulang.', 'Hapus', true, 'Hapus jawaban').then(function (ok) {
    if (ok) api('instrumen.jawabHapus', { id: P.ini.d.id, id_murid: x.id }).then(function () { toast('Jawaban dihapus.'); navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
  });
};
ACT['in-manual'] = function (el) {
  const x = P.ini.rs[+el.dataset.i];
  run(el, apiC('instrumen.jawabGet', { id: P.ini.d.id, id_murid: x.id })).then(function (g) {
    const m = openModal({
      title: 'Input jawaban — ' + x.nama, sub: x.kelas, size: 'lg',
      body: '<div id="im-form" class="if-form">' + IsiForm.render(g.butir, g.rekan, g.jawaban) + '</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="im-ok">Simpan jawaban</button>'
    });
    IsiForm.bind($('#im-form', m.el), function (mx) { toast('Paling banyak ' + mx + ' pilihan.', 'err'); });
    $('#im-ok', m.el).addEventListener('click', function (e) {
      const r = IsiForm.read($('#im-form', m.el), g.butir);
      if (r.galat.length) { toast('Ada butir wajib yang belum diisi.', 'err'); return; }
      run(e.currentTarget, api('instrumen.jawabManual', { id: P.ini.d.id, id_murid: x.id, jawaban: r.jawab })).then(function () { m.close(); toast('Jawaban tersimpan.'); navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
    });
  }).catch(fail);
};

// ── Hasil & analisis ──
function hbar(label, pct, val, color, sub) {
  return '<div class="hb"><div class="row between"><span>' + esc(label) + (sub ? ' <span class="xs muted">' + esc(sub) + '</span>' : '') + '</span><b>' + esc(val) + '</b></div><div class="bar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + (color || 'var(--indigo)') + '"></i></div></div>';
}
function sociogramSvg(siswa, edges) {
  const n = siswa.length; if (!n) return '';
  const W = 560, H = 560, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 56;
  const pos = {};
  siswa.forEach(function (s, i) { const a = -Math.PI / 2 + 2 * Math.PI * i / n; pos[s.id] = [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const col = function (s) { return s.tag.indexOf('Populer') >= 0 ? '#0D9488' : s.tag.indexOf('Ditolak') >= 0 ? '#EF4444' : s.tag.indexOf('Terisolir') >= 0 ? '#F59E0B' : '#64748B'; };
  let h = '<defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#94A3B8"/></marker></defs>';
  edges.forEach(function (e) {
    const a = pos[e.a], b = pos[e.b]; if (!a || !b) return;
    h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (e.timbal ? '#0D9488' : '#94A3B8') + '" stroke-width="' + (e.timbal ? 2.2 : 1) + '" opacity="' + (e.timbal ? .9 : .45) + '"' + (e.timbal ? '' : ' marker-end="url(#arw)"') + '/>';
  });
  siswa.forEach(function (s) {
    const p = pos[s.id], r = 9 + Math.min(10, s.dipilih * 1.6);
    h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + col(s) + '" stroke="var(--card)" stroke-width="2"><title>' + esc(s.nama) + ': dipilih ' + s.dipilih + ', ditolak ' + s.ditolak + '</title></circle>' +
      '<text x="' + p[0] + '" y="' + (p[1] + r + 12) + '" text-anchor="middle" font-size="10" fill="var(--text-2)">' + esc(s.nama.split(' ')[0].substr(0, 10)) + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Sosiogram kelas" style="max-width:620px;display:block;margin:0 auto">' + h + '</svg>';
}
const KAT_WARNA = { Tinggi: '#EF4444', Sedang: '#F59E0B', Rendah: '#10B981' };
const TAFSIR_LABEL = { kebutuhan: 'Skor tinggi = makin perlu layanan', kekuatan: 'Skor tinggi = makin baik', dominan: 'Kelompok tertinggi = kecenderungan murid' };
/** Warna kategori sesuai cara membaca: pada "kekuatan", kategori Rendah yang perlu perhatian. */
function katWarna(k, tafsir, tipe) {
  if (tafsir === 'dominan' && tipe === 'skala') return k === 'Tinggi' ? '#4F46E5' : k === 'Sedang' ? '#818CF8' : '#C7D2FE';
  if (tafsir === 'kekuatan' && tipe === 'skala') return k === 'Tinggi' ? '#10B981' : k === 'Sedang' ? '#F59E0B' : '#EF4444';
  return KAT_WARNA[k] || '#94A3B8';
}
function katBar(kat, tafsir, tipe) {
  const tot = (kat.Tinggi || 0) + (kat.Sedang || 0) + (kat.Rendah || 0) || 1;
  return '<div class="katbar" role="img" aria-label="Tinggi ' + (kat.Tinggi || 0) + ', Sedang ' + (kat.Sedang || 0) + ', Rendah ' + (kat.Rendah || 0) + '">' + ['Tinggi', 'Sedang', 'Rendah'].map(function (k) {
    const n = kat[k] || 0; return n ? '<i style="width:' + (n * 100 / tot) + '%;background:' + katWarna(k, tafsir, tipe) + '" title="' + k + ': ' + n + ' murid">' + n + '</i>' : '';
  }).join('') + '</div>';
}
/** Kartu-kartu ringkasan hasil (dipakai halaman Hasil, profil kelas wali, dan cetak rekap). */
function inRingkasHtml(d, opt) {
  opt = opt || {};
  let h = '';
  if (d.ditandai) h += '<div class="note rose mb-16"><i class="bi bi-flag"></i><div><b>' + d.ditandai + ' murid meminta bertemu Guru BK secepatnya.</b> Lihat tab Hasil per murid (ditandai ⚑, tampil paling atas).</div></div>';
  if (d.dominan && d.dominan.length) {
    h += '<div class="card mb-16"><div class="card-head"><h3>Kecenderungan dominan</h3><span class="xs muted">% murid per kelompok tertinggi</span></div><div class="card-body">' +
      d.dominan.map(function (x) { return hbar(x.kelompok, x.persen, x.persen + '% (' + x.jumlah + ')', 'var(--indigo)') + '<div class="xs muted mb-8">' + esc(x.rekom) + '</div>'; }).join('') + '</div></div>';
  }
  if (d.kelompok && d.kelompok.length) {
    const tf = d.tafsir, tp = d.kelompok[0].tipe;
    h += '<div class="card mb-16"><div class="card-head" style="flex-wrap:wrap"><div><h3>Per aspek / bidang</h3><div class="xs muted">' + (tp === 'masalah' ? 'rata-rata % murid yang mencentang' : 'rata-rata skor (% skala) · ' + esc(TAFSIR_LABEL[tf] || '')) + '</div></div>' +
      '<div class="row wrap xs" style="gap:10px">' + ['Tinggi', 'Sedang', 'Rendah'].map(function (k) { return '<span><i class="lgd" style="background:' + katWarna(k, tf, tp) + '"></i>' + k + '</span>'; }).join('') + '</div></div><div class="card-body">' +
      d.kelompok.slice().sort(function (a, b) { return tf === 'kekuatan' && a.tipe === 'skala' ? a.rata - b.rata : b.rata - a.rata; }).map(function (g) {
        return '<div class="asp"><div class="row between"><b>' + esc(g.kelompok) + '</b><span class="xs muted">' + g.rata + '%</span></div>' + (g.kategori ? katBar(g.kategori, tf, g.tipe) : '<div class="bar"><i style="width:' + g.rata + '%"></i></div>') +
          (opt.rekom !== false && g.rekom ? '<div class="xs muted mt-4">' + esc(g.rekom) + '</div>' : '') + '</div>';
      }).join('') + '<div class="xs muted mt-8">Angka pada batang = jumlah murid per kategori (Tinggi/Sedang/Rendah).</div></div></div>';
  }
  return h;
}
function inHasil(id, tok, idKelas) {
  return apiC('instrumen.hasil', { id: id, id_kelas: idKelas || '' }).then(function (d) {
    if (stale(tok)) return;
    P.inh = d; P.inhId = id; P.inhKelas = idKelas || '';
    const filt = d.kelasOpsi && d.kelasOpsi.length > 1 ? '<select class="select" id="inh-kls" style="width:auto;min-height:38px" aria-label="Kelas"><option value="">Semua kelas</option>' + d.kelasOpsi.map(function (k) { return '<option value="' + esc(k.v) + '"' + (k.v === P.inhKelas ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select>' : '';
    const head = inBack() + pageHead(d.jenis + (d.kelasNama ? ' · ' + d.kelasNama : ''), d.judul, d.responden + ' dari ' + d.target + ' murid mengisi (' + d.persen + '%).',
      filt + '<button class="btn" data-act="in-cetak-rekap"><i class="bi bi-printer"></i> Cetak rekap' + (d.kelasNama ? ' kelas' : '') + '</button><button class="btn" data-act="in-csv"><i class="bi bi-filetype-csv"></i> CSV</button>' + (d.rinci ? '<button class="btn" data-act="in-ekspor"><i class="bi bi-table"></i> Data per murid</button>' : ''));
    let h = '';
    if (!d.rinci) h += '<div class="note info mb-16"><i class="bi bi-shield-check"></i><div>Tampilan agregat: nama murid dan jawaban isian tidak ditampilkan untuk peran ini.</div></div>';
    if (!d.responden) h += '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada jawaban', 'Hasil akan muncul setelah murid mengisi.') + '</div>';
    else {
      h += inRingkasHtml(d);
      h += '<div class="grid g-2 eq"><div class="card"><div class="card-head"><h3>Partisipasi per kelas</h3></div><div class="card-body">' + d.perKelas.map(function (k) { return hbar(k.kelas, k.target ? k.responden * 100 / k.target : 0, k.responden + '/' + k.target, 'var(--teal)'); }).join('') + '</div></div>';
      if (d.peringkat.length) h += '<div class="card"><div class="card-head"><h3>10 teratas</h3><span class="xs muted">' + (d.peringkat[0].satuan === '%' ? 'masalah yang paling banyak dicentang' : d.tafsir === 'kekuatan' ? 'skor terendah (perlu ditingkatkan)' : d.tafsir === 'dominan' ? 'pernyataan paling sesuai' : 'kebutuhan tertinggi (rata-rata skala)') + '</span></div><div class="card-body">' + d.peringkat.map(function (x, i) { return hbar((i + 1) + '. ' + x.teks, x.satuan === '%' ? x.nilai : x.nilai * 25, x.nilai + x.satuan, 'var(--amber)', x.kelompok); }).join('') + '</div></div>';
      else h += '<div></div>';
      h += '</div>';
      if (d.distribusiMasalah) {
        h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Sebaran jumlah masalah per murid</h3></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-dm"></canvas></div></div></div>';
        h += '<div class="card"><div class="card-head"><h3>Murid yang perlu perhatian</h3><span class="xs muted">paling banyak mencentang masalah</span></div>' + (d.perhatian ? (d.perhatian.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Murid</th><th>Kelas</th><th style="text-align:right">Masalah</th><th></th></tr></thead><tbody>' + d.perhatian.map(function (x) {
          return '<tr><td class="fw6">' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td style="text-align:right"><b>' + x.jumlah + '</b></td><td style="text-align:right"><button class="btn sm" data-act="in-detail" data-id="' + esc(id) + '" data-m="' + esc(x.id) + '">Jawaban</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card-body muted">Tidak ada murid yang mencentang masalah.</div>') : '<div class="card-body muted">Hanya Guru BK yang dapat melihat nama murid.</div>') + '</div></div>';
      }
      if (d.sosio) {
        const s = d.sosio;
        h += '<div class="grid g-kpi k4 mt-16">' + [['teal', 'bi-stars', 'Populer', s.populer, 'banyak dipilih'], ['amber', 'bi-person-x', 'Terisolir', s.terisolir, 'tidak dipilih siapa pun'], ['rose', 'bi-x-octagon', 'Ditolak', s.ditolak, 'banyak ditolak'], ['indigo', 'bi-arrow-left-right', 'Pasangan timbal balik', s.pasanganTimbal, 'saling memilih']].map(function (x) {
          return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
        }).join('') + '</div>';
        if (s.catatan) h += '<div class="note mt-12"><i class="bi bi-exclamation-triangle"></i><div>' + esc(s.catatan) + '</div></div>';
        if (s.siswa) {
          h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Sosiogram</h3><span class="xs muted">garis tebal = saling memilih · warna: <b style="color:#0D9488">populer</b>, <b style="color:#F59E0B">terisolir</b>, <b style="color:#EF4444">ditolak</b></span></div><div class="card-body">' + sociogramSvg(s.siswa, s.edges) + '</div></div>' +
            '<div class="card"><div class="card-head"><h3>Peringkat penerimaan</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Murid</th><th style="text-align:right">Dipilih</th><th style="text-align:right">Ditolak</th><th>Kategori</th></tr></thead><tbody>' + s.siswa.map(function (x) {
              return '<tr><td class="fw6">' + esc(x.nama) + (x.sudahIsi ? '' : ' <span class="xs muted">(belum mengisi)</span>') + '</td><td style="text-align:right">' + x.dipilih + '</td><td style="text-align:right">' + x.ditolak + '</td><td>' + (x.tag.length ? x.tag.map(function (t) { return '<span class="chip ' + (t === 'Populer' ? 'st-Dipantau' : t === 'Ditolak' ? 'st-Eskalasi' : 'st-Baru') + '">' + esc(t) + '</span>'; }).join(' ') : '<span class="muted">—</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div></div></div>';
        }
      }
      const rinc = d.butir.filter(function (b) { return b.tipe === 'skala' || b.tipe === 'pilihan' || b.tipe === 'banyak' || b.tipe === 'isian'; });
      if (rinc.length) {
        h += '<details class="card mt-16 rinc"><summary class="card-head" style="cursor:pointer"><h3>Rincian per butir (' + rinc.length + ')</h3><span class="xs muted">ketuk untuk membuka</span></summary><div class="card-body col gap-16">' + rinc.map(function (b) {
          if (b.tipe === 'isian') return '<div><div class="fw6">' + esc(b.teks) + '</div><div class="xs muted">' + b.jumlah + ' jawaban</div>' + (b.jawaban ? '<ul class="mt-8" style="padding-left:18px">' + b.jawaban.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
          const tot = b.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1;
          return '<div><div class="fw6">' + esc(b.teks) + (b.tipe === 'skala' ? ' <span class="chip neutral">rata-rata ' + b.rata + '</span>' : '') + '</div>' + b.sebaran.map(function (x) { return hbar(x.label, x.jumlah * 100 / tot, x.jumlah, 'var(--indigo)'); }).join('') + '</div>';
        }).join('') + '</div></details>';
      }
    }
    $('#app-container').innerHTML = head + (d.rinci && d.responden ? '<div class="tabs mb-16" id="inh-tabs"><button class="tab active" data-act="inh-tab" data-t="sum"><i class="bi bi-bar-chart"></i> Ringkasan</button><button class="tab" data-act="inh-tab" data-t="pm"><i class="bi bi-person-lines-fill"></i> Hasil per murid</button><button class="tab" data-act="inh-tab" data-t="kb"><i class="bi bi-people"></i> Kelompok kebutuhan</button></div>' : '') +
      '<div id="inh-sum">' + h + '</div><div id="inh-pm" class="hide"></div><div id="inh-kb" class="hide"></div>';
    const sel = $('#inh-kls'); if (sel) sel.addEventListener('change', function (e) { inHasil(id, S.navTok, e.target.value); });
    if (d.distribusiMasalah) chart('ch-dm', { kind: 'bar', labels: d.distribusiMasalah.map(function (x) { return x.label; }), data: d.distribusiMasalah.map(function (x) { return x.jumlah; }), color: '#4F46E5', label: 'Sebaran jumlah masalah' });
  });
}
ACT['inh-tab'] = function (el) {
  $$('#inh-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  const t = el.dataset.t;
  ['sum', 'pm', 'kb'].forEach(function (k) { $('#inh-' + k).classList.toggle('hide', k !== t); });
  if ((t === 'pm' || t === 'kb') && !$('#inh-pm').dataset.ok) inPerMurid(t);
  else if (t === 'kb') inKelompokDraw();
};
function inPerMurid(tab) {
  const box = $('#inh-pm'), kb = $('#inh-kb'); box.innerHTML = skeleton(3); kb.innerHTML = skeleton(2);
  apiC('instrumen.perMurid', { id: P.inhId, id_kelas: P.inhKelas || '' }).then(function (d) {
    P.inpm = d; box.dataset.ok = '1';
    const rata = d.tipeSkor !== 'jumlah', tf = d.tafsir;
    const skorLbl = rata ? 'rata-rata skala; warna = kategori' : 'jumlah masalah dicentang';
    const kelasCetak = P.inhKelas || (d.kelasOpsi.length === 1 ? d.kelasOpsi[0].v : '');
    box.innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div><h3>Hasil per murid</h3><div class="xs muted">' + (d.kelompok.length ? 'Angka per aspek = ' + skorLbl + '. ' : '') + 'Murid yang perlu ditindaklanjuti tampil paling atas.</div></div>' +
      '<div class="row wrap" style="gap:8px"><div class="search" style="max-width:220px"><i class="bi bi-search"></i><input id="pm-q" type="search" placeholder="Cari murid…"></div>' +
      '<button class="btn" data-act="in-cetak-semua" data-k="' + esc(kelasCetak) + '"' + (kelasCetak ? '' : ' disabled title="Pilih satu kelas di atas untuk mencetak sekaligus"') + '><i class="bi bi-printer"></i> Cetak profil ' + (kelasCetak ? 'sekelas' : '(pilih kelas)') + '</button></div></div>' +
      '<div class="tbl-wrap mt-12"><table class="tbl" id="pm-tbl"><thead><tr><th>Murid</th><th>Kelas</th>' + d.kelompok.map(function (k) { return '<th style="text-align:center">' + esc(k) + '</th>'; }).join('') + (tf === 'dominan' && rata ? '<th>Dominan</th>' : '') + '<th>Ringkasan</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      d.rows.map(function (r) {
        const maxv = rata ? 4 : 10;
        return '<tr data-q="' + esc((r.nama + ' ' + r.nis + ' ' + r.kelas).toLowerCase()) + '"' + (r.flag ? ' class="pm-flag"' : '') + '><td class="fw6 click" data-act="in-detail" data-id="' + esc(P.inhId) + '" data-m="' + esc(r.id_murid) + '" style="cursor:pointer">' + (r.flag ? '<span title="' + esc(r.flag) + '">⚑ </span>' : '') + esc(r.nama) + '<div class="xs muted">NIS ' + esc(r.nis) + (r.sumber === 'guru' ? ' · input guru' : '') + '</div></td><td>' + esc(r.kelas) + '</td>' +
          d.kelompok.map(function (k) {
            const v = r.skor[k], kt = r.kategori[k];
            if (v === undefined) return '<td style="text-align:center">–</td>';
            const sty = kt && kt !== '-' ? 'background:' + katWarna(kt, tf, rata ? 'skala' : 'masalah') + '22;color:' + katWarna(kt, tf, rata ? 'skala' : 'masalah') : '--t:' + Math.min(1, v / maxv).toFixed(2);
            return '<td style="text-align:center"><span class="skor" style="' + sty + '" title="' + esc(kt || '') + '">' + v + '</span></td>';
          }).join('') +
          (tf === 'dominan' && rata ? '<td><b>' + esc(r.dominan || '-') + '</b></td>' : '') +
          '<td class="xs muted-2" style="min-width:200px">' + esc(r.ringkas) + (r.tag && r.tag.length ? ' ' + r.tag.map(function (t) { return '<span class="chip ' + (t === 'Populer' ? 'st-Dipantau' : t === 'Ditolak' ? 'st-Eskalasi' : 'st-Baru') + '">' + esc(t) + '</span>'; }).join(' ') : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="in-detail" data-id="' + esc(P.inhId) + '" data-m="' + esc(r.id_murid) + '">Profil</button> <button class="btn sm primary" data-act="in-layanan" data-id="' + esc(r.id_murid) + '" data-n="' + esc(r.nama) + '" data-k="' + esc(r.kelas) + '">Tindak lanjuti</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    $('#pm-q').addEventListener('input', function (e) { const q = e.target.value.trim().toLowerCase(); $$('#pm-tbl tbody tr').forEach(function (tr) { tr.classList.toggle('hide', q && tr.dataset.q.indexOf(q) < 0); }); });
    inKelompokDraw();
  }).catch(function (e) { box.innerHTML = errBox(e); kb.innerHTML = errBox(e); });
}
const BIDANG_INS = { 'Gaya Belajar': 'Belajar', 'Kebiasaan Belajar': 'Belajar', 'Minat & Karier': 'Karier' };
function inKelompokDraw() {
  const d = P.inpm, kb = $('#inh-kb'); if (!d || !kb) return;
  const dom = d.tafsir === 'dominan' && d.tipeSkor !== 'jumlah';
  kb.innerHTML = '<div class="note info mb-16"><i class="bi bi-people"></i><div>' + (dom ? 'Murid dikelompokkan menurut kecenderungan dominan. Cocok untuk pembagian kelompok belajar atau bimbingan kelompok sesuai gaya/minat.' : 'Murid dikelompokkan menurut aspek yang perlu ditindaklanjuti (kategori ' + (d.tafsir === 'kekuatan' && d.tipeSkor !== 'jumlah' ? 'Rendah' : 'Tinggi') + '). Satu murid bisa masuk lebih dari satu kelompok.') + ' Ketuk <b>Catat bimbingan kelompok</b> untuk langsung mencatat layanan dengan peserta terisi.</div></div>' +
    (d.kelompokButuh.length ? '<div class="grid g-2">' + d.kelompokButuh.map(function (g, i) {
      return '<div class="card pad"><div class="row between wrap"><h3>' + esc(g.kelompok) + '</h3><span class="chip neutral">' + g.murid.length + ' murid</span></div><div class="xs muted mt-4">' + esc(g.rekom) + '</div>' +
        '<div class="row wrap mt-12" style="gap:6px">' + g.murid.slice(0, 40).map(function (m) { return '<span class="chip blue">' + esc(m.nama) + ' <span class="muted">· ' + esc(m.kelas) + '</span></span>'; }).join('') + (g.murid.length > 40 ? '<span class="xs muted">+' + (g.murid.length - 40) + ' lainnya</span>' : '') + '</div>' +
        '<div class="row wrap mt-12"><button class="btn sm primary" data-act="in-kel-layanan" data-i="' + i + '"><i class="bi bi-people"></i> Catat bimbingan kelompok</button></div></div>';
    }).join('') + '</div>' : '<div class="card pad">' + empty('bi-emoji-smile', 'Tidak ada kelompok kebutuhan', 'Belum ada murid dengan aspek yang perlu ditindaklanjuti.') + '</div>');
}
ACT['in-kel-layanan'] = function (el) {
  const d = P.inpm, g = d.kelompokButuh[+el.dataset.i];
  const bid = BIDANG_INS[d.jenis] || (['Pribadi', 'Sosial', 'Belajar', 'Karier'].indexOf(g.kelompok) >= 0 ? g.kelompok : 'Pribadi');
  closeAllOverlays();
  navigateTo('layanan', { peserta: g.murid.slice(0, 40).map(function (m) { return { id: m.id, nama: m.nama, kelas: m.kelas }; }), sasaran: 'Kelompok', jenis: 'Bimbingan Kelompok', komponen: 'Layanan Dasar', bidang: bid, topik: (d.tafsir === 'dominan' ? 'Strategi belajar/karier: ' : '') + g.kelompok, sumber: 'Hasil instrumen/asesmen' });
};
// ── Cetak: profil per murid, sekelas sekaligus, rekap kelas ──
function profilCetakHtml(x, judul, jenis, tafsir) {
  const p = x.profil || { kelompok: [], rekom: [] };
  const masalah = p.kelompok.some(function (g) { return g.tipe === 'masalah'; });
  return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">PROFIL HASIL ' + esc(String(jenis || '').toUpperCase()) + '</h2><div class="pr-sub">' + esc(judul) + '</div>' +
    '<table class="pr-tbl"><tbody><tr><td style="width:28%">Nama murid</td><td><b>' + esc(x.murid.nama) + '</b></td></tr><tr><td>NIS / Kelas</td><td>' + esc(x.murid.nis || '-') + ' / ' + esc(x.murid.kelas) + '</td></tr><tr><td>Tanggal pengisian</td><td>' + esc(fTgl(String(x.ts || '').substr(0, 10))) + '</td></tr>' +
    (p.dominan ? '<tr><td>Kecenderungan dominan</td><td><b>' + esc(p.dominan) + '</b></td></tr>' : '') + (p.flag ? '<tr><td>Catatan khusus</td><td><b>' + esc(p.flag) + '</b></td></tr>' : '') + '</tbody></table>' +
    (p.kelompok.length ? '<table class="pr-tbl"><thead><tr><th>Aspek / bidang</th><th>' + (masalah ? 'Masalah dicentang' : 'Skor rata-rata') + '</th><th>Persentase</th><th>Kategori</th></tr></thead><tbody>' + p.kelompok.map(function (g) {
      return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + (g.nilai === null ? '-' : g.tipe === 'masalah' ? g.nilai + ' dari ' + g.dari : String(g.nilai).replace('.', ',') + ' (1–' + g.dari + ')') + '</td><td style="text-align:center">' + (g.persen === null ? '-' : g.persen + '%') + '</td><td style="text-align:center">' + esc(g.kategori) + '</td></tr>';
    }).join('') + '</tbody></table>' : '') +
    '<div style="margin:6px 0"><b>Ringkasan:</b> ' + esc(x.ringkas || '') + '</div>' +
    '<div style="margin-top:6px"><b>Rekomendasi tindak lanjut</b>' + (p.rekom.length ? '<ol style="margin:4px 0 0 18px;padding:0">' + p.rekom.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' : '<div>Belum ada aspek yang perlu ditindaklanjuti secara khusus; lanjutkan layanan dasar.</div>') + '</div>' +
    '<div class="xs" style="margin-top:6px;font-size:8.5pt">Cara membaca: ' + esc(TAFSIR_LABEL[tafsir] || '') + '. Hasil instrumen bersifat skrining awal, bukan diagnosis; tafsirkan bersama data lain.</div>' +
    ttdCetak(ttdKepsek(), ttdOrang('Guru BK,', S.user.nama, S.user.nip)) +
    '<div class="pr-foot">Dokumen rahasia BK · dicetak dari SIKOLAB BK · ' + esc(fTgl(ymd(new Date()))) + '</div></div>';
}
ACT['in-profil-print'] = function () {
  const d = P.injd; if (!d) return;
  siapKop().then(function () { cetakHtml(profilCetakHtml(d, d.judul, d.jenis, d.tafsir), { judul: 'Profil ' + d.murid.nama, ket: 'Profil hasil instrumen · A4 tegak' }); });
};
ACT['in-cetak-semua'] = function (el) {
  const k = el.dataset.k; if (!k) return;
  run(el, Promise.all([api('instrumen.cetakProfil', { id: P.inhId, id_kelas: k }), siapKop()])).then(function (r) {
    const d = r[0];
    if (!d.rows.length) { toast('Belum ada murid kelas ini yang mengisi.', 'warn'); return; }
    cetakHtml(d.rows.map(function (x) { return profilCetakHtml(x, d.judul, d.jenis, d.tafsir); }).join(''), { judul: 'Profil ' + d.rows.length + ' murid · ' + d.kelas, ket: 'Satu halaman per murid · A4 tegak' });
  }).catch(fail);
};
ACT['in-cetak-rekap'] = function () { if (P.inh) cetakRekapIns(P.inh, hasRole('guru_bk') ? ttdOrang('Guru BK,', S.user.nama, S.user.nip) : ''); };
function cetakRekapIns(d, kanan) {
  siapKop().then(function () {
    const tf = d.tafsir;
    let h = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">REKAPITULASI HASIL ' + esc(String(d.jenis).toUpperCase()) + '</h2><div class="pr-sub">' + esc(d.judul) + ' · ' + esc(d.kelasNama || 'Semua kelas') + ' · ' + d.responden + ' dari ' + d.target + ' murid (' + d.persen + '%)</div>';
    if (d.dominan && d.dominan.length) h += '<table class="pr-tbl"><thead><tr><th>Kecenderungan dominan</th><th>Jumlah murid</th><th>%</th><th>Saran pembelajaran / layanan</th></tr></thead><tbody>' + d.dominan.map(function (x) { return '<tr><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.jumlah + '</td><td style="text-align:center">' + x.persen + '%</td><td>' + esc(x.rekom) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (d.kelompok && d.kelompok.length) h += '<table class="pr-tbl"><thead><tr><th>Aspek / bidang</th><th>Rata-rata</th><th>Tinggi</th><th>Sedang</th><th>Rendah</th><th>Rekomendasi</th></tr></thead><tbody>' + d.kelompok.map(function (g) { const k = g.kategori || {}; return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + g.rata + '%</td><td style="text-align:center">' + (k.Tinggi || 0) + '</td><td style="text-align:center">' + (k.Sedang || 0) + '</td><td style="text-align:center">' + (k.Rendah || 0) + '</td><td>' + esc(g.rekom || '') + '</td></tr>'; }).join('') + '</tbody></table><div style="font-size:8.5pt">Cara membaca: ' + esc(d.kelompok[0].tipe === 'masalah' ? 'persentase murid yang mencentang masalah; kategori Tinggi ≥ 40%' : (TAFSIR_LABEL[tf] || '')) + '. Kolom Tinggi/Sedang/Rendah = jumlah murid.</div>';
    if (d.peringkat && d.peringkat.length) h += '<table class="pr-tbl" style="margin-top:8px"><thead><tr><th>No</th><th>' + (d.peringkat[0].satuan === '%' ? 'Masalah paling banyak dicentang' : tf === 'kekuatan' ? 'Butir dengan skor terendah' : 'Butir dengan skor tertinggi') + '</th><th>Bidang</th><th>Nilai</th></tr></thead><tbody>' + d.peringkat.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.teks) + '</td><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.nilai + x.satuan + '</td></tr>'; }).join('') + '</tbody></table>';
    (d.pilihan || (d.butir || []).filter(function (b) { return b.tipe === 'pilihan'; })).forEach(function (b) { const tot = b.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1; h += '<table class="pr-tbl"><thead><tr><th colspan="3">' + esc(b.teks) + '</th></tr></thead><tbody>' + b.sebaran.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td style="text-align:center;width:18%">' + x.jumlah + '</td><td style="text-align:center;width:18%">' + Math.round(x.jumlah * 100 / tot) + '%</td></tr>'; }).join('') + '</tbody></table>'; });
    if (d.ditandai) h += '<p><b>Catatan:</b> ' + d.ditandai + ' murid meminta bertemu Guru BK secepatnya (nama tercantum pada lembar profil per murid).</p>';
    h += ttdCetak(ttdKepsek(), kanan || '') + '<div class="pr-foot">Rekap agregat tanpa nama murid · SIKOLAB BK · ' + esc(fTgl(ymd(new Date()))) + '</div></div>';
    cetakHtml(h, { judul: 'Rekap ' + d.judul, ket: 'Rekap hasil instrumen · A4 tegak' });
  });
}

// ── Profil kelas dari instrumen BK (untuk wali kelas; agregat tanpa nama) ──
function klsProfil(idKelas) {
  const box = $('#kls-profil'); if (!box) return;
  apiC('instrumen.profilKelas', { id_kelas: idKelas }).then(function (d) {
    const b = $('#kls-profil'); if (!b || P.ksKelas !== idKelas) return;
    P.klsPf = d;
    if (!d.rows.length) { b.innerHTML = ''; return; }
    b.innerHTML = '<div class="row between wrap mt-16 mb-8"><h3><i class="bi bi-clipboard-data"></i> Profil kelas dari instrumen BK</h3><span class="xs muted">Persentase per aspek tanpa nama murid; tampil bila minimal ' + d.minimal + ' murid mengisi.</span></div>' +
      '<div class="grid g-2">' + d.rows.map(function (r, i) {
        return '<div class="card pad"><div class="row between wrap" style="gap:6px"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[r.jenis] || 'var(--text-3)') + '">' + esc(r.jenis) + '</span><span class="xs muted">' + r.responden + '/' + r.target + ' murid (' + r.persen + '%)</span></div><h3 class="mt-8" style="margin-top:8px">' + esc(r.judul) + '</h3>' +
          (r.cukup ? '<div class="mt-12">' + inRingkasHtml({ dominan: r.dominan, kelompok: r.kelompok, tafsir: r.tafsir }) +
            r.pilihan.map(function (p) { const tot = p.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1; return '<div class="fw6 mt-8">' + esc(p.teks) + '</div>' + p.sebaran.map(function (x) { return hbar(x.label, x.jumlah * 100 / tot, Math.round(x.jumlah * 100 / tot) + '%', 'var(--teal)'); }).join(''); }).join('') +
            '</div><div class="row wrap mt-8"><button class="btn sm" data-act="kls-pf-cetak" data-i="' + i + '"><i class="bi bi-printer"></i> Cetak</button></div>'
            : '<div class="note mt-12"><i class="bi bi-hourglass-split"></i><div>Baru ' + r.responden + ' murid mengisi. Profil kelas tampil setelah minimal ' + d.minimal + ' murid mengisi.</div></div>') + '</div>';
      }).join('') + '</div>';
  }).catch(function () { const b = $('#kls-profil'); if (b) b.innerHTML = ''; });
}
ACT['kls-pf-cetak'] = function (el) {
  const d = P.klsPf, r = d.rows[+el.dataset.i];
  cetakRekapIns(Object.assign({}, r, { kelasNama: 'Kelas ' + d.kelas, peringkat: r.peringkat || [], ditandai: 0 }), ttdOrang('Wali Kelas ' + esc(d.kelas) + ',', S.user.nama, S.user.nip));
};
/** Rincian jawaban satu murid pada satu instrumen (dipakai di Instrumen dan Garis Waktu Murid). */
ACT['in-detail'] = function (el) {
  apiC('instrumen.jawabDetail', { id: el.dataset.id, id_murid: el.dataset.m }).then(function (d) {
    P.injd = d;
    let last = null;
    const items = d.items.map(function (it) {
      let g = '';
      if (it.kelompok && it.kelompok !== last) { g = '<div class="jw-grp">' + esc(it.kelompok) + (d.skor[it.kelompok] !== undefined ? ' <span class="chip neutral">' + d.skor[it.kelompok] + '</span>' : '') + '</div>'; last = it.kelompok; }
      if (it.tipe === 'masalah') return g + '<div class="jw-row ' + (it.tanda ? 'on' : 'off') + '"><i class="bi ' + (it.tanda ? 'bi-check-circle-fill' : 'bi-dot') + '"></i><span>' + esc(it.teks) + '</span></div>';
      return g + '<div class="jw-row q"><div class="xs muted">' + it.no + '. ' + esc(it.teks) + '</div><div class="fw6">' + (it.jawaban ? esc(it.jawaban) : '<span class="muted">— tidak dijawab —</span>') + '</div></div>';
    }).join('');
    const nCek = d.items.filter(function (x) { return x.tanda; }).length;
    openModal({
      title: d.murid.nama, sub: d.judul + ' · ' + d.murid.kelas + ' · ' + fTs(d.ts) + (d.sumber === 'guru' ? ' · input Guru BK' : ''), size: 'lg',
      body: '<div class="note info"><i class="bi bi-clipboard-data"></i><div><b>Ringkasan:</b> ' + esc(d.ringkas) + '</div></div>' + inProfilHtml(d) +
        (d.items.some(function (x) { return x.tipe === 'masalah'; }) ? '<div class="fchips mt-12"><button class="fchip active" data-act="jw-filter" data-f="on">Hanya yang dicentang (' + nCek + ')</button><button class="fchip" data-act="jw-filter" data-f="all">Semua pernyataan</button></div>' : '') +
        '<div class="jw-list mt-12 only-on">' + items + '</div><p class="xs muted mt-12">Jawaban bersifat rahasia dan hanya untuk keperluan layanan BK.</p>',
      foot: '<button class="btn" data-close>Tutup</button><button class="btn" data-act="in-detail-print" title="Seluruh jawaban"><i class="bi bi-printer"></i> Cetak jawaban</button>' + (d.profil && d.profil.kelompok.length ? '<button class="btn" data-act="in-profil-print"><i class="bi bi-file-earmark-person"></i> Cetak profil</button>' : '') + '<button class="btn primary" data-act="in-layanan" data-id="' + esc(d.murid.id) + '" data-n="' + esc(d.murid.nama) + '" data-k="' + esc(d.murid.kelas) + '"><i class="bi bi-heart-pulse"></i> Tindak lanjuti</button>'
    });
  }).catch(fail);
};
function inProfilHtml(d) {
  const p = d.profil;
  if (!p || !p.kelompok.length) return '';
  const tp = p.kelompok[0].tipe;
  return '<div class="card pad mt-12"><div class="row between wrap"><b>Profil' + (p.dominan ? ': dominan ' + esc(p.dominan) : '') + '</b><span class="xs muted">' + esc(tp === 'masalah' ? 'jumlah masalah dicentang per bidang' : TAFSIR_LABEL[d.tafsir] || '') + '</span></div>' +
    '<div class="pf-grid mt-8">' + p.kelompok.map(function (g) {
      const w = katWarna(g.kategori, d.tafsir, g.tipe);
      return '<div class="pf-it"><div class="row between"><span>' + esc(g.kelompok) + '</span><b style="color:' + w + '">' + esc(g.kategori) + '</b></div><div class="bar"><i style="width:' + (g.persen || 0) + '%;background:' + w + '"></i></div><div class="xs muted">' + (g.nilai === null ? '-' : g.tipe === 'masalah' ? g.nilai + ' dari ' + g.dari : 'rata-rata ' + String(g.nilai).replace('.', ',') + ' (1–' + g.dari + ')') + '</div></div>';
    }).join('') + '</div>' +
    (p.rekom.length ? '<div class="mt-12"><b class="xs">Rekomendasi tindak lanjut</b><ul class="xs" style="margin:4px 0 0 18px;padding:0">' + p.rekom.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
}
ACT['jw-filter'] = function (el) {
  const wrap = el.closest('.m-body');
  $$('[data-act=jw-filter]', wrap).forEach(function (b) { b.classList.toggle('active', b === el); });
  $('.jw-list', wrap).classList.toggle('only-on', el.dataset.f === 'on');
};
ACT['in-detail-print'] = function (el) {
  const md = el.closest('.modal'); if (!md) return;
  const judul = $('.m-head h3', md).textContent, sub = ($('.m-head .xs', md) || {}).textContent || '';
  const isi = $('.m-body', md).cloneNode(true);
  $$('.fchips, button, .bi', isi).forEach(function (x) { x.remove(); });
  siapKop().then(function () {
    cetakHtml('<div class="pr-doc pr-jw">' + kopCetak({}) + '<h2 class="pr-title">' + esc(judul.toUpperCase()) + '</h2><div class="pr-sub">' + esc(sub) + '</div>' + isi.innerHTML +
      '<div class="pr-foot">Dokumen rahasia BK · dicetak dari SIKOLAB BK oleh ' + esc(S.user.nama) + ' · ' + esc(fTgl(ymd(new Date()))) + '</div></div>', { judul: judul, ket: 'Jawaban instrumen · A4 tegak' });
  });
};
ACT['in-layanan'] = function (el) {
  closeAllOverlays();
  navigateTo('layanan', { murid: { id: el.dataset.id, nama: el.dataset.n, kelas: el.dataset.k }, sumber: 'Hasil instrumen/asesmen' });
};
ACT['in-ekspor'] = function (el) {
  run(el, api('instrumen.ekspor', { id: P.inhId })).then(function (d) {
    const rows = [[d.judul], []].concat([d.header]).concat(d.rows);
    downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'per_murid_' + d.judul.replace(/[^A-Za-z0-9]+/g, '_').substr(0, 40) + '.csv');
    toast('Data per murid diunduh.');
  }).catch(fail);
};
ACT['in-csv'] = function () {
  const d = P.inh; if (!d) return;
  const rows = [[d.judul], ['Jenis', d.jenis], ['Responden', d.responden + '/' + d.target], [], ['Kelompok', 'Butir', 'Nilai', 'Satuan']];
  d.butir.forEach(function (b) {
    if (b.tipe === 'masalah') rows.push([b.kelompok, b.teks, b.persen, '% murid (' + b.jumlah + ')']);
    else if (b.tipe === 'skala') rows.push([b.kelompok, b.teks, b.rata, 'rata-rata 1-' + b.skalaMaks]);
    else if (b.sebaran) b.sebaran.forEach(function (x) { rows.push([b.kelompok, b.teks + ' — ' + x.label, x.jumlah, 'orang']); });
  });
  if (d.sosio && d.sosio.siswa) { rows.push([], ['Murid', 'Dipilih', 'Ditolak', 'Kategori']); d.sosio.siswa.forEach(function (x) { rows.push([x.nama, x.dipilih, x.ditolak, x.tag.join('; ')]); }); }
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'hasil_' + d.jenis.replace(/\s+/g, '_') + '.csv');
  toast('CSV diunduh.');
};

'use strict';
// ════════════════════════════════════════════════════════════
// Administrasi (F12): data master CRUD, impor, pengaturan, log
// ════════════════════════════════════════════════════════════
const ADM_TABS = [['users', 'Pengguna', 'bi-people'], ['murid', 'Murid', 'bi-mortarboard'], ['kelas', 'Kelas', 'bi-grid-3x3-gap'], ['mapel', 'Mata Pelajaran', 'bi-journal-bookmark'], ['pengampu', 'Pengampu', 'bi-diagram-3'], ['kategori', 'Kategori', 'bi-tags'], ['penugasan', 'Penugasan BK', 'bi-person-gear'], ['tahun', 'Tahun Ajaran', 'bi-calendar-event'], ['kehadiran', 'Kehadiran & Libur', 'bi-qr-code-scan'], ['surat', 'Surat & Cetak', 'bi-file-earmark-text'], ['poin', 'Sistem Poin', 'bi-award'], ['config', 'Pengaturan', 'bi-sliders'], ['log', 'Log akses', 'bi-clock-history']];

PAGES.admin = function (params, tok) {
  return apiC('admin.meta').then(function (meta) {
    if (stale(tok)) return;
    P.ad = { meta: meta, tab: params.tab || 'users', q: '', page: 1, status: '', id_kelas: '', jenis: '' };
    $('#app-container').innerHTML = pageHead('Pengelolaan sistem', 'Administrasi Sistem', 'Kelola pengguna, data master, dan pengaturan. Perubahan dicatat pada log.', '') +
      '<div class="tabs mb-16" id="ad-tabs">' + ADM_TABS.map(function (t) { return '<button class="tab ' + (t[0] === P.ad.tab ? 'active' : '') + '" data-act="ad-tab" data-t="' + t[0] + '"><i class="bi ' + t[2] + '"></i> ' + t[1] + '</button>'; }).join('') + '</div><div id="ad-body"></div>';
    adDraw();
  });
};
ACT['ad-tab'] = function (el) {
  P.ad.tab = el.dataset.t; P.ad.q = ''; P.ad.page = 1; P.ad.status = ''; P.ad.id_kelas = ''; P.ad.jenis = '';
  adDraw();
};
function adDraw() {
  const t = P.ad.tab;
  $$('#ad-tabs .tab').forEach(function (b) { b.classList.toggle('active', b.dataset.t === t); if (b.dataset.t === t && b.scrollIntoView) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* abaikan */ } } });
  if (t === 'penugasan') return adPenugasan();
  if (t === 'tahun') return adTahun();
  if (t === 'config') return adConfig();
  if (t === 'kehadiran') return adKehadiran();
  if (t === 'surat') return adSurat();
  if (t === 'poin') return adPoin();
  if (t === 'log') return adLog();
  const e = P.ad.meta.entities[t];
  const statusF = (t === 'users' || t === 'murid');
  $('#ad-body').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div class="row wrap grow"><div class="search" style="max-width:280px"><i class="bi bi-search"></i><input id="ad-q" type="search" placeholder="Cari ' + esc(e.singular) + '…" value="' + esc(P.ad.q) + '"></div>' +
    (statusF ? '<select class="select" id="ad-st" style="width:auto;min-height:40px"><option value="">Semua status</option><option value="Aktif"' + (P.ad.status === 'Aktif' ? ' selected' : '') + '>Aktif</option><option value="Nonaktif"' + (P.ad.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option>' + (t === 'murid' ? '<option value="Lulus"' + (P.ad.status === 'Lulus' ? ' selected' : '') + '>Lulus</option>' : '') + '</select>' : '') +
    (t === 'murid' ? '<select class="select" id="ad-kl" style="width:auto;min-height:40px"><option value="">Semua kelas</option>' + P.ad.meta.refs.kelas.map(function (k) { return '<option value="' + esc(k.v) + '"' + (P.ad.id_kelas === k.v ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select>' : '') +
    (t === 'kategori' ? '<select class="select" id="ad-jn" style="width:auto;min-height:40px"><option value="">Semua jenis</option><option value="kejadian"' + (P.ad.jenis === 'kejadian' ? ' selected' : '') + '>Kategori kejadian</option><option value="urgensi"' + (P.ad.jenis === 'urgensi' ? ' selected' : '') + '>Tingkat urgensi</option></select>' : '') + '</div>' +
    '<div class="row wrap">' + (e.import ? '<button class="btn" data-act="ad-impor"><i class="bi bi-upload"></i> Impor CSV</button>' : '') + (t === 'pengampu' ? '<button class="btn" data-act="pg-massal"><i class="bi bi-diagram-3"></i> Tambah banyak kelas</button>' : '') + '<button class="btn primary" data-act="ad-baru"><i class="bi bi-plus-lg"></i> Tambah ' + esc(e.singular) + '</button></div></div><div id="ad-list" style="margin-top:12px">' + skeleton(2) + '</div></div>';
  $('#ad-q').addEventListener('input', debounce(function (ev) { P.ad.q = ev.target.value.trim(); P.ad.page = 1; adList(); }, 300));
  ['ad-st', 'ad-kl', 'ad-jn'].forEach(function (id) { const el = $('#' + id); if (el) el.addEventListener('change', function (ev) { P.ad[{ 'ad-st': 'status', 'ad-kl': 'id_kelas', 'ad-jn': 'jenis' }[id]] = ev.target.value; P.ad.page = 1; adList(); }); });
  adList();
}
function adCell(f, r) {
  const v = r[f.k];
  if (f.k === 'status_aktif') return '<span class="chip ' + (v === 'Aktif' ? 'st-Dipantau' : 'st-Selesai') + '">' + esc(v) + '</span>';
  if (r.disp && r.disp[f.k] !== undefined && (f.type === 'ref' || f.type === 'multi')) return esc(r.disp[f.k] || '—');
  if (f.k === 'jenis') return '<span class="chip neutral">' + (v === 'urgensi' ? 'Urgensi' : 'Kejadian') + '</span>';
  return esc(v === '' ? '—' : v);
}
function adList() {
  const t = P.ad.tab, e = P.ad.meta.entities[t];
  apiC('admin.list', { entity: t, q: P.ad.q, page: P.ad.page, status: P.ad.status, id_kelas: P.ad.id_kelas, jenis: P.ad.jenis }).then(function (r) {
    P.ad.rows = r.rows;
    const cols = e.cols.map(function (k) { return e.fields.filter(function (f) { return f.k === k; })[0]; }).filter(Boolean);
    $('#ad-list').innerHTML = r.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (f) { return '<th>' + esc(f.label) + '</th>'; }).join('') + '<th style="text-align:right">Aksi</th></tr></thead><tbody>' + r.rows.map(function (row, i) {
      return '<tr>' + cols.map(function (f, ci) { return '<td' + (ci === 0 ? ' class="fw6"' : '') + '>' + adCell(f, row) + '</td>'; }).join('') + '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="ad-edit" data-i="' + i + '"><i class="bi bi-pencil"></i> Ubah</button> ' + (t === 'users' ? '<button class="btn sm" data-act="ad-pin" data-i="' + i + '" title="Atur ulang PIN"><i class="bi bi-key"></i></button> ' : '') + '<button class="btn sm soft-danger" data-act="ad-hapus" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-' + (t === 'users' || t === 'murid' ? 'person-x' : 'trash3') + '"></i></button></td></tr>';
    }).join('') + '</tbody></table></div>' + pager(r, 'ad-page') : empty('bi-database', 'Belum ada data', 'Gunakan tombol Tambah di atas.');
  }).catch(function (er) { $('#ad-list').innerHTML = errBox(er); });
}
ACT['ad-page'] = function (el) { P.ad.page = +el.dataset.page; adList(); };

function adForm(row) {
  const t = P.ad.tab, e = P.ad.meta.entities[t], refs = P.ad.meta.refs;
  const fields = e.fields.map(function (f) {
    const o = { name: f.k, label: f.label, req: f.req, max: f.max, type: f.type, hint: f.hint, value: row ? row[f.k] : (f.k === 'status_aktif' ? 'Aktif' : (f.k === 'tahun_ajaran' ? S.cfg.tahunAjaran : '')) };
    if (f.type === 'select') { o.opts = f.opts.map(function (x) { return { v: x.v, l: x.l }; }); }
    if (f.type === 'ref') { o.type = 'select'; o.opts = (refs[f.ref] || []).slice(); o.blank = f.req ? 'Pilih…' : undefined; }
    if (f.type === 'multi') { o.opts = f.opts; }
    if (f.type === 'tel') { o.type = 'tel'; o.inputmode = 'tel'; }
    if (f.type === 'number') { o.type = 'number'; o.inputmode = 'numeric'; }
    if (f.pattern) o.pattern = f.pattern;
    if (f.lockEdit && row) o.ro = true;
    if (f.type === 'ref' && row && row[f.k] && !o.opts.some(function (x) { return x.v === row[f.k]; })) o.opts.push({ v: row[f.k], l: (row.disp && row.disp[f.k]) || row[f.k] });
    return fld(o);
  }).join('');
  const pinField = (t === 'users' && !row) ? fld({ name: 'pin', label: 'PIN awal (opsional)', type: 'password', max: 6, inputmode: 'numeric', hint: '6 digit. Kosongkan untuk membuat PIN acak yang ditampilkan sekali.', ac: 'new-password' }) : '';
  const m = openModal({
    title: (row ? 'Ubah ' : 'Tambah ') + e.singular, size: 'lg',
    body: '<form id="f-ad" class="form-grid c2" novalidate>' + fields + pinField + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="ad-ok">Simpan</button>'
  });
  $('#ad-ok', m.el).addEventListener('click', function (ev) {
    const f = $('#f-ad', m.el), d = formData(f);
    const rules = {};
    e.fields.forEach(function (fl) {
      const r = { label: fl.label, req: fl.req };
      if (fl.type === 'email') { r.re = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/; r.msg = fl.label + ' tidak valid.'; }
      if (fl.pattern) { try { r.re = new RegExp(fl.pattern); r.msg = fl.label + ' tidak sesuai format' + (fl.hint ? ' (' + fl.hint + ')' : '') + '.'; } catch (x) { } }
      if (fl.type === 'tel') { r.re = /^[0-9+\-\s()]{8,20}$/; r.msg = 'Nomor tidak valid.'; }
      rules[fl.k] = r;
    });
    if (d.pin) rules.pin = { re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.' };
    if (!validate(f, d, rules)) return;
    d.entity = t; if (row) d.id = row.id;
    run(ev.currentTarget, api('admin.simpan', d)).then(function (r) {
      m.close(); toast('Data tersimpan.'); adList();
      if (r.pinBaru && !row) showPin(d.nama, d.email, r.pinBaru);
      if (t === 'kelas' || t === 'mapel') api('boot').then(function (b) { S.refs = b.refs; }).catch(function () { });
    }).catch(fail);
  });
}
function showPin(nama, email, pin) {
  openModal({ title: 'PIN akun', sub: nama + ' · ' + email, body: '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>PIN ini hanya ditampilkan <b>sekali</b>. Sampaikan kepada pengguna secara langsung. Pengguna akan diminta <b>membuat PIN sendiri</b> saat masuk pertama kali.</div></div><div style="font:800 40px var(--font-h);letter-spacing:.3em;text-align:center;margin:20px 0" id="pin-val">' + esc(pin) + '</div>', foot: '<button class="btn" data-close>Selesai</button><button class="btn primary" data-act="pin-copy"><i class="bi bi-clipboard"></i> Salin PIN</button>' });
}
ACT['pin-copy'] = function () {
  const t = ($('#pin-val') || {}).textContent || '';
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('PIN disalin.'); }, function () { toast('Salin manual dari layar.', 'warn'); });
  else toast('Salin manual dari layar.', 'warn');
};
ACT['ad-baru'] = function () { adForm(null); };
// ── Penugasan pengampu massal ──
ACT['pg-massal'] = function () {
  const refs = P.ad.meta.refs;
  const opt = function (a) { return a.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join(''); };
  const m = openModal({
    title: 'Tugaskan guru ke banyak kelas', sub: 'Pilih guru dan mata pelajaran, lalu centang semua kelas yang diampu. Penugasan yang sudah ada dilewati.', size: 'lg',
    body: '<div class="form-grid c2"><div class="field"><label for="pm-guru">Guru</label><select class="select" id="pm-guru"><option value="">Pilih guru…</option>' + opt(refs.guru) + '</select></div>' +
      '<div class="field"><label for="pm-mapel">Mata pelajaran</label><select class="select" id="pm-mapel"><option value="">Pilih mata pelajaran…</option>' + opt(refs.mapel) + '</select></div></div>' +
      '<div id="pm-kelas" class="mt-16"><div class="muted xs">Pilih guru dan mata pelajaran terlebih dahulu.</div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pm-ok" disabled>Simpan penugasan</button>'
  });
  const muat = function () {
    const g = $('#pm-guru', m.el).value, mp = $('#pm-mapel', m.el).value;
    if (!g || !mp) { $('#pm-ok', m.el).disabled = true; return; }
    apiC('admin.pengampuInfo', { email_guru: g, id_mapel: mp }).then(function (r) {
      const grup = {};
      r.kelas.forEach(function (k) { (grup[k.t] = grup[k.t] || []).push(k); });
      $('#pm-kelas', m.el).innerHTML = Object.keys(grup).sort(function (a, b) { return a - b; }).map(function (t) {
        return '<div class="pm-grup"><div class="row" style="justify-content:space-between"><b>' + (+t ? 'Tingkat ' + t : 'Kelas lain') + '</b><label class="check xs"><input type="checkbox" data-pm-all="' + t + '"> Pilih semua</label></div><div class="pm-chips">' +
          grup[t].map(function (k) { return '<label class="check pm-chip' + (k.ada ? ' on' : '') + '"><input type="checkbox" name="pmk" value="' + esc(k.v) + '" data-t="' + t + '"' + (k.ada ? ' checked disabled' : '') + '> ' + esc(k.l) + (k.ada ? ' <em class="xs muted">(sudah)</em>' : '') + '</label>'; }).join('') + '</div></div>';
      }).join('') || '<div class="muted xs">Belum ada kelas. Tambahkan kelas terlebih dahulu.</div>';
      $('#pm-ok', m.el).disabled = false;
    }).catch(fail);
  };
  $('#pm-guru', m.el).addEventListener('change', muat);
  $('#pm-mapel', m.el).addEventListener('change', muat);
  m.el.addEventListener('change', function (ev) {
    const a = ev.target.getAttribute && ev.target.getAttribute('data-pm-all');
    if (a !== null && a !== undefined) $$('input[name=pmk][data-t="' + a + '"]:not(:disabled)', m.el).forEach(function (c) { c.checked = ev.target.checked; });
  });
  $('#pm-ok', m.el).addEventListener('click', function (ev) {
    const ids = $$('input[name=pmk]:checked:not(:disabled)', m.el).map(function (c) { return c.value; });
    if (!ids.length) { toast('Centang minimal satu kelas baru.', 'warn'); return; }
    run(ev.currentTarget, api('admin.pengampuMassal', { email_guru: $('#pm-guru', m.el).value, id_mapel: $('#pm-mapel', m.el).value, kelas: ids })).then(function (r) {
      m.close(); toast(r.ditambah + ' penugasan ditambahkan' + (r.sudahAda ? ', ' + r.sudahAda + ' sudah ada.' : '.')); adList();
    }).catch(fail);
  });
};

ACT['ad-edit'] = function (el) { adForm(P.ad.rows[+el.dataset.i]); };
ACT['ad-hapus'] = function (el) {
  const row = P.ad.rows[+el.dataset.i], t = P.ad.tab;
  const soft = (t === 'users' || t === 'murid');
  const nm = row.nama || row.nama_kelas || row.nama_mapel || (row.disp && row.disp.email_guru) || 'data ini';
  confirmDlg((soft ? 'Nonaktifkan ' : 'Hapus ') + nm + '?' + (soft ? ' Riwayat tetap tersimpan dan akun tidak dapat masuk.' : ''), soft ? 'Nonaktifkan' : 'Hapus', true).then(function (ok) {
    if (!ok) return;
    api('admin.hapus', { entity: t, id: row.id }).then(function (r) { toast(r.pesan); adList(); }).catch(fail);
  });
};
ACT['ad-pin'] = function (el) {
  const row = P.ad.rows[+el.dataset.i];
  confirmDlg('Atur ulang PIN untuk ' + row.nama + '? PIN lama tidak berlaku lagi.', 'Atur ulang', false).then(function (ok) {
    if (!ok) return;
    api('admin.setPin', { id: row.id }).then(function (r) { showPin(r.nama, r.email, r.pin); adList(); }).catch(fail);
  });
};

// ── Impor murid ──
const CSV_TEMPLATE = 'nis,nama,kelas,jk,nama_ortu,no_wa_ortu,email_ortu\n20261001,Contoh Murid Satu,X-MIPA 1,L,Bpk. Contoh,081234567890,\n20261002,Contoh Murid Dua,X-MIPA 1,P,Ibu Contoh,081234567891,ortu@contoh.com\n';
ACT['ad-impor'] = function () {
  const m = openModal({
    title: 'Impor murid dari CSV', size: 'lg',
    body: '<div class="note info"><i class="bi bi-info-circle"></i><div>Kolom: <span class="mono">nis, nama, kelas, jk (L/P), nama_ortu, no_wa_ortu, email_ortu</span>. Nama kelas harus sudah ada. NIS yang sudah terdaftar akan <b>diperbarui</b>, NIS baru ditambahkan.</div></div>' +
      '<div class="row wrap mt-12"><input type="file" id="csv-file" accept=".csv,text/csv,text/plain" class="input" style="max-width:320px"><button class="btn sm" data-act="csv-tpl"><i class="bi bi-download"></i> Unduh templat</button></div>' +
      '<div class="field mt-12"><label for="csv-text">Atau tempel isi CSV</label><textarea id="csv-text" class="textarea mono" rows="8" placeholder="nis,nama,kelas,jk,..."></textarea></div><div id="csv-res" class="mt-12"></div>',
    foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" id="csv-ok"><i class="bi bi-upload"></i> Impor</button>'
  });
  $('#csv-file', m.el).addEventListener('change', function (e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 400000) { toast('Berkas terlalu besar (maks. ± 1.000 baris).', 'err'); e.target.value = ''; return; }
    const fr = new FileReader(); fr.onload = function () { $('#csv-text', m.el).value = String(fr.result).replace(/^﻿/, ''); }; fr.readAsText(f);
  });
  $('#csv-ok', m.el).addEventListener('click', function (e) {
    const csv = $('#csv-text', m.el).value;
    if (!csv.trim()) { toast('Pilih berkas atau tempel data CSV.', 'warn'); return; }
    run(e.currentTarget, api('admin.impor', { csv: csv })).then(function (r) {
      $('#csv-res', m.el).innerHTML = '<div class="note ' + (r.totalGagal ? '' : 'info') + '"><i class="bi bi-clipboard-check"></i><div><b>' + r.tambah + '</b> murid ditambahkan, <b>' + r.ubah + '</b> diperbarui' + (r.totalGagal ? ', <b>' + r.totalGagal + '</b> baris dilewati:' : '.') + (r.gagal.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + r.gagal.map(function (g) { return '<li>Baris ' + g.baris + ': ' + esc(g.pesan) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
      adList();
    }).catch(fail);
  });
};
ACT['csv-tpl'] = function () { downloadBlob(new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'templat_murid.csv'); };

// ── Pengaturan sistem ──
function adConfig() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('admin.config.get').then(function (r) {
    const c = r.config; P.waAda = r.wa.adaToken;
    $('#ad-body').innerHTML = '<div class="grid g-2"><div class="card pad"><h3>Identitas & akademik</h3><form id="f-cfg" class="form-grid c2 mt-12" novalidate>' +
      fld({ name: 'nama_sekolah', label: 'Nama sekolah', req: true, max: 120, value: c.nama_sekolah }) + fld({ name: 'kota', label: 'Kota (untuk surat)', max: 60, value: c.kota }) +
      fld({ name: 'alamat_sekolah', label: 'Alamat', max: 200, value: c.alamat_sekolah }) + '<div></div>' +
      fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, value: c.tahun_ajaran, hint: 'Format 2026/2027', max: 9 }) + fld({ name: 'semester', label: 'Semester', type: 'select', value: c.semester, opts: ['Ganjil', 'Genap'] }) +
      fld({ name: 'logo_url', label: 'Tautan logo (opsional)', type: 'url', max: 200, value: c.logo_url, hint: 'Lebih mudah: unggah logo sekolah di tab Surat & Cetak (logo kanan), otomatis dipakai di seluruh aplikasi. Tautan Google Drive juga diterima bila dibagikan "Siapa saja yang memiliki link".' }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'url_frontend', label: 'Alamat frontend GitHub Pages (opsional)', type: 'url', max: 200, value: c.url_frontend, ph: 'https://namaanda.github.io/sikolab/', hint: 'Bila diisi, tautan instrumen, formulir bertemu BK, email, dan WhatsApp mengarah ke alamat ini. Kosongkan bila hanya memakai alamat /exec.' }) + '</div>' + '<div></div>' +
      fld({ name: 'batas_koreksi_absensi', label: 'Batas koreksi absensi (jam)', type: 'number', inputmode: 'numeric', value: c.batas_koreksi_absensi, hint: '1–168 jam' }) + fld({ name: 'ambang_pola_bolos', label: 'Ambang deteksi pola', type: 'number', inputmode: 'numeric', value: c.ambang_pola_bolos, hint: '2–10 kejadian berulang' }) + fld({ name: 'jam_maks', label: 'Jam pelajaran per hari', type: 'number', inputmode: 'numeric', value: c.jam_maks, hint: '4–16. Menentukan pilihan jam mulai dan jumlah JP pada absensi.' }) +
      fld({ name: 'ambang_kejadian_berulang', label: 'Ambang kejadian berulang', type: 'number', inputmode: 'numeric', value: c.ambang_kejadian_berulang, hint: 'Murid dilaporkan sekian kali dalam 30 hari ditandai berulang' }) + fld({ name: 'notif_bk_semua', label: 'Email ke Guru BK untuk setiap laporan', type: 'select', value: c.notif_bk_semua === '0' ? '0' : '1', opts: [{ v: '1', l: 'Ya, setiap laporan dan pembinaan awal guru' }, { v: '0', l: 'Hanya laporan mendesak dan rujukan' }] }) +
      '<div style="grid-column:1/-1" class="note info"><i class="bi bi-file-earmark-text"></i><div class="xs">Kop surat, logo, nama & NIP Kepala Sekolah, format nomor surat, ukuran kertas, dan jenis huruf diatur di tab <a href="#" data-act="ad-tab" data-t="surat">Surat &amp; Cetak</a>.</div></div>' +
      fld({ name: 'konseling_terbatas', label: 'Akses catatan konseling', type: 'select', value: c.konseling_terbatas === '1' ? '1' : '0', opts: [{ v: '0', l: 'Semua Guru BK sekolah ini' }, { v: '1', l: 'Hanya Guru BK penanggung jawab kasus' }], hint: 'Berlaku bila sekolah memiliki lebih dari satu Guru BK.' }) + '<div></div>' +
      '<div style="grid-column:1/-1" class="form-grid">' + fld({ name: 'templat_wa_undangan', label: 'Templat WhatsApp: undangan', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_undangan }) + fld({ name: 'templat_wa_absen', label: 'Templat WhatsApp: ketidakhadiran', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_absen }) + fld({ name: 'templat_wa_jadwal', label: 'Templat WhatsApp: jadwal pertemuan', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_jadwal, hint: 'Variabel: {nama_ortu} {nama_murid} {kelas} {sekolah} {pengirim} {tanggal}' }) + '</div></form><div class="row mt-16" style="justify-content:flex-end"><button class="btn primary" data-act="cfg-save"><i class="bi bi-check-lg"></i> Simpan pengaturan</button></div></div>' +
      '<div class="col gap-16"><div class="card pad"><h3>Data & penyimpanan</h3><p class="muted mt-8" style="margin-top:4px">Basis data berupa Google Sheets dan berkas di Google Drive milik akun pemilik aplikasi.</p><div class="col mt-12">' + (r.links.spreadsheet ? '<a class="btn" href="' + esc(r.links.spreadsheet) + '" target="_blank" rel="noopener"><i class="bi bi-file-earmark-spreadsheet"></i> Buka Spreadsheet</a>' : '') + (r.links.folder ? '<a class="btn" href="' + esc(r.links.folder) + '" target="_blank" rel="noopener"><i class="bi bi-folder2-open"></i> Buka folder Drive</a>' : '') + '<button class="btn" data-act="cfg-backup"><i class="bi bi-cloud-arrow-up"></i> Buat cadangan sekarang</button></div></div>' +
      '<div class="card pad" id="pem-card"><h3>Pemeliharaan</h3><div id="pem-body" class="mt-8">' + skeleton(1) + '</div></div>' +
      waCardHtml(r.wa) + '<div class="card pad"><h3>Keamanan</h3><ul class="muted-2" style="margin:8px 0 0;padding-left:18px;line-height:22px"><li>Hak akses ditegakkan di server pada setiap permintaan.</li><li>PIN disimpan sebagai hash; 5 kali salah mengunci akun (15 menit, lalu 1 jam, lalu 4 jam) dan admin diberi tahu.</li><li>PIN dari admin wajib diganti pengguna saat masuk pertama kali.</li><li>Isi konseling hanya dapat dibuka Guru BK dan setiap pembukaan dicatat.</li><li>Cadangan harian otomatis (bila trigger dipasang).</li></ul></div></div></div>';
    }).then(pemuat).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function adPenugasan() {
  $('#ad-body').innerHTML = skeleton(3);
  Promise.all([apiC('admin.kasusAktif'), apiC('bk.daftar')]).then(function (r) {
    const rows = r[0], bks = r[1];
    $('#ad-body').innerHTML = '<div class="card"><div class="card-head"><div><h3>Penugasan Guru BK pada kasus aktif</h3><div class="xs muted" style="margin-top:2px">Admin hanya melihat kode kasus, kelas, dan kategori, tanpa nama murid dan tanpa isi konseling. Gunakan saat Guru BK cuti atau berhalangan.</div></div></div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kasus</th><th>Kelas</th><th>Kategori</th><th>Status</th><th>Penanggung jawab</th><th>Alihkan ke</th></tr></thead><tbody>' + rows.map(function (x) {
        return '<tr><td class="mono">' + esc(x.kode) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(x.kategori) + '</td><td>' + chipStatus(x.status) + '</td><td>' + esc(x.penangani_nama || '—') + '</td><td><select class="select" data-pen="' + esc(x.id) + '" style="min-height:36px;min-width:160px"><option value="">Pilih Guru BK…</option>' + bks.map(function (b) { return '<option value="' + esc(b.email) + '"' + (b.email === x.penangani ? ' selected' : '') + '>' + esc(b.nama) + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>' : empty('bi-inbox', 'Tidak ada kasus aktif')) + '</div>';
    $$('[data-pen]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        sel.disabled = true;
        api('kasus.alihkan', { id: sel.dataset.pen, email: sel.value }).then(function (res) { toast('Kasus kini ditangani ' + res.penangani + '.'); adPenugasan(); }).catch(function (e) { fail(e); adPenugasan(); });
      });
    });
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function pemuat() {
  return apiC('admin.pemeliharaan').then(function (s) {
    const b = $('#pem-body'); if (!b) return;
    b.innerHTML = '<div class="col gap-8">' +
      '<div class="row between wrap"><span>Pengingat & cadangan otomatis</span>' + (s.trigger ? '<span class="chip st-Selesai">Aktif</span>' : '<button class="btn sm" data-act="pem-trigger"><i class="bi bi-alarm"></i> Pasang sekarang</button>') + '</div>' +
      (s.contohAda ? '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>Masih ada <b>data contoh</b> (akun, murid, kelas). Hapus sebelum dipakai sungguhan.</div></div><button class="btn soft-danger" data-act="pem-contoh"><i class="bi bi-trash3"></i> Hapus data contoh</button>' : '<div class="xs muted"><i class="bi bi-check-circle"></i> Tidak ada data contoh.</div>') +
      '<div class="row between wrap"><span>Surat & PDF bermasalah?</span><button class="btn sm" data-act="pem-diag"><i class="bi bi-file-earmark-check"></i> Periksa fitur surat</button></div>' +
      '<div class="row between wrap"><span>Mengubah data langsung di Spreadsheet?</span><button class="btn sm" data-act="pem-segar"><i class="bi bi-arrow-clockwise"></i> Segarkan data</button></div>' +
      (s.pemilik ? '' : '<div class="xs muted">Hapus data contoh dan pasang pengingat hanya bisa dilakukan saat Anda membuka aplikasi dari akun Google pemilik proyek.</div>') + '</div>';
  });
}
ACT['pem-diag'] = function (el) {
  run(el, api('admin.diagSurat')).then(function (r) {
    openModal({ title: 'Pemeriksaan fitur surat & PDF', sub: r.semuaOk ? 'Semua langkah berhasil' : 'Ada langkah yang gagal: lihat tanda merah', size: 'md',
      body: '<div class="col gap-8">' + r.langkah.map(function (x) { return '<div class="row" style="gap:10px;align-items:flex-start"><span class="chip ' + (x.ok ? 'st-Selesai' : 'st-Baru') + '">' + (x.ok ? 'OK' : 'Gagal') + '</span><div><b>' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.pesan) + '</div></div></div>'; }).join('') + '</div>' +
        (r.semuaOk ? '' : '<div class="note mt-12"><i class="bi bi-info-circle"></i><div class="xs">Kirim tangkapan layar ini kepada pengembang. Bila gagal pada "Membuat Google Docs", buka editor Apps Script, jalankan fungsi apa saja sekali, lalu setujui izin yang diminta.</div></div>'),
      foot: '<button class="btn primary" data-close>Tutup</button>' });
  }).catch(fail);
};
ACT['pem-segar'] = function (el) { run(el, api('admin.segarkan')).then(function () { ccClear(); try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sk_boot') === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ } toast('Data dimuat ulang dari Spreadsheet.'); }).catch(fail); };
ACT['pem-trigger'] = function (el) { run(el, api('admin.pasangTrigger')).then(function () { toast('Pengingat & cadangan otomatis terpasang.'); return pemuat(); }).catch(fail); };
ACT['pem-contoh'] = function (el) {
  confirmDlg('Semua akun, kelas, murid, absensi dan kasus contoh akan dihapus permanen. Data yang Anda buat sendiri tidak terpengaruh. Lanjutkan?', 'Hapus data contoh', true, 'Hapus').then(function (ok) {
    if (!ok) return;
    run(el, api('admin.hapusContoh')).then(function (r) { toast(r.dibuang + ' baris data contoh dihapus.'); return pemuat(); }).catch(fail);
  });
};
ACT['cfg-save'] = function (el) {
  const f = $('#f-cfg'), d = formData(f);
  const ok = validate(f, d, {
    nama_sekolah: { label: 'Nama sekolah', req: true }, tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' },
    batas_koreksi_absensi: { label: 'Batas koreksi', req: true, fn: function (v) { const n = +v; return n >= 1 && n <= 168 ? '' : 'Isi 1–168.'; } },
    ambang_pola_bolos: { label: 'Ambang', req: true, fn: function (v) { const n = +v; return n >= 2 && n <= 10 ? '' : 'Isi 2–10.'; } },
    jam_maks: { label: 'Jam pelajaran per hari', req: true, fn: function (v) { const n = +v; return n >= 4 && n <= 16 ? '' : 'Isi 4–16.'; } },
    ambang_kejadian_berulang: { label: 'Ambang berulang', req: true, fn: function (v) { const n = +v; return n >= 2 && n <= 10 ? '' : 'Isi 2–10.'; } },
    logo_url: { label: 'URL logo', re: /^https:\/\/\S+$/i, msg: 'Harus diawali https://' },
    url_frontend: { label: 'Alamat frontend', re: /^https:\/\/\S+$/i, msg: 'Harus diawali https://' }
  });
  if (!ok) return;
  run(el, api('admin.config.simpan', { config: d })).then(function () {
    toast('Pengaturan tersimpan.');
    return api('boot').then(function (b) { S.cfg = b.config; S.refs = b.refs; renderShell(); setNavActive('admin'); });
  }).catch(fail);
};
ACT['cfg-backup'] = function (el) { run(el, api('admin.backup')).then(function (r) { toast('Cadangan dibuat: ' + r.nama); }).catch(fail); };

function adLog() {
  $('#ad-body').innerHTML = skeleton(3);
  api('admin.log').then(function (rows) {
    if (!$('#ad-body')) return;
    $('#ad-body').innerHTML = '<div class="card"><div class="card-head"><div><h3>Log aktivitas</h3><div class="xs muted">100 catatan terakhir (akses data sensitif, perubahan, penolakan)</div></div><button class="btn sm" data-act="log-reload"><i class="bi bi-arrow-clockwise"></i></button></div>' + (rows.length ? '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Modul</th><th>ID data</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td class="xs" style="white-space:nowrap">' + esc(String(r.ts).replace('T', ' ')) + '</td><td class="xs">' + esc(r.email) + '</td><td><span class="chip neutral">' + esc(r.aksi) + '</span></td><td class="xs">' + esc(r.modul) + '</td><td class="mono muted">' + esc(String(r.id).substr(0, 18)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('bi-clock-history', 'Belum ada catatan')) + '</div>';
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
ACT['log-reload'] = adLog;

'use strict';
// ════════════════════════════════════════════════════════════
// Kelas Saya (wali kelas) — ringkas: kondisi tiap murid perwalian + kontak orang tua
// ════════════════════════════════════════════════════════════
PAGES.kelas = function (params, tok) {
  return apiC('kelas.saya', { id_kelas: params.id_kelas || P.ksKelas || '' }).then(function (d) {
    if (stale(tok)) return;
    P.kls = d; P.ksKelas = d.idKelas;
    if (!d.kelas.length) { $('#app-container').innerHTML = pageHead('Wali kelas', 'Kelas Saya', '', '') + '<div class="card pad">' + empty('bi-people', 'Anda belum ditetapkan sebagai wali kelas', 'Minta admin mengisi wali kelas pada menu Administrasi → Kelas.') + '</div>'; return; }
    const r = d.ringkas, hh = r.harianHariIni;
    let h = pageHead('Wali kelas', 'Kelas ' + d.nama, 'Pantau kondisi setiap murid perwalian. Ketuk nama murid untuk melihat garis waktunya.' + (d.guruBk ? ' Guru BK kelas: ' + d.guruBk + '.' : ''),
      (d.kelas.length > 1 ? '<select class="select" id="kls-sel" style="width:auto;min-height:40px">' + d.kelas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === d.idKelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select>' : '') +
      (S.cfg.qrAktif ? '<button class="btn" data-act="kartu-modal" data-kelas="' + esc(d.idKelas) + '"><i class="bi bi-qr-code"></i> Kartu QR</button>' : '') + '<button class="btn" data-act="ke-harian"><i class="bi bi-calendar-check"></i> Absensi harian</button>');
    h += '<div class="grid g-kpi k4">' + [
      ['teal', 'bi-people', 'Murid Aktif', r.murid, 'di kelas ini'],
      [hh ? 'blue' : 'amber', 'bi-calendar-check', 'Hari Ini', r.libur ? 'Libur' : hh ? hh.hadir + '/' + r.murid : r.harianQr ? r.harianQr + '/' + r.murid : 'Belum', r.libur ? r.libur : hh ? 'S ' + hh.S + ' · I ' + hh.I + ' · A ' + hh.A : r.harianQr ? 'sudah memindai kartu · lengkapi' : 'absensi harian belum dicatat'],
      ['indigo', 'bi-graph-up-arrow', 'Kehadiran 30 Hari', r.hadir30 === null ? '-' : r.hadir30 + '%', 'dari absensi harian'],
      ['rose', 'bi-exclamation-triangle', 'Perlu Perhatian', r.perhatian, r.poinAktif ? 'pola, kasus, alpa ≥ 3, atau tahap poin' : 'pola, kasus aktif, atau alpa ≥ 3']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    if (r.tanpaKontak) h += '<div class="note mt-16"><i class="bi bi-telephone"></i><div><b>' + r.tanpaKontak + ' murid</b> belum memiliki nomor WhatsApp orang tua yang valid. Lengkapi lewat tombol <b>Kontak</b> agar komunikasi lebih mudah.</div></div>';
    h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap"><div class="fchips" id="kls-f"><button class="fchip active" data-act="kls-f" data-f="">Semua</button><button class="fchip" data-act="kls-f" data-f="perhatian">Perlu perhatian</button><button class="fchip" data-act="kls-f" data-f="kontak">Kontak belum lengkap</button></div><div class="search" style="max-width:240px"><i class="bi bi-search"></i><input id="kls-q" type="search" placeholder="Cari murid…"></div></div>' +
      '<div class="tbl-wrap mt-12"><table class="tbl" id="kls-tbl" style="min-width:' + (r.poinAktif ? 980 : 860) + 'px"><thead><tr><th>Murid</th><th>Kehadiran 30 hr</th><th>S / I / A / T</th><th>Alpa mapel</th><th>Kasus aktif</th>' + (r.poinAktif ? '<th>Poin</th>' : '') + '<th>Layanan BK</th><th>Orang tua</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      d.murid.map(function (m, i) {
        const perhatian = m.pola || m.kasus || m.A >= 3 || !!m.poinTahap;
        return '<tr data-q="' + esc((m.nama + ' ' + m.nis).toLowerCase()) + '" data-p="' + (perhatian ? 1 : 0) + '" data-k="' + (m.hpValid ? 1 : 0) + '"><td class="click" data-act="open-murid" data-id="' + esc(m.id) + '" style="cursor:pointer"><div class="fw6">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + '</div>' + (m.pola ? '<div class="mt-8">' + chipLevel(m.pola) + ' <span class="xs muted">' + esc(m.polaTeks) + '</span></div>' : '') + '</td>' +
          '<td>' + (m.hadir === null ? '<span class="muted">—</span>' : '<div class="row"><div class="bar" style="width:70px"><i style="width:' + m.hadir + '%"></i></div><b class="xs">' + m.hadir + '%</b></div>') + '</td>' +
          '<td class="xs">' + m.S + ' / ' + m.I + ' / <b' + (m.A ? ' style="color:var(--rose)"' : '') + '>' + m.A + '</b> / ' + m.T + '</td><td' + (m.alpaMapel ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + m.alpaMapel + '</td>' +
          '<td>' + (m.kasus ? '<span class="chip st-Diproses">' + m.kasus + ' aktif</span>' : '<span class="muted">—</span>') + (m.laporan30 ? '<div class="xs muted">' + m.laporan30 + ' laporan / 30 hr</div>' : '') + '</td>' + (r.poinAktif ? '<td class="click" data-act="pn-murid" data-id="' + esc(m.id) + '" style="cursor:pointer">' + (m.poin ? '<b>' + m.poin + '</b>' + (m.poinTahap ? '<div class="mt-8"><span class="chip st-Eskalasi">' + esc(m.poinTahap) + '</span></div>' : '') : '<span class="muted">0</span>') + '</td>' : '') + '<td>' + (m.layanan ? m.layanan : '<span class="muted">—</span>') + '</td>' +
          '<td class="xs">' + (m.ortu ? esc(m.ortu) + '<br>' : '') + (m.hpValid ? '<span style="color:var(--teal)"><i class="bi bi-whatsapp"></i> ' + esc(m.hp) + '</span>' : '<span class="chip st-Baru">Belum ada</span>') + (m.kontak ? '<div class="muted">Kontak terakhir ' + esc(fTgl(m.kontak)) + '</div>' : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="kls-kontak" data-i="' + i + '">Kontak</button> <button class="btn sm blue" data-act="wa-murid" data-id="' + esc(m.id) + '" title="WhatsApp orang tua"><i class="bi bi-whatsapp"></i></button> <button class="btn sm" data-act="lap-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '" title="Lapor kejadian"><i class="bi bi-plus-circle"></i></button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<p class="xs muted mt-12">Layanan BK = jumlah layanan umum (mis. bimbingan klasikal/kelompok) yang diikuti. Isi konseling tetap rahasia dan hanya dibuka Guru BK.</p><div id="kls-profil"></div>';
    $('#app-container').innerHTML = h;
    klsProfil(d.idKelas);
    const sel = $('#kls-sel'); if (sel) sel.addEventListener('change', function (e) { navigateTo('kelas', { id_kelas: e.target.value }); });
    $('#kls-q').addEventListener('input', klsFilter);
  });
};
function klsFilter() {
  const q = ($('#kls-q').value || '').trim().toLowerCase(), f = P.klsF || '';
  $$('#kls-tbl tbody tr').forEach(function (tr) {
    let ok = !q || tr.dataset.q.indexOf(q) >= 0;
    if (f === 'perhatian') ok = ok && tr.dataset.p === '1';
    if (f === 'kontak') ok = ok && tr.dataset.k === '0';
    tr.classList.toggle('hide', !ok);
  });
}
ACT['kls-f'] = function (el) { P.klsF = el.dataset.f; $$('#kls-f .fchip').forEach(function (b) { b.classList.toggle('active', b === el); }); klsFilter(); };
ACT['kls-kontak'] = function (el) {
  const x = P.kls.murid[+el.dataset.i];
  const m = openModal({
    title: 'Kontak orang tua', sub: x.nama,
    body: '<form id="f-kk" class="form-grid" novalidate>' + fld({ name: 'nama_ortu', label: 'Nama orang tua/wali', max: 100, value: x.ortu }) + fld({ name: 'no_wa_ortu', label: 'No. WhatsApp', type: 'tel', inputmode: 'tel', max: 20, value: x.hp, ph: '0812xxxxxxx' }) + fld({ name: 'email_ortu', label: 'Email (opsional)', type: 'email', max: 120, value: x.email }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="kk-ok">Simpan</button>'
  });
  $('#kk-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-kk', m.el), d = formData(f);
    if (!validate(f, d, { no_wa_ortu: { label: 'No. WhatsApp', re: /^[0-9+\-\s()]{8,20}$/, msg: 'Nomor tidak valid.' }, email_ortu: { label: 'Email', re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Email tidak valid.' } })) return;
    d.id_murid = x.id;
    run(e.currentTarget, api('kelas.ortuSimpan', d)).then(function () { m.close(); toast('Kontak orang tua tersimpan.'); navigateTo('kelas', { id_kelas: P.kls.idKelas }, true); }).catch(fail);
  });
};

// ════════════════════════════════════════════════════════════
// Panduan penggunaan per peran (menu Panduan)
// ════════════════════════════════════════════════════════════
const GUIDE = {
  umum: {
    judul: 'Mulai di sini', ikon: 'bi-info-circle',
    intro: 'SIKOLAB BK menghubungkan guru mata pelajaran, wali kelas, Guru BK, Waka Kesiswaan, dan Kepala Sekolah dalam satu alur pendampingan murid. Aplikasi ini bukan buku catatan pelanggaran. Tujuannya membantu murid lebih awal, terdokumentasi, dan dengan kerahasiaan yang terjaga.',
    tugas: [
      'Masuk dengan email dan PIN 6 digit dari admin. Pada login pertama Anda wajib mengganti PIN.',
      'Bila Anda memegang lebih dari satu peran (misalnya guru mapel sekaligus wali kelas), pilih peran saat masuk. Ganti kapan saja lewat menu samping, Ganti peran.',
      'Lengkapi nomor WhatsApp di Akun saya agar pemberitahuan penting juga sampai lewat WhatsApp.',
      'Lonceng di kanan atas berisi tugas yang menunggu Anda: rujukan baru, tinjauan jatuh tempo, atau absensi harian yang belum dicatat.'
    ],
    langkah: [
      { t: 'BK untuk semua murid', s: ['Layanan BK tidak hanya untuk murid bermasalah. Guru BK mencatat bimbingan klasikal, bimbingan kelompok, perencanaan studi/karier, konseling, dan kolaborasi dengan orang tua.', 'Setiap layanan dapat dikaitkan ke kegiatan Program BK sehingga realisasi program terhitung otomatis.', 'Hasil instrumen (AKPD, angket kebutuhan, sosiometri) menjadi dasar program dan tindak lanjut per murid.'] },
      { t: 'Alur penanganan kejadian', s: ['Guru melaporkan kejadian dan memilih: sudah dibina sendiri (informasi untuk BK), sudah dibina tetapi perlu tindak lanjut BK, atau mohon ditangani BK.', 'Laporan "sudah dibina" tidak menunggu tindakan; Guru BK cukup meninjau dan memantau polanya, lalu pelapor menerima umpan balik.', 'Bila perlu, Guru BK menerima rujukan dan memberikan layanan responsif yang rahasia.', 'Tindak lanjut dipantau sampai kasus Selesai, atau dieskalasikan ke Waka Kesiswaan.'] },
      { t: 'Absensi kartu QR (bila diaktifkan sekolah)', s: ['Setiap murid punya kartu hadir ber-QR. Petugas piket memindainya di gerbang lewat menu Pindai Hadir.', 'Pindaian sebelum batas jam masuk tercatat Hadir, sesudahnya Terlambat. Hasilnya langsung mengisi absensi harian wali kelas.', 'Wali kelas tinggal menentukan status murid yang belum memindai (Sakit, Izin, Alpa, atau Hadir bila kartu tertinggal).', 'Daftar hadir harian dapat dipantau dan dicetak di Absensi → Daftar hadir.'] },
      { t: 'Status kasus', s: ['Baru: laporan masuk, belum ditangani.', 'Pembinaan Guru: guru sudah melakukan pembinaan awal.', 'Diproses: Guru BK sedang menelaah.', 'Dalam Layanan BK: murid sedang mendapat layanan konseling (isinya rahasia).', 'Dipantau: tindak lanjut sedang berjalan.', 'Selesai atau Eskalasi: kasus ditutup atau diteruskan ke Waka Kesiswaan.'] }
    ],
    tips: ['Tulis kronologi yang faktual: waktu, tindakan yang terlihat, dan respons murid. Hindari label seperti "anak nakal".', 'Isi konseling tidak pernah tampil untuk peran selain Guru BK. Peran lain hanya melihat statusnya.', 'Setiap akses data sensitif tercatat di log aktivitas.']
  },
  guru_mapel: {
    judul: 'Guru Mata Pelajaran', ikon: 'bi-journal-text',
    intro: 'Anda adalah pengamat pertama di kelas. Tugas utama Anda mencatat kehadiran setiap sesi mengajar dan melaporkan indikasi masalah murid.',
    tugas: ['Mencatat absensi setiap sesi mengajar pada kelas yang Anda ampu.', 'Melaporkan kejadian dengan kronologi yang objektif.', 'Melakukan pembinaan awal untuk laporan Anda sendiri.', 'Merujuk ke Guru BK bila pembinaan belum cukup.'],
    langkah: [
      { t: 'Mencatat absensi mata pelajaran', s: ['Buka Absensi, tab Per mata pelajaran (atau ketuk kartu kelas di Beranda).', 'Pilih kelas & mata pelajaran, lalu tanggal.', 'Atur jam pelajaran: pilih Jam mulai, lalu Jumlah JP. Contoh mengajar 3 JP mulai jam ke-3: pilih Jam ke-3 dan 3 JP, hasilnya jam ke-3 s.d. 5.', 'Ketuk Muat daftar murid. Semua murid otomatis Hadir. Murid yang sudah tercatat Sakit, Izin, atau Alpa di absensi harian ikut ditandai.', 'Ubah hanya murid yang berbeda (S, I, A, T), isi catatan bila perlu, lalu Simpan absensi.'] },
      { t: 'Salah memasukkan jam pelajaran', s: ['Buka sesi tersebut (dari Riwayat absensi mapel, tombol Buka).', 'Ketuk Ubah jam, pilih jam mulai dan jumlah JP yang benar, lalu Simpan jam.', 'Perubahan hanya dapat dilakukan pencatat awal dan dalam batas waktu koreksi (bawaan 24 jam).'] },
      { t: 'Melaporkan kejadian', s: ['Ketuk tombol + atau Lapor Kejadian, lalu cari murid.', 'Pilih contoh kejadian yang sering terjadi (mis. terlambat, tidak mengerjakan tugas) agar kategori dan kronologi terisi otomatis, lalu sesuaikan.', 'Pilih cara penanganan. "Sudah saya bina" cocok untuk keterlambatan atau tugas: tulis pembinaan yang sudah Anda lakukan; BK menerimanya sebagai informasi.', 'Pilih "Perlu tindak lanjut BK" atau "Mohon ditangani Guru BK" bila masalah berulang atau di luar kewenangan Anda; rujukan dibuat otomatis.', 'Anda menerima pemberitahuan setelah Guru BK meninjau laporan.'] },
      { t: 'Pembinaan awal dan rujukan', s: ['Buka menu Laporan Saya, pilih kasusnya.', 'Tambahkan pembinaan awal: tindakan yang Anda lakukan dan hasilnya.', 'Bila masalah berulang, ketuk Rujuk ke Guru BK dan tuliskan alasannya. Ringkasan pembinaan ikut terlampir otomatis.', 'Pantau status rujukan Anda. Isi konseling tetap rahasia.'] }
    ],
    tips: ['Sistem menolak sesi yang jamnya bertabrakan dengan sesi lain di kelas yang sama. Periksa jadwal bila muncul peringatan itu.', 'Baris murid berwarna merah berarti ia hadir di jam sebelumnya tetapi Anda tandai Alpa. Periksa kembali, bisa jadi indikasi bolos di tengah hari.']
  },
  wali_kelas: {
    judul: 'Wali Kelas', ikon: 'bi-people',
    intro: 'Anda penghubung utama antara murid, guru, Guru BK, dan orang tua untuk kelas perwalian Anda.',
    tugas: ['Mencatat absensi harian kelas perwalian setiap hari sekolah.', 'Memantau kondisi setiap murid di menu Kelas Saya.', 'Melakukan pembinaan awal dan merujuk ke Guru BK.', 'Menghubungi orang tua dan mencatat setiap komunikasi.'],
    langkah: [
      { t: 'Mencatat absensi harian', s: ['Buka Absensi, tab Harian (Beranda juga menampilkan kartu Absensi Harian).', 'Ketuk kartu kelas Anda. Semua murid otomatis Hadir.', 'Tandai yang Sakit, Izin, Alpa, atau Terlambat dan isi keterangan, misalnya surat dokter.', 'Simpan. Hasil ini menjadi nilai awal absensi setiap guru mapel pada hari itu.', 'Bila ada murid Alpa, aplikasi menawarkan pesan pemberitahuan ke orang tua lewat WhatsApp.'] },
      { t: 'Melengkapi absensi dari pindai QR', s: ['Bila sekolah memakai kartu QR, kartu kelas di tab Harian bertanda Sebagian: sebagian murid sudah memindai.', 'Buka kelas: murid yang memindai sudah berstatus Hadir/Terlambat beserta jamnya; yang belum memindai bertanda Belum memindai.', 'Tentukan statusnya (S/I/A), atau tekan Sisanya hadir bila mereka ada di kelas tetapi kartunya tertinggal, lalu Lengkapi & simpan.', 'Cetak kartu QR kelas Anda dari Kelas Saya → Kartu QR. Kartu hilang? Tekan Ganti kode lalu cetak ulang kartunya saja.'] },
      { t: 'Kelas Saya', s: ['Buka menu Kelas Saya: setiap murid tampil dengan kehadiran 30 hari, jumlah S/I/A/T, alpa per mapel, kasus aktif, dan layanan BK yang diikuti.', 'Gunakan filter "Perlu perhatian" untuk melihat murid dengan pola ketidakhadiran, kasus aktif, atau alpa berulang.', 'Lengkapi nomor WhatsApp orang tua lewat tombol Kontak.', 'Ketuk nama murid untuk membuka garis waktunya.'] },
      { t: 'Rekap bulanan', s: ['Buka Absensi, tab Rekap bulanan.', 'Pilih kelas dan bulan. Tabel menampilkan status setiap murid per tanggal beserta jumlah S, I, A, T dan persentase kehadiran.', 'Ekspor CSV untuk diolah di Excel atau dilampirkan pada laporan.'] },
      { t: 'Rekap periode (mingguan, bulanan, semester)', s: ['Buka Absensi, tab Rekap periode.', 'Pilih Minggu ini, Bulan, Semester ini, atau Pilih tanggal, lalu pilih kelas.', 'Tabel menampilkan jumlah H, T, S, I, A, hari belum tercatat, dan persen kehadiran setiap murid. Hari libur tidak dihitung.', 'Urutkan Alpa terbanyak untuk menemukan murid yang perlu perhatian. Cetak (berkop, bertanda tangan) atau unduh CSV untuk e-Rapor/Excel.'] },
      { t: 'WhatsApp orang tua tanpa pindah halaman', s: ['Di Kelas Saya, Garis Waktu Murid, atau setelah menyimpan absensi Alpa, ketuk tombol WhatsApp.', 'Pilih templat, ubah pesan bila perlu, lalu Kirim lewat WhatsApp.', 'Kembali ke aplikasi dan ketuk Ya, catat: komunikasi langsung tercatat di garis waktu.'] },
      { t: 'Menghubungi orang tua', s: ['Buka Hubungi Orang Tua, pilih murid.', 'Pilih templat pesan (undangan diskusi, info ketidakhadiran, jadwal pertemuan). Isinya dapat diubah.', 'Ketuk Buka WhatsApp, kirim pesannya, lalu kembali dan ketuk Catat komunikasi.', 'Bila perlu surat resmi, ketuk Buat surat: pilih jenis, isi jadwal, dan ubah kalimat surat seperlunya.', 'Tekan Pratinjau untuk memeriksa (belum memakai nomor). Bila sudah pas, tekan Terbitkan: PDF bernomor resmi tersimpan di Drive dan tercatat di riwayat.'] },
      { t: 'Kasus yang dilimpahkan Guru BK', s: ['Lonceng menampilkan "Kasus dilimpahkan Guru BK kepada Anda". Ketuk untuk membuka kasus; arahan BK dan tanggal tinjau tampil di bagian atas.', 'Lakukan arahan BK, lalu ketuk Catat tindakan wali kelas: tulis tindakan dan hasilnya.', 'Pilih langkah berikutnya: Masih berjalan (catat saja), Selesai, laporkan ke BK (BK yang menutup kasus), atau Kembalikan ke BK (tulis alasannya).', 'Filter "Dilimpahkan ke saya" di Kasus Kelas Saya menampilkan semua kasus yang sedang Anda tangani.'] },
      { t: 'Lonceng pemberitahuan', s: ['Laporan MENDESAK dan laporan yang dirujuk ke BK tentang murid kelas Anda tampil satu per satu; laporan lain digabung menjadi ringkasan 7 hari.', 'Keputusan Guru BK atas laporan murid kelas Anda juga tampil di lonceng. Pemberitahuan ini hanya di aplikasi (tanpa email).', 'Tandai sudah dibaca menghapus angka pada lonceng. Tugas (kasus dilimpahkan, tinjauan jatuh tempo, absensi belum dicatat) tetap dihitung sampai dikerjakan.'] },
      { t: 'Profil kelas dari instrumen BK', s: ['Di bagian bawah Kelas Saya tampil profil kelas: persentase per aspek, gaya belajar dominan, rencana sekolah lanjutan, dan saran pembelajaran.', 'Tidak ada nama murid atau jawaban perorangan. Profil tampil bila minimal 5 murid kelas Anda sudah mengisi; sosiometri tidak dibagikan.', 'Tekan Cetak untuk rekap profil kelas bertanda tangan wali kelas.'] },
      { t: 'Memantau kelas', s: ['Beranda menampilkan deteksi dini pola kehadiran murid kelas Anda.', 'Garis Waktu Murid merangkum absensi, kejadian, pembinaan, rujukan, dan komunikasi orang tua.', 'Kasus Kelas Saya berisi semua kasus murid perwalian Anda.'] }
    ],
    tips: ['Catat absensi harian di jam pertama agar guru mapel langsung mendapat data awal yang benar.', 'Koreksi absensi harian dapat dilakukan dalam batas waktu koreksi yang ditetapkan admin.']
  },
  guru_bk: {
    judul: 'Guru BK', ikon: 'bi-heart-pulse',
    intro: 'Anda penanggung jawab penelaahan, asesmen, dan layanan konseling. Hanya Anda yang dapat membuka catatan konseling.',
    tugas: ['Memberikan dan mencatat layanan BK untuk semua murid: dasar, peminatan, responsif, dan dukungan sistem.', 'Meninjau laporan guru dan menanggapi rujukan.', 'Memantau pola ketidakhadiran dan kejadian berulang.', 'Menetapkan tindak lanjut dan tanggal tinjau, lalu menutup atau mengeskalasi kasus.', 'Menyusun program layanan BK tahunan dan mengelola instrumen (AKPD, sosiometri, angket kebutuhan).'],
    langkah: [
      { t: 'Rutinitas harian', s: ['Buka Beranda: periksa KPI Rujukan Baru, Pola Bolos, dan Deteksi Dini.', 'Lonceng menampilkan laporan baru, rujukan menunggu, dan tinjauan jatuh tempo.', 'Kartu Absensi Harian menunjukkan kelas yang belum dicatat wali kelasnya. Anda dapat mencatatnya bila bertugas piket.'] },
      { t: 'Menangani rujukan dan kasus', s: ['Buka Rujukan & Kasus, pilih kasus.', 'Tanggapi rujukan. Menunda atau menolak wajib disertai alasan yang akan dibaca pengirim.', 'Ubah status sesuai perkembangan. Ambil alih atau alihkan kasus ke Guru BK lain bila perlu.', 'Tambahkan tindak lanjut dengan penanggung jawab dan tanggal tinjau. Pengingat dikirim saat jatuh tempo.', 'Eskalasikan ke Waka Kesiswaan bila butuh kewenangan kesiswaan.'] },
      { t: 'Mencatat layanan BK', s: ['Buka Layanan BK, ketuk Catat layanan.', 'Pilih komponen: Layanan Dasar (klasikal/kelompok/informasi), Peminatan & Perencanaan Individual, Responsif (konseling, rahasia), atau Dukungan Sistem.', 'Pilih sasaran: satu murid, sekelompok murid, atau satu kelas (seluruh murid aktif tercatat sebagai peserta).', 'Kaitkan ke kegiatan Program BK agar realisasi bertambah otomatis, dan ke kasus bila layanan menindaklanjuti laporan.', 'Topik layanan non-responsif tampil di garis waktu murid bagi wali kelas; isi catatan hanya untuk Guru BK.'] },
      { t: 'Meninjau laporan guru', s: ['Filter "Perlu ditinjau" di Rujukan & Kasus menampilkan laporan yang belum Anda baca, termasuk yang sudah dibina guru.', 'Buka laporan, ketuk Tinjau laporan, pilih keputusan (ketahui, pantau, tangani, atau tutup), dan tulis pesan singkat untuk pelapor.'] },
      { t: 'Melimpahkan kasus ke wali kelas', s: ['Cocok untuk masalah ringan yang paling tepat ditangani wali kelas (keterlambatan, tugas, kedisiplinan kelas).', 'Buka kasus, ketuk Limpahkan ke wali kelas, tulis arahan, dan tentukan tanggal tinjau. Wali kelas diberi tahu lewat lonceng.', 'Kasus tetap tercatat atas nama Anda. Wali kelas mencatat tindakannya; Anda dan wali kelas diingatkan pada tanggal tinjau.', 'Bila wali kelas melaporkan selesai, lonceng Anda menampilkan "Wali kelas melaporkan kasus selesai". Ketuk Konfirmasi hasil wali kelas: tutup kasus, pantau dulu, kembalikan ke wali kelas dengan arahan baru, atau ambil alih.', 'Bila wali kelas mengembalikan kasus, status menjadi Diproses dan alasannya tampil di tindak lanjut.'] },
      { t: 'Permintaan dari murid', s: ['Buka Layanan BK → Formulir, lalu Buka formulir. Bagikan tautan, kode, atau cetak posternya untuk ditempel di kelas.', 'Murid mengisi tanpa akun (kode + NIS): topik, cerita singkat, waktu luang, dan tanda mendesak. Permintaan masuk ke lonceng Anda.', 'Di Layanan BK → Buka: jadwalkan pertemuan, lalu Catat layanan. Permintaan otomatis berstatus Selesai dan terhubung ke catatan layanan.', 'Email pemberitahuan tidak memuat nama murid maupun isi cerita. Ganti kode formulir bila ada penyalahgunaan.'] },
      { t: 'Deteksi pola kehadiran', s: ['Sistem memeriksa 30 hari terakhir: alpa berulang pada mapel yang sama, hadir di jam awal lalu alpa di jam berikutnya, absen pada hari tertentu, tidak masuk sekolah berturut-turut, dan keterlambatan.', 'Ketuk Buat rujukan pada murid yang ditandai untuk langsung membuka kasus.'] },
      { t: 'Instrumen: templat, sunting, versi', s: ['Buat instrumen → pilih Templat siap pakai (AKPD, Angket Kebutuhan, Gaya Belajar, Minat & Karier, Asesmen Awal Kesejahteraan, Kebiasaan Belajar, Sosiometri) atau Kerangka instrumen buatan sendiri (angket skala, daftar cek masalah, kuesioner umum).', 'Butir templat disusun untuk skrining murid SMP, bukan instrumen baku. Semua butir dapat diubah. Teks bertanda [Ganti] pada kerangka wajib Anda ganti.', 'Tempel banyak butir sekaligus dari Word/Excel; tulis "Kelompok | teks" untuk menetapkan kelompok per baris. Tombol duplikat, naik/turun, dan Pratinjau (tampilan murid) tersedia.', 'Atur Cara membaca skor: kebutuhan (tinggi = perlu layanan), kekuatan (tinggi = baik), atau dominan (kelompok tertinggi = kecenderungan). Isi Tutup otomatis bila pengisian dibatasi tanggal.', 'Setelah ada jawaban, hanya kata-kata yang bisa diubah. Untuk susunan baru pakai Salin jadi versi baru. Jadikan templat sekolah agar instrumen Anda muncul di pilihan Buat instrumen.'] },
      { t: 'Hasil instrumen & tindak lanjut', s: ['Ringkasan: kecenderungan dominan, per aspek (jumlah murid Tinggi/Sedang/Rendah) beserta rekomendasi, 10 teratas, dan rincian per butir. Saring per kelas di kanan atas.', 'Hasil per murid: murid yang perlu ditindaklanjuti (termasuk tanda ⚑ ingin bertemu BK secepatnya) tampil paling atas. Ketuk Profil untuk skor per aspek dan rekomendasi.', 'Kelompok kebutuhan: murid dikelompokkan per aspek/gaya; Catat bimbingan kelompok membuka formulir layanan dengan peserta terisi.', 'Cetak: profil satu murid, profil sekelas sekaligus (satu halaman per murid), atau rekap kelas tanpa nama.'] },
      { t: 'Program dan instrumen BK', s: ['Program BK: susun kegiatan per bidang, komponen, dan fokus 7 Jurus BK Hebat, lalu tekan Catat pelaksanaan setiap kali kegiatan dilakukan.', 'Realisasi dihitung otomatis dari layanan yang dikaitkan; laporan PDF tahunan siap untuk pengawas.', 'Instrumen BK: buat dari templat, buka pengisian, bagikan kode atau tautan ke murid.', 'Tab Hasil per murid menampilkan skor setiap murid per bidang; ketuk Jawaban untuk rincian, atau Tindak lanjuti untuk langsung mencatat layanan.'] }
    ],
    tips: ['Bila ada lebih dari satu Guru BK, admin dapat menetapkan Guru BK pemegang kelas agar notifikasi tepat sasaran.', 'Menutup kasus (Selesai) otomatis menyelesaikan tindak lanjut yang masih terbuka sehingga pengingat berhenti.']
  },
  waka: {
    judul: 'Waka Kesiswaan', ikon: 'bi-shield-check',
    intro: 'Anda menangani kasus yang dieskalasikan Guru BK dan tindak lanjut yang membutuhkan kewenangan kesiswaan.',
    tugas: ['Meninjau kasus eskalasi dan menindaklanjutinya.', 'Mengisi dan memperbarui tindak lanjut bagian Anda sampai tanggal tinjau.', 'Memantau absensi seluruh kelas dan mencatat absensi harian saat piket atau wali kelas berhalangan.'],
    langkah: [
      { t: 'Menindaklanjuti eskalasi', s: ['Buka Kasus Eskalasi, pilih kasus.', 'Baca kronologi, pembinaan, dan rujukan. Isi konseling tidak ditampilkan.', 'Tambahkan atau perbarui tindak lanjut beserta hasil evaluasi dan tanggal tinjau berikutnya.'] },
      { t: 'Piket absensi harian', s: ['Buka Absensi, tab Harian. Semua kelas dapat Anda catat.', 'Kelas yang belum dicatat ditandai Belum.'] },
      { t: 'Pindai kartu QR & daftar hadir', s: ['Buka Pindai Hadir. Gunakan pemindai USB/Bluetooth (paling cepat) atau kamera HP.', 'Nama murid langsung tampil; hijau = hadir, kuning = terlambat, abu-abu = sudah tercatat, merah = kartu tidak dikenal.', 'Bila sinyal putus, pindaian disimpan di perangkat dan dikirim otomatis saat tersambung kembali.', 'Absensi → Daftar hadir: pantau semua kelas, saring yang tidak hadir/terlambat atau belum tercatat, lalu Cetak untuk arsip atau tindak lanjut.'] }
    ],
    tips: ['Tinjauan jatuh tempo muncul di lonceng dan dikirim lewat email setiap pagi pukul 06.00.']
  },
  kepsek: {
    judul: 'Kepala Sekolah', ikon: 'bi-building',
    intro: 'Anda memantau gambaran menyeluruh dalam bentuk agregat. Nama murid dan isi kasus tidak ditampilkan.',
    tugas: ['Memantau tingkat kehadiran harian dan per mapel.', 'Memantau jumlah, kategori, dan penyelesaian kasus.', 'Meninjau program layanan BK dan hasil instrumen secara agregat.'],
    langkah: [
      { t: 'Membaca beranda', s: ['KPI menampilkan kehadiran harian 30 hari, kasus baru bulan ini, kasus aktif, persentase penyelesaian, dan jumlah murid terpantau.', 'Insight otomatis merangkum kecenderungan (agregat, bukan diagnosis).'] },
      { t: 'Laporan resmi', s: ['Buka Laporan & Rekap, atur periode dan kelas.', 'Unduh PDF untuk rapat atau pelaporan, atau ekspor CSV.', 'Program & Rekap BK berisi laporan program layanan BK tahunan.'] }
    ],
    tips: ['Untuk keperluan dinas, unduh laporan PDF yang sudah berkop sekolah.']
  },
  admin: {
    judul: 'Admin Sistem', ikon: 'bi-gear',
    intro: 'Anda menyiapkan dan merawat data master agar seluruh peran dapat bekerja.',
    tugas: ['Mengelola pengguna, peran, dan PIN.', 'Mengelola kelas, murid, mata pelajaran, dan penugasan pengampu.', 'Mengatur konfigurasi sekolah, kop surat, templat WhatsApp, dan batas waktu.', 'Mengarsipkan data tiap akhir tahun ajaran dan menjalankan kenaikan kelas.'],
    langkah: [
      { t: 'Urutan pengisian data awal', s: ['Kelas: nama kelas, wali kelas, Guru BK pemegang kelas (opsional).', 'Pengguna: email Google, nama, peran (boleh lebih dari satu). PIN awal tampil sekali, sampaikan ke guru.', 'Murid: tambah satu per satu atau impor CSV (nis, nama, kelas, jk, nama_ortu, no_wa_ortu, email_ortu).', 'Mata pelajaran, lalu Pengampu. Gunakan penugasan massal untuk satu guru di banyak kelas.'] },
      { t: 'Pengaturan penting', s: ['Jumlah jam pelajaran per hari (bawaan 10). Menentukan pilihan jam mulai dan JP pada absensi.', 'Batas koreksi absensi (jam) dan ambang deteksi pola.', 'Kop surat, kepala sekolah, dan templat WhatsApp.'] },
      { t: 'Kehadiran & Libur', s: ['Administrasi → Kehadiran & Libur: aktifkan absensi QR, atur batas jam masuk, dan pilih guru piket sebagai petugas pindai.', 'Cetak kartu QR per kelas (A4, 10 kartu ukuran KTP). Isi QR berupa kode acak, bukan NIS.', 'Masukkan hari libur nasional, cuti bersama, libur semester, dan kegiatan sekolah. Tanggal ini dilewati deteksi pola, pengingat, dan pemindaian.', 'Pantau kapasitas data. Bila mendekati 70%, rapikan kolom kosong atau arsipkan semester.'] },
      { t: 'Surat & Cetak', s: ['Administrasi → Surat & Cetak: isi baris kop, unggah logo kiri (pemda) dan kanan (sekolah).', 'Isi nama, NIP, sebutan jabatan, dan pangkat Kepala Sekolah. NIP guru diambil dari data Pengguna.', 'Atur format nomor surat (mis. 421.3/{no}/SMPN3-BTP/{bulan}/{tahun}) dan nomor terakhir yang sudah terpakai. Nomor mulai lagi dari 001 setiap tahun.', 'Pilih ukuran kertas (A4/F4) dan jenis huruf, simpan, lalu tekan Lihat contoh surat.', 'Kalimat surat: pilih jenis surat, ubah kalimat pembuka/isi/penutup sesuai gaya sekolah (ketuk isian seperti {nama_murid} untuk menyisipkan), lalu Simpan kalimat.'] },
      { t: 'Akhir tahun ajaran', s: ['Administrasi, Tahun Ajaran: arsipkan data (salinan lengkap tersimpan di Drive).', 'Jalankan kenaikan kelas dengan pratinjau.', 'Atur tahun ajaran dan semester baru.'] }
    ],
    tips: ['Lupa PIN admin: pemilik proyek membuka editor Apps Script, memilih fungsi resetPinAdmin, lalu Run. PIN baru tampil di Execution log.', 'Lupa PIN: atur ulang di Pengguna. Akun yang terkunci otomatis terbuka setelah PIN diatur ulang.', 'Cadangan otomatis dibuat setiap hari pukul 02.00 dan disimpan 14 salinan terakhir.']
  }
};
const GUIDE_URUT = ['umum', 'guru_mapel', 'wali_kelas', 'guru_bk', 'waka', 'kepsek', 'admin'];
const FAQ = [
  ['Apa beda "Limpahkan ke wali kelas" dan "Alihkan"?', 'Alihkan memindahkan kasus ke Guru BK lain. Limpahkan meminta wali kelas menangani dengan arahan Anda; kasus tetap atas nama Anda dan penutupannya tetap dikonfirmasi Guru BK.'],
  ['Apakah wali kelas tahu laporan tentang murid kelasnya?', 'Ya, lewat lonceng di aplikasi: laporan mendesak dan yang dirujuk tampil satu per satu, lainnya diringkas. Isi catatan konseling tetap hanya untuk Guru BK.'],
  ['Apakah BK hanya untuk murid bermasalah?', 'Tidak. Layanan BK ditujukan bagi semua murid sejak dini, sejalan dengan arah Kemendikdasmen. Catat bimbingan klasikal, kelompok, informasi studi lanjut, dan perencanaan individual di menu Layanan BK; penanganan kasus hanyalah salah satu bagian (layanan responsif).'],
  ['Saya sudah membina murid yang terlambat. Perlu lapor ke BK?', 'Ya, pilih "Sudah saya bina" saat melapor. BK menerimanya sebagai informasi tanpa harus menangani, sehingga pola keterlambatan tetap terpantau. Bila berulang, sistem menandainya dan BK dapat menindaklanjuti.'],
  ['Saya mengajar 3 JP tetapi pilihan hanya 2 JP.', 'Versi baru memisahkan Jam mulai dan Jumlah JP, jadi 3 JP atau lebih dapat dipilih (hingga 8 JP, dibatasi jumlah jam per hari di Pengaturan). Sesi lama yang terlanjur tersimpan dapat diperbaiki dengan tombol Ubah jam.'],
  ['Apa beda absensi harian dan absensi mapel?', 'Absensi harian mencatat apakah murid masuk sekolah hari itu, dicatat sekali oleh wali kelas. Absensi mapel mencatat kehadiran di setiap sesi pelajaran oleh guru pengampu. Keduanya dipakai bersama untuk mendeteksi pola, misalnya masuk sekolah tetapi bolos pada pelajaran tertentu.'],
  ['Absensi tidak dapat disimpan karena "sudah ada".', 'Sesi dengan kelas, mapel, tanggal, dan jam yang sama sudah tersimpan. Muat ulang daftar murid, maka mode berubah menjadi koreksi.'],
  ['Mengapa saya tidak bisa melihat isi konseling?', 'Isi konseling hanya untuk Guru BK sesuai kode etik. Peran lain melihat status kasus saja.'],
  ['Pesan WhatsApp tidak terkirim otomatis.', 'Aplikasi menyiapkan pesan dan membuka WhatsApp. Anda yang menekan kirim, lalu mencatat komunikasinya. Pengiriman otomatis hanya bila admin mengaktifkan gerbang WhatsApp.'],
  ['Murid lupa membawa kartu QR.', 'Petugas mencari namanya di kolom "Kartu tertinggal? Cari nama" pada Pindai Hadir, atau wali kelas menandainya Hadir saat melengkapi absensi harian.'],
  ['Kartu QR hilang atau dipinjamkan ke teman.', 'Buka Cetak kartu, pilih kelasnya, tekan Ganti kode pada murid itu, lalu cetak ulang kartunya saja. Kartu lama langsung tidak berlaku.'],
  ['Kamera tidak bisa dibuka di Pindai Hadir.', 'Sebagian peramban atau bingkai (mis. Blogger) memblokir kamera. Gunakan pemindai USB/Bluetooth, atau buka alamat aplikasi langsung di Chrome. Untuk Blogger, iframe perlu atribut allow="camera".'],
  ['Mengapa perlu mengisi hari libur?', 'Agar pengingat "absensi belum dicatat" tidak muncul pada hari libur, pemindaian ditolak saat libur, dan catatan yang terlanjur dibuat pada hari libur tidak memicu tanda palsu pada deteksi pola.'],
  ['Apakah murid bisa melihat status permintaan konselingnya?', 'Tidak. Demi privasi, formulir hanya menampilkan konfirmasi terkirim. Guru BK menyampaikan jadwal secara langsung atau lewat wali kelas.'],
  ['Harus login setiap membuka aplikasi?', 'Tidak, bila Anda mencentang "Ingat saya di perangkat ini" saat masuk: sesi bertahan 30 hari di perangkat tersebut. Email terakhir juga terisi otomatis, dan memasukkan 6 digit PIN langsung masuk tanpa menekan tombol. Jangan dicentang di komputer bersama.'],
  ['Absensi sudah "tersimpan" tetapi ada tanda "Menyimpan · 1" di atas.', 'Absensi langsung tersimpan di perangkat lalu dikirim ke server di latar belakang, sehingga Anda bisa mencatat kelas berikutnya tanpa menunggu. Tanda itu hilang setelah terkirim. Saat sinyal putus, data menunggu dan terkirim otomatis.'],
  ['Aplikasi terasa lambat.', 'Pembukaan pertama memuat seluruh tampilan sekaligus. Setelah itu menu yang pernah dibuka tampil seketika dari data terakhir lalu diperbarui diam-diam, dan data menu diambil lebih dulu saat kursor/jari menyentuhnya. Bila data sudah sangat banyak, minta admin mengarsipkan semester sebelumnya.']
];
PAGES.panduan = function (params) {
  const mine = GUIDE_URUT.filter(function (k) { return k === 'umum' || (S.user.allRoles || S.user.roles).indexOf(k) >= 0; });
  const lain = GUIDE_URUT.filter(function (k) { return mine.indexOf(k) < 0; });
  const t = params.t && GUIDE[params.t] ? params.t : (mine[1] || 'umum');
  $('#app-container').innerHTML = pageHead('Bantuan', 'Panduan Penggunaan', 'Tugas dan langkah kerja setiap peran. Panduan peran Anda ditampilkan lebih dulu.', '') +
    '<div class="tabs mb-16" id="gd-tabs">' + mine.concat(lain).map(function (k) { return '<button class="tab ' + (k === t ? 'active' : '') + '" data-act="gd-tab" data-t="' + k + '"><i class="bi ' + GUIDE[k].ikon + '"></i> ' + esc(GUIDE[k].judul) + (mine.indexOf(k) >= 0 && k !== 'umum' ? ' <span class="chip blue" style="margin-left:4px">Peran Anda</span>' : '') + '</button>'; }).join('') + '<button class="tab ' + (t === 'faq' ? 'active' : '') + '" data-act="gd-tab" data-t="faq"><i class="bi bi-question-circle"></i> Tanya jawab</button></div><div id="gd-body"></div>';
  gdDraw(t);
  $('#app-container').insertAdjacentHTML('beforeend', '<p class="kredit" style="margin-top:20px">SIKOLAB BK versi ' + VERSI_APP + ' · Dikembangkan oleh ' + PENGEMBANG + ', ' + PENGEMBANG_SEKOLAH + '</p>');
};
function gdDraw(k) {
  const b = $('#gd-body');
  if (k === 'faq') {
    b.innerHTML = '<div class="card pad gd">' + FAQ.map(function (f) { return '<details class="gd-faq"><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div>';
    return;
  }
  const g = GUIDE[k];
  b.innerHTML = '<div class="grid g-2"><div class="col gap-16"><div class="card pad gd"><div class="row"><span class="step-n"><i class="bi ' + g.ikon + '"></i></span><div><h3>' + esc(g.judul) + '</h3></div></div><p class="muted-2 mt-12">' + esc(g.intro) + '</p>' +
    '<h4 class="mt-16">Tugas utama</h4><ul class="gd-list">' + g.tugas.map(function (x) { return '<li><i class="bi bi-check2-circle"></i><span>' + esc(x) + '</span></li>'; }).join('') + '</ul></div>' +
    (g.tips && g.tips.length ? '<div class="insight"><span class="ai-tag"><i class="bi bi-lightbulb"></i> Tips</span><ul>' + g.tips.map(function (x) { return '<li><i class="bi bi-lightbulb"></i><span>' + esc(x) + '</span></li>'; }).join('') + '</ul></div>' : '') + '</div>' +
    '<div class="col gap-16">' + g.langkah.map(function (l) { return '<div class="card pad gd"><h4>' + esc(l.t) + '</h4><ol class="gd-steps">' + l.s.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>'; }).join('') + '</div></div>';
}
ACT['gd-tab'] = function (el) { $$('#gd-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); gdDraw(el.dataset.t); };

'use strict';
// ── Jalankan ──
init();

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

// ════════════════════════════════════════════════════════════
// Absensi → tab "Daftar hadir" (pantau & cetak untuk Waka/pihak terkait)
// ════════════════════════════════════════════════════════════
function dhPage(params, tok) {
  const tgl = params.tanggal || P.dhTgl || S.today;
  let kls = params.id_kelas !== undefined ? params.id_kelas : P.dhKelas;
  if (kls === undefined) kls = hasAny(['guru_bk', 'waka', 'admin']) ? '' : ((S.kelasWali || [])[0] || '');
  return apiC('hadir.daftar', { tanggal: tgl, id_kelas: kls }).then(function (d) {
    if (stale(tok) && tok !== undefined) return;
    P.dh = d; P.dhTgl = d.tanggal; P.dhKelas = kls; P.dhF = P.dhF || 'semua';
    dhDraw();
  });
}
function dhRows(k, f) { return k.murid.filter(function (m) { return f === 'tidak' ? (m.st && m.st !== 'H') : f === 'belum' ? !m.st : true; }); }
function dhDraw() {
  const d = P.dh, t = d.total, f = P.dhF;
  const pctH = t.n ? Math.round((t.H + t.T) * 1000 / t.n) / 10 : 0;
  let h = '<div class="card pad"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
    '<div class="field"><label for="dh-tgl">Tanggal</label><input class="input" type="date" id="dh-tgl" value="' + esc(d.tanggal) + '" max="' + esc(d.hariIni) + '"></div>' +
    '<div class="field"><label for="dh-kls">Kelas</label><select class="select" id="dh-kls">' + (d.pilihan.length > 1 ? '<option value="">Semua kelas (' + d.pilihan.length + ')</option>' : '') + d.pilihan.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === P.dhKelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>&nbsp;</label><div class="row" style="gap:8px"><button class="btn primary grow" data-act="dh-cetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn" data-act="dh-csv" title="Unduh CSV"><i class="bi bi-filetype-csv"></i></button><button class="btn" data-act="dh-muat" title="Muat ulang"><i class="bi bi-arrow-clockwise"></i></button></div></div></div>' +
    '<div class="fchips mt-12" id="dh-f">' + [['semua', 'Semua murid'], ['tidak', 'Tidak hadir & terlambat (' + (t.S + t.I + t.A + t.T) + ')'], ['belum', 'Belum tercatat (' + t.B + ')']].map(function (x) { return '<button class="fchip ' + (f === x[0] ? 'active' : '') + '" data-act="dh-f" data-f="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>';
  if (d.libur) h += '<div class="note info mt-16"><i class="bi bi-calendar-heart"></i><div><b>' + esc(tglPanjang(d.tanggal)) + ' tercatat sebagai hari libur:</b> ' + esc(d.libur) + '.</div></div>';
  h += '<div class="card pad mt-16"><div class="sumbar">' + ['H', 'T', 'S', 'I', 'A'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + t[s] + '</b></span>'; }).join('') +
    '<span class="sum"><span class="dotc" style="background:#94A3B8"></span>Belum tercatat <b>' + t.B + '</b></span><span class="sum">Kehadiran <b>' + pctH + '%</b></span>' + (t.qr ? '<span class="sum"><i class="bi bi-qr-code-scan"></i> Lewat QR <b>' + t.qr + '</b></span>' : '') + '<span class="sum">Murid <b>' + t.n + '</b></span></div></div>';
  if (!d.kelas.length) h += '<div class="card pad mt-16">' + empty('bi-people', 'Belum ada murid aktif pada pilihan ini') + '</div>';
  d.kelas.forEach(function (k) {
    const rows = dhRows(k, f), c = k.jumlah;
    if (!rows.length && f !== 'semua' && d.kelas.length > 1) return;
    h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap"><div><h3>' + esc(k.nama) + '</h3><div class="xs muted">Wali kelas: ' + esc(k.wali || '-') + ' · ' + k.murid.length + ' murid</div></div><div class="row wrap" style="gap:6px">' +
      ['H', 'T', 'S', 'I', 'A'].filter(function (s) { return c[s]; }).map(function (s) { return '<span class="chip ab-' + s + '">' + s + ' ' + c[s] + '</span>'; }).join('') + (c.B ? '<span class="chip ab-B">Belum ' + c.B + '</span>' : '') + (c.qr ? '<span class="chip neutral"><i class="bi bi-qr-code-scan"></i> ' + c.qr + '</span>' : '') + '</div></div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:44px">No</th><th>Nama murid</th><th>NIS</th><th>Status</th><th>Jam datang</th><th>Keterangan</th></tr></thead><tbody>' + rows.map(function (m, i) {
        return '<tr><td class="muted">' + (i + 1) + '</td><td class="fw6">' + esc(m.nama) + '</td><td class="xs">' + esc(m.nis) + '</td><td>' + chipAbs(m.st) + '</td><td class="xs">' + (m.jam ? (m.qr ? '<i class="bi bi-qr-code-scan"></i> ' : '') + esc(m.jam) : '<span class="muted">—</span>') + '</td><td class="xs">' + esc(m.cat || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-check2-circle', f === 'belum' ? 'Semua murid sudah tercatat' : 'Tidak ada murid pada filter ini') + '</div>') + '</div>';
  });
  $('#abs-body').innerHTML = h;
  $('#dh-tgl').addEventListener('change', function (e) { if (e.target.value) { P.dhTgl = e.target.value; dhMuat(); } });
  $('#dh-kls').addEventListener('change', function (e) { P.dhKelas = e.target.value; dhMuat(); });
}
function dhMuat(segar) {
  $('#abs-body').innerHTML = skeleton(3);
  const p = segar ? api('hadir.daftar', { tanggal: P.dhTgl, id_kelas: P.dhKelas }) : apiC('hadir.daftar', { tanggal: P.dhTgl, id_kelas: P.dhKelas });
  p.then(function (d) { P.dh = d; dhDraw(); }).catch(function (e) { isiHtml('#abs-body', errBox(e)); });
}
ACT['dh-f'] = function (el) { P.dhF = el.dataset.f; dhDraw(); };
ACT['dh-muat'] = function () { dhMuat(true); };
ACT['dh-csv'] = function () {
  const d = P.dh, rows = [['Daftar hadir harian', d.sekolah, tglPanjang(d.tanggal)], [], ['Kelas', 'No', 'NIS', 'Nama', 'L/P', 'Status', 'Jam datang', 'Lewat QR', 'Keterangan']];
  d.kelas.forEach(function (k) { dhRows(k, P.dhF).forEach(function (m, i) { rows.push([k.nama, i + 1, m.nis, m.nama, m.jk, m.st ? ST_NAMA[m.st] : 'Belum tercatat', m.jam, m.qr ? 'Ya' : '', m.cat]); }); });
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'daftar_hadir_' + d.tanggal + '.csv');
  toast('CSV diunduh.');
};
ACT['dh-cetak'] = function () { siapKop().then(cetakDaftarHadir); };
function cetakDaftarHadir() {
  const d = P.dh, f = P.dhF;
  if (!d || !d.kelas.length) { toast('Tidak ada data untuk dicetak.', 'warn'); return; }
  const judul = f === 'tidak' ? 'DAFTAR MURID TIDAK HADIR DAN TERLAMBAT' : f === 'belum' ? 'DAFTAR MURID BELUM TERCATAT HADIR' : 'DAFTAR HADIR HARIAN MURID';
  const sub = tglPanjang(d.tanggal) + (d.qrAktif ? ' · Batas jam masuk ' + d.jamMasuk : '') + (d.libur ? ' · Hari libur: ' + d.libur : '');
  const t = d.total, banyak = d.kelas.length > 1;
  const pisah = banyak && f === 'semua';
  let h = '<div class="pr-doc">' + (pisah ? '<div class="pr-break">' : '') + kopCetak(d) + '<h2 class="pr-title">' + judul + '</h2><div class="pr-sub">' + esc(sub) + '</div>';
  if (banyak) {
    h += '<table class="pr-tbl pr-rekap"><thead><tr><th>Kelas</th><th>Wali kelas</th><th>Murid</th><th>Hadir</th><th>Terlambat</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Belum</th><th>% Masuk</th></tr></thead><tbody>' + d.kelas.map(function (k) {
      const c = k.jumlah, n = k.murid.length;
      return '<tr><td>' + esc(k.nama) + '</td><td>' + esc(k.wali || '-') + '</td><td>' + n + '</td><td>' + c.H + '</td><td>' + c.T + '</td><td>' + c.S + '</td><td>' + c.I + '</td><td>' + c.A + '</td><td>' + c.B + '</td><td>' + (n ? Math.round((c.H + c.T) * 1000 / n) / 10 : 0) + '</td></tr>';
    }).join('') + '<tr class="pr-tot"><td colspan="2">Jumlah</td><td>' + t.n + '</td><td>' + t.H + '</td><td>' + t.T + '</td><td>' + t.S + '</td><td>' + t.I + '</td><td>' + t.A + '</td><td>' + t.B + '</td><td>' + (t.n ? Math.round((t.H + t.T) * 1000 / t.n) / 10 : 0) + '</td></tr></tbody></table>';
  }
  if (pisah) h += ttdCetak(ttdKepsek(), ttdOrang('Wakil Kepala Sekolah Bidang Kesiswaan,', d.waka, d.wakaNip), d.kota) + '</div>';
  if (f !== 'semua') {
    const list = [];
    d.kelas.forEach(function (k) { dhRows(k, f).forEach(function (m) { list.push({ k: k.nama, m: m }); }); });
    h += '<table class="pr-tbl"><thead><tr><th>No</th><th>Kelas</th><th>NIS</th><th>Nama murid</th><th>L/P</th><th>Status</th><th>Jam datang</th><th>Keterangan</th></tr></thead><tbody>' + (list.length ? list.map(function (x, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.k) + '</td><td>' + esc(x.m.nis) + '</td><td>' + esc(x.m.nama) + '</td><td>' + esc(x.m.jk || '') + '</td><td>' + (x.m.st ? esc(ST_NAMA[x.m.st]) : 'Belum tercatat') + '</td><td>' + esc(x.m.jam || '') + '</td><td>' + esc(x.m.cat || '') + '</td></tr>';
    }).join('') : '<tr><td colspan="8" style="text-align:center">Tidak ada murid pada kategori ini.</td></tr>') + '</tbody></table>';
  } else {
    d.kelas.forEach(function (k, ki) {
      const c = k.jumlah;
      h += '<div class="' + (banyak ? 'pr-break' : '') + '">' + (banyak ? kopCetak(d) + '<h2 class="pr-title">' + judul + '</h2><div class="pr-sub">' + esc(sub) + '</div>' : '') +
        '<div class="pr-kls"><b>Kelas ' + esc(k.nama) + '</b><span>Wali kelas: ' + esc(k.wali || '-') + ' · Hadir ' + c.H + ' · Terlambat ' + c.T + ' · Sakit ' + c.S + ' · Izin ' + c.I + ' · Alpa ' + c.A + (c.B ? ' · Belum ' + c.B : '') + '</span></div>' +
        '<table class="pr-tbl"><thead><tr><th style="width:8mm">No</th><th style="width:24mm">NIS</th><th>Nama murid</th><th style="width:9mm">L/P</th><th style="width:22mm">Status</th><th style="width:18mm">Jam datang</th><th>Keterangan</th></tr></thead><tbody>' + k.murid.map(function (m, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.nis) + '</td><td>' + esc(m.nama) + '</td><td>' + esc(m.jk || '') + '</td><td>' + (m.st ? esc(ST_NAMA[m.st]) : '—') + '</td><td>' + esc(m.jam || '') + '</td><td>' + esc(m.cat || '') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        ttdCetak(ttdOrang('Mengetahui,<br>Wakil Kepala Sekolah Bidang Kesiswaan,', d.waka, d.wakaNip), ttdOrang('Wali Kelas ' + esc(k.nama) + ',', k.wali, k.waliNip), d.kota) + '</div>';
    });
  }
  if (f !== 'semua') h += ttdCetak(ttdOrang('Mengetahui,<br>Wakil Kepala Sekolah Bidang Kesiswaan,', d.waka, d.wakaNip), ttdOrang('Petugas,', d.pencetak, d.pencetakNip), d.kota);
  h += '<div class="pr-foot">Dicetak dari SIKOLAB BK oleh ' + esc(d.pencetak) + ' · ' + esc(fTgl(ymd(new Date())) + ' ' + hhmm(Date.now())) + '</div></div>';
  cetakHtml(h, { judul: judul.charAt(0) + judul.substr(1).toLowerCase(), ket: tglPanjang(d.tanggal) + ' · A4 tegak' });
}
// Rekap bulanan: cetak (A4 mendatar)
ACT['rk-cetak'] = function () { siapKop().then(cetakRekapBulanan); };
function cetakRekapBulanan() {
  const r = P.rk; if (!r) return;
  const t = r.total, kol = rkKolom(r), bel = kol.filter(function (k) { return k.t === 'miss'; }), lk = kol.filter(function (k) { return k.libKhusus; });
  const h = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">REKAP ABSENSI HARIAN · KELAS ' + esc(r.kelas) + '</h2><div class="pr-sub">' + esc(blnPanjang(r.bulan)) + ' · ' + r.hari.length + ' hari tercatat · Wali kelas: ' + esc(r.wali || '-') + '</div>' +
    '<table class="pr-tbl pr-mini"><thead><tr><th rowspan="2">No</th><th rowspan="2" style="text-align:left">Nama murid</th>' + kol.map(function (k) { return '<th' + rkGaya(k) + '>' + (+k.d.substr(8, 2)) + '</th>'; }).join('') + '<th rowspan="2">S</th><th rowspan="2">I</th><th rowspan="2">A</th><th rowspan="2">T</th><th rowspan="2">%</th></tr><tr>' + kol.map(function (k) { return '<th style="font-weight:400;font-size:6pt' + (k.t === 'lib' || k.t === 'miss' ? ';background:' + RK_WARNA[k.t] + ';-webkit-print-color-adjust:exact;print-color-adjust:exact' : '') + '">' + k.hr + '</th>'; }).join('') + '</tr></thead><tbody>' +
    r.murid.map(function (m, i) { return '<tr><td>' + (i + 1) + '</td><td style="text-align:left;white-space:nowrap">' + esc(m.nama) + '</td>' + kol.map(function (k) { const x = m.st[k.d]; return '<td' + (x ? '' : rkGaya(k)) + '>' + (x ? (x.s === 'H' ? '•' : esc(x.s)) : k.t === 'lib' ? 'L' : '') + '</td>'; }).join('') + '<td>' + m.S + '</td><td>' + m.I + '</td><td>' + m.A + '</td><td>' + m.T + '</td><td>' + (m.hadir === null ? '-' : m.hadir) + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<div class="pr-sub" style="text-align:left;margin-top:6px">Keterangan: • hadir, S sakit, I izin, A alpa, T terlambat, L libur (abu-abu), kolom kuning = hari sekolah belum diabsen. Jumlah: H ' + t.H + ', S ' + t.S + ', I ' + t.I + ', A ' + t.A + ', T ' + t.T + '. Kehadiran ' + (r.hadir === null ? '-' : r.hadir + '%') + ' (dari ' + r.hari.length + ' hari yang diabsen).' + (lk.length ? ' Hari libur: ' + lk.map(function (k) { return (+k.d.substr(8, 2)) + ' (' + esc(k.ket) + ')'; }).join(', ') + '.' : '') + (bel.length ? ' Belum diabsen: tanggal ' + bel.map(function (k) { return +k.d.substr(8, 2); }).join(', ') + '.' : '') + '</div>' +
    ttdCetak(ttdKepsek(), ttdOrang('Wali Kelas ' + esc(r.kelas) + ',', r.wali, r.waliNip), '') + '</div>';
  cetakHtml(h, { landscape: true, margin: '10mm', judul: 'Rekap absensi harian ' + r.kelas, ket: blnPanjang(r.bulan) + ' · A4 mendatar' });
}

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

// ════════════════════════════════════════════════════════════
// Kartu hadir QR: cetak per kelas (A4, 10 kartu ukuran KTP), ganti kode kartu hilang
// ════════════════════════════════════════════════════════════
ACT['kartu-modal'] = function (el) { kartuModal(el && el.dataset.kelas); };
function kartuModal(idKelas) {
  const semua = hasAny(['admin', 'guru_bk', 'waka']);
  const opsi = semua ? S.refs.kelas : S.refs.kelas.filter(function (k) { return (S.kelasWali || []).indexOf(k.id) >= 0; });
  if (!opsi.length) { toast('Tidak ada kelas yang dapat Anda cetak kartunya.', 'warn'); return; }
  const def = idKelas || (S.kelasWali || [])[0] || opsi[0].id;
  const m = openModal({
    title: 'Kartu hadir QR', sub: 'Satu kartu per murid. A4 tegak, 10 kartu per halaman (85,6 × 54 mm, ukuran KTP).', size: 'lg', noFocus: true,
    body: '<div class="row wrap" style="gap:8px"><select class="select" id="kt-kls" style="width:auto;min-width:180px">' + opsi.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === def ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select><label class="check"><input type="checkbox" id="kt-all" checked> Pilih semua</label></div>' +
      '<div class="note info mt-12"><i class="bi bi-shield-lock"></i><div class="xs">Isi QR berupa kode acak, bukan NIS. Bila kartu hilang atau dipinjamkan, tekan <b>Ganti kode</b>: kartu lama langsung tidak berlaku, lalu cetak ulang kartu murid itu saja.</div></div><div id="kt-list" class="mt-12">' + skeleton(2) + '</div>',
    foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" id="kt-cetak" disabled><i class="bi bi-printer"></i> Cetak kartu terpilih</button>'
  });
  const muat = function () {
    $('#kt-list', m.el).innerHTML = skeleton(2);
    api('kartu.data', { id_kelas: $('#kt-kls', m.el).value }).then(function (d) {
      P.kt = d;
      $('#kt-list', m.el).innerHTML = d.murid.length ? '<div class="kt-list">' + d.murid.map(function (x, i) {
        return '<label class="kt-row"><input type="checkbox" data-kt="' + i + '" checked><span class="grow"><b>' + esc(x.nama) + '</b><span class="xs muted">NIS ' + esc(x.nis) + ' · <span class="mono">' + esc(x.kode) + '</span></span></span><button type="button" class="btn sm" data-act="kt-ganti" data-i="' + i + '"><i class="bi bi-arrow-repeat"></i> Ganti kode</button></label>';
      }).join('') + '</div>' : empty('bi-people', 'Belum ada murid aktif di kelas ini');
      $('#kt-cetak', m.el).disabled = !d.murid.length;
    }).catch(function (e) { $('#kt-list', m.el).innerHTML = errBox(e); });
  };
  $('#kt-kls', m.el).addEventListener('change', muat);
  $('#kt-all', m.el).addEventListener('change', function (e) { $$('[data-kt]', m.el).forEach(function (c) { c.checked = e.target.checked; }); });
  $('#kt-cetak', m.el).addEventListener('click', function () {
    const pilih = $$('[data-kt]', m.el).filter(function (c) { return c.checked; }).map(function (c) { return P.kt.murid[+c.dataset.kt]; });
    if (!pilih.length) { toast('Pilih minimal satu murid.', 'warn'); return; }
    m.close();
    cetakHtml(kartuHtml(P.kt, pilih), { margin: '8mm', judul: 'Kartu hadir ' + P.kt.kelas + ' (' + pilih.length + ' kartu)', ket: 'A4 tegak · aktifkan "Grafik latar" agar warna ikut tercetak · gunting sesuai garis' });
  });
  muat();
}
ACT['kt-ganti'] = function (el, e) {
  if (e) e.preventDefault();
  const x = P.kt.murid[+el.dataset.i];
  confirmDlg('Kode kartu ' + x.nama + ' akan diganti. Kartu lama tidak dapat dipakai lagi. Lanjutkan?', 'Ganti kode', true, 'Ganti kode kartu').then(function (ok) {
    if (!ok) return;
    run(el, api('kartu.ganti', { id_murid: x.id })).then(function (r) {
      x.kode = r.kode;
      const row = el.closest('.kt-row'); if (row) $('.mono', row).textContent = r.kode;
      toast('Kode kartu ' + r.nama + ' diganti. Cetak ulang kartunya.');
    }).catch(fail);
  });
};
function kartuHtml(d, list) {
  const kartu = function (x) {
    return '<div class="kt"><div class="kt-top"><span class="logo-emblem kt-logo"></span><div class="grow"><div class="kt-k">KARTU HADIR MURID</div><div class="kt-s">' + esc(d.sekolah) + '</div></div></div>' +
      '<div class="kt-body"><div class="kt-qr">' + QR.svg('SKB:' + x.kode, { margin: 1 }) + '<div class="kt-code">' + esc(x.kode) + '</div></div>' +
      '<div class="kt-id"><div class="kt-nama">' + esc(x.nama) + '</div><div class="kt-f"><span>NIS</span>' + esc(x.nis) + '</div><div class="kt-f"><span>Kelas</span>' + esc(d.kelas) + '</div><div class="kt-f"><span>Tahun ajaran</span>' + esc(d.tahunAjaran || '') + '</div></div></div>' +
      '<div class="kt-foot">Pindai setiap pagi di gerbang · Kartu pribadi, jangan dipinjamkan</div></div>';
  };
  let h = '';
  for (let i = 0; i < list.length; i += 10) h += '<div class="kt-page">' + list.slice(i, i + 10).map(kartu).join('') + '</div>';
  return h;
}

// ════════════════════════════════════════════════════════════
// Administrasi → tab "Kehadiran & Libur": absensi QR, petugas pindai, hari libur, kapasitas data
// ════════════════════════════════════════════════════════════
function adKehadiran() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('kehadiran.get').then(function (r) { P.kh = r; P.khLib = r.libur.map(function (x) { return { d1: x.d1, d2: x.d2, k: x.k }; }); khGambar(); }).catch(function (e) { isiHtml('#ad-body', errBox(e, true)); });
}
function khGambar() {
  const r = P.kh, kp = r.kapasitas;
  const otomatis = r.users.filter(function (u) { return u.otomatis; }).length;
  let h = '<div class="grid g-2"><div class="col gap-16">' +
    '<div class="card pad"><div class="row between wrap"><h3><i class="bi bi-qr-code-scan" style="color:var(--teal)"></i> Absensi QR</h3>' + (r.qrAktif ? '<span class="chip st-Selesai">Aktif</span>' : '<span class="chip neutral">Nonaktif</span>') + '</div>' +
    '<p class="xs muted mt-8">Murid memindai kartu di gerbang; absensi harian wali kelas terisi otomatis. Selama nonaktif, menu Pindai Hadir tidak muncul dan semua tetap dicatat manual seperti biasa.</p>' +
    '<form id="f-kh" class="form-grid c2 mt-12" novalidate>' + fld({ name: 'qrAktif', label: 'Status', type: 'select', value: r.qrAktif ? '1' : '0', opts: [{ v: '1', l: 'Aktif' }, { v: '0', l: 'Nonaktif' }] }) +
    fld({ name: 'jamMasuk', label: 'Batas jam masuk', type: 'time', value: r.jamMasuk, hint: 'Pindai setelah jam ini tercatat Terlambat.' }) + '</form>' +
    '<div class="field mt-12"><span class="flabel">Petugas pindai tambahan</span><div class="hint" style="margin:2px 0 8px">Guru BK, Waka, dan Admin (' + otomatis + ' akun) otomatis boleh memindai. Centang guru piket lainnya.</div><div class="kh-pet" id="kh-pet">' +
    r.users.filter(function (u) { return !u.otomatis; }).map(function (u) { return '<label class="check"><input type="checkbox" value="' + esc(u.email) + '"' + (u.dipilih ? ' checked' : '') + '> ' + esc(u.nama) + '</label>'; }).join('') + '</div></div>' +
    '<div class="row wrap mt-12"><button class="btn primary" data-act="kh-simpan"><i class="bi bi-check-lg"></i> Simpan</button><button class="btn" data-act="kartu-modal"><i class="bi bi-qr-code"></i> Cetak kartu QR</button></div>' +
    (r.tanpaKode ? '<div class="xs muted mt-8">' + r.tanpaKode + ' murid belum punya kode kartu; kode dibuat otomatis saat kartu dicetak atau petugas membuka Pindai Hadir.</div>' : '') + '</div>' +
    '<div class="card pad"><h3><i class="bi bi-database" style="color:var(--indigo)"></i> Kapasitas data</h3><p class="xs muted mt-8">Batas Google Sheets: 20 juta sel per berkas, termasuk kolom dan baris kosong.</p>' +
    '<div class="row between mt-12"><b style="font:800 22px var(--font-h)">' + kp.persen + '%</b><span class="xs muted">' + kp.total.toLocaleString('id-ID') + ' dari ' + kp.batas.toLocaleString('id-ID') + ' sel</span></div>' +
    '<div class="bar mt-8 ' + (kp.persen >= 70 ? 'bar-warn' : '') + '"><i style="width:' + Math.min(100, kp.persen) + '%"></i></div>' +
    '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Lembar</th><th>Baris data</th><th>Sel</th></tr></thead><tbody>' + kp.lembar.map(function (x) { return '<tr><td>' + esc(x.nama) + (x.kolomKosong ? ' <span class="xs muted">(' + x.kolomKosong + ' kolom kosong)</span>' : '') + '</td><td>' + x.baris.toLocaleString('id-ID') + '</td><td>' + x.sel.toLocaleString('id-ID') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="row wrap mt-12"><button class="btn" data-act="kh-rapikan"><i class="bi bi-arrow-repeat"></i> Rapikan kolom & baris kosong</button></div>' +
    '<div class="xs muted mt-8">Bila mendekati 70%, arsipkan data di tab Tahun Ajaran (bisa per semester). Sekolah dengan lebih dari ± 600 murid disarankan mengarsipkan setiap akhir semester.</div></div></div>' +
    '<div class="col gap-16"><div class="card pad"><h3><i class="bi bi-calendar-range" style="color:var(--indigo)"></i> Hari sekolah</h3>' +
    '<p class="xs muted mt-8">Hari di luar hari sekolah tampil sebagai <b>Libur</b>: pengingat absensi harian tidak muncul dan pemindaian QR tidak dicatat. Minggu selalu libur.</p>' +
    '<div class="row wrap mt-12" style="gap:8px;align-items:center"><select class="select" id="kh-hs" style="width:auto;min-width:220px"><option value="5"' + (r.hariSekolah === 6 ? '' : ' selected') + '>Senin – Jumat (5 hari)</option><option value="6"' + (r.hariSekolah === 6 ? ' selected' : '') + '>Senin – Sabtu (6 hari)</option></select><button class="btn primary" data-act="kh-hari"><i class="bi bi-check-lg"></i> Simpan</button></div>' +
    '<div class="xs muted mt-8">Ada kegiatan wajib di hari Sabtu? Pilih sementara Senin – Sabtu, lalu kembalikan setelah kegiatan.</div></div>' +
    '<div class="card pad"><div class="row between wrap"><h3><i class="bi bi-calendar-heart" style="color:var(--rose)"></i> Hari libur & kegiatan sekolah</h3><span class="xs muted">' + P.khLib.length + ' entri</span></div>' +
    '<p class="xs muted mt-8">Tanggal di sini dilewati oleh deteksi pola ketidakhadiran, pengingat absensi harian, dan pemindaian QR. Masukkan libur nasional, cuti bersama, libur semester, dan kegiatan sekolah tanpa absensi.</p>' +
    '<div id="kh-lib" class="mt-12"></div><div class="row wrap mt-12"><button class="btn sm" data-act="kh-lib-tambah"><i class="bi bi-plus-lg"></i> Tambah baris</button><button class="btn sm" data-act="kh-lib-tempel"><i class="bi bi-clipboard"></i> Tempel daftar</button></div>' +
    '<div class="row wrap mt-16"><button class="btn primary" data-act="kh-lib-simpan"><i class="bi bi-check-lg"></i> Simpan hari libur</button></div></div></div></div>';
  $('#ad-body').innerHTML = h;
  khLibGambar();
}
function khLibGambar() {
  const box = $('#kh-lib'); if (!box) return;
  box.innerHTML = P.khLib.length ? '<div class="kh-lib">' + P.khLib.map(function (x, i) {
    const lewat = (x.d2 || x.d1) < P.kh.hariIni;
    return '<div class="kh-l' + (lewat ? ' lewat' : '') + '"><input class="input" type="date" data-lib="' + i + '" data-f="d1" value="' + esc(x.d1) + '" aria-label="Mulai"><input class="input" type="date" data-lib="' + i + '" data-f="d2" value="' + esc(x.d2 && x.d2 !== x.d1 ? x.d2 : '') + '" aria-label="Sampai (opsional)"><input class="input" data-lib="' + i + '" data-f="k" maxlength="80" value="' + esc(x.k) + '" placeholder="Keterangan, mis. Libur semester"><button class="icon-btn" data-act="kh-lib-hapus" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div>';
  }).join('') + '</div><div class="xs muted mt-8">Kolom kedua (sampai) dikosongkan untuk libur satu hari. Baris redup = sudah lewat.</div>' : empty('bi-calendar-heart', 'Belum ada hari libur', 'Tambahkan baris atau tempel daftar tanggal.');
  $$('[data-lib]', box).forEach(function (inp) {
    inp.addEventListener('change', function () { const x = P.khLib[+inp.dataset.lib]; if (!x) return; x[inp.dataset.f] = inp.value.trim(); if (inp.dataset.f === 'd1' && (!x.d2 || x.d2 < x.d1)) x.d2 = ''; });
  });
}
ACT['kh-lib-tambah'] = function () { P.khLib.push({ d1: S.today, d2: '', k: '' }); khLibGambar(); const l = $$('#kh-lib [data-f="k"]'); if (l.length) l[l.length - 1].focus(); };
ACT['kh-lib-hapus'] = function (el) { P.khLib.splice(+el.dataset.i, 1); khLibGambar(); };
/** Tempel daftar: satu baris per libur. Contoh: "2026-12-25 Natal", "24/12/2026 - 31/12/2026 Libur semester". */
function parseTglBebas(s) {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
ACT['kh-lib-tempel'] = function () {
  const m = openModal({
    title: 'Tempel daftar hari libur', sub: 'Satu baris per libur. Tanggal boleh berformat 2026-12-25 atau 25/12/2026.',
    body: '<textarea class="textarea" id="kh-teks" rows="9" placeholder="2026-12-25 Hari Raya Natal&#10;24/12/2026 - 31/12/2026 Libur semester ganjil&#10;2027-01-01 Tahun Baru"></textarea><div class="xs muted mt-8">Rentang ditulis dengan tanda hubung atau "s.d.". Baris yang tidak terbaca dilewati.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="kh-teks-ok">Tambahkan</button>'
  });
  $('#kh-teks-ok', m.el).addEventListener('click', function () {
    let n = 0;
    $('#kh-teks', m.el).value.split(/\r?\n/).forEach(function (baris) {
      const t = baris.trim(); if (!t) return;
      const r = /^([0-9][0-9\/.\-]{6,9}[0-9])(?:\s*(?:-|–|—|s\.?\s*d\.?|sampai|hingga)\s*([0-9][0-9\/.\-]{6,9}[0-9]))?\s*[,;:|]?\s*(.*)$/i.exec(t);
      if (!r) return;
      const d1 = parseTglBebas(r[1]), d2 = r[2] ? parseTglBebas(r[2]) : '';
      if (!d1) return;
      const e = { d1: d1, d2: d2 && d2 > d1 ? d2 : '', k: (r[3] || '').trim() || 'Libur' };
      if (P.khLib.some(function (x) { return x.d1 === e.d1 && (x.d2 || x.d1) === (e.d2 || e.d1) && String(x.k).toLowerCase() === e.k.toLowerCase(); })) return;
      P.khLib.push(e); n++;
    });
    m.close(); khLibGambar();
    toast(n ? n + ' baris ditambahkan. Tekan Simpan hari libur.' : 'Tidak ada baris yang terbaca.', n ? '' : 'warn');
  });
};
ACT['kh-lib-simpan'] = function (el) {
  const list = P.khLib.filter(function (x) { return x.d1; }).map(function (x) { return { d1: x.d1, d2: x.d2 || x.d1, k: x.k || 'Libur' }; });
  run(el, api('libur.simpan', { list: list })).then(function (r) { P.khLib = r.list.map(function (x) { return { d1: x.d1, d2: x.d2, k: x.k }; }); khLibGambar(); toast('Hari libur tersimpan (' + r.list.length + ' entri).'); }).catch(fail);
};
ACT['kh-hari'] = function (el) {
  const v = $('#kh-hs').value;
  run(el, api('kehadiran.simpan', { hariSekolah: v })).then(function (r) {
    P.kh = Object.assign(P.kh, r); ccClear(); toast('Hari sekolah: ' + (v === '6' ? 'Senin – Sabtu' : 'Senin – Jumat') + '.');
  }).catch(fail);
};
ACT['kh-simpan'] = function (el) {
  const d = formData($('#f-kh'));
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.jamMasuk || '')) { toast('Isi batas jam masuk dengan format JJ:MM.', 'err'); return; }
  const pet = $$('#kh-pet input:checked').map(function (c) { return c.value; });
  run(el, api('kehadiran.simpan', { qrAktif: d.qrAktif === '1', jamMasuk: d.jamMasuk, petugas: pet })).then(function (r) {
    P.kh = Object.assign(P.kh, r); toast('Pengaturan absensi QR tersimpan.');
    return api('boot').then(function (b) { S.cfg = b.config; S.menu = b.menu; renderShell(); setNavActive('admin'); khGambar(); });
  }).catch(fail);
};
ACT['kh-rapikan'] = function (el) {
  confirmDlg('Kolom kosong di kanan dan baris kosong berlebih di bawah setiap lembar aplikasi akan dihapus. Data tidak berubah. Lanjutkan?', 'Rapikan', false, 'Rapikan Spreadsheet').then(function (ok) {
    if (!ok) return;
    run(el, api('kapasitas.rapikan')).then(function (r) { P.kh.kapasitas = r.kapasitas; khGambar(); toast(r.dihapus.kolom + ' kolom dan ' + r.dihapus.baris + ' baris kosong dihapus.'); }).catch(fail);
  });
};

// ════════════════════════════════════════════════════════════
// Layanan BK → "Permintaan murid": murid mengisi formulir tanpa akun, Guru BK menjadwalkan & menindaklanjuti
// ════════════════════════════════════════════════════════════
function temuRingkas() {
  const box = $('#ly-temu'); if (!box) return;
  apiC('temu.daftar', {}).then(function (d) {
    P.temu = d;
    const b = d.hitung.Baru, j = d.hitung.Dijadwalkan;
    box.innerHTML = '<div class="temu-bar' + (b ? ' ada' : '') + '"><span class="t-ic"><i class="bi bi-person-raised-hand"></i></span><div class="grow"><b>' + (b ? b + ' murid ingin bertemu Guru BK' : 'Permintaan konseling dari murid') + '</b><span>' + (d.atur.aktif ? 'Formulir terbuka' + (j ? ' · ' + j + ' pertemuan dijadwalkan' : '') : 'Formulir murid belum dibuka. Murid bisa meminta bertemu Guru BK tanpa akun.') + '</span></div>' +
      '<button class="btn sm" data-act="temu-atur"><i class="bi bi-sliders"></i> Formulir</button><button class="btn sm primary" data-act="temu-buka"><i class="bi bi-inbox"></i> Buka' + (b + j ? ' (' + (b + j) + ')' : '') + '</button></div>';
  }).catch(function () { box.innerHTML = ''; });
}
ACT['temu-buka'] = function () { temuDrawer('aktif'); };
const TEMU_ST = { Baru: 'st-Baru', Dijadwalkan: 'st-Diproses', Selesai: 'st-Selesai', Ditutup: 'neutral' };
function temuDrawer(filter) {
  P.temuF = filter || P.temuF || 'aktif';
  const dr = openDrawer({ head: '<div class="grow"><div class="crumb">Layanan BK</div><h3 style="margin:0">Permintaan murid</h3></div>', body: skeleton(3) });
  P.temuDr = dr;
  temuMuat();
}
function temuMuat() {
  const dr = P.temuDr; if (!dr) return;
  const st = P.temuF === 'aktif' ? '' : P.temuF;
  apiC('temu.daftar', { status: st }).then(function (d) {
    P.temu = d;
    dr.body.innerHTML = '<div class="fchips">' + [['aktif', 'Perlu tindak lanjut (' + (d.hitung.Baru + d.hitung.Dijadwalkan) + ')'], ['Selesai', 'Selesai'], ['Ditutup', 'Ditutup'], ['semua', 'Semua']].map(function (x) { return '<button class="fchip ' + (P.temuF === x[0] ? 'active' : '') + '" data-act="temu-f" data-f="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' +
      (d.rows.length ? '<div class="col gap-12 mt-16">' + d.rows.map(function (x, i) {
        return '<div class="temu-item' + (x.urgensi === 'Segera' && x.status === 'Baru' ? ' segera' : '') + '"><div class="row between wrap"><div><b>' + esc(x.murid.nama) + '</b><div class="xs muted">' + esc(x.murid.kelas) + ' · NIS ' + esc(x.murid.nis) + ' · ' + esc(fTs(x.ts)) + '</div></div><div class="row wrap" style="gap:6px">' + (x.urgensi === 'Segera' ? '<span class="chip u-Mendesak"><i class="bi bi-circle-fill"></i> Segera</span>' : '') + '<span class="chip ' + (TEMU_ST[x.status] || 'neutral') + '">' + esc(x.status) + '</span></div></div>' +
          '<div class="row wrap mt-8" style="gap:6px"><span class="chip purple">' + esc(x.topik) + '</span><span class="chip neutral"><i class="bi bi-clock"></i> ' + esc(x.waktu) + '</span></div>' +
          (x.cerita ? '<div class="temu-cerita mt-8">' + esc(x.cerita) + '</div>' : '') +
          (x.jadwal ? '<div class="xs mt-8"><b>Jadwal:</b> ' + esc(x.jadwal) + '</div>' : '') + (x.catatan_bk ? '<div class="xs muted mt-8">Catatan BK: ' + esc(x.catatan_bk) + '</div>' : '') + (x.penangani ? '<div class="xs muted">Ditangani: ' + esc(x.penangani) + '</div>' : '') +
          '<div class="row wrap mt-12" style="gap:6px">' + (x.status === 'Baru' || x.status === 'Dijadwalkan' ? '<button class="btn sm" data-act="temu-jadwal" data-i="' + i + '"><i class="bi bi-calendar-event"></i> ' + (x.jadwal ? 'Ubah jadwal' : 'Jadwalkan') + '</button><button class="btn sm primary" data-act="temu-layanan" data-i="' + i + '"><i class="bi bi-heart-pulse"></i> Catat layanan</button><button class="btn sm ghost" data-act="temu-tutup" data-i="' + i + '">Tutup</button>' : '') +
          '<button class="btn sm ghost" data-act="open-murid" data-id="' + esc(x.murid.id) + '"><i class="bi bi-activity"></i> Garis waktu</button></div></div>';
      }).join('') + '</div>' : empty('bi-inbox', P.temuF === 'aktif' ? 'Tidak ada permintaan yang menunggu' : 'Belum ada data', d.atur.aktif ? '' : 'Buka formulir murid lewat tombol Formulir di halaman Layanan BK.'));
  }).catch(function (e) { dr.body.innerHTML = errBox(e); });
}
ACT['temu-f'] = function (el) { P.temuF = el.dataset.f; temuMuat(); };
ACT['temu-jadwal'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  const m = openModal({
    title: 'Jadwalkan pertemuan', sub: x.murid.nama + ' · ' + x.murid.kelas,
    body: '<form id="f-tj" class="form-grid" novalidate>' + fld({ name: 'jadwal', label: 'Waktu & tempat pertemuan', req: true, max: 80, value: x.jadwal || '', ph: 'mis. Selasa 28 Okt · istirahat pertama · Ruang BK', hint: 'Murid tidak punya akun; sampaikan jadwal secara langsung atau lewat wali kelas.' }) +
      fld({ name: 'catatan_bk', label: 'Catatan (hanya Guru BK)', type: 'textarea', rows: 3, max: 1000, value: x.catatan_bk || '' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tj-ok">Simpan</button>'
  });
  $('#tj-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-tj', m.el), d = formData(f);
    if (!validate(f, d, { jadwal: { label: 'Waktu pertemuan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('temu.ubah', { id: x.id, status: 'Dijadwalkan', jadwal: d.jadwal, catatan_bk: d.catatan_bk })).then(function () { m.close(); toast('Pertemuan dijadwalkan.'); temuMuat(); temuRingkas(); }).catch(fail);
  });
};
ACT['temu-tutup'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  const m = openModal({
    title: 'Tutup permintaan', sub: x.murid.nama,
    body: fld({ name: 'catatan_bk', label: 'Alasan / catatan', type: 'textarea', rows: 3, max: 1000, ph: 'mis. Sudah ditemui langsung; permintaan ganda; bukan dari murid yang bersangkutan.' }),
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tt-ok">Tutup permintaan</button>'
  });
  $('#tt-ok', m.el).addEventListener('click', function (e) {
    run(e.currentTarget, api('temu.ubah', { id: x.id, status: 'Ditutup', catatan_bk: $('[name=catatan_bk]', m.el).value })).then(function () { m.close(); toast('Permintaan ditutup.'); temuMuat(); temuRingkas(); }).catch(fail);
  });
};
ACT['temu-layanan'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  if (P.temuDr) P.temuDr.close();
  lyForm(null, { murid: { id: x.murid.id, nama: x.murid.nama, kelas: x.murid.kelas }, sumber: 'Inisiatif murid', komponen: x.topik === 'Rencana sekolah lanjutan/karier' ? 'Peminatan & Perencanaan Individual' : 'Responsif', sasaran: 'Individu', permintaan: x.id, topik: x.topik });
};
ACT['temu-atur'] = function () {
  const m = openModal({ title: 'Formulir "Saya ingin bertemu Guru BK"', sub: 'Murid mengisi tanpa akun: kode formulir + NIS. Permintaan masuk ke lonceng Guru BK.', size: 'lg', body: skeleton(2), foot: '<button class="btn" data-close>Tutup</button>' });
  const gambar = function (a) {
    m.body.innerHTML = '<div class="row between wrap"><div><b>Status formulir</b><div class="xs muted">' + (a.aktif ? 'Terbuka. Murid dapat mengirim permintaan.' : 'Tertutup. Murid melihat pesan agar datang langsung ke ruang BK.') + '</div></div><button class="btn ' + (a.aktif ? 'soft-danger' : 'primary') + '" id="ta-tg">' + (a.aktif ? 'Tutup formulir' : 'Buka formulir') + '</button></div>' +
      (a.aktif && a.url ? '<div class="grid g-2 mt-16" style="align-items:center"><div class="temu-qr">' + QR.svg(a.url, { margin: 2 }) + '</div><div class="col gap-12"><div><div class="xs muted">Kode formulir</div><div class="mono" style="font-size:28px;letter-spacing:4px">' + esc(a.kode) + '</div></div>' +
        '<div class="field"><label for="ta-url">Tautan</label><input class="input" id="ta-url" readonly value="' + esc(a.url) + '"></div><div class="row wrap"><button class="btn sm" id="ta-salin"><i class="bi bi-clipboard"></i> Salin tautan</button><button class="btn sm" id="ta-poster"><i class="bi bi-printer"></i> Cetak poster</button><button class="btn sm ghost" id="ta-ganti"><i class="bi bi-arrow-repeat"></i> Ganti kode</button></div></div></div>' +
        '<div class="note info mt-16"><i class="bi bi-info-circle"></i><div class="xs">Tempel poster di kelas/mading, bagikan tautan di grup kelas, atau tuliskan kode di papan. Ganti kode bila ada penyalahgunaan; tautan lama otomatis tidak berlaku. Pemberitahuan email ke Guru BK tidak memuat nama murid maupun isi cerita.</div></div>' : '') +
      (a.aktif && !a.url ? '<div class="note mt-16"><i class="bi bi-exclamation-triangle"></i><div class="xs">Tautan aplikasi belum terbaca. Pastikan aplikasi sudah di-deploy sebagai Web App.</div></div>' : '');
    $('#ta-tg', m.el).addEventListener('click', function (e) { run(e.currentTarget, api('temu.atur', { aktif: !a.aktif })).then(function (b) { gambar(b); temuRingkas(); toast(b.aktif ? 'Formulir dibuka.' : 'Formulir ditutup.'); }).catch(fail); });
    if ($('#ta-salin', m.el)) {
      $('#ta-salin', m.el).addEventListener('click', function () { salin(a.url, 'Tautan disalin.'); });
      $('#ta-ganti', m.el).addEventListener('click', function (e) { confirmDlg('Kode lama dan tautan/poster lama tidak berlaku lagi. Lanjutkan?', 'Ganti kode', true).then(function (ok) { if (ok) run(e.target.closest('button'), api('temu.atur', { ganti: true })).then(gambar).catch(fail); }); });
      $('#ta-poster', m.el).addEventListener('click', function () { m.close(); temuPoster(a); });
    }
  };
  api('temu.atur', {}).then(gambar).catch(function (e) { m.body.innerHTML = errBox(e); });
};
function temuPoster(a) {
  const h = '<div class="pr-doc poster"><div class="ps-band">' + esc(a.sekolah || S.cfg.namaSekolah) + '</div><h1>Ingin bercerita dengan Guru BK?</h1><p class="ps-lead">Tentang belajar, teman, keluarga, perasaan, atau rencana sekolah lanjutan. Kamu tidak sendirian.</p>' +
    '<div class="ps-qr">' + QR.svg(a.url, { margin: 2 }) + '</div><ol class="ps-step"><li>Pindai kode QR di atas dengan HP.</li><li>Masukkan kode <b class="mono">' + esc(a.kode) + '</b> dan NIS-mu.</li><li>Pilih topik dan waktu yang kamu inginkan. Guru BK akan menemuimu.</li></ol>' +
    '<p class="ps-note">Ceritamu hanya dibaca Guru BK. Dalam keadaan darurat, segera temui guru terdekat atau datang ke ruang BK.</p></div>';
  cetakHtml(h, { judul: 'Poster formulir bertemu Guru BK', ket: 'A4 tegak · tempel di kelas atau mading' });
}

// ════════════════════════════════════════════════════════════
// WhatsApp orang tua tanpa pindah halaman: jendela kecil → buka WhatsApp → "Sudah terkirim?" → tercatat
// ════════════════════════════════════════════════════════════
const WA_TPL_DASAR = [['undangan', 'Undangan diskusi'], ['absen', 'Info ketidakhadiran'], ['jadwal', 'Jadwal pertemuan']];
function waTpl() { return WA_TPL_DASAR.concat(S.cfg && S.cfg.poinAktif ? [['poin', 'Info poin tata tertib']] : []); }
ACT['wa-murid'] = function (el) { waModal({ id_murid: el.dataset.id, templat: el.dataset.t, tanggal: el.dataset.tgl, id_kasus: el.dataset.kasus }); };
function waModal(o) {
  const m = openModal({ title: 'Hubungi orang tua', sub: 'Menyiapkan pesan…', body: skeleton(2), foot: '<button class="btn ghost" id="wa-lengkap"><i class="bi bi-file-earmark-text"></i> Surat & riwayat</button><button class="btn" data-close>Tutup</button>', noFocus: true });
  $('#wa-lengkap', m.el).addEventListener('click', function () { m.close(); navigateTo('ortu', { id_murid: o.id_murid, id_kasus: o.id_kasus || '', templat: o.templat || '', tanggal: o.tanggal || '' }); });
  const muat = function (tpl) {
    o.templat = tpl;
    apiC('ortu.siapkan', { id_murid: o.id_murid, templat: tpl, tanggal: o.tanggal || '' }).then(function (s) { waGambar(m, o, s); }).catch(function (e) { m.body.innerHTML = errBox(e); });
  };
  m.muat = muat;
  muat(waTpl().some(function (t) { return t[0] === o.templat; }) ? o.templat : 'undangan');
}
function waGambar(m, o, s) {
  const sub = $('.m-head .xs', m.el); if (sub) sub.textContent = s.nama_murid + ' · ' + s.kelas + ' · ' + (s.nama_ortu || 'orang tua/wali');
  m.body.innerHTML = '<div class="fchips">' + waTpl().map(function (t) { return '<button class="fchip ' + (t[0] === o.templat ? 'active' : '') + '" data-wtpl="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="field mt-12"><label for="wa-msg">Pesan (dapat diubah)</label><textarea class="textarea" id="wa-msg" rows="6" maxlength="1000">' + esc(s.pesan) + '</textarea></div>' +
    '<div class="row wrap mt-12" id="wa-aksi">' + (s.hp ? '<a class="btn wa-btn" id="wa-go" href="#" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Kirim lewat WhatsApp</a>' : '<span class="chip st-Baru"><i class="bi bi-exclamation-triangle"></i> Nomor WhatsApp orang tua belum valid</span>') + '<button class="btn" id="wa-salin"><i class="bi bi-clipboard"></i> Salin</button></div>' +
    '<div id="wa-sesudah" class="wa-after hide"><i class="bi bi-chat-dots"></i><div class="grow"><b>Sudah terkirim?</b><span>Catat agar tampil di garis waktu murid.</span></div><button class="btn sm" id="wa-belum">Belum</button><button class="btn sm primary" id="wa-catat"><i class="bi bi-check-lg"></i> Ya, catat</button></div>' +
    (s.hp ? '' : '<div class="xs muted mt-8">Wali kelas dapat memperbarui nomor di Kelas Saya → Kontak; admin di Administrasi → Murid.</div>');
  const msg = $('#wa-msg', m.el);
  $$('[data-wtpl]', m.el).forEach(function (b) { b.addEventListener('click', function () { m.body.innerHTML = skeleton(2); m.muat(b.dataset.wtpl); }); });
  const go = $('#wa-go', m.el);
  const href = function () { return 'https://wa.me/' + s.hp + '?text=' + encodeURIComponent(msg.value); };
  if (go) {
    go.href = href();
    msg.addEventListener('input', function () { go.href = href(); });
    go.addEventListener('click', function () { setTimeout(function () { show('#wa-sesudah', true); }, 500); });
  }
  $('#wa-salin', m.el).addEventListener('click', function () { salin(msg.value, 'Pesan disalin.'); if (!s.hp) show('#wa-sesudah', true); });
  $('#wa-belum', m.el).addEventListener('click', function () { show('#wa-sesudah', false); });
  $('#wa-catat', m.el).addEventListener('click', function () {
    const label = (waTpl().filter(function (t) { return t[0] === o.templat; })[0] || ['', 'Komunikasi'])[1];
    const d = { id_murid: o.id_murid, tanggal: S.today, media: 'WhatsApp', tujuan: label, ringkasan_pembahasan: msg.value, hasil: 'Pesan terkirim; menunggu tanggapan orang tua.' };
    if (o.id_kasus) d.id_kasus = o.id_kasus;
    m.close();
    toast('Komunikasi tercatat.');
    // Optimistis: jendela langsung tertutup, pencatatan berjalan di latar belakang.
    api('ortu.catat', d).then(function () { if (S.page === 'ortu' && P.or && P.or.id === o.id_murid) apiC('ortu.riwayat', { id_murid: o.id_murid }).then(function (rw) { P.or.rw = rw; orHist(); }); })
      .catch(function (e) { toast('Gagal mencatat komunikasi: ' + e.message, 'err'); });
  });
}


// ════════════════════════════════════════════════════════════
// Antrean simpan (UI optimistis): absensi langsung dinyatakan tersimpan di layar, dikirim ke server di latar
// belakang. Antrean disimpan di perangkat (aman saat sinyal putus atau tab tertutup) dan dikirim berurutan.
// ════════════════════════════════════════════════════════════
const OB = { list: [], sending: false, timer: null };
const OB_CB = {};
function obKey() { return 'sk_ob_' + (S.email || sget('sk_email') || ''); }
function obMuat() { try { OB.list = JSON.parse(lstore(obKey()) || '[]') || []; } catch (e) { OB.list = []; } return OB.list; }
function obSimpan() { lstore(obKey(), JSON.stringify(OB.list)); obChip(); }
function obAda(kunci) { return obMuat().some(function (x) { return x.kunci === kunci; }); }
function obTambah(action, payload, label, kunci, onOk) {
  obMuat();
  OB.list = OB.list.filter(function (x) { return x.kunci !== kunci; }); // simpan ulang sebelum terkirim: pakai yang terbaru
  OB.list.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), action: action, payload: payload, label: label, kunci: kunci, t: Date.now() });
  obSimpan();
  if (onOk) OB_CB[kunci] = onOk;
  setTimeout(obKirim, 30);
}
function obKirim() {
  clearTimeout(OB.timer);
  if (!S.user || OB.sending) { obChip(); return; }
  obMuat();
  if (!OB.list.length) { obChip(); return; }
  OB.sending = true; obChip();
  const x = OB.list[0];
  let lanjut = true;
  api(x.action, x.payload, true).then(function (res) {
    obMuat(); OB.list = OB.list.filter(function (y) { return y.id !== x.id; }); obSimpan();
    const cb = OB_CB[x.kunci]; delete OB_CB[x.kunci];
    if (cb) { try { cb(res); } catch (e) { /* abaikan */ } }
  }).catch(function (e) {
    const sementara = e.code === 'AUTH' || e.code === 'PINCHG' || /koneksi|sibuk|jaringan|timeout|server/i.test(e.message || '');
    if (sementara) { lanjut = false; OB.timer = setTimeout(obKirim, 8000); return; }
    obMuat(); OB.list = OB.list.filter(function (y) { return y.id !== x.id; }); obSimpan();
    obGagal(x, e);
  }).then(function () {
    OB.sending = false; obChip();
    if (lanjut && OB.list.length) setTimeout(obKirim, 60);
  });
}
/** Ditolak server (mis. sesi sudah tersimpan oleh orang lain): beri tahu dengan jelas dan tawarkan kirim ulang sebagai koreksi. */
function obGagal(x, e) {
  const m = openModal({
    title: 'Belum tersimpan', sub: x.label, sticky: true,
    body: '<div class="note rose"><i class="bi bi-exclamation-triangle"></i><div>' + esc(e.message) + '</div></div><p class="muted-2 mt-12">Data yang Anda isi masih ada. Pilih <b>Kirim ulang sebagai koreksi</b> untuk menimpa catatan yang sudah ada, atau buka kembali sesi tersebut untuk memeriksanya.</p>',
    foot: '<button class="btn" data-close>Buang</button><button class="btn primary" id="ob-ulang"><i class="bi bi-arrow-repeat"></i> Kirim ulang sebagai koreksi</button>'
  });
  $('#ob-ulang', m.el).addEventListener('click', function () {
    m.close();
    obTambah(x.action, Object.assign({}, x.payload, { koreksi: true }), x.label, x.kunci);
    toast('Dikirim ulang sebagai koreksi.');
  });
}
function obChip() {
  const tb = $('#topbar'); if (!tb) return;
  let c = $('#ob-chip');
  const n = OB.list.length;
  if (!n) { if (c) c.remove(); return; }
  if (!c) { c = document.createElement('button'); c.id = 'ob-chip'; c.className = 'top-chip ob-chip'; c.setAttribute('data-act', 'ob-info'); const b = $('#bell'); tb.insertBefore(c, b || null); }
  const luring = !navigator.onLine || !!OB.timer;
  c.classList.toggle('luring', luring);
  c.innerHTML = '<i class="bi ' + (luring ? 'bi-cloud-slash' : 'bi-cloud-arrow-up') + '"></i>' + (luring ? 'Menunggu sinyal · ' : 'Menyimpan · ') + n;
}
ACT['ob-info'] = function () {
  obMuat();
  openModal({ title: 'Antrean simpan', sub: 'Data yang sudah Anda simpan dan sedang dikirim ke server',
    body: OB.list.length ? '<div class="col gap-8">' + OB.list.map(function (x) { return '<div class="sec"><b>' + esc(x.label) + '</b><div class="xs muted">Disimpan ' + esc(hhmm(x.t)) + '</div></div>'; }).join('') + '</div><p class="xs muted mt-12">Antrean tersimpan di perangkat ini dan dikirim otomatis saat sinyal tersedia. Jangan keluar akun sebelum antrean kosong.</p>' : empty('bi-cloud-check', 'Semua data sudah tersimpan di server'),
    foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" data-act="ob-kirim" data-close><i class="bi bi-arrow-repeat"></i> Kirim sekarang</button>' });
};
ACT['ob-kirim'] = function () { obKirim(); };

// ════════════════════════════════════════════════════════════
// v1.6 — Format surat sekolah (kop, logo, kertas, huruf) & Rekap periode
// ════════════════════════════════════════════════════════════
var KOP = null;
const KERTAS_CSS = { A4: { w: '210mm', h: '297mm', px: 794, tinggi: 1123, nama: 'A4' }, F4: { w: '215mm', h: '330mm', px: 813, tinggi: 1247, nama: 'F4/Folio' }, Letter: { w: '216mm', h: '279mm', px: 816, tinggi: 1056, nama: 'Letter' } };
function hurufCss(h) { return "'" + String(h || 'Times New Roman').replace(/[^A-Za-z ]/g, '') + "', 'Times New Roman', serif"; }
function kertasNama() { return (KERTAS_CSS[(KOP || {}).kertas] || KERTAS_CSS.A4).nama; }
/** Muat identitas kop & format cetak sekali (disimpan di cache klien; diperbarui diam-diam). */
function siapKop() {
  return apiC('kop.get').then(function (k) { KOP = k; return k; }).catch(function () { return KOP || {}; });
}
function tglTanpaHari(s) { const n = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return (+s.substr(8, 2)) + ' ' + n[+s.substr(5, 2) - 1] + ' ' + s.substr(0, 4); }

// ── Absensi → Rekap periode (per murid: mingguan, bulanan, semester, tanggal bebas) ──
/** Ringkas daftar libur menjadi rentang: "24–31 Des 2026 (Libur semester)". Hanya sampai hari ini. */
function rentangLibur(list, batas) {
  const out = [];
  (list || []).filter(function (x) { return !batas || x.tanggal <= batas; }).forEach(function (x) {
    const a = out[out.length - 1];
    if (a && a.k === x.k && addD(a.s, 1) === x.tanggal) a.s = x.tanggal; else out.push({ d: x.tanggal, s: x.tanggal, k: x.k });
  });
  return out.map(function (r) { return (r.d === r.s ? fTgl(r.d) : fTgl(r.d) + ' – ' + fTgl(r.s)) + (r.k ? ' (' + r.k + ')' : ''); }).join('; ');
}
function rpLiburLalu(d) { return d.libur.filter(function (x) { return x.tanggal <= d.hariIni; }).length; }
function rpParam() {
  const q = P.rpQ || (P.rpQ = { mode: 'bulan', bulan: S.today.substr(0, 7), dari: S.today.substr(0, 8) + '01', sampai: S.today, id_kelas: undefined });
  if (q.id_kelas === undefined) q.id_kelas = hasAny(['guru_bk', 'waka', 'admin']) ? '' : ((S.kelasWali || [])[0] || '');
  const p = { mode: q.mode, id_kelas: q.id_kelas };
  if (q.mode === 'bulan') p.bulan = q.bulan;
  if (q.mode === 'bebas') { p.dari = q.dari; p.sampai = q.sampai; }
  return p;
}
function rpPage(params, tok) {
  return apiC('harian.periode', rpParam()).then(function (d) {
    if (tok !== undefined && stale(tok)) return;
    P.rp = d; P.rpUrut = P.rpUrut || 'nama';
    rpDraw();
  });
}
function rpMuat() {
  $('#rp-isi').innerHTML = skeleton(3);
  apiC('harian.periode', rpParam()).then(function (d) { P.rp = d; rpDraw(); }).catch(function (e) { isiHtml('#rp-isi', errBox(e)); });
}
function rpLabel(d) {
  const per = d.dari === d.sampai ? tglTanpaHari(d.dari) : tglTanpaHari(d.dari) + ' – ' + tglTanpaHari(d.sampai);
  return (d.mode === 'semester' ? 'Semester ' + d.semester + ' · ' : d.mode === 'minggu' ? 'Minggu ini · ' : '') + per;
}
function rpUrut(list) {
  const u = P.rpUrut, a = list.slice();
  if (u === 'alpa') a.sort(function (x, y) { return (y.A - x.A) || (y.T - x.T) || (x.nama < y.nama ? -1 : 1); });
  else if (u === 'hadir') a.sort(function (x, y) { return (x.hadir === null ? 101 : x.hadir) - (y.hadir === null ? 101 : y.hadir) || (x.nama < y.nama ? -1 : 1); });
  return a;
}
function pctTxt(v) { return v === null || v === undefined ? '—' : String(v).replace('.', ',') + '%'; }
function rpDraw() {
  const d = P.rp, q = P.rpQ, t = d.total;
  let h = '<div class="card pad"><div class="seg-wrap"><div class="seg rp-seg" role="group" aria-label="Periode">' + [['minggu', 'Minggu ini'], ['bulan', 'Bulan'], ['semester', 'Semester ini'], ['bebas', 'Pilih tanggal']].map(function (x) {
    return '<button type="button" data-act="rp-mode" data-m="' + x[0] + '" class="' + (q.mode === x[0] ? 'on' : '') + '" aria-pressed="' + (q.mode === x[0]) + '">' + x[1] + '</button>';
  }).join('') + '</div></div>' +
    '<div class="form-grid mt-12" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">' +
    (q.mode === 'bulan' ? '<div class="field"><label for="rp-bln">Bulan</label><input class="input" type="month" id="rp-bln" value="' + esc(q.bulan) + '" max="' + esc(S.today.substr(0, 7)) + '"></div>' : '') +
    (q.mode === 'bebas' ? '<div class="field"><label for="rp-dari">Dari tanggal</label><input class="input" type="date" id="rp-dari" value="' + esc(q.dari) + '"></div><div class="field"><label for="rp-sampai">Sampai tanggal</label><input class="input" type="date" id="rp-sampai" value="' + esc(q.sampai) + '"></div>' : '') +
    '<div class="field"><label for="rp-kls">Kelas</label><select class="select" id="rp-kls">' + (d.pilihan.length > 1 ? '<option value="">Semua kelas (' + d.pilihan.length + ')</option>' : '') + d.pilihan.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === q.id_kelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>&nbsp;</label><div class="row" style="gap:8px"><button class="btn primary grow" data-act="rp-cetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn" data-act="rp-csv" title="Unduh CSV"><i class="bi bi-filetype-csv"></i></button></div></div></div></div>' +
    '<div id="rp-isi"></div>';
  $('#abs-body').innerHTML = h;
  rpIsi();
  const ubah = function () {
    if ($('#rp-bln')) q.bulan = $('#rp-bln').value || q.bulan;
    if ($('#rp-dari')) q.dari = $('#rp-dari').value || q.dari;
    if ($('#rp-sampai')) q.sampai = $('#rp-sampai').value || q.sampai;
    q.id_kelas = $('#rp-kls').value;
    if (q.mode === 'bebas' && q.dari > q.sampai) { toast('Tanggal awal tidak boleh setelah tanggal akhir.', 'warn'); return; }
    rpMuat();
  };
  ['#rp-bln', '#rp-dari', '#rp-sampai', '#rp-kls'].forEach(function (s) { const e = $(s); if (e) e.addEventListener('change', ubah); });
}
function rpIsi() {
  const d = P.rp, t = d.total;
  let h = '<div class="card pad mt-16"><div class="row between wrap" style="gap:8px"><div><b>' + esc(rpLabel(d)) + '</b><div class="xs muted">Hari sekolah = hari kelas mencatat absensi harian' + (rpLiburLalu(d) ? ', di luar ' + rpLiburLalu(d) + ' hari libur' : '') + '.</div></div>' +
    '<div class="fchips" id="rp-u">' + [['nama', 'Urut nama'], ['alpa', 'Alpa terbanyak'], ['hadir', 'Kehadiran terendah']].map(function (x) { return '<button class="fchip ' + (P.rpUrut === x[0] ? 'active' : '') + '" data-act="rp-urut" data-u="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="sumbar mt-12">' + ['H', 'T', 'S', 'I', 'A'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + t[s] + '</b></span>'; }).join('') +
    '<span class="sum"><span class="dotc" style="background:#94A3B8"></span>Belum tercatat <b>' + t.B + '</b></span><span class="sum">Kehadiran <b>' + pctTxt(d.hadir) + '</b></span><span class="sum">Murid <b>' + t.murid + '</b></span></div></div>';
  if (!d.kelas.length) h += '<div class="card pad mt-16">' + empty('bi-people', 'Belum ada murid pada pilihan ini') + '</div>';
  else if (!t.n) h += '<div class="card pad mt-16">' + empty('bi-calendar-x', 'Belum ada absensi harian pada periode ini', 'Absensi harian dicatat wali kelas di tab Harian.') + '</div>';
  if (d.kelas.length > 1) {
    h += '<div class="card mt-16"><div class="card-head"><h3>Ringkasan per kelas</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Wali kelas</th><th>Hari</th><th>H</th><th>T</th><th>S</th><th>I</th><th>A</th><th>Belum</th><th>Kehadiran</th></tr></thead><tbody>' + d.kelas.map(function (k) {
      const c = k.jumlah;
      return '<tr><td class="fw6">' + esc(k.nama) + '</td><td>' + esc(k.wali || '-') + '</td><td>' + k.hari + '</td><td>' + c.H + '</td><td>' + c.T + '</td><td>' + c.S + '</td><td>' + c.I + '</td><td>' + c.A + '</td><td>' + c.B + '</td><td class="fw6">' + pctTxt(k.hadir) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }
  d.kelas.forEach(function (k) {
    h += '<div class="card mt-16"><div class="card-head"><div><h3>' + esc(k.nama) + '</h3><div class="xs muted">Wali kelas: ' + esc(k.wali || '-') + ' · ' + k.hari + ' hari sekolah · kehadiran ' + pctTxt(k.hadir) + '</div></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:40px">No</th><th>Nama murid</th><th>NIS</th><th title="Hadir">H</th><th title="Terlambat">T</th><th title="Sakit">S</th><th title="Izin">I</th><th title="Alpa">A</th><th title="Belum tercatat">Belum</th><th>Kehadiran</th></tr></thead><tbody>' +
      rpUrut(k.murid).map(function (m, i) {
        const rendah = m.hadir !== null && m.hadir < 85;
        return '<tr><td class="muted">' + (i + 1) + '</td><td class="fw6">' + esc(m.nama) + (m.aktif ? '' : ' <span class="chip neutral">tidak aktif</span>') + '</td><td class="xs">' + esc(m.nis) + '</td><td>' + m.H + '</td><td>' + (m.T || '<span class="muted">0</span>') + '</td><td>' + (m.S || '<span class="muted">0</span>') + '</td><td>' + (m.I || '<span class="muted">0</span>') + '</td><td>' + (m.A ? '<b style="color:var(--rose)">' + m.A + '</b>' : '<span class="muted">0</span>') + '</td><td>' + (m.B || '<span class="muted">0</span>') + '</td><td' + (rendah ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + pctTxt(m.hadir) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  });
  $('#rp-isi').innerHTML = h;
}
ACT['rp-mode'] = function (el) { P.rpQ.mode = el.dataset.m; rpDraw(); $('#rp-isi').innerHTML = skeleton(3); rpMuat(); };
ACT['rp-urut'] = function (el) { P.rpUrut = el.dataset.u; rpIsi(); };
ACT['rp-csv'] = function () {
  const d = P.rp; if (!d) return;
  const rows = [['Rekap kehadiran murid', (KOP && KOP.sekolah) || S.cfg.namaSekolah, rpLabel(d)], [], ['Kelas', 'No', 'NIS', 'Nama', 'L/P', 'Hari sekolah', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa', 'Belum tercatat', 'Kehadiran (%)']];
  d.kelas.forEach(function (k) { rpUrut(k.murid).forEach(function (m, i) { rows.push([k.nama, i + 1, m.nis, m.nama, m.jk || '', k.hari, m.H, m.T, m.S, m.I, m.A, m.B, m.hadir === null ? '' : String(m.hadir).replace('.', ',')]); }); });
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'rekap_kehadiran_' + d.dari + '_' + d.sampai + '.csv');
  toast('CSV diunduh.');
};
ACT['rp-cetak'] = function () { siapKop().then(cetakRekapPeriode); };
function cetakRekapPeriode() {
  const d = P.rp;
  if (!d || !d.kelas.length) { toast('Tidak ada data untuk dicetak.', 'warn'); return; }
  const judul = 'REKAP KEHADIRAN MURID', per = rpLabel(d), banyak = d.kelas.length > 1;
  const ket = '<div class="pr-ket">Keterangan: H hadir, T terlambat (tetap dihitung hadir), S sakit, I izin, A alpa (tanpa keterangan), Belum = hari sekolah tanpa catatan untuk murid tersebut. Kehadiran = (H + T) ÷ hari tercatat.' + (rentangLibur(d.libur, d.hariIni) ? ' Hari libur tidak dihitung: ' + rentangLibur(d.libur, d.hariIni) + '.' : '') + '</div>';
  let h = '<div class="pr-doc">';
  if (banyak) {
    h += '<div class="pr-break">' + kopCetak({}) + '<h2 class="pr-title">' + judul + ' PER KELAS</h2><div class="pr-sub">' + esc(per) + '</div>' +
      '<table class="pr-tbl pr-rekap"><thead><tr><th>No</th><th>Kelas</th><th>Wali kelas</th><th>Murid</th><th>Hari sekolah</th><th>H</th><th>T</th><th>S</th><th>I</th><th>A</th><th>Belum</th><th>Kehadiran</th></tr></thead><tbody>' + d.kelas.map(function (k, i) {
        const c = k.jumlah;
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(k.nama) + '</td><td>' + esc(k.wali || '-') + '</td><td>' + k.murid.length + '</td><td>' + k.hari + '</td><td>' + c.H + '</td><td>' + c.T + '</td><td>' + c.S + '</td><td>' + c.I + '</td><td>' + c.A + '</td><td>' + c.B + '</td><td>' + pctTxt(k.hadir) + '</td></tr>';
      }).join('') + '<tr class="pr-tot"><td colspan="3">Jumlah</td><td>' + d.total.murid + '</td><td></td><td>' + d.total.H + '</td><td>' + d.total.T + '</td><td>' + d.total.S + '</td><td>' + d.total.I + '</td><td>' + d.total.A + '</td><td>' + d.total.B + '</td><td>' + pctTxt(d.hadir) + '</td></tr></tbody></table>' + ket +
      ttdCetak(ttdKepsek(), ttdOrang('Wakil Kepala Sekolah Bidang Kesiswaan,', d.waka, d.wakaNip), '') + '</div>';
  }
  d.kelas.forEach(function (k) {
    const c = k.jumlah;
    h += '<div class="' + (banyak ? 'pr-break' : '') + '">' + kopCetak({}) + '<h2 class="pr-title">' + judul + '</h2><div class="pr-sub">' + esc(per) + '</div>' +
      '<div class="pr-kls"><b>Kelas ' + esc(k.nama) + '</b><span>Wali kelas: ' + esc(k.wali || '-') + ' · Hari sekolah: ' + k.hari + ' · Kehadiran kelas: ' + pctTxt(k.hadir) + '</span></div>' +
      '<table class="pr-tbl pr-rekap"><thead><tr><th style="width:8mm">No</th><th style="width:22mm">NIS</th><th>Nama murid</th><th style="width:8mm">L/P</th><th>H</th><th>T</th><th>S</th><th>I</th><th>A</th><th>Belum</th><th style="width:18mm">Kehadiran</th></tr></thead><tbody>' +
      rpUrut(k.murid).map(function (m, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.nis) + '</td><td style="text-align:left">' + esc(m.nama) + '</td><td>' + esc(m.jk || '') + '</td><td>' + m.H + '</td><td>' + m.T + '</td><td>' + m.S + '</td><td>' + m.I + '</td><td>' + m.A + '</td><td>' + m.B + '</td><td>' + pctTxt(m.hadir) + '</td></tr>';
      }).join('') + '<tr class="pr-tot"><td colspan="4">Jumlah</td><td>' + c.H + '</td><td>' + c.T + '</td><td>' + c.S + '</td><td>' + c.I + '</td><td>' + c.A + '</td><td>' + c.B + '</td><td>' + pctTxt(k.hadir) + '</td></tr></tbody></table>' + ket +
      ttdCetak(ttdKepsek(), ttdOrang('Wali Kelas ' + esc(k.nama) + ',', k.wali, k.waliNip), '') + '</div>';
  });
  h += '<div class="pr-foot">Dicetak dari SIKOLAB BK oleh ' + esc(d.pencetak) + ' · ' + esc(fTgl(ymd(new Date())) + ' ' + hhmm(Date.now())) + '</div></div>';
  cetakHtml(h, { judul: 'Rekap kehadiran · ' + per, ket: (banyak ? d.kelas.length + ' kelas, satu halaman per kelas' : 'Kelas ' + d.kelas[0].nama) + ' · A4 tegak' });
}

// ── Administrasi → tab "Surat & Cetak" ──
const TOKEN_NOMOR = [['{no}', 'nomor urut 3 digit (001)'], ['{no1}', 'nomor urut tanpa nol (1)'], ['{sekolah}', 'kode sekolah'], ['{bulan}', 'bulan romawi (X)'], ['{bln}', 'bulan angka (10)'], ['{tahun}', 'tahun (2026)']];
function contohNomor(f, kode, n) {
  const d = new Date(), r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][d.getMonth()];
  return String(f || '').replace(/\{no\}/g, String(n).padStart(3, '0')).replace(/\{no1\}/g, String(n)).replace(/\{sekolah\}/g, kode).replace(/\{bulan\}/g, r).replace(/\{bln\}/g, String(d.getMonth() + 1).padStart(2, '0')).replace(/\{tahun\}/g, String(d.getFullYear()));
}
function adSurat() {
  $('#ad-body').innerHTML = skeleton(3);
  Promise.all([apiC('admin.config.get'), siapKop()]).then(function (r) {
    const c = r[0].config;
    P.srKode = String(c.nama_sekolah || '').replace(/[^A-Za-z0-9]+/g, '').substr(0, 10).toUpperCase();
    const logo = function (pos, judul, hint) { return '<div id="srb-' + pos + '">' + srLogoHtml(pos, judul, hint) + '</div>'; };
    P.srLogo = { kiri: ['Logo kiri', 'Biasanya lambang pemerintah daerah.'], kanan: ['Logo kanan', 'Biasanya logo sekolah. Boleh dikosongkan.'] };
    $('#ad-body').innerHTML = '<div class="grid g-2 sr-grid" id="sr-all"><div class="col gap-16">' +
      '<div class="card pad"><h3>Kop surat</h3><p class="xs muted mt-8" style="margin-top:4px">Dipakai pada semua surat, laporan PDF, daftar hadir, dan rekap yang dicetak. Nama sekolah, alamat, dan kota diatur di tab Pengaturan.</p>' +
      '<form id="f-srt" class="form-grid mt-12" novalidate>' +
      fld({ name: 'kop_baris1', label: 'Baris 1 (pemerintah daerah)', max: 120, value: c.kop_baris1, ph: 'PEMERINTAH KABUPATEN TANAH DATAR' }) +
      fld({ name: 'kop_baris2', label: 'Baris 2 (dinas)', max: 120, value: c.kop_baris2, ph: 'DINAS PENDIDIKAN DAN KEBUDAYAAN' }) +
      fld({ name: 'kontak_sekolah', label: 'Kontak di bawah alamat', max: 120, value: c.kontak_sekolah, ph: 'Telp. (0752) 000000 · Kode Pos 27000 · sekolah@…' }) +
      '</form><div class="col gap-12 mt-16">' + logo('kiri', P.srLogo.kiri[0], P.srLogo.kiri[1]) + logo('kanan', P.srLogo.kanan[0], P.srLogo.kanan[1]) + '</div>' +
      '<div class="xs muted mt-8">PNG atau JPG. Gambar otomatis diperkecil sebelum diunggah. Latar transparan (PNG) hasilnya paling rapi.</div></div>' +
      '<div class="card pad"><h3>Penandatangan</h3><div class="form-grid c2 mt-12">' +
      fld({ name: 'kepala_sekolah', label: 'Nama Kepala Sekolah (dengan gelar)', max: 100, value: c.kepala_sekolah, form: 'f-srt' }) + fld({ name: 'nip_kepsek', label: 'NIP Kepala Sekolah', max: 30, value: c.nip_kepsek, form: 'f-srt' }) +
      fld({ name: 'jabatan_kepsek', label: 'Sebutan jabatan', max: 80, value: c.jabatan_kepsek || 'Kepala Sekolah', form: 'f-srt', hint: 'Mis. Kepala UPT SMP Negeri 3 Batipuh' }) + fld({ name: 'pangkat_kepsek', label: 'Pangkat/golongan (opsional)', max: 60, value: c.pangkat_kepsek, form: 'f-srt', ph: 'Pembina, IV/a' }) +
      '</div><div class="xs muted mt-8">NIP guru, wali kelas, dan Waka diambil dari data Pengguna (kolom NIP).</div></div></div>' +
      '<div class="col gap-16"><div class="card pad"><h3>Nomor surat</h3><div class="form-grid mt-12">' +
      fld({ name: 'format_nomor_surat', id: 'sr-fmt', label: 'Format nomor', max: 80, value: c.format_nomor_surat || '{no}/BK/{sekolah}/{bulan}/{tahun}', form: 'f-srt', hint: 'Ketik huruf/angka tetap sesuai aturan sekolah, misalnya kode klasifikasi 421.3.' }) +
      '<div class="form-grid c2">' + fld({ name: 'kode_sekolah', id: 'sr-kode', label: 'Kode sekolah', max: 30, value: c.kode_sekolah, form: 'f-srt', ph: P.srKode, hint: 'Pengganti {sekolah}' }) +
      fld({ name: 'nomor_surat_urut', id: 'sr-urut', label: 'Nomor terakhir terpakai', type: 'number', inputmode: 'numeric', value: c.nomor_surat_urut || '0', form: 'f-srt', hint: 'Surat berikutnya memakai nomor ini + 1' }) + '</div>' +
      '<div class="note info"><i class="bi bi-hash"></i><div>Surat berikutnya: <b id="sr-contoh"></b><div class="xs muted">Nomor urut mulai lagi dari 001 setiap awal tahun.</div></div></div>' +
      '<div class="xs muted">' + TOKEN_NOMOR.map(function (t) { return '<code>' + t[0] + '</code> ' + t[1]; }).join(' · ') + '</div></div></div>' +
      '<div class="card pad"><h3>Kertas & huruf</h3><div class="form-grid c2 mt-12">' +
      fld({ name: 'ukuran_kertas', label: 'Ukuran kertas', type: 'select', value: c.ukuran_kertas || 'A4', form: 'f-srt', opts: [{ v: 'A4', l: 'A4 (210 × 297 mm)' }, { v: 'F4', l: 'F4 / Folio (215 × 330 mm)' }, { v: 'Letter', l: 'Letter (216 × 279 mm)' }] }) +
      fld({ name: 'huruf_surat', label: 'Jenis huruf', type: 'select', value: c.huruf_surat || 'Times New Roman', form: 'f-srt', opts: ['Times New Roman', 'Arial', 'Cambria', 'Calibri', 'Georgia'] }) +
      '</div><div class="xs muted mt-8">Berlaku untuk PDF surat dan laporan serta dokumen yang dicetak dari aplikasi. Saat mencetak, pilih ukuran kertas yang sama di dialog printer.</div></div>' +
      '<div class="card pad"><div class="row between wrap" style="gap:8px"><h3>Kalimat surat</h3><select class="select" id="sr-tj" style="width:auto;min-height:38px"><option value="panggilan">Surat panggilan</option><option value="pemberitahuan">Surat pemberitahuan</option><option value="konseling">Persetujuan konseling</option></select></div>' +
      '<div class="xs muted mt-8">Templat bawaan sekolah. Guru tetap bisa mengubah kalimat untuk satu surat sebelum diterbitkan. Ketuk isian untuk menyisipkannya.</div>' +
      '<div class="isian mt-8" id="sr-isian">' + ((KOP && KOP.isian) || []).map(function (k) { return '<code data-isi="{' + k + '}">{' + k + '}</code>'; }).join('') + '</div>' +
      '<div id="sr-tpl" class="form-grid mt-12"></div>' +
      '<div class="row wrap mt-12" style="gap:8px"><button class="btn primary" data-act="sr-tpl-simpan"><i class="bi bi-check2"></i> Simpan kalimat</button><button class="btn" data-act="sr-tpl-bawaan"><i class="bi bi-arrow-counterclockwise"></i> Kembalikan bawaan</button></div></div>' +
      '<div class="card pad"><div class="row wrap" style="gap:8px"><button class="btn primary" data-act="sr-simpan"><i class="bi bi-check2"></i> Simpan pengaturan surat</button><button class="btn" data-act="sr-contoh"><i class="bi bi-file-earmark-text"></i> Lihat contoh surat</button></div>' +
      '<div class="xs muted mt-8">Simpan dulu, lalu buka contoh untuk melihat hasil sebenarnya. Contoh tidak memakai nomor surat.</div></div></div></div>';
    const upd = function () { $('#sr-contoh').textContent = contohNomor($('#sr-fmt').value, $('#sr-kode').value.trim() || P.srKode, (parseInt($('#sr-urut').value, 10) || 0) + 1); };
    ['#sr-fmt', '#sr-kode', '#sr-urut'].forEach(function (s) { $(s).addEventListener('input', upd); });
    upd();
    srLogoIkat();
    P.srTpl = JSON.parse(JSON.stringify((KOP && KOP.templat) || {}));
    P.srTj = 'panggilan';
    srTplDraw();
    $('#sr-tj').addEventListener('change', function (e) { srTplAmbil(); P.srTj = e.target.value; srTplDraw(); });
    $$('#sr-isian [data-isi]').forEach(function (c) {
      c.addEventListener('mousedown', function (e) { e.preventDefault(); });
      c.addEventListener('click', function () {
        const ta = P.srFokus && document.body.contains(P.srFokus) ? P.srFokus : $('#sr-tpl textarea');
        if (!ta) return;
        const a = ta.selectionStart || 0, b = ta.selectionEnd || 0, t = c.dataset.isi;
        ta.value = ta.value.slice(0, a) + t + ta.value.slice(b); ta.focus(); ta.selectionStart = ta.selectionEnd = a + t.length;
      });
    });
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function srTplDraw() {
  const j = P.srTj, B = (KOP && KOP.bagian) || {}, t = P.srTpl[j] || {};
  $('#sr-tpl').innerHTML = Object.keys(t).map(function (k) {
    return '<div class="field"><label for="sr-tp-' + k + '">' + esc(B[k] || k) + '</label><textarea class="textarea" id="sr-tp-' + k + '" data-tp="' + k + '" rows="' + (k === 'salam' ? 1 : k === 'isi' ? 5 : 3) + '"' + (k === 'salam' ? ' style="min-height:44px"' : '') + ' maxlength="' + (k === 'isi' ? 3000 : 1500) + '">' + esc(t[k]) + '</textarea></div>';
  }).join('');
  $$('#sr-tpl textarea').forEach(function (ta) { ta.addEventListener('focus', function () { P.srFokus = ta; }); });
}
function srTplAmbil() { $$('#sr-tpl [data-tp]').forEach(function (ta) { P.srTpl[P.srTj][ta.dataset.tp] = ta.value.trim(); }); }
ACT['sr-tpl-bawaan'] = function () {
  const bw = (KOP && KOP.bawaan) || {};
  P.srTpl[P.srTj] = JSON.parse(JSON.stringify(bw[P.srTj] || {}));
  srTplDraw(); toast('Kalimat bawaan dimuat. Tekan Simpan kalimat untuk memakainya.');
};
ACT['sr-tpl-simpan'] = function (el) {
  srTplAmbil();
  const kosong = Object.keys(P.srTpl).some(function (j) { return Object.keys(P.srTpl[j]).some(function (k) { return k !== 'salam' && !P.srTpl[j][k]; }); });
  if (kosong) { toast('Ada kalimat yang kosong. Isi atau tekan Kembalikan bawaan.', 'warn'); return; }
  run(el, api('surat.templat', { templat: P.srTpl })).then(function (r) {
    if (KOP) KOP.templat = r.templat;
    ccClear('kop.get'); if (KOP) ccSeed('kop.get', {}, KOP);
    P.srTpl = JSON.parse(JSON.stringify(r.templat)); srTplDraw();
    toast('Kalimat surat tersimpan.');
  }).catch(fail);
};
function srLogoHtml(pos, judul, hint) {
  const src = (KOP || {})['logo' + (pos === 'kiri' ? 'Kiri' : 'Kanan')];
  return '<div class="srl"><div class="srl-img" id="srl-' + pos + '">' + (src ? '<img alt="Logo ' + pos + '" src="' + src + '">' : '<i class="bi bi-image"></i>') + '</div><div class="grow"><b>' + judul + '</b><div class="xs muted">' + hint + '</div><div class="row wrap mt-8" style="gap:6px"><label class="btn sm"><i class="bi bi-upload"></i> ' + (src ? 'Ganti' : 'Unggah') + '<input type="file" accept="image/png,image/jpeg" data-logo="' + pos + '" hidden></label>' + (src ? '<button class="btn sm soft-danger" data-act="sr-logo-hapus" data-pos="' + pos + '"><i class="bi bi-trash3"></i> Hapus</button>' : '') + '</div></div></div>';
}
/** Perbarui kotak logo saja, agar isian lain yang belum disimpan tidak hilang. */
function srLogoSegar(pos) {
  const b = $('#srb-' + pos); if (!b) return;
  b.innerHTML = srLogoHtml(pos, P.srLogo[pos][0], P.srLogo[pos][1]);
  srLogoIkat();
}
function srLogoIkat() {
  $$('[data-logo]').forEach(function (inp) { if (inp.dataset.ikat) return; inp.dataset.ikat = '1'; inp.addEventListener('change', function () { if (inp.files[0]) srUnggah(inp.dataset.logo, inp.files[0]); }); });
}
/** Perkecil logo di peramban (maks. 300 px) agar ringan, lalu unggah. */
function srUnggah(pos, file) {
  if (!/^image\/(png|jpeg)$/.test(file.type)) { toast('Gunakan gambar PNG atau JPG.', 'warn'); return; }
  const box = $('#srl-' + pos); if (box) box.innerHTML = '<span class="spin"></span>';
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = function () {
    const sk = Math.min(1, 300 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.width * sk)); cv.height = Math.max(1, Math.round(img.height * sk));
    const cx = cv.getContext('2d');
    let mime = 'image/png';
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    let data = cv.toDataURL(mime);
    if (data.length > 130000) { cx.globalCompositeOperation = 'destination-over'; cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); mime = 'image/jpeg'; data = cv.toDataURL(mime, 0.9); }
    URL.revokeObjectURL(url);
    api('kop.logo', { posisi: pos, mime: mime, base64: data.split(',')[1] }).then(function (k) { KOP = k; ccClear('kop.get'); ccSeed('kop.get', {}, k); toast('Logo tersimpan.'); srLogoSegar(pos); }).catch(function (e) { fail(e); srLogoSegar(pos); });
  };
  img.onerror = function () { URL.revokeObjectURL(url); toast('Gambar tidak dapat dibaca.', 'warn'); srLogoSegar(pos); };
  img.src = url;
}
ACT['sr-logo-hapus'] = function (el) {
  confirmDlg('Hapus logo ' + el.dataset.pos + ' dari kop surat?', 'Hapus logo', true, 'Hapus').then(function (ok) {
    if (!ok) return;
    run(el, api('kop.logo', { posisi: el.dataset.pos, hapus: true })).then(function (k) { KOP = k; ccSeed('kop.get', {}, k); toast('Logo dihapus.'); srLogoSegar(el.dataset.pos); }).catch(fail);
  });
};
function srSimpan(el) {
  const d = {};
  $$('#sr-all [name]').forEach(function (x) { if (x.name && x.type !== 'file') d[x.name] = x.value.trim(); });
  if (!/\{no1?\}/.test(d.format_nomor_surat || '')) { toast('Format nomor harus memuat {no} atau {no1}.', 'warn'); return Promise.reject(); }
  return run(el, api('admin.config.simpan', { config: d })).then(function () { ccClear('admin.config.get'); ccClear('kop.get'); return siapKop(); });
}
ACT['sr-simpan'] = function (el) { srSimpan(el).then(function () { toast('Pengaturan surat tersimpan.'); }).catch(function (e) { if (e) fail(e); }); };
ACT['sr-contoh'] = function (el) {
  srSimpan(el).then(function () { return run(el, api('surat.contoh')); }).then(function (f) { previewFile({ nama: f.nama, mime: f.mime, base64: f.base64, blok: f.blok }); }).catch(function (e) { if (e) fail(e); });
};

// ════════════════════════════════════════════════════════════
// v1.10 — Sistem Poin Tata Tertib (pilihan sekolah). Semua guru mencatat; Guru BK memverifikasi.
// ════════════════════════════════════════════════════════════
const PN_TABS = [['daftar', 'Daftar murid', 'bi-people', 'daftar'], ['verifikasi', 'Verifikasi', 'bi-patch-check', 'verif'], ['catat', 'Catat poin', 'bi-plus-lg', 'catat'], ['saya', 'Catatan saya', 'bi-journal-text', 'catat'], ['rekap', 'Rekap', 'bi-bar-chart', 'rekap'], ['aturan', 'Aturan & tahapan', 'bi-sliders', '']];
function pnStatus(st) { return '<span class="chip ' + ({ Menunggu: 'st-Baru', Sah: 'st-Selesai', Ditolak: 'st-Ditolak', Dibatalkan: 'neutral' }[st] || 'neutral') + '">' + esc(st === 'Menunggu' ? 'Menunggu verifikasi' : st) + '</span>'; }
function pnJenis(j, p) { const r = j === 'Prestasi'; return '<span class="chip ' + (r ? 'kc-teal' : 'kc-amber') + '"><i class="bi ' + (r ? 'bi-award' : 'bi-exclamation-triangle') + '"></i> ' + (r ? '−' : '+') + esc(p) + '</span>'; }
function pnTahapChip(n) { return n ? '<span class="chip st-Eskalasi">' + esc(n) + '</span>' : '<span class="muted xs">—</span>'; }
function pnAturanOpts(list, jenis, val) {
  const g = {};
  list.filter(function (a) { return a.j === jenis && a.a !== 0; }).forEach(function (a) { (g[a.g] = g[a.g] || []).push(a); });
  return Object.keys(g).map(function (k) { return '<optgroup label="' + esc(k) + '">' + g[k].map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === val ? ' selected' : '') + '>' + esc((a.k ? a.k + ' · ' : '') + a.n + ' (' + (jenis === 'R' ? '−' : '+') + a.p + ')') + '</option>'; }).join('') + '</optgroup>'; }).join('');
}
PAGES.poin = function (params, tok) {
  return apiC('poin.meta', {}).then(function (meta) {
    if (stale(tok)) return;
    const b = meta.boleh;
    const tabs = PN_TABS.filter(function (t) { return !t[3] || b[t[3]]; });
    let tab = params.tab && tabs.some(function (t) { return t[0] === params.tab; }) ? params.tab : (b.verif && meta.menunggu ? 'verifikasi' : tabs[0][0]);
    P.pn = { meta: meta, tab: tab, murid: params.id_murid || '' };
    $('#app-container').innerHTML = pageHead('Tata tertib', 'Poin Murid', 'Periode berjalan: ' + meta.periode + '. Poin dihitung setelah diverifikasi Guru BK; prestasi mengurangi poin pelanggaran.', '') +
      '<div class="tabs mb-16" id="pn-tabs">' + tabs.map(function (t) { return '<button class="tab ' + (t[0] === tab ? 'active' : '') + '" data-act="pn-tab" data-t="' + t[0] + '"><i class="bi ' + t[2] + '"></i> ' + t[1] + (t[0] === 'verifikasi' && meta.menunggu ? ' <span class="chip st-Baru" style="margin-left:4px">' + meta.menunggu + '</span>' : '') + '</button>'; }).join('') + '</div><div id="pn-body"></div>';
    pnDraw();
    if (params.id_murid) pnMurid(params.id_murid);
  });
};
ACT['pn-tab'] = function (el) { P.pn.tab = el.dataset.t; $$('#pn-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); pnDraw(); };
function pnDraw() {
  const t = P.pn.tab;
  $('#pn-body').innerHTML = skeleton(2);
  if (t === 'daftar') return pnDaftar();
  if (t === 'verifikasi') return pnVerif();
  if (t === 'catat') return pnCatat();
  if (t === 'saya') return pnSaya();
  if (t === 'rekap') return pnRekap();
  if (t === 'aturan') return pnAturan($('#pn-body'), P.pn.meta);
}
// ── Daftar murid ──
function pnDaftar() {
  return apiC('poin.daftar', { id_kelas: P.pn.kelas || '' }).then(function (d) {
    P.pn.d = d;
    const f = P.pn.f || 'berpoin';
    $('#pn-body').innerHTML = (d.perTahap.length ? '<div class="grid g-kpi k4">' + d.perTahap.map(function (x, i) { return '<div class="kpi ' + ['amber', 'rose', 'rose', 'indigo', 'indigo', 'indigo', 'indigo', 'indigo'][i] + '" style="cursor:pointer" data-act="pn-f" data-f="t' + i + '"><span class="k-ic"><i class="bi bi-flag"></i></span><div class="k-lb">' + esc(x.n) + '</div><div><div class="k-v">' + x.jml + '</div><div class="k-s">murid · mulai ' + x.p + ' poin</div></div></div>'; }).join('') + '</div>' : '') +
      '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div class="fchips" id="pn-fc">' + [['berpoin', 'Punya poin'], ['', 'Semua murid'], ['menunggu', 'Ada yang menunggu']].map(function (x) { return '<button class="fchip ' + (x[0] === f ? 'active' : '') + '" data-act="pn-f" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row wrap" style="gap:8px">' + (d.kelas.length > 1 ? '<select class="select" id="pn-kls" style="width:auto;min-height:40px"><option value="">Semua kelas</option>' + d.kelas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === P.pn.kelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select>' : '') +
      '<div class="search" style="max-width:220px"><i class="bi bi-search"></i><input id="pn-q" type="search" placeholder="Cari murid…" value="' + esc(P.pn.q || '') + '"></div></div></div><div id="pn-list"></div></div>';
    const sel = $('#pn-kls'); if (sel) sel.addEventListener('change', function (e) { P.pn.kelas = e.target.value; pnDaftar(); });
    $('#pn-q').addEventListener('input', debounce(function (e) { P.pn.q = e.target.value.trim(); pnDaftarList(); }, 200));
    pnDaftarList();
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
ACT['pn-f'] = function (el) { P.pn.f = el.dataset.f; $$('#pn-fc .fchip').forEach(function (b) { b.classList.toggle('active', b.dataset.f === el.dataset.f); }); pnDaftarList(); };
function pnDaftarList() {
  const d = P.pn.d, f = P.pn.f === undefined ? 'berpoin' : P.pn.f, q = (P.pn.q || '').toLowerCase();
  const rows = d.rows.filter(function (r) {
    if (q && (r.nama + ' ' + r.nis).toLowerCase().indexOf(q) < 0) return false;
    if (f === 'berpoin') return r.L || r.R || r.menunggu;
    if (f === 'menunggu') return r.menunggu > 0;
    if (f.charAt(0) === 't') return r.tahap === +f.substr(1);
    return true;
  });
  $('#pn-list').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:640px"><thead><tr><th>Murid</th><th>Kelas</th><th style="text-align:right">Pelanggaran</th><th style="text-align:right">Prestasi</th><th style="text-align:right">Poin bersih</th><th>Tahap</th><th>Menunggu</th></tr></thead><tbody>' +
    rows.slice(0, 400).map(function (r) {
      return '<tr class="click" data-act="pn-murid" data-id="' + esc(r.id) + '" style="cursor:pointer"><td><div class="fw6">' + esc(r.nama) + '</div><div class="xs muted">NIS ' + esc(r.nis) + '</div></td><td>' + esc(r.kelas) + '</td><td style="text-align:right">' + (r.L ? '+' + r.L : '<span class="muted">0</span>') + '</td><td style="text-align:right">' + (r.R ? '−' + r.R : '<span class="muted">0</span>') + '</td><td style="text-align:right"><b style="font-size:16px">' + r.B + '</b></td><td>' + pnTahapChip(r.tahapNama) + '</td><td>' + (r.menunggu ? '<span class="chip st-Baru">' + r.menunggu + '</span>' : '<span class="muted xs">—</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-award', f === 'berpoin' ? 'Belum ada murid dengan catatan poin' : 'Tidak ada murid yang cocok', 'Periode: ' + d.periode) + '</div>';
}
ACT['pn-murid'] = function (el) { pnMurid(el.dataset.id); };
function pnMurid(id, semua) {
  const dr = openDrawer({ head: '<div class="grow"><h3>Poin murid</h3></div>', body: skeleton(2) });
  api('poin.murid', { id_murid: id, semua: semua ? 1 : 0 }).then(function (d) {
    const m = d.murid, r = d.ringkas, meta = P.pn ? P.pn.meta : null;
    dr.el.querySelector('.d-head').innerHTML = '<div class="grow"><h2>' + esc(m.nama) + '</h2><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + (r ? ' · ' + esc(r.periode) : '') + '</div></div><button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';
    let h = '';
    if (r) {
      const maks = r.berikut ? r.berikut.p : Math.max(r.B, 1);
      h += '<div class="stat-row s3"><div class="stat"><span class="lbl">Poin bersih</span><b>' + r.B + '</b>' + (r.menunggu ? '<span class="xs muted">' + r.menunggu + ' catatan menunggu</span>' : '') + '</div><div class="stat"><span class="lbl">Pelanggaran</span><b>' + (r.L ? '+' + r.L : 0) + '</b></div><div class="stat"><span class="lbl">Prestasi</span><b>' + (r.R ? '−' + r.R : 0) + '</b></div></div>' +
        '<div class="sec mt-12"><div class="row between wrap"><div>' + (r.tahap ? '<span class="chip st-Eskalasi">' + esc(r.tahap.n) + '</span>' : '<span class="chip st-Selesai">Belum mencapai tahap pembinaan</span>') + '</div>' + (r.berikut ? '<span class="xs muted">' + (r.berikut.p - r.B) + ' poin lagi menuju ' + esc(r.berikut.n) + '</span>' : '') + '</div>' +
        '<div class="bar mt-8"><i style="width:' + Math.min(100, Math.round(r.B * 100 / maks)) + '%"></i></div>' + (r.tahap && r.tahap.t ? '<div class="body mt-8" style="line-height:20px"><b>Tindak lanjut:</b> ' + esc(r.tahap.t) + '</div>' : '') + '</div>';
    } else h += '<div class="note info"><i class="bi bi-info-circle"></i><div>Anda melihat catatan poin yang Anda buat sendiri. Rekap lengkap hanya untuk Guru BK, Waka, wali kelas murid ini, dan admin.</div></div>';
    h += '<div class="row wrap mt-12">' + (meta && meta.boleh.catat ? '<button class="btn primary" data-act="pn-catat-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '" data-k="' + esc(m.kelas) + '"><i class="bi bi-plus-lg"></i> Catat poin</button>' : '') +
      (r && (hasRole('wali_kelas') || hasRole('guru_bk')) ? '<button class="btn blue" data-act="wa-murid" data-id="' + esc(m.id) + '" data-t="poin"><i class="bi bi-whatsapp"></i> Beri tahu orang tua</button>' : '') +
      '<button class="btn ghost" data-act="open-murid" data-id="' + esc(m.id) + '"><i class="bi bi-activity"></i> Garis waktu</button></div>';
    h += '<div class="row between mt-16"><h3>Catatan ' + (semua ? 'semua periode' : 'periode ini') + '</h3><button class="btn sm ghost" data-act="pn-murid-semua" data-id="' + esc(m.id) + '" data-s="' + (semua ? '' : '1') + '">' + (semua ? 'Periode ini saja' : 'Tampilkan semua periode') + '</button></div>';
    h += d.rows.length ? d.rows.map(pnItemHtml).join('') : empty('bi-journal', 'Belum ada catatan poin');
    dr.body.innerHTML = h;
    P.pnDr = { dr: dr, id: id, semua: semua };
  }).catch(function (e) { dr.body.innerHTML = errBox(e); });
}
ACT['pn-murid-semua'] = function (el) { if (P.pnDr) P.pnDr.dr.close(); pnMurid(el.dataset.id, !!el.dataset.s); };
function pnItemHtml(x) {
  return '<div class="sec mt-8' + (x.periodeIni === false ? ' dibaca' : '') + '"><div class="row between wrap" style="gap:6px"><div class="row wrap" style="gap:6px">' + pnJenis(x.jenis, x.poin) + pnStatus(x.status) + (x.kodeKasus ? '<button class="chip blue" style="border:0;cursor:pointer" data-act="kasus-open-nav" data-id="' + esc(x.id_laporan) + '">' + esc(x.kodeKasus) + '</button>' : '') + '</div><span class="xs muted">' + esc(fTgl(x.tanggal)) + (x.jam ? ' · ' + esc(x.jam) : '') + '</span></div>' +
    '<div class="fw6 mt-8">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</div><div class="body" style="line-height:20px">' + esc(x.uraian) + '</div>' +
    '<div class="xs muted mt-8">Dicatat ' + esc(x.pencatat) + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + (x.verif ? ' · ' + (x.status === 'Sah' ? 'disahkan' : x.status === 'Ditolak' ? 'ditolak' : 'diproses') + ' ' + esc(x.verif) : '') + (x.catatan_verif ? ' — ' + esc(x.catatan_verif) : '') + '</div>' +
    '<div class="row wrap mt-8" style="gap:6px">' + (x.id_berkas ? '<button class="btn sm" data-act="berkas" data-id="' + esc(x.id_berkas) + '"><i class="bi bi-paperclip"></i> Lampiran</button>' : '') + (x.status === 'Menunggu' && hasRole('guru_bk') ? '<button class="btn sm primary" data-act="pn-sah1" data-id="' + esc(x.id) + '"><i class="bi bi-check-lg"></i> Sahkan</button><button class="btn sm" data-act="pn-tolak1" data-id="' + esc(x.id) + '"><i class="bi bi-x-lg"></i> Tolak</button>' : '') + (x.bolehBatal ? '<button class="btn sm ghost" data-act="pn-batal" data-id="' + esc(x.id) + '"><i class="bi bi-arrow-counterclockwise"></i> Batalkan</button>' : '') + '</div></div>';
}
function pnSegarkan() { ccClear('poin.catat'); if (P.pnDr && document.body.contains(P.pnDr.dr.el)) { P.pnDr.dr.close(); pnMurid(P.pnDr.id, P.pnDr.semua); } if (S.page === 'poin') navigateTo('poin', { tab: P.pn.tab }, true, true); else if (S.page === 'kasus' || S.page === 'riwayat') navigateTo(S.page, S.params, true, true); loadNotif(); }
ACT['pn-sah1'] = function (el) { run(el, api('poin.putus', { ids: [el.dataset.id], keputusan: 'sah' })).then(function () { toast('Poin disahkan.'); pnSegarkan(); }).catch(fail); };
ACT['pn-tolak1'] = function (el) { pnTolak([el.dataset.id]); };
function pnTolak(ids) {
  const m = openModal({ title: 'Tolak catatan poin', sub: ids.length + ' catatan', body: '<form id="f-pt" class="form-grid" novalidate>' + fld({ name: 'alasan', label: 'Alasan penolakan', req: true, max: 300, type: 'textarea', rows: 2, ph: 'mis. Duplikat dengan catatan Bu Rina pada hari yang sama' }) + '<div class="fchips wrapc">' + ['Duplikat', 'Bukan pelanggaran tata tertib', 'Murid salah', 'Kurang bukti/uraian'].map(function (x) { return '<button type="button" class="fchip" data-alasan="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div></form>', foot: '<button class="btn" data-close>Batal</button><button class="btn danger" id="pt-ok">Tolak</button>' });
  $$('[data-alasan]', m.el).forEach(function (b) { b.addEventListener('click', function () { $('[name=alasan]', m.el).value = b.dataset.alasan; }); });
  $('#pt-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pt', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('poin.putus', { ids: ids, keputusan: 'tolak', alasan: d.alasan })).then(function (r) { m.close(); toast(r.n + ' catatan ditolak.'); pnSegarkan(); }).catch(fail);
  });
}
ACT['pn-batal'] = function (el) {
  const m = openModal({ title: 'Batalkan catatan poin', body: '<form id="f-pb" class="form-grid" novalidate>' + fld({ name: 'alasan', label: 'Alasan pembatalan', req: true, max: 300, ph: 'mis. Salah memilih murid' }) + '</form>', foot: '<button class="btn" data-close>Kembali</button><button class="btn danger" id="pb-ok">Batalkan catatan</button>' });
  $('#pb-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pb', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('poin.batal', { id: el.dataset.id, alasan: d.alasan })).then(function () { m.close(); toast('Catatan dibatalkan.'); pnSegarkan(); }).catch(fail);
  });
};
// ── Verifikasi Guru BK ──
function pnVerif() {
  return api('poin.verifikasi', {}).then(function (d) {
    P.pn.v = d; P.pn.pilih = {};
    if (!d.rows.length) { $('#pn-body').innerHTML = '<div class="card pad">' + empty('bi-patch-check', 'Tidak ada catatan yang menunggu verifikasi', 'Catatan poin dari guru akan muncul di sini.') + '</div>'; return; }
    const kembar = d.rows.filter(function (r) { return r.kembar.length; }).length;
    $('#pn-body').innerHTML = '<div class="note info"><i class="bi bi-info-circle"></i><div>Periksa setiap catatan, lalu <b>Sahkan</b> agar poin dihitung, atau <b>Tolak</b> dengan alasan.' + (kembar ? ' <b>' + kembar + ' catatan</b> ditandai <b>kemungkinan duplikat</b> (murid, butir aturan, dan tanggal sama); biasanya cukup sahkan satu dan tolak sisanya.' : '') + '</div></div>' +
      '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><label class="check"><input type="checkbox" id="pv-all"> Pilih semua (' + d.rows.length + ')</label><div class="row wrap" style="gap:8px"><button class="btn" data-act="pv-tolak"><i class="bi bi-x-lg"></i> Tolak terpilih</button><button class="btn primary" data-act="pv-sah"><i class="bi bi-check-lg"></i> Sahkan terpilih</button></div></div><div class="card-body" id="pv-list">' +
      d.rows.map(function (x, i) {
        return '<div class="sec mt-8"' + (x.kembar.length ? ' style="border-left:3px solid var(--amber,#F59E0B)"' : '') + '><div class="row between wrap" style="gap:8px"><label class="check"><input type="checkbox" data-pv="' + i + '"> <b>' + esc(x.nama) + '</b> <span class="xs muted">' + esc(x.kelas) + '</span></label><div class="row wrap" style="gap:6px">' + pnJenis(x.jenis, x.poin) + '<span class="xs muted">' + x.poinKini + ' → <b>' + x.poinSesudah + '</b> poin</span></div></div>' +
          '<div class="fw6 mt-8">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</div><div class="body" style="line-height:20px">' + esc(x.uraian) + '</div>' +
          '<div class="xs muted mt-8">' + esc(fTgl(x.tanggal)) + (x.jam ? ' · ' + esc(x.jam) : '') + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + ' · dicatat ' + esc(x.pencatat) + (x.kodeKasus ? ' · dari laporan ' + esc(x.kodeKasus) : '') + '</div>' +
          (x.kembar.length ? '<div class="note warn mt-8"><i class="bi bi-files"></i><div><b>Kemungkinan duplikat.</b> ' + x.kembar.map(function (k) { return esc(k.pencatat) + ' (' + esc(k.status === 'Sah' ? 'sudah sah' : 'menunggu') + (k.jam ? ', ' + esc(k.jam) : '') + (k.lebihAwal ? ', dicatat lebih dulu' : '') + '): "' + esc(k.uraian) + '"'; }).join('<br>') + '</div></div>' : '') +
          '<div class="row wrap mt-8" style="gap:6px">' + (x.id_berkas ? '<button class="btn sm" data-act="berkas" data-id="' + esc(x.id_berkas) + '"><i class="bi bi-paperclip"></i> Lampiran</button>' : '') + (x.kodeKasus ? '<button class="btn sm" data-act="kasus-open-nav" data-id="' + esc(x.id_laporan) + '"><i class="bi bi-folder2-open"></i> Buka laporan</button>' : '') + '<button class="btn sm" data-act="pv-ganti" data-i="' + i + '"><i class="bi bi-pencil"></i> Ganti butir</button><button class="btn sm" data-act="pn-tolak1" data-id="' + esc(x.id) + '"><i class="bi bi-x-lg"></i> Tolak</button><button class="btn sm primary" data-act="pn-sah1" data-id="' + esc(x.id) + '"><i class="bi bi-check-lg"></i> Sahkan</button></div></div>';
      }).join('') + '</div></div>';
    $('#pv-all').addEventListener('change', function (e) { $$('[data-pv]').forEach(function (c) { c.checked = e.target.checked; }); });
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
function pvTerpilih() { return $$('[data-pv]').filter(function (c) { return c.checked; }).map(function (c) { return P.pn.v.rows[+c.dataset.pv].id; }); }
ACT['pv-sah'] = function (el) { const ids = pvTerpilih(); if (!ids.length) { toast('Pilih catatan terlebih dahulu.', 'warn'); return; } run(el, api('poin.putus', { ids: ids, keputusan: 'sah' })).then(function (r) { toast(r.n + ' catatan disahkan.'); pnSegarkan(); }).catch(fail); };
ACT['pv-tolak'] = function () { const ids = pvTerpilih(); if (!ids.length) { toast('Pilih catatan terlebih dahulu.', 'warn'); return; } pnTolak(ids); };
ACT['pv-ganti'] = function (el) {
  const x = P.pn.v.rows[+el.dataset.i], j = x.jenis === 'Prestasi' ? 'R' : 'L';
  const m = openModal({ title: 'Ganti butir aturan', sub: x.nama + ' · dicatat ' + x.pencatat, body: '<form id="f-pg2" class="form-grid" novalidate><div class="field"><label for="pg2-a">Butir yang benar <span class="req">*</span></label><select class="select" id="pg2-a" name="id_aturan">' + pnAturanOpts(P.pn.v.aturan, j, x.id_aturan) + '</select><div class="hint">Semula: ' + esc(x.aturan) + ' (' + x.poin + ' poin)</div></div>' + fld({ name: 'alasan', label: 'Catatan untuk pencatat (opsional)', max: 300 }) + '</form>', foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pg2-ok"><i class="bi bi-check-lg"></i> Ganti &amp; sahkan</button>' });
  $('#pg2-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-pg2', m.el));
    run(e.currentTarget, api('poin.putus', { ids: [x.id], keputusan: 'sah', id_aturan: d.id_aturan, alasan: d.alasan })).then(function () { m.close(); toast('Butir diganti dan poin disahkan.'); pnSegarkan(); }).catch(fail);
  });
};
// ── Catat poin (semua guru) ──
ACT['pn-catat-murid'] = function (el) { if (P.pnDr) P.pnDr.dr.close(); P.pnPre = { id: el.dataset.id, nama: el.dataset.n, kelas: el.dataset.k }; if (S.page !== 'poin') { navigateTo('poin', { tab: 'catat' }); return; } P.pn.tab = 'catat'; $$('#pn-tabs .tab').forEach(function (b) { b.classList.toggle('active', b.dataset.t === 'catat'); }); pnDraw(); };
function pnKelasList() { const ids = S.kelasAkses || null; return S.refs.kelas.filter(function (k) { return !ids || ids.indexOf(k.id) >= 0; }); }
function pnCatat() {
  const meta = P.pn.meta, c = P.pnC = { jenis: 'L', murids: [], kelas: '' };
  if (P.pnPre) { c.murids = [{ id: P.pnPre.id, nama: P.pnPre.nama, kelas: P.pnPre.kelas }]; P.pnPre = null; }
  const kl = pnKelasList();
  c.kelas = (S.kelasWali && S.kelasWali[0] && kl.some(function (k) { return k.id === S.kelasWali[0]; })) ? S.kelasWali[0] : (kl.length === 1 ? kl[0].id : '');
  $('#pn-body').innerHTML = '<div class="card pad" style="max-width:860px"><div class="note info"><i class="bi bi-info-circle"></i><div>' + (hasRole('guru_bk') ? 'Catatan Guru BK <b>langsung sah</b>.' : 'Catatan Anda <b>menunggu verifikasi Guru BK</b> sebelum dihitung. Bila murid yang sama sudah tercatat dengan butir yang sama pada tanggal itu, Anda akan diberi tahu agar tidak terjadi input ganda.') + ' Untuk kejadian yang perlu penanganan BK, gunakan <a href="#" data-act="nav" data-page="lapor">Lapor Kejadian</a> dan pilih butir pelanggarannya di sana.</div></div>' +
    '<form id="f-pn" class="col gap-16 mt-16" novalidate><div class="field"><span class="flabel">Jenis</span><div class="opt-tiles" id="pn-jenis"><button type="button" class="opt-tile on" data-act="pn-jenis" data-v="L">Pelanggaran<small>menambah poin</small></button><button type="button" class="opt-tile" data-act="pn-jenis" data-v="R">Prestasi / kebaikan<small>mengurangi poin pelanggaran</small></button></div></div>' +
    '<div class="field" data-f="murid"><span class="flabel">Murid <span class="req">*</span></span><div id="pn-sel" class="pk-sel"></div><div class="pk-kelas fchips mt-8">' + kl.map(function (k) { return '<button type="button" class="fchip ' + (k.id === c.kelas ? 'active' : '') + '" data-act="pn-kls" data-id="' + esc(k.id) + '">' + esc(k.nama) + '</button>'; }).join('') + '</div><div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="pn-mq" class="input" style="padding-left:36px" type="search" placeholder="Saring nama, atau ketik nama/NIS…" autocomplete="off"></div><div id="pn-md" class="pk-daftar mt-8"></div><div class="err" role="alert"></div></div>' +
    '<div class="field" data-f="id_aturan"><label for="pn-a">Butir aturan tata tertib <span class="req">*</span></label><select class="select" id="pn-a" name="id_aturan"><option value="">— pilih butir —</option>' + pnAturanOpts(meta.aturan, 'L') + '</select><div class="hint" id="pn-ah">Daftar butir mengikuti buku tata tertib sekolah (tab Aturan &amp; tahapan).</div><div class="err" role="alert"></div></div>' +
    '<div class="form-grid c3">' + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: S.today, maxv: S.today, min: addD(S.today, -60) }) + fld({ name: 'jam', label: 'Jam / jam ke- (opsional)', max: 20, ph: 'mis. 07.20 atau jam ke-3' }) + fld({ name: 'lokasi', label: 'Lokasi (opsional)', max: 120, ph: 'mis. Gerbang, ruang kelas' }) + '</div>' +
    fld({ name: 'uraian', label: 'Uraian kejadian', type: 'textarea', req: true, rows: 3, max: 1000, ph: 'Tuliskan yang terlihat secara faktual: apa, kapan, bagaimana. Uraian ini dibaca Guru BK saat verifikasi.' }) +
    '<div class="field"><span class="flabel">Lampiran / bukti (opsional)</span><label class="drop" id="pn-drop" for="pn-file"><i class="bi bi-paperclip"></i> <span id="pn-dnm">Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)</span></label><input type="file" id="pn-file" class="sr" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"></div>' +
    '<div class="row" style="justify-content:flex-end"><button type="submit" class="btn primary" id="pn-kirim"><i class="bi bi-check-lg"></i> Simpan catatan</button></div></form></div>';
  $('#pn-a').addEventListener('change', pnHint);
  $('#pn-mq').addEventListener('input', debounce(pnMuat, 220));
  $('#pn-file').addEventListener('change', function (e) { readFileB64(e.target.files[0], 5 * 1024 * 1024).then(function (b) { c.file = b; $('#pn-dnm').textContent = b ? b.nama : 'Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)'; $('#pn-drop').classList.toggle('has', !!b); }).catch(function (er) { e.target.value = ''; c.file = null; fail(er); }); });
  $('#f-pn').addEventListener('submit', function (e) { e.preventDefault(); pnKirim(false); });
  pnSel(); pnMuat();
}
function pnHint() { const a = P.pn.meta.aturan.filter(function (x) { return x.id === $('#pn-a').value; })[0]; $('#pn-ah').innerHTML = a ? '<b>' + (a.j === 'R' ? '−' : '+') + a.p + ' poin</b>' + (a.s ? ' · Pembinaan yang disarankan: ' + esc(a.s) : '') : 'Daftar butir mengikuti buku tata tertib sekolah (tab Aturan &amp; tahapan).'; }
ACT['pn-jenis'] = function (el) { P.pnC.jenis = el.dataset.v; $$('#pn-jenis .opt-tile').forEach(function (b) { b.classList.toggle('on', b === el); }); $('#pn-a').innerHTML = '<option value="">— pilih butir —</option>' + pnAturanOpts(P.pn.meta.aturan, el.dataset.v); $('[for=f_uraian]').firstChild.textContent = el.dataset.v === 'R' ? 'Uraian prestasi / kebaikan' : 'Uraian kejadian'; pnHint(); };
ACT['pn-kls'] = function (el) { P.pnC.kelas = el.dataset.id; $$('.pk-kelas [data-act=pn-kls]').forEach(function (b) { b.classList.toggle('active', b === el); }); $('#pn-mq').value = ''; pnMuat(); };
function pnSel() { const c = P.pnC; $('#pn-sel').innerHTML = c.murids.length ? c.murids.map(function (m, i) { return '<span class="pk-chip"><b>' + esc(m.nama) + '</b> · ' + esc(m.kelas) + '<button type="button" data-act="pn-lepas" data-i="' + i + '" aria-label="Hapus ' + esc(m.nama) + '"><i class="bi bi-x-lg"></i></button></span>'; }).join('') + (c.murids.length > 1 ? '<span class="xs muted">' + c.murids.length + ' murid · masing-masing mendapat catatan sendiri</span>' : '') : '<span class="xs muted">Belum ada murid dipilih. Pilih kelas, lalu ketuk nama.</span>'; }
function pnMuat() {
  const c = P.pnC, q = ($('#pn-mq') || {}).value ? $('#pn-mq').value.trim() : '';
  if (!c.kelas && q.length < 2) { $('#pn-md').innerHTML = ''; return; }
  apiC('murid.cari', c.kelas && q.length < 2 ? { q: '', id_kelas: c.kelas } : { q: q }).then(function (rows) {
    c.hits = rows; const ada = {}; c.murids.forEach(function (m) { ada[m.id] = 1; });
    $('#pn-md').innerHTML = rows.length ? rows.map(function (m, i) { return '<button type="button" class="pk-m' + (ada[m.id] ? ' on' : '') + '" data-act="pn-pick" data-i="' + i + '"><i class="bi ' + (ada[m.id] ? 'bi-check-circle' : 'bi-circle') + '"></i><span><b>' + esc(m.nama) + '</b><small>' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</small></span></button>'; }).join('') : '<div class="xs muted">Tidak ada murid yang cocok.</div>';
  }).catch(fail);
}
ACT['pn-pick'] = function (el) {
  const c = P.pnC, m = c.hits[+el.dataset.i]; if (!m) return;
  const i = c.murids.map(function (x) { return x.id; }).indexOf(m.id);
  if (i >= 0) c.murids.splice(i, 1); else { if (c.murids.length >= 30) { toast('Paling banyak 30 murid sekali catat.', 'warn'); return; } c.murids.push({ id: m.id, nama: m.nama, kelas: m.kelas }); }
  el.classList.toggle('on', i < 0); el.querySelector('i').className = 'bi ' + (i < 0 ? 'bi-check-circle' : 'bi-circle');
  setErr($('#f-pn'), 'murid', ''); pnSel();
};
ACT['pn-lepas'] = function (el) { P.pnC.murids.splice(+el.dataset.i, 1); pnSel(); pnMuat(); };
function pnKirim(tetap) {
  const f = $('#f-pn'), c = P.pnC, d = formData(f);
  let ok = validate(f, d, { id_aturan: { label: 'Butir aturan', req: true }, tanggal: { label: 'Tanggal', req: true }, uraian: { label: 'Uraian', req: true, min: 10 } });
  if (!c.murids.length) { setErr(f, 'murid', 'Pilih minimal satu murid.'); ok = false; }
  if (!ok) return;
  d.id_murid_list = c.murids.map(function (m) { return m.id; }); d.berkas = c.file || null; if (tetap) d.tetap = true;
  run($('#pn-kirim'), api('poin.catat', d)).then(function (r) {
    if (r.perluKonfirmasi) {
      confirmDlg('Sudah ada catatan yang sama (murid, butir, dan tanggal sama): ' + r.dup.map(function (x) { return x.nama + ' oleh ' + x.pencatat + ' (' + (x.status === 'Sah' ? 'sudah sah' : 'menunggu verifikasi') + (x.jam ? ', ' + x.jam : '') + ')'; }).join('; ') + '. Kemungkinan ini kejadian yang sama. Tetap simpan sebagai catatan terpisah? Guru BK akan melihat tanda duplikat.', 'Tetap simpan', false, 'Kemungkinan input ganda').then(function (y) { if (y) pnKirim(true); });
      return;
    }
    toast(r.n + ' catatan ' + r.jenis.toLowerCase() + ' tersimpan' + (r.status === 'Sah' ? ' dan langsung sah.' : ', menunggu verifikasi Guru BK.'));
    ccClear('poin.catat'); P.pnPre = null; pnCatat();
  }).catch(fail);
}
// ── Catatan saya ──
function pnSaya() {
  return api('poin.saya', {}).then(function (d) {
    P.pn.saya = d.rows;
    $('#pn-body').innerHTML = '<div class="card">' + (d.rows.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Tanggal</th><th>Murid</th><th>Butir</th><th>Poin</th><th>Status</th><th>Catatan verifikasi</th><th></th></tr></thead><tbody>' + d.rows.map(function (x) {
      return '<tr><td class="xs">' + esc(fTgl(x.tanggal)) + '</td><td><div class="fw6">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.kelas) + '</div></td><td class="xs">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</td><td>' + pnJenis(x.jenis, x.poin) + '</td><td>' + pnStatus(x.status) + '</td><td class="xs">' + esc(x.catatan_verif || '') + (x.verif && x.status !== 'Menunggu' ? '<div class="muted">' + esc(x.verif) + '</div>' : '') + '</td><td style="text-align:right">' + (x.bolehBatal ? '<button class="btn sm ghost" data-act="pn-batal" data-id="' + esc(x.id) + '">Batalkan</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-journal-text', 'Anda belum mencatat poin', 'Gunakan tab Catat poin.') + '</div>') + '</div>';
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
// ── Rekap tanpa nama ──
function pnRekap() {
  return apiC('poin.rekap', {}).then(function (d) {
    const tot = d.kelas.reduce(function (a, k) { a.m += k.murid; a.b += k.berpoin; a.L += k.L; a.R += k.R; return a; }, { m: 0, b: 0, L: 0, R: 0 });
    $('#pn-body').innerHTML = '<div class="stat-row s4"><div class="stat"><span class="lbl">Murid aktif</span><b>' + tot.m + '</b></div><div class="stat"><span class="lbl">Murid berpoin</span><b>' + tot.b + '</b></div><div class="stat"><span class="lbl">Poin pelanggaran</span><b>' + tot.L + '</b></div><div class="stat"><span class="lbl">Poin prestasi</span><b>' + tot.R + '</b></div></div>' +
      '<div class="card mt-16"><div class="card-head"><h3>Per kelas</h3><span class="xs muted">' + esc(d.periode) + ' · hanya poin yang sudah sah</span></div><div class="tbl-wrap"><table class="tbl" style="min-width:620px"><thead><tr><th>Kelas</th><th style="text-align:right">Murid</th><th style="text-align:right">Berpoin</th><th style="text-align:right">Pelanggaran</th><th style="text-align:right">Prestasi</th>' + d.ambang.map(function (a) { return '<th style="text-align:right" title="' + esc(a.n) + '">≥ ' + a.p + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.kelas.map(function (k) { return '<tr><td class="fw6">' + esc(k.kelas) + '</td><td style="text-align:right">' + k.murid + '</td><td style="text-align:right">' + k.berpoin + '</td><td style="text-align:right">' + k.L + '</td><td style="text-align:right">' + k.R + '</td>' + k.tahap.map(function (n) { return '<td style="text-align:right">' + (n ? '<b>' + n + '</b>' : '<span class="muted">0</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card mt-16"><div class="card-head"><h3>Per kelompok butir</h3></div>' + (d.kelompok.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jenis</th><th>Kelompok</th><th style="text-align:right">Catatan</th><th style="text-align:right">Total poin</th></tr></thead><tbody>' + d.kelompok.map(function (g) { return '<tr><td>' + pnJenis(g.jenis, '') + '</td><td>' + esc(g.kelompok) + '</td><td style="text-align:right">' + g.n + '</td><td style="text-align:right">' + g.poin + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-bar-chart', 'Belum ada poin yang sah') + '</div>') + '</div>';
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
// ── Aturan & tahapan (lihat untuk semua; ubah untuk admin, Waka, Guru BK; aktifkan hanya admin) ──
function pnAturan(box, meta) {
  P.pnA = { meta: meta, aturan: JSON.parse(JSON.stringify(meta.aturan)), ambang: JSON.parse(JSON.stringify(meta.ambang)), edit: false };
  pnAturanDraw(box);
}
function pnAturanDraw(box) {
  const A = P.pnA, meta = A.meta, b = meta.boleh, ed = A.edit;
  let h = '';
  if (b.aktifkan) h += '<div class="card pad"><div class="row between wrap" style="gap:12px"><div><h3><i class="bi bi-award" style="color:var(--amber,#F59E0B)"></i> Sistem poin tata tertib</h3><div class="xs muted mt-8">Pilihan sekolah. Bila nonaktif, menu, kolom, dan isian poin tidak tampil di mana pun; data lama tetap tersimpan.</div></div>' + (meta.aktif ? '<span class="chip st-Selesai">Aktif</span>' : '<span class="chip neutral">Nonaktif</span>') + '</div><div class="row mt-12"><button class="btn ' + (meta.aktif ? '' : 'primary') + '" data-act="pna-aktif" data-v="' + (meta.aktif ? '0' : '1') + '">' + (meta.aktif ? '<i class="bi bi-x-lg"></i> Nonaktifkan' : '<i class="bi bi-check-lg"></i> Aktifkan sistem poin') + '</button></div></div>';
  if (!meta.aktif && !b.aktifkan) { box.innerHTML = h; return; }
  const kel = function (j) {
    const rows = A.aturan.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return x.a.j === j; });
    if (!ed) {
      const g = {}; rows.forEach(function (x) { if (x.a.a !== 0) (g[x.a.g] = g[x.a.g] || []).push(x.a); });
      return Object.keys(g).length ? Object.keys(g).map(function (k) { return '<div class="mt-12"><div class="fw6">' + esc(k) + '</div><div class="tbl-wrap mt-8"><table class="tbl"><tbody>' + g[k].map(function (a) { return '<tr><td class="mono xs" style="width:64px">' + esc(a.k || '') + '</td><td>' + esc(a.n) + (a.s ? '<div class="xs muted">' + esc(a.s) + '</div>' : '') + '</td><td style="text-align:right;width:70px"><b>' + (j === 'R' ? '−' : '+') + a.p + '</b></td></tr>'; }).join('') + '</tbody></table></div></div>'; }).join('') : '<div class="muted mt-8">Belum ada butir.</div>';
    }
    return '<div class="tbl-wrap mt-8"><table class="tbl pna-tbl" style="min-width:820px"><thead><tr><th style="width:80px">Kode</th><th style="width:170px">Kelompok</th><th>Nama butir</th><th style="width:80px">Poin</th>' + (j === 'L' ? '<th style="width:200px">Pembinaan disarankan</th>' : '') + '<th style="width:60px">Aktif</th><th style="width:44px"></th></tr></thead><tbody>' +
      rows.map(function (x) { const a = x.a; return '<tr data-ai="' + x.i + '"><td><input class="input" data-k="k" maxlength="12" value="' + esc(a.k || '') + '"></td><td><input class="input" data-k="g" maxlength="60" value="' + esc(a.g) + '" list="pna-g-' + j + '"></td><td><input class="input" data-k="n" maxlength="150" value="' + esc(a.n) + '"></td><td><input class="input" data-k="p" type="number" min="1" max="1000" inputmode="numeric" value="' + esc(a.p) + '"></td>' + (j === 'L' ? '<td><input class="input" data-k="s" maxlength="200" value="' + esc(a.s || '') + '"></td>' : '') + '<td style="text-align:center"><input type="checkbox" data-k="a"' + (a.a !== 0 ? ' checked' : '') + '></td><td><button type="button" class="icon-btn" data-act="pna-hapus" data-i="' + x.i + '" title="Hapus butir"><i class="bi bi-trash3"></i></button></td></tr>'; }).join('') +
      '</tbody></table></div><datalist id="pna-g-' + j + '">' + rows.map(function (x) { return x.a.g; }).filter(function (g, i, s) { return g && s.indexOf(g) === i; }).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist><button type="button" class="btn sm mt-8" data-act="pna-tambah" data-j="' + j + '"><i class="bi bi-plus-lg"></i> Tambah butir ' + (j === 'R' ? 'prestasi' : 'pelanggaran') + '</button>';
  };
  const pihak = meta.pihak;
  const ambangHtml = ed ? '<div class="tbl-wrap mt-8"><table class="tbl" style="min-width:820px"><thead><tr><th style="width:90px">Mulai poin</th><th style="width:230px">Nama tahap</th><th>Tindak lanjut</th><th style="width:260px">Diberi tahu</th><th style="width:90px">Orang tua dihubungi</th><th style="width:44px"></th></tr></thead><tbody>' +
      A.ambang.map(function (a, i) { return '<tr data-bi="' + i + '"><td><input class="input" data-k="p" type="number" min="1" inputmode="numeric" value="' + esc(a.p) + '"></td><td><input class="input" data-k="n" maxlength="60" value="' + esc(a.n) + '"></td><td><textarea class="textarea" data-k="t" maxlength="300" rows="2" style="min-height:56px">' + esc(a.t || '') + '</textarea></td><td><div class="row wrap" style="gap:4px">' + Object.keys(pihak).map(function (k) { return '<label class="check xs"><input type="checkbox" data-u="' + k + '"' + ((a.u || []).indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(pihak[k]) + '</label>'; }).join('') + '</div></td><td style="text-align:center"><input type="checkbox" data-k="o"' + (a.o ? ' checked' : '') + '></td><td><button type="button" class="icon-btn" data-act="pna-hapus-t" data-i="' + i + '" title="Hapus tahap"><i class="bi bi-trash3"></i></button></td></tr>'; }).join('') +
      '</tbody></table></div><button type="button" class="btn sm mt-8" data-act="pna-tambah-t"><i class="bi bi-plus-lg"></i> Tambah tahap</button>'
    : (A.ambang.length ? '<div class="tbl-wrap mt-8"><table class="tbl"><thead><tr><th>Poin</th><th>Tahap</th><th>Tindak lanjut</th><th>Diberi tahu</th></tr></thead><tbody>' + A.ambang.map(function (a) { return '<tr><td class="fw6">≥ ' + a.p + '</td><td>' + esc(a.n) + '</td><td class="xs">' + esc(a.t || '') + '</td><td class="xs">' + (a.u || []).map(function (k) { return esc(pihak[k] || k); }).join(', ') + (a.o ? (a.u && a.u.length ? ', ' : '') + '<b>orang tua dihubungi</b>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="muted mt-8">Belum ada tahapan.</div>');
  h += '<div class="card pad mt-16"><div class="row between wrap" style="gap:8px"><div><h3>Tahapan pembinaan</h3><div class="xs muted mt-8">Saat poin bersih murid mencapai batas, pihak terkait mendapat pemberitahuan di lonceng.</div></div>' + (b.atur && !ed ? '<button class="btn" data-act="pna-edit"><i class="bi bi-pencil"></i> Ubah aturan &amp; tahapan</button>' : '') + '</div>' + ambangHtml +
    '<div class="form-grid c2 mt-16">' + (ed ? fld({ name: 'putih', id: 'pna-putih', label: 'Pemutihan poin', type: 'select', value: meta.putih, opts: Object.keys(meta.putihOpsi).map(function (k) { return { v: k, l: meta.putihOpsi[k] }; }), hint: 'Riwayat tetap tersimpan; hanya hitungan yang dimulai dari nol.' }) : '<div><span class="flabel">Pemutihan poin</span><div class="mt-8">' + esc(meta.putihOpsi[meta.putih]) + ' · periode berjalan: ' + esc(meta.periode) + '</div></div>') + '</div>' +
    (ed ? fld({ name: 'templat', id: 'pna-tpl', label: 'Templat pesan WhatsApp ke orang tua', type: 'textarea', rows: 3, max: 1000, value: meta.templat, hint: 'Isian otomatis: {nama_ortu} {nama_murid} {kelas} {poin} {tahap} {sekolah} {pengirim}. {poin} dan {tahap} juga dapat dipakai pada kalimat surat.' }) : '') + '</div>';
  h += '<div class="' + (ed ? 'col gap-16' : 'grid g-2') + ' mt-16"><div class="card pad"><h3>Butir pelanggaran</h3>' + kel('L') + '</div><div class="card pad"><h3>Butir prestasi / kebaikan</h3>' + kel('R') + '</div></div>';
  if (ed) h += '<div class="row wrap mt-16" style="justify-content:flex-end;gap:8px"><button class="btn ghost" data-act="pna-bawaan"><i class="bi bi-arrow-counterclockwise"></i> Pakai contoh bawaan</button><button class="btn" data-act="pna-batal">Batal</button><button class="btn primary" data-act="pna-simpan"><i class="bi bi-check-lg"></i> Simpan aturan</button></div>';
  h += '<p class="xs muted mt-12">Butir bawaan hanya contoh. Sesuaikan dengan tata tertib yang ditetapkan sekolah. Mengubah bobot butir tidak mengubah catatan yang sudah ada.</p>';
  box.innerHTML = h; P.pnA.box = box;
}
function pnaBaca() {
  const A = P.pnA;
  $$('[data-ai]', A.box).forEach(function (tr) { const a = A.aturan[+tr.dataset.ai]; $$('[data-k]', tr).forEach(function (el) { a[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; }); });
  $$('[data-bi]', A.box).forEach(function (tr) { const a = A.ambang[+tr.dataset.bi]; $$('[data-k]', tr).forEach(function (el) { a[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; }); a.u = $$('[data-u]', tr).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.u; }); });
  const pu = $('#pna-putih', A.box), tp = $('#pna-tpl', A.box);
  if (pu) A.putih = pu.value; if (tp) A.templat = tp.value;
}
ACT['pna-edit'] = function () { P.pnA.edit = true; pnAturanDraw(P.pnA.box); };
ACT['pna-batal'] = function () { pnAturan(P.pnA.box, P.pnA.meta); };
ACT['pna-tambah'] = function (el) { pnaBaca(); const j = el.dataset.j, last = P.pnA.aturan.filter(function (a) { return a.j === j; }).pop(); P.pnA.aturan.push({ id: '', k: '', j: j, g: last ? last.g : '', n: '', p: j === 'R' ? 3 : 2, s: '', a: 1 }); pnAturanDraw(P.pnA.box); };
ACT['pna-hapus'] = function (el) { pnaBaca(); P.pnA.aturan.splice(+el.dataset.i, 1); pnAturanDraw(P.pnA.box); };
ACT['pna-tambah-t'] = function () { pnaBaca(); const l = P.pnA.ambang[P.pnA.ambang.length - 1]; P.pnA.ambang.push({ p: l ? +l.p + 25 : 25, n: '', t: '', u: ['wali'], o: 0 }); pnAturanDraw(P.pnA.box); };
ACT['pna-hapus-t'] = function (el) { pnaBaca(); P.pnA.ambang.splice(+el.dataset.i, 1); pnAturanDraw(P.pnA.box); };
ACT['pna-bawaan'] = function () {
  confirmDlg('Ganti seluruh butir dan tahapan di layar dengan contoh bawaan? Perubahan baru tersimpan setelah Anda menekan Simpan aturan.', 'Pakai contoh').then(function (y) {
    if (!y) return; const bw = P.pnA.meta.bawaan; P.pnA.aturan = JSON.parse(JSON.stringify(bw.aturan)); P.pnA.ambang = JSON.parse(JSON.stringify(bw.ambang)); P.pnA.meta = Object.assign({}, P.pnA.meta, { templat: bw.templat }); pnAturanDraw(P.pnA.box);
  });
};
ACT['pna-simpan'] = function (el) {
  pnaBaca();
  const A = P.pnA;
  const salah = A.aturan.filter(function (a) { return !String(a.n).trim() || !String(a.g).trim() || !(+a.p >= 1); })[0];
  if (salah) { toast('Lengkapi kelompok, nama, dan poin (≥ 1) setiap butir.', 'err'); return; }
  run(el, api('poin.atur', { aturan: A.aturan, ambang: A.ambang, putih: A.putih, templat: A.templat })).then(function (meta) { toast('Aturan poin tersimpan.'); pnaSesudah(meta); }).catch(fail);
};
ACT['pna-aktif'] = function (el) {
  const on = el.dataset.v === '1';
  confirmDlg(on ? 'Aktifkan sistem poin? Menu Poin Murid muncul untuk semua guru, dan isian butir pelanggaran tampil di Lapor Kejadian. Periksa dulu butir aturan dan tahapan agar sesuai tata tertib sekolah.' : 'Nonaktifkan sistem poin? Semua tampilan poin disembunyikan. Data yang sudah tercatat tetap tersimpan dan muncul lagi bila diaktifkan.', on ? 'Aktifkan' : 'Nonaktifkan', !on).then(function (y) {
    if (!y) return;
    run(el, api('poin.atur', { aktif: on })).then(function (meta) { toast('Sistem poin ' + (on ? 'diaktifkan.' : 'dinonaktifkan.')); return api('boot').then(function (b) { S.cfg = b.config; S.menu = b.menu; S.refs = b.refs; renderShell(); setNavActive(S.page); pnaSesudah(meta); }); }).catch(fail);
  });
};
function pnaSesudah(meta) { ccClear('poin.atur'); if (P.pn) P.pn.meta = meta; const box = (S.page === 'admin' ? $('#ad-body') : $('#pn-body')) || P.pnA.box; pnAturan(box, meta); }
function adPoin() { $('#ad-body').innerHTML = skeleton(2); api('poin.meta', {}).then(function (meta) { pnAturan($('#ad-body'), meta); }).catch(function (e) { isiHtml('#ad-body', errBox(e)); }); }
