/* SIKOLAB BK v1.15 — js/pages/11_absensi.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Absensi (F2) — tab Mapel (per jam pelajaran) & Harian (sekali sehari per kelas)
// Jam pelajaran fleksibel: jam mulai + jumlah JP (mis. 3 JP = jam ke-3 s.d. 5)
// ════════════════════════════════════════════════════════════
const ST_NAMA = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa', T: 'Terlambat' };
const ST_COL = { H: '#10B981', S: '#3B82F6', I: '#4F46E5', A: '#EF4444', T: '#F59E0B' };
function jamMaks() { return S.jamMaks || 10; }
function jamStr(mulai, jp) { mulai = +mulai; jp = +jp; return jp <= 1 ? String(mulai) : mulai + '-' + (mulai + jp - 1); }
function jamParse(s) { const p = String(s || '1').split('-'); const a = parseInt(p[0], 10) || 1, b = p[1] ? (parseInt(p[1], 10) || a) : a; return { mulai: a, jp: b - a + 1 }; }
function jamLabel(s) { const j = jamParse(s); return j.jp <= 1 ? 'Jam ke-' + j.mulai + ' (1 JP)' : 'Jam ke-' + j.mulai + ' s.d. ' + (j.mulai + j.jp - 1) + ' (' + j.jp + ' JP)'; }
function opsiJamMulai() { const o = []; for (let i = 1; i <= jamMaks(); i++) o.push({ v: i, l: 'Jam ke-' + i }); return o; }
function opsiJp(mulai) { const o = [], mx = Math.min(8, jamMaks() - (+mulai || 1) + 1); for (let i = 1; i <= Math.max(1, mx); i++) o.push({ v: i, l: i + ' JP' }); return o; }
function canHarian() { return hasAny(['wali_kelas', 'guru_bk', 'waka', 'admin']); }

PAGES.absensi = function (params, tok) {
  const mapelOk = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka', 'admin']);
  const harOk = canHarian();
  let tab = (params.tab === 'harian' || params.tab === 'daftar' || params.tab === 'rekap' || params.tab === 'periode') && harOk ? params.tab : (params.tab === 'mapel' || (params.tab === 'rmapel' && mapelOk)) ? params.tab : (hasRole('guru_mapel') || !harOk ? 'mapel' : 'harian');
  if (params.id_kelas && params.id_mapel) tab = 'mapel';
  P.absTab = tab;
  const judul = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka']) ? 'Absensi Murid' : 'Rekap Absensi';
  let h = pageHead('Presensi', judul, 'Absensi harian dicatat sekali sehari per kelas oleh wali kelas. Absensi mata pelajaran dicatat guru setiap sesi mengajar.', '');
  h += '<div class="tabs mb-16" id="abs-tabs">' + (mapelOk ? '<button class="tab ' + (tab === 'mapel' ? 'active' : '') + '" data-act="abs-tab" data-t="mapel"><i class="bi bi-journal-text"></i> Per mata pelajaran</button>' : '') + (harOk ? '<button class="tab ' + (tab === 'harian' ? 'active' : '') + '" data-act="abs-tab" data-t="harian"><i class="bi bi-calendar-check"></i> Harian</button><button class="tab ' + (tab === 'rekap' ? 'active' : '') + '" data-act="abs-tab" data-t="rekap"><i class="bi bi-table"></i> Rekap bulanan</button><button class="tab ' + (tab === 'periode' ? 'active' : '') + '" data-act="abs-tab" data-t="periode"><i class="bi bi-calendar-range"></i> Rekap periode</button><button class="tab ' + (tab === 'daftar' ? 'active' : '') + '" data-act="abs-tab" data-t="daftar"><i class="bi bi-printer"></i> Daftar hadir</button>' : '') + (mapelOk ? '<button class="tab ' + (tab === 'rmapel' ? 'active' : '') + '" data-act="abs-tab" data-t="rmapel"><i class="bi bi-printer"></i> Rekap mapel bulanan</button>' : '') + '</div><div id="abs-body"></div>';
  $('#app-container').innerHTML = h;
  const akt = $('#abs-tabs .tab.active'); if (akt && akt.scrollIntoView) { try { akt.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* abaikan */ } }
  return absTabLoad(tab, params, tok);
};
ACT['abs-tab'] = function (el) {
  P.absTab = el.dataset.t;
  $$('#abs-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  absTabLoad(P.absTab, {}, S.navTok).catch(function (e) { isiHtml('#abs-body', errBox(e, true)); });
};
function absTabLoad(tab, params, tok) {
  $('#abs-body').innerHTML = skeleton(3);
  if (tab === 'harian') return harPage(params, tok);
  if (tab === 'rekap') return rkPage(params, tok);
  if (tab === 'daftar') return dhPage(params, tok);
  if (tab === 'periode') return rpPage(params, tok);
  if (tab === 'rmapel') return rmPage(params, tok);
  return mapelPage(params, tok);
}

// ── Tab: per mata pelajaran ──
function mapelPage(params, tok) {
  return apiC('absensi.meta').then(function (meta) {
    if (stale(tok)) return;
    if (meta.jamMaks) S.jamMaks = meta.jamMaks;
    P.abs = { meta: meta, rows: null, roster: null, sel: '', tanggal: meta.hariIni, jam: '1-2' };
    const canInput = meta.bolehInput && meta.diampu.length;
    let h = '';
    if (meta.bolehInput && !meta.diampu.length) h += '<div class="note mb-16"><i class="bi bi-info-circle"></i><div>Anda belum memiliki penugasan mengajar. Minta admin menambahkan penugasan di menu Administrasi → Pengampu.</div></div>';
    if (canInput) {
      h += '<div class="card pad"><form class="form-grid c2" id="f-abs" novalidate>' +
        '<div style="grid-column:1/-1">' + fld({ name: 'sel', label: 'Kelas & mata pelajaran', type: 'select', req: true, blank: 'Pilih kelas…', opts: meta.diampu.map(function (x, i) { return { v: i, l: x.kelas + ' · ' + x.mapel + ' (' + x.jumlah + ' murid)' }; }) }) + '</div>' +
        fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: meta.hariIni, maxv: meta.hariIni, min: addD(meta.hariIni, -14) }) +
        '<div class="field"><label>Jam pelajaran <span class="req">*</span></label><div class="jam-pick"><select class="select" name="jam_mulai" id="f_jam_mulai" aria-label="Jam mulai">' + opsiJamMulai().map(function (o) { return '<option value="' + o.v + '"' + (o.v === 1 ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') + '</select><select class="select" name="jam_jp" id="f_jam_jp" aria-label="Jumlah jam pelajaran"></select></div><div class="hint" id="jam-info"></div></div>' +
        '<div class="field" style="grid-column:1/-1"><button type="submit" class="btn dark"><i class="bi bi-people"></i> Muat daftar murid</button></div></form></div>';
      h += '<div id="roster-box" class="mt-16"></div>';
    } else if (!meta.bolehInput) {
      h += '<div class="note info"><i class="bi bi-info-circle"></i><div>Absensi per mata pelajaran diisi oleh guru pengampu. Anda dapat memantau riwayatnya di bawah.</div></div>';
    }
    h += '<div class="card mt-16"><div class="card-head"><div><h3>Riwayat absensi mapel</h3><div class="xs muted">Per sesi · 30 hari terakhir</div></div></div><div class="card-body"><form class="form-grid c2" id="f-hist">' +
      fld({ name: 'id_kelas', label: 'Kelas', type: 'select', blank: 'Semua kelas', opts: meta.kelas.map(function (k) { return { v: k.id, l: k.nama }; }) }) +
      '<div class="field"><label>&nbsp;</label><button type="submit" class="btn"><i class="bi bi-funnel"></i> Terapkan</button></div></form></div><div id="hist-box"></div></div>';
    $('#abs-body').innerHTML = h;
    const f = $('#f-abs');
    if (f) {
      $('#f_jam_mulai').addEventListener('change', function () { jamSyncJp(); absPrafetch(); });
      $('#f_jam_jp').addEventListener('change', function () { jamInfo(); absPrafetch(); });
      $('[name=sel]', f).addEventListener('change', function () { jamIngat(); absPrafetch(); });
      $('[name=tanggal]', f).addEventListener('change', absPrafetch);
      jamSyncJp(2);
      f.addEventListener('submit', function (e) { e.preventDefault(); absLoad($('button[type=submit]', f)); });
      if (params.id_kelas) {
        const i = meta.diampu.findIndex(function (x) { return x.id_kelas === params.id_kelas && x.id_mapel === params.id_mapel; });
        if (i >= 0) { $('[name=sel]', f).value = i; jamIngat(); if (params.jam) setJamForm(params.jam); absLoad(); }
      }
    }
    $('#f-hist').addEventListener('submit', function (e) { e.preventDefault(); P.absHistTampil = true; histLoad(); });
    // v1.14: guru pengampu membuka halaman ini untuk mencatat; riwayat dimuat saat diminta agar formulir langsung siap.
    if (canInput && !P.absHistTampil) $('#hist-box').innerHTML = '<div class="card-body"><button class="btn sm" data-act="hist-tampil"><i class="bi bi-clock-history"></i> Tampilkan riwayat 30 hari</button></div>';
    else histLoad();
  });
}
ACT['hist-tampil'] = function () { P.absHistTampil = true; histLoad(); };
/** Isi pilihan jumlah JP sesuai jam mulai (tidak boleh melewati jam terakhir). */
function jamSyncJp(pilih) {
  const m = +$('#f_jam_mulai').value, sel = $('#f_jam_jp');
  const cur = pilih || +sel.value || 1;
  const o = opsiJp(m);
  sel.innerHTML = o.map(function (x) { return '<option value="' + x.v + '"' + (x.v === Math.min(cur, o.length) ? ' selected' : '') + '>' + x.l + '</option>'; }).join('');
  jamInfo();
}
function jamInfo() {
  const s = jamStr($('#f_jam_mulai').value, $('#f_jam_jp').value);
  $('#jam-info').textContent = jamLabel(s);
  return s;
}
/** Ingat jam terakhir per kelas+mapel di peramban ini (kemudahan saja). */
function jamIngat() {
  const f = $('#f-abs'), x = P.abs.meta.diampu[+$('[name=sel]', f).value];
  if (!x) return;
  const s = lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel);
  if (s) { const j = jamParse(s); $('#f_jam_mulai').value = j.mulai; jamSyncJp(j.jp); }
}
function setJamForm(s) { const j = jamParse(s); $('#f_jam_mulai').value = j.mulai; jamSyncJp(j.jp); }
/** Payload daftar murid dari isian formulir (null bila belum lengkap). */
function absPayload() {
  const f = $('#f-abs'); if (!f || !P.abs) return null;
  const d = formData(f), x = P.abs.meta.diampu[+d.sel];
  if (!x || d.sel === '' || !d.tanggal) return null;
  return { id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: d.tanggal, jam_ke: jamInfo() };
}
function absPrafetch() {
  const pl = absPayload();
  if (!pl || obAda('abs|' + pl.id_kelas + '|' + pl.id_mapel + '|' + pl.tanggal + '|' + pl.jam_ke)) return;
  rosterPrafetch('absensi.roster', pl);
}
function absLoad(btn) {
  const f = $('#f-abs'), d = formData(f);
  if (!validate(f, d, { sel: { label: 'Kelas & mata pelajaran', req: true }, tanggal: { label: 'Tanggal', req: true } })) return;
  const x = P.abs.meta.diampu[+d.sel];
  const jam = jamInfo();
  P.abs.sel = x; P.abs.tanggal = d.tanggal; P.abs.jam = jam;
  lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel, jam);
  if (obAda('abs|' + x.id_kelas + '|' + x.id_mapel + '|' + d.tanggal + '|' + jam)) { obKirim(); toast('Sesi ini masih dikirim ke server. Tunggu beberapa detik lalu muat lagi.', 'warn'); return; }
  const p = rosterAmbil('absensi.roster', { id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: d.tanggal, jam_ke: jam });
  (btn ? run(btn, p) : p).then(function (r) {
    P.abs.roster = r;
    P.abs.rows = r.murid.map(function (m) { return { id: m.id, nama: m.nama, nis: m.nis, persen: m.persen, lebihAwal: m.lebihAwal, status: m.status, catatan: m.catatan, harian: m.harian }; });
    drawRoster();
  }).catch(fail);
}
function absCounts(rows) {
  const c = { H: 0, S: 0, I: 0, A: 0, T: 0 };
  (rows || P.abs.rows).forEach(function (r) { c[r.status]++; });
  return c;
}
function drawRoster() {
  const a = P.abs, r = a.roster, x = a.sel;
  if (!r.murid.length) { $('#roster-box').innerHTML = '<div class="card pad">' + empty('bi-people', 'Kelas ini belum memiliki murid aktif') + '</div>'; return; }
  const kor = r.ada, lock = kor && !r.bolehSimpan;
  let note = kor ? (r.bolehSimpan ? '<div class="note info"><i class="bi bi-pencil-square"></i><div>Absensi sesi ini sudah tersimpan. Anda masih dapat mengoreksinya, termasuk mengubah jam pelajaran, sampai <b>' + r.sisaJam + ' jam</b> lagi.</div></div>' : '<div class="note rose"><i class="bi bi-lock"></i><div>Absensi sesi ini sudah tersimpan dan tidak dapat Anda ubah (batas koreksi terlewati atau dicatat guru lain). Hubungi admin bila perlu koreksi.</div></div>') : '';
  if (r.bentrok) note += '<div class="note rose mt-8"><i class="bi bi-exclamation-triangle"></i><div><b>Jam bertabrakan.</b> Pada tanggal ini sudah ada sesi lain di kelas ini pada jam yang sama. Periksa kembali jam pelajaran Anda sebelum menyimpan.</div></div>';
  if (r.sesiLain && r.sesiLain.length) note += '<div class="note mt-8"><i class="bi bi-clock-history"></i><div>Sesi lain yang sudah tercatat hari itu: ' + r.sesiLain.map(function (s) { return '<span class="chip ' + (s.bentrok ? 'st-Eskalasi' : 'neutral') + '">Jam ' + esc(s.jam) + ' · ' + esc(s.mapel) + '</span>'; }).join(' ') + '</div></div>';
  if (!kor && r.adaHarian) note += '<div class="note info mt-8"><i class="bi bi-calendar-check"></i><div>Murid yang tercatat <b>Sakit, Izin, atau Alpa</b> pada absensi harian sudah ditandai otomatis. Periksa lalu sesuaikan bila berbeda.</div></div>';
  $('#roster-box').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>' + esc(x.kelas) + ' · ' + esc(x.mapel) + '</h3><div class="xs muted">' + esc(tglPanjang(r.tanggal)) + ' · ' + esc(jamLabel(r.jam_ke)) + '</div></div><div class="row wrap">' +
    (kor && r.bolehSimpan ? '<button class="btn sm" data-act="abs-ubahjam"><i class="bi bi-clock"></i> Ubah jam</button>' : '') +
    '<button class="btn sm" data-act="abs-allh"' + (lock ? ' disabled' : '') + '><i class="bi bi-check2-all"></i> Semua hadir</button></div></div>' +
    '<div class="card-body" style="padding-bottom:0">' + note + '<div class="sumbar mt-12" id="abs-sum"></div></div><div class="roster mt-12" id="roster-rows">' + a.rows.map(rosterRow).join('') + '</div></div>' +
    '<div class="sticky-save"><div class="xs muted-2" id="abs-sum2"></div><button class="btn primary" data-act="abs-save"' + (lock ? ' disabled' : '') + '><i class="bi bi-check-circle"></i> ' + (kor ? 'Simpan koreksi' : 'Simpan absensi') + '</button></div>';
  absSum();
  $('#roster-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function segHtml(m, lock, act) {
  return '<div class="seg ' + (lock ? 'ro' : '') + '" role="group" aria-label="Status ' + esc(m.nama) + '">' + ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<button type="button" data-act="' + act + '" data-id="' + esc(m.id) + '" data-s="' + s + '" class="' + (m.status === s ? 'on' : '') + '" aria-pressed="' + (m.status === s) + '" title="' + ST_NAMA[s] + '">' + s + '</button>'; }).join('') + '</div>';
}
function rosterRow(m) {
  const lock = P.abs.roster.ada && !P.abs.roster.bolehSimpan;
  const early = (m.lebihAwal || []).map(function (e) { return '<span class="chip neutral" title="Status pada jam lain hari ini">Jam ' + esc(e.jam) + ': ' + esc(e.status) + '</span>'; }).join(' ');
  const har = m.harian && m.harian !== 'H' ? '<span class="chip ' + (m.harian === 'A' ? 'st-Eskalasi' : 'blue') + '" title="Absensi harian">Harian: ' + esc(ST_NAMA[m.harian] || m.harian) + '</span>' : '';
  const flag = (m.lebihAwal || []).some(function (e) { return (e.status === 'H' || e.status === 'T') && jamParse(e.jam).mulai < jamParse(P.abs.roster.jam_ke).mulai; }) && m.status === 'A';
  return '<div class="r-row ' + (flag ? 'flag' : '') + '" data-rid="' + esc(m.id) + '"><div class="r-id"><div class="av">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6 trunc">' + esc(m.nama) + ' ' + arahanIkon(m.id) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' · Kehadiran ' + m.persen + '% ' + har + ' ' + early + '</div></div></div>' +
    '<div class="col" style="gap:6px;align-items:flex-end">' + segHtml(m, lock, 'abs-set') +
    (m.status !== 'H' ? '<input class="input" style="min-height:34px;font-size:13px" data-cat="' + esc(m.id) + '" maxlength="200" placeholder="Catatan (opsional)" value="' + esc(m.catatan) + '"' + (lock ? ' disabled' : '') + '>' : '') + '</div>' +
    (flag ? '<div class="xs" style="color:#DC2626"><i class="bi bi-exclamation-triangle"></i> Tercatat hadir di jam sebelumnya, periksa kembali.</div>' : '') + '</div>';
}
function absSum() {
  const c = absCounts();
  $('#abs-sum').innerHTML = ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + c[s] + '</b></span>'; }).join('');
  $('#abs-sum2').innerHTML = '<b>' + P.abs.rows.length + '</b> murid · Hadir <b>' + (c.H + c.T) + '</b> · Tidak hadir <b>' + (c.S + c.I + c.A) + '</b>';
}
ACT['abs-set'] = function (el) {
  const row = P.abs.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!row) return;
  row.status = el.dataset.s;
  const old = $('[data-rid="' + el.dataset.id + '"]');
  if (old) { const tmp = document.createElement('div'); tmp.innerHTML = rosterRow(row); old.replaceWith(tmp.firstChild); }
  absSum();
};
document.addEventListener('input', function (e) {
  const id = e.target && e.target.dataset ? e.target.dataset.cat : null;
  if (id && P.abs && P.abs.rows) { const r = P.abs.rows.filter(function (x) { return x.id === id; })[0]; if (r) r.catatan = e.target.value; }
  const hid = e.target && e.target.dataset ? e.target.dataset.hcat : null;
  if (hid && P.har && P.har.rows) { const r2 = P.har.rows.filter(function (x) { return x.id === hid; })[0]; if (r2) r2.catatan = e.target.value; }
});
ACT['abs-allh'] = function () {
  P.abs.rows.forEach(function (r) { r.status = 'H'; r.catatan = ''; });
  $('#roster-rows').innerHTML = P.abs.rows.map(rosterRow).join(''); absSum();
};
ACT['abs-save'] = function (el) {
  const a = P.abs, x = a.sel, r = a.roster;
  const c = absCounts();
  const go = function () {
    const payload = {
      id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: r.tanggal, jam_ke: r.jam_ke, koreksi: r.ada === true,
      entries: a.rows.map(function (m) { return { id_murid: m.id, status: m.status, catatan: m.catatan || '' }; })
    };
    const label = 'Absensi ' + x.kelas + ' · ' + x.mapel + ' · ' + jamLabel(r.jam_ke) + ' · ' + fTgl(r.tanggal);
    // Optimistis: langsung selesai di layar; pengiriman berjalan di latar belakang.
    obTambah('absensi.simpan', payload, label, 'abs|' + x.id_kelas + '|' + x.id_mapel + '|' + r.tanggal + '|' + r.jam_ke, function () { if (S.page === 'absensi' && $('#hist-box') && (P.absHistTampil || !(P.abs && P.abs.meta && P.abs.meta.bolehInput && P.abs.meta.diampu.length))) histLoad(); });
    toast((r.ada ? 'Koreksi disimpan' : 'Absensi disimpan') + ': ' + a.rows.length + ' murid · H ' + (c.H + c.T) + ' · S ' + c.S + ' · I ' + c.I + ' · A ' + c.A + '.');
    a.roster = null;
    $('#roster-box').innerHTML = '<div class="card pad">' + empty('bi-check2-circle', 'Absensi ' + x.kelas + ' · ' + x.mapel + ' tersimpan', 'Dikirim ke server di latar belakang; Anda bisa langsung mencatat kelas berikutnya.') + '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // v1.12: peringatan bila bertentangan dengan absensi harian (murid tercatat Sakit/Izin/Alpa di harian, tetapi ditandai hadir)
  const tabrak = a.rows.filter(function (m) { return m.harian && m.harian !== 'H' && m.harian !== 'T' && (m.status === 'H' || m.status === 'T'); });
  if (tabrak.length) {
    confirmDlg(tabrak.length + ' murid tercatat ' + tabrak.slice(0, 4).map(function (m) { return m.nama.split(' ')[0] + ' (' + (ST_NAMA[m.harian] || m.harian) + ')'; }).join(', ') + (tabrak.length > 4 ? ', …' : '') + ' pada absensi harian, tetapi Anda tandai hadir. Yakin data ini benar?', 'Ya, simpan', false, 'Berbeda dengan absensi harian').then(function (ok) { if (ok) go(); });
    return;
  }
  if (c.A >= Math.ceil(a.rows.length / 2) && a.rows.length >= 4) {
    confirmDlg('Lebih dari separuh murid ditandai Alpa (' + c.A + ' dari ' + a.rows.length + '). Mohon dipastikan sebelum menyimpan.', 'Ya, simpan', false, 'Periksa kembali').then(function (ok) { if (ok) go(); });
  } else go();
};
/** Perbaiki jam pelajaran sesi yang sudah tersimpan (mis. tercatat 2 JP padahal mengajar 3 JP). */
ACT['abs-ubahjam'] = function () {
  const a = P.abs, r = a.roster, x = a.sel, j = jamParse(r.jam_ke);
  const m = openModal({
    title: 'Ubah jam pelajaran', sub: x.kelas + ' · ' + x.mapel + ' · ' + tglPanjang(r.tanggal),
    body: '<p class="muted-2">Tercatat saat ini: <b>' + esc(jamLabel(r.jam_ke)) + '</b>. Status kehadiran murid tidak berubah.</p><div class="jam-pick mt-12"><select class="select" id="uj-m">' + opsiJamMulai().map(function (o) { return '<option value="' + o.v + '"' + (o.v === j.mulai ? ' selected' : '') + '>' + o.l + '</option>'; }).join('') + '</select><select class="select" id="uj-jp"></select></div><div class="hint mt-8" id="uj-info"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="uj-ok">Simpan jam</button>'
  });
  const sync = function (p) {
    const mm = +$('#uj-m', m.el).value, o = opsiJp(mm), cur = p || +$('#uj-jp', m.el).value || 1;
    $('#uj-jp', m.el).innerHTML = o.map(function (q) { return '<option value="' + q.v + '"' + (q.v === Math.min(cur, o.length) ? ' selected' : '') + '>' + q.l + '</option>'; }).join('');
    info();
  };
  const info = function () { $('#uj-info', m.el).textContent = 'Menjadi: ' + jamLabel(jamStr($('#uj-m', m.el).value, $('#uj-jp', m.el).value)); };
  $('#uj-m', m.el).addEventListener('change', function () { sync(); });
  $('#uj-jp', m.el).addEventListener('change', info);
  sync(j.jp);
  $('#uj-ok', m.el).addEventListener('click', function (e) {
    const baru = jamStr($('#uj-m', m.el).value, $('#uj-jp', m.el).value);
    run(e.currentTarget, api('absensi.ubahJam', { id_kelas: x.id_kelas, id_mapel: x.id_mapel, tanggal: r.tanggal, jam_lama: r.jam_ke, jam_baru: baru })).then(function (res) {
      m.close(); toast('Jam pelajaran diubah menjadi ' + jamLabel(res.jam_ke) + '.');
      lstore('sk_jam_' + x.id_kelas + '_' + x.id_mapel, res.jam_ke);
      setJamForm(res.jam_ke); absLoad(); histLoad();
    }).catch(fail);
  });
};
function histLoad() {
  const f = $('#f-hist'); if (!f) return;
  const d = formData(f);
  $('#hist-box').innerHTML = '<div class="card-body">' + skeleton(2) + '</div>';
  apiC('absensi.riwayat', { id_kelas: d.id_kelas }, true).then(function (rows) {
    P.abs.hist = rows;
    const ajar = hasRole('guru_mapel') && P.abs.meta.diampu.length;
    $('#hist-box').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Jam</th><th>Kelas</th><th>Mata pelajaran</th><th>H</th><th>S</th><th>I</th><th>A</th><th>T</th><th>Pencatat</th>' + (ajar ? '<th></th>' : '') + '</tr></thead><tbody>' + rows.slice(0, 80).map(function (r, i) {
      const j = jamParse(r.jam_ke);
      return '<tr><td>' + esc(fTgl(r.tanggal)) + '</td><td style="white-space:nowrap">' + esc(r.jam_ke) + ' <span class="xs muted">(' + j.jp + ' JP)</span></td><td>' + esc(r.kelas) + '</td><td>' + esc(r.mapel) + '</td><td>' + r.H + '</td><td>' + r.S + '</td><td>' + r.I + '</td><td' + (r.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + r.A + '</td><td>' + r.T + '</td><td class="xs">' + esc(r.pencatat) + '</td>' + (ajar ? '<td>' + (r.milik ? '<button class="btn sm" data-act="abs-open" data-i="' + i + '">Buka</button>' : '') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-calendar-x', 'Belum ada riwayat absensi mapel') + '</div>';
  }).catch(function (e) { $('#hist-box').innerHTML = '<div class="card-body">' + errBox(e) + '</div>'; });
}
ACT['abs-open'] = function (el) {
  const r = (P.abs.hist || [])[+el.dataset.i]; if (!r) return;
  const i = P.abs.meta.diampu.findIndex(function (x) { return x.id_kelas === r.id_kelas && x.id_mapel === r.id_mapel; });
  if (i < 0) { toast('Anda bukan pengampu sesi ini.', 'warn'); return; }
  const f = $('#f-abs'); $('[name=sel]', f).value = i; $('[name=tanggal]', f).value = r.tanggal; setJamForm(r.jam_ke);
  absLoad();
};

// ── Tab: absensi harian ──
function harPage(params, tok) {
  const tgl = params.tanggal || (P.harTgl && P.harTgl >= addD(S.today, -14) ? P.harTgl : S.today);
  // v1.14: wali kelas dengan satu kelas: daftar murid diambil bersamaan dengan ringkasan kelas
  if (S.kelasWali && S.kelasWali.length === 1 && !obAda('har|' + S.kelasWali[0] + '|' + tgl)) rosterPrafetch('harian.roster', { id_kelas: S.kelasWali[0], tanggal: tgl });
  return apiC('harian.meta', { tanggal: tgl }).then(function (meta) {
    if (stale(tok)) return;
    P.harMeta = meta; P.harTgl = meta.tanggal;
    let h = '<div class="card pad"><div class="row between wrap" style="gap:12px"><div><h3>Absensi harian</h3><div class="xs muted">Dicatat sekali sehari per kelas, idealnya pada jam pertama. Hasilnya menjadi nilai awal absensi tiap mata pelajaran.</div></div>' +
      '<div class="row" style="gap:8px"><input class="input" type="date" id="har-tgl" value="' + esc(meta.tanggal) + '" max="' + esc(meta.hariIni) + '" min="' + esc(addD(meta.hariIni, -14)) + '" style="max-width:170px" aria-label="Tanggal"></div></div></div>';
    if (!meta.input.length) {
      h += '<div class="card pad mt-16">' + empty('bi-calendar-x', 'Tidak ada kelas yang dapat Anda catat', hasRole('wali_kelas') ? 'Akun Anda belum ditetapkan sebagai wali kelas pada kelas mana pun. Hubungi admin.' : 'Absensi harian dicatat oleh wali kelas. Gunakan tab Rekap bulanan untuk memantau.') + '</div>';
    } else {
      const sudah = meta.input.filter(function (k) { return k.tercatat; }).length;
      h += '<div class="card mt-16"><div class="card-head"><div><h3>' + esc(tglPanjang(meta.tanggal)) + '</h3><div class="xs muted">' + sudah + ' dari ' + meta.input.length + ' kelas sudah dicatat</div></div></div><div class="card-body"><div class="grid g-3">' + meta.input.map(function (k) {
        const t = k.tercatat;
        return '<button class="card pad har-kls" data-act="har-open" data-id="' + esc(k.id) + '"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.nama) + '</b>' + (t ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : k.sebagian ? '<span class="chip blue">Sebagian</span>' : '<span class="chip st-Baru">Belum</span>') + '</div>' +
          '<div class="xs muted mt-8">' + (t ? 'Hadir ' + t.hadir + '/' + k.jumlah + (t.S ? ' · S ' + t.S : '') + (t.I ? ' · I ' + t.I : '') + (t.A ? ' · <b style="color:var(--rose)">A ' + t.A + '</b>' : '') + (t.T ? ' · T ' + t.T : '') + '<br>oleh ' + esc(t.pencatat) + (t.qr ? ' · ' + t.qr + ' lewat QR' : '') : k.sebagian ? '<i class="bi bi-qr-code-scan"></i> ' + k.sebagian.n + '/' + k.jumlah + ' sudah memindai' + (k.sebagian.T ? ' · ' + k.sebagian.T + ' terlambat' : '') + '<br>ketuk untuk melengkapi' : k.jumlah + ' murid · ketuk untuk mencatat') + '</div></button>';
      }).join('') + '</div></div></div>';
    }
    if (meta.libur) h = '<div class="note mb-16"><i class="bi bi-calendar-heart"></i><div><b>' + esc(tglPanjang(meta.tanggal)) + ': ' + esc(meta.libur) + '.</b> Tanggal ini tercatat sebagai hari libur.</div></div>' + h;
    h += '<div id="har-box" class="mt-16"></div>';
    $('#abs-body').innerHTML = h;
    $('#har-tgl').addEventListener('change', function (e) { if (e.target.value) { P.harTgl = e.target.value; harPage({ tanggal: e.target.value }, S.navTok).catch(fail); } });
    if (meta.input.length === 1 && !meta.input[0].tercatat && meta.tanggal === meta.hariIni) harOpen(meta.input[0].id);
  });
}
ACT['har-open'] = function (el) { harOpen(el.dataset.id, el); };
function harOpen(id, btn) {
  if (obAda('har|' + id + '|' + P.harTgl)) { obKirim(); toast('Absensi harian kelas ini masih dikirim ke server. Tunggu beberapa detik.', 'warn'); return; }
  const p = rosterAmbil('harian.roster', { id_kelas: id, tanggal: P.harTgl });
  (btn ? run(btn, p) : p).then(function (r) {
    P.har = { roster: r, rows: r.murid.map(function (m) { return { id: m.id, nama: m.nama, nis: m.nis, status: m.status, catatan: m.catatan, mapel: m.mapel, qr: m.qr, jam: m.jam, belum: m.belum }; }) };
    harDraw();
  }).catch(fail);
}
function harLock() { return P.har.roster.ada && !P.har.roster.bolehSimpan; }
function harRow(m) {
  const lock = harLock();
  const qr = m.qr ? '<span class="chip blue" title="Tercatat dari pindai kartu QR"><i class="bi bi-qr-code-scan"></i> ' + esc(m.jam || 'QR') + '</span>' : (m.belum && !m.status ? '<span class="chip ab-B">Belum memindai</span>' : '');
  const mp = (m.mapel || []).filter(function (x) { return x.status !== 'H'; }).map(function (x) { return '<span class="chip neutral" title="' + esc(x.mapel) + '">Jam ' + esc(x.jam) + ': ' + esc(x.status) + '</span>'; }).join(' ');
  return '<div class="r-row" data-hid="' + esc(m.id) + '"><div class="r-id"><div class="av">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6 trunc">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' ' + qr + ' ' + mp + '</div></div></div>' +
    '<div class="col" style="gap:6px;align-items:flex-end">' + segHtml(m, lock, 'har-set') +
    (m.status && m.status !== 'H' ? '<input class="input" style="min-height:34px;font-size:13px" data-hcat="' + esc(m.id) + '" maxlength="200" placeholder="' + (m.status === 'S' ? 'mis. surat dokter' : m.status === 'I' ? 'mis. izin orang tua' : m.status === 'T' ? 'mis. datang 07.25' : 'Catatan (opsional)') + '" value="' + esc(m.catatan) + '"' + (lock ? ' disabled' : '') + '>' : '') + '</div></div>';
}
function harDraw() {
  const r = P.har.roster, lock = harLock();
  if (!r.murid.length) { $('#har-box').innerHTML = '<div class="card pad">' + empty('bi-people', 'Kelas ini belum memiliki murid aktif') + '</div>'; return; }
  let note = r.ada ? (r.bolehSimpan ? '<div class="note info"><i class="bi bi-pencil-square"></i><div>Sudah dicatat oleh <b>' + esc(r.pencatat) + '</b>. Koreksi masih dapat dilakukan sampai <b>' + r.sisaJam + ' jam</b> lagi.</div></div>' : '<div class="note rose"><i class="bi bi-lock"></i><div>Batas koreksi sudah terlewati. Hubungi admin bila perlu perubahan.</div></div>') : '';
  const belum = P.har.rows.filter(function (x) { return !x.status; }).length;
  if (!r.ada && r.modeQr) note += '<div class="note info' + (note ? ' mt-8' : '') + '"><i class="bi bi-qr-code-scan"></i><div><b>' + r.nQr + ' murid</b> sudah memindai kartu (Hadir/Terlambat terisi otomatis, batas jam masuk ' + esc(r.jamMasuk) + '). ' + (belum ? 'Tentukan status <b>' + belum + ' murid</b> yang belum memindai: Sakit, Izin, Alpa, atau Hadir bila kartunya tertinggal.' : 'Semua murid sudah tercatat.') + '</div></div>';
  if (r.libur) note += '<div class="note' + (note ? ' mt-8' : '') + '"><i class="bi bi-calendar-heart"></i><div>Tanggal ini tercatat sebagai <b>hari libur: ' + esc(r.libur) + '</b>. Absensi harian biasanya tidak perlu dicatat.</div></div>';
  $('#har-box').innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>Absensi harian ' + esc(r.kelas) + '</h3><div class="xs muted">' + esc(tglPanjang(r.tanggal)) + '</div></div><button class="btn sm" data-act="har-allh"' + (lock ? ' disabled' : '') + '><i class="bi bi-check2-all"></i> ' + (r.modeQr && !r.ada ? 'Sisanya hadir' : 'Semua hadir') + '</button></div>' +
    '<div class="card-body" style="padding-bottom:0">' + note + '<div class="sumbar mt-12" id="har-sum"></div></div><div class="roster mt-12" id="har-rows">' + P.har.rows.map(harRow).join('') + '</div></div>' +
    '<div class="sticky-save"><div class="xs muted-2" id="har-sum2"></div><button class="btn primary" data-act="har-save"' + (lock ? ' disabled' : '') + '><i class="bi bi-check-circle"></i> ' + (r.ada ? 'Simpan koreksi' : r.nQr ? 'Lengkapi & simpan' : 'Simpan absensi harian') + '</button></div>';
  harSum();
  $('#har-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function harSum() {
  const c = absCounts(P.har.rows);
  $('#har-sum').innerHTML = ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + c[s] + '</b></span>'; }).join('');
  const b = P.har.rows.filter(function (x) { return !x.status; }).length;
  $('#har-sum2').innerHTML = '<b>' + P.har.rows.length + '</b> murid · Masuk <b>' + (c.H + c.T) + '</b> · Tidak masuk <b>' + (c.S + c.I + c.A) + '</b>' + (b ? ' · <b style="color:#D97706">' + b + ' belum ditentukan</b>' : '');
}
ACT['har-set'] = function (el) {
  const row = P.har.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!row) return;
  row.status = el.dataset.s;
  const old = $('[data-hid="' + el.dataset.id + '"]');
  if (old) { const tmp = document.createElement('div'); tmp.innerHTML = harRow(row); old.replaceWith(tmp.firstChild); }
  harSum();
};
ACT['har-allh'] = function () {
  const sisa = P.har.roster.modeQr && !P.har.roster.ada;
  P.har.rows.forEach(function (r) { if (sisa && r.status) return; r.status = 'H'; if (!sisa) r.catatan = ''; else r.catatan = r.catatan || 'Hadir (tanpa pindai kartu)'; });
  $('#har-rows').innerHTML = P.har.rows.map(harRow).join(''); harSum();
};
ACT['har-save'] = function (el) {
  const r = P.har.roster;
  const kosong = P.har.rows.filter(function (x) { return !x.status; });
  if (kosong.length) {
    toast(kosong.length + ' murid belum ditentukan statusnya. Pilih H/S/I/A/T atau tekan "Sisanya hadir".', 'err');
    const row = $('[data-hid="' + kosong[0].id + '"]'); if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const payloadH = { id_kelas: r.id_kelas, tanggal: r.tanggal, koreksi: r.ada === true, entries: P.har.rows.map(function (m) { return { id_murid: m.id, status: m.status, catatan: m.catatan || '' }; }) };
  const cH = absCounts(P.har.rows);
  obTambah('harian.simpan', payloadH, 'Absensi harian ' + r.kelas + ' · ' + fTgl(r.tanggal), 'har|' + r.id_kelas + '|' + r.tanggal, function (res) {
    if (res.alpa && res.alpa.length && res.bolehOrtu && S.page === 'absensi') harTawarOrtu(res.alpa, r.tanggal);
    if (S.page === 'absensi' && P.absTab === 'harian' && $('#har-tgl')) harPage({ tanggal: r.tanggal }, S.navTok).catch(function () { });
  });
  toast('Absensi harian ' + r.kelas + ' disimpan: masuk ' + (cH.H + cH.T) + ' · S ' + cH.S + ' · I ' + cH.I + ' · A ' + cH.A + '.');
  // Kartu kelas langsung berstatus tercatat (optimistis)
  const kk = P.harMeta && P.harMeta.input.filter(function (k) { return k.id === r.id_kelas; })[0];
  if (kk && P.harMeta.tanggal === r.tanggal) { kk.tercatat = { n: P.har.rows.length, hadir: cH.H + cH.T, S: cH.S, I: cH.I, A: cH.A, T: cH.T, qr: 0, pencatat: S.user.nama + ' (mengirim…)' }; kk.sebagian = null; }
  if (kk && P.harMeta.tanggal === r.tanggal) { ccSeed('harian.meta', { tanggal: r.tanggal }, P.harMeta); harPage({ tanggal: r.tanggal }, S.navTok).catch(function () { }); }
  else $('#har-box').innerHTML = '<div class="card pad">' + empty('bi-check2-circle', 'Absensi harian ' + r.kelas + ' tersimpan', 'Dikirim ke server di latar belakang.') + '</div>';
};
/** Setelah menyimpan: tawarkan menghubungi orang tua murid yang Alpa (templat pemberitahuan ketidakhadiran). */
function harTawarOrtu(list, tgl) {
  openModal({
    title: 'Beri tahu orang tua?', sub: list.length + ' murid tercatat Alpa pada ' + tglPanjang(tgl),
    body: '<p class="muted-2">Pesan pemberitahuan ketidakhadiran sudah disiapkan dari templat. Ketuk Hubungi, kirim lewat WhatsApp, lalu satu ketukan untuk mencatatnya.</p><div class="col gap-8 mt-12">' + list.map(function (m) { return '<div class="row between sec"><b>' + esc(m.nama) + '</b><button class="btn sm blue" data-act="har-ortu" data-id="' + esc(m.id) + '" data-t="' + esc(tgl) + '"><i class="bi bi-whatsapp"></i> Hubungi</button></div>'; }).join('') + '</div>',
    foot: '<button class="btn" data-close>Nanti saja</button>'
  });
}
ACT['har-ortu'] = function (el) { closeAllOverlays(); waModal({ id_murid: el.dataset.id, templat: 'absen', tanggal: el.dataset.t }); };

// ── Tab: rekap bulanan absensi harian ──
function rkPage(params, tok) {
  const metaP = P.harMeta ? Promise.resolve(P.harMeta) : apiC('harian.meta', {});
  return metaP.then(function (meta) {
    if (stale(tok)) return;
    P.harMeta = meta;
    if (!meta.lihat.length) { $('#abs-body').innerHTML = '<div class="card pad">' + empty('bi-table', 'Tidak ada kelas yang dapat Anda lihat') + '</div>'; return; }
    const def = P.rkKelas || (S.kelasWali && S.kelasWali[0]) || meta.lihat[0].id;
    $('#abs-body').innerHTML = '<div class="card pad"><form class="form-grid c2" id="f-rk" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      fld({ name: 'id_kelas', label: 'Kelas', type: 'select', opts: meta.lihat.map(function (k) { return { v: k.id, l: k.nama }; }), value: def }) +
      fld({ name: 'bulan', label: 'Bulan', type: 'month', value: P.rkBulan || S.today.substr(0, 7), maxv: S.today.substr(0, 7) }) +
      '<div class="field"><label>&nbsp;</label><button class="btn dark" type="submit"><i class="bi bi-funnel"></i> Tampilkan</button></div></form></div><div id="rk-box" class="mt-16"></div>';
    $('#f-rk').addEventListener('submit', function (e) { e.preventDefault(); rkLoad($('button[type=submit]', e.target)); });
    return rkLoad();
  });
}
function rkLoad(btn) {
  const d = formData($('#f-rk'));
  P.rkKelas = d.id_kelas; P.rkBulan = d.bulan;
  const p = apiC('harian.rekap', d);
  if (!btn) $('#rk-box').innerHTML = skeleton(2);
  return (btn ? run(btn, p) : p).then(function (r) {
    P.rk = r;
    const t = r.total;
    let h = '<div class="card"><div class="card-head" style="flex-wrap:wrap"><div><h3>Rekap harian ' + esc(r.kelas) + '</h3><div class="xs muted">' + esc(blnPanjang(r.bulan)) + ' · ' + r.hari.length + ' hari tercatat · Wali kelas: ' + esc(r.wali || '-') + '</div></div><div class="row" style="gap:6px"><button class="btn sm" data-act="rk-cetak"' + (r.hari.length ? '' : ' disabled') + '><i class="bi bi-printer"></i> Cetak</button><button class="btn sm" data-act="rk-csv"' + (r.hari.length ? '' : ' disabled') + '><i class="bi bi-filetype-csv"></i> Ekspor CSV</button></div></div>';
    if (!r.hari.length) { $('#rk-box').innerHTML = h + '<div class="card-body">' + empty('bi-calendar-x', 'Belum ada absensi harian pada bulan ini') + '</div></div>'; return; }
    const kol = rkKolom(r), bel = kol.filter(function (k) { return k.t === 'miss'; });
    h += '<div class="card-body"><div class="sumbar">' + ['H', 'S', 'I', 'A', 'T'].map(function (s) { return '<span class="sum"><span class="dotc" style="background:' + ST_COL[s] + '"></span>' + ST_NAMA[s] + ' <b>' + t[s] + '</b></span>'; }).join('') + '<span class="sum">Kehadiran <b>' + (r.hadir === null ? '-' : r.hadir + '%') + '</b></span>' +
      '<span class="sum"><span class="dotc" style="background:' + RK_WARNA.miss + ';border:1px solid #F59E0B"></span>Belum diabsen <b>' + bel.length + ' hari</b></span></div>' +
      (bel.length ? '<div class="xs mt-8" style="color:#B45309"><i class="bi bi-exclamation-triangle"></i> Hari sekolah belum diabsen: tanggal ' + bel.map(function (k) { return +k.d.substr(8, 2); }).join(', ') + '. Catat lewat tab Harian dengan memilih tanggalnya.</div>' : '') + '</div>';
    h += '<div class="tbl-wrap"><table class="tbl rk-tbl"><thead><tr><th class="rk-nm">Nama murid</th>' + kol.map(function (k) { return '<th title="' + esc(tglPanjang(k.d) + (k.ket ? ' · ' + k.ket : '')) + '"' + rkGaya(k) + '>' + (+k.d.substr(8, 2)) + '<br><span class="xs muted">' + k.hr + '</span></th>'; }).join('') + '<th>S</th><th>I</th><th>A</th><th>T</th><th>%</th></tr></thead><tbody>' +
      r.murid.map(function (m) {
        return '<tr><td class="rk-nm"><div class="fw6 trunc">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.nis) + '</div></td>' + kol.map(function (k) {
          const x = m.st[k.d];
          if (x) return '<td class="rk-c rk-' + x.s + '"' + (x.c ? ' title="' + esc(x.c) + '"' : '') + '>' + (x.s === 'H' ? '•' : x.s) + '</td>';
          if (k.t === 'rec') return '<td class="rk-c muted">-</td>';
          return '<td class="rk-c muted"' + rkGaya(k) + (k.ket ? ' title="' + esc(k.ket) + '"' : '') + '>' + (k.t === 'lib' ? 'L' : '') + '</td>';
        }).join('') +
          '<td>' + m.S + '</td><td>' + m.I + '</td><td' + (m.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + m.A + '</td><td>' + m.T + '</td><td class="fw6">' + (m.hadir === null ? '-' : m.hadir) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="card-body xs muted">• = hadir · S sakit · I izin · A alpa · T terlambat · <b>L</b> = libur (abu-abu) · kolom kuning = hari sekolah belum diabsen. Persentase dihitung dari hari yang sudah diabsen. Arahkan kursor ke sel untuk melihat catatan.' + (r.qr ? ' ' + r.qr + ' dari ' + r.catatan + ' catatan berasal dari pindai kartu QR.' : '') + rkKetLibur(kol, fTgl) + '</div></div>';
    $('#rk-box').innerHTML = h;
  }).catch(function (e) { isiHtml('#rk-box', errBox(e)); });
}
// Kolom rekap bulanan: semua tanggal 1–akhir bulan.
// t: 'rec' sudah diabsen · 'lib' akhir pekan/libur · 'miss' hari sekolah belum diabsen · 'fut' belum tiba.
const RK_WARNA = { lib: 'rgba(148,163,184,.22)', miss: 'rgba(245,158,11,.22)' };
function rkKolom(r) {
  const y = +r.bulan.substr(0, 4), mo = +r.bulan.substr(5, 2), n = new Date(y, mo, 0).getDate();
  const ada = {}, lib = {}, hs = r.hs === 6 ? 6 : 5, out = [];
  r.hari.forEach(function (d) { ada[d] = 1; });
  (r.libur || []).forEach(function (x) { lib[x.tanggal] = x.k; });
  for (let i = 1; i <= n; i++) {
    const d = r.bulan + '-' + (i < 10 ? '0' : '') + i, w = new Date(y, mo - 1, i).getDay();
    const pekan = w === 0 || (w === 6 && hs === 5), ket = lib[d] || (pekan ? (w === 0 ? 'Hari Minggu' : 'Hari Sabtu') : '');
    const t = ada[d] ? 'rec' : (lib[d] || pekan) ? 'lib' : d > S.today ? 'fut' : 'miss';
    out.push({ d: d, t: t, ket: ket, libKhusus: !!lib[d], hr: HRI[w].substr(0, 3) });
  }
  return out;
}
function rkGaya(k) { return k.t === 'lib' || k.t === 'miss' ? ' style="background:' + RK_WARNA[k.t] + ';-webkit-print-color-adjust:exact;print-color-adjust:exact"' : ''; }
function rkKetLibur(kol, fmt) {
  const l = kol.filter(function (k) { return k.libKhusus; });
  return l.length ? '<br>Hari libur bulan ini: ' + l.map(function (k) { return esc(fmt(k.d)) + ' (' + esc(k.ket) + ')'; }).join(', ') + '. Akhir pekan ditandai L.' : '<br>Akhir pekan ditandai L. Belum ada hari libur lain yang diisi admin untuk bulan ini.';
}
function blnPanjang(b) { const n = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return n[+b.substr(5, 2) - 1] + ' ' + b.substr(0, 4); }
ACT['rk-csv'] = function () {
  const r = P.rk; if (!r) return;
  const kol = rkKolom(r), bel = kol.filter(function (k) { return k.t === 'miss'; }), lk = kol.filter(function (k) { return k.libKhusus; });
  const rows = [['Rekap absensi harian', r.kelas, blnPanjang(r.bulan)], [], ['NIS', 'Nama'].concat(kol.map(function (k) { return k.d.substr(8, 2); })).concat(['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Kehadiran (%)'])]
    .concat(r.murid.map(function (m) { return [m.nis, m.nama].concat(kol.map(function (k) { return m.st[k.d] ? m.st[k.d].s : k.t === 'lib' ? 'L' : k.t === 'miss' ? '?' : ''; })).concat([m.H, m.S, m.I, m.A, m.T, m.hadir === null ? '' : m.hadir]); }))
    .concat([[], ['Keterangan: H hadir, S sakit, I izin, A alpa, T terlambat, L libur, ? hari sekolah belum diabsen. Persentase dihitung dari hari yang sudah diabsen.'],
      ['Hari libur: ' + (lk.length ? lk.map(function (k) { return +k.d.substr(8, 2) + ' (' + k.ket + ')'; }).join('; ') : '-') + '; akhir pekan ditandai L.'],
      ['Belum diabsen: ' + (bel.length ? 'tanggal ' + bel.map(function (k) { return +k.d.substr(8, 2); }).join(', ') : '-')]]);
  const csv = '﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'absensi_harian_' + r.kelas.replace(/\s+/g, '_') + '_' + r.bulan + '.csv');
  toast('CSV diunduh.');
};
