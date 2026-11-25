/* SIKOLAB BK v1.15 — js/pages/26_arahan.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.13 — Arahan untuk Guru
// ════════════════════════════════════════════════════════════
function arahanPeta() { return (S.arahan && S.arahan.peta) || {}; }
function arahanIkon(idMurid) {
  if (!arahanPeta()[idMurid]) return '';
  return '<span class="chip arahan-chip" data-act="arahan-buka" data-id="' + esc(idMurid) + '" title="Ada arahan untuk guru tentang murid ini — ketuk untuk membaca"><i class="bi bi-info-circle"></i> Arahan</span>';
}
function arahanMuat() {
  return apiC('arahan.saya').then(function (r) { S.arahan = r; return r; }).catch(function () { return S.arahan; });
}
ACT['arahan-buka'] = function (el, e) { if (e) { e.stopPropagation(); e.preventDefault(); } arahanBuka(el.dataset.id); };
function arahanBuka(idMurid) {
  const m = openModal({ title: 'Arahan untuk guru', sub: 'Memuat…', body: skeleton(2), foot: '<button class="btn" data-close>Tutup</button>' });
  api('arahan.murid', { id_murid: idMurid }).then(function (r) {
    P.arh = r;
    const sub = $('.m-head .xs', m.el); if (sub) sub.textContent = r.murid.nama;
    const masaOpsi = '<option value="14">14 hari</option><option value="30" selected>30 hari</option><option value="60">60 hari</option><option value="semester">Sampai akhir semester</option>';
    let h = r.list.length ? r.list.map(function (a) {
      let b = '<div class="sec arh-item' + (a.aktif ? '' : ' arh-lewat') + '"><div class="row between wrap" style="gap:8px"><div class="row wrap" style="gap:6px"><span class="chip blue">' + esc(a.kategori) + '</span>' + (a.aktif ? '<span class="chip st-Dipantau">Berlaku s.d. ' + esc(fTgl(a.berlaku)) + '</span>' : '<span class="chip neutral">' + (a.dicabut ? 'Dicabut' : 'Berakhir ' + esc(fTgl(a.berlaku))) + '</span>') + '</div><span class="xs muted">' + esc(a.penulis) + ' · ' + esc(fTgl(a.dibuat)) + '</span></div>' +
        (a.konteks ? '<div class="xs muted mt-8">' + esc(a.konteks) + '</div>' : '') +
        '<div class="arh-minta mt-8"><i class="bi bi-arrow-right-circle"></i> ' + esc(a.permintaan) + '</div>';
      if (a.inti && a.jumlahPenerima !== undefined) {
        b += '<details class="mt-8"><summary class="xs fw6" style="cursor:pointer">' + a.jumlahBaca + ' dari ' + a.jumlahPenerima + ' guru sudah membaca</summary><div class="xs mt-8">' + (a.status || []).map(function (x) { return '<div>' + (x.baca ? '<i class="bi bi-check2-circle" style="color:var(--teal)"></i> ' : '<i class="bi bi-circle muted"></i> ') + esc(x.nama) + (x.baca ? ' <span class="muted">· ' + esc(x.baca) + '</span>' : '') + '</div>'; }).join('') + '</div></details>';
      }
      if (a.balasan && a.balasan.length) b += '<div class="mt-8 col gap-8">' + a.balasan.map(function (x) { return '<div class="arh-balas"><b>' + esc(x.oleh) + '</b> <span class="xs muted">' + esc(x.waktu) + '</span><div>' + esc(x.teks) + '</div></div>'; }).join('') + '</div>';
      if (a.aktif && !a.milikSaya) b += '<div class="row wrap mt-8" style="gap:6px">' + (a.penerimaSaya && !a.sudahBaca ? '<button class="btn sm primary" data-act="arh-baca" data-a="' + esc(a.id) + '"><i class="bi bi-check2"></i> Saya sudah membaca</button>' : (a.sudahBaca ? '<span class="xs muted"><i class="bi bi-check2-circle"></i> Sudah Anda baca</span>' : '')) + '</div>' +
        '<div class="row mt-8" style="gap:6px"><input class="input" id="arh-b-' + esc(a.id) + '" maxlength="300" placeholder="Balas singkat ke Guru BK/wali (opsional)…" style="min-height:36px"><button class="btn sm" data-act="arh-balas" data-a="' + esc(a.id) + '">Kirim</button></div>';
      if (a.aktif && (a.milikSaya || hasRole('guru_bk'))) b += '<div class="row wrap mt-8" style="gap:6px"><select class="select" id="arh-m-' + esc(a.id) + '" style="width:auto;min-height:34px">' + masaOpsi + '</select><button class="btn sm" data-act="arh-ubah" data-a="' + esc(a.id) + '">Perpanjang</button><button class="btn sm ghost" data-act="arh-cabut" data-a="' + esc(a.id) + '">Cabut</button></div>';
      return b + '</div>';
    }).join('') : empty('bi-info-circle', 'Belum ada arahan untuk murid ini');
    if (r.bolehTulis) h += '<button class="btn primary mt-12" data-act="arh-baru" data-id="' + esc(r.murid.id) + '"><i class="bi bi-plus-lg"></i> Buat arahan baru</button>';
    $('.m-body', m.el).innerHTML = '<div class="col gap-8">' + h + '</div>';
    P.arhModal = m;
  }).catch(function (e) { $('.m-body', m.el).innerHTML = errBox(e); });
}
function arahanSesudah(pesan) {
  toast(pesan); ccClear();
  const id = P.arh && P.arh.murid.id;
  if (P.arhModal) P.arhModal.close();
  arahanMuat().then(function () { if (id) arahanBuka(id); });
}
ACT['arh-baca'] = function (el) { run(el, api('arahan.baca', { id: el.dataset.a })).then(function () { arahanSesudah('Ditandai sudah dibaca.'); }).catch(fail); };
ACT['arh-balas'] = function (el) {
  const v = ($('#arh-b-' + el.dataset.a) || {}).value || '';
  if (!v.trim()) { toast('Tulis balasan dulu.', 'err'); return; }
  run(el, api('arahan.baca', { id: el.dataset.a, balasan: v.trim() })).then(function () { arahanSesudah('Balasan terkirim ke Guru BK dan wali kelas.'); }).catch(fail);
};
ACT['arh-ubah'] = function (el) { run(el, api('arahan.ubah', { id: el.dataset.a, masa: ($('#arh-m-' + el.dataset.a) || {}).value || '30' })).then(function () { arahanSesudah('Masa berlaku diperpanjang.'); }).catch(fail); };
ACT['arh-cabut'] = function (el) {
  confirmDlg('Cabut arahan ini? Arahan tidak lagi tampil bagi guru, tetapi tetap tercatat.', 'Ya, cabut', true, 'Cabut arahan').then(function (ok) {
    if (ok) run(el, api('arahan.ubah', { id: el.dataset.a, cabut: true })).then(function () { arahanSesudah('Arahan dicabut.'); }).catch(fail);
  });
};
ACT['arh-baru'] = function (el) { if (P.arhModal) P.arhModal.close(); arahanForm(el.dataset.id); };
function arahanForm(idMurid) {
  api('arahan.penerima', { id_murid: idMurid }).then(function (r) {
    const m = openModal({
      title: 'Arahan untuk guru', sub: 'Disampaikan kepada guru yang mengajar murid ini',
      body: '<div class="note info"><i class="bi bi-shield-lock"></i><div>Tuliskan <b>apa yang perlu dilakukan guru</b>. Penyebab cukup kategori dan satu kalimat umum. <b>Jangan menulis isi konseling atau rincian pribadi.</b></div></div>' +
        '<form id="f-arh" class="form-grid mt-12">' +
        fld({ name: 'kategori', label: 'Kategori penyebab', type: 'select', req: true, opts: r.kategori.map(function (k) { return { v: k, l: k }; }) }) +
        fld({ name: 'masa', label: 'Berlaku', type: 'select', value: '30', opts: [{ v: '14', l: '14 hari' }, { v: '30', l: '30 hari' }, { v: '60', l: '60 hari' }, { v: 'semester', l: 'Sampai akhir semester' }] }) +
        '<div class="field" style="grid-column:1/-1"><label>Konteks singkat (opsional)</label><input class="input" name="konteks" maxlength="200" placeholder="Mis. Ananda sedang menghadapi masalah keluarga dan dalam pendampingan BK."></div>' +
        '<div class="field" style="grid-column:1/-1"><label>Yang diminta dari guru <span class="req">*</span></label><textarea class="input" name="permintaan" rows="4" maxlength="600" required placeholder="Mis. Mohon tidak ditegur di depan kelas; beri kelonggaran batas tugas 2–3 hari; bila tampak murung, sampaikan ke Guru BK."></textarea></div>' +
        '<div class="field" style="grid-column:1/-1"><label>Penerima</label><label class="row xs" style="gap:8px"><input type="radio" name="pen" value="*" checked> Semua guru yang mengajar murid ini, wali kelas, dan guru wali (' + r.penerima.length + ' orang)</label><label class="row xs mt-8" style="gap:8px"><input type="radio" name="pen" value="pilih"> Pilih guru tertentu</label>' +
        '<div id="arh-pilih" class="arh-pilih mt-8" hidden>' + r.penerima.map(function (p) { return '<label class="row xs" style="gap:8px"><input type="checkbox" value="' + esc(p.email) + '" checked> ' + esc(p.nama) + '</label>'; }).join('') + '</div></div></form>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="arh-kirim"><i class="bi bi-send"></i> Kirim arahan</button>'
    });
    const pilihBox = $('#arh-pilih', m.el); pilihBox.style.display = 'none';
    $$('input[name=pen]', m.el).forEach(function (x) { x.addEventListener('change', function () { pilihBox.style.display = ($('input[name=pen]:checked', m.el) || {}).value === 'pilih' ? '' : 'none'; }); });
    $('#arh-kirim', m.el).addEventListener('click', function () {
      const f = $('#f-arh', m.el), d = formData(f);
      if (!(d.permintaan || '').trim()) { toast('Isi bagian "Yang diminta dari guru".', 'err'); return; }
      const pilih = ($('input[name=pen]:checked', m.el) || {}).value === 'pilih';
      const p = { id_murid: idMurid, kategori: d.kategori, masa: d.masa, konteks: d.konteks, permintaan: d.permintaan };
      if (pilih) p.penerima = $$('#arh-pilih input:checked', m.el).map(function (c) { return c.value; });
      run($('#arh-kirim', m.el), api('arahan.buat', p)).then(function () { m.close(); arahanSesudah('Arahan terkirim. Guru penerima melihatnya di Beranda, lonceng, dan di samping nama murid.'); }).catch(fail);
    });
  }).catch(fail);
}
function arahanBerandaHtml() {
  const a = S.arahan;
  if (!a || (!a.untuk.length && !a.tulis.length)) return '';
  const item = function (x) {
    return '<button class="sec row" style="text-align:left;cursor:pointer;gap:10px;width:100%" data-act="arahan-buka" data-id="' + esc(x.id_murid) + '"><i class="bi ' + (x.milikSaya ? 'bi-send' : x.sudahBaca ? 'bi-info-circle' : 'bi-info-circle') + '" style="color:' + (x.sudahBaca || x.milikSaya ? 'var(--text-3)' : 'var(--indigo)') + ';font-size:18px"></i><div class="grow"><div class="fw6">' + esc(x.murid) + ' <span class="xs muted">' + esc(x.kelas) + '</span>' + (!x.milikSaya && !x.sudahBaca && x.penerimaSaya ? ' <span class="chip st-Baru">Belum dibaca</span>' : '') + '</div><div class="xs muted trunc">' + esc(x.kategori) + ' · ' + esc(x.permintaan) + '</div>' +
      (x.milikSaya && x.jumlahPenerima !== undefined ? '<div class="xs">' + x.jumlahBaca + ' dari ' + x.jumlahPenerima + ' guru sudah membaca</div>' : '') + '</div></button>';
  };
  return '<div class="card mt-16"><div class="card-head"><div><h3><i class="bi bi-info-circle" style="color:var(--indigo)"></i> Arahan untuk guru</h3><div class="xs muted">Hal yang perlu diperhatikan saat mengajar murid berikut</div></div>' + (a.belum ? '<span class="chip st-Baru">' + a.belum + ' belum dibaca</span>' : '') + '</div><div class="card-body col gap-8">' +
    a.untuk.slice(0, 6).map(item).join('') + (a.tulis.length ? '<div class="xs muted fw6 mt-8">Arahan yang Anda tulis</div>' + a.tulis.slice(0, 6).map(item).join('') : '') + '</div></div>';
}
ACT['lap-draf-buang'] = function () { lapDrafHapus(); P.lap.drafDipakai = true; navigateTo('lapor', {}, true); };
