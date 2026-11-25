/* SIKOLAB BK v1.15 — js/pages/10_beranda.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Beranda (dashboard) — insight bergaya AI, deteksi dini, distribusi
// ════════════════════════════════════════════════════════════
function sapaan() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
function tglPanjang(s) { const d = new Date(+s.substr(0, 4), +s.substr(5, 2) - 1, +s.substr(8, 2)); return HRI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
const ROLE_DESC = {
  guru_bk: 'Layani semua murid: tinjau laporan guru, tanggapi rujukan, pantau pola kehadiran, dan catat layanan BK hari ini.',
  wali_kelas: 'Ringkasan kelas perwalian. Buka Kelas Saya untuk melihat kondisi setiap murid.',
  guru_mapel: 'Catat kehadiran kelas yang Anda ampu dan laporkan kejadian dengan cepat.',
  waka: 'Kasus yang dieskalasikan ke kesiswaan beserta tindak lanjut Anda.',
  kepsek: 'Gambaran menyeluruh kehadiran dan penanganan kasus (data agregat, tanpa nama murid).',
  admin: 'Kelola pengguna, data master, dan pengaturan sistem.'
};

function homeType() { return ['guru_bk', 'kepsek', 'waka', 'wali_kelas', 'guru_mapel', 'admin'].filter(hasRole)[0]; }

PAGES.beranda = function (_, tok) {
  const pre = S.pre && S.pre.beranda, basi = !!(S.pre && S.pre.basi); S.pre = null;
  if (pre) { ccSeed('dashboard.get', undefined, pre); if (basi) { const e = CC[ccKey('dashboard.get', undefined)]; if (e) e.t = 0; } }
  return (pre ? Promise.resolve(pre) : apiC('dashboard.get')).then(function (d) {
    if (stale(tok)) return;
    P.home = d;
    // v1.14: angka dari hitungan terakhir ditampilkan dulu, lalu diperbarui diam-diam (digambar ulang bila berubah)
    if (basi) setTimeout(function () { if (!stale(tok)) apiC('dashboard.get').catch(function () { }); }, 300);
    const first = S.user.nama.replace(/,.*$/, '').split(' ').slice(0, 2).join(' ');
    const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
    const acts = (hasRole('guru_mapel') ? '<button class="btn" data-act="nav" data-page="absensi"><i class="bi bi-person-check"></i> Presensi Kelas</button>' : '') +
      (lapor ? '<button class="btn primary" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '');
    const nk = d.kpis.length;
    let h = pageHead(tglPanjang(d.tanggal), sapaan() + ', ' + first, ROLE_DESC[d.tipe] || '', acts) + bannerVersi();
    h += '<div class="grid g-kpi ' + (nk >= 6 ? 'k6' : nk === 5 ? 'k5' : 'k4') + '">' + d.kpis.map(function (k) {
      return '<button class="kpi ' + esc(k.color) + '" data-act="kpi" data-go="' + esc(k.go) + '" data-filter="' + esc(k.filter) + '"><span class="k-ic"><i class="bi ' + esc(k.icon) + '"></i></span><div class="k-lb">' + esc(k.label) + '</div><div><div class="k-v">' + esc(k.value) + '</div><div class="k-s">' + esc(k.sub) + '</div></div></button>';
    }).join('') + '</div>';

    if (d.kelasHariIni && d.kelasHariIni.length) {
      const adaJdw = d.kelasHariIni.some(function (k) { return k.jadwal; });
      h += '<div class="card mt-16"><div class="card-head"><h3>' + (adaJdw ? 'Jadwal Anda hari ini' : 'Kelas yang Anda ampu') + '</h3><span class="xs muted">Ketuk untuk mulai absensi</span></div><div class="card-body"><div class="grid g-3">' + d.kelasHariIni.map(function (k) {
        return '<button class="card pad" style="text-align:left;cursor:pointer;color:inherit" data-act="absen-go" data-k="' + esc(k.id_kelas) + '" data-m="' + esc(k.id_mapel) + '" data-j="' + esc(k.jam || '') + '"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.kelas) + '</b>' + (k.sudah ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : '<span class="chip st-Baru">Belum</span>') + '</div><div class="xs muted mt-8">' + esc(k.mapel) + (k.jam ? ' · Jam ' + esc(k.jam) : '') + '</div></button>';
      }).join('') + '</div></div></div>';
    }

    if (d.harian && d.harian.length) {
      const hs = d.harian.filter(function (x) { return x.tercatat; }).length;
      h += '<div class="card mt-16"><div class="card-head"><div><h3><i class="bi bi-calendar-check" style="color:var(--teal)"></i> Absensi Harian Hari Ini</h3><div class="xs muted">' + hs + ' dari ' + d.harian.length + ' kelas sudah dicatat</div></div><button class="btn sm ghost" data-act="ke-harian">Buka <i class="bi bi-arrow-right"></i></button></div><div class="card-body"><div class="grid g-3">' + d.harian.slice(0, 12).map(function (k) {
        return '<button class="card pad har-kls" data-act="ke-harian"><div class="row between"><b class="fw7" style="font-family:var(--font-h)">' + esc(k.nama) + '</b>' + (k.tercatat ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Tercatat</span>' : (k.qr ? '<span class="chip blue">Sebagian</span>' : '<span class="chip st-Baru">Belum</span>')) + '</div><div class="xs muted mt-8">' + (k.tercatat ? 'Hadir ' + k.hadir + '/' + k.jumlah + (k.S ? ' · S ' + k.S : '') + (k.I ? ' · I ' + k.I : '') + (k.A ? ' · <b style="color:var(--rose)">A ' + k.A + '</b>' : '') : (k.qr ? '<i class="bi bi-qr-code-scan"></i> ' + k.qr + '/' + k.jumlah + ' sudah memindai · lengkapi' : k.jumlah + ' murid')) + '</div></button>';
      }).join('') + '</div></div></div>';
    }
    if (d.tipe !== 'admin') h += arahanBerandaHtml();
    const KIRI = '<div class="grid g-2 mt-16"><div class="col gap-16">', KANAN = '</div><div class="col gap-16">';
    h += KIRI;
    if (d.tipe === 'guru_bk') h += tugasBKHtml();
    if (d.tipe === 'guru_bk' || d.tipe === 'wali_kelas') {
      h += '<div class="card"><div class="card-head"><div><h3><i class="bi bi-radar" style="color:var(--rose)"></i> Deteksi Dini Pola Kehadiran</h3><div class="xs muted">30 hari terakhir · ' + d.polaTotal + ' murid ditandai' + (d.polaKritis ? ' · ' + d.polaKritis + ' kritis' : '') + '</div></div></div><div style="margin-top:8px">' +
        (d.pola.length ? d.pola.map(function (x) {
          return '<div class="pola-item"><div class="row between wrap"><div class="row"><div class="avatar" style="width:34px;height:34px;font-size:11px;background:' + (x.level === 'kritis' ? 'var(--rose)' : x.level === 'perhatian' ? 'var(--amber)' : 'var(--teal)') + '">' + esc(initials(x.nama)) + '</div><div><div class="fw7" style="font-family:var(--font-h)">' + esc(x.nama) + '</div><div class="xs muted">' + esc(x.kelas) + ' · NIS ' + esc(x.nis) + '</div></div></div>' + chipLevel(x.level) + '</div>' +
            '<div class="muted-2">' + esc(x.deskripsi) + '</div>' + (polaTanda(x) ? '<div class="row wrap" style="gap:6px">' + polaTanda(x) + '</div>' : '') + '<div class="row wrap"><button class="btn sm" data-act="open-murid" data-id="' + esc(x.id_murid) + '"><i class="bi bi-activity"></i> Garis waktu</button><button class="btn sm dark" data-act="pola-rujuk" data-id="' + esc(x.id_murid) + '"><i class="bi bi-send"></i> Buat rujukan</button>' + polaTombol(x) + '</div></div>';
        }).join('') : empty('bi-shield-check', 'Tidak ada pola yang mengkhawatirkan', 'Sistem memeriksa pola alpa berulang, bolos di tengah hari, dan keterlambatan.')) + '</div></div>';
      P.polaIdx = {}; d.pola.forEach(function (x) { P.polaIdx[x.id_murid] = x; });
    }
    if (d.rujukanTerkini && d.rujukanTerkini.length) {
      h += '<div class="card"><div class="card-head"><h3>Kasus terbaru</h3><button class="btn sm ghost" data-act="nav" data-page="kasus">Lihat semua <i class="bi bi-arrow-right"></i></button></div><div class="cases" style="margin-top:8px">' + d.rujukanTerkini.map(caseRow).join('') + '</div></div>';
    }
    if (d.tipe === 'admin') {
      if (S.saranTA && S.saranTA.perlu) h += '<div class="card pad" style="border-color:var(--amber)"><div class="row"><span class="step-n"><i class="bi bi-calendar-event"></i></span><div class="grow"><h3>Saatnya pergantian tahun ajaran?</h3><div class="xs muted">Kalender: ' + esc(S.saranTA.tahun_ajaran) + ' ' + esc(S.saranTA.semester) + ' · aplikasi: ' + esc(S.saranTA.sekarang) + '</div></div></div><button class="btn dark block mt-12" data-act="ke-tahun"><i class="bi bi-archive"></i> Arsip, kenaikan kelas & tahun ajaran baru</button></div>';
      h += '<div class="card pad"><h3>Mulai dari sini</h3><p class="muted mt-8" style="margin-top:4px">Lengkapi data master agar guru dapat bekerja: kelas, murid, mata pelajaran, lalu penugasan pengampu.</p><div class="row wrap mt-16"><button class="btn dark" data-act="nav" data-page="admin"><i class="bi bi-gear"></i> Buka Administrasi</button><button class="btn" data-act="nav" data-page="laporan"><i class="bi bi-bar-chart"></i> Laporan & Rekap</button></div></div>';
    }
    if (d.tipe === 'kepsek') {
      h += '<div class="card pad"><h3>Laporan resmi</h3><p class="muted mt-8" style="margin-top:4px">Unduh rekap kehadiran dan kasus per periode dalam bentuk PDF untuk rapat dan pelaporan.</p><div class="row wrap mt-16"><button class="btn dark" data-act="nav" data-page="laporan"><i class="bi bi-file-earmark-pdf"></i> Laporan & Rekap</button></div></div>';
    }
    h += KANAN;
    if (d.tipe === 'guru_bk') h += '<div class="card" id="bk-ceklist"><div class="card-body">' + skeleton(1) + '</div></div>';
    if (d.insight && d.insight.length) {
      h += '<div class="insight"><span class="ai-tag"><i class="bi bi-stars"></i> Insight otomatis</span><ul>' + d.insight.map(function (t) { return '<li><i class="bi bi-lightbulb"></i><span>' + esc(t) + '</span></li>'; }).join('') + '</ul><div class="xs muted mt-12">Dihitung dari data absensi dan kasus (agregat). Bukan diagnosis.</div></div>';
    }
    if (d.distribusi) {
      h += '<div class="card"><div class="card-head"><div><h3>Distribusi Kasus</h3><div class="xs muted">Per kategori kejadian</div></div><div class="fchips" id="dist-tabs">' + ['minggu', 'bulan', 'semester'].map(function (r) { return '<button class="fchip ' + (r === 'bulan' ? 'active' : '') + '" data-act="dist" data-r="' + r + '">' + { minggu: 'Minggu', bulan: 'Bulan', semester: 'Semester' }[r] + '</button>'; }).join('') + '</div></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-dist" aria-label="Grafik distribusi kasus"></canvas></div><div class="legend mt-12" id="dist-leg"></div></div></div>';
    }
    if (d.tipe === 'guru_bk') h += petaBK();
    // Kolom kanan kosong (mis. Beranda guru mapel): tampilkan satu kolom penuh.
    if (h.slice(-KANAN.length) === KANAN) { const i = h.lastIndexOf(KIRI); h = h.slice(0, i) + '<div class="col gap-16 mt-16">' + h.slice(i + KIRI.length, -KANAN.length) + '</div>'; }
    else h += '</div></div>';
    $('#app-container').innerHTML = h;
    if (d.distribusi) drawDist(d.distribusi);
    if (d.tipe === 'guru_bk') ceklistBK();
  });
};
ACT.kpi = function (el) {
  const go = el.dataset.go;
  if (!go) return;
  if (!S.menu.some(function (m) { return m.id === go; })) return;
  const f = el.dataset.filter;
  if (go === 'absensi') { navigateTo('absensi', f ? { tab: f } : {}); return; }
  if (f === 'tinjau') { navigateTo('kasus', { filter: 'tinjau' }); return; }
  navigateTo(go, f ? { status: f === 'Baru' && go === 'kasus' ? '' : f, rujukan: go === 'kasus' && f === 'Baru' ? 'Baru' : '' } : {});
};
function drawDist(dist) {
  chart('ch-dist', { kind: 'stack', labels: dist.labels, series: dist.series.map(function (s, i) { return { name: s.nama, data: s.data, color: KAT_COL[i % KAT_COL.length] }; }), label: 'Distribusi kasus' });
  $('#dist-leg').innerHTML = dist.total ? dist.perKategori.map(function (k, i) { return '<div><span class="dotc" style="background:' + KAT_COL[i % KAT_COL.length] + '"></span>' + esc(k.nama) + '<b>' + k.persen + '%</b></div>'; }).join('') : '<div class="xs muted" style="grid-column:1/-1">Belum ada kasus pada rentang ini.</div>';
}
ACT.dist = function (el) {
  $$('#dist-tabs .fchip').forEach(function (b) { b.classList.toggle('active', b === el); });
  apiC('dashboard.distribusi', { rentang: el.dataset.r }).then(drawDist).catch(fail);
};
ACT['ke-harian'] = function () { navigateTo('absensi', { tab: 'harian' }); };
ACT['ke-tahun'] = function () { navigateTo('admin', { tab: 'tahun' }); };
ACT['absen-go'] = function (el) { navigateTo('absensi', { id_kelas: el.dataset.k, id_mapel: el.dataset.m, jam: el.dataset.j || '' }); };

/** Baris kasus (dipakai di beranda dan daftar kasus). */
function caseRow(k) {
  return '<button class="case" data-act="kasus-open" data-id="' + esc(k.id) + '"><div class="c-main"><div class="c-top"><span class="mono muted">' + esc(k.kode) + '</span>' + chipUrg(k.urgensi) + chipStatus(k.status) + (k.eskalasi ? '<span class="chip st-Eskalasi"><i class="bi bi-arrow-up-right"></i> Waka</span>' : '') + (k.berulang ? '<span class="chip st-Eskalasi" title="Dilaporkan ' + k.ulang + ' kali dalam 30 hari"><i class="bi bi-arrow-repeat"></i> Berulang ' + k.ulang + '×</span>' : '') + (k.limpah ? '<span class="chip st-Ditangani-Wali-Kelas" title="Dilimpahkan ke wali kelas"><i class="bi bi-arrow-left-right"></i> ' + esc(k.limpah) + '</span>' : '') + (k.mode === 'info' ? '<span class="chip st-Pembinaan-Guru" title="Pelapor sudah membina; BK cukup mengetahui"><i class="bi bi-check2"></i> Sudah dibina guru</span>' : '') + (k.perluTinjau && hasRole('guru_bk') ? '<span class="chip blue"><i class="bi bi-eye"></i> Belum ditinjau</span>' : (k.ditinjau ? '<span class="chip neutral" title="Sudah ditinjau Guru BK"><i class="bi bi-check2-all"></i> Ditinjau BK</span>' : '')) + '</div>' +
    '<div class="c-name" style="margin-top:4px">' + esc(k.murid) + ' <span class="muted fw6" style="font-size:12px">· ' + esc(k.kelas) + '</span></div>' +
    '<div class="xs muted-2 mt-8" style="margin-top:2px">' + esc(k.kategori) + ' — ' + esc(k.ringkas) + '</div></div>' +
    '<div class="xs muted" style="text-align:right;flex:none">' + esc(fTgl(k.tanggal)) + '<br>' + esc(k.pelapor) + (k.penangani ? '<br><span class="muted-2"><i class="bi bi-person-badge"></i> ' + esc(k.penangani) + '</span>' : (k.pj ? '<br><span class="muted-2"><i class="bi bi-person-badge"></i> ' + esc(k.pj) + '</span>' : '')) + '</div></button>';
}

// ── Rujukan langsung dari deteksi pola ──
ACT['pola-rujuk'] = function (el) {
  const x = (P.polaIdx || {})[el.dataset.id]; if (!x) return;
  const urg = S.refs.urgensi.map(function (u) { return u.nama; });
  const defU = x.level === 'kritis' ? urg[0] : x.level === 'perhatian' ? (urg[1] || urg[0]) : (urg[2] || urg[urg.length - 1]);
  const kat = S.refs.kejadian.indexOf('Kehadiran') >= 0 ? 'Kehadiran' : S.refs.kejadian[0];
  const m = openModal({
    title: 'Rujuk ke Guru BK', sub: x.nama + ' · ' + x.kelas,
    body: '<div class="note info"><i class="bi bi-info-circle"></i><div>Pola terdeteksi sistem: <b>' + esc(x.deskripsi) + '</b>. Sistem akan membuat laporan kejadian otomatis lalu rujukan.</div></div><form class="form-grid mt-12" id="f-pr" novalidate>' +
      fld({ name: 'kategori', label: 'Kategori', type: 'select', opts: S.refs.kejadian, value: kat }) +
      fld({ name: 'urgensi', label: 'Tingkat urgensi', type: 'select', opts: urg, value: defU }) +
      fld({ name: 'alasan', label: 'Alasan rujukan', type: 'textarea', req: true, rows: 3, max: 1500, value: 'Pola ketidakhadiran: ' + x.deskripsi }) +
      fld({ name: 'kronologi', label: 'Kronologi / catatan', type: 'textarea', req: true, rows: 3, max: 5000, value: 'Terdeteksi dari data absensi 30 hari terakhir: ' + x.deskripsi + '.' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="pr-ok">Kirim rujukan</button>'
  });
  $('#pr-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-pr', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan', req: true }, kronologi: { label: 'Kronologi', req: true } })) return;
    d.id_murid = x.id_murid;
    run(e.currentTarget, api('rujukan.buat', d)).then(function (r) { m.close(); toast('Rujukan terkirim (' + r.kode + ').'); navigateTo('kasus', { open: r.id_laporan }); }).catch(fail);
  });
};

/** Modal rujukan untuk kasus yang sudah ada. */
function openRujukanModal(idLap, kode, defUrg, after) {
  const urg = S.refs.urgensi.map(function (u) { return u.nama; });
  const m = openModal({
    title: 'Rujuk ke Guru BK', sub: kode,
    body: '<form class="form-grid" id="f-rj" novalidate>' +
      fld({ name: 'urgensi', label: 'Tingkat urgensi', type: 'select', opts: urg, value: defUrg || urg[1] || urg[0] }) +
      fld({ name: 'alasan', label: 'Alasan rujukan', type: 'textarea', req: true, rows: 4, max: 1500, ph: 'Mengapa kasus ini perlu penanganan Guru BK?' }) + '</form>' +
      '<div class="xs muted mt-12">Ringkasan pembimbingan awal akan dilampirkan otomatis. Guru BK dapat menerima, menunda, atau menolak disertai alasan.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="rj-ok">Kirim rujukan</button>'
  });
  $('#rj-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-rj', m.el), d = formData(f);
    if (!validate(f, d, { alasan: { label: 'Alasan rujukan', req: true, min: 10 } })) return;
    d.id_laporan = idLap;
    run(e.currentTarget, api('rujukan.buat', d)).then(function () { m.close(); toast('Rujukan terkirim ke Guru BK.'); if (after) after(); }).catch(fail);
  });
}
