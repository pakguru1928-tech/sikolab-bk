/* SIKOLAB BK v1.15 — js/pages/25_sistem.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// v1.12 — Kesehatan sistem, jadwal pelajaran, konfirmasi pola, rekap rapat, cetak garis waktu, pemandu BK
// ════════════════════════════════════════════════════════════
function akunAdmin() { const r = (S.user && (S.user.allRoles || S.user.roles)) || []; return r.indexOf('admin') >= 0; }
/** Peringatan bila tampilan dan server berbeda versi (mis. Kode.gs lupa diganti). Hanya untuk admin. */
function bannerVersi() {
  if (!akunAdmin() || !S.user || S.versiServer === VERSI_APP) return '';
  return '<div class="note rose mb-16"><i class="bi bi-exclamation-triangle"></i><div><b>Versi server dan tampilan berbeda.</b> Tampilan v' + esc(VERSI_APP) + ', server ' + (S.versiServer ? 'v' + esc(S.versiServer) : 'versi lama') +
    '. Ganti Kode.gs, JavaScript.html, dan Stylesheet.html di Apps Script, lalu Deploy → Manage deployments → New version. Untuk tampilan GitHub, ganti js/app.js dan css/style.css.</div></div>';
}

// ── Administrasi → Kesehatan Sistem ──
function adSistem() {
  $('#ad-body').innerHTML = skeleton(2);
  api('sistem.info').then(function (r) { P.sis = r; adSistemGambar(); }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function adSistemGambar() {
  const r = P.sis, a = r.absen || {}, inf = a.info || {};
  const sak = function (apa, on, label, ket) {
    return '<div class="row between sec mb-8" style="gap:12px"><div class="grow"><div class="fw6">' + label + ' <span class="chip ' + (on ? 'st-Dipantau' : 'neutral') + '">' + (on ? 'Aktif' : 'Nonaktif') + '</span></div><div class="xs muted mt-8" style="margin-top:4px">' + ket + '</div></div>' +
      '<button class="btn sm ' + (on ? '' : 'primary') + '" data-act="sis-atur" data-apa="' + apa + '" data-on="' + (on ? '0' : '1') + '">' + (on ? 'Matikan' : 'Aktifkan') + '</button></div>';
  };
  const fm = a.format === 'sesi';
  const kl = r.kelengkapan;
  let h = bannerVersi() + '<div class="grid g-2 eq">';
  h += '<div class="card pad"><h3>Versi</h3><div class="stat-row s3 mt-12"><div class="stat"><span class="lbl">Tampilan</span><b>v' + esc(VERSI_APP) + '</b></div><div class="stat"><span class="lbl">Server</span><b>v' + esc(r.versiServer) + '</b></div><div class="stat"><span class="lbl">Skema data</span><b>' + esc(r.skema) + '</b></div></div>' +
    (r.versiServer === VERSI_APP ? '<div class="xs muted mt-12"><i class="bi bi-check2-circle"></i> Versi server dan tampilan sama.</div>' : '') +
    '<div class="xs muted mt-12">Lama setiap permintaan tercatat di editor Apps Script → <b>Eksekusi</b>, misalnya <span class="mono">⏱ dashboard.get 1.8 dtk · guru_bk</span>.</div></div>';
  h += '<div class="card pad"><h3>Kecepatan & keamanan</h3><div class="mt-12">' +
    sak('pemanas', r.pemanas, 'Pemanas otomatis', 'Setiap 10 menit pada hari sekolah pukul 05.45–15.15, server dibangunkan, cache diisi, dan beranda setiap guru disiapkan sehingga layar pertama setelah masuk langsung tampil. Memakai sekitar 5–10 menit per hari dari kuota pemicu.') +
    sak('lindungi', r.lindungi, 'Perlindungan lembar spreadsheet', 'Siapa pun yang mengubah data langsung di Google Sheets mendapat peringatan lebih dulu. Ubah data lewat aplikasi agar tetap valid dan tidak membuat angka kedaluwarsa.') + '</div></div>';
  h += '<div class="card pad"><h3>Penyimpanan absensi mapel</h3><div class="sec mt-12"><div class="fw6"><i class="bi ' + (fm ? 'bi-check2-circle' : 'bi-info-circle') + '"></i> ' +
    (fm ? 'Format hemat aktif' : a.status === 'tunda' ? 'Format hemat menunggu arsip semester' : a.status === 'gagal' ? 'Konversi belum berhasil — format lama tetap dipakai' : 'Format lama') + '</div>' +
    '<div class="xs muted mt-8">' + esc(inf.pesan || (fm ? 'Satu baris per sesi; baris per murid hanya untuk yang tidak hadir.' : '')) + '</div>' +
    (inf.selesai ? '<div class="xs muted mt-8">' + esc(fTgl(String(inf.selesai).substr(0, 10))) + ' ' + esc(String(inf.selesai).substr(11, 5)) + (inf.cadangan ? ' · cadangan dibuat di Drive → Cadangan' : '') + '</div>' : '') + '</div>' +
    (a.status === 'gagal' ? '<button class="btn primary mt-12" data-act="sis-atur" data-apa="konversi"><i class="bi bi-arrow-repeat"></i> Coba konversi lagi</button>' : '') +
    (fm && a.lembarLama && a.lembarLama.length ? '<div class="row between sec mt-12" style="gap:12px"><div class="xs">Lembar lama masih disimpan: <b>' + esc(a.lembarLama.join(', ')) + '</b>. Hapus setelah Anda yakin rekap benar (cadangan tetap ada di Drive), atau biarkan; lembar ini ikut dibuang saat arsip semester.</div><button class="btn sm danger" data-act="sis-hapuslama">Hapus</button></div>' : '') + '</div>';
  h += '<div class="card pad"><h3>Kelengkapan absensi mapel</h3>' + (kl ? '<div class="xs muted mt-8">' + kl.hari + ' hari sekolah terakhir: ' + kl.terisi + ' dari ' + kl.terjadwal + ' sesi terjadwal sudah diabsen (' + kl.persen + '%). Kelas di bawah 70% ditandai pada deteksi pola.</div>' +
    '<div class="tbl-wrap mt-12"><table class="tbl" style="min-width:0"><thead><tr><th>Kelas</th><th>Terisi</th><th>Kelengkapan</th></tr></thead><tbody>' + kl.kelas.map(function (k) {
      return '<tr><td class="fw6">' + esc(k.kelas) + '</td><td>' + k.terisi + ' / ' + k.terjadwal + '</td><td><div class="bar' + (k.persen < 70 ? ' bar-warn' : '') + '" style="min-width:90px"><i style="width:' + k.persen + '%"></i></div><span class="xs">' + k.persen + '%</span></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="xs muted mt-8">Isi <a href="#" data-act="ad-tab" data-t="jadwal">Jadwal Pelajaran</a> agar kelengkapan absensi per kelas dapat dihitung.</div>') + '</div>';
  const ix = r.indeks || {}, ixi = ix.info || {}, td = r.takDikenal || { total: 0, mapel: [], harian: [] };
  h += '<div class="card pad"><h3>Indeks absensi harian</h3><div class="sec mt-12"><div class="fw6"><i class="bi ' + (ix.status === 'siap' ? 'bi-check2-circle' : 'bi-info-circle') + '"></i> ' + (ix.status === 'siap' ? 'Aktif' : ix.status === 'gagal' ? 'Tidak dipakai (tidak cocok)' : 'Belum dibangun') + '</div><div class="xs muted mt-8">' + esc(ixi.pesan || 'Ringkasan absensi harian per kelas per hari agar rekap dan Beranda tetap cepat untuk ratusan murid.') + '</div></div>' +
    '<button class="btn sm mt-12" data-act="sis-atur" data-apa="indeks"><i class="bi bi-arrow-repeat"></i> Bangun ulang indeks</button></div>';
  const cp = r.cepat || [];
  if (cp.length) {
    const siap = cp.filter(function (x) { return x.ada; }).length;
    h += '<div class="card pad"><h3>Cache baca cepat (v1.14)</h3><div class="sec mt-12"><div class="fw6"><i class="bi ' + (siap ? 'bi-check2-circle' : 'bi-info-circle') + '"></i> ' + (siap === cp.length ? 'Aktif' : siap ? 'Sebagian aktif' : 'Belum dibangun') + '</div>' +
      '<div class="xs muted mt-8">Data absensi lama disimpan ringkas di server sehingga Beranda, rekap, garis waktu, dan rapat tidak membaca ulang seluruh lembar. Dibangun otomatis oleh pemanas setiap pagi; tanpa pemanas dibangun saat pertama dibutuhkan.</div>' +
      '<div class="xs mt-8">' + cp.map(function (x) { return esc(x.lembar) + ': ' + (x.ada ? x.baris + ' baris' : 'belum'); }).join(' · ') + '</div></div>' +
      '<button class="btn sm mt-12" data-act="sis-atur" data-apa="cepat"><i class="bi bi-arrow-repeat"></i> Bangun ulang cache</button></div>';
  }
  const tdRow = function (x, mapel) { return '<tr><td class="xs">' + esc(fTgl(x.tanggal)) + '</td><td>' + esc(x.kelas) + '</td>' + (mapel ? '<td class="xs">' + esc(x.mapel) + ' · jam ' + esc(x.jam) + '</td>' : '<td class="xs">Harian</td>') + '<td class="mono">' + esc(x.status) + '</td><td>' + x.n + '</td><td class="xs">' + esc(x.pencatat || '-') + '</td></tr>'; };
  h += '<div class="card pad"><h3>Status absensi tidak dikenal</h3>' + (td.total ? '<div class="xs muted mt-8">' + td.total + ' catatan berstatus selain H/S/I/A/T. Catatan ini tidak dihitung di rekap. Perbaiki lewat koreksi absensi oleh pencatatnya, atau langsung di lembar spreadsheet (kolom status diisi H, S, I, A, atau T).</div><div class="tbl-wrap mt-12"><table class="tbl" style="min-width:0"><thead><tr><th>Tanggal</th><th>Kelas</th><th>Sesi</th><th>Status</th><th>Jumlah</th><th>Pencatat</th></tr></thead><tbody>' +
    td.mapel.slice(0, 30).map(function (x) { return tdRow(x, true); }).join('') + td.harian.slice(0, 30).map(function (x) { return tdRow(x, false); }).join('') + '</tbody></table></div>' : '<div class="xs muted mt-8"><i class="bi bi-check2-circle"></i> Semua catatan absensi berstatus sah.</div>') + '</div>';
  h += '<div class="card pad" style="grid-column:1/-1"><div class="row between"><h3>Galat server terbaru</h3>' + (r.galat.length ? '<button class="btn sm ghost" data-act="sis-atur" data-apa="galat">Bersihkan</button>' : '') + '</div>' +
    (r.galat.length ? '<div class="tbl-wrap mt-12"><table class="tbl" style="min-width:0"><thead><tr><th>Waktu</th><th>Aksi</th><th>Pengguna</th><th>Pesan</th></tr></thead><tbody>' + r.galat.map(function (g) {
      return '<tr><td class="xs">' + esc(String(g.t).replace('T', ' ').substr(0, 16)) + '</td><td class="mono xs">' + esc(g.a) + '</td><td class="xs">' + esc(g.e || '-') + '</td><td class="xs">' + esc(g.m) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="xs muted mt-8"><i class="bi bi-check2-circle"></i> Tidak ada galat tercatat.</div>') + '</div></div>';
  $('#ad-body').innerHTML = h;
}
ACT['sis-atur'] = function (el) {
  run(el, api('sistem.atur', { apa: el.dataset.apa, aktif: el.dataset.on === '1' })).then(function (r) { P.sis = r; adSistemGambar(); toast('Tersimpan.'); }).catch(fail);
};
ACT['sis-hapuslama'] = function (el) {
  confirmDlg('Hapus lembar absensi format lama dari spreadsheet? Salinan lengkapnya tetap ada di folder Drive "Cadangan".', 'Ya, hapus', true, 'Hapus lembar lama').then(function (ok) {
    if (ok) run(el, api('sistem.atur', { apa: 'hapusLama' })).then(function (r) { P.sis = r; adSistemGambar(); toast('Lembar lama dihapus.'); }).catch(fail);
  });
};

// ── Administrasi → Jadwal Pelajaran ──
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function adJadwal(idKelas) {
  $('#ad-body').innerHTML = skeleton(2);
  api('jadwal.get', { id_kelas: idKelas || (P.jdw ? P.jdw.idKelas : '') }).then(function (r) { P.jdw = r; adJadwalGambar(); }).catch(function (e) { isiHtml('#ad-body', errBox(e)); });
}
function adJadwalGambar() {
  const r = P.jdw, isi = {};
  r.isi.forEach(function (x) { isi[x.hari + '|' + x.jam] = x.v; });
  const hari = []; for (let i = 1; i <= r.hariSekolah; i++) hari.push(i);
  const jam = []; for (let j = 1; j <= r.jamMaks; j++) jam.push(j);
  const opsi = function (v) { return '<option value="">—</option>' + r.opsi.map(function (o) { return '<option value="' + esc(o.v) + '"' + (o.v === v ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join(''); };
  let h = '<div class="card pad"><div class="row between wrap" style="gap:12px"><div><h3>Jadwal pelajaran</h3><div class="xs muted mt-8" style="margin-top:4px">Opsional. Bila diisi, Beranda guru menampilkan kelas sesuai jadwal hari itu (beserta jamnya), guru diingatkan sesi yang belum diabsen, dan admin melihat "x dari y sesi". Bila dibiarkan kosong, aplikasi bekerja seperti biasa.</div></div>' +
    '<select class="select" id="jd-kelas" style="width:auto;min-height:40px">' + r.kelas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === r.idKelas ? ' selected' : '') + '>' + esc(k.nama) + (r.terisiKelas[k.id] ? ' ✓' : '') + '</option>'; }).join('') + '</select></div>';
  if (!r.opsi.length) h += '<div class="note info mt-12"><i class="bi bi-info-circle"></i><div>Kelas ini belum punya pengampu. Atur dulu di tab <a href="#" data-act="ad-tab" data-t="pengampu">Pengampu</a>.</div></div>';
  h += '<div class="tbl-wrap mt-12"><table class="tbl jdw-tbl"><thead><tr><th style="width:56px">Jam</th>' + hari.map(function (d) { return '<th>' + HARI_ID[d] + '</th>'; }).join('') + '</tr></thead><tbody>' +
    jam.map(function (j) { return '<tr><td class="fw6">' + j + '</td>' + hari.map(function (d) { return '<td><select class="select jd-sel" data-h="' + d + '" data-j="' + j + '">' + opsi(isi[d + '|' + j] || '') + '</select></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="row between wrap mt-12" style="gap:8px"><span class="xs muted">Jam berurutan dengan mapel dan guru yang sama dihitung satu sesi (mis. jam 1–2 IPS).</span><div class="row"><button class="btn" data-act="jd-kosong">Kosongkan</button><button class="btn primary" data-act="jd-simpan"><i class="bi bi-check2"></i> Simpan jadwal kelas ini</button></div></div></div>';
  $('#ad-body').innerHTML = h;
  $('#jd-kelas').addEventListener('change', function (e) { adJadwal(e.target.value); });
}
ACT['jd-kosong'] = function () { $$('.jd-sel').forEach(function (s) { s.value = ''; }); };
ACT['jd-simpan'] = function (el) {
  const isi = $$('.jd-sel').filter(function (s) { return s.value; }).map(function (s) { return { hari: +s.dataset.h, jam: +s.dataset.j, v: s.value }; });
  run(el, api('jadwal.simpan', { id_kelas: P.jdw.idKelas, isi: isi })).then(function (r) { P.jdw = r; adJadwalGambar(); toast('Jadwal ' + (r.kelas.filter(function (k) { return k.id === r.idKelas; })[0] || {}).nama + ' tersimpan (' + isi.length + ' jam).'); }).catch(fail);
};

// ── Konfirmasi pola bolos (Beranda) ──
function polaTanda(x) {
  return (x.konfirmasi && x.konfirmasi.keputusan === 'benar' ? '<span class="chip st-Eskalasi" title="Dikonfirmasi ' + esc(x.konfirmasi.oleh) + '"><i class="bi bi-check2-circle"></i> Dikonfirmasi bolos</span>' : '') +
    (x.kurangLengkap !== null && x.kurangLengkap !== undefined ? '<span class="chip neutral" title="Kelengkapan absensi mapel kelas ini ' + x.kurangLengkap + '%">Data kelas ' + x.kurangLengkap + '% lengkap</span>' : '') +
    (x.isiTerlambat ? '<span class="chip neutral" title="Sebagian besar catatan alpa diisi setelah hari pelajaran">Diisi terlambat</span>' : '');
}
function polaTombol(x) {
  if (!x.kunci || (x.konfirmasi && x.konfirmasi.keputusan === 'benar')) return '';
  return '<button class="btn sm" data-act="pola-konf" data-id="' + esc(x.id_murid) + '" data-k="' + esc(x.kunci) + '" data-v="benar" title="Pola ini memang bolos"><i class="bi bi-check2-circle"></i> Benar bolos</button>' +
    '<button class="btn sm ghost" data-act="pola-konf" data-id="' + esc(x.id_murid) + '" data-k="' + esc(x.kunci) + '" data-v="salah" title="Data absensi keliru; sembunyikan pola ini"><i class="bi bi-x-octagon"></i> Salah catat</button>';
}
ACT['pola-konf'] = function (el) {
  const salah = el.dataset.v === 'salah';
  const kirim = function () {
    run(el, api('pola.konfirmasi', { id_murid: el.dataset.id, kunci: el.dataset.k, keputusan: el.dataset.v })).then(function () {
      toast(salah ? 'Ditandai salah catat. Pola disembunyikan sampai ada bukti baru.' : 'Dikonfirmasi sebagai bolos.');
      ccClear(); navigateTo('beranda', {}, true);
    }).catch(fail);
  };
  if (salah) confirmDlg('Tandai pola ini sebagai salah catat? Pola disembunyikan sampai ada catatan alpa baru. Sebaiknya guru mapel juga memperbaiki absensinya.', 'Ya, salah catat', false, 'Salah catat').then(function (ok) { if (ok) kirim(); });
  else kirim();
};

// ── Beranda Guru BK: tugas hari ini, kemajuan program, peta kerja ──
function tugasBKHtml() {
  const it = ((S.notif && S.notif.items) || []).filter(function (x) { return !x.ts || x.baru; }).slice(0, 8);
  return '<div class="card"><div class="card-head"><div><h3><i class="bi bi-list-check" style="color:var(--indigo)"></i> Tugas hari ini</h3><div class="xs muted">Diurutkan dari yang perlu ditindaklanjuti</div></div></div><div class="card-body">' +
    (it.length ? '<div class="col gap-8">' + it.map(function (x) {
      const i = S.notif.items.indexOf(x);
      return '<button class="sec row" style="text-align:left;cursor:pointer;gap:10px;width:100%" data-act="notif-go" data-i="' + i + '"><i class="bi bi-arrow-right-circle" style="color:var(--indigo)"></i><div class="grow"><div class="fw6">' + esc(x.judul) + '</div>' + (x.sub ? '<div class="xs muted">' + esc(x.sub) + '</div>' : '') + '</div></button>';
    }).join('') + '</div>' : empty('bi-check2-circle', 'Tidak ada tugas mendesak', 'Laporan, rujukan, dan tindak lanjut sudah tertangani.')) + '</div></div>';
}
function ceklistBK() {
  const box = $('#bk-ceklist');
  if (!box) return;
  apiC('bk.ceklist').then(function (r) {
    if (!$('#bk-ceklist')) return;
    box.innerHTML = '<div class="card-head"><div><h3><i class="bi bi-clipboard-check" style="color:var(--teal)"></i> Kemajuan program BK</h3><div class="xs muted">' + esc(r.semester) + ' ' + esc(r.tahunAjaran) + ' · ' + r.selesai + ' dari ' + r.total + ' langkah</div></div></div><div class="card-body"><div class="bar"><i style="width:' + Math.round(r.selesai * 100 / Math.max(1, r.total)) + '%"></i></div><div class="col gap-8 mt-12">' +
      r.items.map(function (x) {
        const ic = x.info ? 'bi-info-circle' : x.ok ? 'bi-check-circle-fill' : x.sebagian ? 'bi-hourglass-split' : 'bi-circle';
        const col = x.info ? 'var(--text-3)' : x.ok ? 'var(--teal)' : x.sebagian ? 'var(--amber)' : 'var(--text-3)';
        return '<button class="row" style="gap:10px;text-align:left;cursor:pointer;background:none;border:0;padding:4px 0;color:inherit;width:100%" data-act="ck-go" data-go="' + esc(x.go) + '" data-tab="' + esc(x.tab || '') + '" data-filter="' + esc(x.filter || '') + '"><i class="bi ' + ic + '" style="color:' + col + ';font-size:18px"></i><div class="grow"><div class="fw6">' + esc(x.judul) + '</div><div class="xs muted">' + esc(x.ket) + (!x.ok && x.saran ? ' · ' + esc(x.saran) : '') + '</div></div><i class="bi bi-chevron-right muted"></i></button>';
      }).join('') + '</div></div>';
  }).catch(function () { box.innerHTML = ''; });
}
ACT['ck-go'] = function (el) { const p = {}; if (el.dataset.tab) p.tab = el.dataset.tab; if (el.dataset.filter) p.filter = el.dataset.filter; navigateTo(el.dataset.go, p); };
/** Peta kerja BK: dua alur yang saling terhubung. Setiap kotak membuka menu terkait. */
function petaBK() {
  const alur = function (judul, ket, langkah) {
    return '<div class="mt-12"><div class="fw7">' + judul + '</div><div class="xs muted">' + ket + '</div><div class="peta mt-8">' + langkah.map(function (l, i) {
      return (i ? '<span class="peta-ar"><i class="bi bi-arrow-right"></i></span>' : '') + '<button class="peta-box" data-act="ck-go" data-go="' + l[2] + '" data-tab="' + (l[3] || '') + '"><span class="step-n sm">' + (i + 1) + '</span><b>' + l[0] + '</b><span class="xs muted">' + l[1] + '</span></button>';
    }).join('') + '</div></div>';
  };
  return '<div class="card pad"><h3><i class="bi bi-diagram-3" style="color:var(--indigo)"></i> Peta kerja Guru BK</h3>' +
    alur('A. Siklus program BK (terencana)', 'Dikerjakan berurutan setiap tahun ajaran.', [['Asesmen', 'Sebar AKPD/DCM', 'instrumen'], ['Analisis kebutuhan', 'Dari hasil instrumen', 'program', 'kebutuhan'], ['Program', 'Tahunan & semester', 'program', 'program'], ['RPL', 'Rencana tiap kegiatan', 'program', 'program'], ['Layanan', 'Catat tiap layanan', 'layanan'], ['Laporan', 'Evaluasi & pelaksanaan', 'program', 'rekap']]) +
    alur('B. Alur kasus (responsif, kolaborasi guru)', 'Dimulai dari laporan guru atau deteksi pola.', [['Laporan guru', 'Kejadian / pola bolos', 'kasus'], ['Tinjau', 'Baca & beri tanggapan', 'kasus'], ['Tangani', 'Sendiri atau dirujuk', 'kasus'], ['Layanan responsif', 'Konseling, konsultasi', 'layanan'], ['Tindak lanjut', 'Pantau & tinjau ulang', 'kasus'], ['Selesai', 'Tutup kasus', 'kasus']]) +
    '<div class="xs muted mt-12">Data alur B otomatis masuk ke laporan pelaksanaan pada alur A (komponen Responsif).</div></div>';
}

// ── Kotak "Apa ini dan kapan dipakai?" pada halaman kerja BK ──
const BANTU = {
  kasus: { r: ['guru_bk'], t: 'Rujukan & Kasus — apa ini dan kapan dipakai?', p: ['Semua laporan guru dan rujukan masuk ke sini. Tinjau laporan berstatus "Pembinaan Guru" agar guru pelapor mendapat umpan balik, tangani yang dirujuk, lalu catat tindak lanjutnya sampai Selesai.'],
    st: [['Baru', 'Laporan/rujukan masuk, belum ditangani.'], ['Pembinaan Guru', 'Guru sudah membina sendiri; BK cukup meninjau dan memantau.'], ['Diproses', 'Sedang ditangani Guru BK.'], ['Dalam Layanan BK', 'Murid sedang mengikuti layanan (konseling dll.).'], ['Ditangani Wali Kelas', 'Dilimpahkan ke wali kelas dengan tanggal tinjau.'], ['Menunggu Konfirmasi BK', 'Wali kelas selesai; BK mengonfirmasi atau mengambil kembali.'], ['Dipantau', 'Penanganan selesai, perkembangan masih diamati.'], ['Eskalasi', 'Diteruskan ke waka/kesiswaan.'], ['Selesai', 'Kasus ditutup.']] },
  layanan: { r: ['guru_bk'], t: 'Layanan BK — apa ini dan kapan dipakai?', p: ['Catat setiap layanan yang Anda berikan, baik terencana (layanan dasar, peminatan) maupun responsif (konseling, konsultasi, kunjungan rumah, konferensi kasus). Pilih komponennya dengan benar: data ini otomatis menjadi bahan laporan pelaksanaan dan kemajuan program.', 'Isi konseling bersifat rahasia dan hanya terlihat oleh Guru BK.'] },
  program: { r: ['guru_bk'], t: 'Program BK — apa ini dan kapan dipakai?', p: ['Urutannya: Analisis kebutuhan (dari hasil instrumen) → Program tahunan & semester → RPL tiap kegiatan → Rekap & laporan di akhir semester.', 'Isi realisasi setelah kegiatan dilaksanakan agar laporan pelaksanaan terisi otomatis.'] },
  instrumen: { r: ['guru_bk'], t: 'Instrumen BK — apa ini dan kapan dipakai?', p: ['Sebar instrumen (AKPD, DCM, sosiometri, atau buatan sendiri) di awal tahun ajaran atau saat dibutuhkan. Murid mengisi dengan kode akses dan NIS, tanpa akun.', 'Hasilnya menjadi dasar analisis kebutuhan dan program BK.'] }
};
function sisipBantu(page) {
  const b = BANTU[page];
  if (!b || !b.r.some(hasRole)) return;
  const head = $('#app-container .page-head');
  if (!head || $('#app-container .bantu')) return;
  let terbuka = true;
  try { terbuka = localStorage.getItem('sk_bantu_' + page) !== '0'; } catch (e) { /* abaikan */ }
  head.insertAdjacentHTML('afterend', '<details class="bantu card pad mb-16"' + (terbuka ? ' open' : '') + ' data-p="' + page + '"><summary><i class="bi bi-question-circle"></i> ' + esc(b.t) + '</summary>' +
    b.p.map(function (x) { return '<p class="xs mt-8">' + esc(x) + '</p>'; }).join('') +
    (b.st ? '<div class="bantu-st mt-12">' + b.st.map(function (x) { return '<div>' + chipStatus(x[0]) + '<span class="xs">' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' : '') + '</details>');
  const d = $('#app-container .bantu');
  d.addEventListener('toggle', function () { try { localStorage.setItem('sk_bantu_' + page, d.open ? '1' : '0'); } catch (e) { /* abaikan */ } });
}

// ── Rekap rapat kelas & cetak garis waktu banyak murid ──
PAGES.rapat = function (params, tok) {
  return apiC('rapat.kelas', { id_kelas: params.id_kelas || '', dari: params.dari || '', sampai: params.sampai || '' }).then(function (r) {
    if (stale(tok)) return;
    P.rp = r; P.rpPilih = {};
    r.rows.forEach(function (x) { if (x.perhatian) P.rpPilih[x.id] = 1; });
    rpGambar();
  });
};
function rpGambar() {
  const r = P.rp;
  const n = function (v, warn) { return v ? '<b' + (warn ? ' style="color:var(--rose)"' : '') + '>' + v + '</b>' : '<span class="muted">0</span>'; };
  let h = pageHead('Rapat & pertimbangan', 'Rekap Rapat Kelas', 'Data satu kelas untuk rapat semester, kenaikan kelas, atau pembahasan kasus. Murid yang perlu perhatian ditandai dan sudah dicentang untuk dicetak garis waktunya.', '<button class="btn" data-act="rp-cetak"><i class="bi bi-printer"></i> Cetak rekap</button><button class="btn primary" data-act="rp-cetak-gw"><i class="bi bi-file-earmark-person"></i> Cetak garis waktu terpilih</button>');
  h += '<div class="card pad"><form id="f-rp" class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
    fld({ name: 'id_kelas', label: 'Kelas', type: 'select', opts: r.kelas.map(function (k) { return { v: k.id, l: k.nama }; }), value: r.idKelas }) +
    fld({ name: 'dari', label: 'Dari', type: 'date', value: r.dari, maxv: S.today }) + fld({ name: 'sampai', label: 'Sampai', type: 'date', value: r.sampai, maxv: S.today }) +
    '<div class="field"><label>&nbsp;</label><button class="btn dark" type="submit"><i class="bi bi-funnel"></i> Terapkan</button></div></form></div>';
  h += '<div class="card mt-16"><div class="card-head"><div><h3>' + esc(r.namaKelas) + ' · ' + r.rows.length + ' murid</h3><div class="xs muted">Wali kelas: ' + esc(r.wali || '-') + ' · ' + esc(fTgl(r.dari)) + ' s.d. ' + esc(fTgl(r.sampai)) + ' · ' + r.perhatian + ' murid perlu perhatian</div></div><label class="row xs" style="gap:6px"><input type="checkbox" id="rp-semua"> Pilih semua</label></div>' +
    '<div class="tbl-wrap"><table class="tbl rp-tbl"><thead><tr><th></th><th>Nama</th><th>Hadir harian</th><th>S / I / A / T</th><th>Hadir mapel</th><th>Alpa mapel</th><th>Kasus (aktif)</th>' + (r.poinAktif ? '<th>Poin</th>' : '') + '<th>Layanan BK</th><th>Kontak ortu</th><th>Pola</th></tr></thead><tbody>' +
    r.rows.map(function (x) {
      return '<tr' + (x.perhatian ? ' class="rp-perhatian"' : '') + '><td><input type="checkbox" class="rp-cb" data-id="' + esc(x.id) + '"' + (P.rpPilih[x.id] ? ' checked' : '') + '></td><td><a href="#" class="fw6" data-act="open-murid" data-id="' + esc(x.id) + '">' + esc(x.nama) + '</a><div class="xs muted">' + esc(x.nis) + '</div></td>' +
        '<td>' + (x.harian === null ? '-' : x.harian + '%') + '</td><td class="xs">' + x.hS + ' / ' + x.hI + ' / ' + n(x.hA, true) + ' / ' + x.hT + '</td><td>' + (x.mapel === null ? '-' : x.mapel + '%') + '</td><td>' + n(x.mA, true) + '</td>' +
        '<td>' + x.kasus + (x.aktif ? ' (' + n(x.aktif, true) + ')' : '') + '</td>' + (r.poinAktif ? '<td>' + (x.poin === null ? '-' : x.poin) + (x.tahap ? '<div class="xs muted">' + esc(x.tahap) + '</div>' : '') + '</td>' : '') +
        '<td>' + x.layanan + '</td><td>' + x.kontak + '</td><td class="xs">' + (x.pola ? '<span class="chip lv-' + esc(x.pola.level) + '">' + esc(x.pola.level) + '</span> ' + esc(x.pola.teks) : '-') + '</td></tr>';
    }).join('') + '</tbody></table></div><div class="xs muted pad">Layanan BK hanya dihitung jumlahnya; isi konseling tidak ditampilkan. Persentase hadir = hadir + terlambat.</div></div>';
  $('#app-container').innerHTML = h;
  $('#f-rp').addEventListener('submit', function (e) { e.preventDefault(); const d = formData(e.target); navigateTo('rapat', d, true); });
  $('#rp-semua').addEventListener('change', function (e) { $$('.rp-cb').forEach(function (c) { c.checked = e.target.checked; P.rpPilih[c.dataset.id] = e.target.checked ? 1 : 0; }); });
  $$('.rp-cb').forEach(function (c) { c.addEventListener('change', function () { P.rpPilih[c.dataset.id] = c.checked ? 1 : 0; }); });
}
ACT['rp-cetak'] = function () {
  const r = P.rp;
  siapKop().then(function () {
    const html = '<div class="pr-doc">' + kopCetak({}) + '<h2 class="pr-title">REKAP DATA MURID UNTUK RAPAT KELAS</h2><div class="pr-sub">Kelas ' + esc(r.namaKelas) + ' · Periode ' + esc(tglPanjang(r.dari)) + ' s.d. ' + esc(tglPanjang(r.sampai)) + '</div>' +
      '<table class="pr-tbl"><thead><tr><th>No</th><th>Nama</th><th>NIS</th><th>Hadir harian</th><th>S</th><th>I</th><th>A</th><th>T</th><th>Alpa mapel</th><th>Kasus</th>' + (r.poinAktif ? '<th>Poin</th>' : '') + '<th>Layanan BK</th><th>Kontak ortu</th><th>Catatan pola</th></tr></thead><tbody>' +
      r.rows.map(function (x, i) { return '<tr' + (x.perhatian ? ' style="background:#FFF7ED"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.nis) + '</td><td>' + (x.harian === null ? '-' : x.harian + '%') + '</td><td>' + x.hS + '</td><td>' + x.hI + '</td><td>' + x.hA + '</td><td>' + x.hT + '</td><td>' + x.mA + '</td><td>' + x.kasus + (x.aktif ? ' (' + x.aktif + ' aktif)' : '') + '</td>' + (r.poinAktif ? '<td>' + (x.poin === null ? '-' : x.poin) + '</td>' : '') + '<td>' + x.layanan + '</td><td>' + x.kontak + '</td><td>' + esc(x.pola ? x.pola.teks : '') + '</td></tr>'; }).join('') +
      '</tbody></table><p class="pr-ket">Baris berwarna = murid yang perlu perhatian. Dokumen internal sekolah; isi konseling tidak dicantumkan.</p>' +
      ttdCetak(ttdOrang('Wali Kelas', r.wali), ttdOrang('Guru BK', hasRole('guru_bk') ? S.user.nama : '', hasRole('guru_bk') ? S.user.nip : '')) + '</div>';
    cetakHtml(html, { judul: 'Rekap rapat kelas ' + r.namaKelas, landscape: true });
  });
};
ACT['rp-cetak-gw'] = function (el) {
  const ids = Object.keys(P.rpPilih || {}).filter(function (k) { return P.rpPilih[k]; });
  if (!ids.length) { toast('Centang dulu murid yang akan dicetak garis waktunya.', 'err'); return; }
  pilihVersiCetak(function (versi) {
    run(el, Promise.all([siapKop(), api('riwayat.banyak', { ids: ids.slice(0, 40) })])).then(function (res) {
      const ok = res[1].filter(function (d) { return d && d.murid; });
      const gagal = res[1].length - ok.length;
      if (!ok.length) { toast('Tidak ada garis waktu yang dapat dicetak.', 'err'); return; }
      cetakHtml(ok.map(function (d) { return gwDok(d, versi, P.rp.dari, P.rp.sampai); }).join(''), { judul: 'Garis waktu ' + ok.length + ' murid' + (gagal ? ' (' + gagal + ' dilewati)' : '') });
    }).catch(fail);
  });
};

// ── Cetak garis waktu satu murid (dari halaman Garis Waktu) ──
function pilihVersiCetak(lanjut, periode) {
  const m = openModal({
    title: 'Cetak garis waktu', sub: 'Pilih untuk siapa lembar ini dicetak',
    body: '<div class="col gap-8"><label class="sec row" style="gap:10px;cursor:pointer"><input type="radio" name="gw-v" value="internal" checked><div><b>Internal sekolah</b><div class="xs muted">Lengkap untuk rapat guru/BK: nama pencatat dan catatan tindak lanjut.</div></div></label>' +
      '<label class="sec row" style="gap:10px;cursor:pointer"><input type="radio" name="gw-v" value="ortu"><div><b>Untuk orang tua</b><div class="xs muted">Bahasa netral, tanpa nama guru (diganti perannya) dan tanpa catatan internal BK. Periksa uraian kejadian sebelum diserahkan bila menyebut murid lain.</div></div></label></div>' +
      (periode ? '<div class="form-grid c2 mt-12">' + fld({ name: 'dari', id: 'gw-dari', label: 'Dari', type: 'date', value: periode.dari, maxv: S.today }) + fld({ name: 'sampai', id: 'gw-sampai', label: 'Sampai', type: 'date', value: periode.sampai, maxv: S.today }) + '</div>' : '') +
      '<p class="xs muted mt-12">Isi konseling tidak pernah dicetak; hanya tercantum bahwa layanan pernah diberikan.</p>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="gw-ok"><i class="bi bi-printer"></i> Cetak</button>'
  });
  $('#gw-ok', m.el).addEventListener('click', function () {
    const v = ($('input[name=gw-v]:checked', m.el) || {}).value || 'internal';
    const d = periode ? { dari: $('#gw-dari', m.el).value, sampai: $('#gw-sampai', m.el).value } : null;
    m.close(); lanjut(v, d);
  });
}
function semesterIni() {
  const th = String(S.cfg.tahunAjaran || '').split('/'), a = +th[0], b = +th[1];
  const r = S.cfg.semester === 'Genap' && b ? { dari: b + '-01-01', sampai: b + '-06-30' } : a ? { dari: a + '-07-01', sampai: a + '-12-31' } : { dari: addD(S.today, -180), sampai: S.today };
  if (r.sampai > S.today) r.sampai = S.today;
  return r;
}
const GW_RINGKAS = { absensi: 1, harian: 1 }, GW_ORTU_TIDAK = { tinjau: 1, instrumen: 1, permintaan: 1, monitoring: 1 };
function gwDok(d, versi, dari, sampai) {
  const m = d.murid, r = d.ringkas, ortu = versi === 'ortu';
  dari = dari || addD(S.today, -180); sampai = sampai || S.today;
  const ev = d.timeline.filter(function (e) { return e.tanggal >= dari && e.tanggal <= sampai && !(e.tipe in GW_RINGKAS) && !(ortu && e.tipe in GW_ORTU_TIDAK); })
    .sort(function (a, b) { return (a.tanggal + (a.ts || '')) < (b.tanggal + (b.ts || '')) ? -1 : 1; }); // kronologis
  const rb = (d.rekapBulan || []).filter(function (x) { return x.bulan >= dari.substr(0, 7) && x.bulan <= sampai.substr(0, 7); });
  const ab = r.absenHarian || {};
  const isi = function (e) {
    if (e.tipe === 'layanan_privasi' || e.tipe === 'layanan') return 'Layanan bimbingan dan konseling' + (e.meta && !ortu ? ' (' + e.meta + ')' : '');
    if (ortu && e.tipe === 'rujukan') return 'Ditindaklanjuti oleh Guru BK.';
    return e.isi || '';
  };
  const oleh = function (e) { return ortu ? (TIPE_LABEL[e.tipe === 'layanan_privasi' ? 'layanan' : e.tipe] || '') : (e.oleh || ''); };
  return '<div class="pr-doc pr-break">' + kopCetak({}) + '<h2 class="pr-title">' + (ortu ? 'CATATAN PERKEMBANGAN MURID' : 'GARIS WAKTU MURID (INTERNAL)') + '</h2>' +
    '<div class="pr-sub">Periode ' + esc(tglPanjang(dari)) + ' s.d. ' + esc(tglPanjang(sampai)) + '</div>' +
    '<div class="pr-kls"><span>Nama: <b>' + esc(m.nama) + '</b> · NIS ' + esc(m.nis) + '</span><span>Kelas: ' + esc(m.kelas) + ' · Wali kelas: ' + esc(m.wali || '-') + (m.guruWali ? ' · Guru wali: ' + esc(m.guruWali) : '') + '</span></div>' +
    '<div class="pr-h3">Ringkasan</div><table class="pr-tbl"><thead><tr><th>Bulan</th><th>Hari tercatat</th><th>Kehadiran</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Terlambat</th><th>Alpa per mapel</th></tr></thead><tbody>' +
    (rb.length ? rb.map(function (x) { return '<tr><td>' + esc(blnPanjang(x.bulan)) + '</td><td>' + x.hari + '</td><td>' + (x.hadir === null ? '-' : x.hadir + '%') + '</td><td>' + x.S + '</td><td>' + x.I + '</td><td>' + x.A + '</td><td>' + x.T + '</td><td>' + x.alpaMapel + '</td></tr>'; }).join('') : '<tr><td colspan="8">Belum ada data kehadiran pada periode ini.</td></tr>') + '</tbody></table>' +
    '<p class="pr-ket">Laporan kejadian: ' + r.laporan + ' (' + r.laporanAktif + ' masih ditangani) · Layanan BK diikuti: ' + r.layanan + ' · Kontak orang tua: ' + d.komunikasi.length + (r.poin ? ' · Poin tata tertib: ' + r.poin.B + (r.poin.tahap ? ' (' + esc(r.poin.tahap.n) + ')' : '') : '') + (r.pola && !ortu ? ' · Pola kehadiran: ' + esc(r.pola) : '') + '</p>' +
    '<div class="pr-h3">Catatan peristiwa</div><table class="pr-tbl"><thead><tr><th style="width:80px">Tanggal</th><th style="width:150px">Peristiwa</th><th>Uraian</th>' + '<th style="width:110px">' + (ortu ? 'Pihak' : 'Oleh') + '</th></tr></thead><tbody>' +
    (ev.length ? ev.map(function (e) { return '<tr><td>' + esc(fTgl(e.tanggal)) + '</td><td>' + esc(ortu && e.tipe === 'layanan_privasi' ? 'Layanan BK' : e.judul) + '</td><td>' + esc(isi(e)) + '</td><td>' + esc(oleh(e)) + '</td></tr>'; }).join('') : '<tr><td colspan="4">Tidak ada catatan peristiwa pada periode ini.</td></tr>') + '</tbody></table>' +
    '<p class="pr-ket">' + (ortu ? 'Lembar ini disusun dari catatan sekolah untuk dibicarakan bersama orang tua/wali.' : 'Dokumen internal sekolah. Isi konseling tidak dicantumkan.') + ' Absensi per sesi diringkas per bulan.</p>' +
    ttdCetak(ortu ? ttdOrang('Orang tua/wali murid', '') : ttdOrang('Wali Kelas', m.wali), ttdOrang(hasRole('guru_bk') ? 'Guru BK' : hasRole('wali_kelas') ? 'Wali Kelas' : 'Guru', S.user.nama, S.user.nip)) + '</div>';
}
ACT['gw-cetak'] = function () {
  const d = P.rwd; if (!d) return;
  pilihVersiCetak(function (versi, per) {
    siapKop().then(function () { cetakHtml(gwDok(d, versi, per.dari, per.sampai), { judul: 'Garis waktu ' + d.murid.nama }); });
  }, semesterIni());
};
ACT['rw-rapat'] = function () { navigateTo('rapat', P.rwd && P.rwd.murid ? { id_kelas: P.rwd.murid.id_kelas || '' } : {}); };

// ── Lapor kejadian: draf otomatis & ingat cara penanganan ──
function lapDrafKey() { return 'sk_lapdraf_' + (S.user ? S.user.email : ''); }
function lapDrafSimpan() {
  const f = $('#f-lap'); if (!f || !P.lap) return;
  const d = formData(f);
  const ada = (d.kronologi || '').trim() || (d.tindakan || '').trim() || (d.alasan || '').trim();
  try {
    if (!ada) { localStorage.removeItem(lapDrafKey()); return; }
    localStorage.setItem(lapDrafKey(), JSON.stringify({ t: Date.now(), d: d, kat: P.lap.kategori, urg: P.lap.urgensi, mode: P.lap.mode, murids: (P.lap.murids || []).map(function (m) { return { id: m.id, nama: m.nama, kelas: m.kelas, id_kelas: m.id_kelas, nis: m.nis }; }) }));
  } catch (e) { /* abaikan */ }
}
function lapDrafAmbil() {
  try { const o = JSON.parse(localStorage.getItem(lapDrafKey()) || 'null'); if (o && Date.now() - o.t < 864e5) return o; localStorage.removeItem(lapDrafKey()); } catch (e) { /* abaikan */ }
  return null;
}
function lapDrafHapus() { try { localStorage.removeItem(lapDrafKey()); } catch (e) { /* abaikan */ } }
function lapSetelahRender(params) {
  const f = $('#f-lap'); if (!f) return;
  const kr = $('#f_kronologi');
  if (kr && !$('#lap-dikte')) kr.insertAdjacentHTML('afterend', '<div class="xs muted" id="lap-dikte" style="margin-top:4px"><i class="bi bi-lightbulb"></i> Tips: di HP, ketuk ikon mikrofon pada keyboard untuk mendikte kronologi, lalu rapikan seperlunya.</div>');
  const dr = P.lap.draf && !P.lap.drafDipakai ? P.lap.draf : null;
  if (dr) {
    P.lap.drafDipakai = true;
    Object.keys(dr.d || {}).forEach(function (k) { const el = f.elements[k]; if (el && dr.d[k] && el.type !== 'file') el.value = dr.d[k]; });
    if (kr && $('#kr-count')) $('#kr-count').textContent = kr.value.length + ' / 5000';
    f.insertAdjacentHTML('afterbegin', '<div class="note info" id="lap-draf-note"><i class="bi bi-clock-history"></i><div>Draf laporan yang belum terkirim dipulihkan. <a href="#" data-act="lap-draf-buang">Buang draf</a></div></div>');
  }
  let tm = null;
  f.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(lapDrafSimpan, 600); });
}
