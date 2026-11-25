/* SIKOLAB BK v1.15 — js/pages/14_layanan.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Layanan BK (F6) — untuk SEMUA murid: layanan dasar, peminatan, responsif, dukungan sistem
// ════════════════════════════════════════════════════════════
const KOMP_INFO = {
  'Layanan Dasar': { c: 'teal', ic: 'bi-people', d: 'Untuk semua murid: bimbingan klasikal, kelompok, orientasi, informasi.' },
  'Peminatan & Perencanaan Individual': { c: 'blue', ic: 'bi-compass', d: 'Membantu murid merencanakan studi lanjut, karier, dan masa depan.' },
  'Responsif': { c: 'purple', ic: 'bi-heart-pulse', d: 'Konseling, konsultasi, mediasi untuk kebutuhan atau masalah tertentu. Rahasia.' },
  'Dukungan Sistem': { c: 'amber', ic: 'bi-diagram-3', d: 'Asesmen, kolaborasi dengan orang tua, guru, dan lembaga.' }
};
function chipKomp(k) { const i = KOMP_INFO[k] || { c: 'slate', ic: 'bi-dot' }; return '<span class="chip kc-' + i.c + '"><i class="bi ' + i.ic + '"></i> ' + esc(k) + '</span>'; }

PAGES.layanan = function (params, tok) {
  P.ly = { q: '', komponen: params.komponen || '', sasaran: '', bulan: '', data: null };
  return lyLoad(tok).then(function () {
    if (stale(tok)) return;
    temuRingkas();
    if (params.open) lyBuka(params.open);
    else if (params.tab === 'permintaan') temuDrawer('aktif');
    else if (params.kasus || params.murid || params.peserta || params.program || params.baru) lyForm(null, params);
  });
};
function lyLoad(tok) {
  const f = { q: P.ly.q, komponen: P.ly.komponen, sasaran: P.ly.sasaran, bulan: P.ly.bulan };
  return apiC('layanan.daftar', f).then(function (d) {
    if (tok !== undefined && stale(tok)) return;
    P.ly.data = d;
    const st = d.statistik;
    if (!$('#ly-list')) {
      $('#app-container').innerHTML = pageHead('Layanan Bimbingan dan Konseling', 'Layanan BK', 'Catat semua layanan BK, bukan hanya penanganan kasus: bimbingan klasikal dan kelompok, perencanaan individual, konseling, hingga kolaborasi dengan orang tua.', '<button class="btn primary" data-act="ly-baru"><i class="bi bi-plus-lg"></i> Catat layanan</button>') +
        '<div id="ly-temu" class="mb-16"></div><div id="ly-stat"></div>' +
        '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div class="fchips" id="ly-komp"></div></div>' +
        '<div class="card-body" style="padding-bottom:0"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="field"><label for="ly-q">Cari</label><input class="input" id="ly-q" type="search" placeholder="Topik, nama murid, NIS…"></div>' +
        '<div class="field"><label for="ly-sas">Sasaran</label><select class="select" id="ly-sas"><option value="">Semua sasaran</option><option>Individu</option><option>Kelompok</option><option>Klasikal</option></select></div>' +
        '<div class="field"><label for="ly-bln">Bulan</label><input class="input" type="month" id="ly-bln"></div></div></div><div id="ly-list" class="mt-12"></div></div>';
      $('#ly-q').addEventListener('input', debounce(function (e) { P.ly.q = e.target.value.trim(); lyLoad(); }, 300));
      $('#ly-sas').addEventListener('change', function (e) { P.ly.sasaran = e.target.value; lyLoad(); });
      $('#ly-bln').addEventListener('change', function (e) { P.ly.bulan = e.target.value; lyLoad(); });
    }
    const pk = st.perKomponen || {};
    $('#ly-stat').innerHTML = '<div class="grid g-kpi k4">' + [
      ['indigo', 'bi-calendar-check', 'Layanan Bulan Ini', st.bulanIni, 'pelaksanaan tercatat'],
      ['teal', 'bi-people', 'Murid Terlayani', st.murid, 'sejak awal tahun ajaran'],
      ['blue', 'bi-grid-1x2', 'Layanan Dasar & Peminatan', (pk['Layanan Dasar'] || 0) + (pk['Peminatan & Perencanaan Individual'] || 0), 'untuk semua murid'],
      ['purple', 'bi-heart-pulse', 'Layanan Responsif', pk['Responsif'] || 0, 'konseling · rahasia']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    $('#ly-komp').innerHTML = ['', 'Layanan Dasar', 'Peminatan & Perencanaan Individual', 'Responsif', 'Dukungan Sistem'].map(function (k) {
      return '<button class="fchip ' + (P.ly.komponen === k ? 'active' : '') + '" data-act="ly-komp" data-k="' + esc(k) + '">' + (k ? esc(k) + ' (' + (pk[k] || 0) + ')' : 'Semua (' + st.total + ')') + '</button>';
    }).join('');
    $('#ly-list').innerHTML = d.sesi.length ? '<div class="ly-list">' + d.sesi.map(lyRow).join('') + '</div>' :
      '<div class="card-body">' + empty('bi-heart-pulse', 'Belum ada layanan pada filter ini', 'Catat bimbingan klasikal, konseling individual, atau layanan lain dengan tombol Catat layanan.') + '</div>';
  });
}
function lyRow(x) {
  const d = x.tanggal || '';
  return '<button class="ly-row" data-act="ly-buka" data-id="' + esc(x.id) + '"><div class="ly-date"><b>' + esc(d.substr(8, 2)) + '</b><span>' + esc(BLN[+d.substr(5, 2) - 1] || '') + ' ' + esc(d.substr(2, 2)) + '</span></div>' +
    '<div class="grow" style="min-width:0"><div class="row wrap" style="gap:6px">' + chipKomp(x.komponen) + '<span class="chip neutral">' + esc(x.jenis_layanan) + '</span><span class="chip neutral"><i class="bi bi-person"></i> ' + esc(x.sasaran) + '</span>' + (x.rahasia ? '<span class="chip purple"><i class="bi bi-lock-fill"></i> Rahasia</span>' : '') + '</div>' +
    '<div class="fw7 mt-8" style="font-family:var(--font-h)">' + esc(x.topik) + '</div><div class="xs muted-2">' + esc(x.peserta) + (x.bidang ? ' · Bidang ' + esc(x.bidang) : '') + '</div>' +
    '<div class="row wrap mt-8" style="gap:6px">' + (x.program ? '<span class="chip blue"><i class="bi bi-journal-check"></i> ' + esc(x.program) + '</span>' : '') + (x.kode ? '<span class="chip st-Diproses"><i class="bi bi-folder2-open"></i> ' + esc(x.kode) + '</span>' : '') + (x.jurus ? '<span class="chip gold"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + (x.berkas ? '<span class="chip neutral"><i class="bi bi-paperclip"></i> ' + x.berkas + '</span>' : '') + '</div></div>' +
    '<i class="bi bi-chevron-right muted"></i></button>';
}
ACT['ly-komp'] = function (el) { P.ly.komponen = el.dataset.k; lyLoad().catch(fail); };
ACT['ly-buka'] = function (el) { lyBuka(el.dataset.id); };
ACT['ly-baru'] = function () { lyForm(null, {}); };
function lyBuka(id) { apiC('layanan.get', { id: id }).then(function (x) { lyForm(x, {}); }).catch(fail); }

/** Formulir layanan BK. x = data lama (ubah) atau null (baru). pre = isian awal dari halaman lain. */
function lyForm(x, pre) {
  pre = pre || {};
  const R = P.ly && P.ly.data ? P.ly.data.refs : null;
  if (!R) { apiC('layanan.daftar', {}).then(function (d) { P.ly = P.ly || {}; P.ly.data = d; lyForm(x, pre); }).catch(fail); return; }
  const kasusPre = pre.kasus ? R.kasusAktif.filter(function (k) { return k.id === pre.kasus; })[0] : null;
  const progPre = pre.program ? R.program.filter(function (p) { return p.id === pre.program; })[0] : null;
  let jenis0 = x ? x.jenis_layanan : (pre.jenis || (kasusPre ? 'Konseling Individual' : 'Konseling Individual'));
  let komp0 = x ? x.komponen : Object.keys(R.komponen).filter(function (k) { return R.komponen[k].indexOf(jenis0) >= 0; })[0] || 'Responsif';
  if (!x && pre.komponen) { komp0 = pre.komponen; jenis0 = pre.jenis && R.komponen[komp0].indexOf(pre.jenis) >= 0 ? pre.jenis : R.komponen[komp0][0]; }
  const st = {
    komponen: komp0, sasaran: x ? x.sasaran : (pre.sasaran || (komp0 === 'Layanan Dasar' ? 'Klasikal' : 'Individu')),
    peserta: x ? x.pesertaList.map(function (m) { return { id: m.id, nama: m.nama, kelas: m.kelas }; }) : (pre.peserta ? pre.peserta.slice() : pre.murid ? [pre.murid] : (kasusPre ? [{ id: kasusPre.id_murid, nama: kasusPre.murid, kelas: kasusPre.kelas }] : [])),
    file: null
  };
  const kasusOpts = R.kasusAktif.map(function (k) { return { v: k.id, l: k.kode + ' — ' + k.murid + ' (' + k.kelas + ') · ' + k.kategori }; });
  if (x && x.id_laporan && !kasusOpts.some(function (o) { return o.v === x.id_laporan; })) kasusOpts.push({ v: x.id_laporan, l: x.kode || 'Kasus terkait' });
  const progOpts = R.program.map(function (p) { return { v: p.id, l: '[' + p.bidang + '] ' + p.topik }; });
  const berkasList = x && x.berkas && x.berkas.length ? '<div class="row wrap mt-8"><span class="xs muted">Lampiran:</span>' + x.berkas.map(function (f) { return '<button type="button" class="chip blue" style="border:0;cursor:pointer" data-act="berkas" data-id="' + esc(f.id) + '"><i class="bi bi-paperclip"></i> ' + esc(f.nama) + '</button>'; }).join('') + '</div>' : '';
  const m = openModal({
    title: x ? 'Catatan layanan BK' : 'Catat layanan BK', sub: x ? (x.oleh ? 'Dicatat oleh ' + x.oleh : '') : 'Untuk satu murid, sekelompok murid, atau satu kelas', size: 'xl', sticky: true, noFocus: true,
    body: '<form id="f-ly" class="col gap-16" novalidate>' +
      '<div class="field"><span class="flabel">Komponen layanan</span><div class="komp-tiles" id="ly-kt">' + Object.keys(R.komponen).map(function (k) { const i = KOMP_INFO[k]; return '<button type="button" class="komp-tile kc-' + i.c + (k === st.komponen ? ' on' : '') + '" data-act="ly-kt" data-k="' + esc(k) + '"><i class="bi ' + i.ic + '"></i><b>' + esc(k) + '</b><small>' + esc(i.d) + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="form-grid c2"><div class="field"><label for="ly-jenis">Jenis layanan <span class="req">*</span></label><select class="select" id="ly-jenis" name="jenis_layanan"></select></div>' +
      fld({ name: 'tanggal', label: 'Tanggal pelaksanaan', type: 'date', req: true, value: x ? x.tanggal : S.today, maxv: S.today }) +
      fld({ name: 'bidang', label: 'Bidang', type: 'select', value: x ? x.bidang : (progPre ? progPre.bidang : (pre.bidang || 'Pribadi')), opts: R.bidang }) +
      fld({ name: 'sumber', label: 'Asal layanan', type: 'select', blank: '— Pilih —', value: x ? x.sumber : (pre.sumber || (kasusPre ? 'Laporan kejadian' : (progPre ? 'Program BK' : ''))), opts: R.sumber }) +
      fld({ name: 'jurus', label: 'Fokus 7 Jurus BK Hebat (opsional)', type: 'select', blank: '— Tidak dipilih —', value: x ? x.jurus : (progPre ? progPre.jurus : ''), opts: R.jurus }) +
      fld({ name: 'id_program', label: 'Kegiatan Program BK (opsional)', type: 'select', blank: '— Tidak terkait program —', value: x ? x.id_program : (progPre ? progPre.id : ''), opts: progOpts, hint: 'Bila dipilih, realisasi program bertambah otomatis.' }) + '</div>' +
      '<div class="field"><span class="flabel">Sasaran layanan</span><div class="seg-lg" id="ly-sas-seg">' + R.sasaran.map(function (s) { return '<button type="button" class="' + (s === st.sasaran ? 'on' : '') + '" data-act="ly-sas" data-s="' + s + '">' + { Individu: '<i class="bi bi-person"></i> Individu', Kelompok: '<i class="bi bi-people"></i> Kelompok', Klasikal: '<i class="bi bi-grid-3x3-gap"></i> Klasikal (satu kelas)' }[s] + '</button>'; }).join('') + '</div></div>' +
      '<div id="ly-peserta"></div>' +
      fld({ name: 'id_laporan', label: 'Kasus terkait (opsional)', type: 'select', blank: '— Tidak terkait kasus —', value: x ? x.id_laporan : (kasusPre ? kasusPre.id : ''), opts: kasusOpts }) +
      fld({ name: 'topik', label: 'Topik / masalah', req: true, max: 200, value: x ? x.topik : (progPre ? progPre.topik : (pre.topik || '')), ph: 'mis. Cara belajar efektif · Kesulitan beradaptasi · Pilihan SMA/SMK' }) +
      '<div id="ly-asesmen">' + fld({ name: 'asesmen', label: 'Asesmen / identifikasi kebutuhan', type: 'textarea', rows: 3, max: 5000, value: x ? x.asesmen : '' }) + '</div>' +
      '<div id="ly-catatan">' + fld({ name: 'catatan_konseling', label: 'Catatan', type: 'textarea', req: true, rows: 5, max: 8000, value: x ? x.catatan_konseling : '' }) + '</div>' +
      '<div class="form-grid c2">' + fld({ name: 'hasil', label: 'Hasil / evaluasi', type: 'textarea', rows: 3, max: 3000, value: x ? x.hasil : '' }) + fld({ name: 'rencana_tindak', label: 'Rencana tindak lanjut', type: 'textarea', rows: 3, max: 3000, value: x ? x.rencana_tindak : '' }) + '</div>' +
      '<div class="field"><span class="flabel">Lampiran (opsional)</span><input type="file" id="ly-file" class="input" accept=".pdf,.png,.jpg,.jpeg,.webp">' + berkasList + '</div>' +
      '<div id="ly-note"></div></form>',
    foot: (x ? '<button class="btn soft-danger" data-act="ly-hapus" data-id="' + esc(x.id) + '" style="flex:0 0 auto"><i class="bi bi-trash3"></i></button>' : '') + '<button class="btn" data-close>Tutup</button><button class="btn primary" id="ly-ok"><i class="bi bi-check-lg"></i> Simpan</button>'
  });
  P.lyf = { st: st, R: R, m: m, x: x };
  const f = $('#f-ly', m.el);
  lyJenisOpts(jenis0); lyKompUI(); lyPesertaUI();
  $('#ly-file', m.el).addEventListener('change', function (e) { readFileB64(e.target.files[0], 5 * 1024 * 1024).then(function (b) { st.file = b; }).catch(function (er) { e.target.value = ''; st.file = null; fail(er); }); });
  $('[name=id_laporan]', f).addEventListener('change', function (e) {
    const k = R.kasusAktif.filter(function (z) { return z.id === e.target.value; })[0];
    if (k && !st.peserta.some(function (p) { return p.id === k.id_murid; })) {
      if (st.sasaran === 'Klasikal') { st.sasaran = 'Individu'; $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === 'Individu'); }); }
      if (st.sasaran === 'Individu') st.peserta = [];
      st.peserta.push({ id: k.id_murid, nama: k.murid, kelas: k.kelas });
      lyPesertaUI();
    }
    if (k && !$('[name=sumber]', f).value) $('[name=sumber]', f).value = 'Laporan kejadian';
  });
  $('[name=id_program]', f).addEventListener('change', function (e) {
    const p = R.program.filter(function (z) { return z.id === e.target.value; })[0];
    if (!p) return;
    if (!$('[name=topik]', f).value.trim()) $('[name=topik]', f).value = p.topik;
    $('[name=bidang]', f).value = p.bidang;
    if (p.jurus && !$('[name=jurus]', f).value) $('[name=jurus]', f).value = p.jurus;
    if (!$('[name=sumber]', f).value) $('[name=sumber]', f).value = 'Program BK';
  });
  $('#ly-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f);
    if (!validate(f, d, { topik: { label: 'Topik', req: true }, catatan_konseling: { label: 'Catatan', req: true, min: 5 }, tanggal: { label: 'Tanggal', req: true } })) return;
    d.komponen = st.komponen; d.sasaran = st.sasaran;
    if (st.sasaran === 'Klasikal') { if (!d.id_kelas) { toast('Pilih kelas sasaran.', 'err'); return; } }
    else {
      d.peserta = st.peserta.map(function (p) { return p.id; });
      if (st.sasaran === 'Individu' && d.peserta.length !== 1) { toast('Pilih satu murid.', 'err'); return; }
      if (st.sasaran === 'Kelompok' && d.peserta.length < 2) { toast('Layanan kelompok memerlukan minimal 2 murid.', 'err'); return; }
    }
    if (x) d.id = x.id; d.berkas = st.file;
    run(e.currentTarget, api('layanan.simpan', d)).then(function (res) {
      m.close(); toast('Layanan BK tersimpan.');
      if (!x && pre.permintaan) api('temu.ubah', { id: pre.permintaan, status: 'Selesai', id_layanan: res && res.id ? res.id : '' }).then(function () { if (S.page === 'layanan') temuRingkas(); }).catch(fail);
      if (S.page === 'layanan') lyLoad(); else if (S.page === 'program') pgProgram();
    }).catch(fail);
  });
}
function lyJenisOpts(sel) {
  const L = P.lyf, list = L.R.komponen[L.st.komponen] || [];
  const opts = list.slice();
  if (sel && opts.indexOf(sel) < 0 && L.x && L.x.jenis_layanan === sel) opts.push(sel);
  $('#ly-jenis').innerHTML = opts.map(function (j) { return '<option' + (j === sel ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('');
}
function lyKompUI() {
  const L = P.lyf, k = L.st.komponen, rah = k === 'Responsif';
  $$('#ly-kt .komp-tile').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); });
  $('#ly-asesmen').classList.toggle('hide', !(rah || k === 'Peminatan & Perencanaan Individual'));
  const lbl = $('#ly-catatan label');
  if (lbl) lbl.innerHTML = (rah ? 'Catatan konseling' : 'Uraian pelaksanaan') + ' <span class="req">*</span>';
  const ta = $('#ly-catatan textarea');
  if (ta) ta.placeholder = rah ? 'Catatan sesi: permasalahan yang disampaikan, proses, kesepakatan.' : 'Uraikan kegiatan: tujuan, metode/media, jalannya kegiatan, partisipasi murid.';
  $('#ly-note').innerHTML = rah ? '<div class="lock"><div class="l-head"><i class="bi bi-lock-fill"></i> Layanan responsif bersifat rahasia</div><div class="xs muted mt-8">Hanya Guru BK yang dapat membuka catatan ini. Wali kelas dan guru lain hanya melihat status kasus, tidak melihat isi maupun keberadaan sesi konseling di luar kasus.</div></div>'
    : '<div class="note info"><i class="bi bi-info-circle"></i><div>Topik layanan ini akan tampil di garis waktu murid bagi wali kelas (mis. "Mengikuti bimbingan klasikal: Cara belajar efektif"). Uraian pelaksanaan hanya dibaca Guru BK.</div></div>';
}
ACT['ly-kt'] = function (el) {
  const L = P.lyf; L.st.komponen = el.dataset.k;
  lyJenisOpts((L.R.komponen[L.st.komponen] || [])[0]); lyKompUI();
  if (L.st.komponen === 'Layanan Dasar' && L.st.sasaran === 'Individu' && !L.st.peserta.length) { L.st.sasaran = 'Klasikal'; $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === 'Klasikal'); }); lyPesertaUI(); }
};
ACT['ly-sas'] = function (el) {
  const st = P.lyf.st; st.sasaran = el.dataset.s;
  if (st.sasaran === 'Individu' && st.peserta.length > 1) st.peserta = st.peserta.slice(0, 1);
  $$('#ly-sas-seg button').forEach(function (b) { b.classList.toggle('on', b === el); });
  lyPesertaUI();
};
function lyPesertaUI() {
  const L = P.lyf, st = L.st, box = $('#ly-peserta');
  if (st.sasaran === 'Klasikal') {
    box.innerHTML = fld({ name: 'id_kelas', label: 'Kelas sasaran', type: 'select', req: true, blank: 'Pilih kelas…', value: L.x ? L.x.id_kelas : '', opts: kelasOpts(), hint: 'Seluruh murid aktif di kelas ini tercatat sebagai peserta.' });
    return;
  }
  box.innerHTML = '<div class="field"><span class="flabel">' + (st.sasaran === 'Individu' ? 'Murid' : 'Murid peserta (2–40)') + ' <span class="req">*</span></span>' +
    '<div class="chips-sel" id="ly-chips">' + (st.peserta.length ? st.peserta.map(function (p, i) { return '<span class="chip-sel"><b>' + esc(p.nama) + '</b><span class="xs muted">' + esc(p.kelas || '') + '</span><button type="button" data-act="ly-rm" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-x"></i></button></span>'; }).join('') : '<span class="xs muted">Belum ada murid dipilih.</span>') + '</div>' +
    '<div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="ly-mq" class="input" style="padding-left:36px" type="search" placeholder="Ketik nama atau NIS untuk ' + (st.sasaran === 'Individu' ? 'memilih' : 'menambah') + ' murid…" autocomplete="off"><div class="search-res hide" id="ly-mres"></div></div></div>';
  const q = $('#ly-mq');
  q.addEventListener('input', debounce(function () {
    const v = q.value.trim(), res = $('#ly-mres');
    if (v.length < 2) { res.classList.add('hide'); return; }
    apiC('murid.cari', { q: v }).then(function (rows) {
      L.hits = rows; res.classList.remove('hide');
      res.innerHTML = rows.length ? rows.map(function (m, i) { return '<button type="button" data-act="ly-pick" data-i="' + i + '"><div class="avatar" style="width:30px;height:30px;font-size:11px">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</div></div></button>'; }).join('') : '<div class="empty xs" style="padding:12px">Tidak ditemukan.</div>';
    }).catch(fail);
  }, 250));
}
ACT['ly-pick'] = function (el) {
  const L = P.lyf, m = L.hits[+el.dataset.i]; if (!m) return;
  if (L.st.sasaran === 'Individu') L.st.peserta = [];
  if (!L.st.peserta.some(function (p) { return p.id === m.id; })) L.st.peserta.push({ id: m.id, nama: m.nama, kelas: m.kelas });
  lyPesertaUI(); const q = $('#ly-mq'); if (q) q.focus();
};
ACT['ly-rm'] = function (el) { P.lyf.st.peserta.splice(+el.dataset.i, 1); lyPesertaUI(); };
ACT['ly-hapus'] = function (el) {
  confirmDlg('Hapus catatan layanan ini? Realisasi program yang terkait ikut berkurang.', 'Hapus', true, 'Hapus layanan').then(function (ok) {
    if (!ok) return;
    api('layanan.hapus', { id: el.dataset.id }).then(function () { closeAllOverlays(); toast('Layanan dihapus.'); if (S.page === 'layanan') lyLoad(); }).catch(fail);
  });
};
