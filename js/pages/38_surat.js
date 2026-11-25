/* SIKOLAB BK v1.15 — js/pages/38_surat.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
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
