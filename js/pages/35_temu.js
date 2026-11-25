/* SIKOLAB BK v1.15 — js/pages/35_temu.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Layanan BK → "Permintaan murid": murid mengisi formulir tanpa akun, Guru BK menjadwalkan & menindaklanjuti
// ════════════════════════════════════════════════════════════
function temuRingkas() {
  const box = $('#ly-temu'); if (!box) return;
  apiC('temu.daftar', {}).then(function (d) {
    P.temu = d;
    const b = d.hitung.Baru, j = d.hitung.Dijadwalkan;
    box.innerHTML = '<div class="temu-bar' + (b ? ' ada' : '') + '"><span class="t-ic"><i class="bi bi-person-raised-hand"></i></span><div class="grow"><b>' + (b ? b + ' murid ingin bertemu Guru BK' : 'Permintaan konseling dari murid') + '</b><span>' + (d.atur.aktif ? 'Formulir terbuka' + (j ? ' · ' + j + ' pertemuan dijadwalkan' : '') : 'Formulir murid belum dibuka. Murid bisa meminta bertemu Guru BK tanpa akun.') + '</span></div>' +
      '<button class="btn sm" data-act="temu-atur"><i class="bi bi-sliders"></i> Formulir</button><button class="btn sm primary" data-act="temu-buka"><i class="bi bi-inbox"></i> Buka' + (b + j ? ' (' + (b + j) + ')' : '') + '</button></div>';
  }).catch(function () { box.innerHTML = ''; });
}
ACT['temu-buka'] = function () { temuDrawer('aktif'); };
const TEMU_ST = { Baru: 'st-Baru', Dijadwalkan: 'st-Diproses', Selesai: 'st-Selesai', Ditutup: 'neutral' };
function temuDrawer(filter) {
  P.temuF = filter || P.temuF || 'aktif';
  const dr = openDrawer({ head: '<div class="grow"><div class="crumb">Layanan BK</div><h3 style="margin:0">Permintaan murid</h3></div>', body: skeleton(3) });
  P.temuDr = dr;
  temuMuat();
}
function temuMuat() {
  const dr = P.temuDr; if (!dr) return;
  const st = P.temuF === 'aktif' ? '' : P.temuF;
  apiC('temu.daftar', { status: st }).then(function (d) {
    P.temu = d;
    dr.body.innerHTML = '<div class="fchips">' + [['aktif', 'Perlu tindak lanjut (' + (d.hitung.Baru + d.hitung.Dijadwalkan) + ')'], ['Selesai', 'Selesai'], ['Ditutup', 'Ditutup'], ['semua', 'Semua']].map(function (x) { return '<button class="fchip ' + (P.temuF === x[0] ? 'active' : '') + '" data-act="temu-f" data-f="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' +
      (d.rows.length ? '<div class="col gap-12 mt-16">' + d.rows.map(function (x, i) {
        return '<div class="temu-item' + (x.urgensi === 'Segera' && x.status === 'Baru' ? ' segera' : '') + '"><div class="row between wrap"><div><b>' + esc(x.murid.nama) + '</b><div class="xs muted">' + esc(x.murid.kelas) + ' · NIS ' + esc(x.murid.nis) + ' · ' + esc(fTs(x.ts)) + '</div></div><div class="row wrap" style="gap:6px">' + (x.urgensi === 'Segera' ? '<span class="chip u-Mendesak"><i class="bi bi-circle-fill"></i> Segera</span>' : '') + '<span class="chip ' + (TEMU_ST[x.status] || 'neutral') + '">' + esc(x.status) + '</span></div></div>' +
          '<div class="row wrap mt-8" style="gap:6px"><span class="chip purple">' + esc(x.topik) + '</span><span class="chip neutral"><i class="bi bi-clock"></i> ' + esc(x.waktu) + '</span></div>' +
          (x.cerita ? '<div class="temu-cerita mt-8">' + esc(x.cerita) + '</div>' : '') +
          (x.jadwal ? '<div class="xs mt-8"><b>Jadwal:</b> ' + esc(x.jadwal) + '</div>' : '') + (x.catatan_bk ? '<div class="xs muted mt-8">Catatan BK: ' + esc(x.catatan_bk) + '</div>' : '') + (x.penangani ? '<div class="xs muted">Ditangani: ' + esc(x.penangani) + '</div>' : '') +
          '<div class="row wrap mt-12" style="gap:6px">' + (x.status === 'Baru' || x.status === 'Dijadwalkan' ? '<button class="btn sm" data-act="temu-jadwal" data-i="' + i + '"><i class="bi bi-calendar-event"></i> ' + (x.jadwal ? 'Ubah jadwal' : 'Jadwalkan') + '</button><button class="btn sm primary" data-act="temu-layanan" data-i="' + i + '"><i class="bi bi-heart-pulse"></i> Catat layanan</button><button class="btn sm ghost" data-act="temu-tutup" data-i="' + i + '">Tutup</button>' : '') +
          '<button class="btn sm ghost" data-act="open-murid" data-id="' + esc(x.murid.id) + '"><i class="bi bi-activity"></i> Garis waktu</button></div></div>';
      }).join('') + '</div>' : empty('bi-inbox', P.temuF === 'aktif' ? 'Tidak ada permintaan yang menunggu' : 'Belum ada data', d.atur.aktif ? '' : 'Buka formulir murid lewat tombol Formulir di halaman Layanan BK.'));
  }).catch(function (e) { dr.body.innerHTML = errBox(e); });
}
ACT['temu-f'] = function (el) { P.temuF = el.dataset.f; temuMuat(); };
ACT['temu-jadwal'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  const m = openModal({
    title: 'Jadwalkan pertemuan', sub: x.murid.nama + ' · ' + x.murid.kelas,
    body: '<form id="f-tj" class="form-grid" novalidate>' + fld({ name: 'jadwal', label: 'Waktu & tempat pertemuan', req: true, max: 80, value: x.jadwal || '', ph: 'mis. Selasa 28 Okt · istirahat pertama · Ruang BK', hint: 'Murid tidak punya akun; sampaikan jadwal secara langsung atau lewat wali kelas.' }) +
      fld({ name: 'catatan_bk', label: 'Catatan (hanya Guru BK)', type: 'textarea', rows: 3, max: 1000, value: x.catatan_bk || '' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tj-ok">Simpan</button>'
  });
  $('#tj-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-tj', m.el), d = formData(f);
    if (!validate(f, d, { jadwal: { label: 'Waktu pertemuan', req: true, min: 3 } })) return;
    run(e.currentTarget, api('temu.ubah', { id: x.id, status: 'Dijadwalkan', jadwal: d.jadwal, catatan_bk: d.catatan_bk })).then(function () { m.close(); toast('Pertemuan dijadwalkan.'); temuMuat(); temuRingkas(); }).catch(fail);
  });
};
ACT['temu-tutup'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  const m = openModal({
    title: 'Tutup permintaan', sub: x.murid.nama,
    body: fld({ name: 'catatan_bk', label: 'Alasan / catatan', type: 'textarea', rows: 3, max: 1000, ph: 'mis. Sudah ditemui langsung; permintaan ganda; bukan dari murid yang bersangkutan.' }),
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tt-ok">Tutup permintaan</button>'
  });
  $('#tt-ok', m.el).addEventListener('click', function (e) {
    run(e.currentTarget, api('temu.ubah', { id: x.id, status: 'Ditutup', catatan_bk: $('[name=catatan_bk]', m.el).value })).then(function () { m.close(); toast('Permintaan ditutup.'); temuMuat(); temuRingkas(); }).catch(fail);
  });
};
ACT['temu-layanan'] = function (el) {
  const x = P.temu.rows[+el.dataset.i];
  if (P.temuDr) P.temuDr.close();
  lyForm(null, { murid: { id: x.murid.id, nama: x.murid.nama, kelas: x.murid.kelas }, sumber: 'Inisiatif murid', komponen: x.topik === 'Rencana sekolah lanjutan/karier' ? 'Peminatan & Perencanaan Individual' : 'Responsif', sasaran: 'Individu', permintaan: x.id, topik: x.topik });
};
ACT['temu-atur'] = function () {
  const m = openModal({ title: 'Formulir "Saya ingin bertemu Guru BK"', sub: 'Murid mengisi tanpa akun: kode formulir + NIS. Permintaan masuk ke lonceng Guru BK.', size: 'lg', body: skeleton(2), foot: '<button class="btn" data-close>Tutup</button>' });
  const gambar = function (a) {
    m.body.innerHTML = '<div class="row between wrap"><div><b>Status formulir</b><div class="xs muted">' + (a.aktif ? 'Terbuka. Murid dapat mengirim permintaan.' : 'Tertutup. Murid melihat pesan agar datang langsung ke ruang BK.') + '</div></div><button class="btn ' + (a.aktif ? 'soft-danger' : 'primary') + '" id="ta-tg">' + (a.aktif ? 'Tutup formulir' : 'Buka formulir') + '</button></div>' +
      (a.aktif && a.url ? '<div class="grid g-2 mt-16" style="align-items:center"><div class="temu-qr">' + QR.svg(a.url, { margin: 2 }) + '</div><div class="col gap-12"><div><div class="xs muted">Kode formulir</div><div class="mono" style="font-size:28px;letter-spacing:4px">' + esc(a.kode) + '</div></div>' +
        '<div class="field"><label for="ta-url">Tautan</label><input class="input" id="ta-url" readonly value="' + esc(a.url) + '"></div><div class="row wrap"><button class="btn sm" id="ta-salin"><i class="bi bi-clipboard"></i> Salin tautan</button><button class="btn sm" id="ta-poster"><i class="bi bi-printer"></i> Cetak poster</button><button class="btn sm ghost" id="ta-ganti"><i class="bi bi-arrow-repeat"></i> Ganti kode</button></div></div></div>' +
        '<div class="note info mt-16"><i class="bi bi-info-circle"></i><div class="xs">Tempel poster di kelas/mading, bagikan tautan di grup kelas, atau tuliskan kode di papan. Ganti kode bila ada penyalahgunaan; tautan lama otomatis tidak berlaku. Pemberitahuan email ke Guru BK tidak memuat nama murid maupun isi cerita.</div></div>' : '') +
      (a.aktif && !a.url ? '<div class="note mt-16"><i class="bi bi-exclamation-triangle"></i><div class="xs">Tautan aplikasi belum terbaca. Pastikan aplikasi sudah di-deploy sebagai Web App.</div></div>' : '');
    $('#ta-tg', m.el).addEventListener('click', function (e) { run(e.currentTarget, api('temu.atur', { aktif: !a.aktif })).then(function (b) { gambar(b); temuRingkas(); toast(b.aktif ? 'Formulir dibuka.' : 'Formulir ditutup.'); }).catch(fail); });
    if ($('#ta-salin', m.el)) {
      $('#ta-salin', m.el).addEventListener('click', function () { salin(a.url, 'Tautan disalin.'); });
      $('#ta-ganti', m.el).addEventListener('click', function (e) { confirmDlg('Kode lama dan tautan/poster lama tidak berlaku lagi. Lanjutkan?', 'Ganti kode', true).then(function (ok) { if (ok) run(e.target.closest('button'), api('temu.atur', { ganti: true })).then(gambar).catch(fail); }); });
      $('#ta-poster', m.el).addEventListener('click', function () { m.close(); temuPoster(a); });
    }
  };
  api('temu.atur', {}).then(gambar).catch(function (e) { m.body.innerHTML = errBox(e); });
};
function temuPoster(a) {
  const h = '<div class="pr-doc poster"><div class="ps-band">' + esc(a.sekolah || S.cfg.namaSekolah) + '</div><h1>Ingin bercerita dengan Guru BK?</h1><p class="ps-lead">Tentang belajar, teman, keluarga, perasaan, atau rencana sekolah lanjutan. Kamu tidak sendirian.</p>' +
    '<div class="ps-qr">' + QR.svg(a.url, { margin: 2 }) + '</div><ol class="ps-step"><li>Pindai kode QR di atas dengan HP.</li><li>Masukkan kode <b class="mono">' + esc(a.kode) + '</b> dan NIS-mu.</li><li>Pilih topik dan waktu yang kamu inginkan. Guru BK akan menemuimu.</li></ol>' +
    '<p class="ps-note">Ceritamu hanya dibaca Guru BK. Dalam keadaan darurat, segera temui guru terdekat atau datang ke ruang BK.</p></div>';
  cetakHtml(h, { judul: 'Poster formulir bertemu Guru BK', ket: 'A4 tegak · tempel di kelas atau mading' });
}
