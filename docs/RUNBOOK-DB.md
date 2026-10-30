# RUNBOOK — Database Produksi MIS SHOP OPS

> **Untuk:** operator/user MIS OPS. **Sifat:** SOP operasional, **read-only** terhadap DB produksi.
> **Dibuat:** 31 Okt 2026 (SHIFT 2) · **Rujukan angka:** `docs/DATA-HEALTH.md`, `docs/DATA-AUDIT.md`, `docs/RECAP-ASET.md`.
> Dokumen ini **tidak** mengubah data, skema, script, maupun Task Scheduler.

---

## 1. Inventaris Database

| Item | Nilai |
|---|---|
| Lokasi DB | `C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS\shop_ops.db` |
| File pendamping | `shop_ops.db-wal` (write-ahead log) + `shop_ops.db-shm` (shared memory) |
| Mode jurnal | **WAL** (`PRAGMA journal_mode` → `wal`) |
| Jumlah tabel | **15 tabel** (aplikasi) + `sqlite_sequence` internal |
| Total baris | **982 baris** (baseline rilis) |
| Index | **17 index eksplisit** (+ 13 `sqlite_autoindex` UNIQUE = 30 total) — semua 17 dideklarasikan di `initDb()` (`src/lib/db.ts`) |
| Ukuran contoh (31 Okt 00:38) | DB **±412 KB** · WAL **±241 KB** · SHM **32 KB** — WAL bisa membesar sementara (pernah ±3,9 MB) sebelum checkpoint |
| Folder backup | `backups\db_<YYYYMMDD_HHMMSS>\shop_ops.db` |
| Snapshot saat ini | **2 snapshot**: `db_20261030_233502` (368 KB) dan `db_20261030_235757` (396 KB) |
| Retensi | **7 snapshot terbaru**; snapshot Lead `db_20261030_233502` **selalu dilindungi** (tidak dihapus script) |
| Akses kode | `@libsql/client` via `src/lib/db.ts` (server Next.js di `:3000`) |

### 1.1 Sebaran baris per tabel (baseline 982)

| Tabel | Baris | Tabel | Baris |
|---|---:|---|---:|
| `assets` | 159 | `purchases` | 11 |
| `monitoring_devices` | 167 | `role_permissions` | 130 |
| `server_rack_ports` | 135 | `server_rack_units` | 23 |
| `office_hardware_assets` | 77 | `t3_fixed_assets` | 35 |
| `pos_hardware_assets` | 68 | `tickets` | 2 |
| `edc_assets` | 53 | `users` | 43 |
| `phone_extensions` | 47 | `knowledge_base` | 5 |
| `dvr_assets` | 27 | **TOTAL** | **982** |

### 1.2 Cek integritas manual (read-only)

Bisa dijalankan lewat script `scripts/db-health.mjs` (lebih lengkap) atau langsung via client/SQLite:

```sql
PRAGMA integrity_check;   -- harus "ok" (atau baris "ok")
PRAGMA quick_check;       -- harus "ok"
PRAGMA journal_mode;      -- harus "wal"
```

PowerShell (root proyek):
```powershell
cd "C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS"
node scripts/db-health.mjs
```

> Hasil saat ini yang **diharapkan**: `integrity_check=ok`, `quick_check=ok`, tetapi **exit code 1** karena ada **17 orphan data `edc_assets.pos_location`** dan 1 duplikat IP yang bersifat *pre-existing* (lihat §6 Known Issues). Ini **bukan** tanda DB rusak.

---

## 2. Script yang Tersedia & Cara Membaca Hasilnya

Semua dijalankan **dari root proyek**. Tidak perlu `npm install`.

| Script | Fungsi | Menulis ke | Exit code |
|---|---|---|---|
| `node scripts/db-health.mjs` | Audit kesehatan: row count 15 tabel, `integrity_check`/`quick_check`, ukuran DB/WAL, daftar index, orphan lintas tabel, EXPLAIN query plan | `docs/DATA-HEALTH.md` (dokumen, bukan DB) | `0` sehat · `1` ada orphan/integritas gagal/index hilang |
| `node scripts/backup-db.mjs` | Snapshot konsisten `VACUUM INTO backups\db_<ts>\shop_ops.db` + verifikasi snapshot + retensi 7 (snapshot Lead dilindungi) | `backups\...` | `0` sukses · `1` gagal |
| `node scripts/backup-verify.mjs` | **Restore snapshot terbaru ke `%TEMP%`** (tidak menyentuh DB live), cek `quick_check`, 15 tabel, 982 baris, bandingkan row count per tabel vs live, cek sha256 | `%TEMP%\mis-shop-ops-backup-verify\verify_<ts>\shop_ops.db` | `0` semua cocok · `1` mismatch |
| `node scripts/db-audit.mjs` | Audit kualitas data: duplikat, null density, status/enum, orphan EDC + kandidat fuzzy, rekap nilai | `docs/DATA-AUDIT.md` (dokumen) | `0` tanpa blocker · `1` ada orphan/enum/integritas (desain) |
| `node scripts/export-recap.mjs` | Rekap jumlah & estimasi nilai aset per lokasi/kategori + purchases | `docs/RECAP-ASET.md` (dokumen) | `0` |
| `node scripts/verify.mjs` | Gate rilis lengkap: `tsc --noEmit` → smoke API → kontrak POST → unit test | — (butuh server hidup) | `0` semua lulus · `1` ada langkah gagal |
| `node tests/regression.mjs` | Gate regresi ringan setelah tiap perubahan: smoke + `/api/health` + baris DB = 982 | `tests/regression-last-run.json` | `0` PASS · `1` FAIL |

> **Penting:** `db-health`, `backup-db`, `backup-verify`, `db-audit`, `export-recap` **tidak mengubah data bisnis**. Yang `VACUUM INTO` hanya **membuat file snapshot baru**; `backup-verify` hanya **membaca** DB live.

### 2.1 Detail `backup-verify.mjs` (restore ke `%TEMP%`)

1. Memilih snapshot terbaru di `backups\` (atau path argumen: `node scripts/backup-verify.mjs backups\db_20261030_235757\shop_ops.db`).
2. Menyalin snapshot ke `%TEMP%\mis-shop-ops-backup-verify\verify_<timestamp>\shop_ops.db` (sha256 sumber dibandingkan dengan hasil salinan).
3. Membuka **salinan** tersebut: `quick_check`, 15 tabel, total 982 baris.
4. Membandingkan row count **per tabel** dengan DB live (koneksi read-only).
5. Mencetak `STATUS: RESTORE-VERIFY LULUS/GAGAL` + path bukti restore di `%TEMP%`.

> DB live **tidak pernah** ditimpa oleh script ini. Restore ke lokasi produksi hanya dilakukan manual (§5) setelah user setuju.

---

## 3. SOP Rutin

### 3.1 Harian (akhir hari, sebelum tutup)

1. **Backup:** `node scripts/backup-db.mjs` → pastikan exit `0` dan muncul `Snapshot : backups/db_<timestamp>/shop_ops.db` + `quick_check: ok`.
2. **Cek cepat kesehatan:** `node scripts/db-health.mjs` → baca ringkasan. Exit `1` **normal** selama penyebabnya tetap 17 orphan EDC pre-existing (bandingkan dengan `docs/DATA-HEALTH.md`).
3. Pastikan jumlah baris **982** (tabel TOTAL) dan tidak ada perubahan tak terduga antar-hari.

### 3.2 Mingguan (mis. Sabtu pagi)

1. `node scripts/backup-verify.mjs` → wajib `RESTORE-VERIFY LULUS` (exit `0`). Ini membuktikan snapshot terbaru benar-benar bisa direstore.
2. `node scripts/db-audit.mjs` → review `docs/DATA-AUDIT.md` (duplikat, null density, status, orphan).
3. `node scripts/export-recap.mjs` → review `docs/RECAP-ASET.md` bila ada kebutuhan rekap nilai aset.
4. `node tests/regression.mjs` → wajib exit `0` (server `:3000` harus hidup; **jangan restart** dari script).
5. Cek retensi folder `backups\` — harus ≤ 7 snapshot (snapshot Lead dikecualikan dan selalu ada).

### 3.3 Setelah setiap perubahan kode/data (batch)

1. `node tests/regression.mjs` (server boleh tetap jalan; script hanya GET).
2. Jika menyentuh DB/migrasi: `node scripts/db-health.mjs` + `node scripts/backup-verify.mjs`.
3. Catat hasil di `docs/DATA-HEALTH.md` (otomatis) dan log sprint (`docs/SHIFT2-LOG.md`).

---

## 4. Darurat — DB Terkunci / WAL Membesar

Gejala: API lambat/timeout, `SQLITE_BUSY`, WAL membesar terus, atau proses lain memegang lock.

**Urutan tindakan (JANGAN melompati langkah):**

1. **Jangan** `kill`/`taskkill` proses Node secara paksa/global (ingat `start-server.bat` mematikan **semua** proses node — catatan F12). Jangan pakai `runas` atau mematikan service sembarangan.
2. Cek siapa yang memegang file DB (PowerShell, read-only):
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
   Get-Process node | Select-Object Id,CPU,StartTime
   ```
3. **Hentikan penulisan secara wajar:** minta user menutup/menghentikan server aplikasi dari jendela konsolnya sendiri (Ctrl+C), atau hentikan proses yang **memang** server aplikasi setelah dikonfirmasi. Jangan menyentuh proses lain.
4. WAL besar **belum tentu korup**: WAL memang tumbuh selama ada koneksi aktif; SQLite melakukan checkpoint otomatis. Setelah server berhenti dan koneksi lepas, WAL akan mengecil/ter-checkpoint dengan sendirinya. **Jangan menghapus `-wal`/`-shm` saat server hidup.**
5. Ambil bukti sebelum tindakan lain (salinan, bukan hapus):
   ```powershell
   $ts = Get-Date -Format "yyyyMMdd_HHmmss"
   New-Item -ItemType Directory -Force "backups\incident_$ts" | Out-Null
   Copy-Item shop_ops.db, shop_ops.db-wal, shop_ops.db-shm "backups\incident_$ts\" -ErrorAction SilentlyContinue
   ```
6. Jalankan `node scripts/db-health.mjs`. Jika `integrity_check` **ok** → DB sehat, lanjutkan operasional normal.
7. Jika `integrity_check` **gagal** → ikuti §5 (restore dari snapshot). Jangan mencoba `REINDEX`/`VACUUM`/`DROP` manual.

**Eskalasi bila:** lock berulang >30 menit, `integrity_check` gagal, WAL tidak mengecil setelah server berhenti, atau data terlihat hilang/berubah.

---

## 5. Darurat — Korupsi DB & Prosedur Restore (MANUAL, user-only)

> ⚠️ Langkah di bawah **mengganti file DB produksi**. Jalankan **hanya** bila `integrity_check` gagal atau data rusak parah, **hanya oleh user**, saat server **sudah berhenti**. Agent tidak boleh mengeksekusi prosedur ini.

**Prasyarat:**
- Server aplikasi berhenti (tidak ada koneksi ke `shop_ops.db`).
- Sudah ada snapshot yang **lolos verifikasi**.

**Langkah:**

1. **Verifikasi snapshot terbaru** (tidak menyentuh DB live):
   ```powershell
   node scripts/backup-verify.mjs
   ```
   Harus `RESTORE-VERIFY LULUS` (exit `0`). Catat path hasil restore di `%TEMP%\mis-shop-ops-backup-verify\verify_<ts>\shop_ops.db`.
2. **Karantina file DB yang rusak** (pindahkan, jangan hapus — bukti investigasi):
   ```powershell
   $ts = Get-Date -Format "yyyyMMdd_HHmmss"
   New-Item -ItemType Directory -Force "backups\incident_$ts" | Out-Null
   Move-Item shop_ops.db     "backups\incident_$ts\shop_ops.db.corrupt"
   Move-Item shop_ops.db-wal "backups\incident_$ts\shop_ops.db-wal.corrupt" -ErrorAction SilentlyContinue
   Move-Item shop_ops.db-shm "backups\incident_$ts\shop_ops.db-shm.corrupt" -ErrorAction SilentlyContinue
   ```
3. **Salin snapshot hasil verifikasi ke lokasi DB:**
   ```powershell
   Copy-Item "$env:TEMP\mis-shop-ops-backup-verify\verify_<ts>\shop_ops.db" ".\shop_ops.db" -Force
   ```
   (Ganti `<ts>` dengan folder hasil langkah 1. Setelah restore, SQLite akan membuat `-wal`/`-shm` baru secara otomatis saat aplikasi start.)
4. **Verifikasi hasil restore:**
   ```powershell
   node scripts/db-health.mjs
   ```
   Harus `integrity_check=ok`, `quick_check=ok`, total baris **982** (exit `1` tetap normal karena 17 orphan EDC pre-existing).
5. **Nyalakan server** seperti biasa (dari jendela konsol user, `npm run start`) dan uji `GET http://localhost:3000/api/health` → `success:true`.
6. **Dokumentasikan** waktu kejadian, snapshot yang dipakai, dan hasil verifikasi di `docs/LAPORAN-PAGI.md`/`docs/SHIFT2-LOG.md`.

**Yang DILARANG saat darurat:**
- ❌ `runas` / kill paksa semua proses node.
- ❌ Menghapus `-wal`/`-shm` saat server masih hidup.
- ❌ `DROP`/`DELETE`/`UPDATE` manual untuk "membersihkan" data.
- ❌ `VACUUM` penuh atau mengubah skema tanpa backup & persetujuan user.
- ❌ Menimpa DB live sebelum snapshot lolos `backup-verify`.

---

## 6. Known Issues (pre-existing, JANGAN diperbaiki otomatis)

| # | Temuan | Dampak pada runbook | Rujukan |
|---|---|---|---|
| 1 | **17 `edc_assets.pos_location` tanpa master `pos_hardware_assets`** | `db-health`/`db-audit` exit `1` **normal** | `DATA-HEALTH.md` §6.1, `DATA-AUDIT.md` §5 |
| 2 | **1 IP ganda** `pos_hardware_assets.ip_address` (`172.19.20.34` ×2: CGKT3DFD03-P04/P05) | warning duplikat, bukan blocker | `DATA-AUDIT.md` §2.1 |
| 3 | **`monitoring_devices` 25 baris `DVR-*`** tidak ada di `assets`/POS | bukan orphan — sah merujuk `dvr_assets` | `DATA-HEALTH.md` §6.2 |
| 4 | **`purchases.item_price` = 0 pada 8/11 PO** | rekap memakai `total_price` | `DATA-AUDIT.md`, `RECAP-ASET.md` §4 |
| 5 | **`users.updated_at` 100% NULL**; beberapa kolom kosong ≥50% | hanya kualitas data; tidak memblokir backup/restore | `DATA-AUDIT.md` §3 |

> Semua koreksi data di atas **butuh persetujuan user** — tidak boleh dilakukan otomatis.

---

## 7. Jadwal Otomatis (Task Scheduler) — ⛔ JALANKAN SENDIRI

> ### ⛔ JALANKAN SENDIRI, **jangan dieksekusi oleh agent**.
> Perintah di bawah adalah **contoh** untuk user jalankan di PowerShell (Administrator) bila ingin backup otomatis. Agent **tidak** membuat/mengubah/menjalankan task scheduler. Hapus `#` komentar saat menyalin. `/F` menimpa task dengan nama sama — periksa dulu.

**Backup harian 23:00:**
```powershell
# JALANKAN SENDIRI — jangan dieksekusi agent
schtasks /create /TN "MISShopOps-BackupDB" /SC DAILY /ST 23:00 /F `
  /TR "cmd /c cd /d \"C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS\" && node scripts\backup-db.mjs"
```

**Cek kesehatan mingguan (Minggu 07:00):**
```powershell
# JALANKAN SENDIRI — jangan dieksekusi agent
schtasks /create /TN "MISShopOps-DBHealth" /SC WEEKLY /D SUN /ST 07:00 /F `
  /TR "cmd /c cd /d \"C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS\" && node scripts\db-health.mjs"
```

**Verifikasi restore mingguan (opsional, Sabtu 07:30):**
```powershell
# JALANKAN SENDIRI — jangan dieksekusi agent
schtasks /create /TN "MISShopOps-BackupVerify" /SC WEEKLY /D SAT /ST 07:30 /F `
  /TR "cmd /c cd /d \"C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS\" && node scripts\backup-verify.mjs"
```

Catatan: task berjalan sebagai user yang login; pastikan Node ada di PATH user tersebut. Log exit code bisa dicek lewat `schtasks /query /tn "MISShopOps-BackupDB" /v /fo LIST` atau tambahkan redireksi output ke file log (di luar scope agent ini).

---

## 8. Checklist Rilis

- [ ] `node scripts/backup-db.mjs` → exit `0`, snapshot baru tercatat.
- [ ] `node scripts/backup-verify.mjs` → `RESTORE-VERIFY LULUS`, 15 tabel, 982 baris cocok.
- [ ] `node scripts/db-health.mjs` → `integrity_check=ok`, `quick_check=ok`; exit `1` hanya karena known issue §6.
- [ ] `node tests/regression.mjs` → exit `0` (baris DB 982, health ok) — server `:3000` hidup.
- [ ] `node scripts/db-audit.mjs` → review `docs/DATA-AUDIT.md`; tidak ada blocker baru.
- [ ] `docs/DATA-HEALTH.md`, `docs/DATA-AUDIT.md`, `docs/RECAP-ASET.md` terbarui.
- [ ] Server produksi tetap hidup; tidak ada `next build`/restart yang tidak direncanakan.

## 9. Checklist Rollback

- [ ] Hentikan penulisan/server secara wajar (bukan kill paksa).
- [ ] Pilih snapshot yang **sudah lolos** `backup-verify` (idealnya snapshot sebelum rilis).
- [ ] Ikuti §5 (karantina DB saat ini → salin snapshot → verifikasi).
- [ ] `node scripts/db-health.mjs` + `node scripts/backup-verify.mjs` → integritas & row count 982.
- [ ] `node tests/regression.mjs` setelah server hidup kembali.
- [ ] Catat insiden + snapshot yang dipakai di `docs/LAPORAN-PAGI.md` / `docs/SHIFT2-LOG.md`.

## 10. Kontak & Eskalasi (internal)

- **Pemilik data / MIS OPS:** tim MIS OPS (interkom IT #201 / #202).
- **Eskalasi segera** bila: `integrity_check` gagal, data hilang/berubah massal, restore gagal, atau snapshot terbaru tidak lolos `backup-verify`.
- **Sertakan saat eskalasi:** output `db-health`, path snapshot yang dicoba, waktu kejadian, dan langkah yang sudah dilakukan.

## 11. Rujukan

- `docs/DATA-HEALTH.md` — kesehatan DB, row count, index, orphan.
- `docs/DATA-AUDIT.md` — duplikat, null density, enum, orphan + fuzzy, rekap nilai.
- `docs/RECAP-ASET.md` — rekap jumlah & estimasi nilai aset per lokasi/kategori.
- `tests/README.md` — smoke, kontrak POST, regression, unit test.
- `docs/BUGS.md`, `docs/TRIASE.md` — bug & triase.
- `scripts/backup-db.mjs`, `scripts/backup-verify.mjs`, `scripts/db-health.mjs`, `scripts/db-audit.mjs`, `scripts/export-recap.mjs`.

---

*Runbook ini hanya dokumentasi. Tidak ada perintah destruktif yang dijalankan otomatis oleh agent; semua perbaikan data/restore **manual oleh user** dengan backup yang terverifikasi.*
