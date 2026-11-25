/* SIKOLAB BK v1.15 — js/pages/34_admin_kehadiran.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Administrasi → tab "Kehadiran & Libur": absensi QR, petugas pindai, hari libur, kapasitas data
// ════════════════════════════════════════════════════════════
function adKehadiran() {
  $('#ad-body').innerHTML = skeleton(3);
  apiC('kehadiran.get').then(function (r) { P.kh = r; P.khLib = r.libur.map(function (x) { return { d1: x.d1, d2: x.d2, k: x.k }; }); khGambar(); }).catch(function (e) { isiHtml('#ad-body', errBox(e, true)); });
}
function khGambar() {
  const r = P.kh, kp = r.kapasitas;
  const otomatis = r.users.filter(function (u) { return u.otomatis; }).length;
  let h = '<div class="grid g-2"><div class="col gap-16">' +
    '<div class="card pad"><div class="row between wrap"><h3><i class="bi bi-qr-code-scan" style="color:var(--teal)"></i> Absensi QR</h3>' + (r.qrAktif ? '<span class="chip st-Selesai">Aktif</span>' : '<span class="chip neutral">Nonaktif</span>') + '</div>' +
    '<p class="xs muted mt-8">Murid memindai kartu di gerbang; absensi harian wali kelas terisi otomatis. Selama nonaktif, menu Pindai Hadir tidak muncul dan semua tetap dicatat manual seperti biasa.</p>' +
    '<form id="f-kh" class="form-grid c2 mt-12" novalidate>' + fld({ name: 'qrAktif', label: 'Status', type: 'select', value: r.qrAktif ? '1' : '0', opts: [{ v: '1', l: 'Aktif' }, { v: '0', l: 'Nonaktif' }] }) +
    fld({ name: 'jamMasuk', label: 'Batas jam masuk', type: 'time', value: r.jamMasuk, hint: 'Pindai setelah jam ini tercatat Terlambat.' }) + '</form>' +
    '<div class="field mt-12"><span class="flabel">Petugas pindai tambahan</span><div class="hint" style="margin:2px 0 8px">Guru BK, Waka, dan Admin (' + otomatis + ' akun) otomatis boleh memindai. Centang guru piket lainnya.</div><div class="kh-pet" id="kh-pet">' +
    r.users.filter(function (u) { return !u.otomatis; }).map(function (u) { return '<label class="check"><input type="checkbox" value="' + esc(u.email) + '"' + (u.dipilih ? ' checked' : '') + '> ' + esc(u.nama) + '</label>'; }).join('') + '</div></div>' +
    '<div class="row wrap mt-12"><button class="btn primary" data-act="kh-simpan"><i class="bi bi-check-lg"></i> Simpan</button><button class="btn" data-act="kartu-modal"><i class="bi bi-qr-code"></i> Cetak kartu QR</button></div>' +
    (r.tanpaKode ? '<div class="xs muted mt-8">' + r.tanpaKode + ' murid belum punya kode kartu; kode dibuat otomatis saat kartu dicetak atau petugas membuka Pindai Hadir.</div>' : '') + '</div>' +
    '<div class="card pad"><h3><i class="bi bi-database" style="color:var(--indigo)"></i> Kapasitas data</h3><p class="xs muted mt-8">Batas Google Sheets: 20 juta sel per berkas, termasuk kolom dan baris kosong.</p>' +
    '<div class="row between mt-12"><b style="font:800 22px var(--font-h)">' + kp.persen + '%</b><span class="xs muted">' + kp.total.toLocaleString('id-ID') + ' dari ' + kp.batas.toLocaleString('id-ID') + ' sel</span></div>' +
    '<div class="bar mt-8 ' + (kp.persen >= 70 ? 'bar-warn' : '') + '"><i style="width:' + Math.min(100, kp.persen) + '%"></i></div>' +
    '<div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Lembar</th><th>Baris data</th><th>Sel</th></tr></thead><tbody>' + kp.lembar.map(function (x) { return '<tr><td>' + esc(x.nama) + (x.kolomKosong ? ' <span class="xs muted">(' + x.kolomKosong + ' kolom kosong)</span>' : '') + '</td><td>' + x.baris.toLocaleString('id-ID') + '</td><td>' + x.sel.toLocaleString('id-ID') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="row wrap mt-12"><button class="btn" data-act="kh-rapikan"><i class="bi bi-arrow-repeat"></i> Rapikan kolom & baris kosong</button></div>' +
    '<div class="xs muted mt-8">Bila mendekati 70%, arsipkan data di tab Tahun Ajaran (bisa per semester). Sekolah dengan lebih dari ± 600 murid disarankan mengarsipkan setiap akhir semester.</div></div></div>' +
    '<div class="col gap-16"><div class="card pad"><h3><i class="bi bi-calendar-range" style="color:var(--indigo)"></i> Hari sekolah</h3>' +
    '<p class="xs muted mt-8">Hari di luar hari sekolah tampil sebagai <b>Libur</b>: pengingat absensi harian tidak muncul dan pemindaian QR tidak dicatat. Minggu selalu libur.</p>' +
    '<div class="row wrap mt-12" style="gap:8px;align-items:center"><select class="select" id="kh-hs" style="width:auto;min-width:220px"><option value="5"' + (r.hariSekolah === 6 ? '' : ' selected') + '>Senin – Jumat (5 hari)</option><option value="6"' + (r.hariSekolah === 6 ? ' selected' : '') + '>Senin – Sabtu (6 hari)</option></select><button class="btn primary" data-act="kh-hari"><i class="bi bi-check-lg"></i> Simpan</button></div>' +
    '<div class="xs muted mt-8">Ada kegiatan wajib di hari Sabtu? Pilih sementara Senin – Sabtu, lalu kembalikan setelah kegiatan.</div></div>' +
    '<div class="card pad"><div class="row between wrap"><h3><i class="bi bi-calendar-heart" style="color:var(--rose)"></i> Hari libur & kegiatan sekolah</h3><span class="xs muted">' + P.khLib.length + ' entri</span></div>' +
    '<p class="xs muted mt-8">Tanggal di sini dilewati oleh deteksi pola ketidakhadiran, pengingat absensi harian, dan pemindaian QR. Masukkan libur nasional, cuti bersama, libur semester, dan kegiatan sekolah tanpa absensi.</p>' +
    '<div id="kh-lib" class="mt-12"></div><div class="row wrap mt-12"><button class="btn sm" data-act="kh-lib-tambah"><i class="bi bi-plus-lg"></i> Tambah baris</button><button class="btn sm" data-act="kh-lib-tempel"><i class="bi bi-clipboard"></i> Tempel daftar</button></div>' +
    '<div class="row wrap mt-16"><button class="btn primary" data-act="kh-lib-simpan"><i class="bi bi-check-lg"></i> Simpan hari libur</button></div></div></div></div>';
  $('#ad-body').innerHTML = h;
  khLibGambar();
}
function khLibGambar() {
  const box = $('#kh-lib'); if (!box) return;
  box.innerHTML = P.khLib.length ? '<div class="kh-lib">' + P.khLib.map(function (x, i) {
    const lewat = (x.d2 || x.d1) < P.kh.hariIni;
    return '<div class="kh-l' + (lewat ? ' lewat' : '') + '"><input class="input" type="date" data-lib="' + i + '" data-f="d1" value="' + esc(x.d1) + '" aria-label="Mulai"><input class="input" type="date" data-lib="' + i + '" data-f="d2" value="' + esc(x.d2 && x.d2 !== x.d1 ? x.d2 : '') + '" aria-label="Sampai (opsional)"><input class="input" data-lib="' + i + '" data-f="k" maxlength="80" value="' + esc(x.k) + '" placeholder="Keterangan, mis. Libur semester"><button class="icon-btn" data-act="kh-lib-hapus" data-i="' + i + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div>';
  }).join('') + '</div><div class="xs muted mt-8">Kolom kedua (sampai) dikosongkan untuk libur satu hari. Baris redup = sudah lewat.</div>' : empty('bi-calendar-heart', 'Belum ada hari libur', 'Tambahkan baris atau tempel daftar tanggal.');
  $$('[data-lib]', box).forEach(function (inp) {
    inp.addEventListener('change', function () { const x = P.khLib[+inp.dataset.lib]; if (!x) return; x[inp.dataset.f] = inp.value.trim(); if (inp.dataset.f === 'd1' && (!x.d2 || x.d2 < x.d1)) x.d2 = ''; });
  });
}
ACT['kh-lib-tambah'] = function () { P.khLib.push({ d1: S.today, d2: '', k: '' }); khLibGambar(); const l = $$('#kh-lib [data-f="k"]'); if (l.length) l[l.length - 1].focus(); };
ACT['kh-lib-hapus'] = function (el) { P.khLib.splice(+el.dataset.i, 1); khLibGambar(); };
/** Tempel daftar: satu baris per libur. Contoh: "2026-12-25 Natal", "24/12/2026 - 31/12/2026 Libur semester". */
function parseTglBebas(s) {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
ACT['kh-lib-tempel'] = function () {
  const m = openModal({
    title: 'Tempel daftar hari libur', sub: 'Satu baris per libur. Tanggal boleh berformat 2026-12-25 atau 25/12/2026.',
    body: '<textarea class="textarea" id="kh-teks" rows="9" placeholder="2026-12-25 Hari Raya Natal&#10;24/12/2026 - 31/12/2026 Libur semester ganjil&#10;2027-01-01 Tahun Baru"></textarea><div class="xs muted mt-8">Rentang ditulis dengan tanda hubung atau "s.d.". Baris yang tidak terbaca dilewati.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="kh-teks-ok">Tambahkan</button>'
  });
  $('#kh-teks-ok', m.el).addEventListener('click', function () {
    let n = 0;
    $('#kh-teks', m.el).value.split(/\r?\n/).forEach(function (baris) {
      const t = baris.trim(); if (!t) return;
      const r = /^([0-9][0-9\/.\-]{6,9}[0-9])(?:\s*(?:-|–|—|s\.?\s*d\.?|sampai|hingga)\s*([0-9][0-9\/.\-]{6,9}[0-9]))?\s*[,;:|]?\s*(.*)$/i.exec(t);
      if (!r) return;
      const d1 = parseTglBebas(r[1]), d2 = r[2] ? parseTglBebas(r[2]) : '';
      if (!d1) return;
      const e = { d1: d1, d2: d2 && d2 > d1 ? d2 : '', k: (r[3] || '').trim() || 'Libur' };
      if (P.khLib.some(function (x) { return x.d1 === e.d1 && (x.d2 || x.d1) === (e.d2 || e.d1) && String(x.k).toLowerCase() === e.k.toLowerCase(); })) return;
      P.khLib.push(e); n++;
    });
    m.close(); khLibGambar();
    toast(n ? n + ' baris ditambahkan. Tekan Simpan hari libur.' : 'Tidak ada baris yang terbaca.', n ? '' : 'warn');
  });
};
ACT['kh-lib-simpan'] = function (el) {
  const list = P.khLib.filter(function (x) { return x.d1; }).map(function (x) { return { d1: x.d1, d2: x.d2 || x.d1, k: x.k || 'Libur' }; });
  run(el, api('libur.simpan', { list: list })).then(function (r) { P.khLib = r.list.map(function (x) { return { d1: x.d1, d2: x.d2, k: x.k }; }); khLibGambar(); toast('Hari libur tersimpan (' + r.list.length + ' entri).'); }).catch(fail);
};
ACT['kh-hari'] = function (el) {
  const v = $('#kh-hs').value;
  run(el, api('kehadiran.simpan', { hariSekolah: v })).then(function (r) {
    P.kh = Object.assign(P.kh, r); ccClear(); toast('Hari sekolah: ' + (v === '6' ? 'Senin – Sabtu' : 'Senin – Jumat') + '.');
  }).catch(fail);
};
ACT['kh-simpan'] = function (el) {
  const d = formData($('#f-kh'));
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.jamMasuk || '')) { toast('Isi batas jam masuk dengan format JJ:MM.', 'err'); return; }
  const pet = $$('#kh-pet input:checked').map(function (c) { return c.value; });
  run(el, api('kehadiran.simpan', { qrAktif: d.qrAktif === '1', jamMasuk: d.jamMasuk, petugas: pet })).then(function (r) {
    P.kh = Object.assign(P.kh, r); toast('Pengaturan absensi QR tersimpan.');
    return api('boot').then(function (b) { S.cfg = b.config; S.menu = b.menu; renderShell(); setNavActive('admin'); khGambar(); });
  }).catch(fail);
};
ACT['kh-rapikan'] = function (el) {
  confirmDlg('Kolom kosong di kanan dan baris kosong berlebih di bawah setiap lembar aplikasi akan dihapus. Data tidak berubah. Lanjutkan?', 'Rapikan', false, 'Rapikan Spreadsheet').then(function (ok) {
    if (!ok) return;
    run(el, api('kapasitas.rapikan')).then(function (r) { P.kh.kapasitas = r.kapasitas; khGambar(); toast(r.dihapus.kolom + ' kolom dan ' + r.dihapus.baris + ' baris kosong dihapus.'); }).catch(fail);
  });
};
