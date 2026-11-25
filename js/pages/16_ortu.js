/* SIKOLAB BK v1.15 — js/pages/16_ortu.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Hubungi Orang Tua (F7) — tautan WhatsApp/email, bukan kirim otomatis
// ════════════════════════════════════════════════════════════
PAGES.ortu = function (params, tok) {
  P.or = { q: '', kasus: params.id_kasus || '' };
  if (params.id_murid) return orLoad(params.id_murid, tok, params.templat, params.tanggal);
  $('#app-container').innerHTML = pageHead('Kemitraan orang tua', 'Hubungi Orang Tua', 'Siapkan pesan WhatsApp dari templat, buat surat panggilan resmi, dan catat setiap komunikasi.', '') +
    '<div class="card pad"><div class="search" style="max-width:none"><i class="bi bi-search"></i><input id="or-q" class="input" style="padding-left:36px" type="search" placeholder="Cari murid (nama atau NIS)…" autocomplete="off"></div></div><div id="or-list" class="card mt-16"></div>';
  const go = function () {
    apiC('murid.cari', hasAny(['wali_kelas', 'guru_bk']) ? { q: $('#or-q').value.trim() } : { q: $('#or-q').value.trim(), ortu: 1 }).then(function (rows) {
      if (!$('#or-list')) return;
      $('#or-list').innerHTML = rows.length ? '<div class="cases">' + rows.map(function (m) {
        return '<button class="case" data-act="ortu-murid" data-id="' + esc(m.id) + '" style="flex-direction:row;align-items:center"><div class="avatar">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="c-name">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kelas) + ' · NIS ' + esc(m.nis) + '</div></div><i class="bi bi-chevron-right muted"></i></button>';
      }).join('') + '</div>' : empty('bi-person-x', 'Murid tidak ditemukan', 'Wali kelas hanya dapat menghubungi orang tua murid perwaliannya.');
    }).catch(function (e) { isiHtml('#or-list', errBox(e)); });
  };
  $('#or-q').addEventListener('input', debounce(go, 280));
  go();
};
function orLoad(id, tok, tpl, tgl) {
  tpl = waTpl().some(function (t) { return t[0] === tpl; }) ? tpl : 'undangan';
  return Promise.all([apiC('ortu.siapkan', { id_murid: id, templat: tpl, tanggal: tgl || '' }), apiC('ortu.riwayat', { id_murid: id })]).then(function (res) {
    if (stale(tok)) return;
    const s = res[0], rw = res[1];
    P.or.id = id; P.or.s = s; P.or.rw = rw; P.or.templat = tpl;
    let h = '<button class="btn sm ghost mb-8" data-act="nav" data-page="ortu"><i class="bi bi-arrow-left"></i> Daftar murid</button>' + pageHead('Kemitraan orang tua', 'Hubungi Orang Tua — ' + s.nama_murid, s.kelas + ' · ' + (s.nama_ortu || 'Orang tua/wali belum tercatat'), '<button class="btn" data-act="or-surat"><i class="bi bi-file-earmark-text"></i> Surat panggilan</button><button class="btn primary" data-act="or-catat"><i class="bi bi-journal-plus"></i> Catat komunikasi</button>');
    h += '<div class="grid g-2"><div class="col gap-16"><div class="card pad"><div class="row between wrap"><h3><i class="bi bi-whatsapp" style="color:#25D366"></i> Pesan WhatsApp</h3><div class="fchips" id="or-tpl">' + waTpl().map(function (t, i) { return '<button class="fchip ' + (t[0] === tpl ? 'active' : '') + '" data-act="or-tpl" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="note info mt-12"><i class="bi bi-info-circle"></i><div>Sistem menyiapkan tautan WhatsApp. Pesan <b>tidak dikirim otomatis</b> — Anda yang menekan kirim di aplikasi WhatsApp.</div></div>' +
      '<div class="field mt-12"><label for="or-msg">Isi pesan (dapat diubah)</label><textarea id="or-msg" class="textarea" rows="6" maxlength="1000">' + esc(s.pesan) + '</textarea></div>' +
      '<div class="row wrap mt-12" id="or-links"></div><div id="or-sesudah" class="wa-after hide"><i class="bi bi-chat-dots"></i><div class="grow"><b>Sudah terkirim?</b><span>Satu ketukan untuk mencatat.</span></div><button class="btn sm" data-act="or-belum">Belum</button><button class="btn sm primary" data-act="or-cepat"><i class="bi bi-check-lg"></i> Ya, catat</button></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>Riwayat komunikasi</h3></div><div class="card-body" id="or-hist"></div></div></div>';
    $('#app-container').innerHTML = h;
    orLinks(); orHist();
    $('#or-msg').addEventListener('input', orLinks);
  });
}
function orLinks() {
  const s = P.or.s, msg = ($('#or-msg') || {}).value || '';
  const wa = s.hp ? 'https://wa.me/' + s.hp + '?text=' + encodeURIComponent(msg) : '';
  const mail = s.email ? 'mailto:' + s.email + '?subject=' + encodeURIComponent('Informasi dari ' + S.cfg.namaSekolah) + '&body=' + encodeURIComponent(msg) : '';
  $('#or-links').innerHTML = (wa ? '<a class="btn teal" style="background:#25D366;border-color:#25D366" href="' + esc(wa) + '" target="_blank" rel="noopener" id="or-wa"><i class="bi bi-whatsapp"></i> Buka WhatsApp</a>' : '<span class="chip st-Baru"><i class="bi bi-exclamation-triangle"></i> No. WhatsApp orang tua belum valid — perbaiki di data murid</span>') +
    (mail ? '<a class="btn" href="' + esc(mail) + '"><i class="bi bi-envelope"></i> Buka email</a>' : '') + '<button class="btn" data-act="or-copy"><i class="bi bi-clipboard"></i> Salin pesan</button>';
  const a = $('#or-wa'); if (a) a.addEventListener('click', function () { setTimeout(function () { show('#or-sesudah', true); }, 500); });
}
ACT['or-belum'] = function () { show('#or-sesudah', false); };
ACT['or-cepat'] = function () {
  const tpl = (waTpl().filter(function (t) { return t[0] === P.or.templat; })[0] || ['', 'Komunikasi'])[1];
  const d = { id_murid: P.or.id, tanggal: S.today, media: 'WhatsApp', tujuan: tpl, ringkasan_pembahasan: $('#or-msg').value, hasil: 'Pesan terkirim; menunggu tanggapan orang tua.' };
  if (P.or.kasus) d.id_kasus = P.or.kasus;
  show('#or-sesudah', false); toast('Komunikasi tercatat.');
  api('ortu.catat', d).then(function () { return apiC('ortu.riwayat', { id_murid: P.or.id }); }).then(function (rw) { P.or.rw = rw; orHist(); }).catch(function (e) { toast('Gagal mencatat: ' + e.message, 'err'); });
};
ACT['or-copy'] = function () {
  const t = $('#or-msg').value;
  const ok = function () { toast('Pesan disalin.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { $('#or-msg').select(); document.execCommand('copy'); ok(); });
  else { $('#or-msg').select(); document.execCommand('copy'); ok(); }
};
ACT['or-tpl'] = function (el) {
  $$('#or-tpl .fchip').forEach(function (b) { b.classList.toggle('active', b === el); });
  P.or.templat = el.dataset.t;
  apiC('ortu.siapkan', { id_murid: P.or.id, templat: el.dataset.t }).then(function (s) { P.or.s = s; $('#or-msg').value = s.pesan; orLinks(); }).catch(fail);
};
function orHist() {
  const rw = P.or.rw;
  $('#or-hist').innerHTML = rw.length ? rw.map(function (k) {
    return '<div class="sec mb-8"><div class="row between wrap"><span class="chip blue">' + esc(k.media) + '</span><span class="xs muted">' + esc(fTgl(k.tanggal)) + ' · ' + esc(k.oleh) + '</span></div><div class="fw6 mt-8">' + esc(k.tujuan) + '</div><div class="muted-2" style="line-height:20px">' + esc(k.ringkasan) + '</div>' + (k.hasil ? '<div class="xs mt-8"><b>Hasil:</b> ' + esc(k.hasil) + '</div>' : '') + (k.id_berkas ? '<button class="btn sm mt-8" data-act="berkas" data-id="' + esc(String(k.id_berkas).split(',')[0]) + '"><i class="bi bi-file-earmark-pdf"></i> Buka surat</button>' : '') + '</div>';
  }).join('') : empty('bi-chat-square-dots', 'Belum ada komunikasi', 'Catat setiap kontak dengan orang tua agar tampil di garis waktu murid.');
}
ACT['or-catat'] = function () {
  const m = openModal({
    title: 'Catat komunikasi orang tua', sub: P.or.s.nama_murid,
    body: '<form id="f-oc" class="form-grid" novalidate><div class="form-grid c2">' + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: S.today, maxv: S.today }) + fld({ name: 'media', label: 'Media', type: 'select', req: true, value: 'WhatsApp', opts: ['WhatsApp', 'Email', 'Telepon', 'Tatap muka', 'Surat Panggilan'] }) + '</div>' +
      fld({ name: 'tujuan', label: 'Tujuan komunikasi', req: true, max: 300, ph: 'mis. Undangan diskusi perkembangan' }) +
      fld({ name: 'ringkasan_pembahasan', label: 'Ringkasan pembahasan', type: 'textarea', req: true, rows: 4, max: 2000 }) + fld({ name: 'hasil', label: 'Hasil / kesepakatan', type: 'textarea', rows: 2, max: 1500 }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="oc-ok">Simpan</button>'
  });
  $('#oc-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-oc', m.el), d = formData(f);
    if (!validate(f, d, { tujuan: { label: 'Tujuan', req: true, min: 3 }, ringkasan_pembahasan: { label: 'Ringkasan', req: true, min: 5 } })) return;
    d.id_murid = P.or.id; if (P.or.kasus) d.id_kasus = P.or.kasus;
    run(e.currentTarget, api('ortu.catat', d)).then(function () { m.close(); toast('Komunikasi tercatat.'); return apiC('ortu.riwayat', { id_murid: P.or.id }); }).then(function (rw) { P.or.rw = rw; orHist(); }).catch(fail);
  });
};
ACT['or-surat'] = function () { siapKop().then(orSuratModal); };
/** Ganti isian {..} yang sudah diketahui di layar; sisanya ({tanggal}, {jam}, …) diisi server saat surat dibuat. */
function isiSuratLokal(t) {
  const s = P.or.s || {}, v = { nama_murid: s.nama_murid, kelas: s.kelas, nama_ortu: s.nama_ortu || 'Bapak/Ibu', sekolah: (KOP && KOP.sekolah) || S.cfg.namaSekolah, pengirim: S.user.nama };
  return String(t || '').replace(/\{([a-z_]+)\}/g, function (a, k) { return v[k] ? v[k] : a; });
}
function orSuratModal() {
  const J = [{ v: 'panggilan', l: 'Surat panggilan (pertemuan)' }, { v: 'pemberitahuan', l: 'Surat pemberitahuan' }, { v: 'konseling', l: 'Persetujuan layanan konseling' }];
  const T = (KOP && KOP.templat) || {}, B = (KOP && KOP.bagian) || {};
  const kalimat = function (j) {
    return Object.keys(T[j] || {}).map(function (k) {
      const isi = k === 'isi';
      return '<div class="field"><label for="sr-t-' + j + '-' + k + '">' + esc(B[k] || k) + (isi ? ' <span class="req">*</span>' : '') + '</label><textarea class="textarea" id="sr-t-' + j + '-' + k + '" data-bg="' + k + '" rows="' + (isi ? 7 : k === 'salam' ? 1 : 3) + '"' + (k === 'salam' ? ' style="min-height:44px"' : '') + ' maxlength="' + (isi ? 3000 : 1500) + '">' + esc(isiSuratLokal(T[j][k])) + '</textarea></div>';
    }).join('');
  };
  const m = openModal({
    title: 'Buat surat untuk orang tua', sub: P.or.s.nama_murid + ' · ' + (P.or.s.kelas || ''), size: 'lg',
    body: '<form id="f-sr" class="form-grid" novalidate>' + fld({ name: 'jenis', label: 'Jenis surat', type: 'select', req: true, value: 'panggilan', opts: J }) +
      '<div data-j="panggilan" class="form-grid"><div class="form-grid c2">' + fld({ name: 'tanggal_pertemuan', label: 'Tanggal pertemuan', type: 'date', min: S.today, value: addD(S.today, 3) }) + fld({ name: 'jam', label: 'Pukul', max: 20, value: '09.00 WIB' }) + '</div>' +
      fld({ name: 'tempat', label: 'Tempat', max: 120, value: 'Ruang BK' }) + fld({ name: 'keperluan', id: 'sr_kep_p', label: 'Keperluan', type: 'textarea', rows: 2, max: 400, value: 'Diskusi perkembangan dan pendampingan ananda' }) + '</div>' +
      '<div data-j="pemberitahuan" class="form-grid hide">' + fld({ name: 'perihal', label: 'Perihal', max: 100, ph: 'Contoh: Pemberitahuan ketidakhadiran ananda' }) + '</div>' +
      '<div data-j="konseling" class="form-grid hide">' + fld({ name: 'ket_konseling', label: 'Keterangan tambahan (opsional)', type: 'textarea', rows: 2, max: 400, hint: 'Jangan menuliskan isi permasalahan yang bersifat rahasia.' }) + '</div></form>' +
      '<div class="sr-kal mt-16"><div class="row between wrap" style="gap:8px"><div><b>Kalimat surat</b><div class="xs muted">Terisi dari templat sekolah. Ubah seperlunya untuk surat ini saja. Tanda {…} diisi otomatis.</div></div><button class="btn sm ghost" type="button" id="sr-reset"><i class="bi bi-arrow-counterclockwise"></i> Kembalikan ke templat</button></div>' +
      J.map(function (x) { return '<div class="form-grid mt-12' + (x.v === 'panggilan' ? '' : ' hide') + '" data-jk="' + x.v + '">' + kalimat(x.v) + '</div>'; }).join('') + '</div>' +
      '<div class="xs muted mt-12">Kop, nomor, dan tanda tangan mengikuti Administrasi → Surat &amp; Cetak. <b>Pratinjau</b> tidak memakai nomor surat; nomor resmi diberikan saat <b>Terbitkan</b>.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn" id="sr-prev"><i class="bi bi-eye"></i> Pratinjau</button><button class="btn primary" id="sr-ok"><i class="bi bi-file-earmark-check"></i> Terbitkan</button>'
  });
  const f = $('#f-sr', m.el);
  const jenis = function () { return $('[name=jenis]', f).value; };
  $('[name=jenis]', f).addEventListener('change', function (e) {
    $$('[data-j]', f).forEach(function (x) { x.classList.toggle('hide', x.dataset.j !== e.target.value); });
    $$('[data-jk]', m.el).forEach(function (x) { x.classList.toggle('hide', x.dataset.jk !== e.target.value); });
  });
  $('#sr-reset', m.el).addEventListener('click', function () {
    const j = jenis();
    $$('[data-jk="' + j + '"] [data-bg]', m.el).forEach(function (ta) { ta.value = isiSuratLokal(T[j][ta.dataset.bg]); });
    toast('Kalimat dikembalikan ke templat sekolah.');
  });
  const kumpul = function () {
    const d = formData(f), j = d.jenis;
    const rules = j === 'panggilan' ? { tanggal_pertemuan: { label: 'Tanggal', req: true }, jam: { label: 'Pukul', req: true }, tempat: { label: 'Tempat', req: true }, keperluan: { label: 'Keperluan', req: true, min: 5 } } : j === 'pemberitahuan' ? { perihal: { label: 'Perihal', req: true } } : {};
    if (!validate(f, d, rules)) return null;
    const teks = {};
    $$('[data-jk="' + j + '"] [data-bg]', m.el).forEach(function (ta) { teks[ta.dataset.bg] = ta.value.trim(); });
    if (j === 'pemberitahuan') {
      const ta = $('[data-jk="pemberitahuan"] [data-bg="isi"]', m.el);
      if (teks.isi.length < 10 || /\.\.\./.test(teks.isi)) { toast(teks.isi.length < 10 ? 'Isi surat wajib diisi.' : 'Lengkapi bagian "..." pada isi surat.', 'warn'); ta.focus(); return null; }
    }
    const p = { jenis: j, id_murid: P.or.id, teks: teks };
    if (P.or.kasus) p.id_kasus = P.or.kasus;
    if (j === 'panggilan') Object.assign(p, { tanggal_pertemuan: d.tanggal_pertemuan, jam: d.jam, tempat: d.tempat, keperluan: d.keperluan });
    else if (j === 'pemberitahuan') Object.assign(p, { perihal: d.perihal });
    else p.keperluan = d.ket_konseling || '';
    return p;
  };
  const terbit = function (btn, pv) {
    const p = kumpul(); if (!p) return;
    run(btn, api('ortu.surat', p)).then(function (r) {
      if (pv) pv.close();
      m.close(); toast('Surat ' + r.nomor + ' diterbitkan.');
      apiC('ortu.riwayat', { id_murid: P.or.id }).then(function (rw) { P.or.rw = rw; orHist(); });
      previewFile({ nama: r.nama, mime: r.mime, base64: r.base64, blok: r.blok });
    }).catch(fail);
  };
  $('#sr-ok', m.el).addEventListener('click', function (e) { terbit(e.currentTarget); });
  $('#sr-prev', m.el).addEventListener('click', function (e) {
    const p = kumpul(); if (!p) return;
    run(e.currentTarget, api('ortu.suratPratinjau', p)).then(function (r) {
      const pv = openModal({
        title: 'Pratinjau surat', sub: 'Nomor ' + r.nomor + ' masih sementara · belum tersimpan', size: 'lg',
        body: '<div class="preview doc" id="sp-body">' + renderBlokHtml(r.blok) + '</div>',
        foot: '<button class="btn" data-close><i class="bi bi-pencil"></i> Kembali menyunting</button><button class="btn primary" id="sp-ok"><i class="bi bi-file-earmark-check"></i> Terbitkan</button>'
      });
      fitPaper(pv.el); setTimeout(function () { fitPaper(pv.el); }, 150);
      $('#sp-ok', pv.el).addEventListener('click', function (ev) { terbit(ev.currentTarget, pv); });
    }).catch(fail);
  });
}
