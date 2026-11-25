/* SIKOLAB BK v1.15 — js/pages/41_rekap_mapel.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.11 — Rekap absensi mata pelajaran bulanan (cetak). Hanya membaca data absensi yang sudah ada.
// ════════════════════════════════════════════════════════════
function rmPage(params, tok) {
  return apiC('absensi.bulanMeta', {}).then(function (meta) {
    if (stale(tok)) return;
    P.rm = P.rm || {}; P.rm.meta = meta;
    const opsi = [];
    if (meta.kelas.length) opsi.push({ v: 'kelas', l: 'Per kelas (semua mapel)' });
    if (meta.ajar.length || meta.semua) opsi.push({ v: 'mapel', l: 'Per mata pelajaran (daftar hadir pertemuan)' });
    if (!opsi.length) { $('#abs-body').innerHTML = '<div class="card pad">' + empty('bi-printer', 'Tidak ada kelas atau mata pelajaran yang dapat Anda cetak') + '</div>'; return; }
    const mode = P.rm.mode && opsi.some(function (o) { return o.v === P.rm.mode; }) ? P.rm.mode : opsi[0].v;
    P.rm.mode = mode;
    const bulan = P.rm.bulan || S.today.substr(0, 7);
    let pil = '';
    if (mode === 'kelas') pil = fld({ name: 'id_kelas', id: 'rm-k', label: 'Kelas', type: 'select', value: P.rm.kelas, opts: (meta.semua ? [{ v: '*', l: 'Semua kelas' }] : []).concat(meta.kelas.map(function (k) { return { v: k.id, l: k.nama }; })) });
    else if (meta.ajar.length && !meta.semua) pil = fld({ name: 'ajar', id: 'rm-a', label: 'Mapel & kelas', type: 'select', value: P.rm.ajar, opts: meta.ajar.map(function (x, i) { return { v: String(i), l: x.mapel + ' — ' + x.kelas }; }) });
    else pil = fld({ name: 'id_mapel', id: 'rm-m', label: 'Mata pelajaran', type: 'select', value: P.rm.mapel, opts: meta.mapel.map(function (m) { return { v: m.id, l: m.nama }; }) }) + fld({ name: 'id_kelas', id: 'rm-k', label: 'Kelas', type: 'select', value: P.rm.kelas, opts: meta.kelas.map(function (k) { return { v: k.id, l: k.nama }; }) });
    $('#abs-body').innerHTML = '<div class="card pad"><h3><i class="bi bi-printer"></i> Cetak rekap absensi mata pelajaran bulanan</h3><p class="xs muted mt-8">Disusun dari absensi mapel yang sudah diisi guru. <b>Per kelas</b>: matriks tanggal × jam ke- beserta mapel dan guru, lalu daftar murid yang tidak hadir (± 2 halaman A4 mendatar). <b>Per mata pelajaran</b>: daftar hadir murid per pertemuan. Jam yang tidak diabsen tampil kosong.</p>' +
      '<form id="f-rm" class="form-grid mt-12" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))" novalidate>' + fld({ name: 'mode', id: 'rm-mode', label: 'Bentuk', type: 'select', value: mode, opts: opsi }) + pil + fld({ name: 'bulan', id: 'rm-b', label: 'Bulan', type: 'month', value: bulan, maxv: S.today.substr(0, 7) }) +
      '<div class="field"><label>&nbsp;</label><button class="btn primary" type="submit" id="rm-ok"><i class="bi bi-printer"></i> Siapkan cetak</button></div></form></div>';
    $('#rm-mode').addEventListener('change', function (e) { P.rm.mode = e.target.value; rmPage({}, S.navTok); });
    $('#f-rm').addEventListener('submit', function (e) { e.preventDefault(); rmCetak(); });
  });
}
function rmCetak() {
  const d = formData($('#f-rm')), meta = P.rm.meta;
  P.rm.bulan = d.bulan;
  let q = { bulan: d.bulan };
  if (P.rm.mode === 'kelas') { q.id_kelas = d.id_kelas; P.rm.kelas = d.id_kelas; }
  else if (d.ajar !== undefined) { const x = meta.ajar[+d.ajar]; P.rm.ajar = d.ajar; q.id_kelas = x.id_kelas; q.id_mapel = x.id_mapel; }
  else { q.id_kelas = d.id_kelas; q.id_mapel = d.id_mapel; P.rm.kelas = d.id_kelas; P.rm.mapel = d.id_mapel; }
  if (!d.bulan) { toast('Pilih bulan.', 'warn'); return; }
  run($('#rm-ok'), Promise.all([api('absensi.bulan', q), siapKop()])).then(function (res) {
    const r = res[0];
    if (!r.kelas.length) { toast('Belum ada absensi mapel pada bulan itu.', 'warn'); return; }
    if (P.rm.mode === 'kelas') cetakRmKelas(r); else cetakRmMapel(r);
  }).catch(fail);
}
function rmHari(r) {
  const y = +r.bulan.substr(0, 4), mo = +r.bulan.substr(5, 2), n = new Date(y, mo, 0).getDate(), lib = {}, out = [];
  (r.libur || []).forEach(function (x) { lib[x.tanggal] = x.k; });
  for (let i = 1; i <= n; i++) {
    const d = r.bulan + '-' + (i < 10 ? '0' : '') + i, w = new Date(y, mo - 1, i).getDay();
    if (w === 0 || (w === 6 && r.hs !== 6)) continue;
    out.push({ d: d, w: w, lib: lib[d] || '' });
  }
  return out;
}
function rmJam(s) { const p = String(s || '').split('-'); const a = parseInt(p[0], 10) || 0; return [a, p[1] ? (parseInt(p[1], 10) || a) : a]; }
const RM_SG = { S: 'S', I: 'I', A: 'A', T: 'T' };
function cetakRmKelas(r) {
  const hari = rmHari(r), jm = Math.min(Math.max(r.jamMaks || 8, 1), 12);
  const html = r.kelas.map(function (k) {
    const sel = {};
    k.sesi.forEach(function (s) { const j = rmJam(s.jam_ke); for (let x = j[0]; x <= j[1]; x++) { const key = s.tanggal + '|' + x; (sel[key] = sel[key] || []).push(s); } });
    // jam terakhir yang dipakai bulan ini (agar kolom tidak berlebih)
    let maxJ = 1; k.sesi.forEach(function (s) { maxJ = Math.max(maxJ, rmJam(s.jam_ke)[1]); }); maxJ = Math.max(Math.min(maxJ, jm), Math.min(8, jm));
    const cols = []; for (let x = 1; x <= maxJ; x++) cols.push(x);
    const adaSesi = {}; k.sesi.forEach(function (s) { adaSesi[s.tanggal] = 1; });
    const mat = '<table class="pr-tbl pr-mini" style="font-size:7.6pt"><thead><tr><th style="width:52px">Tanggal</th>' + cols.map(function (x) { return '<th>Jam ' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      hari.map(function (h) {
        const lab = HRI[h.w].substr(0, 3) + ' ' + (+h.d.substr(8, 2));
        if (h.lib && !adaSesi[h.d]) return '<tr><td style="text-align:left;background:#e5e7eb">' + lab + '</td><td colspan="' + cols.length + '" style="background:#e5e7eb;color:#444">Libur — ' + esc(h.lib) + '</td></tr>';
        return '<tr><td style="text-align:left">' + lab + '</td>' + cols.map(function (x) { const ss = sel[h.d + '|' + x]; return '<td>' + (ss ? ss.map(function (s) { return esc(s.kode) + (s.tidak.length ? '·<b>' + s.tidak.length + '</b>' : ''); }).join('/') : '') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    const leg = '<table class="pr-tbl" style="font-size:8pt;margin-top:4px"><thead><tr><th style="width:9%">Kode</th><th>Mata pelajaran</th><th>Guru</th><th style="width:12%">Pertemuan diabsen</th></tr></thead><tbody>' + k.mapel.map(function (m) { return '<tr><td style="text-align:center"><b>' + esc(m.kode) + '</b></td><td>' + esc(m.nama) + '</td><td>' + esc(m.guru || '-') + '</td><td style="text-align:center">' + m.sesi + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div style="font-size:8pt;margin-top:2px">Cara membaca: <b>MAT·2</b> = Matematika diabsen, 2 murid tidak hadir (nama di halaman berikut). Kode tanpa angka = semua hadir. Sel kosong = tidak ada absensi pada jam itu. Abu-abu = libur.</div>';
    const per = {};
    k.sesi.forEach(function (s) { s.tidak.forEach(function (t) { const o = per[t.id] = per[t.id] || { nama: t.nama, S: 0, I: 0, A: 0, T: 0, r: [] }; o[t.s] = (o[t.s] || 0) + 1; o.r.push(+s.tanggal.substr(8, 2) + '/' + (+s.tanggal.substr(5, 2)) + ' j' + s.jam_ke.replace('-', '–') + ' ' + s.kode + ' ' + t.s); }); });
    const daf = Object.keys(per).map(function (id) { return per[id]; }).sort(function (a, b) { return (b.A - a.A) || (String(a.nama).toLowerCase() < String(b.nama).toLowerCase() ? -1 : 1); });
    const hal2 = '<table class="pr-tbl" style="font-size:8.5pt"><thead><tr><th style="width:4%">No</th><th style="width:22%">Nama murid</th><th style="width:4%">S</th><th style="width:4%">I</th><th style="width:4%">A</th><th style="width:4%">T</th><th>Rincian (tanggal · jam ke- · mapel · status)</th></tr></thead><tbody>' +
      (daf.length ? daf.map(function (o, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(o.nama) + '</td><td style="text-align:center">' + (o.S || '') + '</td><td style="text-align:center">' + (o.I || '') + '</td><td style="text-align:center">' + (o.A ? '<b>' + o.A + '</b>' : '') + '</td><td style="text-align:center">' + (o.T || '') + '</td><td>' + esc(o.r.join('; ')) + '</td></tr>'; }).join('') : '<tr><td colspan="7" style="text-align:center">Semua murid hadir pada seluruh pertemuan yang diabsen.</td></tr>') + '</tbody></table>' +
      '<div style="font-size:8pt">S sakit · I izin · A alpa · T terlambat. Murid yang selalu hadir tidak dicantumkan. Alpa berulang di jam tengah hari perlu ditindaklanjuti wali kelas/Guru BK.</div>';
    const sub = blnPanjang(r.bulan) + ' · Wali kelas: ' + (k.wali || '-') + ' · ' + k.murid.length + ' murid · ' + k.sesi.length + ' pertemuan diabsen';
    return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">REKAP KEHADIRAN PER MATA PELAJARAN · KELAS ' + esc(k.kelas) + '</h2><div class="pr-sub">' + esc(sub) + '</div>' + mat + leg + '</div>' +
      '<div class="pr-doc pr-break"><h2 class="pr-title">MURID YANG TIDAK HADIR PADA JAM PELAJARAN · KELAS ' + esc(k.kelas) + '</h2><div class="pr-sub">' + esc(blnPanjang(r.bulan)) + '</div>' + hal2 + ttdCetak(ttdKepsek(), ttdOrang('Wali Kelas ' + esc(k.kelas) + ',', k.wali, k.waliNip), '') + '</div>';
  }).join('');
  cetakHtml(html, { landscape: true, margin: '8mm', judul: 'Rekap absensi mapel bulanan' + (r.kelas.length === 1 ? ' · ' + r.kelas[0].kelas : ' · ' + r.kelas.length + ' kelas'), ket: blnPanjang(r.bulan) + ' · A4 mendatar' });
}
function cetakRmMapel(r) {
  const k = r.kelas[0], ses = k.sesi;
  const head = '<tr><th rowspan="2" style="width:22px">No</th><th rowspan="2" style="text-align:left">Nama murid</th>' + ses.map(function (s) { return '<th>' + (+s.tanggal.substr(8, 2)) + '</th>'; }).join('') + '<th rowspan="2">S</th><th rowspan="2">I</th><th rowspan="2">A</th><th rowspan="2">T</th><th rowspan="2">%</th></tr><tr>' + ses.map(function (s) { return '<th style="font-weight:400;font-size:6.5pt">j' + esc(s.jam_ke) + '</th>'; }).join('') + '</tr>';
  const body = k.murid.map(function (m, i) {
    const c = { H: 0, S: 0, I: 0, A: 0, T: 0, n: 0 };
    const sel = ses.map(function (s) { const st = s.st[m.id]; if (st) { c[st]++; c.n++; } return '<td>' + (st ? (st === 'H' ? '•' : '<b>' + st + '</b>') : '') + '</td>'; }).join('');
    return '<tr><td>' + (i + 1) + '</td><td style="text-align:left;white-space:nowrap">' + esc(m.nama) + '</td>' + sel + '<td>' + (c.S || '') + '</td><td>' + (c.I || '') + '</td><td>' + (c.A ? '<b>' + c.A + '</b>' : '') + '</td><td>' + (c.T || '') + '</td><td>' + (c.n ? Math.round((c.H + c.T) * 1000 / c.n) / 10 : '-') + '</td></tr>';
  }).join('');
  const guru = ses.map(function (s) { return s.guru; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  const pengampu = (k.mapel[0] && k.mapel[0].guru) || guru.join(', ');
  const html = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">DAFTAR HADIR MATA PELAJARAN ' + esc((r.mapelNama || '').toUpperCase()) + '</h2><div class="pr-sub">Kelas ' + esc(k.kelas) + ' · ' + esc(blnPanjang(r.bulan)) + ' · Guru: ' + esc(pengampu || '-') + ' · ' + ses.length + ' pertemuan</div>' +
    (ses.length ? '<table class="pr-tbl pr-mini" style="font-size:7.6pt"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' : '<p>Belum ada pertemuan yang diabsen pada bulan ini.</p>') +
    '<div style="font-size:8pt;margin-top:4px">Baris atas = tanggal, baris bawah = jam ke-. • hadir · S sakit · I izin · A alpa · T terlambat. % = kehadiran dari pertemuan yang diabsen.</div>' +
    ttdCetak(ttdKepsek(), ttdOrang('Guru Mata Pelajaran,', guru[0] || pengampu, ''), '') + '</div>';
  cetakHtml(html, { landscape: true, margin: '8mm', judul: 'Daftar hadir ' + (r.mapelNama || '') + ' · ' + k.kelas, ket: blnPanjang(r.bulan) + ' · A4 mendatar' });
}
