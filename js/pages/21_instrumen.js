/* SIKOLAB BK v1.15 — js/pages/21_instrumen.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Instrumen BK: AKPD, sosiometri, angket kebutuhan (templat dapat diedit Guru BK)
// ════════════════════════════════════════════════════════════
const TIPE_NAMA = { masalah: 'Pernyataan (centang)', skala: 'Skala 1–4', pilihan: 'Pilihan tunggal', banyak: 'Pilihan ganda', isian: 'Isian bebas', teman: 'Pilih teman (sosiometri)' };
const JENIS_COL = { 'AKPD': 'var(--indigo)', 'Sosiometri': 'var(--teal)', 'Angket Kebutuhan': 'var(--amber)', 'Gaya Belajar': 'var(--blue)', 'Minat & Karier': 'var(--purple)', 'Kesejahteraan': 'var(--rose)', 'Kebiasaan Belajar': 'var(--teal)', 'Lainnya': 'var(--text-3)' };
PAGES.instrumen = function (params, tok) {
  if (params.hasil) return inHasil(params.hasil, tok);
  if (params.edit) return inEdit(params.edit, tok);
  if (params.isi) return inIsi(params.isi, tok);
  return inList(tok);
};
function inBack() { return '<button class="btn ghost sm mb-16" data-act="in-list"><i class="bi bi-arrow-left"></i> Semua instrumen</button>'; }
ACT['in-list'] = function () { navigateTo('instrumen', {}); };

function chipInstrumen(st) { return '<span class="chip ' + (st === 'Dibuka' ? 'st-Dipantau' : st === 'Ditutup' ? 'st-Selesai' : 'st-Baru') + '">' + esc(st) + '</span>'; }
function inList(tok) {
  return apiC('instrumen.daftar').then(function (r) {
    if (stale(tok)) return;
    P.inl = r;
    const ubah = r.bolehUbah;
    let h = pageHead('Pengumpulan data', 'Instrumen BK', ubah ? 'AKPD, gaya belajar, minat karier, kesejahteraan, kebiasaan belajar, sosiometri, dan angket buatan sendiri. Semua butir dapat Anda ubah.' : 'Hasil instrumen BK dalam bentuk agregat (tanpa nama murid).', ubah ? '<button class="btn primary" data-act="in-baru"><i class="bi bi-plus-lg"></i> Buat instrumen</button>' : '');
    if (!r.rows.length) {
      h += '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada instrumen', ubah ? 'Mulai dari templat siap pakai atau kerangka untuk instrumen buatan sendiri.' : 'Guru BK belum membuat instrumen.') + (ubah ? '<div style="text-align:center"><button class="btn dark" data-act="in-baru"><i class="bi bi-plus-lg"></i> Buat instrumen</button></div>' : '') + '</div>';
    } else {
      h += '<div class="grid g-3">' + r.rows.map(function (x) {
        const pct = x.target ? Math.round(x.responden * 100 / x.target) : 0;
        return '<div class="card pad"><div class="row between wrap" style="gap:6px"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[x.jenis] || 'var(--text-3)') + '">' + esc(x.jenis) + '</span><span class="row" style="gap:4px">' + (x.templat ? '<span class="chip blue" title="Muncul di pilihan Buat instrumen"><i class="bi bi-bookmark"></i> Templat</span>' : '') + chipInstrumen(x.status) + '</span></div>' +
          '<h3 class="mt-12" style="margin-top:12px">' + esc(x.judul) + '</h3><div class="xs muted">' + esc(x.kelas) + ' · ' + x.butir + ' butir' +
          (x.tutup ? ' · ' + (x.tutupOtomatis ? 'ditutup otomatis ' : 'tutup ') + esc(fTgl(x.tutup)) : '') + '</div>' +
          '<div class="row mt-12"><div class="bar grow"><i style="width:' + pct + '%"></i></div><b class="xs">' + x.responden + '/' + x.target + '</b></div>' +
          '<div class="row wrap mt-12"><button class="btn sm dark" data-act="in-hasil" data-id="' + esc(x.id) + '"><i class="bi bi-graph-up-arrow"></i> Hasil</button>' +
          (ubah ? '<button class="btn sm" data-act="in-isi" data-id="' + esc(x.id) + '"><i class="bi bi-link"></i> Pengisian</button><button class="btn sm" data-act="in-edit" data-id="' + esc(x.id) + '"><i class="bi bi-pencil"></i> Sunting</button><button class="btn sm soft-danger" data-act="in-hapus" data-id="' + esc(x.id) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button>' : '') + '</div></div>';
      }).join('') + '</div>';
    }
    $('#app-container').innerHTML = h;
  });
}
ACT['in-hasil'] = function (el) { navigateTo('instrumen', { hasil: el.dataset.id }); };
ACT['in-edit'] = function (el) { navigateTo('instrumen', { edit: el.dataset.id }); };
ACT['in-isi'] = function (el) { navigateTo('instrumen', { isi: el.dataset.id }); };
ACT['in-hapus'] = function (el) {
  confirmDlg('Instrumen beserta semua jawabannya akan dihapus. Lanjutkan?', 'Hapus', true, 'Hapus instrumen').then(function (ok) {
    if (ok) api('instrumen.hapus', { id: el.dataset.id }).then(function () { toast('Instrumen dihapus.'); navigateTo('instrumen', {}); }).catch(fail);
  });
};
ACT['in-baru'] = function () {
  const T = P.inl.templat;
  const GRUP = [['siap', 'Templat siap pakai', 'Butir disusun untuk murid SMP; untuk skrining, bukan instrumen baku. Semua butir dapat Anda ubah.'], ['sekolah', 'Templat sekolah', 'Instrumen yang Anda tandai sebagai templat.'], ['kerangka', 'Kerangka instrumen buatan sendiri', 'Struktur siap isi: ganti teks contoh bertanda [Ganti] dengan butir Anda.']];
  const IKON = { akpd: 'bi-list-check', angket: 'bi-clipboard-data', gaya: 'bi-eye', karier: 'bi-compass', sejahtera: 'bi-heart-pulse', kebiasaan: 'bi-calendar-check', sosiometri: 'bi-people', k_skala: 'bi-sliders', k_cek: 'bi-check2-square', k_kuesioner: 'bi-ui-checks' };
  const m = openModal({
    title: 'Buat instrumen', sub: 'Pilih titik awal. Anda dapat mengubah, menambah, atau menghapus butir setelahnya.', size: 'lg',
    body: '<div id="in-tpl">' + GRUP.map(function (g) {
      const isi = T.filter(function (t) { return (t.grup || 'siap') === g[0]; });
      if (!isi.length) return '';
      return '<div class="in-grp"><div class="fw7">' + g[1] + '</div><div class="xs muted mb-8">' + g[2] + '</div><div class="role-pick">' + isi.map(function (t) {
        return '<button class="role-opt' + (t.kode === T[0].kode ? ' on' : '') + '" data-act="in-tpl" data-k="' + esc(t.kode) + '"><span class="ro-ic"><i class="bi ' + (IKON[t.kode] || 'bi-bookmark') + '"></i></span><span class="ro-tx"><b>' + esc(t.judul) + '</b><span>' + esc(t.ket) + '</span></span></button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>' +
      '<form id="f-inb" class="form-grid c2 mt-16" novalidate>' + fld({ name: 'id_kelas', label: 'Sasaran kelas', type: 'select', blank: 'Semua kelas', opts: kelasOpts(), hint: 'Wajib dipilih untuk sosiometri (dilaksanakan per kelas).' }) + fld({ name: 'judul', label: 'Judul (opsional)', max: 150, ph: 'Mengikuti nama templat' }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="inb-ok">Buat</button>'
  });
  P.intpl = T[0].kode;
  $('#inb-ok', m.el).addEventListener('click', function (e) {
    const d = formData($('#f-inb', m.el));
    if (P.intpl === 'sosiometri' && !d.id_kelas) { setErr(m.el, 'id_kelas', 'Pilih kelas untuk sosiometri.'); return; }
    run(e.currentTarget, api('instrumen.buat', { templat: P.intpl, id_kelas: d.id_kelas, judul: d.judul })).then(function (r) { m.close(); toast('Instrumen dibuat. Periksa dan sesuaikan butirnya.'); navigateTo('instrumen', { edit: r.id }); }).catch(fail);
  });
};
ACT['in-tpl'] = function (el) { P.intpl = el.dataset.k; $$('#in-tpl .role-opt').forEach(function (b) { b.classList.toggle('on', b === el); }); };

// ── Penyusun butir ──
function inEdit(id, tok) {
  return apiC('instrumen.get', { id: id }).then(function (d) {
    if (stale(tok)) return;
    P.ine = d;
    P.ine.kunci = d.responden > 0;
    P.ine.butir.forEach(function (b) { if (b.opsi) b.opsiTeks = b.opsi.join('\n'); });
    const aksi = '<button class="btn" data-act="in-pratinjau"><i class="bi bi-eye"></i> Pratinjau</button>' +
      '<button class="btn" data-act="in-salin" title="Salinan Draf tanpa jawaban; susunan butir bebas diubah"><i class="bi bi-files"></i> Salin jadi versi baru</button>' +
      '<button class="btn" data-act="in-jadi-templat" data-on="' + (d.atur.templat ? '0' : '1') + '"><i class="bi bi-bookmark"></i> ' + (d.atur.templat ? 'Lepas dari templat' : 'Jadikan templat sekolah') + '</button>' +
      '<button class="btn primary" data-act="in-simpan"><i class="bi bi-check-lg"></i> Simpan</button>';
    const adaSkala = d.butir.some(function (b) { return b.tipe === 'skala'; });
    $('#app-container').innerHTML = inBack() + pageHead('Sunting instrumen', d.judul, 'Atur judul, sasaran, dan butir. Simpan sebelum membuka pengisian.', aksi) +
      (P.ine.kunci ? '<div class="note mb-16"><i class="bi bi-lock"></i><div><b>Sudah ada ' + d.responden + ' jawaban.</b> Anda tetap boleh memperbaiki kata-kata (teks butir, pilihan, kelompok, judul, petunjuk). Menambah, menghapus, atau mengubah urutan/jenis butir dikunci agar jawaban lama tetap terbaca benar. Perlu susunan baru? Pakai <b>Salin jadi versi baru</b>.</div></div>' : '') +
      '<div class="card pad"><form id="f-ine" class="form-grid c2" novalidate>' + fld({ name: 'judul', label: 'Judul', req: true, max: 150, value: d.judul }) + fld({ name: 'jenis', label: 'Jenis', type: 'select', value: d.jenis, opts: d.jenisOpsi }) +
      fld({ name: 'id_kelas', label: 'Sasaran kelas', type: 'select', blank: 'Semua kelas', value: d.id_kelas, opts: d.kelas, dis: P.ine.kunci }) +
      fld({ name: 'tutup', label: 'Tutup otomatis pada (opsional)', type: 'date', value: d.atur.tutup || '', hint: 'Setelah tanggal ini murid tidak dapat mengisi lagi.' }) +
      '<div id="ine-tafsir" style="grid-column:1/-1' + (adaSkala ? '' : ';display:none') + '">' + fld({ name: 'tafsir', label: 'Cara membaca skor skala', type: 'select', value: d.atur.tafsir, opts: d.tafsirOpsi, hint: 'Menentukan urutan "perlu perhatian", kelompok kebutuhan, dan rekomendasi pada hasil.' }) + '</div>' +
      '<div style="grid-column:1/-1">' + fld({ name: 'deskripsi', label: 'Petunjuk untuk murid', type: 'textarea', rows: 2, max: 600, value: d.deskripsi }) + '</div></form></div>' +
      '<div class="row between wrap mt-16 mb-16"><h3>Butir (<span id="ine-n">0</span>)</h3><div class="row wrap">' + (P.ine.kunci ? '' : '<button class="btn" data-act="in-tempel"><i class="bi bi-list-check"></i> Tempel banyak butir</button><button class="btn dark" data-act="in-tambah"><i class="bi bi-plus-lg"></i> Tambah butir</button>') + '</div></div><div id="ine-list" class="col gap-12"></div>' +
      '<div class="row wrap mt-16" style="justify-content:flex-end"><button class="btn" data-act="in-pratinjau"><i class="bi bi-eye"></i> Pratinjau</button><button class="btn primary" data-act="in-simpan"><i class="bi bi-check-lg"></i> Simpan</button></div>';
    inEditDraw();
    const list = $('#ine-list');
    list.addEventListener('input', inEditInput); list.addEventListener('change', inEditInput);
  });
}
function inEditInput(e) {
  const card = e.target.closest('.bt'); if (!card) return;
  const b = P.ine.butir[+card.dataset.i], f = e.target.dataset.bf; if (!f) return;
  if (f === 'wajib') b.wajib = e.target.checked;
  else if (f === 'maks') b.maks = +e.target.value;
  else if (f === 'tipe') { b.tipe = e.target.value; if (b.tipe === 'teman') { b.maks = b.maks || 3; b.arah = b.arah || 'pilih'; } if (['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0 && !b.opsiTeks) b.opsiTeks = b.tipe === 'skala' ? 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh' : 'Pilihan A\nPilihan B'; inEditDraw(); return; }
  else b[f] = e.target.value;
}
function inEditDraw() {
  const butir = P.ine.butir, kunci = P.ine.kunci;
  $('#ine-n').textContent = butir.length;
  const t = $('#ine-tafsir'); if (t) t.style.display = butir.some(function (b) { return b.tipe === 'skala'; }) ? '' : 'none';
  $('#ine-list').innerHTML = butir.map(function (b, i) {
    const opsi = ['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0;
    const ganti = /^\[Ganti\]/.test(b.teks || '');
    return '<div class="card pad bt' + (ganti ? ' bt-ganti' : '') + '" data-i="' + i + '"><div class="row between wrap"><div class="row"><span class="step-n sm">' + (i + 1) + '</span>' +
      (kunci ? '<span class="chip neutral">' + TIPE_NAMA[b.tipe] + '</span>' : '<select class="select" data-bf="tipe" style="min-height:36px;width:auto" aria-label="Jenis butir">' + Object.keys(TIPE_NAMA).map(function (t) { return '<option value="' + t + '"' + (b.tipe === t ? ' selected' : '') + '>' + TIPE_NAMA[t] + '</option>'; }).join('') + '</select>') +
      (ganti ? '<span class="chip st-Baru">Ganti teks contoh</span>' : '') + '</div>' +
      (kunci ? '' : '<div class="row"><button class="btn sm" data-act="in-naik" data-i="' + i + '" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '><i class="bi bi-arrow-up"></i></button><button class="btn sm" data-act="in-turun" data-i="' + i + '" aria-label="Turunkan"' + (i === butir.length - 1 ? ' disabled' : '') + '><i class="bi bi-arrow-down"></i></button><button class="btn sm" data-act="in-dup" data-i="' + i + '" aria-label="Duplikat butir" title="Duplikat"><i class="bi bi-files"></i></button><button class="btn sm soft-danger" data-act="in-del" data-i="' + i + '" aria-label="Hapus butir"><i class="bi bi-trash3"></i></button></div>') + '</div>' +
      '<div class="form-grid mt-12"><div class="field"><label>Teks ' + (b.tipe === 'masalah' ? 'pernyataan' : 'pertanyaan') + '</label><textarea class="textarea" rows="2" maxlength="300" data-bf="teks">' + esc(b.teks) + '</textarea></div>' +
      '<div class="form-grid c2"><div class="field"><label>Kelompok / bidang</label><input class="input" maxlength="60" data-bf="kelompok" value="' + esc(b.kelompok || '') + '" placeholder="Mis. Pribadi"></div>' +
      (b.tipe !== 'masalah' ? '<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" data-bf="wajib"' + (b.wajib ? ' checked' : '') + '> Wajib diisi</label></div>' : '<div></div>') + '</div>' +
      (opsi ? '<div class="field"><label>Pilihan (satu per baris)</label><textarea class="textarea" rows="' + Math.min(6, Math.max(3, (b.opsiTeks || '').split('\n').length)) + '" data-bf="opsiTeks">' + esc(b.opsiTeks || '') + '</textarea>' + (b.tipe === 'skala' ? '<div class="hint">Urutan dari terendah (1) ke tertinggi.' + (kunci ? ' Jumlah pilihan tidak dapat diubah.' : '') + '</div>' : (kunci ? '<div class="hint">Jumlah pilihan tidak dapat diubah.</div>' : '')) + '</div>' : '') +
      (b.tipe === 'teman' ? '<div class="form-grid c2"><div class="field"><label>Maksimal pilihan</label><select class="select" data-bf="maks">' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + ((b.maks || 3) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div class="field"><label>Arah</label><select class="select" data-bf="arah"' + (kunci ? ' disabled' : '') + '><option value="pilih"' + (b.arah !== 'tolak' ? ' selected' : '') + '>Pilihan positif (disukai)</option><option value="tolak"' + (b.arah === 'tolak' ? ' selected' : '') + '>Penolakan (kurang disukai)</option></select></div></div>' : '') + '</div></div>';
  }).join('') || empty('bi-clipboard', 'Belum ada butir', 'Tambahkan butir pertama.');
}
function inBaruButir(tipe, teks, kel) {
  const b = { id: '', tipe: tipe, teks: teks || '', kelompok: kel || '', wajib: false };
  if (tipe === 'skala') b.opsiTeks = 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh';
  if (tipe === 'pilihan' || tipe === 'banyak') b.opsiTeks = 'Pilihan A\nPilihan B';
  if (tipe === 'teman') { b.maks = 3; b.arah = 'pilih'; }
  return b;
}
ACT['in-tambah'] = function () {
  const a = P.ine.butir, prev = a[a.length - 1];
  const b = prev ? Object.assign({}, prev, { id: '', teks: '', tanda: '' }) : inBaruButir('pilihan', '', ''); // ikuti jenis & kelompok butir terakhir
  a.push(b); inEditDraw();
  const l = $('#ine-list'); if (l.lastElementChild) { l.lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' }); const ta = $('textarea', l.lastElementChild); if (ta) setTimeout(function () { ta.focus(); }, 300); }
};
ACT['in-naik'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (i > 0) { const t = a[i]; a[i] = a[i - 1]; a[i - 1] = t; inEditDraw(); } };
ACT['in-turun'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (i < a.length - 1) { const t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; inEditDraw(); } };
ACT['in-dup'] = function (el) { const i = +el.dataset.i, a = P.ine.butir; if (a.length >= 120) { toast('Maksimal 120 butir.', 'err'); return; } a.splice(i + 1, 0, Object.assign({}, a[i], { id: '', tanda: '' })); inEditDraw(); toast('Butir diduplikat.'); };
ACT['in-del'] = function (el) { P.ine.butir.splice(+el.dataset.i, 1); inEditDraw(); };
ACT['in-tempel'] = function () {
  const m = openModal({
    title: 'Tempel banyak butir', sub: 'Satu butir per baris, dari Word, Excel, atau Google Docs.',
    body: '<form id="f-tp" class="form-grid" novalidate>' + '<div class="form-grid c2">' + fld({ name: 'tipe', label: 'Jenis butir', type: 'select', value: 'masalah', opts: Object.keys(TIPE_NAMA).filter(function (t) { return t !== 'teman'; }).map(function (t) { return { v: t, l: TIPE_NAMA[t] }; }) }) + fld({ name: 'kelompok', label: 'Kelompok / bidang', max: 60, ph: 'Mis. Pribadi' }) + '</div>' +
      fld({ name: 'baris', label: 'Daftar butir', type: 'textarea', rows: 9, max: 12000, req: true, ph: 'Saya sulit berkonsentrasi saat belajar.\nBelajar | Saya sering menunda tugas.\nSosial | Saya sulit bergaul dengan teman baru.', hint: 'Nomor/tanda di awal baris dibuang otomatis. Tulis "Kelompok | teks" untuk menetapkan kelompok per baris (tanpa itu memakai kelompok di atas).' }) +
      '<div id="tp-skala" class="hide">' + fld({ name: 'opsi', label: 'Pilihan (pisahkan dengan koma)', value: ((P.ine.butir.filter(function (b) { return b.tipe === 'skala' && b.opsiTeks; })[0] || {}).opsiTeks || 'Tidak butuh\nKurang butuh\nButuh\nSangat butuh').split('\n').join(', '), max: 300, hint: 'Untuk skala: urut dari terendah ke tertinggi.' }) + '</div><div id="tp-info" class="xs muted"></div></form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="tp-ok">Tambahkan</button>'
  });
  const f = $('#f-tp', m.el);
  const urai = function () {
    const d = formData(f);
    return d.baris.split(/\r?\n/).map(function (s) { return s.replace(/^[\s\-•*–\d.)]+/, '').trim(); }).filter(Boolean).map(function (s) {
      const k = s.indexOf('|');
      return k > 0 && k < 60 ? { kel: s.substr(0, k).trim(), teks: s.substr(k + 1).trim() } : { kel: d.kelompok, teks: s };
    }).filter(function (x) { return x.teks; });
  };
  const info = function () {
    const d = formData(f), a = urai(), kel = {};
    a.forEach(function (x) { kel[x.kel || '(tanpa kelompok)'] = (kel[x.kel || '(tanpa kelompok)'] || 0) + 1; });
    $('#tp-skala', m.el).classList.toggle('hide', ['skala', 'pilihan', 'banyak'].indexOf(d.tipe) < 0);
    $('#tp-info', m.el).textContent = a.length ? a.length + ' butir terbaca: ' + Object.keys(kel).map(function (k) { return k + ' ' + kel[k]; }).join(', ') : '';
  };
  f.addEventListener('input', info); f.addEventListener('change', info);
  $('#tp-ok', m.el).addEventListener('click', function () {
    const d = formData(f), a = urai();
    if (!a.length) { setErr(m.el, 'baris', 'Tempel minimal satu baris.'); return; }
    if (P.ine.butir.length + a.length > 120) { setErr(m.el, 'baris', 'Total butir maksimal 120.'); return; }
    const opsi = (d.opsi || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    a.forEach(function (x) {
      const b = inBaruButir(d.tipe, x.teks.substr(0, 300), x.kel);
      if (['skala', 'pilihan', 'banyak'].indexOf(d.tipe) >= 0 && opsi.length >= 2) b.opsiTeks = opsi.join('\n');
      P.ine.butir.push(b);
    });
    m.close(); inEditDraw(); toast(a.length + ' butir ditambahkan. Jangan lupa Simpan.');
  });
};
function inButirKirim() {
  return P.ine.butir.map(function (b) {
    const o = { id: b.id, tipe: b.tipe, teks: (b.teks || '').trim(), kelompok: (b.kelompok || '').trim(), wajib: !!b.wajib };
    if (b.opsiTeks !== undefined && ['skala', 'pilihan', 'banyak'].indexOf(b.tipe) >= 0) o.opsi = b.opsiTeks.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (b.tipe === 'teman') { o.maks = b.maks || 3; o.arah = b.arah || 'pilih'; }
    if (b.tanda) o.tanda = b.tanda;
    return o;
  });
}
ACT['in-simpan'] = function (el) {
  const f = $('#f-ine'), d = formData(f);
  if (!validate(f, d, { judul: { label: 'Judul', req: true } })) return;
  const butir = inButirKirim();
  for (let i = 0; i < butir.length; i++) if (!butir[i].teks) { toast('Butir ' + (i + 1) + ' belum memiliki teks.', 'err'); return; }
  const sisa = butir.filter(function (b) { return /^\[Ganti\]/.test(b.teks); }).length;
  const kirim = function () {
    return run(el, api('instrumen.simpan', { id: P.ine.id, judul: d.judul, jenis: d.jenis, id_kelas: P.ine.kunci ? P.ine.id_kelas : d.id_kelas, deskripsi: d.deskripsi, butir: butir, tafsir: d.tafsir || P.ine.atur.tafsir, tutup: d.tutup || '' }))
      .then(function () { toast('Instrumen tersimpan.'); navigateTo('instrumen', { edit: P.ine.id }); }).catch(fail);
  };
  if (sisa) confirmDlg(sisa + ' butir masih berisi teks contoh [Ganti]. Simpan tetap?', 'Simpan', false, 'Teks contoh belum diganti').then(function (ok) { if (ok) kirim(); });
  else kirim();
};
ACT['in-salin'] = function (el) {
  confirmDlg('Buat salinan Draf dari instrumen ini (tanpa jawaban)? Instrumen lama beserta jawabannya tetap tersimpan.', 'Salin', false, 'Salin jadi versi baru').then(function (ok) {
    if (ok) run(el, api('instrumen.salin', { id: P.ine.id })).then(function (r) { toast('Versi baru dibuat: ' + r.judul); navigateTo('instrumen', { edit: r.id }); }).catch(fail);
  });
};
ACT['in-jadi-templat'] = function (el) {
  const on = el.dataset.on === '1';
  run(el, api('instrumen.templat', { id: P.ine.id, aktif: on })).then(function () {
    toast(on ? 'Instrumen ini muncul di pilihan Buat instrumen (Templat sekolah).' : 'Dilepas dari templat sekolah.');
    P.ine.atur.templat = on; el.dataset.on = on ? '0' : '1'; el.innerHTML = '<i class="bi bi-bookmark"></i> ' + (on ? 'Lepas dari templat' : 'Jadikan templat sekolah');
  }).catch(fail);
};
/** Pratinjau tampilan murid (tidak menyimpan apa pun). */
ACT['in-pratinjau'] = function () {
  const f = $('#f-ine'), d = f ? formData(f) : { judul: P.ine.judul, deskripsi: P.ine.deskripsi };
  const butir = inButirKirim();
  let last = null;
  const body = butir.map(function (b, i) {
    let g = '';
    if (b.kelompok && b.kelompok !== last) { g = '<div class="jw-grp">' + esc(b.kelompok) + '</div>'; last = b.kelompok; }
    const nm = 'pv' + i;
    let ctl = '';
    if (b.tipe === 'masalah') ctl = '<label class="check"><input type="checkbox"> ' + esc(b.teks) + '</label>';
    else if (b.tipe === 'skala' || b.tipe === 'pilihan') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + (b.wajib ? ' <span class="req">*</span>' : '') + '</div><div class="pv-ops">' + (b.opsi || []).map(function (o) { return '<label class="pv-op"><input type="radio" name="' + nm + '"> ' + esc(o) + '</label>'; }).join('') + '</div>';
    else if (b.tipe === 'banyak') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><div class="pv-ops">' + (b.opsi || []).map(function (o) { return '<label class="pv-op"><input type="checkbox"> ' + esc(o) + '</label>'; }).join('') + '</div>';
    else if (b.tipe === 'isian') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><textarea class="textarea" rows="2"></textarea>';
    else if (b.tipe === 'teman') ctl = '<div class="pv-q">' + (i + 1) + '. ' + esc(b.teks) + '</div><div class="xs muted">Murid memilih maksimal ' + (b.maks || 3) + ' nama teman sekelas dari daftar.</div>';
    return g + '<div class="pv-item">' + ctl + '</div>';
  }).join('');
  openModal({ title: 'Pratinjau: ' + (d.judul || ''), sub: 'Tampilan yang dilihat murid. Jawaban di sini tidak disimpan.', size: 'lg',
    body: (d.deskripsi ? '<div class="note info"><i class="bi bi-info-circle"></i><div>' + esc(d.deskripsi) + '</div></div>' : '') + '<div class="pv mt-12">' + body + '</div>',
    foot: '<button class="btn primary" data-close>Selesai</button>' });
};

// ── Pengisian: tautan murid, status, input manual ──
function inIsi(id, tok) {
  return Promise.all([apiC('instrumen.get', { id: id }), apiC('instrumen.responden', { id: id })]).then(function (r) {
    if (stale(tok)) return;
    const d = r[0], rs = r[1].rows;
    P.ini = { d: d, rs: rs };
    const buka = d.status === 'Dibuka';
    const sudah = rs.filter(function (x) { return x.sudah; }).length;
    let h = inBack() + pageHead('Pengisian instrumen', d.judul, sudah + ' dari ' + rs.length + ' murid sudah mengisi.', '') +
      '<div class="card pad"><div class="row between wrap"><div class="row">' + chipInstrumen(d.status) + '<span class="muted xs">' + (buka ? 'Murid dapat mengisi lewat tautan di bawah.' : 'Buka pengisian agar murid dapat mengisi sendiri, atau input jawaban manual dari kertas.') + '</span></div>' +
      '<div class="row wrap">' + (buka ? '<button class="btn" data-act="in-kode-baru"><i class="bi bi-arrow-repeat"></i> Kode baru</button><button class="btn" data-act="in-status" data-s="Ditutup"><i class="bi bi-lock"></i> Tutup pengisian</button>' : '<button class="btn primary" data-act="in-status" data-s="Dibuka"><i class="bi bi-link"></i> Buka pengisian</button>') + '</div></div>';
    if (buka) {
      h += '<div class="note info mt-12"><i class="bi bi-info-circle"></i><div style="width:100%"><div class="xs muted">Kode pengisian</div><div class="mono" style="font-size:26px;letter-spacing:5px">' + esc(d.kode) + '</div>' +
        '<div class="xs muted mt-8">Tautan untuk dibagikan ke murid (kode sudah terisi; murid cukup memasukkan NIS)</div><div class="row wrap mt-8"><input class="input grow" readonly id="in-link" value="' + esc(d.tautan) + '" onclick="this.select()"><button class="btn" data-act="in-copy"><i class="bi bi-copy"></i> Salin</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Silakan isi ' + d.judul + ' melalui tautan berikut (gunakan NIS): ' + d.tautan) + '"><i class="bi bi-whatsapp" style="color:#16A34A"></i> Bagikan</a></div></div></div>' +
        '<div class="xs muted mt-8">Murid hanya dapat mengisi satu kali. Jawaban hanya terlihat oleh Guru BK. Tutup pengisian setelah semua selesai.</div>';
    }
    h += '</div><div class="card mt-16"><div class="card-head"><div><h3>Daftar murid sasaran</h3><div class="xs muted">Input manual untuk jawaban kertas atau murid tanpa gawai</div></div></div><div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Murid</th><th>Kelas</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' + rs.map(function (x, i) {
      return '<tr><td class="fw6">' + esc(x.nama) + '<div class="xs muted">NIS ' + esc(x.nis) + '</div></td><td>' + esc(x.kelas) + '</td><td>' + (x.sudah ? '<span class="chip st-Dipantau"><i class="bi bi-check2"></i> Sudah' + (x.sudah === 'guru' ? ' (input guru)' : '') + '</span>' : '<span class="chip st-Baru">Belum</span>') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (x.sudah ? '<button class="btn sm" data-act="in-detail" data-id="' + esc(P.ini.d.id) + '" data-m="' + esc(x.id) + '"><i class="bi bi-eye"></i> Lihat</button> ' : '') + '<button class="btn sm" data-act="in-manual" data-i="' + i + '"><i class="bi bi-pencil-square"></i> ' + (x.sudah ? 'Ubah' : 'Input') + '</button>' + (x.sudah ? ' <button class="btn sm soft-danger" data-act="in-jdel" data-i="' + i + '" aria-label="Hapus jawaban"><i class="bi bi-trash3"></i></button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
    $('#app-container').innerHTML = h;
  });
}
ACT['in-status'] = function (el) {
  const id = P.ini.d.id;
  run(el, api('instrumen.status', { id: id, status: el.dataset.s })).then(function () { toast(el.dataset.s === 'Dibuka' ? 'Pengisian dibuka.' : 'Pengisian ditutup.'); navigateTo('instrumen', { isi: id }); }).catch(fail);
};
ACT['in-kode-baru'] = function (el) {
  confirmDlg('Kode lama tidak akan berlaku lagi. Tautan yang sudah dibagikan perlu dikirim ulang. Lanjutkan?', 'Buat kode baru', false, 'Kode baru').then(function (ok) {
    if (ok) run(el, api('instrumen.status', { id: P.ini.d.id, status: 'Dibuka', kodeBaru: true })).then(function () { navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
  });
};
ACT['in-copy'] = function () {
  const t = $('#in-link').value;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Tautan disalin.'); }, function () { $('#in-link').select(); toast('Salin manual (Ctrl+C).', 'warn'); });
  else { $('#in-link').select(); toast('Salin manual (Ctrl+C).', 'warn'); }
};
ACT['in-jdel'] = function (el) {
  const x = P.ini.rs[+el.dataset.i];
  confirmDlg('Hapus jawaban ' + x.nama + '? Murid dapat mengisi ulang.', 'Hapus', true, 'Hapus jawaban').then(function (ok) {
    if (ok) api('instrumen.jawabHapus', { id: P.ini.d.id, id_murid: x.id }).then(function () { toast('Jawaban dihapus.'); navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
  });
};
ACT['in-manual'] = function (el) {
  const x = P.ini.rs[+el.dataset.i];
  run(el, apiC('instrumen.jawabGet', { id: P.ini.d.id, id_murid: x.id })).then(function (g) {
    const m = openModal({
      title: 'Input jawaban — ' + x.nama, sub: x.kelas, size: 'lg',
      body: '<div id="im-form" class="if-form">' + IsiForm.render(g.butir, g.rekan, g.jawaban) + '</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="im-ok">Simpan jawaban</button>'
    });
    IsiForm.bind($('#im-form', m.el), function (mx) { toast('Paling banyak ' + mx + ' pilihan.', 'err'); });
    $('#im-ok', m.el).addEventListener('click', function (e) {
      const r = IsiForm.read($('#im-form', m.el), g.butir);
      if (r.galat.length) { toast('Ada butir wajib yang belum diisi.', 'err'); return; }
      run(e.currentTarget, api('instrumen.jawabManual', { id: P.ini.d.id, id_murid: x.id, jawaban: r.jawab })).then(function () { m.close(); toast('Jawaban tersimpan.'); navigateTo('instrumen', { isi: P.ini.d.id }); }).catch(fail);
    });
  }).catch(fail);
};

// ── Hasil & analisis ──
function hbar(label, pct, val, color, sub) {
  return '<div class="hb"><div class="row between"><span>' + esc(label) + (sub ? ' <span class="xs muted">' + esc(sub) + '</span>' : '') + '</span><b>' + esc(val) + '</b></div><div class="bar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + (color || 'var(--indigo)') + '"></i></div></div>';
}
function sociogramSvg(siswa, edges) {
  const n = siswa.length; if (!n) return '';
  const W = 560, H = 560, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 56;
  const pos = {};
  siswa.forEach(function (s, i) { const a = -Math.PI / 2 + 2 * Math.PI * i / n; pos[s.id] = [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const col = function (s) { return s.tag.indexOf('Populer') >= 0 ? '#0D9488' : s.tag.indexOf('Ditolak') >= 0 ? '#EF4444' : s.tag.indexOf('Terisolir') >= 0 ? '#F59E0B' : '#64748B'; };
  let h = '<defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#94A3B8"/></marker></defs>';
  edges.forEach(function (e) {
    const a = pos[e.a], b = pos[e.b]; if (!a || !b) return;
    h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (e.timbal ? '#0D9488' : '#94A3B8') + '" stroke-width="' + (e.timbal ? 2.2 : 1) + '" opacity="' + (e.timbal ? .9 : .45) + '"' + (e.timbal ? '' : ' marker-end="url(#arw)"') + '/>';
  });
  siswa.forEach(function (s) {
    const p = pos[s.id], r = 9 + Math.min(10, s.dipilih * 1.6);
    h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + col(s) + '" stroke="var(--card)" stroke-width="2"><title>' + esc(s.nama) + ': dipilih ' + s.dipilih + ', ditolak ' + s.ditolak + '</title></circle>' +
      '<text x="' + p[0] + '" y="' + (p[1] + r + 12) + '" text-anchor="middle" font-size="10" fill="var(--text-2)">' + esc(s.nama.split(' ')[0].substr(0, 10)) + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Sosiogram kelas" style="max-width:620px;display:block;margin:0 auto">' + h + '</svg>';
}
const KAT_WARNA = { Tinggi: '#EF4444', Sedang: '#F59E0B', Rendah: '#10B981' };
const TAFSIR_LABEL = { kebutuhan: 'Skor tinggi = makin perlu layanan', kekuatan: 'Skor tinggi = makin baik', dominan: 'Kelompok tertinggi = kecenderungan murid' };
/** Warna kategori sesuai cara membaca: pada "kekuatan", kategori Rendah yang perlu perhatian. */
function katWarna(k, tafsir, tipe) {
  if (tafsir === 'dominan' && tipe === 'skala') return k === 'Tinggi' ? '#4F46E5' : k === 'Sedang' ? '#818CF8' : '#C7D2FE';
  if (tafsir === 'kekuatan' && tipe === 'skala') return k === 'Tinggi' ? '#10B981' : k === 'Sedang' ? '#F59E0B' : '#EF4444';
  return KAT_WARNA[k] || '#94A3B8';
}
function katBar(kat, tafsir, tipe) {
  const tot = (kat.Tinggi || 0) + (kat.Sedang || 0) + (kat.Rendah || 0) || 1;
  return '<div class="katbar" role="img" aria-label="Tinggi ' + (kat.Tinggi || 0) + ', Sedang ' + (kat.Sedang || 0) + ', Rendah ' + (kat.Rendah || 0) + '">' + ['Tinggi', 'Sedang', 'Rendah'].map(function (k) {
    const n = kat[k] || 0; return n ? '<i style="width:' + (n * 100 / tot) + '%;background:' + katWarna(k, tafsir, tipe) + '" title="' + k + ': ' + n + ' murid">' + n + '</i>' : '';
  }).join('') + '</div>';
}
/** Kartu-kartu ringkasan hasil (dipakai halaman Hasil, profil kelas wali, dan cetak rekap). */
function inRingkasHtml(d, opt) {
  opt = opt || {};
  let h = '';
  if (d.ditandai) h += '<div class="note rose mb-16"><i class="bi bi-flag"></i><div><b>' + d.ditandai + ' murid meminta bertemu Guru BK secepatnya.</b> Lihat tab Hasil per murid (ditandai ⚑, tampil paling atas).</div></div>';
  if (d.dominan && d.dominan.length) {
    h += '<div class="card mb-16"><div class="card-head"><h3>Kecenderungan dominan</h3><span class="xs muted">% murid per kelompok tertinggi</span></div><div class="card-body">' +
      d.dominan.map(function (x) { return hbar(x.kelompok, x.persen, x.persen + '% (' + x.jumlah + ')', 'var(--indigo)') + '<div class="xs muted mb-8">' + esc(x.rekom) + '</div>'; }).join('') + '</div></div>';
  }
  if (d.kelompok && d.kelompok.length) {
    const tf = d.tafsir, tp = d.kelompok[0].tipe;
    h += '<div class="card mb-16"><div class="card-head" style="flex-wrap:wrap"><div><h3>Per aspek / bidang</h3><div class="xs muted">' + (tp === 'masalah' ? 'rata-rata % murid yang mencentang' : 'rata-rata skor (% skala) · ' + esc(TAFSIR_LABEL[tf] || '')) + '</div></div>' +
      '<div class="row wrap xs" style="gap:10px">' + ['Tinggi', 'Sedang', 'Rendah'].map(function (k) { return '<span><i class="lgd" style="background:' + katWarna(k, tf, tp) + '"></i>' + k + '</span>'; }).join('') + '</div></div><div class="card-body">' +
      d.kelompok.slice().sort(function (a, b) { return tf === 'kekuatan' && a.tipe === 'skala' ? a.rata - b.rata : b.rata - a.rata; }).map(function (g) {
        return '<div class="asp"><div class="row between"><b>' + esc(g.kelompok) + '</b><span class="xs muted">' + g.rata + '%</span></div>' + (g.kategori ? katBar(g.kategori, tf, g.tipe) : '<div class="bar"><i style="width:' + g.rata + '%"></i></div>') +
          (opt.rekom !== false && g.rekom ? '<div class="xs muted mt-4">' + esc(g.rekom) + '</div>' : '') + '</div>';
      }).join('') + '<div class="xs muted mt-8">Angka pada batang = jumlah murid per kategori (Tinggi/Sedang/Rendah).</div></div></div>';
  }
  return h;
}
function inHasil(id, tok, idKelas) {
  return apiC('instrumen.hasil', { id: id, id_kelas: idKelas || '' }).then(function (d) {
    if (stale(tok)) return;
    P.inh = d; P.inhId = id; P.inhKelas = idKelas || '';
    const filt = d.kelasOpsi && d.kelasOpsi.length > 1 ? '<select class="select" id="inh-kls" style="width:auto;min-height:38px" aria-label="Kelas"><option value="">Semua kelas</option>' + d.kelasOpsi.map(function (k) { return '<option value="' + esc(k.v) + '"' + (k.v === P.inhKelas ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select>' : '';
    const head = inBack() + pageHead(d.jenis + (d.kelasNama ? ' · ' + d.kelasNama : ''), d.judul, d.responden + ' dari ' + d.target + ' murid mengisi (' + d.persen + '%).',
      filt + '<button class="btn" data-act="in-cetak-rekap"><i class="bi bi-printer"></i> Cetak rekap' + (d.kelasNama ? ' kelas' : '') + '</button><button class="btn" data-act="in-csv"><i class="bi bi-filetype-csv"></i> CSV</button>' + (d.rinci ? '<button class="btn" data-act="in-ekspor"><i class="bi bi-table"></i> Data per murid</button>' : ''));
    let h = '';
    if (!d.rinci) h += '<div class="note info mb-16"><i class="bi bi-shield-check"></i><div>Tampilan agregat: nama murid dan jawaban isian tidak ditampilkan untuk peran ini.</div></div>';
    if (!d.responden) h += '<div class="card pad">' + empty('bi-clipboard-data', 'Belum ada jawaban', 'Hasil akan muncul setelah murid mengisi.') + '</div>';
    else {
      h += inRingkasHtml(d);
      h += '<div class="grid g-2 eq"><div class="card"><div class="card-head"><h3>Partisipasi per kelas</h3></div><div class="card-body">' + d.perKelas.map(function (k) { return hbar(k.kelas, k.target ? k.responden * 100 / k.target : 0, k.responden + '/' + k.target, 'var(--teal)'); }).join('') + '</div></div>';
      if (d.peringkat.length) h += '<div class="card"><div class="card-head"><h3>10 teratas</h3><span class="xs muted">' + (d.peringkat[0].satuan === '%' ? 'masalah yang paling banyak dicentang' : d.tafsir === 'kekuatan' ? 'skor terendah (perlu ditingkatkan)' : d.tafsir === 'dominan' ? 'pernyataan paling sesuai' : 'kebutuhan tertinggi (rata-rata skala)') + '</span></div><div class="card-body">' + d.peringkat.map(function (x, i) { return hbar((i + 1) + '. ' + x.teks, x.satuan === '%' ? x.nilai : x.nilai * 25, x.nilai + x.satuan, 'var(--amber)', x.kelompok); }).join('') + '</div></div>';
      else h += '<div></div>';
      h += '</div>';
      if (d.distribusiMasalah) {
        h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Sebaran jumlah masalah per murid</h3></div><div class="card-body"><div class="chart-box sm"><canvas id="ch-dm"></canvas></div></div></div>';
        h += '<div class="card"><div class="card-head"><h3>Murid yang perlu perhatian</h3><span class="xs muted">paling banyak mencentang masalah</span></div>' + (d.perhatian ? (d.perhatian.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Murid</th><th>Kelas</th><th style="text-align:right">Masalah</th><th></th></tr></thead><tbody>' + d.perhatian.map(function (x) {
          return '<tr><td class="fw6">' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td style="text-align:right"><b>' + x.jumlah + '</b></td><td style="text-align:right"><button class="btn sm" data-act="in-detail" data-id="' + esc(id) + '" data-m="' + esc(x.id) + '">Jawaban</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card-body muted">Tidak ada murid yang mencentang masalah.</div>') : '<div class="card-body muted">Hanya Guru BK yang dapat melihat nama murid.</div>') + '</div></div>';
      }
      if (d.sosio) {
        const s = d.sosio;
        h += '<div class="grid g-kpi k4 mt-16">' + [['teal', 'bi-stars', 'Populer', s.populer, 'banyak dipilih'], ['amber', 'bi-person-x', 'Terisolir', s.terisolir, 'tidak dipilih siapa pun'], ['rose', 'bi-x-octagon', 'Ditolak', s.ditolak, 'banyak ditolak'], ['indigo', 'bi-arrow-left-right', 'Pasangan timbal balik', s.pasanganTimbal, 'saling memilih']].map(function (x) {
          return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
        }).join('') + '</div>';
        if (s.catatan) h += '<div class="note mt-12"><i class="bi bi-exclamation-triangle"></i><div>' + esc(s.catatan) + '</div></div>';
        if (s.siswa) {
          h += '<div class="grid g-2 eq mt-16"><div class="card"><div class="card-head"><h3>Sosiogram</h3><span class="xs muted">garis tebal = saling memilih · warna: <b style="color:#0D9488">populer</b>, <b style="color:#F59E0B">terisolir</b>, <b style="color:#EF4444">ditolak</b></span></div><div class="card-body">' + sociogramSvg(s.siswa, s.edges) + '</div></div>' +
            '<div class="card"><div class="card-head"><h3>Peringkat penerimaan</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Murid</th><th style="text-align:right">Dipilih</th><th style="text-align:right">Ditolak</th><th>Kategori</th></tr></thead><tbody>' + s.siswa.map(function (x) {
              return '<tr><td class="fw6">' + esc(x.nama) + (x.sudahIsi ? '' : ' <span class="xs muted">(belum mengisi)</span>') + '</td><td style="text-align:right">' + x.dipilih + '</td><td style="text-align:right">' + x.ditolak + '</td><td>' + (x.tag.length ? x.tag.map(function (t) { return '<span class="chip ' + (t === 'Populer' ? 'st-Dipantau' : t === 'Ditolak' ? 'st-Eskalasi' : 'st-Baru') + '">' + esc(t) + '</span>'; }).join(' ') : '<span class="muted">—</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div></div></div>';
        }
      }
      const rinc = d.butir.filter(function (b) { return b.tipe === 'skala' || b.tipe === 'pilihan' || b.tipe === 'banyak' || b.tipe === 'isian'; });
      if (rinc.length) {
        h += '<details class="card mt-16 rinc"><summary class="card-head" style="cursor:pointer"><h3>Rincian per butir (' + rinc.length + ')</h3><span class="xs muted">ketuk untuk membuka</span></summary><div class="card-body col gap-16">' + rinc.map(function (b) {
          if (b.tipe === 'isian') return '<div><div class="fw6">' + esc(b.teks) + '</div><div class="xs muted">' + b.jumlah + ' jawaban</div>' + (b.jawaban ? '<ul class="mt-8" style="padding-left:18px">' + b.jawaban.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
          const tot = b.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1;
          return '<div><div class="fw6">' + esc(b.teks) + (b.tipe === 'skala' ? ' <span class="chip neutral">rata-rata ' + b.rata + '</span>' : '') + '</div>' + b.sebaran.map(function (x) { return hbar(x.label, x.jumlah * 100 / tot, x.jumlah, 'var(--indigo)'); }).join('') + '</div>';
        }).join('') + '</div></details>';
      }
    }
    $('#app-container').innerHTML = head + (d.rinci && d.responden ? '<div class="tabs mb-16" id="inh-tabs"><button class="tab active" data-act="inh-tab" data-t="sum"><i class="bi bi-bar-chart"></i> Ringkasan</button><button class="tab" data-act="inh-tab" data-t="pm"><i class="bi bi-person-lines-fill"></i> Hasil per murid</button><button class="tab" data-act="inh-tab" data-t="kb"><i class="bi bi-people"></i> Kelompok kebutuhan</button></div>' : '') +
      '<div id="inh-sum">' + h + '</div><div id="inh-pm" class="hide"></div><div id="inh-kb" class="hide"></div>';
    const sel = $('#inh-kls'); if (sel) sel.addEventListener('change', function (e) { inHasil(id, S.navTok, e.target.value); });
    if (d.distribusiMasalah) chart('ch-dm', { kind: 'bar', labels: d.distribusiMasalah.map(function (x) { return x.label; }), data: d.distribusiMasalah.map(function (x) { return x.jumlah; }), color: '#4F46E5', label: 'Sebaran jumlah masalah' });
  });
}
ACT['inh-tab'] = function (el) {
  $$('#inh-tabs .tab').forEach(function (b) { b.classList.toggle('active', b === el); });
  const t = el.dataset.t;
  ['sum', 'pm', 'kb'].forEach(function (k) { $('#inh-' + k).classList.toggle('hide', k !== t); });
  if ((t === 'pm' || t === 'kb') && !$('#inh-pm').dataset.ok) inPerMurid(t);
  else if (t === 'kb') inKelompokDraw();
};
function inPerMurid(tab) {
  const box = $('#inh-pm'), kb = $('#inh-kb'); box.innerHTML = skeleton(3); kb.innerHTML = skeleton(2);
  apiC('instrumen.perMurid', { id: P.inhId, id_kelas: P.inhKelas || '' }).then(function (d) {
    P.inpm = d; box.dataset.ok = '1';
    const rata = d.tipeSkor !== 'jumlah', tf = d.tafsir;
    const skorLbl = rata ? 'rata-rata skala; warna = kategori' : 'jumlah masalah dicentang';
    const kelasCetak = P.inhKelas || (d.kelasOpsi.length === 1 ? d.kelasOpsi[0].v : '');
    box.innerHTML = '<div class="card"><div class="card-head" style="flex-wrap:wrap;gap:8px"><div><h3>Hasil per murid</h3><div class="xs muted">' + (d.kelompok.length ? 'Angka per aspek = ' + skorLbl + '. ' : '') + 'Murid yang perlu ditindaklanjuti tampil paling atas.</div></div>' +
      '<div class="row wrap" style="gap:8px"><div class="search" style="max-width:220px"><i class="bi bi-search"></i><input id="pm-q" type="search" placeholder="Cari murid…"></div>' +
      '<button class="btn" data-act="in-cetak-semua" data-k="' + esc(kelasCetak) + '"' + (kelasCetak ? '' : ' disabled title="Pilih satu kelas di atas untuk mencetak sekaligus"') + '><i class="bi bi-printer"></i> Cetak profil ' + (kelasCetak ? 'sekelas' : '(pilih kelas)') + '</button></div></div>' +
      '<div class="tbl-wrap mt-12"><table class="tbl" id="pm-tbl"><thead><tr><th>Murid</th><th>Kelas</th>' + d.kelompok.map(function (k) { return '<th style="text-align:center">' + esc(k) + '</th>'; }).join('') + (tf === 'dominan' && rata ? '<th>Dominan</th>' : '') + '<th>Ringkasan</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      d.rows.map(function (r) {
        const maxv = rata ? 4 : 10;
        return '<tr data-q="' + esc((r.nama + ' ' + r.nis + ' ' + r.kelas).toLowerCase()) + '"' + (r.flag ? ' class="pm-flag"' : '') + '><td class="fw6 click" data-act="in-detail" data-id="' + esc(P.inhId) + '" data-m="' + esc(r.id_murid) + '" style="cursor:pointer">' + (r.flag ? '<span title="' + esc(r.flag) + '">⚑ </span>' : '') + esc(r.nama) + '<div class="xs muted">NIS ' + esc(r.nis) + (r.sumber === 'guru' ? ' · input guru' : '') + '</div></td><td>' + esc(r.kelas) + '</td>' +
          d.kelompok.map(function (k) {
            const v = r.skor[k], kt = r.kategori[k];
            if (v === undefined) return '<td style="text-align:center">–</td>';
            const sty = kt && kt !== '-' ? 'background:' + katWarna(kt, tf, rata ? 'skala' : 'masalah') + '22;color:' + katWarna(kt, tf, rata ? 'skala' : 'masalah') : '--t:' + Math.min(1, v / maxv).toFixed(2);
            return '<td style="text-align:center"><span class="skor" style="' + sty + '" title="' + esc(kt || '') + '">' + v + '</span></td>';
          }).join('') +
          (tf === 'dominan' && rata ? '<td><b>' + esc(r.dominan || '-') + '</b></td>' : '') +
          '<td class="xs muted-2" style="min-width:200px">' + esc(r.ringkas) + (r.tag && r.tag.length ? ' ' + r.tag.map(function (t) { return '<span class="chip ' + (t === 'Populer' ? 'st-Dipantau' : t === 'Ditolak' ? 'st-Eskalasi' : 'st-Baru') + '">' + esc(t) + '</span>'; }).join(' ') : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="in-detail" data-id="' + esc(P.inhId) + '" data-m="' + esc(r.id_murid) + '">Profil</button> <button class="btn sm primary" data-act="in-layanan" data-id="' + esc(r.id_murid) + '" data-n="' + esc(r.nama) + '" data-k="' + esc(r.kelas) + '">Tindak lanjuti</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    $('#pm-q').addEventListener('input', function (e) { const q = e.target.value.trim().toLowerCase(); $$('#pm-tbl tbody tr').forEach(function (tr) { tr.classList.toggle('hide', q && tr.dataset.q.indexOf(q) < 0); }); });
    inKelompokDraw();
  }).catch(function (e) { box.innerHTML = errBox(e); kb.innerHTML = errBox(e); });
}
const BIDANG_INS = { 'Gaya Belajar': 'Belajar', 'Kebiasaan Belajar': 'Belajar', 'Minat & Karier': 'Karier' };
function inKelompokDraw() {
  const d = P.inpm, kb = $('#inh-kb'); if (!d || !kb) return;
  const dom = d.tafsir === 'dominan' && d.tipeSkor !== 'jumlah';
  kb.innerHTML = '<div class="note info mb-16"><i class="bi bi-people"></i><div>' + (dom ? 'Murid dikelompokkan menurut kecenderungan dominan. Cocok untuk pembagian kelompok belajar atau bimbingan kelompok sesuai gaya/minat.' : 'Murid dikelompokkan menurut aspek yang perlu ditindaklanjuti (kategori ' + (d.tafsir === 'kekuatan' && d.tipeSkor !== 'jumlah' ? 'Rendah' : 'Tinggi') + '). Satu murid bisa masuk lebih dari satu kelompok.') + ' Ketuk <b>Catat bimbingan kelompok</b> untuk langsung mencatat layanan dengan peserta terisi.</div></div>' +
    (d.kelompokButuh.length ? '<div class="grid g-2">' + d.kelompokButuh.map(function (g, i) {
      return '<div class="card pad"><div class="row between wrap"><h3>' + esc(g.kelompok) + '</h3><span class="chip neutral">' + g.murid.length + ' murid</span></div><div class="xs muted mt-4">' + esc(g.rekom) + '</div>' +
        '<div class="row wrap mt-12" style="gap:6px">' + g.murid.slice(0, 40).map(function (m) { return '<span class="chip blue">' + esc(m.nama) + ' <span class="muted">· ' + esc(m.kelas) + '</span></span>'; }).join('') + (g.murid.length > 40 ? '<span class="xs muted">+' + (g.murid.length - 40) + ' lainnya</span>' : '') + '</div>' +
        '<div class="row wrap mt-12"><button class="btn sm primary" data-act="in-kel-layanan" data-i="' + i + '"><i class="bi bi-people"></i> Catat bimbingan kelompok</button></div></div>';
    }).join('') + '</div>' : '<div class="card pad">' + empty('bi-emoji-smile', 'Tidak ada kelompok kebutuhan', 'Belum ada murid dengan aspek yang perlu ditindaklanjuti.') + '</div>');
}
ACT['in-kel-layanan'] = function (el) {
  const d = P.inpm, g = d.kelompokButuh[+el.dataset.i];
  const bid = BIDANG_INS[d.jenis] || (['Pribadi', 'Sosial', 'Belajar', 'Karier'].indexOf(g.kelompok) >= 0 ? g.kelompok : 'Pribadi');
  closeAllOverlays();
  navigateTo('layanan', { peserta: g.murid.slice(0, 40).map(function (m) { return { id: m.id, nama: m.nama, kelas: m.kelas }; }), sasaran: 'Kelompok', jenis: 'Bimbingan Kelompok', komponen: 'Layanan Dasar', bidang: bid, topik: (d.tafsir === 'dominan' ? 'Strategi belajar/karier: ' : '') + g.kelompok, sumber: 'Hasil instrumen/asesmen' });
};
// ── Cetak: profil per murid, sekelas sekaligus, rekap kelas ──
function profilCetakHtml(x, judul, jenis, tafsir) {
  const p = x.profil || { kelompok: [], rekom: [] };
  const masalah = p.kelompok.some(function (g) { return g.tipe === 'masalah'; });
  return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">PROFIL HASIL ' + esc(String(jenis || '').toUpperCase()) + '</h2><div class="pr-sub">' + esc(judul) + '</div>' +
    '<table class="pr-tbl"><tbody><tr><td style="width:28%">Nama murid</td><td><b>' + esc(x.murid.nama) + '</b></td></tr><tr><td>NIS / Kelas</td><td>' + esc(x.murid.nis || '-') + ' / ' + esc(x.murid.kelas) + '</td></tr><tr><td>Tanggal pengisian</td><td>' + esc(fTgl(String(x.ts || '').substr(0, 10))) + '</td></tr>' +
    (p.dominan ? '<tr><td>Kecenderungan dominan</td><td><b>' + esc(p.dominan) + '</b></td></tr>' : '') + (p.flag ? '<tr><td>Catatan khusus</td><td><b>' + esc(p.flag) + '</b></td></tr>' : '') + '</tbody></table>' +
    (p.kelompok.length ? '<table class="pr-tbl"><thead><tr><th>Aspek / bidang</th><th>' + (masalah ? 'Masalah dicentang' : 'Skor rata-rata') + '</th><th>Persentase</th><th>Kategori</th></tr></thead><tbody>' + p.kelompok.map(function (g) {
      return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + (g.nilai === null ? '-' : g.tipe === 'masalah' ? g.nilai + ' dari ' + g.dari : String(g.nilai).replace('.', ',') + ' (1–' + g.dari + ')') + '</td><td style="text-align:center">' + (g.persen === null ? '-' : g.persen + '%') + '</td><td style="text-align:center">' + esc(g.kategori) + '</td></tr>';
    }).join('') + '</tbody></table>' : '') +
    '<div style="margin:6px 0"><b>Ringkasan:</b> ' + esc(x.ringkas || '') + '</div>' +
    '<div style="margin-top:6px"><b>Rekomendasi tindak lanjut</b>' + (p.rekom.length ? '<ol style="margin:4px 0 0 18px;padding:0">' + p.rekom.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' : '<div>Belum ada aspek yang perlu ditindaklanjuti secara khusus; lanjutkan layanan dasar.</div>') + '</div>' +
    '<div class="xs" style="margin-top:6px;font-size:8.5pt">Cara membaca: ' + esc(TAFSIR_LABEL[tafsir] || '') + '. Hasil instrumen bersifat skrining awal, bukan diagnosis; tafsirkan bersama data lain.</div>' +
    ttdCetak(ttdKepsek(), ttdOrang('Guru BK,', S.user.nama, S.user.nip)) +
    '<div class="pr-foot">Dokumen rahasia BK · dicetak dari SIKOLAB BK · ' + esc(fTgl(ymd(new Date()))) + '</div></div>';
}
ACT['in-profil-print'] = function () {
  const d = P.injd; if (!d) return;
  siapKop().then(function () { cetakHtml(profilCetakHtml(d, d.judul, d.jenis, d.tafsir), { judul: 'Profil ' + d.murid.nama, ket: 'Profil hasil instrumen · A4 tegak' }); });
};
ACT['in-cetak-semua'] = function (el) {
  const k = el.dataset.k; if (!k) return;
  run(el, Promise.all([api('instrumen.cetakProfil', { id: P.inhId, id_kelas: k }), siapKop()])).then(function (r) {
    const d = r[0];
    if (!d.rows.length) { toast('Belum ada murid kelas ini yang mengisi.', 'warn'); return; }
    cetakHtml(d.rows.map(function (x) { return profilCetakHtml(x, d.judul, d.jenis, d.tafsir); }).join(''), { judul: 'Profil ' + d.rows.length + ' murid · ' + d.kelas, ket: 'Satu halaman per murid · A4 tegak' });
  }).catch(fail);
};
ACT['in-cetak-rekap'] = function () { if (P.inh) cetakRekapIns(P.inh, hasRole('guru_bk') ? ttdOrang('Guru BK,', S.user.nama, S.user.nip) : ''); };
function cetakRekapIns(d, kanan) {
  siapKop().then(function () {
    const tf = d.tafsir;
    let h = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">REKAPITULASI HASIL ' + esc(String(d.jenis).toUpperCase()) + '</h2><div class="pr-sub">' + esc(d.judul) + ' · ' + esc(d.kelasNama || 'Semua kelas') + ' · ' + d.responden + ' dari ' + d.target + ' murid (' + d.persen + '%)</div>';
    if (d.dominan && d.dominan.length) h += '<table class="pr-tbl"><thead><tr><th>Kecenderungan dominan</th><th>Jumlah murid</th><th>%</th><th>Saran pembelajaran / layanan</th></tr></thead><tbody>' + d.dominan.map(function (x) { return '<tr><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.jumlah + '</td><td style="text-align:center">' + x.persen + '%</td><td>' + esc(x.rekom) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (d.kelompok && d.kelompok.length) h += '<table class="pr-tbl"><thead><tr><th>Aspek / bidang</th><th>Rata-rata</th><th>Tinggi</th><th>Sedang</th><th>Rendah</th><th>Rekomendasi</th></tr></thead><tbody>' + d.kelompok.map(function (g) { const k = g.kategori || {}; return '<tr><td>' + esc(g.kelompok) + '</td><td style="text-align:center">' + g.rata + '%</td><td style="text-align:center">' + (k.Tinggi || 0) + '</td><td style="text-align:center">' + (k.Sedang || 0) + '</td><td style="text-align:center">' + (k.Rendah || 0) + '</td><td>' + esc(g.rekom || '') + '</td></tr>'; }).join('') + '</tbody></table><div style="font-size:8.5pt">Cara membaca: ' + esc(d.kelompok[0].tipe === 'masalah' ? 'persentase murid yang mencentang masalah; kategori Tinggi ≥ 40%' : (TAFSIR_LABEL[tf] || '')) + '. Kolom Tinggi/Sedang/Rendah = jumlah murid.</div>';
    if (d.peringkat && d.peringkat.length) h += '<table class="pr-tbl" style="margin-top:8px"><thead><tr><th>No</th><th>' + (d.peringkat[0].satuan === '%' ? 'Masalah paling banyak dicentang' : tf === 'kekuatan' ? 'Butir dengan skor terendah' : 'Butir dengan skor tertinggi') + '</th><th>Bidang</th><th>Nilai</th></tr></thead><tbody>' + d.peringkat.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.teks) + '</td><td>' + esc(x.kelompok) + '</td><td style="text-align:center">' + x.nilai + x.satuan + '</td></tr>'; }).join('') + '</tbody></table>';
    (d.pilihan || (d.butir || []).filter(function (b) { return b.tipe === 'pilihan'; })).forEach(function (b) { const tot = b.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1; h += '<table class="pr-tbl"><thead><tr><th colspan="3">' + esc(b.teks) + '</th></tr></thead><tbody>' + b.sebaran.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td style="text-align:center;width:18%">' + x.jumlah + '</td><td style="text-align:center;width:18%">' + Math.round(x.jumlah * 100 / tot) + '%</td></tr>'; }).join('') + '</tbody></table>'; });
    if (d.ditandai) h += '<p><b>Catatan:</b> ' + d.ditandai + ' murid meminta bertemu Guru BK secepatnya (nama tercantum pada lembar profil per murid).</p>';
    h += ttdCetak(ttdKepsek(), kanan || '') + '<div class="pr-foot">Rekap agregat tanpa nama murid · SIKOLAB BK · ' + esc(fTgl(ymd(new Date()))) + '</div></div>';
    cetakHtml(h, { judul: 'Rekap ' + d.judul, ket: 'Rekap hasil instrumen · A4 tegak' });
  });
}

// ── Profil kelas dari instrumen BK (untuk wali kelas; agregat tanpa nama) ──
function klsProfil(idKelas) {
  const box = $('#kls-profil'); if (!box) return;
  apiC('instrumen.profilKelas', { id_kelas: idKelas }).then(function (d) {
    const b = $('#kls-profil'); if (!b || P.ksKelas !== idKelas) return;
    P.klsPf = d;
    if (!d.rows.length) { b.innerHTML = ''; return; }
    b.innerHTML = '<div class="row between wrap mt-16 mb-8"><h3><i class="bi bi-clipboard-data"></i> Profil kelas dari instrumen BK</h3><span class="xs muted">Persentase per aspek tanpa nama murid; tampil bila minimal ' + d.minimal + ' murid mengisi.</span></div>' +
      '<div class="grid g-2">' + d.rows.map(function (r, i) {
        return '<div class="card pad"><div class="row between wrap" style="gap:6px"><span class="chip" style="background:var(--card-2);color:' + (JENIS_COL[r.jenis] || 'var(--text-3)') + '">' + esc(r.jenis) + '</span><span class="xs muted">' + r.responden + '/' + r.target + ' murid (' + r.persen + '%)</span></div><h3 class="mt-8" style="margin-top:8px">' + esc(r.judul) + '</h3>' +
          (r.cukup ? '<div class="mt-12">' + inRingkasHtml({ dominan: r.dominan, kelompok: r.kelompok, tafsir: r.tafsir }) +
            r.pilihan.map(function (p) { const tot = p.sebaran.reduce(function (a, x) { return a + x.jumlah; }, 0) || 1; return '<div class="fw6 mt-8">' + esc(p.teks) + '</div>' + p.sebaran.map(function (x) { return hbar(x.label, x.jumlah * 100 / tot, Math.round(x.jumlah * 100 / tot) + '%', 'var(--teal)'); }).join(''); }).join('') +
            '</div><div class="row wrap mt-8"><button class="btn sm" data-act="kls-pf-cetak" data-i="' + i + '"><i class="bi bi-printer"></i> Cetak</button></div>'
            : '<div class="note mt-12"><i class="bi bi-hourglass-split"></i><div>Baru ' + r.responden + ' murid mengisi. Profil kelas tampil setelah minimal ' + d.minimal + ' murid mengisi.</div></div>') + '</div>';
      }).join('') + '</div>';
  }).catch(function () { const b = $('#kls-profil'); if (b) b.innerHTML = ''; });
}
ACT['kls-pf-cetak'] = function (el) {
  const d = P.klsPf, r = d.rows[+el.dataset.i];
  cetakRekapIns(Object.assign({}, r, { kelasNama: 'Kelas ' + d.kelas, peringkat: r.peringkat || [], ditandai: 0 }), ttdOrang('Wali Kelas ' + esc(d.kelas) + ',', S.user.nama, S.user.nip));
};
/** Rincian jawaban satu murid pada satu instrumen (dipakai di Instrumen dan Garis Waktu Murid). */
ACT['in-detail'] = function (el) {
  apiC('instrumen.jawabDetail', { id: el.dataset.id, id_murid: el.dataset.m }).then(function (d) {
    P.injd = d;
    let last = null;
    const items = d.items.map(function (it) {
      let g = '';
      if (it.kelompok && it.kelompok !== last) { g = '<div class="jw-grp">' + esc(it.kelompok) + (d.skor[it.kelompok] !== undefined ? ' <span class="chip neutral">' + d.skor[it.kelompok] + '</span>' : '') + '</div>'; last = it.kelompok; }
      if (it.tipe === 'masalah') return g + '<div class="jw-row ' + (it.tanda ? 'on' : 'off') + '"><i class="bi ' + (it.tanda ? 'bi-check-circle-fill' : 'bi-dot') + '"></i><span>' + esc(it.teks) + '</span></div>';
      return g + '<div class="jw-row q"><div class="xs muted">' + it.no + '. ' + esc(it.teks) + '</div><div class="fw6">' + (it.jawaban ? esc(it.jawaban) : '<span class="muted">— tidak dijawab —</span>') + '</div></div>';
    }).join('');
    const nCek = d.items.filter(function (x) { return x.tanda; }).length;
    openModal({
      title: d.murid.nama, sub: d.judul + ' · ' + d.murid.kelas + ' · ' + fTs(d.ts) + (d.sumber === 'guru' ? ' · input Guru BK' : ''), size: 'lg',
      body: '<div class="note info"><i class="bi bi-clipboard-data"></i><div><b>Ringkasan:</b> ' + esc(d.ringkas) + '</div></div>' + inProfilHtml(d) +
        (d.items.some(function (x) { return x.tipe === 'masalah'; }) ? '<div class="fchips mt-12"><button class="fchip active" data-act="jw-filter" data-f="on">Hanya yang dicentang (' + nCek + ')</button><button class="fchip" data-act="jw-filter" data-f="all">Semua pernyataan</button></div>' : '') +
        '<div class="jw-list mt-12 only-on">' + items + '</div><p class="xs muted mt-12">Jawaban bersifat rahasia dan hanya untuk keperluan layanan BK.</p>',
      foot: '<button class="btn" data-close>Tutup</button><button class="btn" data-act="in-detail-print" title="Seluruh jawaban"><i class="bi bi-printer"></i> Cetak jawaban</button>' + (d.profil && d.profil.kelompok.length ? '<button class="btn" data-act="in-profil-print"><i class="bi bi-file-earmark-person"></i> Cetak profil</button>' : '') + '<button class="btn primary" data-act="in-layanan" data-id="' + esc(d.murid.id) + '" data-n="' + esc(d.murid.nama) + '" data-k="' + esc(d.murid.kelas) + '"><i class="bi bi-heart-pulse"></i> Tindak lanjuti</button>'
    });
  }).catch(fail);
};
function inProfilHtml(d) {
  const p = d.profil;
  if (!p || !p.kelompok.length) return '';
  const tp = p.kelompok[0].tipe;
  return '<div class="card pad mt-12"><div class="row between wrap"><b>Profil' + (p.dominan ? ': dominan ' + esc(p.dominan) : '') + '</b><span class="xs muted">' + esc(tp === 'masalah' ? 'jumlah masalah dicentang per bidang' : TAFSIR_LABEL[d.tafsir] || '') + '</span></div>' +
    '<div class="pf-grid mt-8">' + p.kelompok.map(function (g) {
      const w = katWarna(g.kategori, d.tafsir, g.tipe);
      return '<div class="pf-it"><div class="row between"><span>' + esc(g.kelompok) + '</span><b style="color:' + w + '">' + esc(g.kategori) + '</b></div><div class="bar"><i style="width:' + (g.persen || 0) + '%;background:' + w + '"></i></div><div class="xs muted">' + (g.nilai === null ? '-' : g.tipe === 'masalah' ? g.nilai + ' dari ' + g.dari : 'rata-rata ' + String(g.nilai).replace('.', ',') + ' (1–' + g.dari + ')') + '</div></div>';
    }).join('') + '</div>' +
    (p.rekom.length ? '<div class="mt-12"><b class="xs">Rekomendasi tindak lanjut</b><ul class="xs" style="margin:4px 0 0 18px;padding:0">' + p.rekom.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
}
ACT['jw-filter'] = function (el) {
  const wrap = el.closest('.m-body');
  $$('[data-act=jw-filter]', wrap).forEach(function (b) { b.classList.toggle('active', b === el); });
  $('.jw-list', wrap).classList.toggle('only-on', el.dataset.f === 'on');
};
ACT['in-detail-print'] = function (el) {
  const md = el.closest('.modal'); if (!md) return;
  const judul = $('.m-head h3', md).textContent, sub = ($('.m-head .xs', md) || {}).textContent || '';
  const isi = $('.m-body', md).cloneNode(true);
  $$('.fchips, button, .bi', isi).forEach(function (x) { x.remove(); });
  siapKop().then(function () {
    cetakHtml('<div class="pr-doc pr-jw">' + kopCetak({}) + '<h2 class="pr-title">' + esc(judul.toUpperCase()) + '</h2><div class="pr-sub">' + esc(sub) + '</div>' + isi.innerHTML +
      '<div class="pr-foot">Dokumen rahasia BK · dicetak dari SIKOLAB BK oleh ' + esc(S.user.nama) + ' · ' + esc(fTgl(ymd(new Date()))) + '</div></div>', { judul: judul, ket: 'Jawaban instrumen · A4 tegak' });
  });
};
ACT['in-layanan'] = function (el) {
  closeAllOverlays();
  navigateTo('layanan', { murid: { id: el.dataset.id, nama: el.dataset.n, kelas: el.dataset.k }, sumber: 'Hasil instrumen/asesmen' });
};
ACT['in-ekspor'] = function (el) {
  run(el, api('instrumen.ekspor', { id: P.inhId })).then(function (d) {
    const rows = [[d.judul], []].concat([d.header]).concat(d.rows);
    downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'per_murid_' + d.judul.replace(/[^A-Za-z0-9]+/g, '_').substr(0, 40) + '.csv');
    toast('Data per murid diunduh.');
  }).catch(fail);
};
ACT['in-csv'] = function () {
  const d = P.inh; if (!d) return;
  const rows = [[d.judul], ['Jenis', d.jenis], ['Responden', d.responden + '/' + d.target], [], ['Kelompok', 'Butir', 'Nilai', 'Satuan']];
  d.butir.forEach(function (b) {
    if (b.tipe === 'masalah') rows.push([b.kelompok, b.teks, b.persen, '% murid (' + b.jumlah + ')']);
    else if (b.tipe === 'skala') rows.push([b.kelompok, b.teks, b.rata, 'rata-rata 1-' + b.skalaMaks]);
    else if (b.sebaran) b.sebaran.forEach(function (x) { rows.push([b.kelompok, b.teks + ' — ' + x.label, x.jumlah, 'orang']); });
  });
  if (d.sosio && d.sosio.siswa) { rows.push([], ['Murid', 'Dipilih', 'Ditolak', 'Kategori']); d.sosio.siswa.forEach(function (x) { rows.push([x.nama, x.dipilih, x.ditolak, x.tag.join('; ')]); }); }
  downloadBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'hasil_' + d.jenis.replace(/\s+/g, '_') + '.csv');
  toast('CSV diunduh.');
};
