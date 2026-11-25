/* SIKOLAB BK v1.15 — js/pages/12_lapor.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Lapor Kejadian (F3)
// ════════════════════════════════════════════════════════════
// Kejadian yang sering terjadi: mengisi kategori, contoh kronologi, dan cara penanganan yang lazim (tetap dapat diubah).
const KEJADIAN_CEPAT = [
  { t: 'Terlambat masuk kelas', k: 'Kehadiran', m: 'info', kr: 'Terlambat masuk kelas pada jam pelajaran saya sekitar ... menit. Alasan yang disampaikan murid: ...' },
  { t: 'Tidak mengerjakan tugas', k: 'Akademik', m: 'info', kr: 'Tidak mengerjakan/mengumpulkan tugas ... yang diberikan pada tanggal .... Saat ditanya, murid menyampaikan: ...' },
  { t: 'Tidak membawa perlengkapan', k: 'Akademik', m: 'info', kr: 'Tidak membawa buku/perlengkapan belajar yang diperlukan pada pelajaran ....' },
  { t: 'Mengganggu pembelajaran', k: 'Perilaku', m: 'info', kr: 'Selama pembelajaran berbicara/bercanda berulang kali sehingga teman terganggu. Sudah diingatkan ... kali.' },
  { t: 'Bermain HP saat pelajaran', k: 'Perilaku', m: 'info', kr: 'Menggunakan telepon genggam untuk ... saat pembelajaran berlangsung tanpa izin.' },
  { t: 'Meninggalkan kelas tanpa izin', k: 'Kehadiran', m: 'rujuk_bina', kr: 'Meninggalkan kelas pada jam pelajaran ke-... tanpa izin dan kembali setelah ... menit / tidak kembali.' },
  { t: 'Tampak murung / menarik diri', k: 'Sosial-Emosional', m: 'rujuk', kr: 'Dalam beberapa hari terakhir terlihat murung, tidak mau berinteraksi dengan teman, dan ....' },
  { t: 'Konflik dengan teman', k: 'Perilaku', m: 'rujuk', kr: 'Terjadi pertengkaran dengan ... di ... sekitar pukul .... Yang terlihat: ....' },
  { t: 'Dugaan perundungan', k: 'Sosial-Emosional', m: 'rujuk', u: 0, kr: 'Teramati/diterima informasi bahwa murid ... oleh/terhadap ... di .... Bentuknya: ....' }
];
const MODE_LAPOR = [
  { v: 'info', t: 'Sudah saya bina', s: 'Sebagai informasi untuk BK. Tidak perlu ditangani segera.', ic: 'bi-check2-circle', cls: 'low' },
  { v: 'rujuk_bina', t: 'Sudah dibina, perlu tindak lanjut BK', s: 'Pembinaan belum cukup; BK diminta menindaklanjuti.', ic: 'bi-arrow-right-circle', cls: 'mid' },
  { v: 'rujuk', t: 'Mohon ditangani Guru BK', s: 'Belum ditangani; perlu keahlian BK.', ic: 'bi-send', cls: '' }
];
PAGES.lapor = function (params, tok) {
  const isBK = hasRole('guru_bk');
  P.lap = { murid: null, murids: [], pkKelas: '', kategori: S.refs.kejadian[0] || '', urgensi: ((isBK ? S.refs.urgensi[1] : S.refs.urgensi[S.refs.urgensi.length - 1]) || S.refs.urgensi[0] || {}).nama || '', file: null, mode: isBK ? 'rujuk' : 'info' };
  // v1.12: cara penanganan terakhir diingat; draf yang belum terkirim dipulihkan
  const modeOk = function (v) { return MODE_LAPOR.some(function (x) { return x.v === v; }); };
  if (!isBK && modeOk(lstore('sk_lapmode') || '')) P.lap.mode = lstore('sk_lapmode');
  const drf = !params.id_murid ? lapDrafAmbil() : null;
  if (drf) {
    P.lap.draf = drf;
    if (drf.kat && S.refs.kejadian.indexOf(drf.kat) >= 0) P.lap.kategori = drf.kat;
    if (drf.urg) P.lap.urgensi = drf.urg;
    if (!isBK && modeOk(drf.mode || '')) P.lap.mode = drf.mode;
    if (drf.murids && drf.murids.length) { P.lap.murids = drf.murids; P.lap.pkKelas = drf.murids[0].id_kelas || ''; }
  }
  const render = function () {
    if (stale(tok)) return;
    const l = P.lap;
    let h = pageHead('Kolaborasi BK', 'Lapor Kejadian Murid', 'Catat kejadian secara objektif. Pilih apakah Anda sudah membina sendiri (cukup sebagai informasi untuk BK) atau perlu ditangani Guru BK.', '');
    h += '<div class="card pad" style="max-width:860px"><form id="f-lap" class="col gap-16" novalidate>' +
      '<div class="field" data-f="id_murid"><span class="flabel">Murid terkait <span class="req">*</span></span><div id="lap-murid">' + muridPickerHtml() + '</div><div class="err" role="alert"></div></div>' +
      '<div class="field"><span class="flabel">Kejadian yang sering terjadi <span class="xs muted">(opsional, mengisi otomatis)</span></span><div class="fchips wrapc">' + KEJADIAN_CEPAT.map(function (x, i) { return '<button type="button" class="fchip" data-act="lap-cepat" data-i="' + i + '">' + esc(x.t) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="flabel">Kategori kejadian</span><div class="fchips wrapc" id="lap-kats">' + S.refs.kejadian.map(function (k) { return '<button type="button" class="fchip ' + (k === l.kategori ? 'active' : '') + '" data-act="lap-kat" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="flabel">Tingkat urgensi</span><div class="opt-tiles" id="lap-urgs">' + S.refs.urgensi.map(function (u, i) { return '<button type="button" class="opt-tile ' + (u.nama === l.urgensi ? 'on ' + (i === 1 ? 'mid' : i >= 2 ? 'low' : '') : '') + '" data-act="lap-urg" data-v="' + esc(u.nama) + '" data-i="' + i + '">' + esc(u.nama) + '<small>' + esc(u.ket) + '</small></button>'; }).join('') + '</div></div>' +
      (S.cfg.poinAktif && S.refs.poinAturan && S.refs.poinAturan.some(function (a) { return a.j === 'L'; }) ? '<div class="field"><label for="lap-poin">Pelanggaran tata tertib (poin) <span class="xs muted">— opsional</span></label><select class="select" id="lap-poin" name="id_aturan"><option value="">— Bukan pelanggaran tata tertib / tanpa poin —</option>' + pnAturanOpts(S.refs.poinAturan.map(function (a) { return Object.assign({ a: 1 }, a); }), 'L') + '</select><div class="hint">' + (isBK ? 'Poin dari Guru BK langsung sah.' : 'Poin dicatat untuk setiap murid yang dipilih dan menunggu verifikasi Guru BK.') + '</div></div>' : '') +
      '<div class="form-grid c2">' + fld({ name: 'tanggal', label: 'Tanggal kejadian', type: 'date', req: true, value: S.today, maxv: S.today }) + fld({ name: 'jam_ke', label: 'Jam ke- (opsional)', ph: 'mis. 5 atau 5-6', max: 6 }) + '</div>' +
      fld({ name: 'lokasi', label: 'Lokasi / tempat (opsional)', max: 120, ph: 'mis. Ruang kelas, kantin' }) +
      '<div class="field" data-f="kronologi"><label for="f_kronologi">Kronologi faktual & objektif <span class="req">*</span></label><textarea class="textarea" id="f_kronologi" name="kronologi" rows="5" maxlength="5000" placeholder="Tuliskan apa yang terlihat/terdengar: waktu, tindakan yang teramati, respons murid. Hindari pelabelan sifat."></textarea><div class="row between"><span class="hint">Minimal 20 karakter. Hindari label seperti "anak nakal".</span><span class="hint" id="kr-count">0 / 5000</span></div><div class="err" role="alert"></div></div>' +
      (isBK ? '' : '<div class="field"><span class="flabel">Bagaimana penanganannya? <span class="req">*</span></span><div class="mode-tiles" id="lap-modes">' + MODE_LAPOR.map(function (x) { return '<button type="button" class="mode-tile ' + (x.v === l.mode ? 'on' : '') + ' ' + x.cls + '" data-act="lap-mode" data-v="' + x.v + '"><i class="bi ' + x.ic + '"></i><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></button>'; }).join('') + '</div></div>' +
        '<div id="lap-bina" class="sub-panel">' + fld({ name: 'tindakan', label: 'Pembinaan yang sudah Anda lakukan', type: 'textarea', rows: 3, max: 1500, req: true, ph: 'mis. Menegur secara pribadi setelah pelajaran, mengajak murid merefleksikan dampaknya, membuat kesepakatan datang tepat waktu.' }) + fld({ name: 'hasil', label: 'Respons / hasil (opsional)', type: 'textarea', rows: 2, max: 1500, ph: 'mis. Murid mengakui dan berjanji tidak mengulangi.' }) + '</div>' +
        '<div id="lap-rj" class="sub-panel hide">' + fld({ name: 'alasan', label: 'Mengapa perlu Guru BK? (opsional)', type: 'textarea', rows: 2, max: 1500, ph: 'mis. Sudah ketiga kalinya dalam bulan ini; murid tampak ada masalah di rumah.' }) + '</div>') +
      '<div class="field"><span class="flabel">Lampiran (opsional)</span><label class="drop" id="drop-lap" for="file-lap"><i class="bi bi-paperclip"></i> <span id="drop-nm">Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)</span></label><input type="file" id="file-lap" class="sr" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"></div>' +
      '<div id="lap-info" class="note info"></div>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="nav" data-page="beranda">Batal</button><button type="submit" class="btn primary" id="lap-kirim"><i class="bi bi-send"></i> Kirim laporan</button></div></form></div>';
    $('#app-container').innerHTML = h;
    const f = $('#f-lap');
    $('#f_kronologi').addEventListener('input', function (e) { $('#kr-count').textContent = e.target.value.length + ' / 5000'; });
    $('#file-lap').addEventListener('change', function (e) {
      const fl = e.target.files[0];
      readFileB64(fl, 5 * 1024 * 1024).then(function (b) { P.lap.file = b; $('#drop-nm').textContent = b ? b.nama : 'Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)'; $('#drop-lap').classList.toggle('has', !!b); })
        .catch(function (er) { e.target.value = ''; P.lap.file = null; $('#drop-lap').classList.remove('has'); fail(er); });
    });
    lapModeUI();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      const d = formData(f);
      d.id_murid = P.lap.murids.length ? P.lap.murids[0].id : '';
      if (P.lap.murids.length > 1) d.id_murid_list = P.lap.murids.map(function (m) { return m.id; });
      const rules = { id_murid: { label: 'Murid', req: true }, kronologi: { label: 'Kronologi', req: true, min: 20 }, tanggal: { label: 'Tanggal', req: true } };
      if (!isBK && P.lap.mode !== 'rujuk') rules.tindakan = { label: 'Pembinaan yang sudah dilakukan', req: true, min: 5 };
      if (!validate(f, d, rules)) return;
      if (!isBK && P.lap.mode === 'info' && urgIdx(P.lap.urgensi) === 0) { toast('Laporan mendesak harus ditangani Guru BK. Pilih cara penanganan lain.', 'err'); return; }
      d.kategori = P.lap.kategori; d.urgensi = P.lap.urgensi; d.berkas = P.lap.file; d.mode = P.lap.mode;
      run($('#lap-kirim'), api('kejadian.buat', d)).then(function (r) { lapDrafHapus(); if (!isBK) lstore('sk_lapmode', P.lap.mode); lapSukses(r); }).catch(fail);
    });
    wirePicker();
    lapSetelahRender(params);
  };
  if (params.id_murid) {
    apiC('murid.cari', { q: params.nama || '' }).then(function (rows) { const m = rows.filter(function (x) { return x.id === params.id_murid; })[0]; if (m) { P.lap.murids = [m]; P.lap.pkKelas = m.id_kelas; } render(); }).catch(function () { render(); });
  } else render();
};
function lapModeUI() {
  const md = P.lap.mode, bina = $('#lap-bina'), rj = $('#lap-rj'), info = $('#lap-info');
  if (bina) bina.classList.toggle('hide', md === 'rujuk');
  if (rj) rj.classList.toggle('hide', md === 'info');
  $$('#lap-modes .mode-tile').forEach(function (b) { b.classList.toggle('on', b.dataset.v === md); });
  if (info) info.innerHTML = '<i class="bi bi-info-circle"></i><div>' + (hasRole('guru_bk') ? 'Laporan dari Guru BK langsung berstatus <b>Diproses</b> dengan Anda sebagai penanggung jawab.' :
    md === 'info' ? 'Laporan tercatat sebagai <b>pembinaan guru</b>. Guru BK menerima pemberitahuan untuk <b>mengetahui dan memantau</b>, tanpa harus menangani segera. Bila kejadian berulang, sistem menandainya.' :
    md === 'rujuk_bina' ? 'Pembinaan Anda tercatat, lalu <b>rujukan otomatis</b> dikirim ke Guru BK untuk ditindaklanjuti.' :
    'Laporan dikirim sebagai <b>rujukan</b> kepada Guru BK untuk ditangani.' + (urgIdx(P.lap.urgensi) === 0 ? ' Karena mendesak, Guru BK langsung diberi tahu.' : '')) + '</div>';
}
ACT['lap-mode'] = function (el) { P.lap.mode = el.dataset.v; lapModeUI(); };
ACT['lap-cepat'] = function (el) {
  const x = KEJADIAN_CEPAT[+el.dataset.i]; if (!x) return;
  $$('[data-act=lap-cepat]').forEach(function (b) { b.classList.toggle('active', b === el); });
  const kat = S.refs.kejadian.indexOf(x.k) >= 0 ? x.k : P.lap.kategori;
  P.lap.kategori = kat;
  $$('[data-act=lap-kat]').forEach(function (b) { b.classList.toggle('active', b.dataset.v === kat); });
  const ui = x.u === 0 ? 0 : (x.m === 'info' ? 2 : 1);
  const urg = S.refs.urgensi[Math.min(ui, S.refs.urgensi.length - 1)];
  if (urg) { const t = $$('[data-act=lap-urg]').filter(function (b) { return b.dataset.v === urg.nama; })[0]; if (t) ACT['lap-urg'](t); }
  if (!hasRole('guru_bk')) P.lap.mode = x.m;
  const k = $('#f_kronologi');
  if (k && (!k.value.trim() || k.dataset.auto === '1')) { k.value = x.kr; k.dataset.auto = '1'; k.dispatchEvent(new Event('input')); }
  lapModeUI();
};
// ── Pemilih murid: pilih kelas → ketuk nama (boleh lebih dari satu murid), atau ketik nama/NIS ──
function lapKelasList() {
  const ids = S.kelasAkses || null;
  return S.refs.kelas.filter(function (k) { return !ids || ids.indexOf(k.id) >= 0; });
}
function muridPickerHtml() {
  const l = P.lap, kl = lapKelasList();
  if (!l.pkKelas) l.pkKelas = (S.kelasWali && S.kelasWali[0] && kl.some(function (k) { return k.id === S.kelasWali[0]; })) ? S.kelasWali[0] : (kl.length === 1 ? kl[0].id : '');
  const terpilih = l.murids.length ? '<div class="pk-sel">' + l.murids.map(function (m, i) { return '<span class="pk-chip"><b>' + esc(m.nama) + '</b> · ' + esc(m.kelas) + ' ' + arahanIkon(m.id) + '<button type="button" data-act="lap-lepas" data-i="' + i + '" aria-label="Hapus ' + esc(m.nama) + '"><i class="bi bi-x-lg"></i></button></span>'; }).join('') +
    (l.murids.length > 1 ? '<span class="xs muted">' + l.murids.length + ' murid · masing-masing mendapat catatan kasus sendiri</span>' : '') + '</div>' : '';
  return terpilih +
    '<div class="pk-kelas fchips" role="group" aria-label="Pilih kelas">' + kl.map(function (k) { return '<button type="button" class="fchip ' + (k.id === l.pkKelas ? 'active' : '') + '" data-act="lap-kelas" data-id="' + esc(k.id) + '">' + esc(k.nama) + '</button>'; }).join('') + '</div>' +
    '<div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="lap-q" class="input" style="padding-left:36px" type="search" placeholder="' + (l.pkKelas ? 'Saring nama di kelas ini, atau ketik nama/NIS dari kelas lain…' : 'Pilih kelas di atas, atau ketik nama/NIS murid…') + '" autocomplete="off"></div>' +
    '<div id="lap-daftar" class="pk-daftar mt-8">' + (l.pkKelas ? '<div class="xs muted">Memuat daftar murid…</div>' : '') + '</div>';
}
function lapDaftarGambar(rows, q) {
  const box = $('#lap-daftar'); if (!box) return;
  P.lap.hits = rows;
  const ada = {}; P.lap.murids.forEach(function (m) { ada[m.id] = true; });
  box.innerHTML = rows.length ? rows.map(function (m, i) {
    return '<button type="button" class="pk-m' + (ada[m.id] ? ' on' : '') + '" data-act="lap-pick" data-i="' + i + '" aria-pressed="' + !!ada[m.id] + '"><i class="bi ' + (ada[m.id] ? 'bi-check-circle' : 'bi-circle') + '"></i><span><b>' + esc(m.nama) + '</b><small>' + (q ? esc(m.kelas) + ' · ' : '') + 'NIS ' + esc(m.nis) + '</small></span></button>';
  }).join('') : '<div class="xs muted">Tidak ada murid yang cocok.</div>';
}
function lapMuatDaftar() {
  const q = ($('#lap-q') || {}).value ? $('#lap-q').value.trim() : '';
  const kls = P.lap.pkKelas;
  if (!kls && q.length < 2) { const b = $('#lap-daftar'); if (b) b.innerHTML = ''; return; }
  const lokal = kls && q.length < 2;
  apiC('murid.cari', lokal ? { q: '', id_kelas: kls } : { q: q }).then(function (rows) {
    if (lokal || !kls) return lapDaftarGambar(rows, !lokal);
    // Ketik saat kelas terpilih: utamakan murid kelas itu, tetap tampilkan dari kelas lain.
    rows = rows.slice().sort(function (a, b) { return (a.id_kelas === kls ? 0 : 1) - (b.id_kelas === kls ? 0 : 1); });
    lapDaftarGambar(rows, true);
  }).catch(fail);
}
function wirePicker() {
  const q = $('#lap-q'); if (!q) return;
  q.addEventListener('input', debounce(lapMuatDaftar, 220));
  lapMuatDaftar();
}
function lapPickerUlang() { $('#lap-murid').innerHTML = muridPickerHtml(); wirePicker(); }
ACT['lap-kelas'] = function (el) { P.lap.pkKelas = el.dataset.id; lapPickerUlang(); };
ACT['lap-pick'] = function (el) {
  const m = P.lap.hits[+el.dataset.i]; if (!m) return;
  const i = P.lap.murids.map(function (x) { return x.id; }).indexOf(m.id);
  if (i >= 0) P.lap.murids.splice(i, 1);
  else { if (P.lap.murids.length >= 10) { toast('Paling banyak 10 murid dalam satu laporan.', 'warn'); return; } P.lap.murids.push(m); }
  setErr($('#f-lap'), 'id_murid', '');
  const q = $('#lap-q'), qv = q ? q.value : '';
  $('#lap-murid').innerHTML = muridPickerHtml(); wirePicker();
  if (qv && $('#lap-q')) { $('#lap-q').value = qv; lapMuatDaftar(); }
};
ACT['lap-lepas'] = function (el) { P.lap.murids.splice(+el.dataset.i, 1); lapPickerUlang(); };
ACT['lap-ganti'] = function () { P.lap.murids = []; lapPickerUlang(); };
ACT['lap-kat'] = function (el) { P.lap.kategori = el.dataset.v; $$('[data-act=lap-kat]').forEach(function (b) { b.classList.toggle('active', b === el); }); };
ACT['lap-urg'] = function (el) {
  P.lap.urgensi = el.dataset.v;
  $$('[data-act=lap-urg]').forEach(function (b) { b.className = 'opt-tile' + (b === el ? ' on ' + (b.dataset.i === '1' ? 'mid' : +b.dataset.i >= 2 ? 'low' : '') : ''); });
  if (+el.dataset.i === 0 && P.lap.mode === 'info') P.lap.mode = 'rujuk_bina';
  lapModeUI();
};
function lapSukses(r) {
  const pesan = r.mode === 'info' ? 'Laporan dan pembinaan Anda tercatat. Guru BK diberi tahu sebagai informasi dan akan meninjau. Anda akan menerima pemberitahuan setelah ditinjau.'
    : r.mode === 'rujuk_bina' ? 'Pembinaan Anda tercatat dan rujukan sudah dikirim ke Guru BK untuk ditindaklanjuti.'
    : hasRole('guru_bk') ? 'Laporan tercatat dengan status Diproses.' : 'Laporan sudah dikirim ke Guru BK sebagai rujukan.';
  $('#app-container').innerHTML = pageHead('Kolaborasi BK', 'Laporan terkirim', '', '') +
    '<div class="card pad" style="max-width:640px;text-align:center"><div style="font-size:48px;color:var(--teal)"><i class="bi bi-check-circle-fill"></i></div><h2 class="mt-8">' + esc(r.banyak ? r.banyak.length + ' laporan tercatat' : r.kode) + '</h2>' +
    (r.banyak ? '<div class="xs muted mt-8">' + r.banyak.map(function (x) { return esc(x.kode) + ' · ' + esc(x.nama); }).join('<br>') + '</div>' : '') + '<p class="muted mt-8">' + esc(pesan) + '</p>' +
    (r.poin ? '<div class="note info mt-12" style="text-align:left"><i class="bi bi-award"></i><div><b>Poin tata tertib:</b> ' + esc(r.poin.aturan) + ' (+' + r.poin.poin + ')' + (r.poin.n > 1 ? ' untuk ' + r.poin.n + ' murid' : '') + ' · ' + (r.poin.status === 'Sah' ? 'langsung sah.' : 'menunggu verifikasi Guru BK.') + (r.poin.dup ? ' <b>Perhatian:</b> sudah ada catatan serupa pada tanggal yang sama; Guru BK akan memeriksanya.' : '') + '</div></div>' : '') +
    (r.berulang ? '<div class="note rose mt-12" style="text-align:left"><i class="bi bi-arrow-repeat"></i><div><b>Kejadian berulang.</b> Murid ini sudah ' + r.ulang + ' kali dilaporkan dalam 30 hari terakhir.' + (r.mode === 'info' ? ' Pertimbangkan merujuk ke Guru BK.' : '') + '</div></div>' : '') +
    '<div class="row wrap mt-16" style="justify-content:center">' + (r.mode === 'info' && r.berulang ? '<button class="btn primary" data-act="lap-rujuk" data-id="' + esc(r.id) + '" data-k="' + esc(r.kode) + '"><i class="bi bi-send"></i> Rujuk ke Guru BK</button>' : '') + '<button class="btn" data-act="kasus-open-nav" data-id="' + esc(r.id) + '">Lihat laporan</button><button class="btn ghost" data-act="nav" data-page="lapor">Lapor lagi</button></div></div>';
  window.scrollTo(0, 0);
}
ACT['lap-rujuk'] = function (el) { openRujukanModal(el.dataset.id, el.dataset.k, P.lap && P.lap.urgensi, function () { navigateTo('kasus', { open: el.dataset.id }); }); };
ACT['kasus-open-nav'] = function (el) { navigateTo('kasus', { open: el.dataset.id }); };
