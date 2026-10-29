/* SIKOLAB BK — penghubung frontend GitHub Pages ↔ backend Google Apps Script.
 * Meniru google.script.run sehingga seluruh kode aplikasi berjalan tanpa perubahan.
 * POST memakai Content-Type text/plain agar tidak memicu CORS preflight (yang tidak didukung GAS). */
(function () {
  'use strict';
  var URL_GAS = String(window.SIKOLAB_GAS_URL || '');
  var siap = /\/exec$/.test(URL_GAS) && URL_GAS.indexOf('GANTI_DENGAN') < 0;
  function kirim(token, action, payload) {
    if (!siap) return Promise.reject(new Error('Alamat server belum diatur. Isi SIKOLAB_GAS_URL di js/config.js dengan URL /exec dari Apps Script.'));
    return fetch(URL_GAS, {
      method: 'POST', redirect: 'follow', cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: token || '', action: action, payload: payload || {} })
    }).then(function (r) {
      if (!r.ok) throw new Error('Server membalas ' + r.status + '.');
      return r.text();
    }).then(function (t) {
      try { return JSON.parse(t); } catch (e) { throw new Error('Balasan server tidak terbaca. Pastikan Web App di-deploy dengan akses "Anyone".'); }
    });
  }
  function runner(ok, gagal) {
    return {
      withSuccessHandler: function (fn) { return runner(fn, gagal); },
      withFailureHandler: function (fn) { return runner(ok, fn); },
      api: function (token, action, payload) {
        kirim(token, action, payload).then(function (r) { if (ok) ok(r); }, function (e) { if (gagal) gagal(e); });
      }
    };
  }
  window.google = window.google || {};
  window.google.script = { run: runner(null, null) };
  // Status awal (nama sekolah, logo, layar masuk) disimpan di perangkat agar layar masuk tampil seketika.
  try {
    var awal = JSON.parse(localStorage.getItem('sk_awal_fe') || 'null');
    if (awal && (awal.state === 'login' || awal.state === 'ok')) window.SK_AWAL = Object.assign({}, awal, { state: 'login' });
  } catch (e) { /* abaikan */ }
  if (siap && window.fetch) {
    fetch(URL_GAS + '?api=status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.success && r.data) {
        try {
          if (r.data.state === 'login' || r.data.state === 'ok') localStorage.setItem('sk_awal_fe', JSON.stringify(Object.assign({}, r.data, { state: 'login' })));
          else localStorage.removeItem('sk_awal_fe');
        } catch (e) { /* abaikan */ }
      }
    }).catch(function () { /* abaikan */ });
  }
})();
