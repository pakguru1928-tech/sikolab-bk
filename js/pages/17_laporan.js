/* SIKOLAB BK v1.15 — js/pages/17_laporan.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
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
      [['teal', 'bi-calendar-check', 'Masuk sekolah (harian)', k.hadirHarian === null || k.hadirHarian === undefined ? '-' : k.hadirHarian + '%', (r.harian ? r.harian.catatan : 0) + ' catatan harian'], ['blue', 'bi-person-check', (P.lp.id_mapel ? 'Hadir · ' + ((r.pilihanMapel || []).filter(function (m) { return m.id === P.lp.id_mapel; })[0] || { nama: 'mapel' }).nama : 'Hadir (semua mapel)'), k.hadir + '%', (k.sesi !== undefined ? k.sesi + ' sesi · ' : '') + k.catatan + ' catatan murid' + (k.takDikenal ? ' · ' + k.takDikenal + ' status tak dikenal' : '')], ['rose', 'bi-x-octagon', 'Alpa', k.alpa, 'catatan'], ['indigo', 'bi-folder2-open', 'Kasus pada periode', k.kasus, k.aktif + ' aktif'], ['purple', 'bi-check2-circle', 'Selesai', k.selesai, k.kasus ? Math.round(k.selesai * 100 / k.kasus) + '% dari kasus' : '-'], ['amber', 'bi-radar', 'Pola ditandai', r.pola.ringkas.kritis + r.pola.ringkas.perhatian + r.pola.ringkas.pantau, r.pola.ringkas.kritis + ' kritis']].map(function (x) {
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
    h += '<p class="xs muted mt-12"><i class="bi bi-info-circle"></i> 1 catatan murid = 1 murid dalam 1 sesi absensi mapel. Contoh: 30 murid diabsen dalam 10 sesi = 300 catatan.' + (k.takDikenal ? ' <b>' + k.takDikenal + ' catatan berstatus tidak dikenal tidak dihitung</b>' + (akunAdmin() ? '; rinciannya di Administrasi → Kesehatan Sistem.' : '; hubungi admin.') : '') + '</p>';
    $('#lp-body').innerHTML = h;
    chart('ch-tren', { kind: 'line', labels: r.tren.labels, data: r.tren.data, color: '#0D9488', min: 0, max: 100, label: 'Tren kehadiran' });
    chart('ch-st', { kind: 'donut', labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'], data: ['H', 'S', 'I', 'A', 'T'].map(function (s) { return st[s]; }), colors: ['H', 'S', 'I', 'A', 'T'].map(function (s) { return ST_COL[s]; }), sub: 'catatan murid', label: 'Status kehadiran' });
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
