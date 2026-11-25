/* SIKOLAB BK v1.15 — js/pages/19_arsip.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Administrasi → Tahun Ajaran: arsip, kenaikan kelas, tahun ajaran baru
// ════════════════════════════════════════════════════════════
const NAMA_SHEET = { Absensi: 'Catatan absensi', LaporanKejadian: 'Laporan kejadian', PembimbinganAwal: 'Pembinaan awal guru', Rujukan: 'Rujukan', LayananBK: 'Layanan konseling', Monitoring: 'Tindak lanjut', KomunikasiOrtu: 'Komunikasi orang tua', InstrumenJawab: 'Jawaban instrumen', LogAktivitas: 'Log aktivitas' };
function adTahun() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('arsip.ringkasan').then(function (r) {
    P.ar = r;
    const sa = r.saran;
    let h = '';
    if (sa.perlu) {
      h += '<div class="note info mb-16"><i class="bi bi-calendar-event"></i><div><b>Kalender menunjukkan tahun ajaran ' + esc(sa.tahun_ajaran) + ' semester ' + esc(sa.semester) + '</b>, sedangkan aplikasi masih di ' + esc(sa.sekarang) + '. Ikuti tiga langkah di bawah (urutannya penting).</div></div>';
    } else {
      h += '<div class="note info mb-16"><i class="bi bi-check-circle"></i><div>Tahun ajaran aplikasi (<b>' + esc(r.tahun_ajaran) + ' ' + esc(r.semester) + '</b>) sudah sesuai kalender. Gunakan halaman ini saat pergantian semester atau tahun ajaran.</div></div>';
    }
    // Langkah 1
    const rows = Object.keys(r.jumlah).map(function (k) { return '<tr><td>' + esc(NAMA_SHEET[k] || k) + '</td><td style="text-align:right" class="fw6">' + r.jumlah[k] + '</td></tr>'; }).join('');
    h += '<div class="grid g-2 eq"><div class="card pad"><div class="row"><span class="step-n">1</span><div><h3>Arsipkan & bersihkan data</h3><div class="xs muted">Akhir tahun ajaran</div></div></div>' +
      '<p class="muted-2 mt-12" style="margin-top:12px">Seluruh basis data disalin ke folder Drive <b>Arsip</b> (termasuk ringkasan statistik untuk laporan tahunan). Setelah salinan terverifikasi, data transaksi dikosongkan agar aplikasi kembali ringan. Data master (pengguna, kelas, murid, mapel, program & kerangka instrumen) tetap ada.</p>' +
      '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Data yang akan dikosongkan</th><th style="text-align:right">Baris</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<label class="check mt-12"><input type="checkbox" id="ar-bawa" checked> Bawa <b>' + r.kasusAktif + '</b> kasus yang belum selesai (beserta rujukan, layanan, tindak lanjut) ke tahun ajaran baru</label>' +
      '<div class="note mt-12"><i class="bi bi-exclamation-triangle"></i><div class="xs">Kode kasus yang dibawa akan dinomori ulang. Berkas di Drive tidak dihapus. Jalankan <b>setelah</b> semua laporan tahun ini selesai dicatat.</div></div>' +
      '<div class="field mt-12" data-f="ar_konf"><label for="ar-konf">Ketik <b>ARSIP</b> untuk melanjutkan</label><input class="input" id="ar-konf" autocomplete="off" placeholder="ARSIP"><div class="err"></div></div>' +
      '<button class="btn dark block mt-12" data-act="ar-jalan"><i class="bi bi-archive"></i> Arsipkan sekarang</button><div id="ar-hasil" class="mt-12"></div></div>';
    // Langkah 2 dan 3
    h += '<div class="col gap-16"><div class="card pad"><div class="row"><span class="step-n">2</span><div><h3>Kenaikan kelas</h3><div class="xs muted">Awal tahun ajaran baru · ' + r.murid + ' murid aktif, ' + r.kelas + ' kelas</div></div></div>' +
      '<p class="muted-2 mt-12" style="margin-top:12px">Aplikasi menyarankan tujuan tiap kelas dari namanya (X → XI → XII → lulus). Anda dapat mengubah tujuan dan menandai murid yang tinggal kelas sebelum menjalankan. Cadangan otomatis dibuat sebelum perubahan.</p>' +
      '<button class="btn block mt-12" data-act="naik-buka"><i class="bi bi-mortarboard"></i> Buka pratinjau kenaikan kelas</button></div>' +
      '<div class="card pad"><div class="row"><span class="step-n">3</span><div><h3>Tahun ajaran & semester baru</h3><div class="xs muted">Berlaku di seluruh aplikasi</div></div></div>' +
      '<form id="f-tb" class="form-grid c2 mt-12" novalidate>' + fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, max: 9, value: sa.tahun_ajaran, hint: 'Format 2026/2027' }) + fld({ name: 'semester', label: 'Semester', type: 'select', value: sa.semester, opts: ['Ganjil', 'Genap'] }) + '</form>' +
      '<div class="col gap-8 mt-12"><label class="check"><input type="checkbox" id="tb-wali"> Kosongkan wali kelas (isi ulang di Administrasi → Kelas)</label><label class="check"><input type="checkbox" id="tb-peng"> Hapus semua penugasan pengampu mapel (isi ulang di Pengampu)</label></div>' +
      '<p class="xs muted mt-12">Untuk pergantian semester saja (Ganjil → Genap), biarkan tahun ajaran dan kosongkan kedua pilihan di atas.</p>' +
      '<button class="btn primary block mt-12" data-act="tb-simpan"><i class="bi bi-calendar-event"></i> Terapkan</button></div></div></div>';
    h += '<div class="card mt-16"><div class="card-head"><div><h3>Riwayat arsip</h3><div class="xs muted">Salinan basis data tiap tahun ajaran (hanya admin yang dapat membukanya)</div></div></div>' +
      (r.arsip.length ? '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Tahun ajaran</th><th>Tanggal</th><th>Kasus dibawa</th><th></th></tr></thead><tbody>' + r.arsip.map(function (a) { return '<tr><td class="fw6">' + esc(a.tahun_ajaran) + ' ' + esc(a.semester) + '</td><td>' + esc(fTgl(a.tanggal)) + '</td><td>' + esc(a.dibawa) + '</td><td style="text-align:right"><a class="btn sm" href="' + esc(a.url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Buka</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('bi-archive', 'Belum ada arsip')) + '</div>';
    $('#ad-body').innerHTML = h;
  }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
ACT['ar-jalan'] = function (el) {
  const k = $('#ar-konf').value.trim();
  if (k !== 'ARSIP') { setErr($('#ad-body'), 'ar_konf', 'Ketik ARSIP (huruf besar) untuk melanjutkan.'); return; }
  setErr($('#ad-body'), 'ar_konf', '');
  confirmDlg('Seluruh data transaksi tahun ajaran ' + P.ar.tahun_ajaran + ' akan disalin ke arsip lalu dikosongkan dari aplikasi. Tindakan ini tidak dapat dibatalkan dari aplikasi (salinan tetap ada di Drive). Lanjutkan?', 'Ya, arsipkan', true, 'Arsipkan tahun ajaran').then(function (ok) {
    if (!ok) return;
    run(el, api('arsip.jalankan', { konfirmasi: k, bawaAktif: $('#ar-bawa').checked })).then(function (r) {
      toast('Arsip dibuat dan data dibersihkan.');
      adTahun();
      setTimeout(function () {
        openModal({ title: 'Arsip selesai', body: '<div class="note info"><i class="bi bi-check-circle"></i><div>Salinan <b>' + esc(r.nama) + '</b> tersimpan di folder Arsip. ' + r.dibawa + ' kasus aktif dibawa ke tahun ajaran baru.</div></div><a class="btn block mt-12" href="' + esc(r.url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Buka arsip</a><p class="xs muted mt-12">Langkah berikutnya: kenaikan kelas, lalu terapkan tahun ajaran baru.</p>', foot: '<button class="btn" data-close>Tutup</button>' });
      }, 400);
    }).catch(fail);
  });
};

// ── Kenaikan kelas ──
function naikBuka() {
  return apiC('naik.pratinjau', { tingkatAkhir: P.naik ? P.naik.akhir : '' }).then(function (d) {
    const peta = {};
    d.kelas.forEach(function (k) { peta[k.id] = { aksi: k.saran.aksi, ke: k.saran.ke || (k.saran.namaBaru ? '__baru' : ''), namaBaru: k.saran.namaBaru || '', tinggal: {} }; });
    P.naik = { d: d, peta: peta, akhir: d.tingkatAkhir };
    naikGambar();
  });
}
ACT['naik-buka'] = function (el) { run(el, naikBuka()).catch(fail); };
function naikGambar() {
  const n = P.naik, d = n.d;
  const opsiKelas = function (selfId, sel) {
    return d.daftarKelas.filter(function (k) { return k.v !== selfId; }).map(function (k) { return '<option value="' + esc(k.v) + '"' + (sel === k.v ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '<option value="__baru"' + (sel === '__baru' ? ' selected' : '') + '>+ Kelas baru…</option>';
  };
  const rows = d.kelas.map(function (k) {
    const p = n.peta[k.id];
    const tg = Object.keys(p.tinggal).filter(function (x) { return p.tinggal[x]; }).length;
    return '<tr data-k="' + esc(k.id) + '"><td class="fw6">' + esc(k.nama) + '<div class="xs muted">' + k.murid.length + ' murid</div></td>' +
      '<td><select class="select" data-nk="aksi" style="min-height:38px"><option value="pindah"' + (p.aksi === 'pindah' ? ' selected' : '') + '>Naik ke kelas…</option><option value="lulus"' + (p.aksi === 'lulus' ? ' selected' : '') + '>Lulus</option><option value="tetap"' + (p.aksi === 'tetap' ? ' selected' : '') + '>Tetap di kelas ini</option><option value="nonaktif"' + (p.aksi === 'nonaktif' ? ' selected' : '') + '>Nonaktifkan (pindah/keluar)</option></select></td>' +
      '<td>' + (p.aksi === 'pindah' ? '<select class="select" data-nk="ke" style="min-height:38px"><option value="">Pilih…</option>' + opsiKelas(k.id, p.ke) + '</select>' + (p.ke === '__baru' ? '<input class="input mt-8" data-nk="namaBaru" maxlength="30" placeholder="Nama kelas baru" value="' + esc(p.namaBaru) + '" style="min-height:38px">' : '') : '<span class="muted">—</span>') + '</td>' +
      '<td style="text-align:right"><button class="btn sm' + (tg ? ' soft-danger' : '') + '" data-act="naik-tinggal" data-k="' + esc(k.id) + '"' + (k.murid.length ? '' : ' disabled') + '>Tinggal kelas' + (tg ? ' (' + tg + ')' : '') + '</button></td></tr>';
  }).join('');
  const m = openModal({
    title: 'Kenaikan kelas', sub: 'Periksa setiap baris. Kelas tertinggi dianggap lulus.', size: 'xl', sticky: true,
    body: '<div class="row wrap mb-16"><span class="xs muted">Tingkat akhir jenjang:</span><select class="select" id="nk-akhir" style="width:auto;min-height:38px">' + [[6, 'Kelas 6 (SD)'], [9, 'Kelas 9 (SMP)'], [12, 'Kelas 12 (SMA/SMK)']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === n.akhir ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select><span class="xs muted">Diubah → saran dihitung ulang.</span></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="nk-tbl" style="min-width:640px"><thead><tr><th>Kelas asal</th><th>Tindakan</th><th>Tujuan</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="note mt-16"><i class="bi bi-info-circle"></i><div class="xs">Murid yang <b>tinggal kelas</b> tetap di kelas asalnya. Wali kelas dan pengampu tidak berubah di langkah ini (atur di Langkah 3 atau Administrasi). Cadangan otomatis dibuat sebelum perubahan.</div></div>' +
      '<div class="field mt-12" data-f="nk_konf"><label for="nk-konf">Ketik <b>NAIKKAN</b> untuk melanjutkan</label><input class="input" id="nk-konf" autocomplete="off" placeholder="NAIKKAN"><div class="err"></div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="nk-jalan"><i class="bi bi-mortarboard"></i> Jalankan kenaikan kelas</button>'
  });
  P.naik.m = m;
  const tb = $('#nk-tbl', m.el);
  tb.addEventListener('change', function (e) {
    const tr = e.target.closest('tr[data-k]'); if (!tr) return;
    const p = n.peta[tr.dataset.k], f = e.target.dataset.nk;
    if (f === 'aksi') { p.aksi = e.target.value; if (p.aksi === 'pindah' && !p.ke) p.ke = ''; }
    if (f === 'ke') { p.ke = e.target.value; }
    if (f === 'namaBaru') { p.namaBaru = e.target.value; return; }
    keepNaikScroll(m, function () { m.close(); naikGambar(); });
  });
  tb.addEventListener('input', function (e) { const tr = e.target.closest('tr[data-k]'); if (tr && e.target.dataset.nk === 'namaBaru') n.peta[tr.dataset.k].namaBaru = e.target.value; });
  $('#nk-akhir', m.el).addEventListener('change', function (e) { n.akhir = +e.target.value; m.close(); P.naik.d = null; naikBuka().catch(fail); });
  $('#nk-jalan', m.el).addEventListener('click', function (e) {
    if ($('#nk-konf', m.el).value.trim() !== 'NAIKKAN') { setErr(m.el, 'nk_konf', 'Ketik NAIKKAN (huruf besar).'); return; }
    const pemetaan = [];
    for (let i = 0; i < d.kelas.length; i++) {
      const k = d.kelas[i], p = n.peta[k.id];
      if (p.aksi === 'pindah' && !p.ke) { toast('Pilih kelas tujuan untuk ' + k.nama + '.', 'err'); return; }
      if (p.aksi === 'pindah' && p.ke === '__baru' && !p.namaBaru.trim()) { toast('Isi nama kelas baru untuk tujuan ' + k.nama + '.', 'err'); return; }
      pemetaan.push({ dari: k.id, aksi: p.aksi, ke: p.ke === '__baru' ? '' : p.ke, namaBaru: p.ke === '__baru' ? p.namaBaru.trim() : '', tinggal: Object.keys(p.tinggal).filter(function (x) { return p.tinggal[x]; }) });
    }
    confirmDlg('Murid akan dipindahkan sesuai tabel. Proses ini mengubah kelas ' + d.kelas.reduce(function (a, k) { return a + k.murid.length; }, 0) + ' murid aktif. Lanjutkan?', 'Ya, jalankan', false, 'Konfirmasi kenaikan kelas').then(function (ok) {
      if (!ok) return;
      run(e.currentTarget, api('naik.jalankan', { pemetaan: pemetaan, konfirmasi: 'NAIKKAN' })).then(function (r) {
        m.close(); P.naik = null;
        toast(r.naik + ' murid naik, ' + r.lulus + ' lulus, ' + r.tinggal + ' tinggal kelas.');
        return api('boot').then(function (b) { S.refs = b.refs; });
      }).catch(fail);
    });
  });
}
function keepNaikScroll(m, fn) { const sc = $('.m-body', m.el).scrollTop; fn(); const nb = P.naik.m && $('.m-body', P.naik.m.el); if (nb) nb.scrollTop = sc; }
ACT['naik-tinggal'] = function (el) {
  const n = P.naik, k = n.d.kelas.filter(function (x) { return x.id === el.dataset.k; })[0], p = n.peta[k.id];
  const m = openModal({
    title: 'Murid tinggal kelas — ' + k.nama, sub: 'Centang murid yang TIDAK naik / tidak lulus.',
    body: '<div class="col gap-8" style="max-height:50vh;overflow:auto">' + k.murid.map(function (s) { return '<label class="check"><input type="checkbox" value="' + esc(s.id) + '"' + (p.tinggal[s.id] ? ' checked' : '') + '> ' + esc(s.nama) + ' <span class="xs muted">NIS ' + esc(s.nis) + '</span></label>'; }).join('') + '</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" data-ok>Simpan</button>'
  });
  $('[data-ok]', m.el).addEventListener('click', function () {
    p.tinggal = {}; $$('input:checked', m.el).forEach(function (i) { p.tinggal[i.value] = true; });
    m.close(); const top = P.naik.m; keepNaikScroll(top, function () { top.close(); naikGambar(); });
  });
};
ACT['tb-simpan'] = function (el) {
  const f = $('#f-tb'), d = formData(f);
  if (!validate(f, d, { tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' } })) return;
  confirmDlg('Tahun ajaran ' + d.tahun_ajaran + ' semester ' + d.semester + ' akan diterapkan ke seluruh kelas' + ($('#tb-peng').checked ? ', dan semua penugasan pengampu dihapus' : '') + '. Lanjutkan?', 'Terapkan', false, 'Tahun ajaran baru').then(function (ok) {
    if (!ok) return;
    run(el, api('tahun.baru', { tahun_ajaran: d.tahun_ajaran, semester: d.semester, kosongkanWali: $('#tb-wali').checked, kosongkanPengampu: $('#tb-peng').checked })).then(function () {
      toast('Tahun ajaran diperbarui.');
      return api('boot').then(function (b) { S.cfg = b.config; S.refs = b.refs; S.saranTA = b.saranTA; renderShell(); setNavActive('admin'); adTahun(); });
    }).catch(fail);
  });
};

// ── Pengaturan: gerbang WhatsApp otomatis ──
function waCardHtml(wa) {
  return '<div class="card pad" id="wa-card"><h3><i class="bi bi-whatsapp" style="color:#16A34A"></i> Pemberitahuan WhatsApp</h3>' +
    '<p class="muted mt-8" style="margin-top:4px">Tanpa pengaturan ini, setiap aksi yang perlu diketahui rekan kerja menampilkan tombol <b>WhatsApp</b> siap kirim (pengirim menekan kirim sendiri). Bila Anda memakai layanan gerbang WhatsApp berbayar (mis. Fonnte), pesan dapat dikirim otomatis.</p>' +
    '<form id="f-wa" class="form-grid mt-12" novalidate>' + fld({ name: 'aktif', label: 'Pengiriman otomatis', type: 'select', value: wa.aktif ? '1' : '0', opts: [{ v: '0', l: 'Nonaktif (tombol WhatsApp manual)' }, { v: '1', l: 'Aktif (kirim otomatis lewat gerbang)' }] }) +
    fld({ name: 'url', label: 'URL gerbang', type: 'url', max: 200, value: wa.url, hint: 'Bawaan: https://api.fonnte.com/send' }) +
    fld({ name: 'token', label: 'Token gerbang', type: 'password', max: 200, ac: 'off', ph: wa.adaToken ? '•••••• (tersimpan; kosongkan bila tidak diubah)' : 'Tempel token dari penyedia', hint: 'Disimpan aman di server, tidak pernah ditampilkan kembali.' }) + '</form>' +
    '<div class="row wrap mt-12"><button class="btn primary" data-act="wa-simpan"><i class="bi bi-check-lg"></i> Simpan</button><button class="btn" data-act="wa-uji"><i class="bi bi-send"></i> Kirim uji ke nomor saya</button></div>' +
    '<p class="xs muted mt-12">Isi nomor WhatsApp tiap pengguna di Administrasi → Pengguna. Pesan tidak memuat nama murid.</p></div>';
}
ACT['wa-simpan'] = function (el) {
  const f = $('#f-wa'), d = formData(f);
  if (d.url && !/^https:\/\/\S+$/i.test(d.url)) { setErr(f, 'url', 'URL harus diawali https://'); return; }
  setErr(f, 'url', '');
  if (d.aktif === '1' && !d.token && !(P.waAda)) { setErr(f, 'token', 'Token wajib diisi untuk mengaktifkan.'); return; }
  run(el, api('admin.waSimpan', { aktif: d.aktif === '1', url: d.url, token: d.token })).then(function (r) { P.waAda = r.adaToken; toast(r.aktif ? 'Pengiriman otomatis aktif.' : 'Pengaturan WhatsApp disimpan.'); $('[name=token]', f).value = ''; }).catch(fail);
};
ACT['wa-uji'] = function (el) { run(el, api('admin.waUji')).then(function () { toast('Pesan uji dikirim. Periksa WhatsApp Anda.'); }).catch(fail); };
