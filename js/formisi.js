'use strict';
/* Penampil & pembaca formulir instrumen BK — dipakai bersama oleh aplikasi (input manual Guru BK) dan halaman pengisian murid. */
var IsiForm = (function () {
  function e(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function has(v, x) { return Array.isArray(v) ? v.indexOf(x) >= 0 : v === x; }
  /** butir: array butir; rekan: [{id,nama}] untuk butir 'teman'; jawab: nilai awal {idButir: nilai} */
  function render(butir, rekan, jawab) {
    jawab = jawab || {};
    var h = '', lastG = null, no = 0;
    butir.forEach(function (b) {
      if (b.kelompok && b.kelompok !== lastG) { h += '<div class="if-grp">' + e(b.kelompok) + '</div>'; lastG = b.kelompok; }
      var v = jawab[b.id];
      h += '<div class="if-item ' + (b.tipe === 'masalah' ? 'if-flat' : '') + '" data-bid="' + e(b.id) + '" data-tipe="' + e(b.tipe) + '">';
      if (b.tipe === 'masalah') {
        h += '<label class="if-check"><input type="checkbox" value="1"' + (v === 1 ? ' checked' : '') + '><span>' + e(b.teks) + '</span></label>';
      } else {
        no++;
        h += '<div class="if-t">' + e(b.teks) + (b.wajib ? ' <span class="req">*</span>' : '') + '</div>';
        if (b.tipe === 'skala') {
          h += '<div class="if-scale">' + b.opsi.map(function (o, i) { return '<label class="if-opt"><input type="radio" name="r_' + e(b.id) + '" value="' + (i + 1) + '"' + (v === i + 1 ? ' checked' : '') + '><span>' + e(o) + '</span></label>'; }).join('') + '</div>';
        } else if (b.tipe === 'pilihan') {
          h += '<div class="if-list">' + b.opsi.map(function (o) { return '<label class="if-opt"><input type="radio" name="r_' + e(b.id) + '" value="' + e(o) + '"' + (v === o ? ' checked' : '') + '><span>' + e(o) + '</span></label>'; }).join('') + '</div>';
        } else if (b.tipe === 'banyak') {
          h += '<div class="if-list">' + b.opsi.map(function (o) { return '<label class="if-opt"><input type="checkbox" value="' + e(o) + '"' + (has(v, o) ? ' checked' : '') + '><span>' + e(o) + '</span></label>'; }).join('') + '</div>';
        } else if (b.tipe === 'isian') {
          h += '<textarea class="textarea" rows="3" maxlength="1000">' + e(v || '') + '</textarea>';
        } else if (b.tipe === 'teman') {
          h += '<div class="if-hint">Pilih paling banyak ' + b.maks + ' teman' + (b.arah === 'tolak' ? ' (boleh dikosongkan)' : '') + '. <span class="if-cnt" data-cnt>0</span>/' + b.maks + '</div><div class="if-friends" data-maks="' + b.maks + '">' +
            (rekan.length ? rekan.map(function (r) { return '<label class="if-opt"><input type="checkbox" value="' + e(r.id) + '"' + (has(v, r.id) ? ' checked' : '') + '><span>' + e(r.nama) + '</span></label>'; }).join('') : '<div class="xs muted">Belum ada teman sekelas terdaftar.</div>') + '</div>';
        }
      }
      h += '<div class="err" role="alert"></div></div>';
    });
    return h;
  }
  function bind(root, onLimit) {
    function hitung(g) {
      var n = g.querySelectorAll('input:checked').length;
      var c = g.parentNode.querySelector('[data-cnt]'); if (c) c.textContent = n;
    }
    [].forEach.call(root.querySelectorAll('.if-friends'), hitung_);
    function hitung_(g) { hitung(g); }
    root.addEventListener('change', function (ev) {
      var g = ev.target.closest && ev.target.closest('.if-friends');
      if (!g) return;
      var mx = +g.dataset.maks, n = g.querySelectorAll('input:checked').length;
      if (n > mx) { ev.target.checked = false; if (onLimit) onLimit(mx); }
      hitung(g);
    });
  }
  /** Baca jawaban dari DOM. Mengembalikan {jawab, galat:[{id,pesan}]} */
  function read(root, butir) {
    var jawab = {}, galat = [];
    butir.forEach(function (b) {
      var el = root.querySelector('[data-bid="' + b.id + '"]'); if (!el) return;
      var v = null;
      if (b.tipe === 'masalah') { if (el.querySelector('input:checked')) v = 1; }
      else if (b.tipe === 'skala') { var r = el.querySelector('input:checked'); if (r) v = +r.value; }
      else if (b.tipe === 'pilihan') { var r2 = el.querySelector('input:checked'); if (r2) v = r2.value; }
      else if (b.tipe === 'banyak' || b.tipe === 'teman') { var a = [].map.call(el.querySelectorAll('input:checked'), function (i) { return i.value; }); if (a.length) v = a; }
      else if (b.tipe === 'isian') { var t = el.querySelector('textarea').value.trim(); if (t) v = t; }
      var ee = el.querySelector('.err');
      if (v === null && b.wajib) { galat.push({ id: b.id, el: el }); if (ee) ee.textContent = 'Wajib diisi.'; el.classList.add('invalid'); }
      else { if (ee) ee.textContent = ''; el.classList.remove('invalid'); }
      if (v !== null) jawab[b.id] = v;
    });
    return { jawab: jawab, galat: galat };
  }
  return { render: render, read: read, bind: bind, esc: e };
})();
