# Panduan Migrasi SIKOLAB BK v1.9 ke GitHub Pages

Backend (data, PIN, hak akses) tetap di Google Apps Script yang sama. Hanya tampilan yang pindah ke GitHub Pages.
Alamat lama `/exec` tetap bisa dibuka sebagai cadangan. Data tidak dipindah dan tidak berubah.

## Berkas yang Anda terima

| Berkas | Untuk | Cara pakai |
|---|---|---|
| `Kode.gs` | Apps Script | Ganti seluruh isi berkas `Kode` |
| `JavaScript.html` | Apps Script | Ganti seluruh isi berkas `JavaScript` |
| `appsscript.json` | Apps Script | Sama seperti sebelumnya; cocokkan saja |
| `SIKOLAB_BK_v1.9_frontend.zip` | GitHub | Ekstrak → folder `sikolab-bk` → itulah yang diunggah ke GitHub |

`Stylesheet.html`, `Index.html`, `Isi.html`, `Temu.html`, `FormIsi.html` tidak berubah dari v1.8.

---

## Bagian A — Perbarui backend Apps Script (±5 menit)

1. Buka proyek SIKOLAB BK di script.google.com.
2. Ganti seluruh isi `Kode.gs` dan `JavaScript.html` dengan berkas v1.9. Simpan (Ctrl + S).
3. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.**
   Alamat `/exec` tetap sama. Jangan pakai *New deployment*.
4. Salin alamat **Web app URL** (berakhiran `/exec`). Alamat ini dipakai di Bagian B.
5. Uji: buka `ALAMAT_EXEC?api=status` di peramban. Harus tampil teks berawalan `{"success":true`.

Yang baru di backend: fungsi `doPost` (pintu data untuk GitHub) dan isian **Alamat frontend** di Pengaturan.
Semua pemeriksaan hak akses tetap dijalankan di server untuk setiap aksi.

---

## Bagian B — Siapkan folder frontend

1. Ekstrak `SIKOLAB_BK_v1.9_frontend.zip`, misalnya ke `Documents`. Hasilnya folder **`sikolab-bk`**.
2. Buka `sikolab-bk\js\config.js` dengan Notepad. Ganti alamat contoh dengan alamat `/exec` dari Bagian A:

   ```js
   window.SIKOLAB_GAS_URL = 'https://script.google.com/macros/s/AKfy...xxx/exec';
   ```
   Simpan. Tanpa langkah ini, situs akan menampilkan "Alamat server belum diatur".
3. Isi folder harus seperti ini (`index.html` langsung di dalam `sikolab-bk`):

   ```
   sikolab-bk\
   ├── index.html      ← aplikasi guru
   ├── isi.html        ← pengisian instrumen murid
   ├── temu.html       ← formulir "bertemu Guru BK"
   ├── README.md
   ├── .nojekyll
   ├── css\style.css
   └── js\config.js, api.js, app.js, formisi.js
   ```

**Folder yang di-`git init` adalah `sikolab-bk`**, bukan folder di atasnya.

---

## Bagian C — Unggah ke GitHub (Windows, PowerShell)

### C1. Buat repository
github.com → **+** → **New repository** → nama `sikolab-bk` → **Public** → jangan centang README/.gitignore/license → **Create repository**.
Biarkan halaman itu terbuka.

### C2. Buka PowerShell di folder yang benar
Buka folder `sikolab-bk` di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu:

```powershell
dir
```
Baris yang tampil harus memuat `index.html`, `css`, `js`. Kalau yang tampil justru folder `sikolab-bk`, masuk dulu: `cd sikolab-bk`.

### C3. Kirim pertama kali (satu per satu)
```powershell
git init
git add .
git commit -m "SIKOLAB BK v1.9 frontend"
git branch -M main
git remote add origin https://github.com/USERNAME/sikolab-bk.git
git push -u origin main
```
- `git add .` diakhiri **titik**.
- Saat diminta password, pakai **Personal Access Token** (github.com/settings/tokens → Generate new token (classic) → centang **repo**). Saat token ditempel, layar memang kosong; itu normal.
- Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C4. Aktifkan GitHub Pages
Repository → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save**.
Centang **Enforce HTTPS** (wajib agar kamera Pindai Hadir berfungsi).
Tunggu 1–2 menit. Alamat situs: `https://USERNAME.github.io/sikolab-bk/`.

---

## Bagian D — Hubungkan dan uji

1. Buka `https://USERNAME.github.io/sikolab-bk/`, masuk sebagai admin (email + PIN).
2. **Administrasi → Pengaturan → Alamat frontend GitHub Pages**: isi `https://USERNAME.github.io/sikolab-bk/` → Simpan.
   Sejak itu tautan instrumen, poster "bertemu Guru BK", email, dan WhatsApp mengarah ke GitHub.
3. Uji: buka beberapa menu, simpan satu absensi, buka tautan pengisian instrumen dari HP, coba Pindai Hadir dengan kamera.
4. Bagikan alamat GitHub ke guru. Guru masuk sekali lagi (email + PIN), karena sesi tersimpan per alamat.

---

## Memperbarui di kemudian hari

1. Apps Script: ganti berkas yang berubah → Manage deployments → New version.
2. Frontend: ganti isi folder `sikolab-bk` dengan paket baru, **kecuali `js\config.js`** (alamat server Anda), lalu:
   ```powershell
   git add .
   git commit -m "Pembaruan vX.Y"
   git push
   ```
3. Tunggu 1–2 menit; bila masih versi lama, tekan Ctrl + Shift + R.

Paket frontend dibangkitkan otomatis dari berkas Apps Script (`build_frontend.js`), sehingga keduanya selalu sama versinya.

---

## Yang tetap dilakukan dari alamat `/exec` (akun Google pemilik)

- Pengaturan awal aplikasi baru (layar "Pengaturan awal").
- Hapus data contoh.
- `resetPinAdmin` dari editor Apps Script.

Di GitHub, masuk selalu dengan email + PIN; pengenalan otomatis akun Google tidak berlaku dari luar Apps Script.

---

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Alamat server belum diatur" | `js/config.js` belum diisi | Isi URL `/exec`, lalu add–commit–push |
| "Balasan server tidak terbaca" | Deploy belum versi baru, atau akses bukan *Anyone* | Manage deployments → New version; Who has access: Anyone |
| "Aksi tidak dikenal" | `Kode.gs` masih versi lama | Ganti `Kode.gs` v1.9, deploy versi baru |
| Halaman 404 | `index.html` tidak di root repo | Lihat repo di peramban; push ulang dari folder `sikolab-bk` |
| Tampilan tanpa warna | Folder `css/` `js/` tidak ikut | Push lewat terminal, jangan "Upload files" di web |
| Tautan instrumen masih ke `/exec` | Alamat frontend belum diisi | Bagian D langkah 2 |
| Kamera tidak terbuka | HTTPS belum dipaksa atau izin ditolak | Centang Enforce HTTPS; izinkan kamera di Chrome |
| Versi lama tetap tampil | Cache peramban | Ctrl + Shift + R |

## Kecepatan (perkiraan jujur)

Halaman terbuka lebih cepat karena tidak ada bingkai Google. Setiap panggilan data tetap ±1–3 detik (kecepatan server Google),
bisa sedikit lebih lama karena pengalihan alamat oleh Google. Cache halaman v1.7–1.8 tetap menutupinya: menu yang pernah dibuka tampil seketika.
