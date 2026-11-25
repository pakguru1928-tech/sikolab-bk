/* SIKOLAB BK v1.15 — service worker (PWA).
 * Menyimpan BERKAS TAMPILAN di perangkat agar aplikasi terbuka cepat dan tetap tampil saat sinyal putus.
 * DATA tidak pernah disimpan di sini: permintaan ke server Apps Script (alamat lain) tidak disentuh.
 * - Berkas bernomor versi (?v=1.15): diambil dari simpanan perangkat (cepat). Versi baru = nomor baru = unduh ulang.
 * - Halaman, js/config.js, dan berkas lain: selalu diambil terbaru; simpanan dipakai hanya bila tidak ada sinyal.
 * Dibuat otomatis oleh build_frontend.js. */
'use strict';
var CACHE = 'sikolab-1.15';
var INTI = ["css/style.css?v=1.15","js/api.js?v=1.15","js/formisi.js?v=1.15","js/core.js?v=1.15","js/shell.js?v=1.15","js/pages/10_beranda.js?v=1.15","js/pages/11_absensi.js?v=1.15","js/pages/12_lapor.js?v=1.15","js/pages/13_kasus.js?v=1.15","js/pages/14_layanan.js?v=1.15","js/pages/15_riwayat.js?v=1.15","js/pages/16_ortu.js?v=1.15","js/pages/17_laporan.js?v=1.15","js/pages/18_grafik_akun.js?v=1.15","js/pages/19_arsip.js?v=1.15","js/pages/20_program.js?v=1.15","js/pages/21_instrumen.js?v=1.15","js/pages/22_admin.js?v=1.15","js/pages/23_kelas.js?v=1.15","js/pages/24_panduan.js?v=1.15","js/pages/25_sistem.js?v=1.15","js/pages/26_arahan.js?v=1.15","js/pages/30_cetak_qr.js?v=1.15","js/pages/31_daftar_hadir.js?v=1.15","js/pages/32_pindai.js?v=1.15","js/pages/33_kartu.js?v=1.15","js/pages/34_admin_kehadiran.js?v=1.15","js/pages/35_temu.js?v=1.15","js/pages/36_wa.js?v=1.15","js/pages/37_antrean.js?v=1.15","js/pages/38_surat.js?v=1.15","js/pages/39_poin.js?v=1.15","js/pages/40_guruwali.js?v=1.15","js/pages/41_rekap_mapel.js?v=1.15","js/mulai.js?v=1.15"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(INTI); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('sikolab-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin || /\/exec$/.test(u.pathname)) return;
  if (u.searchParams.get('v')) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(r).then(function (hit) {
        return hit || fetch(r).then(function (res) { if (res.ok) c.put(r, res.clone()); return res; });
      });
    }));
    return;
  }
  e.respondWith(fetch(r).then(function (res) {
    if (res.ok && res.type === 'basic') { var salin = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, salin); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: r.mode === 'navigate' }).then(function (hit) {
      if (hit) return hit;
      if (r.mode !== 'navigate') return Response.error();
      return caches.match('./', { ignoreSearch: true }).then(function (h) { return h || caches.match('index.html', { ignoreSearch: true }); }).then(function (h) { return h || Response.error(); });
    });
  }));
});
