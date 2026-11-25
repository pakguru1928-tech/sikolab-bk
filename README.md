# SIKOLAB BK — frontend

Sistem Informasi Kolaborasi Bimbingan dan Konseling. Frontend statis (Vercel/GitHub Pages); data diproses oleh backend Google Apps Script.

- `index.html` — aplikasi guru (masuk dengan email + PIN)
- `isi.html?kode=…` — pengisian instrumen murid
- `temu.html?kode=…` — formulir murid "Saya ingin bertemu Guru BK"
- `js/config.js` — alamat Web App Apps Script (`/exec`)
- `js/core.js`, `js/shell.js`, `js/pages/*.js`, `js/mulai.js` — kode aplikasi, dimuat berurutan
- `manifest.json`, `sw.js` — PWA (dapat dipasang di layar utama; berkas tampilan disimpan di perangkat, data tidak)

Dikembangkan oleh Iwa Salji Elbi Satria, UPT SMPN 3 Batipuh. Boleh dipakai dan diubah sekolah lain dengan tetap mencantumkan nama pengembang.
