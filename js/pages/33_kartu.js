/* SIKOLAB BK v1.15 — js/pages/33_kartu.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
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
