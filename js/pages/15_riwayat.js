/* SIKOLAB BK v1.15 — js/pages/15_riwayat.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Garis Waktu Murid / Riwayat (F9)
// ════════════════════════════════════════════════════════════
PAGES.riwayat = function (params, tok) {
  if (params.id_murid) return rwLoad(params.id_murid, tok);
  // v1.13: pilih kelas + cari + daftar lengkap bertahap (40 per halaman), cocok untuk ratusan murid.
  P.rw = P.rw || { q: '', kelas: '' };
  P.rw.hal = 1;
  $('#app-container').innerHTML = pageHead('Profil & riwayat murid', 'Garis Waktu Murid', 'Pilih kelas atau cari nama/NIS untuk melihat seluruh catatan murid dalam satu tempat: kehadiran, laporan kejadian, pembinaan guru, layanan BK, komunikasi orang tua, dan hasil instrumen.', '') +
    '<div class="card pad"><div class="row wrap" style="gap:10px"><select id="rw-kelas" class="select" style="width:auto;min-width:160px"><option value="">Semua kelas</option></select>' +
    '<div class="search grow" style="max-width:none;min-width:200px"><i class="bi bi-search"></i><input id="rw-q" class="input" style="padding-left:36px" type="search" placeholder="Cari nama atau NIS murid…" autocomplete="off" value="' + esc(P.rw.q || '') + '"></div></div>' +
    '<div class="xs muted mt-8" id="rw-info"></div></div><div id="rw-list" class="card mt-16">' + skeleton(3) + '</div>';
  const go = function (tambah) {
    P.rw.q = $('#rw-q').value.trim(); P.rw.kelas = $('#rw-kelas').value;
    P.rw.hal = tambah ? P.rw.hal + 1 : 1;
    const btn = $('#rw-more');
    if (btn) btn.disabled = true;
    apiC('murid.daftar', { q: P.rw.q, id_kelas: P.rw.kelas, hal: P.rw.hal }).then(function (r) {
      if (!$('#rw-list') || stale(tok)) return;
      const sel = $('#rw-kelas');
      if (sel.options.length <= 1) {
        sel.innerHTML = '<option value="">Semua kelas (' + r.semua + ' murid)</option>' + r.kelas.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.nama) + ' (' + k.n + ')</option>'; }).join('');
        sel.value = r.idKelas || '';
      }
      $('#rw-info').textContent = r.total ? 'Menampilkan ' + r.rows.length + ' dari ' + r.total + ' murid' + (r.idKelas ? ' di kelas ini' : '') + (P.rw.q ? ' yang cocok dengan "' + P.rw.q + '"' : '') + '.' : '';
      let kls = '';
      $('#rw-list').innerHTML = r.rows.length ? '<div class="cases">' + r.rows.map(function (m) {
        const pemisah = !r.idKelas && !P.rw.q && m.kelas !== kls ? '<div class="rw-sep">' + esc(kls = m.kelas) + '</div>' : '';
        return pemisah + '<button class="case" data-act="open-murid" data-id="' + esc(m.id) + '" style="flex-direction:row;align-items:center"><div class="avatar">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="c-name">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + (m.gw ? ' · <b>dampingan Anda</b>' : '') + '</div></div>' + (m.pola ? chipLevel(m.pola) : '') + arahanIkon(m.id) + '<i class="bi bi-chevron-right muted"></i></button>';
      }).join('') + '</div>' + (r.rows.length < r.total ? '<div class="pad" style="text-align:center"><button class="btn" id="rw-more" data-act="rw-more"><i class="bi bi-plus-circle"></i> Tampilkan ' + Math.min(r.per, r.total - r.rows.length) + ' murid berikutnya</button></div>' : '') : empty('bi-person-x', 'Murid tidak ditemukan', P.rw.q ? 'Coba kata kunci lain atau pilih Semua kelas.' : '');
    }).catch(function (e) { isiHtml('#rw-list', errBox(e)); });
  };
  P.rwGo = go;
  $('#rw-q').addEventListener('input', debounce(function () { go(false); }, 280));
  $('#rw-kelas').addEventListener('change', function () { go(false); });
  if (P.rw.kelas) $('#rw-kelas').innerHTML = '<option value="' + esc(P.rw.kelas) + '" selected>…</option>';
  go(false);
};
ACT['rw-more'] = function () { if (P.rwGo) P.rwGo(true); };
function chipStatusT(cls, text) { return '<span class="chip st-' + esc(slug(cls)) + '">' + esc(text) + '</span>'; }
const TIPE_LABEL = { permintaan: 'Permintaan murid', semua: 'Semua', harian: 'Absensi harian', absensi: 'Absensi mapel', kejadian: 'Kejadian', bimbingan: 'Pembinaan guru', rujukan: 'Rujukan', tinjau: 'Tinjauan BK', monitoring: 'Tindak lanjut', layanan: 'Layanan BK', layanan_privasi: 'Layanan BK', ortu: 'Orang tua', instrumen: 'Instrumen' };
const TIPE_IKON = { permintaan: 'bi-person-raised-hand', harian: 'bi-calendar-check', absensi: 'bi-person-check', kejadian: 'bi-exclamation-triangle', bimbingan: 'bi-people', rujukan: 'bi-send', tinjau: 'bi-eye', monitoring: 'bi-list-check', layanan: 'bi-heart-pulse', layanan_privasi: 'bi-lock-fill', ortu: 'bi-chat-dots', instrumen: 'bi-clipboard-data', poin: 'bi-award', pendampingan: 'bi-person-heart' };
function rwLoad(id, tok) {
  return apiC('riwayat.murid', { id_murid: id }).then(function (d) {
    if (stale(tok)) return;
    P.rwd = d; P.rwTab = P.rwTab && P.rwId === id ? P.rwTab : 'tl'; P.rwFilter = 'semua'; P.rwId = id;
    const m = d.murid, r = d.ringkas;
    const act = [];
    if (d.bolehLayanan) act.push('<button class="btn primary" data-act="rw-layanan"><i class="bi bi-heart-pulse"></i> Catat layanan BK</button>');
    if (d.bolehDampingan) act.push('<button class="btn primary" data-act="gw-catat" data-id="' + esc(m.id) + '"><i class="bi bi-journal-plus"></i> Catat pendampingan</button>');
    if (d.bolehArahan || arahanPeta()[m.id]) act.push('<button class="btn' + (arahanPeta()[m.id] ? ' blue' : '') + '" data-act="arahan-buka" data-id="' + esc(m.id) + '"><i class="bi bi-info-circle' + '' + '"></i> Arahan untuk guru' + (arahanPeta()[m.id] ? ' (' + arahanPeta()[m.id] + ')' : '') + '</button>');
    if (d.bolehLapor) act.push('<button class="btn" data-act="lap-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '"><i class="bi bi-plus-circle"></i> Lapor kejadian</button>');
    if (d.bolehOrtu) act.push('<button class="btn blue" data-act="wa-murid" data-id="' + esc(m.id) + '"><i class="bi bi-whatsapp"></i> Hubungi orang tua</button>');
    if (hasAny(['wali_kelas', 'guru_bk', 'waka', 'kepsek', 'admin']) || d.bolehDampingan) act.push('<button class="btn" data-act="gw-cetak" title="Cetak garis waktu untuk rapat atau orang tua"><i class="bi bi-printer"></i> Cetak</button>');
    else act.push('<button class="btn ghost" data-act="rw-cetak" title="Cetak ringkasan"><i class="bi bi-printer"></i></button>');
    if (hasAny(['wali_kelas', 'guru_bk', 'waka', 'kepsek', 'admin'])) act.push('<button class="btn ghost" data-act="rw-rapat" title="Rekap satu kelas untuk rapat"><i class="bi bi-table"></i> Rekap kelas</button>');
    const ab = r.absenHarian || {};
    let h = '<button class="btn sm ghost mb-8 no-print" data-act="nav" data-page="riwayat"><i class="bi bi-arrow-left"></i> Daftar murid</button>' +
      '<div class="card pad rw-head"><div class="row between wrap" style="gap:16px"><div class="profile-head"><div class="big-av">' + esc(initials(m.nama)) + '</div><div><h2>' + esc(m.nama) + '</h2><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + ' · Wali kelas: ' + esc(m.wali || '-') + (m.guruWali ? ' · Guru wali: ' + esc(m.guruWali) : '') + (d.kolaborasi.guruBk ? ' · Guru BK: ' + esc(d.kolaborasi.guruBk) : '') + (m.status !== 'Aktif' ? ' · <b>' + esc(m.status) + '</b>' : '') + '</div>' +
      '<div class="row wrap mt-8">' + chipStatusT(r.progres === 'Belum ada kasus' ? 'Selesai' : r.progres, r.progres === 'Belum ada kasus' ? 'Tidak ada kasus' : 'Kasus terakhir: ' + r.progres) + (r.pola ? '<span class="chip lv-perhatian"><i class="bi bi-exclamation-triangle"></i> ' + esc(r.pola) + '</span>' : '') + '</div></div></div>' +
      '<div class="row wrap no-print">' + act.join('') + '</div></div></div>' +
      '<div class="stat-row s6 mt-16">' +
        '<div class="stat"><span class="lbl">Masuk sekolah · 6 bln</span><b>' + (r.kehadiranHarian === null || r.kehadiranHarian === undefined ? '-' : r.kehadiranHarian + '%') + '</b><span class="xs muted">S ' + (ab.S || 0) + ' · I ' + (ab.I || 0) + ' · A ' + (ab.A || 0) + ' · T ' + (ab.T || 0) + '</span></div>' +
        '<div class="stat"><span class="lbl">Hadir per mapel · 6 bln</span><b>' + (r.kehadiran === null ? '-' : r.kehadiran + '%') + '</b></div>' +
        '<div class="stat"><span class="lbl">Laporan kejadian</span><b>' + r.laporan + '</b><span class="xs muted">' + r.laporanAktif + ' masih aktif</span></div>' +
        '<div class="stat"><span class="lbl">Layanan BK diikuti</span><b>' + r.layanan + '</b><span class="xs muted">Ind ' + r.layananPer.Individu + ' · Kel ' + r.layananPer.Kelompok + ' · Klas ' + r.layananPer.Klasikal + '</span></div>' +
        (d.bolehLayanan ? '<div class="stat"><span class="lbl">Instrumen diisi</span><b>' + r.instrumen + '</b></div>' : '') +
        '<div class="stat"><span class="lbl">Kontak orang tua</span><b>' + d.komunikasi.length + '</b></div>' +
        (r.poin ? '<div class="stat click" data-act="pn-murid" data-id="' + esc(m.id) + '" style="cursor:pointer"><span class="lbl">Poin tata tertib</span><b>' + r.poin.B + '</b><span class="xs muted">' + esc(r.poin.tahap ? r.poin.tahap.n : 'Belum mencapai tahap') + '</span></div>' : '') + '</div>' +
      '<div class="card mt-16"><div class="tabs" id="rw-tabs">' + [['tl', 'Garis waktu'], ['hadir', 'Kehadiran'], ['kasus', 'Kasus (' + d.kasus.length + ')'], ['layanan', 'Layanan BK (' + d.layanan.length + ')']].concat(d.bolehLayanan ? [['instrumen', 'Instrumen (' + d.instrumen.length + ')']] : []).concat([['kom', 'Orang tua (' + d.komunikasi.length + ')'], ['dok', 'Dokumen (' + d.dokumen.length + ')'], ['kol', 'Kolaborasi']]).map(function (t) { return '<button class="tab ' + (t[0] === P.rwTab ? 'active' : '') + '" data-act="rw-tab" data-t="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div><div class="card-body" id="rw-body"></div></div>';
    $('#app-container').innerHTML = h;
    rwDraw();
  });
}
function rwDraw() {
  const d = P.rwd, b = $('#rw-body'), t = P.rwTab;
  killCharts();
  if (t === 'tl') {
    const seen = {};
    d.timeline.forEach(function (e) { seen[e.tipe === 'layanan_privasi' ? 'layanan' : e.tipe] = 1; });
    const types = ['semua'].concat(['harian', 'absensi', 'kejadian', 'bimbingan', 'rujukan', 'tinjau', 'monitoring', 'layanan', 'permintaan', 'ortu', 'instrumen'].filter(function (x) { return seen[x]; }));
    const ev = d.timeline.filter(function (e) { return P.rwFilter === 'semua' || (e.tipe === 'layanan_privasi' ? 'layanan' : e.tipe) === P.rwFilter; });
    b.innerHTML = '<div class="note info mb-16"><i class="bi bi-info-circle"></i><div>Semua catatan tentang murid ini, dari yang terbaru. Titik berwarna menandai jenisnya; gunakan tombol di bawah untuk menyaring. Kehadiran hanya menampilkan hari tidak hadir/terlambat (1 tahun terakhir).' + '</div></div>' +
      '<div class="fchips wrapc mb-16">' + types.map(function (x) { return '<button class="fchip ' + (x === P.rwFilter ? 'active' : '') + '" data-act="rw-filter" data-t="' + esc(x) + '">' + esc(TIPE_LABEL[x] || x) + '</button>'; }).join('') + '</div>' +
      (ev.length ? '<div class="tl">' + ev.map(function (e) {
        const priv = e.tipe === 'layanan_privasi';
        let btn = '';
        if (e.id_layanan) btn = '<button class="btn sm ghost" data-act="layanan-buka" data-id="' + esc(e.id_layanan) + '">Buka catatan layanan</button>';
        else if (e.id_instrumen) btn = '<button class="btn sm ghost" data-act="in-detail" data-id="' + esc(e.id_instrumen) + '" data-m="' + esc(d.murid.id) + '">Lihat jawaban</button>';
        else if (e.id_kasus && !priv && e.tipe !== 'absensi' && e.tipe !== 'harian') btn = '<button class="btn sm ghost" data-act="kasus-open" data-id="' + esc(e.id_kasus) + '">Buka kasus ' + esc(e.kode || '') + '</button>';
        return '<div class="tl-item ' + esc(e.warna || 'slate') + '"><div class="t-date">' + esc(fTs(e.ts && e.ts.length > 10 && e.tipe !== 'absensi' && e.tipe !== 'harian' ? e.ts : e.tanggal)) + ' · <span class="t-type"><i class="bi ' + (TIPE_IKON[e.tipe] || 'bi-dot') + '"></i> ' + esc(TIPE_LABEL[e.tipe] || '') + '</span>' + (e.meta ? ' · ' + esc(e.meta) : '') + '</div><div class="t-title">' + esc(e.judul) + '</div>' + (e.isi ? '<div class="t-body">' + esc(e.isi) + '</div>' : '') + (e.oleh ? '<div class="t-by">' + esc(e.oleh) + '</div>' : '') + btn + '</div>';
      }).join('') + '</div>' : empty('bi-clock-history', 'Belum ada catatan', 'Catatan muncul setelah ada absensi tidak hadir, laporan, layanan BK, atau komunikasi orang tua.'));
  } else if (t === 'hadir') {
    const rb = d.rekapBulan;
    b.innerHTML = '<div class="chart-box sm"><canvas id="ch-rwh"></canvas></div><div class="tbl-wrap mt-16"><table class="tbl" style="min-width:520px"><thead><tr><th>Bulan</th><th>Hari tercatat</th><th>Kehadiran</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Terlambat</th><th>Alpa mapel</th></tr></thead><tbody>' +
      rb.map(function (x) { return '<tr><td class="fw6">' + esc(blnPanjang(x.bulan)) + '</td><td>' + x.hari + '</td><td>' + (x.hadir === null ? '-' : x.hadir + '%') + '</td><td>' + x.S + '</td><td>' + x.I + '</td><td' + (x.A ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + x.A + '</td><td>' + x.T + '</td><td>' + x.alpaMapel + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="xs muted mt-12">Persentase dari absensi harian (masuk sekolah). Rincian per hari ada di tab Garis waktu dengan filter Absensi.</p>';
    chart('ch-rwh', { kind: 'bar', labels: rb.map(function (x) { return x.label; }), data: rb.map(function (x) { return x.hadir === null ? 0 : x.hadir; }), color: '#0EA5A4', max: 100, label: 'Kehadiran harian per bulan' });
  } else if (t === 'kasus') {
    b.innerHTML = d.kasus.length ? '<div class="cases">' + d.kasus.map(function (k) { return '<button class="case" data-act="kasus-open" data-id="' + esc(k.id) + '"><div class="c-main"><div class="c-top"><span class="mono muted">' + esc(k.kode) + '</span>' + chipUrg(k.urgensi) + chipStatus(k.status) + '</div><div class="fw6 mt-8">' + esc(k.kategori) + '</div><div class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.pelapor) + (k.mode ? ' · ' + esc(k.mode) : '') + '</div></div><i class="bi bi-chevron-right muted"></i></button>'; }).join('') + '</div>' : empty('bi-folder2-open', 'Tidak ada laporan kejadian');
  } else if (t === 'layanan') {
    b.innerHTML = d.layanan.length ? '<div class="ly-list">' + d.layanan.map(function (x) {
      return '<div class="ly-row static"><div class="ly-date"><b>' + esc(x.tanggal.substr(8, 2)) + '</b><span>' + esc(BLN[+x.tanggal.substr(5, 2) - 1] || '') + ' ' + esc(x.tanggal.substr(2, 2)) + '</span></div><div class="grow"><div class="row wrap" style="gap:6px">' + chipKomp(x.komponen) + '<span class="chip neutral">' + esc(x.jenis_layanan) + '</span><span class="chip neutral">' + esc(x.sasaran) + '</span></div><div class="fw6 mt-8">' + esc(x.topik) + '</div><div class="xs muted">' + esc(x.oleh) + (x.bidang ? ' · Bidang ' + esc(x.bidang) : '') + '</div></div>' + (x.bolehBuka ? '<button class="btn sm" data-act="layanan-buka" data-id="' + esc(x.id) + '">Buka</button>' : '') + '</div>';
    }).join('') + '</div>' : empty('bi-heart-pulse', 'Belum ada layanan BK', d.bolehLayanan ? 'Catat layanan dengan tombol "Catat layanan BK".' : 'Layanan BK yang bersifat umum (mis. bimbingan klasikal) akan tampil di sini.');
  } else if (t === 'instrumen') {
    b.innerHTML = d.instrumen.length ? d.instrumen.map(function (x) { return '<div class="sec mb-8"><div class="row between wrap"><div><span class="chip neutral">' + esc(x.jenis) + '</span> <b>' + esc(x.judul) + '</b></div><span class="xs muted">' + esc(fTs(x.ts)) + ' · ' + (x.sumber === 'guru' ? 'diinput Guru BK' : 'diisi murid') + '</span></div><div class="muted-2 mt-8">' + esc(x.ringkas) + '</div><button class="btn sm mt-8" data-act="in-detail" data-id="' + esc(x.id) + '" data-m="' + esc(d.murid.id) + '"><i class="bi bi-eye"></i> Lihat jawaban</button></div>'; }).join('') : empty('bi-clipboard-data', 'Murid ini belum mengisi instrumen');
  } else if (t === 'kom') {
    b.innerHTML = d.komunikasi.length ? d.komunikasi.map(function (k) { return '<div class="sec mb-8"><div class="row between wrap"><span class="chip blue"><i class="bi bi-chat-dots"></i> ' + esc(k.media) + '</span><span class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.oleh) + '</span></div><div class="fw6 mt-8">' + esc(k.tujuan) + '</div><div class="body muted-2" style="line-height:20px">' + esc(k.ringkasan) + '</div>' + (k.hasil ? '<div class="xs mt-8"><b>Hasil:</b> ' + esc(k.hasil) + '</div>' : '') + '</div>'; }).join('') : empty('bi-chat-square', 'Belum ada komunikasi tercatat');
  } else if (t === 'dok') {
    b.innerHTML = d.dokumen.length ? d.dokumen.map(function (x) { return '<div class="row between sec mb-8"><div><div class="fw6">' + esc(x.judul) + '</div><div class="xs muted">' + esc(fTgl(x.tanggal)) + '</div></div><button class="btn sm" data-act="berkas" data-id="' + esc(x.id) + '"><i class="bi bi-eye"></i> Buka</button></div>'; }).join('') : empty('bi-file-earmark', 'Belum ada dokumen');
  } else {
    const k = d.kolaborasi;
    b.innerHTML = '<dl class="kv"><dt>Wali kelas</dt><dd>' + esc(k.wali || '-') + '</dd><dt>Guru BK kelas</dt><dd>' + esc(k.guruBk || 'Semua Guru BK') + '</dd><dt>Guru BK penangani kasus</dt><dd>' + esc(k.penangani || '-') + '</dd><dt>Guru pelapor</dt><dd>' + (k.pelapor.length ? k.pelapor.map(esc).join(', ') : '-') + '</dd>' +
      (d.ortu ? '<dt>Orang tua</dt><dd>' + esc(d.ortu.nama || '-') + '</dd><dt>No. WhatsApp</dt><dd>' + esc(d.ortu.hp || '-') + (d.ortu.hp && !d.ortu.hpValid ? ' <span class="chip st-Baru">format perlu diperbaiki</span>' : '') + '</dd><dt>Email</dt><dd>' + esc(d.ortu.email || '-') + '</dd>' : '') + '</dl>';
  }
}
ACT['rw-tab'] = function (el) { P.rwTab = el.dataset.t; $$('#rw-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); }); rwDraw(); };
ACT['rw-filter'] = function (el) { P.rwFilter = el.dataset.t; rwDraw(); };
ACT['rw-layanan'] = function () { const m = P.rwd.murid; navigateTo('layanan', { murid: { id: m.id, nama: m.nama, kelas: m.kelas } }); };
ACT['rw-cetak'] = function () { P.rwTab = 'tl'; P.rwFilter = 'semua'; rwDraw(); setTimeout(function () { window.print(); }, 200); };
ACT['lap-murid'] = function (el) { navigateTo('lapor', { id_murid: el.dataset.id, nama: el.dataset.n }); };
ACT['ortu-murid'] = function (el) { navigateTo('ortu', { id_murid: el.dataset.id }); };
