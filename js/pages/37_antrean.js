/* SIKOLAB BK v1.15 — js/pages/37_antrean.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Antrean simpan (UI optimistis): absensi langsung dinyatakan tersimpan di layar, dikirim ke server di latar
// belakang. Antrean disimpan di perangkat (aman saat sinyal putus atau tab tertutup) dan dikirim berurutan.
// ════════════════════════════════════════════════════════════
const OB = { list: [], sending: false, timer: null };
const OB_CB = {};
function obKey() { return 'sk_ob_' + (S.email || sget('sk_email') || ''); }
function obMuat() { try { OB.list = JSON.parse(lstore(obKey()) || '[]') || []; } catch (e) { OB.list = []; } return OB.list; }
function obSimpan() { lstore(obKey(), JSON.stringify(OB.list)); obChip(); }
function obAda(kunci) { return obMuat().some(function (x) { return x.kunci === kunci; }); }
function obTambah(action, payload, label, kunci, onOk) {
  obMuat();
  OB.list = OB.list.filter(function (x) { return x.kunci !== kunci; }); // simpan ulang sebelum terkirim: pakai yang terbaru
  OB.list.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), action: action, payload: payload, label: label, kunci: kunci, t: Date.now() });
  obSimpan();
  if (onOk) OB_CB[kunci] = onOk;
  setTimeout(obKirim, 30);
}
function obKirim() {
  clearTimeout(OB.timer);
  if (!S.user || OB.sending) { obChip(); return; }
  obMuat();
  if (!OB.list.length) { obChip(); return; }
  OB.sending = true; obChip();
  const x = OB.list[0];
  let lanjut = true;
  api(x.action, x.payload, true).then(function (res) {
    obMuat(); OB.list = OB.list.filter(function (y) { return y.id !== x.id; }); obSimpan();
    const cb = OB_CB[x.kunci]; delete OB_CB[x.kunci];
    if (cb) { try { cb(res); } catch (e) { /* abaikan */ } }
  }).catch(function (e) {
    const sementara = e.code === 'AUTH' || e.code === 'PINCHG' || /koneksi|sibuk|jaringan|timeout|server/i.test(e.message || '');
    if (sementara) { lanjut = false; OB.timer = setTimeout(obKirim, 8000); return; }
    obMuat(); OB.list = OB.list.filter(function (y) { return y.id !== x.id; }); obSimpan();
    obGagal(x, e);
  }).then(function () {
    OB.sending = false; obChip();
    if (lanjut && OB.list.length) setTimeout(obKirim, 60);
  });
}
/** Ditolak server (mis. sesi sudah tersimpan oleh orang lain): beri tahu dengan jelas dan tawarkan kirim ulang sebagai koreksi. */
function obGagal(x, e) {
  const m = openModal({
    title: 'Belum tersimpan', sub: x.label, sticky: true,
    body: '<div class="note rose"><i class="bi bi-exclamation-triangle"></i><div>' + esc(e.message) + '</div></div><p class="muted-2 mt-12">Data yang Anda isi masih ada. Pilih <b>Kirim ulang sebagai koreksi</b> untuk menimpa catatan yang sudah ada, atau buka kembali sesi tersebut untuk memeriksanya.</p>',
    foot: '<button class="btn" data-close>Buang</button><button class="btn primary" id="ob-ulang"><i class="bi bi-arrow-repeat"></i> Kirim ulang sebagai koreksi</button>'
  });
  $('#ob-ulang', m.el).addEventListener('click', function () {
    m.close();
    obTambah(x.action, Object.assign({}, x.payload, { koreksi: true }), x.label, x.kunci);
    toast('Dikirim ulang sebagai koreksi.');
  });
}
function obChip() {
  const tb = $('#topbar'); if (!tb) return;
  let c = $('#ob-chip');
  const n = OB.list.length;
  if (!n) { if (c) c.remove(); return; }
  if (!c) { c = document.createElement('button'); c.id = 'ob-chip'; c.className = 'top-chip ob-chip'; c.setAttribute('data-act', 'ob-info'); const b = $('#bell'); tb.insertBefore(c, b || null); }
  const luring = !navigator.onLine || !!OB.timer;
  c.classList.toggle('luring', luring);
  c.innerHTML = '<i class="bi ' + (luring ? 'bi-cloud-slash' : 'bi-cloud-arrow-up') + '"></i>' + (luring ? 'Menunggu sinyal · ' : 'Menyimpan · ') + n;
}
ACT['ob-info'] = function () {
  obMuat();
  openModal({ title: 'Antrean simpan', sub: 'Data yang sudah Anda simpan dan sedang dikirim ke server',
    body: OB.list.length ? '<div class="col gap-8">' + OB.list.map(function (x) { return '<div class="sec"><b>' + esc(x.label) + '</b><div class="xs muted">Disimpan ' + esc(hhmm(x.t)) + '</div></div>'; }).join('') + '</div><p class="xs muted mt-12">Antrean tersimpan di perangkat ini dan dikirim otomatis saat sinyal tersedia. Jangan keluar akun sebelum antrean kosong.</p>' : empty('bi-cloud-check', 'Semua data sudah tersimpan di server'),
    foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" data-act="ob-kirim" data-close><i class="bi bi-arrow-repeat"></i> Kirim sekarang</button>' });
};
ACT['ob-kirim'] = function () { obKirim(); };
