/* SIKOLAB BK v1.15 — js/pages/23_kelas.js (dimuat setelah core.js dan shell.js; lihat urutan di core.js) */
'use strict';
// ════════════════════════════════════════════════════════════
// Kelas Saya (wali kelas) — ringkas: kondisi tiap murid perwalian + kontak orang tua
// ════════════════════════════════════════════════════════════
PAGES.kelas = function (params, tok) {
  // v1.14: kelas bawaan selalu diminta dengan id kosong agar kunjungan ulang memakai cache yang sama (tanpa hitung ulang)
  const kMinta = params.id_kelas || P.ksKelas || '', kId = kMinta && kMinta === P.ksBawaan ? '' : kMinta;
  return apiC('kelas.saya', { id_kelas: kId }).then(function (d) {
    if (!kId && d && d.idKelas) P.ksBawaan = d.idKelas;
    if (stale(tok)) return;
    P.kls = d; P.ksKelas = d.idKelas;
    if (!d.kelas.length) { $('#app-container').innerHTML = pageHead('Wali kelas', 'Kelas Saya', '', '') + '<div class="card pad">' + empty('bi-people', 'Anda belum ditetapkan sebagai wali kelas', 'Minta admin mengisi wali kelas pada menu Administrasi → Kelas.') + '</div>'; return; }
    const r = d.ringkas, hh = r.harianHariIni;
    let h = pageHead('Wali kelas', 'Kelas ' + d.nama, 'Pantau kondisi setiap murid perwalian. Ketuk nama murid untuk melihat garis waktunya.' + (d.guruBk ? ' Guru BK kelas: ' + d.guruBk + '.' : ''),
      (d.kelas.length > 1 ? '<select class="select" id="kls-sel" style="width:auto;min-height:40px">' + d.kelas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === d.idKelas ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select>' : '') +
      (S.cfg.qrAktif ? '<button class="btn" data-act="kartu-modal" data-kelas="' + esc(d.idKelas) + '"><i class="bi bi-qr-code"></i> Kartu QR</button>' : '') + '<button class="btn" data-act="ke-harian"><i class="bi bi-calendar-check"></i> Absensi harian</button>');
    h += '<div class="grid g-kpi k4">' + [
      ['teal', 'bi-people', 'Murid Aktif', r.murid, 'di kelas ini'],
      [hh ? 'blue' : 'amber', 'bi-calendar-check', 'Hari Ini', r.libur ? 'Libur' : hh ? hh.hadir + '/' + r.murid : r.harianQr ? r.harianQr + '/' + r.murid : 'Belum', r.libur ? r.libur : hh ? 'S ' + hh.S + ' · I ' + hh.I + ' · A ' + hh.A : r.harianQr ? 'sudah memindai kartu · lengkapi' : 'absensi harian belum dicatat'],
      ['indigo', 'bi-graph-up-arrow', 'Kehadiran 30 Hari', r.hadir30 === null ? '-' : r.hadir30 + '%', 'dari absensi harian'],
      ['rose', 'bi-exclamation-triangle', 'Perlu Perhatian', r.perhatian, r.poinAktif ? 'pola, kasus, alpa ≥ 3, atau tahap poin' : 'pola, kasus aktif, atau alpa ≥ 3']].map(function (x) {
      return '<div class="kpi ' + x[0] + '" style="cursor:default"><span class="k-ic"><i class="bi ' + x[1] + '"></i></span><div class="k-lb">' + x[2] + '</div><div><div class="k-v">' + x[3] + '</div><div class="k-s">' + x[4] + '</div></div></div>';
    }).join('') + '</div>';
    if (r.tanpaKontak) h += '<div class="note mt-16"><i class="bi bi-telephone"></i><div><b>' + r.tanpaKontak + ' murid</b> belum memiliki nomor WhatsApp orang tua yang valid. Lengkapi lewat tombol <b>Kontak</b> agar komunikasi lebih mudah.</div></div>';
    h += '<div class="card mt-16"><div class="card-head" style="flex-wrap:wrap"><div class="fchips" id="kls-f"><button class="fchip active" data-act="kls-f" data-f="">Semua</button><button class="fchip" data-act="kls-f" data-f="perhatian">Perlu perhatian</button><button class="fchip" data-act="kls-f" data-f="kontak">Kontak belum lengkap</button></div><div class="search" style="max-width:240px"><i class="bi bi-search"></i><input id="kls-q" type="search" placeholder="Cari murid…"></div></div>' +
      '<div class="tbl-wrap mt-12"><table class="tbl" id="kls-tbl" style="min-width:' + (r.poinAktif ? 980 : 860) + 'px"><thead><tr><th>Murid</th><th>Kehadiran 30 hr</th><th>S / I / A / T</th><th>Alpa mapel</th><th>Kasus aktif</th>' + (r.poinAktif ? '<th>Poin</th>' : '') + '<th>Layanan BK</th><th>Orang tua</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      d.murid.map(function (m, i) {
        const perhatian = m.pola || m.kasus || m.A >= 3 || !!m.poinTahap;
        return '<tr data-q="' + esc((m.nama + ' ' + m.nis).toLowerCase()) + '" data-p="' + (perhatian ? 1 : 0) + '" data-k="' + (m.hpValid ? 1 : 0) + '"><td class="click" data-act="open-murid" data-id="' + esc(m.id) + '" style="cursor:pointer"><div class="fw6">' + esc(m.nama) + ' ' + arahanIkon(m.id) + '</div><div class="xs muted">NIS ' + esc(m.nis) + '</div>' + (m.pola ? '<div class="mt-8">' + chipLevel(m.pola) + ' <span class="xs muted">' + esc(m.polaTeks) + '</span></div>' : '') + '</td>' +
          '<td>' + (m.hadir === null ? '<span class="muted">—</span>' : '<div class="row"><div class="bar" style="width:70px"><i style="width:' + m.hadir + '%"></i></div><b class="xs">' + m.hadir + '%</b></div>') + '</td>' +
          '<td class="xs">' + m.S + ' / ' + m.I + ' / <b' + (m.A ? ' style="color:var(--rose)"' : '') + '>' + m.A + '</b> / ' + m.T + '</td><td' + (m.alpaMapel ? ' style="color:var(--rose);font-weight:700"' : '') + '>' + m.alpaMapel + '</td>' +
          '<td>' + (m.kasus ? '<span class="chip st-Diproses">' + m.kasus + ' aktif</span>' : '<span class="muted">—</span>') + (m.laporan30 ? '<div class="xs muted">' + m.laporan30 + ' laporan / 30 hr</div>' : '') + '</td>' + (r.poinAktif ? '<td class="click" data-act="pn-murid" data-id="' + esc(m.id) + '" style="cursor:pointer">' + (m.poin ? '<b>' + m.poin + '</b>' + (m.poinTahap ? '<div class="mt-8"><span class="chip st-Eskalasi">' + esc(m.poinTahap) + '</span></div>' : '') : '<span class="muted">0</span>') + '</td>' : '') + '<td>' + (m.layanan ? m.layanan : '<span class="muted">—</span>') + '</td>' +
          '<td class="xs">' + (m.ortu ? esc(m.ortu) + '<br>' : '') + (m.hpValid ? '<span style="color:var(--teal)"><i class="bi bi-whatsapp"></i> ' + esc(m.hp) + '</span>' : '<span class="chip st-Baru">Belum ada</span>') + (m.kontak ? '<div class="muted">Kontak terakhir ' + esc(fTgl(m.kontak)) + '</div>' : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="kls-kontak" data-i="' + i + '">Kontak</button> <button class="btn sm blue" data-act="wa-murid" data-id="' + esc(m.id) + '" title="WhatsApp orang tua"><i class="bi bi-whatsapp"></i></button> <button class="btn sm" data-act="lap-murid" data-id="' + esc(m.id) + '" data-n="' + esc(m.nama) + '" title="Lapor kejadian"><i class="bi bi-plus-circle"></i></button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<p class="xs muted mt-12">Layanan BK = jumlah layanan umum (mis. bimbingan klasikal/kelompok) yang diikuti. Isi konseling tetap rahasia dan hanya dibuka Guru BK.</p><div id="kls-profil"></div>';
    $('#app-container').innerHTML = h;
    klsProfil(d.idKelas);
    const sel = $('#kls-sel'); if (sel) sel.addEventListener('change', function (e) { navigateTo('kelas', { id_kelas: e.target.value }); });
    $('#kls-q').addEventListener('input', klsFilter);
  });
};
function klsFilter() {
  const q = ($('#kls-q').value || '').trim().toLowerCase(), f = P.klsF || '';
  $$('#kls-tbl tbody tr').forEach(function (tr) {
    let ok = !q || tr.dataset.q.indexOf(q) >= 0;
    if (f === 'perhatian') ok = ok && tr.dataset.p === '1';
    if (f === 'kontak') ok = ok && tr.dataset.k === '0';
    tr.classList.toggle('hide', !ok);
  });
}
ACT['kls-f'] = function (el) { P.klsF = el.dataset.f; $$('#kls-f .fchip').forEach(function (b) { b.classList.toggle('active', b === el); }); klsFilter(); };
ACT['kls-kontak'] = function (el) {
  const x = P.kls.murid[+el.dataset.i];
  const m = openModal({
    title: 'Kontak orang tua', sub: x.nama,
    body: '<form id="f-kk" class="form-grid" novalidate>' + fld({ name: 'nama_ortu', label: 'Nama orang tua/wali', max: 100, value: x.ortu }) + fld({ name: 'no_wa_ortu', label: 'No. WhatsApp', type: 'tel', inputmode: 'tel', max: 20, value: x.hp, ph: '0812xxxxxxx' }) + fld({ name: 'email_ortu', label: 'Email (opsional)', type: 'email', max: 120, value: x.email }) + '</form>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="kk-ok">Simpan</button>'
  });
  $('#kk-ok', m.el).addEventListener('click', function (e) {
    const f = $('#f-kk', m.el), d = formData(f);
    if (!validate(f, d, { no_wa_ortu: { label: 'No. WhatsApp', re: /^[0-9+\-\s()]{8,20}$/, msg: 'Nomor tidak valid.' }, email_ortu: { label: 'Email', re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Email tidak valid.' } })) return;
    d.id_murid = x.id;
    run(e.currentTarget, api('kelas.ortuSimpan', d)).then(function () { m.close(); toast('Kontak orang tua tersimpan.'); navigateTo('kelas', { id_kelas: P.kls.idKelas }, true); }).catch(fail);
  });
};
