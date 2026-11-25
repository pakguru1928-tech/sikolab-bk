/* SIKOLAB BK v1.15 — js/pages/22_admin.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Administrasi (F12): data master CRUD, impor, pengaturan, log
// ════════════════════════════════════════════════════════════
const ADM_TABS = [['users', 'Pengguna', 'bi-people'], ['murid', 'Murid', 'bi-mortarboard'], ['kelas', 'Kelas', 'bi-grid-3x3-gap'], ['mapel', 'Mata Pelajaran', 'bi-journal-bookmark'], ['pengampu', 'Pengampu', 'bi-diagram-3'], ['kategori', 'Kategori', 'bi-tags'], ['penugasan', 'Penugasan BK', 'bi-person-gear'], ['guruwali', 'Guru Wali', 'bi-person-heart'], ['tahun', 'Tahun Ajaran', 'bi-calendar-event'], ['kehadiran', 'Kehadiran & Libur', 'bi-qr-code-scan'], ['surat', 'Surat & Cetak', 'bi-file-earmark-text'], ['poin', 'Sistem Poin', 'bi-award'], ['jadwal', 'Jadwal Pelajaran', 'bi-calendar3'], ['config', 'Pengaturan', 'bi-sliders'], ['sistem', 'Kesehatan Sistem', 'bi-shield-check'], ['log', 'Log akses', 'bi-clock-history']];

PAGES.admin = function (params, tok) {
  return apiC('admin.meta').then(function (meta) {
    if (stale(tok)) return;
    P.ad = { meta: meta, tab: params.tab || 'users', q: '', page: 1, status: '', id_kelas: '', jenis: '' };
    $('#app-container').innerHTML = pageHead('Pengelolaan sistem', 'Administrasi Sistem', 'Kelola pengguna, data master, dan pengaturan. Perubahan dicatat pada log.', '') +
      '<div class="tabs mb-16" id="ad-tabs">' + ADM_TABS.map(function (t) { return '<button class="tab ' + (t[0] === P.ad.tab ? 'active' : '') + '" data-act="ad-tab" data-t="' + t[0] + '"><i class="bi ' + t[2] + '"></i> ' + t[1] + '</button>'; }).join('') + '</div><div id="ad-body"></div>';
    adDraw();
  });
};
ACT['ad-tab'] = function (el) {
  P.ad.tab = el.dataset.t; P.ad.q = ''; P.ad.page = 1; P.ad.status = ''; P.ad.id_kelas = ''; P.ad.jenis = '';
  adDraw();
};
function adDraw() {
  const t = P.ad.tab;
  $$('#ad-tabs .tab').forEach(function (b) { b.classList.toggle('active', b.dataset.t === t); if (b.dataset.t === t && b.scrollIntoView) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* abaikan */ } } });
  if (t === 'penugasan') return adPenugasan();
  if (t === 'tahun') return adTahun();
  if (t === 'config') return adConfig();
  if (t === 'kehadiran') return adKehadiran();
  if (t === 'surat') return adSurat();
  if (t === 'poin') return adPoin();
  if (t === 'guruwali') return adGuruWali();
  if (t === 'log') return adLog();
  if (t === 'sistem') return adSistem();
  if (t === 'jadwal') return adJadwal();
  const e = P.ad.meta.entities[t];
  const statusF = (t === 'users' || t === 'murid');
  $('#ad-body').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div class="row wrap grow"><div class="search" style="max-width:280px"><i class="bi bi-search"></i><input id="ad-q" type="search" placeholder="Cari ' + esc(e.singular) + '…" value="' + esc(P.ad.q) + '"></div>' +
    (statusF ? '<select class="select" id="ad-st" style="width:auto;min-height:40px"><option value="">Semua status</option><option value="Aktif"' + (P.ad.status === 'Aktif' ? ' selected' : '') + '>Aktif</option><option value="Nonaktif"' + (P.ad.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option>' + (t === 'murid' ? '<option value="Lulus"' + (P.ad.status === 'Lulus' ? ' selected' : '') + '>Lulus</option>' : '') + '</select>' : '') +
    (t === 'murid' ? '<select class="select" id="ad-kl" style="width:auto;min-height:40px"><option value="">Semua kelas</option>' + P.ad.meta.refs.kelas.map(function (k) { return '<option value="' + esc(k.v) + '"' + (P.ad.id_kelas === k.v ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select>' : '') +
    (t === 'kategori' ? '<select class="select" id="ad-jn" style="width:auto;min-height:40px"><option value="">Semua jenis</option><option value="kejadian"' + (P.ad.jenis === 'kejadian' ? ' selected' : '') + '>Kategori kejadian</option><option value="urgensi"' + (P.ad.jenis === 'urgensi' ? ' selected' : '') + '>Tingkat urgensi</option></select>' : '') + '</div>' +
    '<div class="row wrap">' + (e.import ? '<button class="btn" data-act="ad-impor"><i class="bi bi-upload"></i> Impor CSV</button>' : '') + (t === 'pengampu' ? '<button class="btn" data-act="pg-massal"><i class="bi bi-diagram-3"></i> Tambah banyak kelas</button>' : '') + '<button class="btn primary" data-act="ad-baru"><i class="bi bi-plus-lg"></i> Tambah ' + esc(e.singular) + '</button></div></div><div id="ad-list" style="margin-top:12px">' + skeleton(2) + '</div></div>';
  $('#ad-q').addEventListener('input', debounce(function (ev) { P.ad.q = ev.target.value.trim(); P.ad.page = 1; adList(); }, 300));
  ['ad-st', 'ad-kl', 'ad-jn'].forEach(function (id) { const el = $('#' + id); if (el) el.addEventListener('change', function (ev) { P.ad[{ 'ad-st': 'status', 'ad-kl': 'id_kelas', 'ad-jn': 'jenis' }[id]] = ev.target.value; P.ad.page = 1; adList(); }); });
  adList();
}
function adCell(f, r) {
  const v = r[f.k];
  if (f.k === 'status_aktif') return '<span class="chip ' + (v === 'Aktif' ? 'st-Dipantau' : 'st-Selesai') + '">' + esc(v) + '</span>';
  if (r.disp && r.disp[f.k] !== undefined && (f.type === 'ref' || f.type === 'multi')) return esc(r.disp[f.k] || '—');
  if (f.k === 'jenis') return '<span class="chip neutral">' + (v === 'urgensi' ? 'Urgensi' : 'Kejadian') + '</span>';
  return esc(v === '' ? '—' : v);
}
function adList() {
  const t = P.ad.tab, e = P.ad.meta.entities[t];
  apiC('admin.list', { entity: t, q: P.ad.q, page: P.ad.page, status: P.ad.status, id_kelas: P.ad.id_kelas, jenis: P.ad.jenis }).then(function (r) {
    P.ad.rows = r.rows;
    const cols = e.cols.map(function (k) { return e.fields.filter(function (f) { return f.k === k; })[0]; }).filter(Boolean);
    $('#ad-list').innerHTML = r.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (f) { return '<th>' + esc(f.label) + '</th>'; }).join('') + '<th style="text-align:right">Aksi</th></tr></thead><tbody>' + r.rows.map(function (row, i) {
      return '<tr>' + cols.map(function (f, ci) { return '<td' + (ci === 0 ? ' class="fw6"' : '') + '>' + adCell(f, row) + '</td>'; }).join('') + '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="ad-edit" data-i="' + i + '"><i class="bi bi-pencil"></i> Ubah</button> ' + (t === 'users' ? '<button class="btn sm" data-act="ad-pin" data-i="' + i + '" title="Atur ulang PIN"><i class="bi bi-key"></i></button> ' : '') + '<button class="btn sm soft-danger" data-act="ad-hapus" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-' + (t === 'users' || t === 'murid' ? 'person-x' : 'trash3') + '"></i></button></td></tr>';
    }).join('') + '</tbody></table></div>' + pager(r, 'ad-page') : empty('bi-database', 'Belum ada data', 'Gunakan tombol Tambah di atas.');
  }).catch(function (er) { $('#ad-list').innerHTML = errBox(er); });
}
ACT['ad-page'] = function (el) { P.ad.page = +el.dataset.page; adList(); };

function adForm(row) {
  const t = P.ad.tab, e = P.ad.meta.entities[t], refs = P.ad.meta.refs;
  const fields = e.fields.map(function (f) {
    const o = { name: f.k, label: f.label, req: f.req, max: f.max, type: f.type, hint: f.hint, value: row ? row[f.k] : (f.k === 'status_aktif' ? 'Aktif' : (f.k === 'tahun_ajaran' ? S.cfg.tahunAjaran : '')) };
    if (f.type === 'select') { o.opts = f.opts.map(function (x) { return { v: x.v, l: x.l }; }); }
    if (f.type === 'ref') { o.type = 'select'; o.opts = (refs[f.ref] || []).slice(); o.blank = f.req ? 'Pilih…' : undefined; }
    if (f.type === 'multi') { o.opts = f.opts; }
    if (f.type === 'tel') { o.type = 'tel'; o.inputmode = 'tel'; }
    if (f.type === 'number') { o.type = 'number'; o.inputmode = 'numeric'; }
    if (f.pattern) o.pattern = f.pattern;
    if (f.lockEdit && row) o.ro = true;
    if (f.type === 'ref' && row && row[f.k] && !o.opts.some(function (x) { return x.v === row[f.k]; })) o.opts.push({ v: row[f.k], l: (row.disp && row.disp[f.k]) || row[f.k] });
    return fld(o);
  }).join('');
  const pinField = (t === 'users' && !row) ? fld({ name: 'pin', label: 'PIN awal (opsional)', type: 'password', max: 6, inputmode: 'numeric', hint: '6 digit. Kosongkan untuk membuat PIN acak yang ditampilkan sekali.', ac: 'new-password' }) : '';
  const m = openModal({
    title: (row ? 'Ubah ' : 'Tambah ') + e.singular, size: 'lg',
    body: '<form id="f-ad" class="form-grid c2" novalidate>' + fields + pinField + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="ad-ok">Simpan</button>'
  });
  $('#ad-ok', m.el).addEventListener('click', function (ev) {
    const f = $('#f-ad', m.el), d = formData(f);
    const rules = {};
    e.fields.forEach(function (fl) {
      const r = { label: fl.label, req: fl.req };
      if (fl.type === 'email') { r.re = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/; r.msg = fl.label + ' tidak valid.'; }
      if (fl.pattern) { try { r.re = new RegExp(fl.pattern); r.msg = fl.label + ' tidak sesuai format' + (fl.hint ? ' (' + fl.hint + ')' : '') + '.'; } catch (x) { } }
      if (fl.type === 'tel') { r.re = /^[0-9+\-\s()]{8,20}$/; r.msg = 'Nomor tidak valid.'; }
      rules[fl.k] = r;
    });
    if (d.pin) rules.pin = { re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.' };
    if (!validate(f, d, rules)) return;
    d.entity = t; if (row) d.id = row.id;
    run(ev.currentTarget, api('admin.simpan', d)).then(function (r) {
      m.close(); toast('Data tersimpan.'); adList();
      if (r.pinBaru && !row) showPin(d.nama, d.email, r.pinBaru);
      if (t === 'kelas' || t === 'mapel') api('boot').then(function (b) { S.refs = b.refs; }).catch(function () { });
    }).catch(fail);
  });
}
function showPin(nama, email, pin) {
  openModal({ title: 'PIN akun', sub: nama + ' · ' + email, body: '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>PIN ini hanya ditampilkan <b>sekali</b>. Sampaikan kepada pengguna secara langsung. Pengguna akan diminta <b>membuat PIN sendiri</b> saat masuk pertama kali.</div></div><div style="font:800 40px var(--font-h);letter-spacing:.3em;text-align:center;margin:20px 0" id="pin-val">' + esc(pin) + '</div>', foot: '<button class="btn" data-close>Selesai</button><button class="btn primary" data-act="pin-copy"><i class="bi bi-clipboard"></i> Salin PIN</button>' });
}
ACT['pin-copy'] = function () {
  const t = ($('#pin-val') || {}).textContent || '';
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('PIN disalin.'); }, function () { toast('Salin manual dari layar.', 'warn'); });
  else toast('Salin manual dari layar.', 'warn');
};
ACT['ad-baru'] = function () { adForm(null); };
// ── Penugasan pengampu massal ──
ACT['pg-massal'] = function () {
  const refs = P.ad.meta.refs;
  const opt = function (a) { return a.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join(''); };
  const m = openModal({
    title: 'Tugaskan guru ke banyak kelas', sub: 'Pilih guru dan mata pelajaran, lalu centang semua kelas yang diampu. Penugasan yang sudah ada dilewati.', size: 'lg',
    body: '<div class="form-grid c2"><div class="field"><label for="pm-guru">Guru</label><select class="select" id="pm-guru"><option value="">Pilih guru…</option>' + opt(refs.guru) + '</select></div>' +
      '<div class="field"><label for="pm-mapel">Mata pelajaran</label><select class="select" id="pm-mapel"><option value="">Pilih mata pelajaran…</option>' + opt(refs.mapel) + '</select></div></div>' +
      '<div id="pm-kelas" class="mt-16"><div class="muted xs">Pilih guru dan mata pelajaran terlebih dahulu.</div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pm-ok" disabled>Simpan penugasan</button>'
  });
  const muat = function () {
    const g = $('#pm-guru', m.el).value, mp = $('#pm-mapel', m.el).value;
    if (!g || !mp) { $('#pm-ok', m.el).disabled = true; return; }
    apiC('admin.pengampuInfo', { email_guru: g, id_mapel: mp }).then(function (r) {
      const grup = {};
      r.kelas.forEach(function (k) { (grup[k.t] = grup[k.t] || []).push(k); });
      $('#pm-kelas', m.el).innerHTML = Object.keys(grup).sort(function (a, b) { return a - b; }).map(function (t) {
        return '<div class="pm-grup"><div class="row" style="justify-content:space-between"><b>' + (+t ? 'Tingkat ' + t : 'Kelas lain') + '</b><label class="check xs"><input type="checkbox" data-pm-all="' + t + '"> Pilih semua</label></div><div class="pm-chips">' +
          grup[t].map(function (k) { return '<label class="check pm-chip' + (k.ada ? ' on' : '') + '"><input type="checkbox" name="pmk" value="' + esc(k.v) + '" data-t="' + t + '"' + (k.ada ? ' checked disabled' : '') + '> ' + esc(k.l) + (k.ada ? ' <em class="xs muted">(sudah)</em>' : '') + '</label>'; }).join('') + '</div></div>';
      }).join('') || '<div class="muted xs">Belum ada kelas. Tambahkan kelas terlebih dahulu.</div>';
      $('#pm-ok', m.el).disabled = false;
    }).catch(fail);
  };
  $('#pm-guru', m.el).addEventListener('change', muat);
  $('#pm-mapel', m.el).addEventListener('change', muat);
  m.el.addEventListener('change', function (ev) {
    const a = ev.target.getAttribute && ev.target.getAttribute('data-pm-all');
    if (a !== null && a !== undefined) $$('input[name=pmk][data-t="' + a + '"]:not(:disabled)', m.el).forEach(function (c) { c.checked = ev.target.checked; });
  });
  $('#pm-ok', m.el).addEventListener('click', function (ev) {
    const ids = $$('input[name=pmk]:checked:not(:disabled)', m.el).map(function (c) { return c.value; });
    if (!ids.length) { toast('Centang minimal satu kelas baru.', 'warn'); return; }
    run(ev.currentTarget, api('admin.pengampuMassal', { email_guru: $('#pm-guru', m.el).value, id_mapel: $('#pm-mapel', m.el).value, kelas: ids })).then(function (r) {
      m.close(); toast(r.ditambah + ' penugasan ditambahkan' + (r.sudahAda ? ', ' + r.sudahAda + ' sudah ada.' : '.')); adList();
    }).catch(fail);
  });
};

ACT['ad-edit'] = function (el) { adForm(P.ad.rows[+el.dataset.i]); };
ACT['ad-hapus'] = function (el) {
  const row = P.ad.rows[+el.dataset.i], t = P.ad.tab;
  const soft = (t === 'users' || t === 'murid');
  const nm = row.nama || row.nama_kelas || row.nama_mapel || (row.disp && row.disp.email_guru) || 'data ini';
  confirmDlg((soft ? 'Nonaktifkan ' : 'Hapus ') + nm + '?' + (soft ? ' Riwayat tetap tersimpan dan akun tidak dapat masuk.' : ''), soft ? 'Nonaktifkan' : 'Hapus', true).then(function (ok) {
    if (!ok) return;
    api('admin.hapus', { entity: t, id: row.id }).then(function (r) { toast(r.pesan); adList(); }).catch(fail);
  });
};
ACT['ad-pin'] = function (el) {
  const row = P.ad.rows[+el.dataset.i];
  confirmDlg('Atur ulang PIN untuk ' + row.nama + '? PIN lama tidak berlaku lagi.', 'Atur ulang', false).then(function (ok) {
    if (!ok) return;
    api('admin.setPin', { id: row.id }).then(function (r) { showPin(r.nama, r.email, r.pin); adList(); }).catch(fail);
  });
};

// ── Impor murid ──
const CSV_TEMPLATE = 'nis,nama,kelas,jk,nama_ortu,no_wa_ortu,email_ortu\n20261001,Contoh Murid Satu,X-MIPA 1,L,Bpk. Contoh,081234567890,\n20261002,Contoh Murid Dua,X-MIPA 1,P,Ibu Contoh,081234567891,ortu@contoh.com\n';
ACT['ad-impor'] = function () {
  const m = openModal({
    title: 'Impor murid dari CSV', size: 'lg',
    body: '<div class="note info"><i class="bi bi-info-circle"></i><div>Kolom: <span class="mono">nis, nama, kelas, jk (L/P), nama_ortu, no_wa_ortu, email_ortu</span>. Nama kelas harus sudah ada. NIS yang sudah terdaftar akan <b>diperbarui</b>, NIS baru ditambahkan.</div></div>' +
      '<div class="row wrap mt-12"><input type="file" id="csv-file" accept=".csv,text/csv,text/plain" class="input" style="max-width:320px"><button class="btn sm" data-act="csv-tpl"><i class="bi bi-download"></i> Unduh templat</button></div>' +
      '<div class="field mt-12"><label for="csv-text">Atau tempel isi CSV</label><textarea id="csv-text" class="textarea mono" rows="8" placeholder="nis,nama,kelas,jk,..."></textarea></div><div id="csv-res" class="mt-12"></div>',
    foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" id="csv-ok"><i class="bi bi-upload"></i> Impor</button>'
  });
  $('#csv-file', m.el).addEventListener('change', function (e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 400000) { toast('Berkas terlalu besar (maks. ± 1.000 baris).', 'err'); e.target.value = ''; return; }
    const fr = new FileReader(); fr.onload = function () { $('#csv-text', m.el).value = String(fr.result).replace(/^﻿/, ''); }; fr.readAsText(f);
  });
  $('#csv-ok', m.el).addEventListener('click', function (e) {
    const csv = $('#csv-text', m.el).value;
    if (!csv.trim()) { toast('Pilih berkas atau tempel data CSV.', 'warn'); return; }
    run(e.currentTarget, api('admin.impor', { csv: csv })).then(function (r) {
      $('#csv-res', m.el).innerHTML = '<div class="note ' + (r.totalGagal ? '' : 'info') + '"><i class="bi bi-clipboard-check"></i><div><b>' + r.tambah + '</b> murid ditambahkan, <b>' + r.ubah + '</b> diperbarui' + (r.totalGagal ? ', <b>' + r.totalGagal + '</b> baris dilewati:' : '.') + (r.gagal.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + r.gagal.map(function (g) { return '<li>Baris ' + g.baris + ': ' + esc(g.pesan) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
      adList();
    }).catch(fail);
  });
};
ACT['csv-tpl'] = function () { downloadBlob(new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'templat_murid.csv'); };

// ── Pengaturan sistem ──
function adConfig() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('admin.config.get').then(function (r) {
    const c = r.config; P.waAda = r.wa.adaToken;
    $('#ad-body').innerHTML = '<div class="grid g-2"><div class="card pad"><h3>Identitas & akademik</h3><form id="f-cfg" class="form-grid c2 mt-12" novalidate>' +
      fld({ name: 'nama_sekolah', label: 'Nama sekolah', req: true, max: 120, value: c.nama_sekolah }) + fld({ name: 'kota', label: 'Kota (untuk surat)', max: 60, value: c.kota }) +
      fld({ name: 'alamat_sekolah', label: 'Alamat', max: 200, value: c.alamat_sekolah }) + '<div></div>' +
      fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, value: c.tahun_ajaran, hint: 'Format 2026/2027', max: 9 }) + fld({ name: 'semester', label: 'Semester', type: 'select', value: c.semester, opts: ['Ganjil', 'Genap'] }) +
      fld({ name: 'logo_url', label: 'Tautan logo (opsional)', type: 'url', max: 200, value: c.logo_url, hint: 'Lebih mudah: unggah logo sekolah di tab Surat & Cetak (logo kanan), otomatis dipakai di seluruh aplikasi. Tautan Google Drive juga diterima bila dibagikan "Siapa saja yang memiliki link".' }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'url_frontend', label: 'Alamat frontend GitHub Pages (opsional)', type: 'url', max: 200, value: c.url_frontend, ph: 'https://namaanda.github.io/sikolab/', hint: 'Bila diisi, tautan instrumen, formulir bertemu BK, email, dan WhatsApp mengarah ke alamat ini. Kosongkan bila hanya memakai alamat /exec.' }) + '</div>' + '<div></div>' +
      fld({ name: 'batas_koreksi_absensi', label: 'Batas koreksi absensi (jam)', type: 'number', inputmode: 'numeric', value: c.batas_koreksi_absensi, hint: '1–168 jam' }) + fld({ name: 'ambang_pola_bolos', label: 'Ambang deteksi pola', type: 'number', inputmode: 'numeric', value: c.ambang_pola_bolos, hint: '2–10 kejadian berulang' }) + fld({ name: 'jam_maks', label: 'Jam pelajaran per hari', type: 'number', inputmode: 'numeric', value: c.jam_maks, hint: '4–16. Menentukan pilihan jam mulai dan jumlah JP pada absensi.' }) +
      fld({ name: 'ambang_kejadian_berulang', label: 'Ambang kejadian berulang', type: 'number', inputmode: 'numeric', value: c.ambang_kejadian_berulang, hint: 'Murid dilaporkan sekian kali dalam 30 hari ditandai berulang' }) + fld({ name: 'notif_bk_semua', label: 'Email ke Guru BK untuk setiap laporan', type: 'select', value: c.notif_bk_semua === '0' ? '0' : '1', opts: [{ v: '1', l: 'Ya, setiap laporan dan pembinaan awal guru' }, { v: '0', l: 'Hanya laporan mendesak dan rujukan' }] }) +
      '<div style="grid-column:1/-1" class="note info"><i class="bi bi-file-earmark-text"></i><div class="xs">Kop surat, logo, nama & NIP Kepala Sekolah, format nomor surat, ukuran kertas, dan jenis huruf diatur di tab <a href="#" data-act="ad-tab" data-t="surat">Surat &amp; Cetak</a>.</div></div>' +
      fld({ name: 'konseling_terbatas', label: 'Akses catatan konseling', type: 'select', value: c.konseling_terbatas === '1' ? '1' : '0', opts: [{ v: '0', l: 'Semua Guru BK sekolah ini' }, { v: '1', l: 'Hanya Guru BK penanggung jawab kasus' }], hint: 'Berlaku bila sekolah memiliki lebih dari satu Guru BK.' }) + '<div></div>' +
      '<div style="grid-column:1/-1" class="form-grid">' + fld({ name: 'templat_wa_undangan', label: 'Templat WhatsApp: undangan', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_undangan }) + fld({ name: 'templat_wa_absen', label: 'Templat WhatsApp: ketidakhadiran', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_absen }) + fld({ name: 'templat_wa_jadwal', label: 'Templat WhatsApp: jadwal pertemuan', type: 'textarea', rows: 3, max: 1000, value: c.templat_wa_jadwal, hint: 'Variabel: {nama_ortu} {nama_murid} {kelas} {sekolah} {pengirim} {tanggal}' }) + '</div></form><div class="row mt-16" style="justify-content:flex-end"><button class="btn primary" data-act="cfg-save"><i class="bi bi-check-lg"></i> Simpan pengaturan</button></div></div>' +
      '<div class="col gap-16"><div class="card pad"><h3>Data & penyimpanan</h3><p class="muted mt-8" style="margin-top:4px">Basis data berupa Google Sheets dan berkas di Google Drive milik akun pemilik aplikasi.</p><div class="col mt-12">' + (r.links.spreadsheet ? '<a class="btn" href="' + esc(r.links.spreadsheet) + '" target="_blank" rel="noopener"><i class="bi bi-file-earmark-spreadsheet"></i> Buka Spreadsheet</a>' : '') + (r.links.folder ? '<a class="btn" href="' + esc(r.links.folder) + '" target="_blank" rel="noopener"><i class="bi bi-folder2-open"></i> Buka folder Drive</a>' : '') + '<button class="btn" data-act="cfg-backup"><i class="bi bi-cloud-arrow-up"></i> Buat cadangan sekarang</button></div></div>' +
      '<div class="card pad" id="pem-card"><h3>Pemeliharaan</h3><div id="pem-body" class="mt-8">' + skeleton(1) + '</div></div>' +
      waCardHtml(r.wa) + '<div class="card pad"><h3>Keamanan</h3><ul class="muted-2" style="margin:8px 0 0;padding-left:18px;line-height:22px"><li>Hak akses ditegakkan di server pada setiap permintaan.</li><li>PIN disimpan sebagai hash; 5 kali salah mengunci akun (15 menit, lalu 1 jam, lalu 4 jam) dan admin diberi tahu.</li><li>PIN dari admin wajib diganti pengguna saat masuk pertama kali.</li><li>Isi konseling hanya dapat dibuka Guru BK dan setiap pembukaan dicatat.</li><li>Cadangan harian otomatis (bila trigger dipasang).</li></ul></div></div></div>';
    }).then(pemuat).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function adPenugasan() {
  $('#ad-body').innerHTML = skeleton(3);
  Promise.all([apiC('admin.kasusAktif'), apiC('bk.daftar')]).then(function (r) {
    const rows = r[0], bks = r[1];
    $('#ad-body').innerHTML = '<div class="card"><div class="card-head"><div><h3>Penugasan Guru BK pada kasus aktif</h3><div class="xs muted" style="margin-top:2px">Admin hanya melihat kode kasus, kelas, dan kategori, tanpa nama murid dan tanpa isi konseling. Gunakan saat Guru BK cuti atau berhalangan.</div></div></div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kasus</th><th>Kelas</th><th>Kategori</th><th>Status</th><th>Penanggung jawab</th><th>Alihkan ke</th></tr></thead><tbody>' + rows.map(function (x) {
        return '<tr><td class="mono">' + esc(x.kode) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(x.kategori) + '</td><td>' + chipStatus(x.status) + '</td><td>' + esc(x.penangani_nama || '—') + '</td><td><select class="select" data-pen="' + esc(x.id) + '" style="min-height:36px;min-width:160px"><option value="">Pilih Guru BK…</option>' + bks.map(function (b) { return '<option value="' + esc(b.email) + '"' + (b.email === x.penangani ? ' selected' : '') + '>' + esc(b.nama) + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>' : empty('bi-inbox', 'Tidak ada kasus aktif')) + '</div>';
    $$('[data-pen]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        sel.disabled = true;
        api('kasus.alihkan', { id: sel.dataset.pen, email: sel.value }).then(function (res) { toast('Kasus kini ditangani ' + res.penangani + '.'); adPenugasan(); }).catch(function (e) { fail(e); adPenugasan(); });
      });
    });
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function pemuat() {
  return apiC('admin.pemeliharaan').then(function (s) {
    const b = $('#pem-body'); if (!b) return;
    b.innerHTML = '<div class="col gap-8">' +
      '<div class="row between wrap"><span>Pengingat & cadangan otomatis</span>' + (s.trigger ? '<span class="chip st-Selesai">Aktif</span>' : '<button class="btn sm" data-act="pem-trigger"><i class="bi bi-alarm"></i> Pasang sekarang</button>') + '</div>' +
      (s.contohAda ? '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>Masih ada <b>data contoh</b> (akun, murid, kelas). Hapus sebelum dipakai sungguhan.</div></div><button class="btn soft-danger" data-act="pem-contoh"><i class="bi bi-trash3"></i> Hapus data contoh</button>' : '<div class="xs muted"><i class="bi bi-check-circle"></i> Tidak ada data contoh.</div>') +
      '<div class="row between wrap"><span>Surat & PDF bermasalah?</span><button class="btn sm" data-act="pem-diag"><i class="bi bi-file-earmark-check"></i> Periksa fitur surat</button></div>' +
      '<div class="row between wrap"><span>Mengubah data langsung di Spreadsheet?</span><button class="btn sm" data-act="pem-segar"><i class="bi bi-arrow-clockwise"></i> Segarkan data</button></div>' +
      (s.pemilik ? '' : '<div class="xs muted">Hapus data contoh dan pasang pengingat hanya bisa dilakukan saat Anda membuka aplikasi dari akun Google pemilik proyek.</div>') + '</div>';
  });
}
ACT['pem-diag'] = function (el) {
  run(el, api('admin.diagSurat')).then(function (r) {
    openModal({ title: 'Pemeriksaan fitur surat & PDF', sub: r.semuaOk ? 'Semua langkah berhasil' : 'Ada langkah yang gagal: lihat tanda merah', size: 'md',
      body: '<div class="col gap-8">' + r.langkah.map(function (x) { return '<div class="row" style="gap:10px;align-items:flex-start"><span class="chip ' + (x.ok ? 'st-Selesai' : 'st-Baru') + '">' + (x.ok ? 'OK' : 'Gagal') + '</span><div><b>' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.pesan) + '</div></div></div>'; }).join('') + '</div>' +
        (r.semuaOk ? '' : '<div class="note mt-12"><i class="bi bi-info-circle"></i><div class="xs">Kirim tangkapan layar ini kepada pengembang. Bila gagal pada "Membuat Google Docs", buka editor Apps Script, jalankan fungsi apa saja sekali, lalu setujui izin yang diminta.</div></div>'),
      foot: '<button class="btn primary" data-close>Tutup</button>' });
  }).catch(fail);
};
ACT['pem-segar'] = function (el) { run(el, api('admin.segarkan')).then(function () { ccClear(); try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sk_boot') === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ } toast('Data dimuat ulang dari Spreadsheet.'); }).catch(fail); };
ACT['pem-trigger'] = function (el) { run(el, api('admin.pasangTrigger')).then(function () { toast('Pengingat & cadangan otomatis terpasang.'); return pemuat(); }).catch(fail); };
ACT['pem-contoh'] = function (el) {
  confirmDlg('Semua akun, kelas, murid, absensi dan kasus contoh akan dihapus permanen. Data yang Anda buat sendiri tidak terpengaruh. Lanjutkan?', 'Hapus data contoh', true, 'Hapus').then(function (ok) {
    if (!ok) return;
    run(el, api('admin.hapusContoh')).then(function (r) { toast(r.dibuang + ' baris data contoh dihapus.'); return pemuat(); }).catch(fail);
  });
};
ACT['cfg-save'] = function (el) {
  const f = $('#f-cfg'), d = formData(f);
  const ok = validate(f, d, {
    nama_sekolah: { label: 'Nama sekolah', req: true }, tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' },
    batas_koreksi_absensi: { label: 'Batas koreksi', req: true, fn: function (v) { const n = +v; return n >= 1 && n <= 168 ? '' : 'Isi 1–168.'; } },
    ambang_pola_bolos: { label: 'Ambang', req: true, fn: function (v) { const n = +v; return n >= 2 && n <= 10 ? '' : 'Isi 2–10.'; } },
    jam_maks: { label: 'Jam pelajaran per hari', req: true, fn: function (v) { const n = +v; return n >= 4 && n <= 16 ? '' : 'Isi 4–16.'; } },
    ambang_kejadian_berulang: { label: 'Ambang berulang', req: true, fn: function (v) { const n = +v; return n >= 2 && n <= 10 ? '' : 'Isi 2–10.'; } },
    logo_url: { label: 'URL logo', re: /^https:\/\/\S+$/i, msg: 'Harus diawali https://' },
    url_frontend: { label: 'Alamat frontend', re: /^https:\/\/\S+$/i, msg: 'Harus diawali https://' }
  });
  if (!ok) return;
  run(el, api('admin.config.simpan', { config: d })).then(function () {
    toast('Pengaturan tersimpan.');
    return api('boot').then(function (b) { S.cfg = b.config; S.refs = b.refs; renderShell(); setNavActive('admin'); });
  }).catch(fail);
};
ACT['cfg-backup'] = function (el) { run(el, api('admin.backup')).then(function (r) { toast('Cadangan dibuat: ' + r.nama); }).catch(fail); };

function adLog() {
  $('#ad-body').innerHTML = skeleton(3);
  api('admin.log').then(function (rows) {
    if (!$('#ad-body')) return;
    $('#ad-body').innerHTML = '<div class="card"><div class="card-head"><div><h3>Log aktivitas</h3><div class="xs muted">100 catatan terakhir (akses data sensitif, perubahan, penolakan)</div></div><button class="btn sm" data-act="log-reload"><i class="bi bi-arrow-clockwise"></i></button></div>' + (rows.length ? '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Modul</th><th>ID data</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td class="xs" style="white-space:nowrap">' + esc(String(r.ts).replace('T', ' ')) + '</td><td class="xs">' + esc(r.email) + '</td><td><span class="chip neutral">' + esc(r.aksi) + '</span></td><td class="xs">' + esc(r.modul) + '</td><td class="mono muted">' + esc(String(r.id).substr(0, 18)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('bi-clock-history', 'Belum ada catatan')) + '</div>';
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
ACT['log-reload'] = adLog;
