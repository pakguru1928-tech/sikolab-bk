/* SIKOLAB BK v1.15 — js/pages/40_guruwali.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.11 — Guru wali: Murid Dampingan (pendampingan murid sampai lulus)
// ════════════════════════════════════════════════════════════
const GW_TABS = [['murid', 'Murid dampingan', 'bi-people'], ['catatan', 'Catatan pendampingan', 'bi-journal-text'], ['rencana', 'Rencana & laporan', 'bi-file-earmark-text']];
PAGES.dampingan = function (params, tok) {
  return apiC('dampingan.daftar', {}).then(function (d) {
    if (stale(tok)) return;
    P.gw = { d: d, tab: params.tab || P.gwTab || 'murid' };
    $('#app-container').innerHTML = pageHead('Guru wali', 'Murid Dampingan', 'Pendampingan akademik, bakat dan minat, sosial-psikologis, dan karakter murid sejak terdaftar sampai lulus. Kebutuhan konseling dirujuk ke Guru BK.', '<button class="btn primary" data-act="gw-catat"><i class="bi bi-journal-plus"></i> Catat pendampingan</button>') +
      '<div class="tabs mb-16" id="gw-tabs">' + GW_TABS.map(function (t) { return '<button class="tab ' + (t[0] === P.gw.tab ? 'active' : '') + '" data-act="gw-tab" data-t="' + t[0] + '"><i class="bi ' + t[2] + '"></i> ' + t[1] + '</button>'; }).join('') + '</div><div id="gw-body"></div>';
    gwDraw();
  });
};
ACT['gw-tab'] = function (el) { P.gw.tab = P.gwTab = el.dataset.t; $$('#gw-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); gwDraw(); };
function gwDraw() {
  const t = P.gw.tab;
  if (t === 'catatan') return gwCatatan();
  if (t === 'rencana') return gwRencana();
  const d = P.gw.d, r = d.ringkas;
  if (!d.murid.length) { $('#gw-body').innerHTML = '<div class="card pad">' + empty('bi-people', 'Belum ada murid dampingan', 'Admin menetapkan murid dampingan di Administrasi → Guru Wali.') + '</div>'; return; }
  let h = '<div class="grid g-kpi k4">' + [['teal', 'bi-people', 'Murid dampingan', r.murid, 'lintas kelas'], ['rose', 'bi-exclamation-triangle', 'Perlu perhatian', r.perhatian, 'pola, kasus, alpa ≥ 3' + (d.poinAktif ? ', tahap poin' : '')], ['amber', 'bi-hourglass-split', 'Belum didampingi', r.belumDidampingi, 'tahun ajaran ' + d.tahunAjaran], ['indigo', 'bi-journal-text', 'Catatan saya', r.catatan, 'tahun ajaran ' + d.tahunAjaran]].map(function (x) {
    return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + esc(x[4]) + '</div></div></div>';
  }).join('') + '</div>';
  h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap"><div class="fchips" id="gw-f"><button class="fchip active" data-act="gw-f" data-f="">Semua</button><button class="fchip" data-act="gw-f" data-f="p">Perlu perhatian</button><button class="fchip" data-act="gw-f" data-f="b">Belum didampingi</button></div><div class="search" style="max-width:220px"><i class="bi bi-search"></i><input id="gw-q" type="search" placeholder="Cari murid…"></div></div>' +
    '<div class="tbl-wrap mt-12"><table class="tbl" id="gw-tbl" style="min-width:' + (d.poinAktif ? 900 : 820) + 'px"><thead><tr><th>Murid</th><th>Kelas</th><th>Kehadiran 30 hr</th><th>Alpa</th><th>Kasus aktif</th>' + (d.poinAktif ? '<th>Poin</th>' : '') + '<th>Pendampingan</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
    d.murid.map(function (m, i) {
      const p = m.pola || m.kasus || m.A >= 3 || m.poinTahap;
      return '<tr data-q="' + esc((m.nama + ' ' + m.nis).toLowerCase()) + '" data-p="' + (p ? 1 : 0) + '" data-b="' + (m.catatan ? 0 : 1) + '"><td class="click" data-act="open-murid" data-id="' + esc(m.id) + '" style="cursor:pointer"><div class="fw6">' + esc(m.nama) + ' ' + arahanIkon(m.id) + '</div><div class="xs muted">NIS ' + esc(m.nis) + '</div>' + (m.pola ? '<div class="mt-8">' + chipLevel(m.pola) + '</div>' : '') + '</td><td>' + esc(m.kelas) + '</td>' +
        '<td>' + (m.hadir === null ? '<span class="muted">—</span>' : '<div class="row"><div class="bar" style="width:60px"><i style="width:' + m.hadir + '%"></i></div><b class="xs">' + m.hadir + '%</b></div>') + '</td><td' + (m.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + m.A + '</td>' +
        '<td>' + (m.kasus ? '<span class="chip st-Diproses">' + m.kasus + ' aktif</span>' : '<span class="muted">—</span>') + '</td>' + (d.poinAktif ? '<td>' + (m.poin ? '<b>' + m.poin + '</b>' + (m.poinTahap ? '<div class="xs" style="color:var(--rose)">' + esc(m.poinTahap) + '</div>' : '') : '<span class="muted">0</span>') + '</td>' : '') +
        '<td class="xs">' + (m.catatan ? m.catatan + ' catatan<div class="muted">terakhir ' + esc(fTgl(m.terakhir)) + '</div>' : '<span class="chip st-Baru">Belum</span>') + '</td>' +
        '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="gw-catat" data-id="' + esc(m.id) + '" title="Catat pendampingan"><i class="bi bi-journal-plus"></i></button> <button class="btn sm blue" data-act="wa-murid" data-id="' + esc(m.id) + '" title="WhatsApp orang tua"><i class="bi bi-whatsapp"></i></button> <button class="btn sm" data-act="lap-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '" title="Lapor / rujuk ke Guru BK"><i class="bi bi-send"></i></button></td></tr>';
    }).join('') + '</tbody></table></div></div><p class="xs muted mt-12">Ketuk nama untuk membuka garis waktu murid. Kebutuhan konseling: gunakan tombol <i class="bi bi-send"></i> (Lapor kejadian → "Mohon ditangani Guru BK"). Isi konseling tetap rahasia di Guru BK.</p>';
  $('#gw-body').innerHTML = h;
  $('#gw-q').addEventListener('input', gwFilter);
}
function gwFilter() {
  const q = ($('#gw-q').value || '').trim().toLowerCase(), f = P.gwF || '';
  $$('#gw-tbl tbody tr').forEach(function (tr) { let ok = !q || tr.dataset.q.indexOf(q) >= 0; if (f === 'p') ok = ok && tr.dataset.p === '1'; if (f === 'b') ok = ok && tr.dataset.b === '1'; tr.classList.toggle('hide', !ok); });
}
ACT['gw-f'] = function (el) { P.gwF = el.dataset.f; $$('#gw-f .fchip').forEach(function (b) { b.classList.toggle('active', b === el); }); gwFilter(); };
// ── Catat / ubah pendampingan ──
ACT['gw-catat'] = function (el) { gwModal(null, el && el.dataset.id ? [el.dataset.id] : []); };
function gwModal(rec, pilih) {
  const muat = P.gw && P.gw.d ? Promise.resolve(P.gw.d) : apiC('dampingan.daftar', {});
  muat.then(function (d) {
    if (!d.murid.length) { toast('Anda belum memiliki murid dampingan.', 'warn'); return; }
    const sel = {}; (rec ? rec.ids : pilih || []).forEach(function (id) { sel[id] = 1; });
    const m = openModal({
      title: rec ? 'Ubah catatan pendampingan' : 'Catat pendampingan', size: 'lg',
      body: '<form id="f-gw" class="form-grid" novalidate><div class="field" data-f="murid"><span class="flabel">Murid <span class="req">*</span> <span class="xs muted">— pilih lebih dari satu untuk pertemuan kelompok</span></span><div class="pk-daftar">' + d.murid.map(function (x) { return '<label class="pk-m' + (sel[x.id] ? ' on' : '') + '" style="cursor:pointer"><input type="checkbox" class="sr" value="' + esc(x.id) + '"' + (sel[x.id] ? ' checked' : '') + '><i class="bi ' + (sel[x.id] ? 'bi-check-circle' : 'bi-circle') + '"></i><span><b>' + esc(x.nama) + '</b><small>' + esc(x.kelas) + '</small></span></label>'; }).join('') + '</div><div class="err" role="alert"></div></div>' +
        '<div class="form-grid c3">' + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: rec ? rec.tanggal : S.today, maxv: S.today }) + fld({ name: 'aspek', label: 'Aspek', type: 'select', req: true, value: rec ? rec.aspek : d.aspek[0], opts: d.aspek }) + fld({ name: 'bentuk', label: 'Bentuk', type: 'select', req: true, value: rec ? rec.bentuk : d.bentuk[0], opts: d.bentuk }) + '</div>' +
        fld({ name: 'uraian', label: 'Uraian kegiatan', type: 'textarea', req: true, rows: 3, max: 2000, value: rec ? rec.uraian : '', ph: 'Apa yang dibahas atau diamati, secara faktual.' }) +
        '<div class="form-grid c2">' + fld({ name: 'hasil', label: 'Hasil (opsional)', type: 'textarea', rows: 2, max: 1500, value: rec ? rec.hasil : '' }) + fld({ name: 'tindak_lanjut', label: 'Tindak lanjut (opsional)', type: 'textarea', rows: 2, max: 1000, value: rec ? rec.tindak_lanjut : '', ph: 'mis. Konsultasi dengan Guru BK, hubungi orang tua' }) + '</div>' +
        '<div class="note info"><i class="bi bi-shield-lock"></i><div>Catatan dibaca Anda, Guru BK, Waka, admin, dan wali kelas murid. Hal yang bersifat konseling/rahasia sebaiknya dirujuk ke Guru BK, bukan ditulis rinci di sini.</div></div></form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="gw-ok"><i class="bi bi-check-lg"></i> Simpan</button>'
    });
    $$('.pk-m input', m.el).forEach(function (c) { c.addEventListener('change', function () { c.parentNode.classList.toggle('on', c.checked); c.nextSibling.className = 'bi ' + (c.checked ? 'bi-check-circle' : 'bi-circle'); }); });
    $('#gw-ok', m.el).addEventListener('click', function (e) {
      const f = $('#f-gw', m.el), v = formData(f);
      const ids = $$('.pk-m input:checked', m.el).map(function (c) { return c.value; });
      let ok = validate(f, v, { tanggal: { label: 'Tanggal', req: true }, uraian: { label: 'Uraian', req: true, min: 10 } });
      if (!ids.length) { setErr(f, 'murid', 'Pilih minimal satu murid.'); ok = false; }
      if (!ok) return;
      v.id_murid_list = ids; if (rec) v.id = rec.id;
      run(e.currentTarget, api('dampingan.catat', v)).then(function () { m.close(); toast('Catatan pendampingan tersimpan.'); ccClear('dampingan.catat'); if (S.page === 'dampingan') navigateTo('dampingan', { tab: P.gw.tab }, true, true); else if (S.page === 'riwayat') navigateTo('riwayat', S.params, true, true); }).catch(fail);
    });
  }).catch(fail);
}
function gwCatatan() {
  $('#gw-body').innerHTML = skeleton(2);
  return api('dampingan.catatan', {}).then(function (r) {
    P.gw.cat = r.rows;
    $('#gw-body').innerHTML = '<div class="card"><div class="card-head"><h3>Catatan tahun ajaran ' + esc(P.gw.d.tahunAjaran) + '</h3><span class="xs muted">' + r.rows.length + ' catatan</span></div><div class="card-body">' + (r.rows.length ? r.rows.map(function (x, i) {
      return '<div class="sec mt-8"><div class="row between wrap" style="gap:6px"><div class="row wrap" style="gap:6px"><span class="chip kc-teal">' + esc(x.aspek) + '</span><span class="chip neutral">' + esc(x.bentuk) + '</span></div><span class="xs muted">' + esc(fTgl(x.tanggal)) + ' · ' + esc(x.semester) + '</span></div><div class="fw6 mt-8">' + esc(x.murid.join(', ')) + '</div><div class="body" style="line-height:20px">' + esc(x.uraian) + '</div>' +
        (x.hasil ? '<div class="xs mt-8"><b>Hasil:</b> ' + esc(x.hasil) + '</div>' : '') + (x.tindak_lanjut ? '<div class="xs mt-8"><b>Tindak lanjut:</b> ' + esc(x.tindak_lanjut) + '</div>' : '') +
        '<div class="row mt-8" style="gap:6px"><button class="btn sm" data-act="gw-ubah" data-i="' + i + '"><i class="bi bi-pencil"></i> Ubah</button><button class="btn sm ghost" data-act="gw-hapus" data-id="' + esc(x.id) + '"><i class="bi bi-trash3"></i> Hapus</button></div></div>';
    }).join('') : empty('bi-journal-text', 'Belum ada catatan pendampingan', 'Tekan "Catat pendampingan" di atas.')) + '</div></div>';
  }).catch(function (e) { isiHtml('#gw-body', errBox(e)); });
}
ACT['gw-ubah'] = function (el) { gwModal(P.gw.cat[+el.dataset.i]); };
ACT['gw-hapus'] = function (el) {
  confirmDlg('Hapus catatan pendampingan ini?', 'Hapus', true).then(function (y) { if (!y) return; api('dampingan.hapus', { id: el.dataset.id }).then(function () { toast('Catatan dihapus.'); ccClear('dampingan.catat'); gwCatatan(); }).catch(fail); });
};
// ── Rencana pendampingan & laporan tahunan ──
function gwRencana() {
  $('#gw-body').innerHTML = skeleton(2);
  return api('dampingan.rencana', {}).then(function (r) {
    const q = r.isi || {}, keg = (q.kegiatan && q.kegiatan.length ? q.kegiatan : [{ w: '', a: 'Akademik', k: '' }]);
    P.gw.ren = { keg: keg };
    $('#gw-body').innerHTML = '<div class="card pad"><div class="row between wrap" style="gap:8px"><div><h3>Rencana pendampingan · TA ' + esc(r.tahun_ajaran) + '</h3><div class="xs muted mt-8">Bukti dukung guru wali: rencana pendampingan dan laporan tahunan. Isi sesuai kebutuhan murid dampingan Anda.</div></div><div class="row wrap" style="gap:6px"><button class="btn" data-act="gw-cetak-ren"><i class="bi bi-printer"></i> Cetak rencana</button><button class="btn" data-act="gw-cetak-lap"><i class="bi bi-printer"></i> Cetak laporan tahunan</button></div></div>' +
      '<form id="f-ren" class="form-grid mt-16" novalidate>' + fld({ name: 'tujuan', label: 'Tujuan pendampingan', type: 'textarea', rows: 3, max: 1500, value: q.tujuan || '', ph: 'mis. Murid dampingan mencapai ketuntasan belajar, mengenali minat dan bakatnya, serta memiliki relasi sosial yang sehat.' }) +
      fld({ name: 'jadwal', label: 'Jadwal pertemuan rutin', max: 500, value: q.jadwal || '', ph: 'mis. Pertemuan kelompok setiap Jumat minggu kedua, jam istirahat' }) +
      '<div class="field"><span class="flabel">Rencana kegiatan</span><div id="ren-keg"></div><button type="button" class="btn sm mt-8" data-act="ren-tambah"><i class="bi bi-plus-lg"></i> Tambah kegiatan</button></div>' +
      '<h3 class="mt-16">Bahan laporan tahunan</h3>' + fld({ name: 'refleksi', label: 'Refleksi / capaian pendampingan', type: 'textarea', rows: 3, max: 2000, value: q.refleksi || '' }) +
      '<div class="form-grid c2">' + fld({ name: 'kendala', label: 'Kendala', type: 'textarea', rows: 2, max: 1500, value: q.kendala || '' }) + fld({ name: 'rekomendasi', label: 'Rekomendasi tahun berikutnya', type: 'textarea', rows: 2, max: 1500, value: q.rekomendasi || '' }) + '</div></form>' +
      '<div class="row mt-16" style="justify-content:flex-end"><button class="btn primary" data-act="ren-simpan"><i class="bi bi-check-lg"></i> Simpan</button></div></div>';
    renKeg();
  }).catch(function (e) { isiHtml('#gw-body', errBox(e)); });
}
function renBaca() { P.gw.ren.keg = $$('#ren-keg [data-ki]').map(function (row) { return { w: $('[data-k=w]', row).value, a: $('[data-k=a]', row).value, k: $('[data-k=k]', row).value }; }); }
function renKeg() {
  const asp = P.gw.d.aspek;
  $('#ren-keg').innerHTML = P.gw.ren.keg.map(function (k, i) { return '<div class="row wrap mt-8" data-ki="' + i + '" style="gap:6px;align-items:flex-start"><input class="input" data-k="w" maxlength="60" placeholder="Waktu (mis. Juli–Agustus)" value="' + esc(k.w || '') + '" style="flex:0 1 180px"><select class="select" data-k="a" style="flex:0 1 200px">' + asp.map(function (a) { return '<option' + (a === k.a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select><input class="input" data-k="k" maxlength="300" placeholder="Kegiatan" value="' + esc(k.k || '') + '" style="flex:1 1 260px"><button type="button" class="icon-btn" data-act="ren-hapus" data-i="' + i + '" title="Hapus"><i class="bi bi-trash3"></i></button></div>'; }).join('');
}
ACT['ren-tambah'] = function () { renBaca(); P.gw.ren.keg.push({ w: '', a: 'Akademik', k: '' }); renKeg(); };
ACT['ren-hapus'] = function (el) { renBaca(); P.gw.ren.keg.splice(+el.dataset.i, 1); if (!P.gw.ren.keg.length) P.gw.ren.keg.push({ w: '', a: 'Akademik', k: '' }); renKeg(); };
function renData() { renBaca(); const v = formData($('#f-ren')); v.kegiatan = P.gw.ren.keg; return v; }
ACT['ren-simpan'] = function (el) { run(el, api('dampingan.rencanaSimpan', { isi: renData() })).then(function () { toast('Rencana pendampingan tersimpan.'); }).catch(fail); };
ACT['gw-cetak-ren'] = function (el) {
  run(el, api('dampingan.rencanaSimpan', { isi: renData() }).then(function (r) { return siapKop().then(function () { return r; }); })).then(function (r) {
    const q = r.isi, d = P.gw.d;
    const h = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">RENCANA PENDAMPINGAN GURU WALI</h2><div class="pr-sub">Tahun Ajaran ' + esc(r.tahun_ajaran) + '</div>' +
      '<table class="pr-tbl"><tbody><tr><td style="width:28%">Nama guru wali</td><td>' + esc(S.user.nama) + (S.user.nip ? ' · NIP ' + esc(S.user.nip) : '') + '</td></tr><tr><td>Jumlah murid dampingan</td><td>' + d.murid.length + ' murid</td></tr><tr><td>Tujuan pendampingan</td><td style="white-space:pre-wrap">' + esc(q.tujuan || '-') + '</td></tr><tr><td>Jadwal pertemuan rutin</td><td>' + esc(q.jadwal || '-') + '</td></tr></tbody></table>' +
      '<h3 style="font-size:11pt;margin:10px 0 4px">A. Rencana kegiatan</h3><table class="pr-tbl"><thead><tr><th style="width:5%">No</th><th style="width:20%">Waktu</th><th style="width:22%">Aspek</th><th>Kegiatan</th></tr></thead><tbody>' + (q.kegiatan.length ? q.kegiatan.map(function (k, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(k.w || '-') + '</td><td>' + esc(k.a) + '</td><td>' + esc(k.k) + '</td></tr>'; }).join('') : '<tr><td colspan="4">-</td></tr>') + '</tbody></table>' +
      '<h3 style="font-size:11pt;margin:10px 0 4px">B. Daftar murid dampingan</h3><table class="pr-tbl"><thead><tr><th style="width:5%">No</th><th style="width:16%">NIS</th><th>Nama murid</th><th style="width:8%">L/P</th><th style="width:16%">Kelas</th></tr></thead><tbody>' + d.murid.map(function (m, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(m.nis) + '</td><td>' + esc(m.nama) + '</td><td style="text-align:center">' + esc(m.jk || '') + '</td><td>' + esc(m.kelas) + '</td></tr>'; }).join('') + '</tbody></table>' +
      ttdCetak(ttdKepsek(), ttdOrang('Guru Wali,', S.user.nama, S.user.nip), '') + '</div>';
    cetakHtml(h, { judul: 'Rencana pendampingan guru wali', ket: 'A4 tegak' });
  }).catch(fail);
};
ACT['gw-cetak-lap'] = function (el) {
  run(el, api('dampingan.rencanaSimpan', { isi: renData() }).then(function () { return Promise.all([api('dampingan.laporan', {}), api('dampingan.catatan', {}), siapKop()]); })).then(function (res) {
    const d = res[0], cat = res[1].rows, q = d.rencana || {};
    const h = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">LAPORAN TAHUNAN PENDAMPINGAN GURU WALI</h2><div class="pr-sub">Tahun Ajaran ' + esc(d.tahun_ajaran) + '</div>' +
      '<table class="pr-tbl"><tbody><tr><td style="width:28%">Nama guru wali</td><td>' + esc(d.guru.nama) + (d.guru.nip ? ' · NIP ' + esc(d.guru.nip) : '') + '</td></tr><tr><td>Jumlah murid dampingan</td><td>' + d.murid.length + ' murid</td></tr><tr><td>Jumlah kegiatan pendampingan</td><td>' + d.totalKegiatan + ' kegiatan (' + Object.keys(d.perSemester).map(function (k) { return 'Semester ' + esc(k) + ': ' + d.perSemester[k]; }).join(', ') + ')</td></tr>' +
      '<tr><td>Kegiatan per aspek</td><td>' + Object.keys(d.perAspek).filter(function (k) { return d.perAspek[k]; }).map(function (k) { return esc(k) + ' ' + d.perAspek[k]; }).join(' · ') + '</td></tr></tbody></table>' +
      '<h3 style="font-size:11pt;margin:10px 0 4px">A. Perkembangan murid dampingan</h3><table class="pr-tbl pr-mini" style="font-size:8.5pt"><thead><tr><th>No</th><th style="text-align:left">Nama murid</th><th>Kelas</th><th>Kehadiran</th><th>S</th><th>I</th><th>A</th><th>Kasus (selesai)</th>' + (d.poinAktif ? '<th>Poin</th>' : '') + '<th>Pendampingan</th><th style="text-align:left">Aspek</th></tr></thead><tbody>' +
      d.murid.map(function (m, i) { return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(m.nama) + '</td><td>' + esc(m.kelas) + '</td><td>' + (m.hadir === null ? '-' : m.hadir + '%') + '</td><td>' + m.S + '</td><td>' + m.I + '</td><td>' + m.A + '</td><td>' + m.kasus + ' (' + m.selesai + ')</td>' + (d.poinAktif ? '<td>' + m.poin + '</td>' : '') + '<td>' + m.catatan + '</td><td style="text-align:left">' + esc(m.aspek || '-') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div style="font-size:8.5pt">Kehadiran dihitung dari absensi harian yang tersedia' + (d.dariAbsensi ? ' sejak ' + esc(fTgl(d.dariAbsensi)) : '') + ' (data semester yang sudah diarsipkan tidak ikut).</div>' +
      '<h3 style="font-size:11pt;margin:10px 0 4px">B. Ringkasan kegiatan pendampingan</h3><table class="pr-tbl" style="font-size:9pt"><thead><tr><th style="width:12%">Tanggal</th><th style="width:18%">Aspek / bentuk</th><th style="width:22%">Murid</th><th>Uraian dan hasil</th></tr></thead><tbody>' + (cat.length ? cat.slice().reverse().map(function (x) { return '<tr><td>' + esc(fTgl(x.tanggal)) + '</td><td>' + esc(x.aspek) + '<br><span style="font-size:8pt">' + esc(x.bentuk) + '</span></td><td>' + esc(x.murid.join(', ')) + '</td><td>' + esc(x.uraian) + (x.hasil ? '<br><i>Hasil:</i> ' + esc(x.hasil) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="4">Belum ada kegiatan.</td></tr>') + '</tbody></table>' +
      '<h3 style="font-size:11pt;margin:10px 0 4px">C. Refleksi, kendala, dan rekomendasi</h3><table class="pr-tbl"><tbody><tr><td style="width:24%">Refleksi / capaian</td><td style="white-space:pre-wrap">' + esc(q.refleksi || '-') + '</td></tr><tr><td>Kendala</td><td style="white-space:pre-wrap">' + esc(q.kendala || '-') + '</td></tr><tr><td>Rekomendasi</td><td style="white-space:pre-wrap">' + esc(q.rekomendasi || '-') + '</td></tr></tbody></table>' +
      ttdCetak(ttdKepsek(), ttdOrang('Guru Wali,', d.guru.nama, d.guru.nip), '') + '</div>';
    cetakHtml(h, { judul: 'Laporan tahunan guru wali', ket: 'A4 tegak' });
  }).catch(fail);
};
// ── Admin → Guru Wali ──
function adGuruWali() {
  $('#ad-body').innerHTML = skeleton(2);
  P.adGw = P.adGw || { kelas: '', guru: '' };
  return api('guruwali.info', { id_kelas: P.adGw.kelas }).then(function (r) {
    P.adGw.r = r;
    if (!P.adGw.kelas && r.kelasPilih) P.adGw.kelas = r.kelasPilih;
    if (!P.adGw.kelas && r.kelas.length) { P.adGw.kelas = r.kelas[0].id; return adGuruWali(); }
    $('#ad-body').innerHTML = '<div class="note info"><i class="bi bi-info-circle"></i><div>Guru wali mendampingi sekelompok murid sejak terdaftar sampai lulus (lintas kelas). Guru yang diberi murid dampingan otomatis mendapat menu <b>Murid Dampingan</b>; tidak perlu peran baru. Pembagian juga bisa lewat kolom <b>guru_wali</b> (email guru) saat impor CSV murid.</div></div>' +
      '<div class="grid g-2 mt-16"><div class="card pad"><h3>Tetapkan murid dampingan</h3><div class="form-grid mt-12">' + fld({ name: 'guru', id: 'gw-guru', label: 'Guru wali', type: 'select', blank: '— pilih guru —', value: P.adGw.guru, opts: r.guru.map(function (g) { return { v: g.email, l: g.nama + ' (' + g.jumlah + ')' }; }) }) + '</div>' +
      '<div class="pk-kelas fchips mt-12">' + r.kelas.map(function (k) { return '<button type="button" class="fchip ' + (k.id === P.adGw.kelas ? 'active' : '') + '" data-act="adgw-kls" data-id="' + esc(k.id) + '">' + esc(k.nama) + '</button>'; }).join('') + '</div>' +
      '<div class="row between mt-12"><label class="check"><input type="checkbox" id="adgw-all"> Pilih semua murid kelas ini</label><span class="xs muted">' + r.murid.length + ' murid</span></div><div class="pk-daftar mt-8" id="adgw-list">' +
      r.murid.map(function (m) { return '<label class="pk-m" style="cursor:pointer"><input type="checkbox" class="sr" value="' + esc(m.id) + '"><i class="bi bi-circle"></i><span><b>' + esc(m.nama) + '</b><small>' + (m.guru_nama ? 'Guru wali: ' + esc(m.guru_nama) : '<span style="color:var(--rose)">Belum ada guru wali</span>') + '</small></span></label>'; }).join('') + '</div>' +
      '<div class="row wrap mt-12" style="gap:8px;justify-content:flex-end"><button class="btn" data-act="adgw-lepas"><i class="bi bi-x-lg"></i> Lepas guru wali</button><button class="btn primary" data-act="adgw-set"><i class="bi bi-check-lg"></i> Tetapkan ke guru terpilih</button></div></div>' +
      '<div class="card"><div class="card-head"><h3>Ringkasan</h3><span class="xs muted">' + (r.aktif - r.tanpa) + '/' + r.aktif + ' murid sudah punya guru wali</span></div>' + (r.tanpa ? '<div class="card-body"><div class="note"><i class="bi bi-exclamation-triangle"></i><div><b>' + r.tanpa + ' murid aktif</b> belum memiliki guru wali.</div></div></div>' : '') +
      '<div class="tbl-wrap"><table class="tbl" style="min-width:0;width:100%"><thead><tr><th>Guru</th><th style="text-align:right;width:140px">Murid dampingan</th></tr></thead><tbody>' + r.guru.map(function (g) { return '<tr><td>' + esc(g.nama) + '</td><td style="text-align:right">' + (g.jumlah ? '<b>' + g.jumlah + '</b>' : '<span class="muted">0</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
    $('#gw-guru').addEventListener('change', function (e) { P.adGw.guru = e.target.value; });
    const list = $$('#adgw-list input');
    list.forEach(function (c) { c.addEventListener('change', function () { c.parentNode.classList.toggle('on', c.checked); c.nextSibling.className = 'bi ' + (c.checked ? 'bi-check-circle' : 'bi-circle'); }); });
    $('#adgw-all').addEventListener('change', function (e) { list.forEach(function (c) { c.checked = e.target.checked; c.dispatchEvent(new Event('change')); }); });
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
ACT['adgw-kls'] = function (el) { P.adGw.kelas = el.dataset.id; adGuruWali(); };
function adgwKirim(el, email) {
  const ids = $$('#adgw-list input:checked').map(function (c) { return c.value; });
  if (!ids.length) { toast('Pilih murid terlebih dahulu.', 'warn'); return; }
  run(el, api('guruwali.atur', { email_guru: email, ids: ids })).then(function (r) { toast(email ? r.diubah + ' murid ditetapkan.' : 'Guru wali ' + r.diubah + ' murid dilepas.'); adGuruWali(); }).catch(fail);
}
ACT['adgw-set'] = function (el) { if (!P.adGw.guru) { toast('Pilih guru wali terlebih dahulu.', 'warn'); return; } adgwKirim(el, P.adGw.guru); };
ACT['adgw-lepas'] = function (el) { confirmDlg('Lepas guru wali dari murid yang dipilih?', 'Lepas').then(function (y) { if (y) adgwKirim(el, ''); }); };
