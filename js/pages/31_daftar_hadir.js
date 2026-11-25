/* SIKOLAB BK v1.15 — js/pages/31_daftar_hadir.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
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
