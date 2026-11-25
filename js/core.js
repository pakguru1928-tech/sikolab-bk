/* ============================================================
   SIKOLAB BK v1.15 — Aplikasi klien (SPA): js/core.js (inti: utilitas, cache, prafetch, overlay, formulir, komponen)
   Dikembangkan oleh Iwa Salji Elbi Satria, UPT SMPN 3 Batipuh. © 2026.
   Boleh dipakai dan diubah oleh sekolah lain dengan tetap mencantumkan nama pengembang.
   - Semua data lewat satu pintu: google.script.run.api(token, aksi, data)
   - Hak akses DITEGAKKAN di server; menu di sini hanya kenyamanan tampilan
   - Semua keluaran dinamis melewati esc() (anti-XSS)
   - Urutan muat: config.js, api.js, formisi.js, core.js, shell.js, pages/NN_*.js (urut nomor), mulai.js.
   ============================================================ */
'use strict';

// ── Util ──
const PENGEMBANG = 'Iwa Salji Elbi Satria', PENGEMBANG_SEKOLAH = 'UPT SMPN 3 Batipuh', VERSI_APP = '1.15';
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
['murid.daftar', 'rapat.kelas', 'bk.ceklist', 'dampingan.daftar', 'dampingan.catatan', 'dampingan.rencana', 'dampingan.laporan', 'guruwali.info', 'absensi.bulan', 'absensi.bulanMeta', 'poin.meta', 'poin.daftar', 'poin.murid', 'poin.saya', 'poin.verifikasi', 'poin.rekap', 'hadir.daftar', 'temu.daftar', 'pindai.siap', 'kehadiran.get', 'muat.banyak', 'ortu.suratPratinjau', 'surat.contoh', 'admin.diagSurat', 'kartu.data', 'berkas.ambil', 'laporan.pdf', 'rekap.tahunanPdf',
  // v1.14: aksi baca yang dulu terlewat — sebelumnya memanggilnya ikut menghapus seluruh cache halaman di perangkat
  'arahan.saya', 'arahan.murid', 'arahan.penerima', 'riwayat.banyak', 'jadwal.get', 'sistem.info'].forEach(function (a) { READ_ACTIONS[a] = 1; });
// v1.14: halaman berat yang di server boleh disajikan "basi" (tampil dulu, diperbarui kemudian). Selama 2 menit setelah
// pengguna sendiri menyimpan sesuatu, halaman ini selalu diminta segar agar data yang baru disimpan langsung terlihat.
const SWR_AKSI = { 'rapat.kelas': 1, 'riwayat.murid': 1, 'kelas.saya': 1, 'laporan.rekap': 1, 'absensi.riwayat': 1, 'rekap.tahunan': 1, 'harian.rekap': 1, 'harian.periode': 1, 'absensi.bulan': 1 };
var TULIS_AT = 0;
// Aksi yang tidak mengubah data murid/absensi: tidak memicu permintaan "selalu segar" (mis. masuk, tandai dibaca)
const BUKAN_TULIS = { 'auth.login': 1, 'auth.gantiPin': 1, 'akun.simpan': 1, 'notif.baca': 1, 'arahan.baca': 1, 'setup.run': 1, 'admin.waUji': 1, 'admin.backup': 1 };
function pakaiSegar(action, payload) {
  if (Date.now() - TULIS_AT > 120000 || !payload) return payload;
  if (SWR_AKSI[action] && !payload.__segar) return Object.assign({}, payload, { __segar: 1 });
  if (action === 'muat.banyak' && payload.daftar) return Object.assign({}, payload, { daftar: payload.daftar.map(function (x) { return SWR_AKSI[x.a] && !(x.p && x.p.__segar) ? { a: x.a, p: Object.assign({}, x.p || {}, { __segar: 1 }) } : x; }) });
  return payload;
}
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
  poin: ['poin', 'riwayat', 'kelas', 'kasus', 'notif'],
  dampingan: ['dampingan', 'riwayat', 'rapat'], guruwali: ['dampingan', 'admin', 'riwayat', 'murid'],
  pola: ['dashboard', 'kelas', 'rapat'], jadwal: ['dashboard', 'notif']
};
// v1.14: penyimpanan absensi (sering, di latar belakang) tidak menghapus halaman lain dari cache; halaman itu hanya
// ditandai lama: tetap tampil seketika lalu diperbarui diam-diam. Penyimpanan lain tetap membuang data terkait.
const CC_LUNAK = { absensi: 1, harian: 1, pindai: 1 };
function ccClear(action) {
  const dom = action ? action.split('.')[0] : '';
  const rel = CC_REL[dom], lunak = !!CC_LUNAK[dom];
  Object.keys(CC).forEach(function (k) {
    const d = k.split('.')[0];
    if (!action || !rel || (rel.indexOf(d) >= 0 && !lunak)) delete CC[k]; else CC[k].t = 0;
  });
  Object.keys(RP).forEach(function (k) { delete RP[k]; });
  ccSimpanNanti();
}
// v1.14: daftar murid absensi diambil lebih dulu saat kelas/jam dipilih, sehingga "Muat daftar murid" terasa seketika.
// Hanya dipakai sekali dan paling lama 45 detik; setiap penyimpanan data membuangnya.
var RP = {};
function rosterKunci(action, payload) { return action + '|' + S.mode + '|' + JSON.stringify(payload); }
function rosterPrafetch(action, payload) {
  const k = rosterKunci(action, payload);
  if (RP[k] && Date.now() - RP[k].t < 45000) return;
  const p = api(action, payload, true);
  RP[k] = { p: p, t: Date.now() };
  p.catch(function () { if (RP[k] && RP[k].p === p) delete RP[k]; });
}
function rosterAmbil(action, payload) {
  const k = rosterKunci(action, payload), x = RP[k];
  delete RP[k];
  if (x && Date.now() - x.t < 45000) return x.p;
  return api(action, payload);
}
// ── Cache klien yang bertahan setelah aplikasi ditutup: halaman yang pernah dibuka tampil seketika saat dibuka lagi. ──
// Disimpan di perangkat (localStorage bila "Ingat saya", selain itu sessionStorage). Data sangat rahasia tidak disimpan.
['poin.meta', 'poin.daftar', 'poin.rekap', 'dampingan.daftar', 'absensi.bulanMeta'].forEach(function (a) { CACHEABLE[a] = 1; });
// v1.14: Garis Waktu (daftar murid), Rapat, arahan & ceklist BK ikut tampil seketika saat dibuka ulang / sudah disiapkan
['murid.daftar', 'rapat.kelas', 'arahan.saya', 'bk.ceklist', 'instrumen.profilKelas'].forEach(function (a) { CACHEABLE[a] = 1; });
CC_REL.arahan = ['arahan', 'riwayat', 'kelas', 'dashboard']; CC_REL.kartu = ['kartu', 'admin', 'kelas', 'harian', 'hadir'];
const CC_TIDAK_DISIMPAN = { 'murid.daftar': 1, 'rapat.kelas': 1, 'poin.daftar': 1, 'kasus.detail': 1, 'layanan.get': 1, 'instrumen.jawabDetail': 1, 'instrumen.jawabGet': 1, 'riwayat.murid': 1, 'instrumen.perMurid': 1, 'ortu.siapkan': 1, 'admin.config.get': 1 };
const CC_SIMPAN_MAKS = 1800000, CC_UMUR_SIMPAN = 12 * 3600000;
let CC_TMR = 0;
// Kunci simpanan memuat versi tampilan: data lama dari versi sebelumnya tidak dipakai (dibuang) setelah pembaruan
function ccSimpanKey() { const e = sget('sk_email') || (S.user && S.user.email) || ''; return e ? 'sk_cc_' + VERSI_APP + '_' + e : ''; }
function buangSimpananLama() {
  [window.localStorage, window.sessionStorage].forEach(function (st) {
    try { Object.keys(st).forEach(function (k) { if ((k.indexOf('sk_cc_') === 0 || k.indexOf('sk_boot_') === 0) && k.indexOf('_' + VERSI_APP + '_') < 0) st.removeItem(k); }); } catch (e) { /* abaikan */ }
  });
}
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
  buangSimpananLama();
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
// v1.14: server menyajikan hasil terakhir (basi) agar halaman langsung tampil; hasil terbaru diminta di latar belakang
// lalu halaman digambar ulang diam-diam bila berbeda dan pengguna belum berinteraksi.
var BASI_JALAN = {};
function tandaiBasi(action, payload) {
  const k = ccKey(action, payload);
  if (BASI_JALAN[k]) return;
  BASI_JALAN[k] = 1;
  const tok = S.navTok;
  setTimeout(function () {
    api(action, Object.assign({}, payload || {}, { __segar: 1 }), true).then(function (v) {
      delete BASI_JALAN[k];
      const lama = CC[k] && CC[k].v !== undefined ? JSON.stringify(CC[k].v) : null;
      CC[k] = { t: Date.now(), p: Promise.resolve(v), v: v, at: Date.now() };
      ccSimpanNanti();
      if (lama !== null && lama !== JSON.stringify(v) && tok === S.navTok && !OV.length && !S.touched) navigateTo(S.page, S.params, true, true);
    }).catch(function () { delete BASI_JALAN[k]; });
  }, 30);
}
function apiC(action, payload, diam) {
  if (!CACHEABLE[action]) return api(action, payload, diam);
  const k = ccKey(action, payload), hit = CC[k], now = Date.now();
  if (S.recPage && now < S.recUntil && S.recPage.split('#')[0] === S.page) pfRecord(action, payload);
  if (hit && now - hit.t < CC_TTL) {
    // Sedang diperbarui di latar belakang tetapi data lama ada: tampilkan data lama seketika, gambar ulang diam-diam bila berubah.
    if (hit.pending && hit.v !== undefined) { ccTungguUlang(hit); return Promise.resolve(hit.v); }
    // v1.14: halaman dibuka saat datanya masih ikut antrean prafetch: minta juga langsung, pakai mana yang lebih dulu tiba
    if (hit.pending && hit.batch && !diam) return ccBalap(k, hit, action, payload);
    return hit.p;
  }
  if (hit && hit.v !== undefined && now - hit.at < (hit.simpanan ? CC_UMUR_SIMPAN : CC_SWR)) {
    ccRevalidate(k, action, payload, hit);
    return Promise.resolve(hit.v);
  }
  return ccFetch(k, action, payload, diam);
}
function ccBalap(k, hit, action, payload) {
  if (!hit.balap) {
    hit.balap = api(action, payload);
    hit.balap.then(function (v) { if (CC[k] === hit && hit.pending) { hit.v = v; hit.at = Date.now(); } }, function () { });
  }
  const a = hit.p, b = hit.balap;
  return new Promise(function (res, rej) { let gagal = 0; const no = function (e) { if (++gagal === 2) rej(e); }; a.then(res, no); b.then(res, no); });
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
const PF_BAWAAN = {"guru_mapel:absensi":[{"a":"absensi.meta","p":{}}],"guru_mapel:absensi#mapel":[{"a":"absensi.meta","p":{}}],"guru_mapel:absensi#rmapel":[{"a":"absensi.bulanMeta","p":{}}],"guru_mapel:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_mapel:kasus#kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_mapel:kasus#tl":[{"a":"monitoring.daftar","p":{}}],"guru_mapel:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"wali_kelas:kelas":[{"a":"kelas.saya","p":{"id_kelas":""}}],"wali_kelas:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"wali_kelas:absensi#mapel":[{"a":"absensi.meta","p":{}},{"a":"absensi.riwayat","p":{"id_kelas":""}}],"wali_kelas:absensi#harian":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"wali_kelas:absensi#rmapel":[{"a":"absensi.bulanMeta","p":{}}],"wali_kelas:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"wali_kelas:kasus#kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"wali_kelas:kasus#tl":[{"a":"monitoring.daftar","p":{}}],"wali_kelas:ortu":[{"a":"murid.cari","p":{"q":""}}],"wali_kelas:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"guru_bk:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"guru_bk:absensi#mapel":[{"a":"absensi.meta","p":{}},{"a":"absensi.riwayat","p":{"id_kelas":""}}],"guru_bk:absensi#harian":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"guru_bk:absensi#periode":[{"a":"harian.periode","p":{"mode":"bulan","id_kelas":"","bulan":"@bln"}}],"guru_bk:absensi#daftar":[{"a":"hadir.daftar","p":{"tanggal":"@0","id_kelas":""}}],"guru_bk:absensi#rmapel":[{"a":"absensi.bulanMeta","p":{}}],"guru_bk:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_bk:kasus#kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"guru_bk:kasus#tl":[{"a":"monitoring.daftar","p":{}}],"guru_bk:layanan":[{"a":"layanan.daftar","p":{"q":"","komponen":"","sasaran":"","bulan":""}},{"a":"temu.daftar","p":{}}],"guru_bk:ortu":[{"a":"murid.cari","p":{"q":""}}],"guru_bk:program":[{"a":"program.daftar","p":{}}],"guru_bk:program#kebutuhan":[{"a":"program.kebutuhan","p":{}}],"guru_bk:program#program":[{"a":"program.daftar","p":{}}],"guru_bk:program#rekap":[{"a":"rekap.tahunan","p":{"arsip":""}}],"guru_bk:instrumen":[{"a":"instrumen.daftar","p":{}}],"guru_bk:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"waka:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"waka:absensi#mapel":[{"a":"absensi.meta","p":{}},{"a":"absensi.riwayat","p":{"id_kelas":""}}],"waka:absensi#harian":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"waka:absensi#periode":[{"a":"harian.periode","p":{"mode":"bulan","id_kelas":"","bulan":"@bln"}}],"waka:absensi#daftar":[{"a":"hadir.daftar","p":{"tanggal":"@0","id_kelas":""}}],"waka:absensi#rmapel":[{"a":"absensi.bulanMeta","p":{}}],"waka:kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"waka:kasus#kasus":[{"a":"kasus.list","p":{"saya":0,"tinjau":0,"status":"","kategori":"","urgensi":"","id_kelas":"","q":"","rujukan":"","page":1}}],"waka:kasus#tl":[{"a":"monitoring.daftar","p":{}}],"waka:program":[{"a":"program.daftar","p":{}}],"waka:program#kebutuhan":[{"a":"program.kebutuhan","p":{}}],"waka:program#program":[{"a":"program.daftar","p":{}}],"waka:program#rekap":[{"a":"rekap.tahunan","p":{"arsip":""}}],"waka:instrumen":[{"a":"instrumen.daftar","p":{}}],"waka:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"kepsek:program":[{"a":"program.daftar","p":{}}],"kepsek:program#kebutuhan":[{"a":"program.kebutuhan","p":{}}],"kepsek:program#program":[{"a":"program.daftar","p":{}}],"kepsek:program#rekap":[{"a":"rekap.tahunan","p":{"arsip":""}}],"kepsek:instrumen":[{"a":"instrumen.daftar","p":{}}],"kepsek:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"admin:absensi":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"admin:absensi#mapel":[{"a":"absensi.meta","p":{}},{"a":"absensi.riwayat","p":{"id_kelas":""}}],"admin:absensi#harian":[{"a":"harian.meta","p":{"tanggal":"@0"}}],"admin:absensi#periode":[{"a":"harian.periode","p":{"mode":"bulan","id_kelas":"","bulan":"@bln"}}],"admin:absensi#daftar":[{"a":"hadir.daftar","p":{"tanggal":"@0","id_kelas":""}}],"admin:absensi#rmapel":[{"a":"absensi.bulanMeta","p":{}}],"admin:laporan":[{"a":"laporan.rekap","p":{"dari":"@-29","sampai":"@0","id_kelas":"","id_mapel":"","kategori":"","status":""}}],"admin:admin":[{"a":"admin.meta","p":{}},{"a":"admin.list","p":{"entity":"users","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#users":[{"a":"admin.list","p":{"entity":"users","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#murid":[{"a":"admin.list","p":{"entity":"murid","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#kelas":[{"a":"admin.list","p":{"entity":"kelas","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#mapel":[{"a":"admin.list","p":{"entity":"mapel","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#pengampu":[{"a":"admin.list","p":{"entity":"pengampu","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#kategori":[{"a":"admin.list","p":{"entity":"kategori","q":"","page":1,"status":"","id_kelas":"","jenis":""}}],"admin:admin#penugasan":[{"a":"admin.kasusAktif","p":{}},{"a":"bk.daftar","p":{}}],"admin:admin#tahun":[{"a":"arsip.ringkasan","p":{}}],"admin:admin#kehadiran":[{"a":"kehadiran.get","p":{}}],"admin:admin#surat":[{"a":"admin.config.get","p":{}},{"a":"kop.get","p":{}}],"admin:admin#config":[{"a":"admin.config.get","p":{}},{"a":"admin.pemeliharaan","p":{}}],"guru_mapel:riwayat":[{"a":"murid.daftar","p":{"q":"","id_kelas":"","hal":1}}],"wali_kelas:riwayat":[{"a":"murid.daftar","p":{"q":"","id_kelas":"","hal":1}}],"guru_bk:riwayat":[{"a":"murid.daftar","p":{"q":"","id_kelas":"","hal":1}}],"waka:riwayat":[{"a":"murid.daftar","p":{"q":"","id_kelas":"","hal":1}}],"wali_kelas:rapat":[{"a":"rapat.kelas","p":{"id_kelas":"","dari":"","sampai":""}}],"guru_bk:rapat":[{"a":"rapat.kelas","p":{"id_kelas":"","dari":"","sampai":""}}],"waka:rapat":[{"a":"rapat.kelas","p":{"id_kelas":"","dari":"","sampai":""}}],"kepsek:rapat":[{"a":"rapat.kelas","p":{"id_kelas":"","dari":"","sampai":""}}],"admin:rapat":[{"a":"rapat.kelas","p":{"id_kelas":"","dari":"","sampai":""}}]};
function pfDaftar(page) {
  const k = pfKey(page);
  let l = PF[k];
  if (!l) { const r = (S.mode || (S.user && S.user.roles[0]) || ''); l = PF_BAWAAN[r + ':' + page]; }
  return (l || []).map(pfMat);
}
/** Daftar prafetch untuk semua tab sebuah halaman (rekaman pengguna, atau bawaan per peran). */
function pfDaftarTab(page) {
  const pre = pfKey(page) + '#', r = (S.mode || (S.user && S.user.roles[0]) || ''), preB = r + ':' + page + '#';
  let out = [];
  const sudah = {};
  Object.keys(PF).forEach(function (k) { if (k.indexOf(pre) === 0) { sudah[k.substr(pre.length)] = 1; out = out.concat(PF[k]); } });
  Object.keys(PF_BAWAAN).forEach(function (k) { if (k.indexOf(preB) === 0 && !sudah[k.substr(preB.length)]) out = out.concat(PF_BAWAAN[k]); });
  return out.map(pfMat).concat(pfDinamis(page));
}
/** v1.14: tab absensi yang memakai kelas bawaan pengguna (Rekap bulanan, Rekap periode, Daftar hadir). */
function pfDinamis(page) {
  if (page === 'kelas' && S.user && (S.kelasWali || []).length) return [{ a: 'instrumen.profilKelas', p: { id_kelas: S.kelasWali[0] } }];
  if (page !== 'absensi' || !S.user || !S.today) return [];
  const bln = S.today.substr(0, 7), semua = hasAny(['guru_bk', 'waka', 'admin']), kw = (S.kelasWali || [])[0] || '';
  const out = [];
  const k1 = kw || (semua && S.refs && S.refs.kelas && S.refs.kelas[0] ? S.refs.kelas[0].id : '');
  if (k1 && (kw || semua)) out.push({ a: 'harian.rekap', p: { id_kelas: k1, bulan: bln } });
  if (kw && !semua) {
    out.push({ a: 'harian.periode', p: { mode: 'bulan', id_kelas: kw, bulan: bln } });
    out.push({ a: 'hadir.daftar', p: { tanggal: S.today, id_kelas: kw } });
  }
  return out;
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
function muatBanyak(list, ukuran) {
  const N = ukuran || 15;
  const now = Date.now(), seen = {};
  const todo = list.filter(function (x) {
    if (!CACHEABLE[x.a]) return false;
    const k = ccKey(x.a, x.p);
    if (seen[k]) return false; seen[k] = 1;
    const hit = CC[k];
    return !(hit && now - hit.t < CC_TTL);
  });
  if (!todo.length) return Promise.resolve();
  if (todo.length > N) return muatBanyak(todo.slice(0, N), N).then(function () { return muatBanyak(todo.slice(N), ukuran); });
  if (todo.length === 1) return ccFetch(ccKey(todo[0].a, todo[0].p), todo[0].a, todo[0].p, true).catch(function () { });
  const batch = api('muat.banyak', { daftar: todo.map(function (x) { return { a: x.a, p: x.p || {} }; }) }, true);
  const basiBatch = [], tok0 = S.navTok;
  // Butir yang disajikan basi diperbarui dalam SATU panggilan berikutnya (bukan satu per butir).
  batch.then(function () {
    setTimeout(function () {
      if (!basiBatch.length) return;
      const ulang = basiBatch.slice(0, 15);
      api('muat.banyak', { daftar: ulang.map(function (x) { return { a: x.a, p: Object.assign({}, x.p || {}, { __segar: 1 }) }; }) }, true).then(function (r) {
        let beda = false;
        ulang.forEach(function (x, j) {
          const it = r && r[j]; if (!it || !it.ok) return;
          const k = ccKey(x.a, x.p), lama = CC[k] && CC[k].v !== undefined ? JSON.stringify(CC[k].v) : null;
          CC[k] = { t: Date.now(), p: Promise.resolve(it.data), v: it.data, at: Date.now() };
          if (lama !== JSON.stringify(it.data)) beda = true;
        });
        ccSimpanNanti();
        if (beda && S.navTok !== tok0 && !OV.length && !S.touched) navigateTo(S.page, S.params, true, true);
      }).catch(function () { });
    }, 60);
  }, function () { });
  todo.forEach(function (x, i) {
    const k = ccKey(x.a, x.p), prev = CC[k];
    const p = batch.then(function (r) { const it = r && r[i]; if (it && it.ok) { if (it.basi) basiBatch.push(x); return it.data; } throw new Error((it && it.pesan) || 'Gagal memuat.'); });
    const ent = CC[k] = { t: Date.now(), p: p, v: prev ? prev.v : undefined, at: prev ? prev.at : 0, pending: true, batch: true };
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
    // v1.14: garis waktu murid diambil saat jari/kursor menyentuh namanya (sebelum diketuk)
    const mu = e.target.closest && e.target.closest('[data-act="open-murid"][data-id]');
    if (mu && S.user && ev !== 'mouseover') { const kk = ccKey('riwayat.murid', { id_murid: mu.dataset.id }), h = CC[kk]; if (!h || (Date.now() - h.t > CC_TTL && !h.pending)) ccFetch(kk, 'riwayat.murid', { id_murid: mu.dataset.id }, true).catch(function () { }); }
    const j = e.target.closest && e.target.closest('[data-act="absen-go"][data-j]');
    if (j && j.dataset.j && S.today) rosterPrafetch('absensi.roster', { id_kelas: j.dataset.k, id_mapel: j.dataset.m, tanggal: S.today, jam_ke: j.dataset.j });
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
          if (!READ_ACTIONS[action]) { if (action.indexOf('auth.') !== 0) ccClear(action); if (!BUKAN_TULIS[action]) TULIS_AT = Date.now(); }
          if (res.basi && !(payload && payload.__segar)) tandaiBasi(action, payload);
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
      .api(S.token, action, S.mode ? Object.assign({ __mode: S.mode }, pakaiSegar(action, payload || {})) : pakaiSegar(action, payload || {}));
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
