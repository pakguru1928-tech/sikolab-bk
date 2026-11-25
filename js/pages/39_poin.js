/* SIKOLAB BK v1.15 — js/pages/39_poin.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.10 — Sistem Poin Tata Tertib (pilihan sekolah). Semua guru mencatat; Guru BK memverifikasi.
// ════════════════════════════════════════════════════════════
const PN_TABS = [['daftar', 'Daftar murid', 'bi-people', 'daftar'], ['verifikasi', 'Verifikasi', 'bi-patch-check', 'verif'], ['catat', 'Catat poin', 'bi-plus-lg', 'catat'], ['saya', 'Catatan saya', 'bi-journal-text', 'catat'], ['rekap', 'Rekap', 'bi-bar-chart', 'rekap'], ['aturan', 'Aturan & tahapan', 'bi-sliders', '']];
function pnStatus(st) { return '<span class="chip ' + ({ Menunggu: 'st-Baru', Sah: 'st-Selesai', Ditolak: 'st-Ditolak', Dibatalkan: 'neutral' }[st] || 'neutral') + '">' + esc(st === 'Menunggu' ? 'Menunggu verifikasi' : st) + '</span>'; }
function pnJenis(j, p) { const r = j === 'Prestasi'; return '<span class="chip ' + (r ? 'kc-teal' : 'kc-amber') + '"><i class="bi ' + (r ? 'bi-award' : 'bi-exclamation-triangle') + '"></i> ' + (r ? '−' : '+') + esc(p) + '</span>'; }
function pnTahapChip(n) { return n ? '<span class="chip st-Eskalasi">' + esc(n) + '</span>' : '<span class="muted xs">—</span>'; }
function pnAturanOpts(list, jenis, val) {
  const g = {};
  list.filter(function (a) { return a.j === jenis && a.a !== 0; }).forEach(function (a) { (g[a.g] = g[a.g] || []).push(a); });
  return Object.keys(g).map(function (k) { return '<optgroup label="' + esc(k) + '">' + g[k].map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === val ? ' selected' : '') + '>' + esc((a.k ? a.k + ' · ' : '') + a.n + ' (' + (jenis === 'R' ? '−' : '+') + a.p + ')') + '</option>'; }).join('') + '</optgroup>'; }).join('');
}
PAGES.poin = function (params, tok) {
  return apiC('poin.meta', {}).then(function (meta) {
    if (stale(tok)) return;
    const b = meta.boleh;
    const tabs = PN_TABS.filter(function (t) { return !t[3] || b[t[3]]; });
    let tab = params.tab && tabs.some(function (t) { return t[0] === params.tab; }) ? params.tab : (b.verif && meta.menunggu ? 'verifikasi' : tabs[0][0]);
    P.pn = { meta: meta, tab: tab, murid: params.id_murid || '' };
    $('#app-container').innerHTML = pageHead('Tata tertib', 'Poin Murid', 'Periode berjalan: ' + meta.periode + '. Poin dihitung setelah diverifikasi Guru BK; prestasi mengurangi poin pelanggaran.', '') +
      '<div class="tabs mb-16" id="pn-tabs">' + tabs.map(function (t) { return '<button class="tab ' + (t[0] === tab ? 'active' : '') + '" data-act="pn-tab" data-t="' + t[0] + '"><i class="bi ' + t[2] + '"></i> ' + t[1] + (t[0] === 'verifikasi' && meta.menunggu ? ' <span class="chip st-Baru" style="margin-left:4px">' + meta.menunggu + '</span>' : '') + '</button>'; }).join('') + '</div><div id="pn-body"></div>';
    pnDraw();
    if (params.id_murid) pnMurid(params.id_murid);
  });
};
ACT['pn-tab'] = function (el) { P.pn.tab = el.dataset.t; $$('#pn-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); pnDraw(); };
function pnDraw() {
  const t = P.pn.tab;
  $('#pn-body').innerHTML = skeleton(2);
  if (t === 'daftar') return pnDaftar();
  if (t === 'verifikasi') return pnVerif();
  if (t === 'catat') return pnCatat();
  if (t === 'saya') return pnSaya();
  if (t === 'rekap') return pnRekap();
  if (t === 'aturan') return pnAturan($('#pn-body'), P.pn.meta);
}
// ── Daftar murid ──
function pnDaftar() {
  return apiC('poin.daftar', { id_kelas: P.pn.kelas || '' }).then(function (d) {
    P.pn.d = d;
    const f = P.pn.f || 'berpoin';
    $('#pn-body').innerHTML = (d.perTahap.length ? '<div class="grid g-kpi k4">' + d.perTahap.map(function (x, i) { return '<div class="kpi ' + ['amber', 'rose', 'rose', 'indigo', 'indigo', 'indigo', 'indigo', 'indigo'][i] + '" style="cursor:pointer" data-act="pn-f" data-f="t' + i + '"><span class="k-ic"><i class="bi bi-flag"></i></span><div class="k-lb">' + esc(x.n) + '</div><div><div class="k-v">' + x.jml + '</div><div class="k-s">murid · mulai ' + x.p + ' poin</div></div></div>'; }).join('') + '</div>' : '') +
      '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div class="fchips" id="pn-fc">' + [['berpoin', 'Punya poin'], ['', 'Semua murid'], ['menunggu', 'Ada yang menunggu']].map(function (x) { return '<button class="fchip ' + (x[0] === f ? 'active' : '') + '" data-act="pn-f" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row wrap" style="gap:8px">' + (d.kelas.length > 1 ? '<select class="select" id="pn-kls" style="width:auto;min-height:40px"><option value="">Semua kelas</option>' + d.kelas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === P.pn.kelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select>' : '') +
      '<div class="search" style="max-width:220px"><i class="bi bi-search"></i><input id="pn-q" type="search" placeholder="Cari murid…" value="' + esc(P.pn.q || '') + '"></div></div></div><div id="pn-list"></div></div>';
    const sel = $('#pn-kls'); if (sel) sel.addEventListener('change', function (e) { P.pn.kelas = e.target.value; pnDaftar(); });
    $('#pn-q').addEventListener('input', debounce(function (e) { P.pn.q = e.target.value.trim(); pnDaftarList(); }, 200));
    pnDaftarList();
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
ACT['pn-f'] = function (el) { P.pn.f = el.dataset.f; $$('#pn-fc .fchip').forEach(function (b) { b.classList.toggle('active', b.dataset.f === el.dataset.f); }); pnDaftarList(); };
function pnDaftarList() {
  const d = P.pn.d, f = P.pn.f === undefined ? 'berpoin' : P.pn.f, q = (P.pn.q || '').toLowerCase();
  const rows = d.rows.filter(function (r) {
    if (q && (r.nama + ' ' + r.nis).toLowerCase().indexOf(q) < 0) return false;
    if (f === 'berpoin') return r.L || r.R || r.menunggu;
    if (f === 'menunggu') return r.menunggu > 0;
    if (f.charAt(0) === 't') return r.tahap === +f.substr(1);
    return true;
  });
  $('#pn-list').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:640px"><thead><tr><th>Murid</th><th>Kelas</th><th style="text-align:right">Pelanggaran</th><th style="text-align:right">Prestasi</th><th style="text-align:right">Poin bersih</th><th>Tahap</th><th>Menunggu</th></tr></thead><tbody>' +
    rows.slice(0, 400).map(function (r) {
      return '<tr class="click" data-act="pn-murid" data-id="' + esc(r.id) + '" style="cursor:pointer"><td><div class="fw6">' + esc(r.nama) + '</div><div class="xs muted">NIS ' + esc(r.nis) + '</div></td><td>' + esc(r.kelas) + '</td><td style="text-align:right">' + (r.L ? '+' + r.L : '<span class="muted">0</span>') + '</td><td style="text-align:right">' + (r.R ? '−' + r.R : '<span class="muted">0</span>') + '</td><td style="text-align:right"><b style="font-size:16px">' + r.B + '</b></td><td>' + pnTahapChip(r.tahapNama) + '</td><td>' + (r.menunggu ? '<span class="chip st-Baru">' + r.menunggu + '</span>' : '<span class="muted xs">—</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-award', f === 'berpoin' ? 'Belum ada murid dengan catatan poin' : 'Tidak ada murid yang cocok', 'Periode: ' + d.periode) + '</div>';
}
ACT['pn-murid'] = function (el) { pnMurid(el.dataset.id); };
function pnMurid(id, semua) {
  const dr = openDrawer({ head: '<div class="grow"><h3>Poin murid</h3></div>', body: skeleton(2) });
  api('poin.murid', { id_murid: id, semua: semua ? 1 : 0 }).then(function (d) {
    const m = d.murid, r = d.ringkas, meta = P.pn ? P.pn.meta : null;
    dr.el.querySelector('.d-head').innerHTML = '<div class="grow"><h2>' + esc(m.nama) + '</h2><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + (r ? ' · ' + esc(r.periode) : '') + '</div></div><button class="icon-btn" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';
    let h = '';
    if (r) {
      const maks = r.berikut ? r.berikut.p : Math.max(r.B, 1);
      h += '<div class="stat-row s3"><div class="stat"><span class="lbl">Poin bersih</span><b>' + r.B + '</b>' + (r.menunggu ? '<span class="xs muted">' + r.menunggu + ' catatan menunggu</span>' : '') + '</div><div class="stat"><span class="lbl">Pelanggaran</span><b>' + (r.L ? '+' + r.L : 0) + '</b></div><div class="stat"><span class="lbl">Prestasi</span><b>' + (r.R ? '−' + r.R : 0) + '</b></div></div>' +
        '<div class="sec mt-12"><div class="row between wrap"><div>' + (r.tahap ? '<span class="chip st-Eskalasi">' + esc(r.tahap.n) + '</span>' : '<span class="chip st-Selesai">Belum mencapai tahap pembinaan</span>') + '</div>' + (r.berikut ? '<span class="xs muted">' + (r.berikut.p - r.B) + ' poin lagi menuju ' + esc(r.berikut.n) + '</span>' : '') + '</div>' +
        '<div class="bar mt-8"><i style="width:' + Math.min(100, Math.round(r.B * 100 / maks)) + '%"></i></div>' + (r.tahap && r.tahap.t ? '<div class="body mt-8" style="line-height:20px"><b>Tindak lanjut:</b> ' + esc(r.tahap.t) + '</div>' : '') + '</div>';
    } else h += '<div class="note info"><i class="bi bi-info-circle"></i><div>Anda melihat catatan poin yang Anda buat sendiri. Rekap lengkap hanya untuk Guru BK, Waka, wali kelas murid ini, dan admin.</div></div>';
    h += '<div class="row wrap mt-12">' + (meta && meta.boleh.catat ? '<button class="btn primary" data-act="pn-catat-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '" data-k="' + esc(m.kelas) + '"><i class="bi bi-plus-lg"></i> Catat poin</button>' : '') +
      (r && (hasRole('wali_kelas') || hasRole('guru_bk')) ? '<button class="btn blue" data-act="wa-murid" data-id="' + esc(m.id) + '" data-t="poin"><i class="bi bi-whatsapp"></i> Beri tahu orang tua</button>' : '') +
      '<button class="btn ghost" data-act="open-murid" data-id="' + esc(m.id) + '"><i class="bi bi-activity"></i> Garis waktu</button></div>';
    h += '<div class="row between mt-16"><h3>Catatan ' + (semua ? 'semua periode' : 'periode ini') + '</h3><button class="btn sm ghost" data-act="pn-murid-semua" data-id="' + esc(m.id) + '" data-s="' + (semua ? '' : '1') + '">' + (semua ? 'Periode ini saja' : 'Tampilkan semua periode') + '</button></div>';
    h += d.rows.length ? d.rows.map(pnItemHtml).join('') : empty('bi-journal', 'Belum ada catatan poin');
    dr.body.innerHTML = h;
    P.pnDr = { dr: dr, id: id, semua: semua };
  }).catch(function (e) { dr.body.innerHTML = errBox(e); });
}
ACT['pn-murid-semua'] = function (el) { if (P.pnDr) P.pnDr.dr.close(); pnMurid(el.dataset.id, !!el.dataset.s); };
function pnItemHtml(x) {
  return '<div class="sec mt-8' + (x.periodeIni === false ? ' dibaca' : '') + '"><div class="row between wrap" style="gap:6px"><div class="row wrap" style="gap:6px">' + pnJenis(x.jenis, x.poin) + pnStatus(x.status) + (x.kodeKasus ? '<button class="chip blue" style="border:0;cursor:pointer" data-act="kasus-open-nav" data-id="' + esc(x.id_laporan) + '">' + esc(x.kodeKasus) + '</button>' : '') + '</div><span class="xs muted">' + esc(fTgl(x.tanggal)) + (x.jam ? ' · ' + esc(x.jam) : '') + '</span></div>' +
    '<div class="fw6 mt-8">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</div><div class="body" style="line-height:20px">' + esc(x.uraian) + '</div>' +
    '<div class="xs muted mt-8">Dicatat ' + esc(x.pencatat) + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + (x.verif ? ' · ' + (x.status === 'Sah' ? 'disahkan' : x.status === 'Ditolak' ? 'ditolak' : 'diproses') + ' ' + esc(x.verif) : '') + (x.catatan_verif ? ' — ' + esc(x.catatan_verif) : '') + '</div>' +
    '<div class="row wrap mt-8" style="gap:6px">' + (x.id_berkas ? '<button class="btn sm" data-act="berkas" data-id="' + esc(x.id_berkas) + '"><i class="bi bi-paperclip"></i> Lampiran</button>' : '') + (x.status === 'Menunggu' && hasRole('guru_bk') ? '<button class="btn sm primary" data-act="pn-sah1" data-id="' + esc(x.id) + '"><i class="bi bi-check-lg"></i> Sahkan</button><button class="btn sm" data-act="pn-tolak1" data-id="' + esc(x.id) + '"><i class="bi bi-x-lg"></i> Tolak</button>' : '') + (x.bolehBatal ? '<button class="btn sm ghost" data-act="pn-batal" data-id="' + esc(x.id) + '"><i class="bi bi-arrow-counterclockwise"></i> Batalkan</button>' : '') + '</div></div>';
}
function pnSegarkan() { ccClear('poin.catat'); if (P.pnDr && document.body.contains(P.pnDr.dr.el)) { P.pnDr.dr.close(); pnMurid(P.pnDr.id, P.pnDr.semua); } if (S.page === 'poin') navigateTo('poin', { tab: P.pn.tab }, true, true); else if (S.page === 'kasus' || S.page === 'riwayat') navigateTo(S.page, S.params, true, true); loadNotif(); }
ACT['pn-sah1'] = function (el) { run(el, api('poin.putus', { ids: [el.dataset.id], keputusan: 'sah' })).then(function () { toast('Poin disahkan.'); pnSegarkan(); }).catch(fail); };
ACT['pn-tolak1'] = function (el) { pnTolak([el.dataset.id]); };
function pnTolak(ids) {
  const m = openModal({ title: 'Tolak catatan poin', sub: ids.length + ' catatan', body: '<form id="f-pt" class="form-grid" novalidate>' + fld({ name: 'alasan', label: 'Alasan penolakan', req: true, max: 300, type: 'textarea', rows: 2, ph: 'mis. Duplikat dengan catatan Bu Rina pada hari yang sama' }) + '<div class="fchips wrapc">' + ['Duplikat', 'Bukan pelanggaran tata tertib', 'Murid salah', 'Kurang bukti/uraian'].map(function (x) { return '<button type="button" class="fchip" data-alasan="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div></form>', foot: '<button class="btn" data-close>Batal</button><button class="btn danger" id="pt-ok">Tolak</button>' });
  $$('[data-alasan]', m.el).forEach(function (b) { b.addEventListener('click', function () { $('[name=alasan]', m.el).value = b.dataset.alasan; }); });
  $('#pt-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pt', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('poin.putus', { ids: ids, keputusan: 'tolak', alasan: d.alasan })).then(function (r) { m.close(); toast(r.n + ' catatan ditolak.'); pnSegarkan(); }).catch(fail);
  });
}
ACT['pn-batal'] = function (el) {
  const m = openModal({ title: 'Batalkan catatan poin', body: '<form id="f-pb" class="form-grid" novalidate>' + fld({ name: 'alasan', label: 'Alasan pembatalan', req: true, max: 300, ph: 'mis. Salah memilih murid' }) + '</form>', foot: '<button class="btn" data-close>Kembali</button><button class="btn danger" id="pb-ok">Batalkan catatan</button>' });
  $('#pb-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pb', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('poin.batal', { id: el.dataset.id, alasan: d.alasan })).then(function () { m.close(); toast('Catatan dibatalkan.'); pnSegarkan(); }).catch(fail);
  });
};
// ── Verifikasi Guru BK ──
function pnVerif() {
  return api('poin.verifikasi', {}).then(function (d) {
    P.pn.v = d; P.pn.pilih = {};
    if (!d.rows.length) { $('#pn-body').innerHTML = '<div class="card pad">' + empty('bi-patch-check', 'Tidak ada catatan yang menunggu verifikasi', 'Catatan poin dari guru akan muncul di sini.') + '</div>'; return; }
    const kembar = d.rows.filter(function (r) { return r.kembar.length; }).length;
    $('#pn-body').innerHTML = '<div class="note info"><i class="bi bi-info-circle"></i><div>Periksa setiap catatan, lalu <b>Sahkan</b> agar poin dihitung, atau <b>Tolak</b> dengan alasan.' + (kembar ? ' <b>' + kembar + ' catatan</b> ditandai <b>kemungkinan duplikat</b> (murid, butir aturan, dan tanggal sama); biasanya cukup sahkan satu dan tolak sisanya.' : '') + '</div></div>' +
      '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><label class="check"><input type="checkbox" id="pv-all"> Pilih semua (' + d.rows.length + ')</label><div class="row wrap" style="gap:8px"><button class="btn" data-act="pv-tolak"><i class="bi bi-x-lg"></i> Tolak terpilih</button><button class="btn primary" data-act="pv-sah"><i class="bi bi-check-lg"></i> Sahkan terpilih</button></div></div><div class="card-body" id="pv-list">' +
      d.rows.map(function (x, i) {
        return '<div class="sec mt-8"' + (x.kembar.length ? ' style="border-left:3px solid var(--amber,#F59E0B)"' : '') + '><div class="row between wrap" style="gap:8px"><label class="check"><input type="checkbox" data-pv="' + i + '"> <b>' + esc(x.nama) + '</b> <span class="xs muted">' + esc(x.kelas) + '</span></label><div class="row wrap" style="gap:6px">' + pnJenis(x.jenis, x.poin) + '<span class="xs muted">' + x.poinKini + ' → <b>' + x.poinSesudah + '</b> poin</span></div></div>' +
          '<div class="fw6 mt-8">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</div><div class="body" style="line-height:20px">' + esc(x.uraian) + '</div>' +
          '<div class="xs muted mt-8">' + esc(fTgl(x.tanggal)) + (x.jam ? ' · ' + esc(x.jam) : '') + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + ' · dicatat ' + esc(x.pencatat) + (x.kodeKasus ? ' · dari laporan ' + esc(x.kodeKasus) : '') + '</div>' +
          (x.kembar.length ? '<div class="note warn mt-8"><i class="bi bi-files"></i><div><b>Kemungkinan duplikat.</b> ' + x.kembar.map(function (k) { return esc(k.pencatat) + ' (' + esc(k.status === 'Sah' ? 'sudah sah' : 'menunggu') + (k.jam ? ', ' + esc(k.jam) : '') + (k.lebihAwal ? ', dicatat lebih dulu' : '') + '): "' + esc(k.uraian) + '"'; }).join('<br>') + '</div></div>' : '') +
          '<div class="row wrap mt-8" style="gap:6px">' + (x.id_berkas ? '<button class="btn sm" data-act="berkas" data-id="' + esc(x.id_berkas) + '"><i class="bi bi-paperclip"></i> Lampiran</button>' : '') + (x.kodeKasus ? '<button class="btn sm" data-act="kasus-open-nav" data-id="' + esc(x.id_laporan) + '"><i class="bi bi-folder2-open"></i> Buka laporan</button>' : '') + '<button class="btn sm" data-act="pv-ganti" data-i="' + i + '"><i class="bi bi-pencil"></i> Ganti butir</button><button class="btn sm" data-act="pn-tolak1" data-id="' + esc(x.id) + '"><i class="bi bi-x-lg"></i> Tolak</button><button class="btn sm primary" data-act="pn-sah1" data-id="' + esc(x.id) + '"><i class="bi bi-check-lg"></i> Sahkan</button></div></div>';
      }).join('') + '</div></div>';
    $('#pv-all').addEventListener('change', function (e) { $$('[data-pv]').forEach(function (c) { c.checked = e.target.checked; }); });
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
function pvTerpilih() { return $$('[data-pv]').filter(function (c) { return c.checked; }).map(function (c) { return P.pn.v.rows[+c.dataset.pv].id; }); }
ACT['pv-sah'] = function (el) { const ids = pvTerpilih(); if (!ids.length) { toast('Pilih catatan terlebih dahulu.', 'warn'); return; } run(el, api('poin.putus', { ids: ids, keputusan: 'sah' })).then(function (r) { toast(r.n + ' catatan disahkan.'); pnSegarkan(); }).catch(fail); };
ACT['pv-tolak'] = function () { const ids = pvTerpilih(); if (!ids.length) { toast('Pilih catatan terlebih dahulu.', 'warn'); return; } pnTolak(ids); };
ACT['pv-ganti'] = function (el) {
  const x = P.pn.v.rows[+el.dataset.i], j = x.jenis === 'Prestasi' ? 'R' : 'L';
  const m = openModal({ title: 'Ganti butir aturan', sub: x.nama + ' · dicatat ' + x.pencatat, body: '<form id="f-pg2" class="form-grid" novalidate><div class="field"><label for="pg2-a">Butir yang benar <span class="req">*</span></label><select class="select" id="pg2-a" name="id_aturan">' + pnAturanOpts(P.pn.v.aturan, j, x.id_aturan) + '</select><div class="hint">Semula: ' + esc(x.aturan) + ' (' + x.poin + ' poin)</div></div>' + fld({ name: 'alasan', label: 'Catatan untuk pencatat (opsional)', max: 300 }) + '</form>', foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pg2-ok"><i class="bi bi-check-lg"></i> Ganti &amp; sahkan</button>' });
  $('#pg2-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-pg2', m.el));
    run(e.currentTarget, api('poin.putus', { ids: [x.id], keputusan: 'sah', id_aturan: d.id_aturan, alasan: d.alasan })).then(function () { m.close(); toast('Butir diganti dan poin disahkan.'); pnSegarkan(); }).catch(fail);
  });
};
// ── Catat poin (semua guru) ──
ACT['pn-catat-murid'] = function (el) { if (P.pnDr) P.pnDr.dr.close(); P.pnPre = { id: el.dataset.id, nama: el.dataset.n, kelas: el.dataset.k }; if (S.page !== 'poin') { navigateTo('poin', { tab: 'catat' }); return; } P.pn.tab = 'catat'; $$('#pn-tabs .tab').forEach(function (b) { b.classList.toggle('active', b.dataset.t === 'catat'); }); pnDraw(); };
function pnKelasList() { const ids = S.kelasAkses || null; return S.refs.kelas.filter(function (k) { return !ids || ids.indexOf(k.id) >= 0; }); }
function pnCatat() {
  const meta = P.pn.meta, c = P.pnC = { jenis: 'L', murids: [], kelas: '' };
  if (P.pnPre) { c.murids = [{ id: P.pnPre.id, nama: P.pnPre.nama, kelas: P.pnPre.kelas }]; P.pnPre = null; }
  const kl = pnKelasList();
  c.kelas = (S.kelasWali && S.kelasWali[0] && kl.some(function (k) { return k.id === S.kelasWali[0]; })) ? S.kelasWali[0] : (kl.length === 1 ? kl[0].id : '');
  $('#pn-body').innerHTML = '<div class="card pad" style="max-width:860px"><div class="note info"><i class="bi bi-info-circle"></i><div>' + (hasRole('guru_bk') ? 'Catatan Guru BK <b>langsung sah</b>.' : 'Catatan Anda <b>menunggu verifikasi Guru BK</b> sebelum dihitung. Bila murid yang sama sudah tercatat dengan butir yang sama pada tanggal itu, Anda akan diberi tahu agar tidak terjadi input ganda.') + ' Untuk kejadian yang perlu penanganan BK, gunakan <a href="#" data-act="nav" data-page="lapor">Lapor Kejadian</a> dan pilih butir pelanggarannya di sana.</div></div>' +
    '<form id="f-pn" class="col gap-16 mt-16" novalidate><div class="field"><span class="flabel">Jenis</span><div class="opt-tiles" id="pn-jenis"><button type="button" class="opt-tile on" data-act="pn-jenis" data-v="L">Pelanggaran<small>menambah poin</small></button><button type="button" class="opt-tile" data-act="pn-jenis" data-v="R">Prestasi / kebaikan<small>mengurangi poin pelanggaran</small></button></div></div>' +
    '<div class="field" data-f="murid"><span class="flabel">Murid <span class="req">*</span></span><div id="pn-sel" class="pk-sel"></div><div class="pk-kelas fchips mt-8">' + kl.map(function (k) { return '<button type="button" class="fchip ' + (k.id === c.kelas ? 'active' : '') + '" data-act="pn-kls" data-id="' + esc(k.id) + '">' + esc(k.nama) + '</button>'; }).join('') + '</div><div class="search mt-8" style="max-width:none"><i class="bi bi-search"></i><input id="pn-mq" class="input" style="padding-left:36px" type="search" placeholder="Saring nama, atau ketik nama/NIS…" autocomplete="off"></div><div id="pn-md" class="pk-daftar mt-8"></div><div class="err" role="alert"></div></div>' +
    '<div class="field" data-f="id_aturan"><label for="pn-a">Butir aturan tata tertib <span class="req">*</span></label><select class="select" id="pn-a" name="id_aturan"><option value="">— pilih butir —</option>' + pnAturanOpts(meta.aturan, 'L') + '</select><div class="hint" id="pn-ah">Daftar butir mengikuti buku tata tertib sekolah (tab Aturan &amp; tahapan).</div><div class="err" role="alert"></div></div>' +
    '<div class="form-grid c3">' + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: S.today, maxv: S.today, min: addD(S.today, -60) }) + fld({ name: 'jam', label: 'Jam / jam ke- (opsional)', max: 20, ph: 'mis. 07.20 atau jam ke-3' }) + fld({ name: 'lokasi', label: 'Lokasi (opsional)', max: 120, ph: 'mis. Gerbang, ruang kelas' }) + '</div>' +
    fld({ name: 'uraian', label: 'Uraian kejadian', type: 'textarea', req: true, rows: 3, max: 1000, ph: 'Tuliskan yang terlihat secara faktual: apa, kapan, bagaimana. Uraian ini dibaca Guru BK saat verifikasi.' }) +
    '<div class="field"><span class="flabel">Lampiran / bukti (opsional)</span><label class="drop" id="pn-drop" for="pn-file"><i class="bi bi-paperclip"></i> <span id="pn-dnm">Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)</span></label><input type="file" id="pn-file" class="sr" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"></div>' +
    '<div class="row" style="justify-content:flex-end"><button type="submit" class="btn primary" id="pn-kirim"><i class="bi bi-check-lg"></i> Simpan catatan</button></div></form></div>';
  $('#pn-a').addEventListener('change', pnHint);
  $('#pn-mq').addEventListener('input', debounce(pnMuat, 220));
  $('#pn-file').addEventListener('change', function (e) { readFileB64(e.target.files[0], 5 * 1024 * 1024).then(function (b) { c.file = b; $('#pn-dnm').textContent = b ? b.nama : 'Pilih berkas PDF/PNG/JPG/WEBP (maks. 5 MB)'; $('#pn-drop').classList.toggle('has', !!b); }).catch(function (er) { e.target.value = ''; c.file = null; fail(er); }); });
  $('#f-pn').addEventListener('submit', function (e) { e.preventDefault(); pnKirim(false); });
  pnSel(); pnMuat();
}
function pnHint() { const a = P.pn.meta.aturan.filter(function (x) { return x.id === $('#pn-a').value; })[0]; $('#pn-ah').innerHTML = a ? '<b>' + (a.j === 'R' ? '−' : '+') + a.p + ' poin</b>' + (a.s ? ' · Pembinaan yang disarankan: ' + esc(a.s) : '') : 'Daftar butir mengikuti buku tata tertib sekolah (tab Aturan &amp; tahapan).'; }
ACT['pn-jenis'] = function (el) { P.pnC.jenis = el.dataset.v; $$('#pn-jenis .opt-tile').forEach(function (b) { b.classList.toggle('on', b === el); }); $('#pn-a').innerHTML = '<option value="">— pilih butir —</option>' + pnAturanOpts(P.pn.meta.aturan, el.dataset.v); $('[for=f_uraian]').firstChild.textContent = el.dataset.v === 'R' ? 'Uraian prestasi / kebaikan' : 'Uraian kejadian'; pnHint(); };
ACT['pn-kls'] = function (el) { P.pnC.kelas = el.dataset.id; $$('.pk-kelas [data-act=pn-kls]').forEach(function (b) { b.classList.toggle('active', b === el); }); $('#pn-mq').value = ''; pnMuat(); };
function pnSel() { const c = P.pnC; $('#pn-sel').innerHTML = c.murids.length ? c.murids.map(function (m, i) { return '<span class="pk-chip"><b>' + esc(m.nama) + '</b> · ' + esc(m.kelas) + '<button type="button" data-act="pn-lepas" data-i="' + i + '" aria-label="Hapus ' + esc(m.nama) + '"><i class="bi bi-x-lg"></i></button></span>'; }).join('') + (c.murids.length > 1 ? '<span class="xs muted">' + c.murids.length + ' murid · masing-masing mendapat catatan sendiri</span>' : '') : '<span class="xs muted">Belum ada murid dipilih. Pilih kelas, lalu ketuk nama.</span>'; }
function pnMuat() {
  const c = P.pnC, q = ($('#pn-mq') || {}).value ? $('#pn-mq').value.trim() : '';
  if (!c.kelas && q.length < 2) { $('#pn-md').innerHTML = ''; return; }
  apiC('murid.cari', c.kelas && q.length < 2 ? { q: '', id_kelas: c.kelas } : { q: q }).then(function (rows) {
    c.hits = rows; const ada = {}; c.murids.forEach(function (m) { ada[m.id] = 1; });
    $('#pn-md').innerHTML = rows.length ? rows.map(function (m, i) { return '<button type="button" class="pk-m' + (ada[m.id] ? ' on' : '') + '" data-act="pn-pick" data-i="' + i + '"><i class="bi ' + (ada[m.id] ? 'bi-check-circle' : 'bi-circle') + '"></i><span><b>' + esc(m.nama) + '</b><small>' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</small></span></button>'; }).join('') : '<div class="xs muted">Tidak ada murid yang cocok.</div>';
  }).catch(fail);
}
ACT['pn-pick'] = function (el) {
  const c = P.pnC, m = c.hits[+el.dataset.i]; if (!m) return;
  const i = c.murids.map(function (x) { return x.id; }).indexOf(m.id);
  if (i >= 0) c.murids.splice(i, 1); else { if (c.murids.length >= 30) { toast('Paling banyak 30 murid sekali catat.', 'warn'); return; } c.murids.push({ id: m.id, nama: m.nama, kelas: m.kelas }); }
  el.classList.toggle('on', i < 0); el.querySelector('i').className = 'bi ' + (i < 0 ? 'bi-check-circle' : 'bi-circle');
  setErr($('#f-pn'), 'murid', ''); pnSel();
};
ACT['pn-lepas'] = function (el) { P.pnC.murids.splice(+el.dataset.i, 1); pnSel(); pnMuat(); };
function pnKirim(tetap) {
  const f = $('#f-pn'), c = P.pnC, d = formData(f);
  let ok = validate(f, d, { id_aturan: { label: 'Butir aturan', req: true }, tanggal: { label: 'Tanggal', req: true }, uraian: { label: 'Uraian', req: true, min: 10 } });
  if (!c.murids.length) { setErr(f, 'murid', 'Pilih minimal satu murid.'); ok = false; }
  if (!ok) return;
  d.id_murid_list = c.murids.map(function (m) { return m.id; }); d.berkas = c.file || null; if (tetap) d.tetap = true;
  run($('#pn-kirim'), api('poin.catat', d)).then(function (r) {
    if (r.perluKonfirmasi) {
      confirmDlg('Sudah ada catatan yang sama (murid, butir, dan tanggal sama): ' + r.dup.map(function (x) { return x.nama + ' oleh ' + x.pencatat + ' (' + (x.status === 'Sah' ? 'sudah sah' : 'menunggu verifikasi') + (x.jam ? ', ' + x.jam : '') + ')'; }).join('; ') + '. Kemungkinan ini kejadian yang sama. Tetap simpan sebagai catatan terpisah? Guru BK akan melihat tanda duplikat.', 'Tetap simpan', false, 'Kemungkinan input ganda').then(function (y) { if (y) pnKirim(true); });
      return;
    }
    toast(r.n + ' catatan ' + r.jenis.toLowerCase() + ' tersimpan' + (r.status === 'Sah' ? ' dan langsung sah.' : ', menunggu verifikasi Guru BK.'));
    ccClear('poin.catat'); P.pnPre = null; pnCatat();
  }).catch(fail);
}
// ── Catatan saya ──
function pnSaya() {
  return api('poin.saya', {}).then(function (d) {
    P.pn.saya = d.rows;
    $('#pn-body').innerHTML = '<div class="card">' + (d.rows.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Tanggal</th><th>Murid</th><th>Butir</th><th>Poin</th><th>Status</th><th>Catatan verifikasi</th><th></th></tr></thead><tbody>' + d.rows.map(function (x) {
      return '<tr><td class="xs">' + esc(fTgl(x.tanggal)) + '</td><td><div class="fw6">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.kelas) + '</div></td><td class="xs">' + esc((x.kode ? x.kode + ' · ' : '') + x.aturan) + '</td><td>' + pnJenis(x.jenis, x.poin) + '</td><td>' + pnStatus(x.status) + '</td><td class="xs">' + esc(x.catatan_verif || '') + (x.verif && x.status !== 'Menunggu' ? '<div class="muted">' + esc(x.verif) + '</div>' : '') + '</td><td style="text-align:right">' + (x.bolehBatal ? '<button class="btn sm ghost" data-act="pn-batal" data-id="' + esc(x.id) + '">Batalkan</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-journal-text', 'Anda belum mencatat poin', 'Gunakan tab Catat poin.') + '</div>') + '</div>';
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
// ── Rekap tanpa nama ──
function pnRekap() {
  return apiC('poin.rekap', {}).then(function (d) {
    const tot = d.kelas.reduce(function (a, k) { a.m += k.murid; a.b += k.berpoin; a.L += k.L; a.R += k.R; return a; }, { m: 0, b: 0, L: 0, R: 0 });
    $('#pn-body').innerHTML = '<div class="stat-row s4"><div class="stat"><span class="lbl">Murid aktif</span><b>' + tot.m + '</b></div><div class="stat"><span class="lbl">Murid berpoin</span><b>' + tot.b + '</b></div><div class="stat"><span class="lbl">Poin pelanggaran</span><b>' + tot.L + '</b></div><div class="stat"><span class="lbl">Poin prestasi</span><b>' + tot.R + '</b></div></div>' +
      '<div class="card mt-16"><div class="card-head"><h3>Per kelas</h3><span class="xs muted">' + esc(d.periode) + ' · hanya poin yang sudah sah</span></div><div class="tbl-wrap"><table class="tbl" style="min-width:620px"><thead><tr><th>Kelas</th><th style="text-align:right">Murid</th><th style="text-align:right">Berpoin</th><th style="text-align:right">Pelanggaran</th><th style="text-align:right">Prestasi</th>' + d.ambang.map(function (a) { return '<th style="text-align:right" title="' + esc(a.n) + '">≥ ' + a.p + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.kelas.map(function (k) { return '<tr><td class="fw6">' + esc(k.kelas) + '</td><td style="text-align:right">' + k.murid + '</td><td style="text-align:right">' + k.berpoin + '</td><td style="text-align:right">' + k.L + '</td><td style="text-align:right">' + k.R + '</td>' + k.tahap.map(function (n) { return '<td style="text-align:right">' + (n ? '<b>' + n + '</b>' : '<span class="muted">0</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card mt-16"><div class="card-head"><h3>Per kelompok butir</h3></div>' + (d.kelompok.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jenis</th><th>Kelompok</th><th style="text-align:right">Catatan</th><th style="text-align:right">Total poin</th></tr></thead><tbody>' + d.kelompok.map(function (g) { return '<tr><td>' + pnJenis(g.jenis, '') + '</td><td>' + esc(g.kelompok) + '</td><td style="text-align:right">' + g.n + '</td><td style="text-align:right">' + g.poin + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-bar-chart', 'Belum ada poin yang sah') + '</div>') + '</div>';
  }).catch(function (e) { isiHtml('#pn-body', errBox(e)); });
}
// ── Aturan & tahapan (lihat untuk semua; ubah untuk admin, Waka, Guru BK; aktifkan hanya admin) ──
function pnAturan(box, meta) {
  P.pnA = { meta: meta, aturan: JSON.parse(JSON.stringify(meta.aturan)), ambang: JSON.parse(JSON.stringify(meta.ambang)), edit: false };
  pnAturanDraw(box);
}
function pnAturanDraw(box) {
  const A = P.pnA, meta = A.meta, b = meta.boleh, ed = A.edit;
  let h = '';
  if (b.aktifkan) h += '<div class="card pad"><div class="row between wrap" style="gap:12px"><div><h3><i class="bi bi-award" style="color:var(--amber,#F59E0B)"></i> Sistem poin tata tertib</h3><div class="xs muted mt-8">Pilihan sekolah. Bila nonaktif, menu, kolom, dan isian poin tidak tampil di mana pun; data lama tetap tersimpan.</div></div>' + (meta.aktif ? '<span class="chip st-Selesai">Aktif</span>' : '<span class="chip neutral">Nonaktif</span>') + '</div><div class="row mt-12"><button class="btn ' + (meta.aktif ? '' : 'primary') + '" data-act="pna-aktif" data-v="' + (meta.aktif ? '0' : '1') + '">' + (meta.aktif ? '<i class="bi bi-x-lg"></i> Nonaktifkan' : '<i class="bi bi-check-lg"></i> Aktifkan sistem poin') + '</button></div></div>';
  if (!meta.aktif && !b.aktifkan) { box.innerHTML = h; return; }
  const kel = function (j) {
    const rows = A.aturan.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return x.a.j === j; });
    if (!ed) {
      const g = {}; rows.forEach(function (x) { if (x.a.a !== 0) (g[x.a.g] = g[x.a.g] || []).push(x.a); });
      return Object.keys(g).length ? Object.keys(g).map(function (k) { return '<div class="mt-12"><div class="fw6">' + esc(k) + '</div><div class="tbl-wrap mt-8"><table class="tbl"><tbody>' + g[k].map(function (a) { return '<tr><td class="mono xs" style="width:64px">' + esc(a.k || '') + '</td><td>' + esc(a.n) + (a.s ? '<div class="xs muted">' + esc(a.s) + '</div>' : '') + '</td><td style="text-align:right;width:70px"><b>' + (j === 'R' ? '−' : '+') + a.p + '</b></td></tr>'; }).join('') + '</tbody></table></div></div>'; }).join('') : '<div class="muted mt-8">Belum ada butir.</div>';
    }
    return '<div class="tbl-wrap mt-8"><table class="tbl pna-tbl" style="min-width:820px"><thead><tr><th style="width:80px">Kode</th><th style="width:170px">Kelompok</th><th>Nama butir</th><th style="width:80px">Poin</th>' + (j === 'L' ? '<th style="width:200px">Pembinaan disarankan</th>' : '') + '<th style="width:60px">Aktif</th><th style="width:44px"></th></tr></thead><tbody>' +
      rows.map(function (x) { const a = x.a; return '<tr data-ai="' + x.i + '"><td><input class="input" data-k="k" maxlength="12" value="' + esc(a.k || '') + '"></td><td><input class="input" data-k="g" maxlength="60" value="' + esc(a.g) + '" list="pna-g-' + j + '"></td><td><input class="input" data-k="n" maxlength="150" value="' + esc(a.n) + '"></td><td><input class="input" data-k="p" type="number" min="1" max="1000" inputmode="numeric" value="' + esc(a.p) + '"></td>' + (j === 'L' ? '<td><input class="input" data-k="s" maxlength="200" value="' + esc(a.s || '') + '"></td>' : '') + '<td style="text-align:center"><input type="checkbox" data-k="a"' + (a.a !== 0 ? ' checked' : '') + '></td><td><button type="button" class="icon-btn" data-act="pna-hapus" data-i="' + x.i + '" title="Hapus butir"><i class="bi bi-trash3"></i></button></td></tr>'; }).join('') +
      '</tbody></table></div><datalist id="pna-g-' + j + '">' + rows.map(function (x) { return x.a.g; }).filter(function (g, i, s) { return g && s.indexOf(g) === i; }).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist><button type="button" class="btn sm mt-8" data-act="pna-tambah" data-j="' + j + '"><i class="bi bi-plus-lg"></i> Tambah butir ' + (j === 'R' ? 'prestasi' : 'pelanggaran') + '</button>';
  };
  const pihak = meta.pihak;
  const ambangHtml = ed ? '<div class="tbl-wrap mt-8"><table class="tbl" style="min-width:820px"><thead><tr><th style="width:90px">Mulai poin</th><th style="width:230px">Nama tahap</th><th>Tindak lanjut</th><th style="width:260px">Diberi tahu</th><th style="width:90px">Orang tua dihubungi</th><th style="width:44px"></th></tr></thead><tbody>' +
      A.ambang.map(function (a, i) { return '<tr data-bi="' + i + '"><td><input class="input" data-k="p" type="number" min="1" inputmode="numeric" value="' + esc(a.p) + '"></td><td><input class="input" data-k="n" maxlength="60" value="' + esc(a.n) + '"></td><td><textarea class="textarea" data-k="t" maxlength="300" rows="2" style="min-height:56px">' + esc(a.t || '') + '</textarea></td><td><div class="row wrap" style="gap:4px">' + Object.keys(pihak).map(function (k) { return '<label class="check xs"><input type="checkbox" data-u="' + k + '"' + ((a.u || []).indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(pihak[k]) + '</label>'; }).join('') + '</div></td><td style="text-align:center"><input type="checkbox" data-k="o"' + (a.o ? ' checked' : '') + '></td><td><button type="button" class="icon-btn" data-act="pna-hapus-t" data-i="' + i + '" title="Hapus tahap"><i class="bi bi-trash3"></i></button></td></tr>'; }).join('') +
      '</tbody></table></div><button type="button" class="btn sm mt-8" data-act="pna-tambah-t"><i class="bi bi-plus-lg"></i> Tambah tahap</button>'
    : (A.ambang.length ? '<div class="tbl-wrap mt-8"><table class="tbl"><thead><tr><th>Poin</th><th>Tahap</th><th>Tindak lanjut</th><th>Diberi tahu</th></tr></thead><tbody>' + A.ambang.map(function (a) { return '<tr><td class="fw6">≥ ' + a.p + '</td><td>' + esc(a.n) + '</td><td class="xs">' + esc(a.t || '') + '</td><td class="xs">' + (a.u || []).map(function (k) { return esc(pihak[k] || k); }).join(', ') + (a.o ? (a.u && a.u.length ? ', ' : '') + '<b>orang tua dihubungi</b>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="muted mt-8">Belum ada tahapan.</div>');
  h += '<div class="card pad mt-16"><div class="row between wrap" style="gap:8px"><div><h3>Tahapan pembinaan</h3><div class="xs muted mt-8">Saat poin bersih murid mencapai batas, pihak terkait mendapat pemberitahuan di lonceng.</div></div>' + (b.atur && !ed ? '<button class="btn" data-act="pna-edit"><i class="bi bi-pencil"></i> Ubah aturan &amp; tahapan</button>' : '') + '</div>' + ambangHtml +
    '<div class="form-grid c2 mt-16">' + (ed ? fld({ name: 'putih', id: 'pna-putih', label: 'Pemutihan poin', type: 'select', value: meta.putih, opts: Object.keys(meta.putihOpsi).map(function (k) { return { v: k, l: meta.putihOpsi[k] }; }), hint: 'Riwayat tetap tersimpan; hanya hitungan yang dimulai dari nol.' }) : '<div><span class="flabel">Pemutihan poin</span><div class="mt-8">' + esc(meta.putihOpsi[meta.putih]) + ' · periode berjalan: ' + esc(meta.periode) + '</div></div>') + '</div>' +
    (ed ? fld({ name: 'templat', id: 'pna-tpl', label: 'Templat pesan WhatsApp ke orang tua', type: 'textarea', rows: 3, max: 1000, value: meta.templat, hint: 'Isian otomatis: {nama_ortu} {nama_murid} {kelas} {poin} {tahap} {sekolah} {pengirim}. {poin} dan {tahap} juga dapat dipakai pada kalimat surat.' }) : '') + '</div>';
  h += '<div class="' + (ed ? 'col gap-16' : 'grid g-2') + ' mt-16"><div class="card pad"><h3>Butir pelanggaran</h3>' + kel('L') + '</div><div class="card pad"><h3>Butir prestasi / kebaikan</h3>' + kel('R') + '</div></div>';
  if (ed) h += '<div class="row wrap mt-16" style="justify-content:flex-end;gap:8px"><button class="btn ghost" data-act="pna-bawaan"><i class="bi bi-arrow-counterclockwise"></i> Pakai contoh bawaan</button><button class="btn" data-act="pna-batal">Batal</button><button class="btn primary" data-act="pna-simpan"><i class="bi bi-check-lg"></i> Simpan aturan</button></div>';
  h += '<p class="xs muted mt-12">Butir bawaan hanya contoh. Sesuaikan dengan tata tertib yang ditetapkan sekolah. Mengubah bobot butir tidak mengubah catatan yang sudah ada.</p>';
  box.innerHTML = h; P.pnA.box = box;
}
function pnaBaca() {
  const A = P.pnA;
  $$('[data-ai]', A.box).forEach(function (tr) { const a = A.aturan[+tr.dataset.ai]; $$('[data-k]', tr).forEach(function (el) { a[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; }); });
  $$('[data-bi]', A.box).forEach(function (tr) { const a = A.ambang[+tr.dataset.bi]; $$('[data-k]', tr).forEach(function (el) { a[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; }); a.u = $$('[data-u]', tr).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.u; }); });
  const pu = $('#pna-putih', A.box), tp = $('#pna-tpl', A.box);
  if (pu) A.putih = pu.value; if (tp) A.templat = tp.value;
}
ACT['pna-edit'] = function () { P.pnA.edit = true; pnAturanDraw(P.pnA.box); };
ACT['pna-batal'] = function () { pnAturan(P.pnA.box, P.pnA.meta); };
ACT['pna-tambah'] = function (el) { pnaBaca(); const j = el.dataset.j, last = P.pnA.aturan.filter(function (a) { return a.j === j; }).pop(); P.pnA.aturan.push({ id: '', k: '', j: j, g: last ? last.g : '', n: '', p: j === 'R' ? 3 : 2, s: '', a: 1 }); pnAturanDraw(P.pnA.box); };
ACT['pna-hapus'] = function (el) { pnaBaca(); P.pnA.aturan.splice(+el.dataset.i, 1); pnAturanDraw(P.pnA.box); };
ACT['pna-tambah-t'] = function () { pnaBaca(); const l = P.pnA.ambang[P.pnA.ambang.length - 1]; P.pnA.ambang.push({ p: l ? +l.p + 25 : 25, n: '', t: '', u: ['wali'], o: 0 }); pnAturanDraw(P.pnA.box); };
ACT['pna-hapus-t'] = function (el) { pnaBaca(); P.pnA.ambang.splice(+el.dataset.i, 1); pnAturanDraw(P.pnA.box); };
ACT['pna-bawaan'] = function () {
  confirmDlg('Ganti seluruh butir dan tahapan di layar dengan contoh bawaan? Perubahan baru tersimpan setelah Anda menekan Simpan aturan.', 'Pakai contoh').then(function (y) {
    if (!y) return; const bw = P.pnA.meta.bawaan; P.pnA.aturan = JSON.parse(JSON.stringify(bw.aturan)); P.pnA.ambang = JSON.parse(JSON.stringify(bw.ambang)); P.pnA.meta = Object.assign({}, P.pnA.meta, { templat: bw.templat }); pnAturanDraw(P.pnA.box);
  });
};
ACT['pna-simpan'] = function (el) {
  pnaBaca();
  const A = P.pnA;
  const salah = A.aturan.filter(function (a) { return !String(a.n).trim() || !String(a.g).trim() || !(+a.p >= 1); })[0];
  if (salah) { toast('Lengkapi kelompok, nama, dan poin (≥ 1) setiap butir.', 'err'); return; }
  run(el, api('poin.atur', { aturan: A.aturan, ambang: A.ambang, putih: A.putih, templat: A.templat })).then(function (meta) { toast('Aturan poin tersimpan.'); pnaSesudah(meta); }).catch(fail);
};
ACT['pna-aktif'] = function (el) {
  const on = el.dataset.v === '1';
  confirmDlg(on ? 'Aktifkan sistem poin? Menu Poin Murid muncul untuk semua guru, dan isian butir pelanggaran tampil di Lapor Kejadian. Periksa dulu butir aturan dan tahapan agar sesuai tata tertib sekolah.' : 'Nonaktifkan sistem poin? Semua tampilan poin disembunyikan. Data yang sudah tercatat tetap tersimpan dan muncul lagi bila diaktifkan.', on ? 'Aktifkan' : 'Nonaktifkan', !on).then(function (y) {
    if (!y) return;
    run(el, api('poin.atur', { aktif: on })).then(function (meta) { toast('Sistem poin ' + (on ? 'diaktifkan.' : 'dinonaktifkan.')); return api('boot').then(function (b) { S.cfg = b.config; S.menu = b.menu; S.refs = b.refs; renderShell(); setNavActive(S.page); pnaSesudah(meta); }); }).catch(fail);
  });
};
function pnaSesudah(meta) { ccClear('poin.atur'); if (P.pn) P.pn.meta = meta; const box = (S.page === 'admin' ? $('#ad-body') : $('#pn-body')) || P.pnA.box; pnAturan(box, meta); }
function adPoin() { $('#ad-body').innerHTML = skeleton(2); api('poin.meta', {}).then(function (meta) { pnAturan($('#ad-body'), meta); }).catch(function (e) { isiHtml('#ad-body', errBox(e)); }); }
