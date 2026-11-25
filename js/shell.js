/* SIKOLAB BK v1.15 — js/shell.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Autentikasi, shell, navigasi (router SPA)
// ════════════════════════════════════════════════════════════
const ACT = {};      // registri aksi data-act
const PAGES = {};    // registri halaman

function show(id, on) { $(id).classList.toggle('hide', !on); }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#08111F' : '#0A2A66';
  const b = $('#theme-btn'); if (b) b.innerHTML = '<i class="bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars') + '"></i>';
}
function initTheme() {
  let t = lstore('sk_theme');
  if (t !== 'dark' && t !== 'light') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  applyTheme(t);
}
ACT.theme = function () {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  lstore('sk_theme', t); applyTheme(t);
  if (S.page && S.user) navigateTo(S.page, S.params, true);
};

// ── Halaman masuk ──
/** Lambang aplikasi SIKOLAB BK (tertanam di Stylesheet, tanpa unduhan tambahan). */
function logoHtml() { return '<span class="logo-emblem" role="img" aria-label="Logo SIKOLAB BK"></span>'; }
function logoSekolah(cfg) { return cfg && cfg.logoUrl && /^(https:\/\/|data:image\/(png|jpeg);base64,)/i.test(cfg.logoUrl) ? '<img class="sch-logo" alt="" src="' + esc(cfg.logoUrl) + '" onerror="this.remove()">' : ''; }
const JURUS7 = ['Kenali Potensi', 'Kelola Emosi', 'Tumbuhkan Resiliensi', 'Jaga Konsistensi', 'Jalin Koneksi', 'Bangun Kolaborasi', 'Menata Situasi'];
// ── Kerangka halaman masuk: panel identitas (biru pendidikan + aksen emas) + panel formulir ──
function authLayout(inner, st) {
  st = st || {};
  show('#splash', false); show('#shell', false); show('#login-root', true);
  const thn = new Date().getFullYear();
  $('#login-root').innerHTML =
    '<div class="auth"><aside class="auth-brand">' +
      '<div class="ab-top"><span class="ab-pill"><i class="bi bi-shield-check"></i> Portal Layanan Bimbingan dan Konseling</span></div>' +
      '<div class="ab-mid"><div class="ab-logo"><span class="logo-full" role="img" aria-label="Logo SIKOLAB BK"></span></div>' +
        '<h1>Setiap murid berhak<br><span>dibimbing dan didengar.</span></h1>' +
        '<p class="ab-lead">Satu ruang kerja bagi guru mata pelajaran, wali kelas, dan Guru BK untuk mendampingi murid sejak dini: layanan untuk semua, kolaboratif, dan menjaga kerahasiaan.</p>' +
        '<div class="ab-jurus"><div class="ab-jurus-h"><i class="bi bi-stars"></i> Selaras dengan 7 Jurus BK Hebat</div><div class="ab-jurus-l">' + JURUS7.map(function (j, i) { return '<span><b>' + (i + 1) + '</b>' + esc(j) + '</span>'; }).join('') + '</div></div>' +
      '</div>' +
      '<div class="ab-foot"><div>' + logoSekolah(st) + (st.namaSekolah ? '<b>' + esc(st.namaSekolah) + '</b>' : '<b>SIKOLAB BK</b>') + '<span>' + (st.tahunAjaran ? 'Tahun Ajaran ' + esc(st.tahunAjaran) + ' · Semester ' + esc(st.semester || '') : 'Sistem Informasi Kolaborasi Bimbingan dan Konseling') + '</span></div><span class="ab-copy">© ' + thn + ' SIKOLAB BK</span></div>' +
    '</aside>' +
    '<main class="auth-main"><div class="auth-stripe" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<div class="auth-mobile-head"><span class="logo-full sm" role="img" aria-label="Logo SIKOLAB BK"></span><div><b>SIKOLAB BK</b><span>' + esc(st.namaSekolah || 'Sistem Informasi Kolaborasi Bimbingan dan Konseling') + '</span></div></div>' +
    '<div class="auth-card">' + inner + '</div>' +
    '<div class="auth-trust"><span><i class="bi bi-lock-fill"></i> Sambungan terenkripsi</span><span><i class="bi bi-person-check"></i> Akses sesuai peran</span><span><i class="bi bi-journal-check"></i> Setiap akses tercatat</span></div>' +
    '<p class="kredit">Dikembangkan oleh ' + PENGEMBANG + ' · ' + PENGEMBANG_SEKOLAH + '</p></main></div>';
}
function renderBelum() {
  authLayout('<div class="a-kicker">Pemberitahuan</div><h2>Aplikasi belum disiapkan</h2><p class="muted mt-8">Pemilik aplikasi perlu menyelesaikan pengaturan awal terlebih dahulu. Hubungi admin sekolah Anda.</p>' +
    '<div class="note info mt-16"><i class="bi bi-info-circle"></i><div class="xs">Bila Anda pemilik proyek tetapi halaman ini yang muncul, buka kembali alamat aplikasi dengan akun Google yang sama dengan yang memasang skrip, atau jalankan <code>setupAppEnvironment</code> dari editor Apps Script.</div></div>');
}
function renderSetup(st) {
  const now = new Date(), y = now.getFullYear(), gen = now.getMonth() >= 6;
  authLayout('<div class="a-kicker">Langkah pertama</div><h2>Pengaturan awal</h2><p class="muted mt-8" style="margin-top:4px">Anda masuk sebagai pemilik (<b>' + esc(st.ownerEmail) + '</b>). Isi data sekolah; semua dapat diubah nanti di menu Administrasi.</p>' +
    '<form id="setup-form" class="form-grid c2 mt-16" novalidate>' +
    '<div style="grid-column:1/-1">' + fld({ name: 'nama_sekolah', label: 'Nama sekolah', req: true, max: 120, ph: 'SMA Negeri 1 …' }) + '</div>' +
    fld({ name: 'kota', label: 'Kota / kabupaten', max: 60 }) + fld({ name: 'nama_admin', label: 'Nama Anda', max: 100, ph: 'Nama lengkap dengan gelar' }) +
    fld({ name: 'tahun_ajaran', label: 'Tahun ajaran', req: true, max: 9, value: gen ? y + '/' + (y + 1) : (y - 1) + '/' + y, hint: 'Format 2026/2027' }) +
    fld({ name: 'semester', label: 'Semester', type: 'select', value: gen ? 'Ganjil' : 'Genap', opts: ['Ganjil', 'Genap'] }) +
    '<div style="grid-column:1/-1" class="col gap-8">' +
    '<label class="check"><input type="checkbox" name="jugabk" checked> Saya juga Guru BK di sekolah ini</label>' +
    '<label class="check"><input type="checkbox" name="contoh"> Isi dengan data contoh untuk mencoba (dapat dihapus kapan saja)</label></div></form>' +
    '<div id="setup-err" class="note rose mt-12 hide" role="alert"></div>' +
    '<button class="btn dark block mt-16" id="setup-go" style="height:46px">Siapkan aplikasi</button>' +
    '<p class="xs muted mt-12">Proses ini membuat folder Drive, Spreadsheet basis data, akun admin Anda, serta pengingat dan cadangan harian. Memerlukan ± 20–40 detik.</p>', st);
  $('#setup-go').addEventListener('click', function (e) {
    const f = $('#setup-form'), d = formData(f);
    const ok = validate(f, d, { nama_sekolah: { label: 'Nama sekolah', req: true }, tahun_ajaran: { label: 'Tahun ajaran', req: true, re: /^\d{4}\/\d{4}$/, msg: 'Format 2026/2027.' } });
    if (!ok) return;
    $('#setup-err').classList.add('hide');
    const p = { nama_sekolah: d.nama_sekolah, kota: d.kota, nama_admin: d.nama_admin, tahun_ajaran: d.tahun_ajaran, semester: d.semester, bukan_bk: !f.querySelector('[name=jugabk]').checked, contoh: f.querySelector('[name=contoh]').checked };
    run(e.currentTarget, api('setup.run', p)).then(function (r) { setupSelesai(r); })
      .catch(function (err) { const b = $('#setup-err'); b.textContent = err.message; b.classList.remove('hide'); });
  });
}
function setupSelesai(r) {
  authLayout('<div class="a-kicker">Berhasil</div><h2>Aplikasi siap dipakai</h2><p class="muted mt-8" style="margin-top:4px">Catat akun admin Anda. <b>PIN hanya ditampilkan sekali ini.</b></p>' +
    '<div class="note info mt-16"><div style="width:100%"><div class="xs muted">Email</div><div class="fw6">' + esc(r.email) + '</div><div class="xs muted mt-8">PIN</div><div class="mono" style="font-size:28px;letter-spacing:6px">' + esc(r.pin || '—') + '</div></div></div>' +
    '<ul class="muted-2 xs" style="padding-left:18px;line-height:20px;margin-top:12px"><li>Anda akan diminta mengganti PIN awal ini saat masuk pertama. Ubah lagi kapan saja lewat Akun saya.</li><li>' + (r.trigger ? 'Pengingat dan cadangan harian sudah terpasang.' : 'Pengingat harian belum terpasang; pasang dari Administrasi → Pengaturan.') + '</li><li>' + (r.contoh ? 'Data contoh terisi. Hapus dari Administrasi → Pengaturan → Pemeliharaan sebelum dipakai sungguhan.' : 'Mulai isi kelas, pengguna, dan murid di menu Administrasi.') + '</li></ul>' +
    '<button class="btn dark block mt-16" id="setup-masuk" style="height:46px">Masuk sekarang</button>');
  $('#setup-masuk').addEventListener('click', function (e) {
    run(e.currentTarget, api('auth.login', { email: r.email, pin: r.pin })).then(function (t) {
      lstore('sk_ingat', '1'); lstore('sk_email_terakhir', r.email);
      S.token = t.token; sset('sk_token', t.token); sset('sk_manual', '1'); S.mode = '';
      if (t.boot) { show('#login-root', false); return terimaBoot(t.boot, null); }
      return startApp();
    }).catch(fail);
  });
}
function renderLogin(st) {
  if (st && st.state === 'setup') return renderSetup(st);
  if (st && st.state === 'belum') return renderBelum();
  const cfg = st || {};
  authLayout('<form id="login-form" novalidate><div class="a-kicker">Selamat datang</div><h2>Masuk ke akun Anda</h2><p class="muted mt-8" style="margin-top:4px">' + esc(cfg.namaSekolah || 'Gunakan email dan PIN yang diberikan admin sekolah.') + '</p>' +
    (st && st.state === 'denied' ? '<div class="note rose mt-16"><i class="bi bi-shield-exclamation"></i><div>Akun Google <b>' + esc(st.email) + '</b> belum terdaftar atau tidak aktif. Hubungi admin sekolah, atau masuk dengan email dan PIN di bawah.</div></div>' : '') +
    '<div class="form-grid mt-16">' +
    '<div class="field ifield" data-f="email"><label for="f_email">Email</label><div class="iwrap"><i class="bi bi-envelope"></i><input class="input" id="f_email" name="email" type="email" required autocomplete="username" placeholder="nama@sekolah.sch.id" inputmode="email"></div><div class="err" role="alert"></div></div>' +
    '<div class="field ifield" data-f="pin"><label for="f_pin">PIN 6 digit</label><div class="iwrap"><i class="bi bi-key"></i><input class="input" id="f_pin" name="pin" type="password" required maxlength="6" inputmode="numeric" autocomplete="current-password" placeholder="••••••"><button type="button" class="eye" data-act="pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div><div class="err" role="alert"></div></div>' +
    '</div><label class="check mt-12"><input type="checkbox" name="ingat"' + (lstore('sk_ingat') === '0' ? '' : ' checked') + '> Ingat saya di perangkat ini (30 hari)</label><div class="xs muted" style="margin:2px 0 0 26px">Jangan dicentang di komputer bersama.</div>' +
    '<div id="login-err" class="note rose mt-12 hide" role="alert"></div>' +
    '<button class="btn primary block mt-16 btn-login" type="submit">Masuk <i class="bi bi-arrow-right"></i></button>' +
    '<p class="xs muted mt-16" style="text-align:center">Lupa PIN? Hubungi admin sekolah untuk mengatur ulang.</p></form>', st);
  const f = $('#login-form');
  const terakhir = lstore('sk_email_terakhir');
  if (terakhir) { $('[name=email]', f).value = terakhir; setTimeout(function () { try { $('[name=pin]', f).focus(); } catch (x) { } }, 60); }
  // PIN 6 digit lengkap → langsung masuk (tanpa harus menekan tombol)
  $('[name=pin]', f).addEventListener('input', function (e) { if (/^\d{6}$/.test(e.target.value) && /\S+@\S+\.\S+/.test($('[name=email]', f).value) && !$('button[type=submit]', f).classList.contains('loading')) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit')); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    const d = formData(f);
    d.email = d.email.trim().toLowerCase();
    const ingat = $('[name=ingat]', f).checked;
    const ok = validate(f, d, { email: { label: 'Email', req: true, re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Format email tidak valid.' }, pin: { label: 'PIN', req: true, re: /^\d{6}$/, msg: 'PIN harus 6 digit angka.' } });
    if (!ok) return;
    const btn = $('button[type=submit]', f);
    $('#login-err').classList.add('hide');
    lstore('sk_ingat', ingat ? '1' : '0');
    run(btn, api('auth.login', { email: d.email, pin: d.pin, ingat: ingat, mode: lstore('sk_mode_' + d.email) || '' })).then(function (r) {
      lstore('sk_email_terakhir', d.email);
      S.token = r.token; sset('sk_token', r.token); sset('sk_manual', '1'); S.mode = '';
      // Login sekali jalan: data awal aplikasi sudah ikut dalam jawaban login.
      if (r.boot) { show('#login-root', false); return terimaBoot(r.boot, null); }
      return startApp();
    }).catch(function (err) { const b = $('#login-err'); b.textContent = err.message; b.classList.remove('hide'); $('[name=pin]', f).value = ''; $('[name=pin]', f).focus(); });
  });
}
ACT['pin-eye'] = function (el) {
  const i = $('input', el.parentElement), show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  el.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>';
  el.setAttribute('aria-label', show ? 'Sembunyikan PIN' : 'Tampilkan PIN');
};

// ── Pilihan peran (satu akun, beberapa peran) ──
const ROLE_ICON = { guru_mapel: 'bi-journal-text', wali_kelas: 'bi-people', guru_bk: 'bi-heart-pulse', waka: 'bi-shield-check', kepsek: 'bi-building', admin: 'bi-gear' };
function renderPilihPeran(b) {
  authLayout('<div class="a-kicker">Satu akun, beberapa peran</div><h2>Masuk sebagai apa?</h2><p class="muted mt-8" style="margin-top:4px">Halo, <b>' + esc(b.user.nama) + '</b>. Pilih peran untuk sesi ini. Anda dapat menggantinya kapan saja dari menu samping.</p>' +
    '<div class="role-pick mt-16">' + b.pilihanPeran.map(function (r) {
      return '<button class="role-opt" data-act="pilih-peran" data-role="' + esc(r.role) + '"><span class="ro-ic"><i class="bi ' + (ROLE_ICON[r.role] || 'bi-person') + '"></i></span><span class="ro-tx"><b>' + esc(r.label) + '</b><span>' + esc(r.ket) + '</span></span><i class="bi bi-chevron-right ro-go"></i></button>';
    }).join('') + '</div>' +
    '<button class="btn ghost block mt-16" data-act="logout-langsung"><i class="bi bi-box-arrow-left"></i> Bukan Anda? Keluar</button>', b.config);
}
ACT['pilih-peran'] = function (el) {
  S.mode = el.dataset.role; sset('sk_mode', S.mode);
  if (S.email) { lstore('sk_mode_' + S.email, S.mode); sset('sk_email', S.email); }
  el.classList.add('loading');
  startApp(true).catch(fail);
};
ACT['ganti-peran'] = function () {
  ccClear(); S.mode = ''; sset('sk_mode', null); if (S.email) lhapus('sk_mode_' + S.email); closeAllOverlays(); killCharts();
  show('#shell', false);
  startApp().catch(fail);
};
ACT['logout-langsung'] = function () {
  ccClear();
  const tok = S.token;
  hapusSesiLokal(); sset('sk_manual', '1'); lstore('sk_manual', '1');
  S.user = null; S.token = ''; S.mode = '';
  tampilMasuk();
  if (tok) google.script.run.api(tok, 'auth.logout', {});
};

function sessionLost() {
  clearTimeout(CC_TMR); ccClear(); clearTimeout(CC_TMR);
  hapusSesiLokal();
  closeAllOverlays(); S.user = null; S.token = ''; S.mode = '';
  show('#shell', false);
  tampilMasuk('Sesi berakhir. Silakan masuk kembali.');
}
ACT.logout = function () {
  const antre = obMuat().length;
  confirmDlg(antre ? 'Masih ada ' + antre + ' data yang sedang dikirim ke server. Data itu tetap tersimpan di perangkat ini dan terkirim saat Anda masuk lagi dengan akun yang sama. Tetap keluar?' : 'Keluar dari aplikasi?', 'Keluar', !!antre, 'Keluar').then(function (ok) {
    if (!ok) return;
    ccClear(); clearTimeout(CC_TMR);
    const tok = S.token;
    hapusSesiLokal(); sset('sk_manual', '1'); lstore('sk_manual', '1');
    S.user = null; S.token = ''; S.mode = ''; closeAllOverlays(); killCharts();
    show('#shell', false);
    tampilMasuk();
    // Keluar dari server di latar belakang (layar masuk sudah tampil).
    if (tok) google.script.run.api(tok, 'auth.logout', {});
  });
};

// ── Shell ──
function renderShell() {
  const u = S.user, cfg = S.cfg;
  const lapor = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk']);
  const cari = hasAny(['guru_mapel', 'wali_kelas', 'guru_bk', 'waka', 'admin']);
  $('#sidebar').innerHTML =
    '<div class="sb-brand"><div class="logo">' + logoHtml(cfg) + '</div><div><b>SIKOLAB BK</b><span>Kolaborasi Bimbingan</span></div></div>' +
    '<div class="sb-school">' + logoSekolah(cfg) + '<div><b>' + esc(cfg.namaSekolah) + '</b><div class="xs">Semester ' + esc(cfg.semester) + ' ' + esc(cfg.tahunAjaran) + '</div></div></div>' +
    '<nav class="sb-nav"><div class="lbl">Menu utama</div>' + S.menu.map(function (m) {
      return '<button class="nav-item" data-act="nav" data-page="' + esc(m.id) + '" title="' + esc(m.label) + '"><i class="bi ' + esc(m.icon) + '"></i><span>' + esc(m.label) + '</span>' + (m.badge ? '<em class="badge-r" style="font-style:normal">' + esc(m.badge) + '</em>' : '') + '</button>';
    }).join('') + '</nav>' +
    '<div class="sb-foot"><div class="role-card"><div class="avatar">' + esc(u.inisial) + '</div><div class="grow"><b class="trunc">' + esc(u.nama) + '</b><span>' + esc(u.peran.join(' · ')) + '</span></div></div>' +
    '<button class="nav-item mt-8" data-act="akun" title="Akun saya"><i class="bi bi-person-gear"></i><span>Akun saya</span></button>' + (u.allRoles && u.allRoles.length > 1 ? '<button class="nav-item mt-8" data-act="ganti-peran" title="Ganti peran"><i class="bi bi-arrow-left-right"></i><span>Ganti peran</span></button>' : '') + '<button class="nav-item mt-8" data-act="logout" title="Keluar"><i class="bi bi-box-arrow-right"></i><span>Keluar</span></button><div class="kredit sb-kredit" title="Dikembangkan oleh ' + PENGEMBANG + ', ' + PENGEMBANG_SEKOLAH + '">SIKOLAB BK v' + VERSI_APP + ' · © ' + PENGEMBANG + '</div></div>';
  $('#topbar').innerHTML =
    '<button class="icon-btn" id="burger" data-act="sidebar" aria-label="Buka menu"><i class="bi bi-list"></i></button>' +
    (cari ? '<div class="search"><i class="bi bi-search"></i><input id="gsearch" type="search" placeholder="' + (window.innerWidth < 600 ? 'Cari murid…' : 'Cari murid (nama atau NIS)…') + '" autocomplete="off" aria-label="Cari murid"><div class="search-res hide" id="gres"></div></div>' : '<div class="grow"></div>') +
    '<div class="grow"></div>' +
    '<span class="top-chip"><i class="bi bi-calendar3"></i>' + esc(cfg.semester) + ' ' + esc(cfg.tahunAjaran) + '</span>' +
    '<span class="jam-chip" id="jam-chip" title="Waktu sekarang (WIB)"></span>' +
    (lapor ? '<button class="btn primary only-md" data-act="nav" data-page="lapor"><i class="bi bi-plus-circle"></i> Lapor Kejadian</button>' : '') +
    '<button class="icon-btn" id="theme-btn" data-act="theme" aria-label="Ganti tema"></button>' +
    '<button class="icon-btn" id="bell" data-act="bell" aria-label="Notifikasi"><i class="bi bi-bell"></i><span class="dot hide" id="bell-dot"></span></button>' +
    '<div class="top-user" data-act="akun" style="cursor:pointer" title="Akun saya"><div class="avatar">' + esc(u.inisial) + '</div><div><b>' + esc(u.nama) + '</b><span>' + esc(u.peran[0]) + '</span></div></div>';
  jamTampil();
  // Bottom nav: 4 menu + tombol tengah (+)
  const items = S.menu.filter(function (m) { return m.id !== 'lapor' && m.id !== 'admin'; }).slice(0, 4);
  const bi = function (m) { return '<button class="bn-item" data-act="nav" data-page="' + esc(m.id) + '"><i class="bi ' + esc(m.icon) + '"></i><span>' + esc(m.label.split(' ')[0]) + '</span></button>'; };
  let bn = items.slice(0, 2).map(bi).join('');
  bn += lapor ? '<button class="bn-fab" data-act="nav" data-page="lapor" aria-label="Lapor kejadian"><i class="bi bi-plus-lg"></i></button>' : '';
  bn += items.slice(2).map(bi).join('');
  bn += '<button class="bn-item" data-act="sidebar"><i class="bi bi-list"></i><span>Menu</span></button>';
  $('#bottom-nav').innerHTML = bn;
  applyTheme(document.documentElement.getAttribute('data-theme'));
  const gs = $('#gsearch');
  if (gs) {
    gs.addEventListener('input', debounce(function () { globalSearch(gs.value.trim()); }, 260));
    gs.addEventListener('focus', function () { if (gs.value.trim().length >= 2) globalSearch(gs.value.trim()); });
  }
}
ACT.sidebar = function () { $('#sidebar').classList.toggle('open'); $('#scrim').classList.toggle('on', $('#sidebar').classList.contains('open')); };
$('#scrim').addEventListener('click', function () { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); });
function setNavActive(page) {
  $$('.nav-item[data-page]').forEach(function (b) { b.classList.toggle('active', b.dataset.page === page); });
  $$('.bn-item[data-page]').forEach(function (b) { b.classList.toggle('active', b.dataset.page === page); });
}

// ── Pencarian global ──
function globalSearch(q) {
  const box = $('#gres'); if (!box) return;
  if (q.length < 2) { box.classList.add('hide'); return; }
  apiC('murid.cari', { q: q }).then(function (rows) {
    box.classList.remove('hide');
    box.innerHTML = rows.length ? rows.slice(0, 8).map(function (m) {
      return '<button data-act="open-murid" data-id="' + esc(m.id) + '"><div class="avatar" style="width:32px;height:32px;font-size:11px">' + esc(initials(m.nama)) + '</div><div class="grow"><div class="fw6">' + esc(m.nama) + '</div><div class="xs muted">NIS ' + esc(m.nis) + ' · ' + esc(m.kelas) + '</div></div>' + (m.pola ? chipLevel(m.pola) : '') + '</button>';
    }).join('') : '<div class="empty xs" style="padding:16px">Tidak ada murid yang cocok.</div>';
  }).catch(function () { box.classList.add('hide'); });
}
ACT['open-murid'] = function (el) {
  const g = $('#gres'); if (g) g.classList.add('hide'); const gs = $('#gsearch'); if (gs) gs.value = '';
  navigateTo('riwayat', { id_murid: el.dataset.id });
};
document.addEventListener('click', function (e) {
  if (!e.target.closest('.search')) { const g = $('#gres'); if (g) g.classList.add('hide'); }
  if (!e.target.closest('.pop') && !e.target.closest('#bell')) closePop();
});

// ── Notifikasi ──
function closePop() { const p = $('#pop-notif'); if (p) p.remove(); }
function updateBell() {
  const d = $('#bell-dot'); if (!d) return;
  d.classList.toggle('hide', !S.notif.total); d.textContent = S.notif.total > 9 ? '9+' : S.notif.total;
}
function loadNotif() {
  if (!S.user || document.hidden) return;
  api('notif.get', {}, true).then(function (n) { S.notif = n; updateBell(); }).catch(function () { });
}
ACT.bell = function () {
  if ($('#pop-notif')) { closePop(); return; }
  const n = S.notif;
  const el = document.createElement('div'); el.className = 'pop'; el.id = 'pop-notif';
  el.innerHTML = notifHtml(n);
  $('#topbar').style.position = 'sticky'; $('#topbar').appendChild(el);
};
function notifHtml(n) {
  return '<div class="row between" style="padding:10px 14px;border-bottom:1px solid var(--border);gap:8px"><b class="fw7" style="font-family:var(--font-h)">Notifikasi</b>' +
    (n.adaDibaca ? '<button class="btn sm ghost" data-act="notif-baca" title="Pemberitahuan peristiwa tidak dihitung lagi. Tugas (mis. kasus dilimpahkan) tetap tampil sampai dikerjakan."><i class="bi bi-check2-all"></i> Tandai sudah dibaca</button>' : '<span class="xs muted">' + n.total + ' belum dibaca</span>') + '</div>' +
    (n.items.length ? n.items.map(function (x, i) {
      const ic = { monitoring: 'bi-alarm', rujukan: 'bi-inbox', pola: 'bi-exclamation-triangle', tahun: 'bi-calendar-event', harian: 'bi-calendar-check', kasus: 'bi-folder2-open', temu: 'bi-person-raised-hand', kapasitas: 'bi-database', limpah: 'bi-arrow-left-right', poin: 'bi-award' }[x.tipe] || 'bi-bell';
      return '<button class="p-item' + (x.baru === false ? ' dibaca' : '') + '" data-act="notif-go" data-i="' + i + '"><i class="bi ' + ic + '" style="font-size:18px;color:var(--indigo)"></i><div class="grow"><div class="fw6">' + esc(x.judul) + '</div><div class="xs muted">' + esc(x.sub) + '</div></div>' + (x.baru !== false && x.ts ? '<span class="nt-dot" aria-label="baru"></span>' : '') + '</button>';
    }).join('') : empty('bi-bell-slash', 'Tidak ada notifikasi baru'));
}
ACT['notif-baca'] = function () {
  const n = S.notif; if (!n) return;
  n.items.forEach(function (x) { if (x.ts) x.baru = false; });
  n.total = n.items.filter(function (x) { return x.baru !== false; }).length; n.adaDibaca = false;
  updateBell(); const pop = $('#pop-notif'); if (pop) pop.innerHTML = notifHtml(n);
  api('notif.baca', {}, true).then(function (r) { S.notif = r; updateBell(); }).catch(function () { });
};
ACT['notif-go'] = function (el) {
  const x = S.notif.items[+el.dataset.i]; closePop();
  if (!x) return;
  if (x.tipe === 'arahan' && x.id) { arahanBuka(x.id); return; }
  navigateTo(x.go || 'beranda', x.go === 'kasus' && x.id ? { open: x.id } : (x.go === 'poin' && x.id ? { id_murid: x.id, tab: 'daftar' } : (x.tab ? { tab: x.tab } : (x.filter ? { filter: x.filter } : {}))));
};

// ── Router SPA ──
function navigateTo(page, params, keepScroll, quiet) {
  if (!PAGES[page]) page = 'beranda';
  if (!S.menu.some(function (m) { return m.id === page; })) page = 'beranda';
  if (S.page === 'pindai' && page !== 'pindai' && typeof PND !== 'undefined') PND.berhenti();
  const tok = ++S.navTok;
  S.page = page; S.params = params || {};
  S.touched = false;
  S.recPage = Object.keys(S.params).length ? '' : page; S.recUntil = Date.now() + 4000;
  killCharts(); closePop();
  $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on');
  setNavActive(page);
  const c = $('#app-container');
  if (!quiet) c.innerHTML = skeleton(3);
  if (!keepScroll) window.scrollTo(0, 0);
  Promise.resolve().then(function () { return PAGES[page](S.params, tok); }).then(function () {
    if (tok !== S.navTok) return;
    sisipBantu(page);
    // v1.14: setelah halaman tampil, data tab-tab lain di halaman ini diambil lebih dulu (satu panggilan, di latar)
    if (!quiet) setTimeout(function () { if (tok === S.navTok) { const l = pfDaftarTab(page); if (l.length) muatBanyak(l); } }, 700);
  }).catch(function (e) {
    if (tok !== S.navTok) return;
    c.innerHTML = errBox(e, true);
  });
}
function stale(tok) { return tok !== S.navTok; }
ACT.nav = function (el) { navigateTo(el.dataset.page, {}); };
ACT.retry = function () { navigateTo(S.page, S.params, true); };

// Halaman yang sudah disentuh pengguna tidak digambar ulang otomatis oleh pembaruan latar belakang.
['click', 'input', 'change'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { const c = $('#app-container'); if (c && c.contains(e.target)) S.touched = true; }, true);
});
// Delegasi klik global: <... data-act="nama">
document.addEventListener('click', function (e) {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled || t.classList.contains('loading')) return;
  const fn = ACT[t.dataset.act];
  // v1.14: data yang dimuat sebuah tab direkam (seperti menu) agar lain kali diambil lebih dulu saat halamannya dibuka
  if (fn && /-tab$/.test(t.dataset.act) && S.page) { S.recPage = S.page + '#' + (t.dataset.t || t.dataset.tab || t.dataset.k || t.dataset.id || ''); S.recUntil = Date.now() + 4000; }
  if (fn) { e.preventDefault(); fn(t, e); }
});

// ── Mulai aplikasi ──
// Data boot terakhir disimpan di sessionStorage sehingga saat halaman dibuka ulang, aplikasi langsung tampil,
// lalu diperbarui diam-diam dari server.
function bootKey() { return 'sk_boot_' + VERSI_APP + '_' + (sget('sk_email') || S.token || 'g') + '_' + (S.mode || ''); }
function applyBoot(b, dariCache) {
  S.mode = b.user.mode || '';
  S.user = b.user; ccMuatSimpanan(); S.cfg = b.config; S.menu = b.menu; S.versiServer = b.versiServer || ''; if (b.arahan) S.arahan = b.arahan; S.refs = b.refs; S.today = b.hariIni; S.kelasWali = b.kelasWali || []; S.kelasAkses = b.kelasAkses || null; S.batasKoreksi = b.batasKoreksi; S.jamMaks = b.jamMaks || 10; S.saranTA = b.saranTA || null;
  if (b.notif) S.notif = b.notif;
  document.title = (b.config.namaSekolah ? b.config.namaSekolah + ' · ' : '') + 'SIKOLAB BK';
  show('#splash', false); show('#login-root', false); show('#shell', true);
  renderShell();
  updateBell();
}
function startApp(bolehCache) {
  show('#login-root', false);
  let cached = null;
  if (bolehCache) { try { cached = JSON.parse(sget(bootKey()) || 'null'); } catch (e) { cached = null; } }
  if (cached && cached.user) {
    // Tampil seketika dari data terakhir di perangkat, lalu diperbarui diam-diam.
    applyBoot(cached, true);
    S.pre = cached.beranda ? { beranda: cached.beranda } : null;
    navigateTo('beranda', {});
  }
  return api('boot', {}, !!(cached && cached.user)).then(function (b) { terimaBoot(b, cached); });
}
/** Olah data awal dari server (dari "boot" atau langsung dari login). */
function terimaBoot(b, cached) {
  if (b.user && b.user.email) S.email = b.user.email;
  if (b.wajibGantiPin) { S.user = null; sset(bootKey(), null); return renderGantiPinWajib(b); }
  if (b.perluPilihPeran) { S.mode = ''; sset('sk_mode', null); return renderPilihPeran(b); }
  S.mode = b.user.mode || '';
  sset('sk_email', b.user.email); sset('sk_mode', S.mode || null);
  if (S.mode) lstore('sk_mode_' + b.user.email, S.mode);
  try { sset(bootKey(), JSON.stringify(b)); } catch (e) { /* kuota penuh: abaikan */ }
  if (cached && cached.user) {
    const ubahMenu = JSON.stringify(cached.menu) !== JSON.stringify(b.menu) || JSON.stringify(cached.user.roles) !== JSON.stringify(b.user.roles);
    const halaman = S.page, param = S.params;
    applyBoot(b, false);
    setNavActive(halaman);
    if (ubahMenu) navigateTo('beranda', {});
    else if (halaman === 'beranda' && b.beranda && !S.touched) { S.pre = { beranda: b.beranda, basi: !!b.berandaBasi }; navigateTo('beranda', param, true, true); }
    if (b.notif && b.notif.basi) setTimeout(loadNotif, 2500);
    pfIdle(); obKirim();
    return;
  }
  S.pre = b.beranda ? { beranda: b.beranda, basi: !!b.berandaBasi } : null;
  if (b.notif && b.notif.basi) setTimeout(loadNotif, 2500);
  applyBoot(b, false);
  navigateTo('beranda', {});
  if (!b.notif) loadNotif();
  pfIdle(); obKirim();
}
/** Setelah aplikasi tampil dan tenang, ambil lebih dulu data 3 menu teratas (yang pernah dibuka) di latar belakang. */
/** Setelah aplikasi tenang: siapkan data semua menu yang pernah dibuka (dan kop surat) dalam satu panggilan. */
function pfIdle() {
  setTimeout(function () {
    if (!S.user) return;
    let list = [{ a: 'kop.get', p: {} }], tab = [];
    S.menu.forEach(function (m) { if (m.id !== S.page) list = list.concat(pfDaftar(m.id)); tab = tab.concat(pfDaftarTab(m.id)); });
    // v1.14: sesudah data halaman utama, data tab-tab di dalam halaman ikut disiapkan (antar-tab tanpa menunggu)
    muatBanyak(list, 6).then(function () { const e = CC[ccKey('kop.get', {})]; if (e && e.v) KOP = e.v; if (S.user) return muatBanyak(tab, 8); });
  }, 500);
}
/** Layar masuk tanpa menunggu server: memakai status awal yang ikut terkirim bersama halaman. */
function tampilMasuk(pesan) {
  const st = Object.assign({}, window.SK_AWAL || {}, S.cfg && S.cfg.namaSekolah ? { namaSekolah: S.cfg.namaSekolah, tahunAjaran: S.cfg.tahunAjaran, semester: S.cfg.semester, logoUrl: S.cfg.logoUrl } : {});
  if (st.state !== 'setup' && st.state !== 'belum') st.state = 'login';
  show('#splash', false);
  renderLogin(st);
  if (pesan) setTimeout(function () { toast(pesan, 'warn'); }, 100);
}
function init() {
  initTheme();
  S.token = sget('sk_token') || '';
  S.mode = sget('sk_mode') || '';
  const gagal = function (e) {
    show('#splash', false); show('#login-root', true);
    $('#login-root').innerHTML = '<div class="login"><div class="login-card"><div class="logo">' + logoHtml() + '</div><h2>Tidak dapat memuat aplikasi</h2><p class="muted mt-8">' + esc(e.message) + '</p><button class="btn dark block mt-16" onclick="init()">Coba lagi</button></div></div>';
  };
  const lewatStatus = function () {
    const awal = window.SK_AWAL;
    if (awal && awal.state) {
      // Tanpa perjalanan ke server: langsung tampilkan layar yang tepat.
      if (awal.state === 'ok' && !sget('sk_manual') && !lstore('sk_manual')) return startApp().catch(function () { tampilMasuk(); });
      if (awal.state === 'ok' || awal.state === 'login') return tampilMasuk();
      show('#splash', false); return renderLogin(awal);
    }
    // v1.14: di perangkat yang pernah membuka aplikasi, layar masuk langsung tampil (tanpa menunggu server);
    // status server tetap diperiksa di latar dan layar diganti hanya bila keadaannya berbeda.
    let stLama = null;
    try { stLama = JSON.parse(lstore('sk_status') || 'null'); } catch (e) { stLama = null; }
    const sudahTampil = !!(stLama && stLama.state === 'login');
    if (sudahTampil) { show('#splash', false); renderLogin(stLama); }
    api('auth.status', { manual: !!sget('sk_manual') }, sudahTampil).then(function (st) {
      if (st.state === 'login') lstore('sk_status', JSON.stringify(st)); else lhapus('sk_status');
      if (st.state === 'ok') return startApp().catch(function (e) { show('#splash', false); renderLogin({}); if (e && e.message) setTimeout(function () { toast(e.message, 'err'); }, 100); });
      if (sudahTampil && st.state === 'login') return;
      show('#splash', false); renderLogin(st);
    }).catch(function (e) { if (!sudahTampil) gagal(e); });
  };
  if (S.token) { startApp(true).catch(function (e) { if (e && e.code === 'AUTH') { S.token = ''; hapusSesiLokal(); lewatStatus(); } else { show('#splash', false); lewatStatus(); } }); }
  else lewatStatus();
  setInterval(loadNotif, 180000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadNotif(); });
  window.addEventListener('online', function () { obKirim(); });
}
