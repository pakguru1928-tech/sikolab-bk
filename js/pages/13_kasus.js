/* SIKOLAB BK v1.15 — js/pages/13_kasus.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Rujukan & Kasus (F4, F5, F8) + drawer rincian
// ════════════════════════════════════════════════════════════
PAGES.kasus = function (params, tok) {
  P.ks = { saya: false, tinjau: params.filter === 'tinjau', status: params.status || '', rujukan: params.rujukan || '', kategori: '', urgensi: '', id_kelas: '', q: '', page: 1, tab: 'kasus', counts: null };
  const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
  let h = pageHead('Kolaborasi penanganan', 'Rujukan & Alur Penanganan Kasus', 'Kolaborasi guru mapel, wali kelas, dan Guru BK dalam menangani permasalahan murid secara terstruktur.', lapor ? '<button class="btn primary" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '');
  if (hasRole('guru_bk')) h += '<div class="banner mb-16"><i class="bi bi-shield-lock"></i><div><b>Prinsip Kerahasiaan BK</b><div class="xs" style="margin-top:2px">Asesmen dan catatan konseling hanya dapat dibuka oleh Guru BK. Wali kelas dan guru mapel hanya melihat status alur dan rekomendasi bimbingan.</div></div></div>';
  h += '<div class="tabs mb-16" id="ks-tabs"><button class="tab active" data-act="ks-tab" data-t="kasus">Kasus</button><button class="tab" data-act="ks-tab" data-t="tl">Tindak lanjut</button></div><div id="ks-body"></div>';
  $('#app-container').innerHTML = h;
  return ksLoad(true).then(function () { if (!stale(tok) && params.open) openKasus(params.open); });
};
ACT['ks-tab'] = function (el) {
  P.ks.tab = el.dataset.t;
  $$('#ks-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  if (P.ks.tab === 'kasus') ksLoad(true); else tlLoad();
};
function ksParams() { const k = P.ks; return { saya: k.saya ? 1 : 0, tinjau: k.tinjau ? 1 : 0, status: k.status, kategori: k.kategori, urgensi: k.urgensi, id_kelas: k.id_kelas, q: k.q, rujukan: k.rujukan, page: k.page }; }
function ksLoad(full) {
  return apiC('kasus.list', ksParams()).then(function (r) {
    P.ks.counts = r.counts;
    const k = P.ks;
    if (full || !$('#ks-list')) {
      const st = ['Semua'].concat(S.refs.statusKasus);
      $('#ks-body').innerHTML = '<div class="fchips mb-8" id="ks-chips"></div>' +
        '<div class="card pad mb-16"><div class="form-grid c2" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"><div class="field"><label>Cari</label><input class="input" id="ks-q" type="search" placeholder="Nama, NIS, kode, pelapor…" value="' + esc(k.q) + '"></div>' +
        fld({ name: 'kategori', id: 'ks-kat', label: 'Kategori', type: 'select', blank: 'Semua kategori', opts: S.refs.kejadian, value: k.kategori }) +
        fld({ name: 'urgensi', id: 'ks-urg', label: 'Urgensi', type: 'select', blank: 'Semua urgensi', opts: S.refs.urgensi.map(function (u) { return u.nama; }), value: k.urgensi }) +
        fld({ name: 'id_kelas', id: 'ks-kls', label: 'Kelas', type: 'select', blank: 'Semua kelas', opts: kelasOpts(), value: k.id_kelas }) +
        '<div class="field"><label>&nbsp;</label><button class="btn" data-act="ks-reset"><i class="bi bi-funnel"></i> Reset</button></div></div></div><div class="card" id="ks-list"></div>';
      $('#ks-q').addEventListener('input', debounce(function (e) { P.ks.q = e.target.value.trim(); P.ks.page = 1; ksLoad(); }, 300));
      ['ks-kat', 'ks-urg', 'ks-kls'].forEach(function (id) { $('#' + id).addEventListener('change', function (e) { P.ks[{ 'ks-kat': 'kategori', 'ks-urg': 'urgensi', 'ks-kls': 'id_kelas' }[id]] = e.target.value; P.ks.page = 1; ksLoad(); }); });
    }
    const total = r.totalSemua;
    $('#ks-chips').innerHTML = ['Semua'].concat(S.refs.statusKasus).map(function (s) {
      const n = s === 'Semua' ? total : (r.counts.status[s] || 0);
      const on = (k.status || 'Semua') === s;
      return '<button class="fchip ' + (on ? 'active' : '') + '" data-act="ks-status" data-s="' + esc(s) + '">' + esc(s) + ' (' + n + ')</button>';
    }).join('') + (k.rujukan ? '<button class="fchip active" data-act="ks-rj-off"><i class="bi bi-x"></i> Rujukan ' + esc(k.rujukan) + '</button>' : '') +
      (hasRole('guru_bk') ? '<button class="fchip ' + (k.tinjau ? 'active' : '') + '" data-act="ks-tinjau" title="Laporan guru yang belum Anda tinjau, termasuk yang sudah dibina guru"><i class="bi bi-eye"></i> Perlu ditinjau</button><button class="fchip ' + (k.saya ? 'active' : '') + '" data-act="ks-saya" title="Kasus yang menjadi tanggung jawab Anda atau belum memiliki penanggung jawab"><i class="bi bi-person-check"></i> Kasus saya</button>' : (hasRole('wali_kelas') ? '<button class="fchip ' + (k.saya ? 'active' : '') + '" data-act="ks-saya" title="Kasus yang dilimpahkan Guru BK kepada Anda"><i class="bi bi-arrow-left-right"></i> Dilimpahkan ke saya</button>' : ''));
    $('#ks-list').innerHTML = r.rows.length ? '<div class="cases">' + r.rows.map(caseRow).join('') + '</div>' + pager(r, 'ks-page') : empty('bi-inbox', 'Tidak ada kasus yang cocok', 'Ubah filter atau laporkan kejadian baru.');
  });
}
ACT['ks-status'] = function (el) { P.ks.status = el.dataset.s === 'Semua' ? '' : el.dataset.s; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-tinjau'] = function () { P.ks.tinjau = !P.ks.tinjau; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-saya'] = function () { P.ks.saya = !P.ks.saya; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-rj-off'] = function () { P.ks.rujukan = ''; P.ks.page = 1; ksLoad().catch(fail); };
ACT['ks-reset'] = function () { P.ks = Object.assign(P.ks, { saya: false, tinjau: false, status: '', rujukan: '', kategori: '', urgensi: '', id_kelas: '', q: '', page: 1 }); ksLoad(true).catch(fail); };
ACT['ks-page'] = function (el) { P.ks.page = +el.dataset.page; ksLoad().catch(fail); const c = $('#ks-list'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
ACT['kasus-open'] = function (el) { openKasus(el.dataset.id); };

function tlLoad() {
  $('#ks-body').innerHTML = skeleton(3);
  apiC('monitoring.daftar').then(function (rows) {
    if (!$('#ks-body')) return;
    $('#ks-body').innerHTML = '<div class="card">' + (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kasus</th><th>Murid</th><th>Tindak lanjut</th><th>Penanggung jawab</th><th>Status</th><th>Tinjau</th></tr></thead><tbody>' + rows.map(function (x) {
      return '<tr class="click" data-act="kasus-open" data-id="' + esc(x.id_kasus) + '"><td class="mono">' + esc(x.kode) + '</td><td class="fw6">' + esc(x.murid) + '</td><td>' + esc(x.tindak_lanjut) + '</td><td>' + esc(x.pj_nama) + '</td><td><span class="chip ' + (x.status === 'Selesai' ? 'st-Selesai' : x.status === 'Berjalan' ? 'st-Diproses' : 'st-Baru') + '">' + esc(x.status) + '</span></td><td' + (x.lewat ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + esc(fTgl(x.tinjau) || '-') + (x.lewat ? ' <i class="bi bi-alarm"></i>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('bi-list-check', 'Belum ada tindak lanjut')) + '</div>';
  }).catch(function (e) { isiHtml('#ks-body', errBox(e)); });
}

// ── Drawer rincian kasus ──
function openKasus(id, noReload) {
  let dr = P.drawer;
  if (!dr || !document.body.contains(dr.el)) {
    dr = P.drawer = openDrawer({ head: '<div class="grow"><div class="skel" style="height:44px"></div></div>', body: skeleton(3), onClose: function () { P.drawer = null; P.kd = null; } });
  } else { dr.body.innerHTML = skeleton(3); }
  return apiC('kasus.detail', { id: id }).then(function (d) {
    if (!document.body.contains(dr.el)) return;
    P.kd = d; renderKasus(dr, d);
  }).catch(function (e) { dr.close(); fail(e); });
}
function refreshKasus() {
  if (!P.kd) return Promise.resolve();
  const id = P.kd.laporan.id;
  return apiC('kasus.detail', { id: id }).then(function (d) {
    P.kd = d; if (P.drawer && document.body.contains(P.drawer.el)) renderKasus(P.drawer, d);
    if (S.page === 'kasus' && P.ks && P.ks.tab === 'kasus') ksLoad().catch(function () { });
    loadNotif();
  });
}
function secHtml(icon, label, body, extra) { return '<div class="sec"' + (extra || '') + '><div class="lbl"><i class="bi ' + icon + '"></i> ' + label + '</div>' + body + '</div>'; }
function renderKasus(dr, d) {
  const l = d.laporan, m = d.murid, a = d.aksi;
  const head = dr.el.querySelector('.d-head');
  head.innerHTML = '<div class="grow"><div class="row wrap"><span class="mono muted">' + esc(l.kode) + '</span>' + chipUrg(l.urgensi) + chipStatus(l.status) + (d.berulang ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-repeat"></i> Berulang ' + d.ulang + '×</span>' : '') + (l.eskalasi ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-up-right"></i> Eskalasi Waka</span>' : '') + '</div>' +
    '<h2 style="margin-top:6px">' + esc(m.nama) + ' <span class="muted fw6" style="font-size:14px">(' + esc(m.kelas) + ')</span></h2><div class="xs muted">Kategori: ' + esc(l.kategori) + ' · Pelapor: ' + esc(l.pelapor) + ' · ' + esc(fTgl(l.tanggal)) + '</div></div><button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';
  let b = '';
  if (l.modeLabel || l.ditinjau) b += '<div class="note ' + (l.ditinjau ? 'info' : '') + '"><i class="bi ' + (l.ditinjau ? 'bi-check2-all' : 'bi-info-circle') + '"></i><div>' + (l.modeLabel ? '<b>Penanganan pelapor:</b> ' + esc(l.modeLabel) + '.' : '') + (l.ditinjau ? ' <b>Ditinjau Guru BK</b> (' + esc(l.ditinjau.oleh) + ', ' + esc(fTs(l.ditinjau.ts)) + ').' : (hasRole('guru_bk') ? ' Belum ditinjau Guru BK.' : ' Menunggu tinjauan Guru BK.')) + (l.tanggapan_bk ? '<br><b>Pesan BK:</b> ' + esc(l.tanggapan_bk) : '') + '</div></div>';
  if (l.limpah) {
    const lp = l.limpah;
    b += '<div class="note ' + (lp.konfirmasi ? 'info' : 'warn') + ' limpah-note"><i class="bi bi-arrow-left-right"></i><div>' +
      (lp.konfirmasi ? '<b>Wali kelas (' + esc(lp.wali) + ') melaporkan penanganan selesai.</b> ' + (hasRole('guru_bk') ? 'Periksa tindakan wali kelas di bawah, lalu konfirmasi penutupan.' : 'Menunggu konfirmasi Guru BK.')
        : '<b>Dilimpahkan Guru BK ke wali kelas' + (lp.saya ? ' (Anda)' : ' ' + esc(lp.wali)) + '.</b>' + (lp.tinjau ? ' Tinjau bersama BK: <b>' + esc(fTgl(lp.tinjau)) + '</b>.' : '')) +
      (lp.arahan ? '<div class="mt-8"><span class="xs muted">Arahan Guru BK:</span><div class="body" style="line-height:20px">' + esc(lp.arahan) + '</div></div>' : '') + '</div></div>';
  }
  b += secHtml('bi-journal-text', 'Kronologi awal' + (l.jam_ke ? ' · jam ke-' + esc(l.jam_ke) : '') + (l.lokasi ? ' · ' + esc(l.lokasi) : ''), '<div class="body">' + esc(l.kronologi) + '</div>' +
    (d.berkas.length ? '<div class="row wrap mt-12"><span class="xs muted">Lampiran:</span>' + d.berkas.map(function (f) { return '<button class="chip blue" style="border:0;cursor:pointer" data-act="berkas" data-id="' + esc(f.id) + '"><i class="bi bi-paperclip"></i> ' + esc(f.nama) + '</button>'; }).join('') + '</div>' : ''));
  b += secHtml('bi-people', 'Pembimbingan awal (guru / wali kelas)', d.bimbingan.length ? d.bimbingan.map(function (x) {
    return '<div class="mt-8" style="padding-top:8px;border-top:1px dashed var(--border)"><div class="row between"><b class="fw6">' + esc(x.oleh) + '</b><span class="xs muted">' + esc(fTgl(x.tanggal)) + '</span></div><div class="body" style="line-height:20px">' + esc(x.tindakan) + (x.hasil ? '\n→ Hasil: ' + esc(x.hasil) : '') + '</div>' + (x.milik || a.tambahBimbingan ? '<button class="btn sm ghost" data-act="bimb-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Ubah</button>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada catatan pembimbingan awal.</div>');
  b += secHtml('bi-inbox', 'Rujukan ke Guru BK', d.rujukan.length ? d.rujukan.slice().reverse().map(function (r, i) {
    return '<div class="' + (i ? 'mt-8' : '') + '"><div class="row between wrap"><div class="row">' + chipStatus(r.status) + chipUrg(r.urgensi) + '</div><span class="xs muted">' + esc(fTgl(r.tanggal)) + ' · ' + esc(r.pengirim) + '</span></div><div class="body mt-8" style="line-height:20px">' + esc(r.alasan) + '</div>' + (r.ringkasan ? '<div class="xs muted mt-8">Ringkasan bimbingan: ' + esc(r.ringkasan) + '</div>' : '') + (r.tanggapan ? '<div class="note info mt-8"><i class="bi bi-chat-left-text"></i><div>Tanggapan BK: ' + esc(r.tanggapan) + '</div></div>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada rujukan.</div>');
  if (d.poin && d.poin.length) b += secHtml('bi-award', 'Poin tata tertib' + (d.poinRingkas ? ' · poin bersih murid ' + d.poinRingkas.B + (d.poinRingkas.tahap ? ' (' + esc(d.poinRingkas.tahap.n) + ')' : '') : ''), d.poin.map(pnItemHtml).join(''));
  if (hasRole('guru_bk')) {
    b += '<div class="lock"><div class="l-head"><i class="bi bi-lock-fill"></i> Catatan Klinis & Layanan Guru BK <span class="chip purple" style="margin-left:auto">Rahasia</span></div><div class="xs muted mt-8">Hanya Guru BK. Setiap pembukaan dicatat.</div>' +
      (d.layanan.length ? d.layanan.map(function (x) { return '<button class="btn block mt-8" style="justify-content:space-between;height:auto;min-height:40px;white-space:normal;text-align:left" data-act="layanan-buka" data-id="' + esc(x.id) + '"><span>' + esc(fTgl(x.tanggal)) + ' · ' + esc(x.jenis_layanan) + (x.topik ? ' — ' + esc(x.topik) : '') + '</span><i class="bi bi-chevron-right"></i></button>'; }).join('') : '<div class="muted mt-8">Belum ada sesi layanan untuk kasus ini.</div>') + '</div>';
  } else if (d.layananAda) {
    b += '<div class="lock-flat"><i class="bi bi-lock-fill"></i><div><b>Dalam Layanan BK</b><div class="xs">Detail layanan bersifat rahasia dan hanya dapat dibuka oleh Guru BK.</div></div></div>';
  }
  b += secHtml('bi-list-check', 'Tindak lanjut & pemantauan', d.monitoring.length ? d.monitoring.map(function (x) {
    return '<div class="mt-8" style="padding-top:8px;border-top:1px dashed var(--border)"><div class="row between wrap"><b class="fw6">' + esc(x.pj_nama) + '</b><span class="chip ' + (x.status === 'Selesai' ? 'st-Selesai' : x.status === 'Berjalan' ? 'st-Diproses' : 'st-Baru') + '">' + esc(x.status) + '</span></div><div class="body" style="line-height:20px">' + esc(x.tindak_lanjut) + (x.hasil_evaluasi ? '\n→ Evaluasi: ' + esc(x.hasil_evaluasi) : '') + '</div><div class="xs muted">Tinjau berikutnya: ' + esc(fTgl(x.tinjau) || '-') + '</div>' + (a.monitoring ? '<button class="btn sm ghost" data-act="mon-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Ubah</button>' : '') + '</div>';
  }).join('') : '<div class="muted">Belum ada tindak lanjut.</div>');
  b += '<div class="sec"><div class="lbl"><i class="bi bi-activity"></i> Garis waktu penanganan</div>' + timelineHtml(d.timeline) + '</div>';
  dr.body.innerHTML = b;
  const act = [];
  if (a.waliTindak) act.push('<button class="btn primary" data-act="wl-tindak"><i class="bi bi-clipboard-check"></i> Catat tindakan wali kelas</button>');
  if (a.konfirmasi) act.push('<button class="btn primary" data-act="ks-tinjau-buka" data-k="selesai"><i class="bi bi-check2-all"></i> Konfirmasi hasil wali kelas</button>');
  else if (a.tinjau && !l.ditinjau) act.push('<button class="btn primary" data-act="ks-tinjau-buka"><i class="bi bi-eye"></i> Tinjau laporan</button>');
  if (hasRole('guru_bk') && l.status === 'Ditangani Wali Kelas') act.push('<button class="btn primary" data-act="ks-ambil-alih"><i class="bi bi-arrow-left-right"></i> Ambil alih dari wali kelas</button>');
  if (a.limpah && !a.konfirmasi) act.push('<button class="btn teal" data-act="ks-tinjau-buka" data-k="limpah"><i class="bi bi-arrow-left-right"></i> Limpahkan ke wali kelas</button>');
  if (a.tanggapiRujukan) act.push('<button class="btn teal" data-act="rj-tanggapi"><i class="bi bi-reply"></i> Tanggapi rujukan</button>');
  if (a.buatRujukan) act.push('<button class="btn primary" data-act="rj-baru"><i class="bi bi-send"></i> Rujuk ke Guru BK</button>');
  if (a.tambahBimbingan) act.push('<button class="btn" data-act="bimb-baru"><i class="bi bi-plus-circle"></i> Pembimbingan awal</button>');
  if (a.catatLayanan) act.push('<button class="btn purple" data-act="layanan-baru-kasus"><i class="bi bi-journal-plus"></i> Catat layanan</button>');
  if (a.ubahStatus) act.push('<button class="btn" data-act="ks-ubah"><i class="bi bi-arrow-repeat"></i> Ubah status</button>');
  if (a.alihkan) act.push('<button class="btn" data-act="ks-alihkan"><i class="bi bi-arrow-left-right"></i> Alihkan / ambil alih</button>');
  if (a.monitoring) act.push('<button class="btn" data-act="mon-baru"><i class="bi bi-list-check"></i> Tindak lanjut</button>');
  if (a.ortu) act.push('<button class="btn blue" data-act="ortu-dari-kasus"><i class="bi bi-chat-dots"></i> Hubungi orang tua</button>');
  if (a.eskalasi) act.push('<button class="btn soft-danger" data-act="ks-eskalasi"><i class="bi bi-arrow-up-right-circle"></i> Eskalasi Waka</button>');
  act.push('<button class="btn ghost" data-act="open-murid-drawer" data-id="' + esc(m.id) + '"><i class="bi bi-person-lines-fill"></i> Garis waktu murid</button>');
  let foot = dr.el.querySelector('.d-foot');
  if (!foot) { foot = document.createElement('div'); foot.className = 'd-foot'; dr.el.querySelector('.drawer').appendChild(foot); }
  foot.innerHTML = act.join('');
}
function timelineHtml(ev) {
  if (!ev || !ev.length) return '<div class="muted">Belum ada peristiwa.</div>';
  return '<div class="tl">' + ev.map(function (e) {
    return '<div class="tl-item ' + esc(e.warna || 'slate') + '"><div class="t-date">' + esc(fTs(e.ts && e.ts.length > 10 ? e.ts : e.tanggal)) + (e.meta ? ' · ' + esc(e.meta) : '') + '</div><div class="t-title">' + esc(e.judul) + '</div>' + (e.isi ? '<div class="t-body">' + esc(e.isi) + '</div>' : '') + (e.oleh ? '<div class="t-by">' + esc(e.oleh) + '</div>' : '') + '</div>';
  }).join('') + '</div>';
}
ACT.berkas = function (el) { bukaBerkas(el.dataset.id, null); };
ACT['open-murid-drawer'] = function (el) { closeAllOverlays(); navigateTo('riwayat', { id_murid: el.dataset.id }); };
ACT['layanan-buka'] = function (el) { closeAllOverlays(); navigateTo('layanan', { open: el.dataset.id }); };
ACT['layanan-baru-kasus'] = function () { const k = P.kd; closeAllOverlays(); navigateTo('layanan', { kasus: k.laporan.id, murid: { id: k.murid.id, nama: k.murid.nama, kelas: k.murid.kelas } }); };
ACT['ks-tinjau-buka'] = function (el) {
  const k = P.kd, l = k.laporan, pilih = (el && el.dataset.k) || (l.mode === 'info' ? 'tinjau' : 'tangani');
  const konf = k.aksi.konfirmasi;
  const opsi = (konf ? [['selesai', 'Konfirmasi selesai, tutup kasus', 'Penanganan wali kelas sudah memadai.'], ['pantau', 'Pantau dulu', 'Status menjadi Dipantau; BK mengamati perkembangan.'], ['limpah', 'Kembalikan ke wali kelas', 'Wali kelas melanjutkan dengan arahan baru.'], ['tangani', 'Ambil alih oleh BK', 'Status menjadi Diproses dan Anda menjadi penanggung jawab.']]
    : [['tinjau', 'Sudah saya ketahui', 'Status tidak berubah. Pelapor tahu laporannya sudah dibaca.'], ['pantau', 'Pantau', 'Status menjadi Dipantau; cocok bila pembinaan guru sudah memadai tetapi perlu diamati.'], ['tangani', 'Tangani oleh BK', 'Status menjadi Diproses dan Anda menjadi penanggung jawab.'],
      ['limpah', 'Limpahkan ke wali kelas', 'Wali kelas (' + (k.murid.wali || '-') + ') menangani dengan arahan Anda, lalu melapor ke BK. Kasus tetap tercatat atas nama Anda.'], ['selesai', 'Cukup, tutup kasus', 'Pembinaan guru sudah menyelesaikan masalah.']])
    .filter(function (x) { return x[0] !== 'limpah' || k.aksi.limpah || konf; });
  const m = openModal({
    title: konf ? 'Konfirmasi hasil wali kelas' : pilih === 'limpah' ? 'Limpahkan ke wali kelas' : 'Tinjau laporan', sub: l.kode + ' · ' + k.murid.nama + ' (' + k.murid.kelas + ')',
    body: (l.modeLabel && !konf ? '<div class="note info"><i class="bi bi-info-circle"></i><div>' + esc(l.modeLabel) + '</div></div>' : '') +
      '<form id="f-tj" class="form-grid mt-12"><div class="field"><span class="flabel">Keputusan Guru BK</span><div class="col gap-8">' +
      opsi.map(function (x) {
        return '<label class="pick-row"><input type="radio" name="keputusan" value="' + x[0] + '"' + (x[0] === pilih ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + esc(x[2]) + '</small></span></label>';
      }).join('') + '</div></div>' +
      '<div id="tj-limpah" class="form-grid">' + fld({ name: 'arahan', label: 'Arahan untuk wali kelas', type: 'textarea', rows: 3, max: 800, req: true, ph: 'Mis. Mohon temui ananda dan pantau kehadiran 2 minggu; hubungi orang tua bila alpa lagi. Laporkan hasilnya ke BK.' }) +
        fld({ name: 'tinjau', label: 'Tinjau bersama BK pada', type: 'date', req: true, value: addD(S.today, 7), min: S.today, hint: 'Wali kelas dan Anda diingatkan lewat lonceng pada tanggal ini.' }) + '</div>' +
      '<div id="tj-pesan">' + fld({ name: 'pesan', label: 'Pesan untuk pelapor (opsional)', type: 'textarea', rows: 3, max: 800, ph: 'Mis. Terima kasih, pembinaan sudah tepat. BK akan memantau kehadiran ananda.' }) + '</div>' +
      '<div class="xs muted">Wali kelas diberi tahu lewat lonceng di aplikasi (tanpa email).</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tj-ok">Simpan</button>'
  });
  const f = $('#f-tj', m.el);
  const atur = function () {
    const v = ($('input[name=keputusan]:checked', f) || {}).value;
    $('#tj-limpah', m.el).style.display = v === 'limpah' ? '' : 'none';
    $('#tj-pesan', m.el).style.display = v === 'limpah' ? 'none' : '';
  };
  f.addEventListener('change', atur); atur();
  $('#tj-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f);
    d.keputusan = ($('input[name=keputusan]:checked', f) || {}).value; d.id = l.id;
    if (d.keputusan === 'limpah') {
      if (!d.arahan) { toast('Tuliskan arahan untuk wali kelas.', 'err'); return; }
      d.pesan = d.arahan;
    }
    run(e.currentTarget, api('kasus.tinjau', d)).then(function () {
      m.close();
      toast(d.keputusan === 'limpah' ? 'Kasus dilimpahkan. Wali kelas diberi tahu lewat lonceng.' : d.keputusan === 'selesai' && konf ? 'Kasus ditutup.' : 'Tinjauan tersimpan dan pelapor diberi tahu.');
      refreshKasus();
    }).catch(fail);
  });
};
ACT['ks-ambil-alih'] = function (el) {
  const l = P.kd.laporan;
  confirmDlg('Kasus ini sedang ditangani wali kelas (' + (l.limpah ? l.limpah.wali : '') + '). Ambil alih dan tangani sendiri oleh Guru BK? Tindak lanjut wali kelas ditutup dan catatannya tetap tersimpan.', 'Ambil alih', false, 'Ambil alih kasus').then(function (ok) {
    if (ok) run(el, api('kasus.tinjau', { id: l.id, keputusan: 'tangani' })).then(function () { toast('Kasus diambil alih Guru BK (status Diproses).'); refreshKasus(); }).catch(fail);
  });
};
ACT['wl-tindak'] = function () {
  const k = P.kd, l = k.laporan;
  const m = openModal({
    title: 'Catat tindakan wali kelas', sub: l.kode + ' · ' + k.murid.nama + ' (' + k.murid.kelas + ')',
    body: (l.limpah && l.limpah.arahan ? '<div class="note info"><i class="bi bi-info-circle"></i><div><b>Arahan Guru BK:</b> ' + esc(l.limpah.arahan) + '</div></div>' : '') +
      '<form id="f-wl" class="form-grid mt-12">' +
      fld({ name: 'tindakan', label: 'Tindakan yang Anda lakukan', type: 'textarea', rows: 3, max: 1500, req: true, ph: 'Mis. Memanggil ananda setelah jam pelajaran, menanyakan penyebab sering terlambat, menghubungi ibunya lewat WA.' }) +
      fld({ name: 'hasil', label: 'Hasil / keterangan', type: 'textarea', rows: 2, max: 1500, ph: 'Mis. Ananda berjanji datang tepat waktu; orang tua akan mengantar.' }) +
      '<div class="field"><span class="flabel">Langkah berikutnya</span><div class="col gap-8">' +
      [['catat', 'Masih berjalan', 'Catatan disimpan; Anda melanjutkan penanganan.'], ['selesai', 'Selesai, laporkan ke BK', 'Guru BK akan mengonfirmasi penutupan kasus.'], ['kembali', 'Kembalikan ke BK', 'Perlu penanganan Guru BK (tuliskan alasannya di Hasil/keterangan).']].map(function (x, i) {
        return '<label class="pick-row"><input type="radio" name="keputusan" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></label>';
      }).join('') + '</div></div>' +
      '<div id="wl-tgl">' + fld({ name: 'tinjau', label: 'Tinjau lagi pada (opsional)', type: 'date', min: S.today, value: l.limpah && l.limpah.tinjau >= S.today ? l.limpah.tinjau : '' }) + '</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="wl-ok">Simpan</button>'
  });
  const f = $('#f-wl', m.el);
  f.addEventListener('change', function () { $('#wl-tgl', m.el).style.display = (($('input[name=keputusan]:checked', f) || {}).value === 'catat') ? '' : 'none'; });
  $('#wl-ok', m.el).addEventListener('click', function (e) {
    const d = formData(f); d.keputusan = ($('input[name=keputusan]:checked', f) || {}).value; d.id_kasus = l.id;
    if (!d.tindakan) { toast('Isi tindakan yang Anda lakukan.', 'err'); return; }
    if (d.keputusan === 'kembali' && !d.hasil) { toast('Tuliskan alasan dikembalikan ke BK.', 'err'); return; }
    run(e.currentTarget, api('wali.tindak', d)).then(function () {
      m.close(); toast(d.keputusan === 'catat' ? 'Tindakan tersimpan.' : d.keputusan === 'selesai' ? 'Dilaporkan ke Guru BK untuk dikonfirmasi.' : 'Kasus dikembalikan ke Guru BK.');
      refreshKasus();
    }).catch(fail);
  });
};
ACT['ortu-dari-kasus'] = function () { const k = P.kd; waModal({ id_murid: k.murid.id, id_kasus: k.laporan.id }); };

// ── Tindakan pada kasus ──
ACT['rj-baru'] = function () { const k = P.kd; openRujukanModal(k.laporan.id, k.laporan.kode, k.laporan.urgensi, refreshKasus); };
ACT['rj-tanggapi'] = function () {
  const k = P.kd; const r = k.rujukan.filter(function (x) { return x.status === 'Baru' || x.status === 'Ditunda'; }).slice(-1)[0]; if (!r) return;
  const m = openModal({
    title: 'Tanggapi rujukan', sub: k.laporan.kode + ' · ' + k.murid.nama,
    body: '<div class="note info"><i class="bi bi-inbox"></i><div><b>Alasan rujukan:</b> ' + esc(r.alasan) + (r.ringkasan ? '<br><span class="muted">Ringkasan bimbingan: ' + esc(r.ringkasan) + '</span>' : '') + '</div></div><form class="form-grid mt-12" id="f-tg" novalidate>' +
      '<div class="field"><span class="flabel">Keputusan</span><div class="checks">' + [['terima', 'Terima'], ['tunda', 'Tunda'], ['tolak', 'Tolak']].map(function (x, i) { return '<label class="check"><input type="radio" name="aksi" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') + '</div></div>' +
      fld({ name: 'alasan', label: 'Alasan / catatan', type: 'textarea', rows: 3, max: 800, hint: 'Wajib diisi bila rujukan ditunda atau ditolak.' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn teal" id="tg-ok">Kirim tanggapan</button>'
  });
  $('#tg-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-tg', m.el); const d = formData(f);
    d.aksi = ($('input[name=aksi]:checked', f) || {}).value;
    if (d.aksi !== 'terima' && !d.alasan.trim()) { setErr(f, 'alasan', 'Alasan wajib diisi untuk menunda atau menolak.'); return; }
    d.id = r.id;
    run(e.currentTarget, api('rujukan.tanggapi', d)).then(function () { m.close(); toast('Tanggapan terkirim.'); refreshKasus(); }).catch(fail);
  });
};
ACT['ks-ubah'] = function () {
  const k = P.kd;
  const m = openModal({
    title: 'Ubah status kasus', sub: k.laporan.kode,
    body: '<form id="f-st" class="form-grid">' + fld({ name: 'status', label: 'Status baru', type: 'select', req: true, value: ['Ditangani Wali Kelas', 'Menunggu Konfirmasi BK'].indexOf(k.laporan.status) >= 0 ? 'Diproses' : k.laporan.status, opts: S.refs.statusKasus.filter(function (s) { return ['Eskalasi', 'Ditangani Wali Kelas', 'Menunggu Konfirmasi BK'].indexOf(s) < 0; }) }) + '</form><div class="xs muted mt-12">Pelapor dan wali kelas diberi tahu lewat email bila status berubah.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="st-ok">Simpan</button>'
  });
  $('#st-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-st', m.el));
    const go = function () { run(e.currentTarget, api('kasus.ubahStatus', { id: k.laporan.id, status: d.status })).then(function () { m.close(); toast('Status diperbarui.'); refreshKasus(); }).catch(fail); };
    if (d.status === 'Selesai') confirmDlg('Menandai kasus selesai tidak dapat dibuka kembali dari sini. Lanjutkan?', 'Tandai selesai').then(function (ok) { if (ok) go(); }); else go();
  });
};
ACT['ks-alihkan'] = function () {
  const k = P.kd;
  apiC('bk.daftar').then(function (bks) {
    const pj = k.laporan.penangani || '';
    const m = openModal({
      title: 'Alihkan penanganan kasus', sub: k.laporan.kode + ' · ' + k.murid.nama,
      body: '<div class="note"><i class="bi bi-info-circle"></i><div>Penanggung jawab saat ini: <b>' + esc(pj || 'belum ditentukan') + '</b>. Guru BK tujuan akan menerima email, dan peralihan tercatat di log.</div></div><form id="f-al" class="form-grid mt-12">' +
        fld({ name: 'email', label: 'Guru BK tujuan', type: 'select', blank: 'Saya sendiri (ambil alih)', opts: bks.filter(function (x) { return x.email !== S.user.email; }).map(function (x) { return { v: x.email, l: x.nama }; }) }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="al-ok">Alihkan</button>'
    });
    $('#al-ok', m.el).addEventListener('click', function (e) {
      const d = formData($('#f-al', m.el));
      run(e.currentTarget, api('kasus.alihkan', { id: k.laporan.id, email: d.email })).then(function (r) { m.close(); toast('Kasus kini ditangani ' + r.penangani + '.'); refreshKasus(); }).catch(fail);
    });
  }).catch(fail);
};
ACT['ks-eskalasi'] = function () {
  const k = P.kd;
  const m = openModal({
    title: 'Eskalasi ke Waka Kesiswaan', sub: k.laporan.kode + ' · ' + k.murid.nama,
    body: '<div class="note"><i class="bi bi-exclamation-triangle"></i><div>Waka Kesiswaan hanya akan melihat kronologi, rujukan, dan tindak lanjut. <b>Isi konseling tetap rahasia.</b></div></div><form id="f-es" class="form-grid mt-12">' + fld({ name: 'alasan', label: 'Alasan eskalasi', type: 'textarea', req: true, rows: 3, max: 1000 }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn danger" id="es-ok">Eskalasikan</button>'
  });
  $('#es-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-es', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 5 } })) return;
    d.id = k.laporan.id;
    run(e.currentTarget, api('kasus.eskalasi', d)).then(function () { m.close(); toast('Kasus dieskalasikan ke Waka Kesiswaan.'); refreshKasus(); }).catch(fail);
  });
};
function bimbModal(x) {
  const k = P.kd;
  const m = openModal({
    title: x ? 'Ubah pembimbingan awal' : 'Pembimbingan awal', sub: k.laporan.kode,
    body: '<form id="f-bm" class="form-grid">' + fld({ name: 'tindakan', label: 'Tindakan yang dilakukan', type: 'textarea', req: true, rows: 4, max: 1500, value: x ? x.tindakan : '', ph: 'mis. Dipanggil ke ruang guru untuk teguran lisan tingkat 1.' }) + fld({ name: 'hasil', label: 'Hasil / respons murid', type: 'textarea', rows: 3, max: 1500, value: x ? x.hasil : '' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="bm-ok">Simpan</button>'
  });
  $('#bm-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-bm', m.el), d = formData(f);
    if (!validate(f, d, { tindakan: { label: 'Tindakan', req: true, min: 5 } })) return;
    d.id_laporan = k.laporan.id; if (x) d.id = x.id;
    run(e.currentTarget, api('bimbingan.simpan', d)).then(function () { m.close(); toast('Pembimbingan tersimpan.'); refreshKasus(); }).catch(fail);
  });
}
ACT['bimb-baru'] = function () { bimbModal(null); };
ACT['bimb-edit'] = function (el) { bimbModal(P.kd.bimbingan.filter(function (b) { return b.id === el.dataset.id; })[0]); };
function monModal(x) {
  const k = P.kd;
  const open = function (staff) {
    const meEmail = S.user.email;
    const pjOpts = staff.length ? staff.map(function (s) { return { v: s.email, l: s.nama + ' — ' + s.peran }; }) : [{ v: meEmail, l: S.user.nama }];
    const m = openModal({
      title: x ? 'Ubah tindak lanjut' : 'Tindak lanjut baru', sub: k.laporan.kode,
      body: '<form id="f-mn" class="form-grid">' + fld({ name: 'tindak_lanjut', label: 'Tindak lanjut', type: 'textarea', req: true, rows: 3, max: 1500, value: x ? x.tindak_lanjut : '' }) +
        (hasRole('guru_bk') ? fld({ name: 'penanggung_jawab', label: 'Penanggung jawab', type: 'select', value: x ? x.penanggung_jawab : meEmail, opts: pjOpts }) : '') +
        '<div class="form-grid c2">' + fld({ name: 'status', label: 'Status', type: 'select', value: x ? x.status : 'Berjalan', opts: ['Direncanakan', 'Berjalan', 'Selesai'] }) + fld({ name: 'tanggal_tinjau_berikut', label: 'Tinjau berikutnya', type: 'date', value: x ? x.tinjau : addD(S.today, 7), min: S.today }) + '</div>' +
        fld({ name: 'hasil_evaluasi', label: 'Hasil evaluasi (bila ada)', type: 'textarea', rows: 2, max: 1500, value: x ? x.hasil_evaluasi : '' }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="mn-ok">Simpan</button>'
    });
    $('#mn-ok', m.el).addEventListener('click', function (e) {
      const f = $('#f-mn', m.el), d = formData(f);
      if (!validate(f, d, { tindak_lanjut: { label: 'Tindak lanjut', req: true, min: 5 }, tanggal_tinjau_berikut: { label: 'Tanggal tinjau', fn: function () { return ''; } } })) return;
      if (d.status !== 'Selesai' && !d.tanggal_tinjau_berikut) { setErr(f, 'tanggal_tinjau_berikut', 'Wajib diisi bila belum selesai.'); return; }
      d.id_kasus = k.laporan.id; if (x) d.id = x.id;
      run(e.currentTarget, api('monitoring.simpan', d)).then(function () { m.close(); toast('Tindak lanjut tersimpan.'); refreshKasus(); }).catch(fail);
    });
  };
  if (hasRole('guru_bk')) apiC('pengguna.ringkas').then(open).catch(function () { open([]); }); else open([]);
}
ACT['mon-baru'] = function () { monModal(null); };
ACT['mon-edit'] = function (el) { monModal(P.kd.monitoring.filter(function (b) { return b.id === el.dataset.id; })[0]); };
