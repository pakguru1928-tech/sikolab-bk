/* SIKOLAB BK v1.15 — js/pages/20_program.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Program BK: program layanan tahunan (dapat disunting) + rekap tahunan
// ════════════════════════════════════════════════════════════
const BLN_PNJ = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const COL_BIDANG = { Pribadi: '#4F46E5', Sosial: '#0D9488', Belajar: '#F59E0B', Karier: '#8B5CF6', Umum: '#64748B' };
PAGES.program = function (params, tok) {
  P.pg = { tab: params.tab || 'program', arsip: '', tampil: (P.pg && P.pg.tampil) || 'daftar' };
  const bk = hasRole('guru_bk');
  $('#app-container').innerHTML = pageHead('Program layanan BK', 'Program BK', bk ? 'Analisis kebutuhan → susun kegiatan tahunan & semesteran → RPL → catat pelaksanaan → laporan. Semua dokumen dicetak dari satu tombol.' : 'Rencana dan realisasi program layanan BK (tampilan baca).',
    '<button class="btn primary" data-act="pg-dok"><i class="bi bi-printer"></i> Cetak dokumen program</button>') +
    '<div class="tabs mb-16" id="pg-tabs">' + [['kebutuhan', 'bi-clipboard-data', 'Analisis kebutuhan'], ['program', 'bi-journal-check', 'Program tahunan & semester'], ['rekap', 'bi-graph-up-arrow', 'Rekap & laporan']].map(function (t) {
      return '<button class="tab ' + (P.pg.tab === t[0] ? 'active' : '') + '" data-act="pg-tab" data-t="' + t[0] + '"><i class="bi ' + t[1] + '"></i> ' + t[2] + '</button>';
    }).join('') + '</div><div id="pg-body"></div>';
  return pgDraw();
};
ACT['pg-tab'] = function (el) {
  P.pg.tab = el.dataset.t;
  $$('#pg-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  pgDraw();
};
function pgDraw() { return P.pg.tab === 'rekap' ? pgRekap() : P.pg.tab === 'kebutuhan' ? pgKebutuhan() : pgProgram(); }
const BLN_TA = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
function semBulan(sem) { return sem === 'Genap' ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]; }
/** Minggu pelaksanaan: yang ditetapkan Guru BK, atau perkiraan (minggu ke-2) bila belum diisi. */
function pgMinggu(x) { return x.minggu && x.minggu.length ? { m: x.minggu, kira: false } : { m: x.bulan ? [2] : [], kira: true }; }

// ── Analisis kebutuhan ──
function pgKebutuhan() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('program.kebutuhan').then(function (d) {
    if (P.pg.tab !== 'kebutuhan' || !$('#pg-body')) return;
    P.pg.kb = d;
    const ubah = hasRole('guru_bk');
    let h = '<div class="note info mb-16"><i class="bi bi-lightbulb"></i><div>Kebutuhan dihitung dari instrumen yang sudah diisi minimal 3 murid (AKPD, angket kebutuhan, kesejahteraan, kebiasaan belajar, gaya belajar, minat karier). Usulan kegiatan bersifat <b>perkiraan</b>: periksa, lalu tambahkan ke program dan sesuaikan.</div></div>';
    if (!d.instrumen.length) {
      $('#pg-body').innerHTML = h + '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada data instrumen', 'Laksanakan AKPD atau angket kebutuhan lebih dulu (menu Instrumen BK). Program tetap dapat disusun dari contoh.') + '<div style="text-align:center"><button class="btn" data-act="nav" data-page="instrumen"><i class="bi bi-clipboard-data"></i> Buka Instrumen BK</button></div></div>';
      return;
    }
    h += '<div class="card mb-16"><div class="card-head"><h3>Usulan kegiatan program</h3><span class="xs muted">diurutkan dari prioritas tertinggi</span></div>' + (d.usulan.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Prioritas</th><th>Usulan kegiatan</th><th>Bidang · komponen</th><th>Dasar kebutuhan</th><th style="text-align:right"></th></tr></thead><tbody>' + d.usulan.map(function (x, i) {
      return '<tr><td><span class="chip ' + (x.tingkat === 'Tinggi' ? 'st-Eskalasi' : x.tingkat === 'Sedang' ? 'st-Baru' : 'neutral') + '">' + x.tingkat + '</span></td><td class="fw6">' + esc(x.topik) + '</td><td class="xs">' + esc(x.bidang) + '<br><span class="muted">' + esc(x.layanan) + '</span></td><td class="xs muted-2">' + esc(x.dasar) + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (x.sudah ? '<span class="chip st-Selesai"><i class="bi bi-check2"></i> Sudah di program</span>' : ubah ? '<button class="btn sm primary" data-act="pg-usul" data-i="' + i + '"><i class="bi bi-plus-lg"></i> Tambahkan</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card-body muted">Belum ada aspek yang menonjol.</div>') + '</div>';
    h += '<div class="grid g-2">' + d.instrumen.map(function (ins) {
      return '<div class="card pad"><div class="row between wrap"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[ins.jenis] || 'var(--text-3)') + '">' + esc(ins.jenis) + '</span><span class="xs muted">' + ins.responden + '/' + ins.target + ' murid</span></div><h3 class="mt-8" style="margin-top:8px">' + esc(ins.judul) + '</h3>' +
        (ins.dominan ? ins.dominan.map(function (x) { return hbar(x.kelompok, x.persen, x.persen + '%', 'var(--indigo)', 'dominan'); }).join('') :
          ins.kelompok.slice().sort(function (a, b) { return (b.skor || 0) - (a.skor || 0); }).map(function (g) { return hbar(g.kelompok, g.skor || 0, (g.persenPerlu ? g.persenPerlu + '% perlu' : (g.skor || 0) + '%'), g.persenPerlu >= 25 ? 'var(--rose)' : 'var(--amber)', ins.tafsir === 'kekuatan' ? 'skor terbalik' : ''); }).join('')) + '</div>';
    }).join('') + '</div>';
    $('#pg-body').innerHTML = h;
  }).catch(function (e) { isiHtml('#pg-body', errBox(e)); });
}
ACT['pg-usul'] = function (el) {
  const x = P.pg.kb.usulan[+el.dataset.i];
  const go = function () { pgForm(null, { bidang: x.bidang, layanan: x.layanan, topik: x.topik, dasar: x.dasar, sasaran: 'Semua kelas', target: 1 }); };
  if (P.pg.d) go(); else apiC('program.daftar').then(function (r) { P.pg.d = r; go(); }).catch(fail);
};

// ── Program tahunan & semester ──
function pgProgram() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('program.daftar').then(function (r) {
    if (P.pg.tab !== 'program' || !$('#pg-body')) return;
    P.pg.d = r;
    const ubah = r.bolehUbah;
    const tot = r.rows.reduce(function (a, x) { a.t += x.target; a.r += Math.min(x.total, x.target || x.total); a.l += x.tercatat; return a; }, { t: 0, r: 0, l: 0 });
    let h = '<div class="grid g-kpi k4">' + [
      ['indigo', 'bi-journal-check', 'Kegiatan Program', r.rows.length, 'tahun ajaran ' + r.tahun_ajaran],
      ['teal', 'bi-graph-up-arrow', 'Capaian Target', (tot.t ? Math.round(tot.r * 100 / tot.t) : 0) + '%', tot.r + ' dari ' + tot.t + ' pelaksanaan'],
      ['blue', 'bi-file-earmark-text', 'RPL Siap', r.rows.filter(function (x) { return x.adaRpl; }).length, 'dari ' + r.rows.filter(pgPerluRpl).length + ' kegiatan klasikal/kelompok'],
      ['amber', 'bi-check2-circle', 'Kegiatan Terlaksana', r.rows.filter(function (x) { return x.status === 'Terlaksana'; }).length, 'mencapai target']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div><h3>Program layanan BK ' + esc(r.tahun_ajaran) + '</h3><div class="xs muted">' + (ubah ? 'Tekan <b>Catat</b> setelah kegiatan dilakukan: layanan tercatat dan realisasi bertambah otomatis.' : 'Ketuk kegiatan untuk melihat pelaksanaannya.') + '</div></div>' +
      '<div class="row wrap" style="gap:8px"><div class="seg-lg" id="pg-tampil"><button class="' + (P.pg.tampil === 'daftar' ? 'on' : '') + '" data-act="pg-tampil" data-v="daftar"><i class="bi bi-list-check"></i> Daftar</button><button class="' + (P.pg.tampil === 'kalender' ? 'on' : '') + '" data-act="pg-tampil" data-v="kalender"><i class="bi bi-calendar-check"></i> Kalender</button></div>' +
      (ubah ? '<button class="btn" data-act="pg-narasi" title="Rasional, tujuan, dan evaluasi pada dokumen program"><i class="bi bi-pencil"></i> Narasi dokumen</button><button class="btn primary" data-act="pg-baru"><i class="bi bi-plus-lg"></i> Tambah kegiatan</button>' : '') + '</div></div>';
    if (!r.rows.length) {
      h += empty('bi-journal-check', 'Belum ada program', ubah ? 'Mulai dari Analisis kebutuhan, dari contoh program (dapat diedit seluruhnya), atau tambahkan sendiri.' : 'Guru BK belum menyusun program.') + (ubah ? '<div class="row" style="justify-content:center;padding-bottom:16px"><button class="btn" data-act="pg-tab-kb"><i class="bi bi-clipboard-data"></i> Lihat analisis kebutuhan</button><button class="btn dark" data-act="pg-contoh"><i class="bi bi-stars"></i> Isi dari contoh</button></div>' : '');
    } else if (P.pg.tampil === 'kalender') {
      h += '<div class="card-body">' + ['Ganjil', 'Genap'].map(function (sem) { return pgKalender(r.rows, sem, false); }).join('') + '<div class="xs muted mt-8">● minggu yang ditetapkan · ○ perkiraan (minggu ke-2), atur di Ubah kegiatan → Minggu pelaksanaan. Sesuaikan dengan kalender pendidikan sekolah.</div></div>';
    } else {
      ['Ganjil', 'Genap'].forEach(function (sem) {
        const rows = r.rows.filter(function (x) { return x.semester === sem; });
        if (!rows.length) return;
        h += '<div class="pg-sem">Semester ' + sem + '</div><div class="tbl-wrap"><table class="tbl" style="min-width:860px"><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Waktu</th><th style="min-width:160px">Realisasi / target</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' + rows.map(function (x) {
          const mg = pgMinggu(x);
          return '<tr><td><span class="chip" style="background:' + COL_BIDANG[x.bidang] + '22;color:' + COL_BIDANG[x.bidang] + '">' + esc(x.bidang) + '</span></td><td class="click" data-act="pg-detail" data-id="' + esc(x.id) + '" style="cursor:pointer"><div class="fw6">' + esc(x.topik) + '</div><div class="xs muted">' + esc(x.layanan) + (x.sasaran ? ' · ' + esc(x.sasaran) : '') + '</div>' + (x.jurus ? '<span class="chip gold mt-4"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + '</td>' +
            '<td class="xs">' + (x.bulan ? esc(BLN_PNJ[x.bulan - 1]) + (mg.m.length ? '<br><span class="' + (mg.kira ? 'muted' : '') + '">minggu ke-' + mg.m.join(', ') + (mg.kira ? ' (perkiraan)' : '') + '</span>' : '') : '<span class="muted">Fleksibel</span>') + '</td>' +
            '<td><div class="row"><div class="bar grow"><i style="width:' + x.persen + '%"></i></div><b>' + x.total + '/' + x.target + '</b></div><div class="xs muted">' + (x.tercatat ? x.tercatat + ' dari layanan' + (x.murid ? ' · ' + x.murid + ' murid' : '') : 'belum ada layanan tercatat') + (x.realisasi ? ' · +' + x.realisasi + ' manual' : '') + '</div></td>' +
            '<td>' + chipStatusT(x.status === 'Terlaksana' ? 'Selesai' : x.status === 'Berjalan' ? 'Diproses' : x.status === 'Tidak terlaksana' ? 'Eskalasi' : 'Baru', x.status) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' + (ubah ? '<button class="btn sm primary" data-act="pg-catat" data-id="' + esc(x.id) + '" title="Catat pelaksanaan sebagai layanan BK"><i class="bi bi-plus-lg"></i> Catat</button> ' + (pgPerluRpl(x) ? '<button class="btn sm' + (x.adaRpl ? '' : ' soft-amber') + '" data-act="pg-rpl" data-id="' + esc(x.id) + '" title="Rencana Pelaksanaan Layanan"><i class="bi bi-file-earmark-text"></i> RPL' + (x.adaRpl ? '' : ' (draf)') + '</button> ' : '') + '<button class="btn sm" data-act="pg-edit" data-id="' + esc(x.id) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button> <button class="btn sm soft-danger" data-act="pg-hapus" data-id="' + esc(x.id) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button>' : '<button class="btn sm" data-act="pg-detail" data-id="' + esc(x.id) + '">Rincian</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      });
    }
    $('#pg-body').innerHTML = h + '</div>';
  }).catch(function (e) { isiHtml('#pg-body', errBox(e)); });
}
function pgPerluRpl(x) { return /Klasikal|Orientasi|Kelompok|Perencanaan/.test(x.layanan); }
ACT['pg-tampil'] = function (el) { P.pg.tampil = el.dataset.v; pgProgram(); };
ACT['pg-tab-kb'] = function () { const t = $('#pg-tabs [data-t=kebutuhan]'); if (t) ACT['pg-tab'](t); };
/** Matriks semester: kegiatan × bulan × minggu (dipakai di layar dan dokumen cetak). */
function pgKalender(rows, sem, cetak) {
  const bl = semBulan(sem), rs = rows.filter(function (x) { return x.semester === sem; });
  if (!rs.length) return '';
  const cls = cetak ? 'pr-tbl pr-mini' : 'tbl kal-tbl';
  return '<div class="' + (cetak ? '' : 'pg-sem') + '"' + (cetak ? '' : '') + '>' + (cetak ? '' : 'Semester ' + sem) + '</div><div class="' + (cetak ? '' : 'tbl-wrap') + '"><table class="' + cls + '"><thead><tr><th rowspan="2">No</th><th rowspan="2" style="min-width:' + (cetak ? '0' : '200px') + '">Kegiatan</th><th rowspan="2">Bidang</th>' + bl.map(function (b) { return '<th colspan="4">' + BLN_PNJ[b - 1].substr(0, 3) + '</th>'; }).join('') + '</tr><tr>' + bl.map(function () { return '<th>1</th><th>2</th><th>3</th><th>4</th>'; }).join('') + '</tr></thead><tbody>' +
    rs.map(function (x, i) {
      const mg = pgMinggu(x);
      return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td>' + bl.map(function (b) {
        return [1, 2, 3, 4].map(function (w) { const on = +x.bulan === b && (mg.m.indexOf(w) >= 0 || (w === 4 && mg.m.indexOf(5) >= 0)); return '<td class="' + (on ? 'kal-on' : '') + '">' + (on ? (mg.kira ? '○' : '●') : '') + '</td>'; }).join('');
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
}
ACT['pg-contoh'] = function (el) { run(el, api('program.contoh')).then(function (r) { toast(r.jumlah + ' kegiatan contoh ditambahkan. Silakan sesuaikan.'); pgProgram(); }).catch(fail); };
ACT['pg-catat'] = function (el) {
  const x = P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
  const pre = { program: x.id, jenis: x.jenisDefault || '', sumber: 'Program BK' };
  if (/Klasikal|Orientasi/.test(x.layanan)) { pre.sasaran = 'Klasikal'; pre.komponen = 'Layanan Dasar'; }
  else if (/Kelompok/.test(x.layanan)) pre.sasaran = 'Kelompok';
  if (x.jenisDefault) { pre.jenis = x.jenisDefault; pre.komponen = ''; }
  apiC('layanan.daftar', {}).then(function (d) {
    P.ly = P.ly || {}; P.ly.data = d;
    if (pre.jenis) pre.komponen = Object.keys(d.refs.komponen).filter(function (k) { return d.refs.komponen[k].indexOf(pre.jenis) >= 0; })[0] || pre.komponen;
    lyForm(null, pre);
    if (pre.jenis) { const s = $('#ly-jenis'); if (s) s.value = pre.jenis; }
  }).catch(fail);
};
ACT['pg-detail'] = function (el) {
  apiC('program.detail', { id: el.dataset.id }).then(function (d) {
    const x = d.program;
    openModal({
      title: x.topik, sub: x.bidang + ' · ' + x.layanan + ' · Semester ' + x.semester, size: 'lg',
      body: '<div class="row wrap">' + (x.jurus ? '<span class="chip gold"><i class="bi bi-stars"></i> ' + esc(x.jurus) + '</span>' : '') + '<span class="chip neutral">Sasaran: ' + esc(x.sasaran || '-') + '</span><span class="chip neutral">Target ' + x.target + '</span>' + chipStatusT(x.status === 'Terlaksana' ? 'Selesai' : 'Diproses', x.status) + '</div>' +
        (x.tujuan ? '<p class="mt-12"><b>Tujuan:</b> ' + esc(x.tujuan) + '</p>' : '') + (x.dasar ? '<p class="xs muted"><b>Dasar kebutuhan:</b> ' + esc(x.dasar) + '</p>' : '') +
        '<div class="row mt-12"><div class="bar grow"><i style="width:' + x.persen + '%"></i></div><b>' + x.total + '/' + x.target + '</b></div><div class="xs muted mt-8">' + x.tercatat + ' pelaksanaan tercatat dari layanan BK' + (x.realisasi ? ' + ' + x.realisasi + ' dicatat manual' : '') + (x.murid ? ' · ' + x.murid + ' murid' : '') + '</div>' +
        '<h4 class="mt-16">Pelaksanaan</h4>' + (d.pelaksanaan.length ? '<div class="tbl-wrap mt-8"><table class="tbl" style="min-width:520px"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Peserta</th><th>Topik</th><th></th></tr></thead><tbody>' + d.pelaksanaan.map(function (p) { return '<tr><td>' + esc(fTgl(p.tanggal)) + '</td><td>' + esc(p.jenis_layanan) + '</td><td>' + esc(p.peserta) + '</td><td>' + esc(p.topik || '') + '</td><td>' + (p.bolehBuka ? '<button class="btn sm" data-act="layanan-buka" data-id="' + esc(p.id) + '">Buka</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="muted mt-8">Belum ada pelaksanaan tercatat.</div>'),
      foot: '<button class="btn" data-close>Tutup</button>' + (P.pg.d && P.pg.d.bolehUbah ? (pgPerluRpl(x) ? '<button class="btn" data-act="pg-rpl" data-id="' + esc(x.id) + '"><i class="bi bi-file-earmark-text"></i> RPL</button>' : '') + '<button class="btn primary" data-act="pg-catat" data-id="' + esc(x.id) + '"><i class="bi bi-plus-lg"></i> Catat pelaksanaan</button>' : '')
    });
  }).catch(fail);
};
ACT['pg-baru'] = function () { pgForm(null); };
ACT['pg-edit'] = function (el) { pgForm(P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]); };
ACT['pg-hapus'] = function (el) {
  confirmDlg('Hapus kegiatan ini dari program? Catatan layanan yang terkait tetap tersimpan.', 'Hapus', true, 'Hapus kegiatan').then(function (ok) {
    if (ok) api('program.hapus', { id: el.dataset.id }).then(function () { toast('Kegiatan dihapus.'); pgProgram(); }).catch(fail);
  });
};
function pgForm(x, pre) {
  const d = P.pg.d; pre = pre || {};
  const v0 = function (k, def) { return x ? x[k] : (pre[k] !== undefined ? pre[k] : def); };
  const mg = x && x.minggu ? x.minggu : [];
  const m = openModal({
    title: x ? 'Ubah kegiatan' : 'Tambah kegiatan', sub: pre.dasar ? 'Dari analisis kebutuhan: ' + pre.dasar : '', size: 'lg',
    body: '<form id="f-pg" class="form-grid c2" novalidate>' + fld({ name: 'bidang', label: 'Bidang', type: 'select', req: true, value: v0('bidang', 'Pribadi'), opts: d.bidang }) + fld({ name: 'layanan', label: 'Komponen layanan', type: 'select', req: true, value: v0('layanan', d.layanan[0]), opts: d.layanan }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'topik', label: 'Topik / kegiatan', req: true, max: 200, value: v0('topik', '') }) + '</div>' +
      '<div style="grid-column:1/-1">' + fld({ name: 'tujuan', label: 'Tujuan layanan (opsional)', type: 'textarea', rows: 2, max: 400, value: v0('tujuan', ''), ph: 'mis. Murid mampu menyusun jadwal belajar mandiri.' }) + '</div>' +
      fld({ name: 'sasaran', label: 'Sasaran', max: 100, value: v0('sasaran', ''), ph: 'Mis. Kelas VII' }) + fld({ name: 'jurus', label: 'Fokus 7 Jurus BK Hebat', type: 'select', blank: '— Tidak dipilih —', value: v0('jurus', ''), opts: d.jurus }) +
      fld({ name: 'semester', label: 'Semester', type: 'select', req: true, value: v0('semester', S.cfg.semester), opts: ['Ganjil', 'Genap'] }) +
      fld({ name: 'bulan', label: 'Bulan pelaksanaan', type: 'select', blank: '— Fleksibel —', value: x ? String(x.bulan) : '', opts: BLN_TA.map(function (i) { return { v: String(i), l: BLN_PNJ[i - 1] }; }) }) +
      '<div class="field" style="grid-column:1/-1"><span class="flabel">Minggu pelaksanaan</span><div class="checks" id="pg-mg">' + [1, 2, 3, 4, 5].map(function (w) { return '<label class="check"><input type="checkbox" value="' + w + '"' + (mg.indexOf(w) >= 0 ? ' checked' : '') + '> Minggu ke-' + w + '</label>'; }).join('') + '</div><div class="hint">Untuk matriks program semester. Kosongkan bila belum pasti (dicetak sebagai perkiraan minggu ke-2).</div></div>' +
      fld({ name: 'target', label: 'Target (kali pelaksanaan)', type: 'number', inputmode: 'numeric', value: v0('target', 1) }) + fld({ name: 'realisasi', label: 'Realisasi manual (di luar aplikasi)', type: 'number', inputmode: 'numeric', value: x ? x.realisasi : 0, hint: 'Pelaksanaan yang dicatat lewat Layanan BK dihitung otomatis.' }) +
      fld({ name: 'status', label: 'Status', type: 'select', value: x ? (x.statusSimpan || x.status) : 'Rencana', opts: d.status, hint: 'Berjalan/Terlaksana diperbarui otomatis dari realisasi.' }) + fld({ name: 'dasar', label: 'Dasar kebutuhan (opsional)', max: 300, value: v0('dasar', ''), ph: 'Mis. AKPD: Belajar 45% murid' }) +
      '<div style="grid-column:1/-1">' + fld({ name: 'keterangan', label: 'Keterangan', type: 'textarea', rows: 2, max: 300, value: x ? x.keterangan : '' }) + '</div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pg-ok">Simpan</button>'
  });
  $('#pg-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pg', m.el), v = formData(f);
    if (!validate(f, v, { topik: { label: 'Topik', req: true }, target: { label: 'Target', re: /^\d{1,3}$/, msg: 'Angka 0–999.' }, realisasi: { label: 'Realisasi', re: /^\d{1,3}$/, msg: 'Angka 0–999.' } })) return;
    v.minggu = $$('#pg-mg input:checked', m.el).map(function (c) { return +c.value; });
    if (x) v.id = x.id;
    run(e.currentTarget, api('program.simpan', v)).then(function () { m.close(); toast('Program tersimpan.'); if (P.pg.tab === 'program') pgProgram(); else pgKebutuhan(); }).catch(fail);
  });
}
// ── RPL ──
const RPL_LABEL = [['waktu', 'Alokasi waktu', 1], ['tempat', 'Tempat', 1], ['metode', 'Metode/teknik', 1], ['media', 'Media dan alat', 1], ['materi', 'Materi', 2], ['awal', 'Kegiatan awal', 2], ['inti', 'Kegiatan inti', 4], ['penutup', 'Kegiatan penutup', 2], ['evaluasi_proses', 'Evaluasi proses', 2], ['evaluasi_hasil', 'Evaluasi hasil', 2]];
ACT['pg-rpl'] = function (el) {
  const x = P.pg.d.rows.filter(function (r) { return r.id === el.dataset.id; })[0]; if (!x) return;
  const r = x.rpl || x.rplDraf || {};
  closeAllOverlays();
  const m = openModal({
    title: 'RPL: ' + x.topik, sub: x.layanan + ' · ' + x.bidang + (x.rpl ? '' : ' · DRAF otomatis, sunting lalu simpan'), size: 'lg',
    body: (x.rpl ? '' : '<div class="note mb-12"><i class="bi bi-info-circle"></i><div>Isian di bawah adalah draf perkiraan sesuai komponen layanan. Sesuaikan dengan kondisi kelas Anda.</div></div>') +
      '<form id="f-rpl" class="form-grid c2" novalidate>' + RPL_LABEL.map(function (k) {
        return '<div' + (k[2] > 1 ? ' style="grid-column:1/-1"' : '') + '>' + fld({ name: k[0], label: k[1], type: k[2] > 1 ? 'textarea' : 'text', rows: k[2], max: k[0] === 'inti' ? 2000 : 800, value: r[k[0]] || '' }) + '</div>';
      }).join('') + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn" id="rpl-cetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn primary" id="rpl-ok">Simpan RPL</button>'
  });
  $('#rpl-ok', m.el).addEventListener('click', function (e) {
    const v = formData($('#f-rpl', m.el)); v.id = x.id;
    run(e.currentTarget, api('program.rpl', v)).then(function (res) { x.rpl = res.rpl; x.adaRpl = true; m.close(); toast('RPL tersimpan.'); pgProgram(); }).catch(fail);
  });
  $('#rpl-cetak', m.el).addEventListener('click', function () {
    const v = formData($('#f-rpl', m.el));
    siapKop().then(function () { cetakHtml(rplCetak(Object.assign({}, x, { rpl: v }), P.pg.d.tahun_ajaran), { judul: 'RPL ' + x.topik, ket: 'Rencana Pelaksanaan Layanan · A4 tegak' }); });
  });
};
ACT['pg-narasi'] = function () {
  apiC('program.dokumen').then(function (d) {
    const n = d.narasi;
    const m = openModal({
      title: 'Narasi dokumen program', sub: 'Dipakai pada dokumen Program Tahunan dan Laporan Pelaksanaan. Isian awal adalah contoh yang dapat Anda ubah.', size: 'lg',
      body: '<form id="f-nr" class="form-grid">' + fld({ name: 'program_rasional', label: 'A. Rasional', type: 'textarea', rows: 5, max: 3000, value: n.program_rasional }) + fld({ name: 'program_tujuan', label: 'C. Tujuan layanan', type: 'textarea', rows: 4, max: 3000, value: n.program_tujuan }) + fld({ name: 'program_evaluasi', label: 'G. Evaluasi, pelaporan, dan tindak lanjut', type: 'textarea', rows: 4, max: 3000, value: n.program_evaluasi }) + '</form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="nr-ok">Simpan</button>'
    });
    $('#nr-ok', m.el).addEventListener('click', function (e) { run(e.currentTarget, api('program.narasi', formData($('#f-nr', m.el)))).then(function () { m.close(); toast('Narasi tersimpan.'); }).catch(fail); });
  }).catch(fail);
};
// ── Dokumen program: satu tombol ──
const DOK_PROGRAM = [['kebutuhan', 'Analisis kebutuhan murid', 'dari hasil instrumen'], ['tahunan', 'Program tahunan', 'rasional, kebutuhan, tujuan, komponen, rencana kegiatan, kalender, evaluasi'], ['ganjil', 'Program semester Ganjil', 'matriks bulan × minggu'], ['genap', 'Program semester Genap', 'matriks bulan × minggu'], ['rpl', 'RPL semua kegiatan klasikal/kelompok', 'satu halaman per kegiatan'], ['laporan', 'Laporan pelaksanaan program', 'target, realisasi, capaian, evaluasi']];
ACT['pg-dok'] = function () {
  const m = openModal({
    title: 'Cetak dokumen program BK', sub: 'Pilih dokumen yang dicetak. Setiap dokumen dimulai di halaman baru, berkop dan bertanda tangan.',
    body: '<div class="col gap-8" id="dok-pil">' + DOK_PROGRAM.map(function (d) { return '<label class="pick-row"><input type="checkbox" value="' + d[0] + '" checked><span><b>' + d[1] + '</b><small>' + d[2] + '</small></span></label>'; }).join('') + '</div>' +
      '<p class="xs muted mt-12">RPL yang belum disunting dicetak dari draf otomatis. Bagian yang belum pasti (minggu pelaksanaan, narasi) memakai perkiraan dan dapat disesuaikan.</p>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="dok-ok"><i class="bi bi-printer"></i> Siapkan cetak</button>'
  });
  $('#dok-ok', m.el).addEventListener('click', function (e) {
    const pil = $$('#dok-pil input:checked', m.el).map(function (c) { return c.value; });
    if (!pil.length) { toast('Pilih minimal satu dokumen.', 'err'); return; }
    run(e.currentTarget, Promise.all([api('program.dokumen'), api('rekap.tahunan', {}), siapKop()])).then(function (r) {
      m.close();
      const d = r[0], rk = r[1].data;
      const bag = [];
      if (pil.indexOf('kebutuhan') >= 0) bag.push(dokKebutuhan(d));
      if (pil.indexOf('tahunan') >= 0) bag.push(dokTahunan(d));
      if (pil.indexOf('ganjil') >= 0) bag.push(dokSemester(d, 'Ganjil'));
      if (pil.indexOf('genap') >= 0) bag.push(dokSemester(d, 'Genap'));
      if (pil.indexOf('rpl') >= 0) d.rows.filter(pgPerluRpl).forEach(function (x) { bag.push(rplCetak(Object.assign({}, x, { rpl: x.rpl || x.rplDraf }), d.tahun_ajaran)); });
      if (pil.indexOf('laporan') >= 0) bag.push(dokLaporan(d, rk));
      cetakHtml(bag.filter(Boolean).join(''), { judul: 'Dokumen Program BK ' + d.tahun_ajaran, ket: bag.length + ' dokumen · ' + kertasNama() });
    }).catch(fail);
  });
};
function dokTtd() { const bk = hasRole('guru_bk'); return ttdCetak(ttdKepsek(), ttdOrang('Guru Bimbingan dan Konseling,', bk ? S.user.nama : '', bk ? S.user.nip : '')); }
function dokKepala(judul, d, sub) { return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">' + esc(judul) + '</h2><div class="pr-sub">' + esc((KOP && KOP.sekolah) || S.cfg.namaSekolah || '') + ' · Tahun Ajaran ' + esc(d.tahun_ajaran) + (sub ? ' · ' + esc(sub) : '') + '</div>'; }
function dokKebutuhanTabel(d) {
  const u = d.kebutuhan.usulan;
  return u.length ? '<table class="pr-tbl"><thead><tr><th>No</th><th>Kebutuhan / usulan kegiatan</th><th>Bidang</th><th>Dasar data</th><th>Prioritas</th></tr></thead><tbody>' + u.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.dasar) + '</td><td style="text-align:center">' + x.tingkat + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>Belum ada data instrumen yang cukup; kebutuhan ditetapkan dari pengamatan dan informasi guru serta wali kelas.</p>';
}
function dokKebutuhan(d) {
  let h = dokKepala('ANALISIS KEBUTUHAN MURID', d);
  h += '<p>Jumlah murid aktif: ' + d.sekolah.murid + ' orang dalam ' + d.sekolah.kelas + ' kelas. Data diambil dari instrumen BK yang telah diisi murid.</p>';
  d.kebutuhan.instrumen.forEach(function (ins) {
    h += '<table class="pr-tbl"><thead><tr><th colspan="3">' + esc(ins.judul) + ' (' + esc(ins.jenis) + ') · ' + ins.responden + ' dari ' + ins.target + ' murid</th></tr><tr><th>Aspek</th><th>' + (ins.dominan ? '% murid dominan' : 'Skor rata-rata') + '</th><th>' + (ins.dominan ? 'Jumlah' : '% murid perlu perhatian') + '</th></tr></thead><tbody>' +
      (ins.dominan ? ins.dominan.map(function (x) { return '<tr><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.persen + '%</td><td style="text-align:center">' + x.jumlah + '</td></tr>'; }).join('')
        : ins.kelompok.map(function (g) { return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + g.rata + '%</td><td style="text-align:center">' + g.persenPerlu + '%</td></tr>'; }).join('')) + '</tbody></table>';
  });
  h += '<h3 style="font-size:11pt;margin:10px 0 4px">Prioritas kebutuhan dan usulan kegiatan</h3>' + dokKebutuhanTabel(d) + dokTtd() + '</div>';
  return h;
}
function dokTahunan(d) {
  const n = d.narasi, rows = d.rows;
  const komp = {};
  rows.forEach(function (x) { const k = komp[x.layanan] = komp[x.layanan] || {}; k[x.bidang] = (k[x.bidang] || 0) + 1; });
  const bid = ['Pribadi', 'Sosial', 'Belajar', 'Karier', 'Umum'].filter(function (b) { return rows.some(function (x) { return x.bidang === b; }); });
  let h = dokKepala('PROGRAM TAHUNAN BIMBINGAN DAN KONSELING', d);
  h += '<h3 class="pr-h3">A. Rasional</h3><p>' + esc(n.program_rasional) + '</p>';
  h += '<h3 class="pr-h3">B. Deskripsi kebutuhan</h3>' + dokKebutuhanTabel(d);
  h += '<h3 class="pr-h3">C. Tujuan layanan</h3><p>' + esc(n.program_tujuan) + '</p>';
  h += '<h3 class="pr-h3">D. Komponen dan bidang layanan</h3><table class="pr-tbl"><thead><tr><th>Komponen layanan</th>' + bid.map(function (b) { return '<th>' + b + '</th>'; }).join('') + '<th>Jumlah</th></tr></thead><tbody>' + Object.keys(komp).map(function (k) { const t = bid.reduce(function (a, b) { return a + (komp[k][b] || 0); }, 0); return '<tr><td>' + esc(k) + '</td>' + bid.map(function (b) { return '<td style="text-align:center">' + (komp[k][b] || '') + '</td>'; }).join('') + '<td style="text-align:center">' + t + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">E. Rencana kegiatan</h3><table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan / topik</th><th>Bidang</th><th>Komponen</th><th>Sasaran</th><th>Waktu</th><th>Target</th></tr></thead><tbody>' + rows.map(function (x, i) {
    return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + (x.tujuan ? '<div style="font-size:8.5pt">Tujuan: ' + esc(x.tujuan) + '</div>' : '') + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.layanan) + '</td><td>' + esc(x.sasaran || '-') + '</td><td>' + esc(x.semester) + (x.bulan ? ', ' + BLN_PNJ[x.bulan - 1] : '') + '</td><td style="text-align:center">' + x.target + '×</td></tr>';
  }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">F. Kalender kegiatan</h3><table class="pr-tbl pr-mini"><thead><tr><th>No</th><th>Kegiatan</th>' + BLN_TA.map(function (b) { return '<th>' + BLN_PNJ[b - 1].substr(0, 3) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x.topik) + '</td>' + BLN_TA.map(function (b) { return '<td>' + (+x.bulan === b ? '●' : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">G. Evaluasi, pelaporan, dan tindak lanjut</h3><p>' + esc(n.program_evaluasi) + '</p>' + dokTtd() + '</div>';
  return h;
}
function dokSemester(d, sem) {
  const rows = d.rows.filter(function (x) { return x.semester === sem; });
  if (!rows.length) return '';
  let h = dokKepala('PROGRAM SEMESTER ' + sem.toUpperCase() + ' BIMBINGAN DAN KONSELING', d);
  h += '<table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan / topik</th><th>Bidang</th><th>Komponen</th><th>Sasaran</th><th>Bulan</th><th>Target</th></tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td>' + esc(x.layanan) + '</td><td>' + esc(x.sasaran || '-') + '</td><td>' + (x.bulan ? BLN_PNJ[x.bulan - 1] : 'Fleksibel') + '</td><td style="text-align:center">' + x.target + '×</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">Matriks pelaksanaan (bulan × minggu)</h3>' + pgKalender(d.rows, sem, true) + '<div style="font-size:8.5pt">● minggu yang ditetapkan · ○ perkiraan; menyesuaikan kalender pendidikan sekolah.</div>' + dokTtd() + '</div>';
  return h;
}
function rplCetak(x, ta) {
  const r = x.rpl || {};
  const baris = function (l, v) { return '<tr><td style="width:30%">' + l + '</td><td>' + esc(v || '-').replace(/\n/g, '<br>') + '</td></tr>'; };
  return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">RENCANA PELAKSANAAN LAYANAN (RPL)</h2><div class="pr-sub">' + esc(x.layanan) + ' · Tahun Ajaran ' + esc(ta) + ' · Semester ' + esc(x.semester) + '</div>' +
    '<table class="pr-tbl"><tbody>' + baris('Komponen layanan', x.layanan) + baris('Bidang layanan', x.bidang) + baris('Topik / tema', x.topik) + (x.jurus ? baris('Fokus 7 Jurus BK Hebat', x.jurus) : '') + baris('Tujuan', x.tujuan || 'Murid memahami dan mampu menerapkan ' + x.topik.toLowerCase() + '.') + baris('Sasaran', x.sasaran) + baris('Waktu', (x.bulan ? BLN_PNJ[x.bulan - 1] + ' · ' : '') + (r.waktu || '')) + baris('Tempat', r.tempat) + baris('Metode/teknik', r.metode) + baris('Media dan alat', r.media) + baris('Materi', r.materi) + '</tbody></table>' +
    '<table class="pr-tbl"><thead><tr><th colspan="2">Langkah-langkah kegiatan</th></tr></thead><tbody>' + baris('1. Kegiatan awal', r.awal) + baris('2. Kegiatan inti', r.inti) + baris('3. Kegiatan penutup', r.penutup) + '</tbody></table>' +
    '<table class="pr-tbl"><thead><tr><th colspan="2">Evaluasi</th></tr></thead><tbody>' + baris('Evaluasi proses', r.evaluasi_proses) + baris('Evaluasi hasil', r.evaluasi_hasil) + '</tbody></table>' + dokTtd() + '</div>';
}
function dokLaporan(d, rk) {
  const rows = d.rows;
  const t = rows.reduce(function (a, x) { a[0] += x.target; a[1] += Math.min(x.total, x.target || x.total); return a; }, [0, 0]);
  let h = dokKepala('LAPORAN PELAKSANAAN PROGRAM BIMBINGAN DAN KONSELING', d, 'dicetak ' + fTgl(ymd(new Date())));
  h += '<h3 class="pr-h3">A. Ringkasan</h3><table class="pr-tbl"><tbody><tr><td style="width:55%">Kegiatan program</td><td>' + rows.length + ' kegiatan</td></tr><tr><td>Capaian target pelaksanaan</td><td>' + t[1] + ' dari ' + t[0] + ' (' + (t[0] ? Math.round(t[1] * 100 / t[0]) : 0) + '%)</td></tr><tr><td>Kegiatan terlaksana (mencapai target)</td><td>' + rows.filter(function (x) { return x.status === 'Terlaksana'; }).length + '</td></tr>' +
    '<tr><td>Layanan BK tercatat / murid terlayani</td><td>' + rk.layanan.total + ' / ' + rk.layanan.murid + ' murid</td></tr><tr><td>Laporan kejadian / kasus selesai</td><td>' + rk.kasus.total + ' / ' + rk.kasus.selesai + '</td></tr><tr><td>Komunikasi dengan orang tua</td><td>' + rk.ortu.total + '</td></tr></tbody></table>';
  h += '<h3 class="pr-h3">B. Realisasi per kegiatan</h3><table class="pr-tbl"><thead><tr><th>No</th><th>Kegiatan</th><th>Bidang</th><th>Target</th><th>Realisasi</th><th>%</th><th>Status</th><th>Terakhir</th></tr></thead><tbody>' + rows.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.topik) + '</td><td>' + esc(x.bidang) + '</td><td style="text-align:center">' + x.target + '</td><td style="text-align:center">' + x.total + '</td><td style="text-align:center">' + x.persen + '%</td><td>' + esc(x.status) + '</td><td>' + (x.terakhir ? esc(fTgl(x.terakhir)) : '-') + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<h3 class="pr-h3">C. Capaian per bidang</h3><table class="pr-tbl"><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Target</th><th>Realisasi</th><th>Capaian</th></tr></thead><tbody>' + rk.program.perBidang.map(function (x) { return '<tr><td>' + esc(x.bidang) + '</td><td style="text-align:center">' + x.kegiatan + '</td><td style="text-align:center">' + x.target + '</td><td style="text-align:center">' + x.realisasi + '</td><td style="text-align:center">' + x.persen + '%</td></tr>'; }).join('') + '</tbody></table>';
  const belum = rows.filter(function (x) { return x.status !== 'Terlaksana'; });
  h += '<h3 class="pr-h3">D. Evaluasi dan tindak lanjut</h3><p>' + esc(d.narasi.program_evaluasi) + '</p>' + (belum.length ? '<p>Kegiatan yang belum mencapai target (' + belum.length + '): ' + belum.slice(0, 15).map(function (x) { return esc(x.topik); }).join('; ') + '. Kegiatan tersebut dijadwalkan ulang atau disesuaikan pada semester berikutnya.</p>' : '<p>Seluruh kegiatan telah mencapai target.</p>') + dokTtd() + '</div>';
  return h;
}

// ── Rekap tahunan ──
function pgRekap() {
  $('#pg-body').innerHTML = skeleton(3);
  return apiC('rekap.tahunan', { arsip: P.pg.arsip }).then(function (r) {
    if (P.pg.tab !== 'rekap' || !$('#pg-body')) return;
    P.pg.rk = r.data;
    const d = r.data;
    const tot = d.program.perBidang.reduce(function (a, x) { return [a[0] + x.target, a[1] + x.realisasi]; }, [0, 0]);
    let h = '<div class="card pad"><div class="row between wrap"><div><h3>Laporan program layanan BK</h3><div class="xs muted">TA ' + esc(d.tahun_ajaran) + ' · ' + esc(d.semester) + (d.arsip ? ' · dari arsip' : ' · data berjalan sejak arsip terakhir') + '</div></div>' +
      '<div class="row wrap"><select class="select" id="pg-arsip" style="width:auto;min-height:40px"><option value="">Tahun berjalan</option>' + r.arsip.map(function (a) { return '<option value="' + esc(a.id) + '"' + (P.pg.arsip === a.id ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('') + '</select>' +
      '<button class="btn" data-act="pg-csv"><i class="bi bi-filetype-csv"></i> CSV</button><button class="btn primary" data-act="rk-pdf"><i class="bi bi-file-earmark-pdf"></i> PDF untuk pengawas</button></div></div></div>';
    h += '<div class="grid g-kpi k5 mt-16" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' + [
      ['indigo', 'bi-journal-check', 'Capaian program', (tot[0] ? Math.min(100, Math.round(tot[1] * 100 / tot[0])) : 0) + '%', tot[1] + ' dari ' + tot[0] + ' target'],
      ['teal', 'bi-heart-pulse', 'Layanan BK', d.layanan.total, d.layanan.murid + ' murid terlayani'],
      ['amber', 'bi-folder2-open', 'Laporan kejadian', d.kasus.total, d.kasus.selesai + ' selesai'],
      ['blue', 'bi-send', 'Rujukan ke BK', d.rujukan.total, d.pembinaanGuru + ' pembinaan awal guru'],
      ['rose', 'bi-chat-dots', 'Komunikasi orang tua', d.ortu.total, 'tercatat']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Target vs realisasi per bidang</h3></div><div class="card-body">' + (d.program.perBidang.length ? d.program.perBidang.map(function (x) {
      return '<div class="mb-12"><div class="row between"><span class="fw6">' + esc(x.bidang) + '</span><span class="xs muted">' + x.realisasi + '/' + x.target + ' · ' + x.persen + '%</span></div><div class="bar"><i style="width:' + x.persen + '%;background:' + COL_BIDANG[x.bidang] + '"></i></div></div>';
    }).join('') : empty('bi-journal-check', 'Belum ada program')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Pelaksanaan layanan BK per bulan</h3></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-lb"></canvas></div></div></div></div>';
    h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Laporan kejadian per kategori</h3></div><div class="card-body">' + (d.kasus.kategori.length ? '<div class="chart-box sm"><canvas id="ch-kk"></canvas></div>' : empty('bi-bar-chart', 'Belum ada laporan')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Layanan menurut komponen & jenis</h3></div>' + ((d.layanan.komponen || []).length ? '<div class="card-body" style="padding-bottom:0">' + d.layanan.komponen.map(function (x) { return hbar(x.nama, d.layanan.total ? x.jumlah * 100 / d.layanan.total : 0, x.jumlah, 'var(--teal)'); }).join('') + '</div>' : '') + (d.layanan.jenis.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jenis</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>' + d.layanan.jenis.map(function (x) { return '<tr><td>' + esc(x.nama) + '</td><td style="text-align:right" class="fw6">' + x.jumlah + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-chat-square', 'Belum ada layanan tercatat') + '</div>') + '</div></div>';
    h += '<div class="card mt-16"><div class="card-head"><h3>Pengumpulan data (instrumen)</h3></div>' + (d.instrumen.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Instrumen</th><th>Jenis</th><th>Sasaran</th><th style="text-align:right">Responden</th></tr></thead><tbody>' + d.instrumen.map(function (x) { return '<tr><td class="fw6">' + esc(x.judul) + '</td><td>' + esc(x.jenis) + '</td><td>' + esc(x.kelas) + '</td><td style="text-align:right">' + x.responden + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card-body">' + empty('bi-clipboard-data', 'Belum ada instrumen') + '</div>') + '</div>';
    h += '<div class="note info mt-16"><i class="bi bi-shield-check"></i><div>Laporan hanya memuat angka agregat; tidak ada nama murid atau isi konseling. Tahun yang sudah diarsipkan tetap dapat dibuka dari pilihan di kanan atas.</div></div>';
    $('#pg-body').innerHTML = h;
    $('#pg-arsip').addEventListener('change', function (e) { P.pg.arsip = e.target.value; pgRekap(); });
    chart('ch-lb', { kind: 'bar', labels: BLN_PNJ.map(function (b) { return b.substr(0, 3); }), data: d.layanan.perBulan, color: '#0D9488', label: 'Layanan per bulan' });
    if (d.kasus.kategori.length) chart('ch-kk', { kind: 'hbar', labels: d.kasus.kategori.map(function (x) { return x.nama; }), data: d.kasus.kategori.map(function (x) { return x.jumlah; }), colors: KAT_COL, label: 'Kejadian per kategori' });
  }).catch(function (e) { isiHtml('#pg-body', errBox(e, true)); });
}
ACT['rk-pdf'] = function (el) { run(el, api('rekap.tahunanPdf', { arsip: P.pg.arsip })).then(function (f) { previewFile({ nama: f.nama, mime: f.mime, base64: f.base64, blok: f.blok }); }).catch(fail); };
ACT['pg-csv'] = function () {
  const d = P.pg.rk; if (!d) return;
  const rows = [['Laporan program layanan BK'], ['Tahun ajaran', d.tahun_ajaran], ['Semester', d.semester], [], ['Bidang', 'Kegiatan', 'Target', 'Realisasi', 'Capaian (%)']]
    .concat(d.program.perBidang.map(function (x) { return [x.bidang, x.kegiatan, x.target, x.realisasi, x.persen]; }))
    .concat([[], ['Daftar kegiatan'], ['Bidang', 'Komponen', 'Topik', 'Sasaran', 'Semester', 'Target', 'Realisasi', 'Status']])
    .concat(d.program.daftar.map(function (x) { return [x.bidang, x.layanan, x.topik, x.sasaran, x.semester, x.target, x.realisasi, x.status]; }))
    .concat([[], ['Indikator', 'Jumlah'], ['Layanan konseling', d.layanan.total], ['Murid dilayani', d.layanan.murid], ['Laporan kejadian', d.kasus.total], ['Kasus selesai', d.kasus.selesai], ['Rujukan', d.rujukan.total], ['Pembinaan awal guru', d.pembinaanGuru], ['Komunikasi orang tua', d.ortu.total], [], ['Layanan per bulan']])
    .concat(BLN_PNJ.map(function (b, i) { return [b, d.layanan.perBulan[i]]; }));
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'program_bk_' + d.tahun_ajaran.replace('/', '-') + '.csv');
  toast('CSV diunduh.');
};
