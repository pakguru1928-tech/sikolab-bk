/* SIKOLAB BK v1.15 — js/pages/36_wa.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// WhatsApp orang tua tanpa pindah halaman: jendela kecil → buka WhatsApp → "Sudah terkirim?" → tercatat
// ════════════════════════════════════════════════════════════
const WA_TPL_DASAR = [['undangan', 'Undangan diskusi'], ['absen', 'Info ketidakhadiran'], ['jadwal', 'Jadwal pertemuan']];
function waTpl() { return WA_TPL_DASAR.concat(S.cfg && S.cfg.poinAktif ? [['poin', 'Info poin tata tertib']] : []); }
ACT['wa-murid'] = function (el) { waModal({ id_murid: el.dataset.id, templat: el.dataset.t, tanggal: el.dataset.tgl, id_kasus: el.dataset.kasus }); };
function waModal(o) {
  const m = openModal({ title: 'Hubungi orang tua', sub: 'Menyiapkan pesan…', body: skeleton(2), foot: '<button class="btn ghost" id="wa-lengkap"><i class="bi bi-file-earmark-text"></i> Surat & riwayat</button><button class="btn" data-close>Tutup</button>', noFocus: true });
  $('#wa-lengkap', m.el).addEventListener('click', function () { m.close(); navigateTo('ortu', { id_murid: o.id_murid, id_kasus: o.id_kasus || '', templat: o.templat || '', tanggal: o.tanggal || '' }); });
  const muat = function (tpl) {
    o.templat = tpl;
    apiC('ortu.siapkan', { id_murid: o.id_murid, templat: tpl, tanggal: o.tanggal || '' }).then(function (s) { waGambar(m, o, s); }).catch(function (e) { m.body.innerHTML = errBox(e); });
  };
  m.muat = muat;
  muat(waTpl().some(function (t) { return t[0] === o.templat; }) ? o.templat : 'undangan');
}
function waGambar(m, o, s) {
  const sub = $('.m-head .xs', m.el); if (sub) sub.textContent = s.nama_murid + ' · ' + s.kelas + ' · ' + (s.nama_ortu || 'orang tua/wali');
  m.body.innerHTML = '<div class="fchips">' + waTpl().map(function (t) { return '<button class="fchip ' + (t[0] === o.templat ? 'active' : '') + '" data-wtpl="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="field mt-12"><label for="wa-msg">Pesan (dapat diubah)</label><textarea class="textarea" id="wa-msg" rows="6" maxlength="1000">' + esc(s.pesan) + '</textarea></div>' +
    '<div class="row wrap mt-12" id="wa-aksi">' + (s.hp ? '<a class="btn wa-btn" id="wa-go" href="#" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Kirim lewat WhatsApp</a>' : '<span class="chip st-Baru"><i class="bi bi-exclamation-triangle"></i> Nomor WhatsApp orang tua belum valid</span>') + '<button class="btn" id="wa-salin"><i class="bi bi-clipboard"></i> Salin</button></div>' +
    '<div id="wa-sesudah" class="wa-after hide"><i class="bi bi-chat-dots"></i><div class="grow"><b>Sudah terkirim?</b><span>Catat agar tampil di garis waktu murid.</span></div><button class="btn sm" id="wa-belum">Belum</button><button class="btn sm primary" id="wa-catat"><i class="bi bi-check-lg"></i> Ya, catat</button></div>' +
    (s.hp ? '' : '<div class="xs muted mt-8">Wali kelas dapat memperbarui nomor di Kelas Saya → Kontak; admin di Administrasi → Murid.</div>');
  const msg = $('#wa-msg', m.el);
  $$('[data-wtpl]', m.el).forEach(function (b) { b.addEventListener('click', function () { m.body.innerHTML = skeleton(2); m.muat(b.dataset.wtpl); }); });
  const go = $('#wa-go', m.el);
  const href = function () { return 'https://wa.me/' + s.hp + '?text=' + encodeURIComponent(msg.value); };
  if (go) {
    go.href = href();
    msg.addEventListener('input', function () { go.href = href(); });
    go.addEventListener('click', function () { setTimeout(function () { show('#wa-sesudah', true); }, 500); });
  }
  $('#wa-salin', m.el).addEventListener('click', function () { salin(msg.value, 'Pesan disalin.'); if (!s.hp) show('#wa-sesudah', true); });
  $('#wa-belum', m.el).addEventListener('click', function () { show('#wa-sesudah', false); });
  $('#wa-catat', m.el).addEventListener('click', function () {
    const label = (waTpl().filter(function (t) { return t[0] === o.templat; })[0] || ['', 'Komunikasi'])[1];
    const d = { id_murid: o.id_murid, tanggal: S.today, media: 'WhatsApp', tujuan: label, ringkasan_pembahasan: msg.value, hasil: 'Pesan terkirim; menunggu tanggapan orang tua.' };
    if (o.id_kasus) d.id_kasus = o.id_kasus;
    m.close();
    toast('Komunikasi tercatat.');
    // Optimistis: jendela langsung tertutup, pencatatan berjalan di latar belakang.
    api('ortu.catat', d).then(function () { if (S.page === 'ortu' && P.or && P.or.id === o.id_murid) apiC('ortu.riwayat', { id_murid: o.id_murid }).then(function (rw) { P.or.rw = rw; orHist(); }); })
      .catch(function (e) { toast('Gagal mencatat komunikasi: ' + e.message, 'err'); });
  });
}
