# ANALISIS PROYEK — MIS SHOP OPS
> Disusun oleh: Team Lead (DeepSeek Harness) · 30 Okt 2026 · sebelum sprint malam 5-agent
> Status kode: `tsc --noEmit` = 0 error · dev server aktif di `:3000` · data produksi ADA di SQLite

---

## 1. Identitas Proyek

| Aspek | Nilai |
|---|---|
| Nama | MIS SHOP OPS — Asset Management, Barcode Tracking & POS Monitoring |
| Pengguna | Tim MIS/IT Support Plaza Bali (Terminal 3 Soekarno-Hatta, Terminal 2, Surabaya) + SPV Toko |
| Stack | Next.js 14 (App Router) · React 18 · TypeScript 5.6 · Tailwind 3 · `@libsql/client` (SQLite lokal) |
| Data | `shop_ops.db` (WAL) di root proyek, ±15 tabel, data asli operasional |
| Server | `start-server.bat` → `next dev -H 0.0.0.0 -p 3000` (LAN: `192.168.0.90:3000`) |
| Aturan proyek | `AI_RULES.md` + `.cursorrules` — **Database-First**, DRY, file 150–200 baris, desain korporat emerald `#006622` |

**Kode:** 86 file sumber (68 di `src/`) · 15 halaman `"use client"` (SPA-style) · 40 API route.

## 2. Data Aktual di Database (dibaca 30 Okt 23:35)

```
assets 159 · monitoring_devices 167 · server_rack_ports 135 · role_permissions 130
office_hardware_assets 77 · pos_hardware_assets 68 · edc_assets 53 · phone_extensions 47
users 43 · t3_fixed_assets 35 · dvr_assets 27 · server_rack_units 23
purchases 11 · knowledge_base 5 · tickets 2
```

Ini **bukan aplikasi demo** — data operasional nyata. Setiap perubahan skema/data harus aditif & reversible.

## 3. Peta Modul

| Route | Baris | Fungsi |
|---|---|---|
| `/` (login) | ~360 | Login + role switch |
| `/dashboard` | 735 | Ringkasan statistik |
| `/assets` | **2802** | Hardware kasir POS (PC, printer, scanner, UPS) + AnyDesk |
| `/purchases` | **2557** | Workflow pengadaan MIS OPS → Manager → Procurement → T3 |
| `/pos-topology` | 2021 | Topologi 68 POS + EDC + jaringan |
| `/edc` | 1816 | 33 titik EDC BCA/BNI/Mandiri/BRI (TID/MID) |
| `/dvr` | 1428 | 25 DVR Hikvision CCTV |
| `/server-rack` | 1317 | 32U rack + 6U wallmount, port map |
| `/office` | 1097 | Aset PC/printer kantor |
| `/knowledge-base` | 1043 | 5 artikel SOP (sudah di-seed DB) |
| `/t3-assets`, `/monitoring`, `/users`, `/permissions`, `/extensions`, `/tickets` | 404–885 | Aset tetap T3, ping IP, user, RBAC, ekstensi telepon, helpdesk |

## 4. Kesehatan Teknis (terverifikasi)

**Baik:**
- `npx tsc --noEmit` → **0 error** (25,8 detik). Fondasi tipe sehat.
- `node_modules` lengkap, Node v22.23.4, npm 10.9.9, Git 2.49 tersedia.
- API konsisten memakai pola `{ success, data | message }` + `try/catch`.
- `db.ts` sudah singleton + WAL + `busy_timeout`.
- Data seed knowledge-base sudah masuk DB dengan benar.

**Temuan (urut dampak):**

| # | Severity | Temuan | Bukti / Lokasi |
|---|---|---|---|
| F1 | 🔴 Kritis | **Tidak ada version control** (sebelum malam ini). Tidak ada riwayat, tidak bisa rollback. | `Test-Path .git` = False |
| F2 | 🔴 Kritis | **Auth hanya client-side.** `localStorage` + `PRESET_USERS` hardcoded. `switchRole()` bisa ganti ke MIS/ADMIN tanpa password. Tidak ada `middleware.ts`; semua API `GET/POST/PUT/DELETE` terbuka tanpa autentikasi. | `src/context/AuthContext.tsx:30-91,147-153`; `src/middleware.ts` tidak ada |
| F3 | 🔴 Kritis | **Password plaintext + backdoor universal.** Login lolos jika `password === "123"` untuk user mana pun, atau `password === username` (NIK). | `src/app/api/auth/login/route.ts:52-55` |
| F4 | 🟠 Tinggi | **File monolit raksasa**, melanggar aturan proyek sendiri (150–200 baris): `assets/page.tsx` 2802, `purchases` 2557, `pos-topology` 2021, `edc` 1816, `dvr` 1428, `server-rack` 1317, `office` 1097, `knowledge-base` 1043, `SidebarLayout` 948. Total file >400 baris: 18 file. | `wc -l` |
| F5 | 🟠 Tinggi | **`src/lib/seed.ts` 3198 baris / 177 KB adalah dead code** — tidak di-import di mana pun. Data sudah ada di DB. | grep `lib/seed` = 0 match |
| F6 | 🟠 Tinggi | **`AI_RULES.md` mendiklar `src/lib/utils.ts` dan `src/components/common/`, keduanya TIDAK ADA.** Format rupiah/tanggal/badge ditulis ulang per halaman; hanya `t3-assets` yang punya `formatRupiah` lokal (baris 315). | `ls src/lib` = cache, db, ping |
| F7 | 🟠 Tinggi | **Tidak ada test sama sekali**, tidak ada ESLint config (`npm run lint` = `next lint` akan prompt interaktif → gagal), tidak ada CI. Tidak ada jaring pengaman untuk edit malam. | `package.json`; tidak ada `.eslintrc*` |
| F8 | 🟡 Sedang | **Skema dikelola `try/catch ALTER TABLE`** di `initDb()` (±30 blok). Tidak ada migrasi bernomor, tidak ada index eksplisit untuk kolom filter panas (`status`, `shop_location`, `pos_code`, `ticket status`). | `src/lib/db.ts:22-160` |
| F9 | 🟡 Sedang | **Tidak ada backup terjadwal** DB produksi (4 MB WAL). Tim Lead sudah membuat 1 snapshot manual di `backups/db_20261030_233502/`. | — |
| F10 | 🟡 Sedang | **Duplikasi logika API**: 40 route mengulang validasi, error handling, filter `"Semua X"`, `initDb()`. Tipe `any` di banyak tempat. Peluang `src/lib/api.ts` + `src/lib/query.ts`. | `api/assets/route.ts` mewakili pola |
| F11 | 🟢 Rendah | `next.config.mjs`: `experimental.serverComponentsExternalPackages` (nama kunci usang di Next 14, seharusnya top-level `serverExternalPackages`); `reactStrictMode: false`. | `next.config.mjs` |
| F12 | 🟢 Rendah | `start-server.bat` melakukan `Stop-Process node` **global** — mematikan SEMUA proses node di mesin (termasuk tool lain), bukan hanya port 3000. | `start-server.bat:14` |

## 5. Rekomendasi Prioritas

**P0 (malam ini — aman, tidak mengubah perilaku):**
1. ✅ Git baseline + snapshot DB *(selesai oleh Lead)*.
2. `src/lib/utils.ts` + `src/components/common/` — sesuai `AI_RULES.md`, dipakai bertahap di halaman kecil.
3. `src/lib/api.ts` — helper respons/validasi, adopsi bertahap di beberapa route (kontrak respons **tidak berubah**).
4. Testing harness tanpa dependency baru: smoke test seluruh endpoint + unit test helper + script `verify`.
5. Backup DB otomatis + index aditif + laporan kualitas data.
6. Dokumentasi: analisis, rencana sprint, laporan malam.

**P1 (putaran berikutnya — butuh keputusan user):**
- Server-side session (HttpOnly cookie) + guard API; hapus backdoor `"123"` **setelah** alur login baru disetujui.
- Pecah file monolit (`assets`, `purchases`) per sub-modul — butuh regresi UI manual, jangan dilakukan buta.
- Migrasi skema bernomor (`migrations/00X_*.sql`).
- Hapus/arsipkan `seed.ts` dead code (177 KB) setelah konfirmasi.

**P2:** ESLint + Prettier + CI, PWA/service worker, audit aksesibilitas, kompresi gambar.

## 6. Guardrail Sprint Malam (WAJIB dipatuhi semua agent)

1. **DB produksi = read-only** untuk semua agent kecuali perubahan skema aditif (`CREATE INDEX IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`). Dilarang `DROP`, `DELETE` massal, `UPDATE` data bisnis.
2. **Jangan sentuh alur auth/login** malam ini (F2/F3 dicatat, bukan diubah).
3. **Jangan jalankan `start-server.bat`**, **jangan kill node**, **jangan `next build`** saat dev server `:3000` hidup. Verifikasi = `tsc --noEmit` + smoke test + (build hanya di salinan terisolasi).
4. **Commit git hanya oleh Lead** (hindari race index.lock).
5. **Surgical edits** — jangan menulis ulang file >300 baris secara keseluruhan.
6. **Hemat kuota:** baca rentang baris/grep, bukan seluruh file besar; 1× verifikasi di akhir; berhenti saat acceptance terpenuhi; laporan ≤15 baris.

## 7. Definisi "Selesai" Malam Ini

- [ ] Semua test hijau (`tsc` 0 error + smoke test semua endpoint `success:true`).
- [ ] `src/lib/utils.ts`, `src/components/common/*`, `src/hooks/useApiData.ts`, `src/lib/api.ts` ada dan dipakai minimal di 2 halaman/3 route.
- [ ] `tests/` + `scripts/verify.mjs` berjalan tanpa dependency baru.
- [ ] `scripts/backup-db.mjs` + `scripts/db-health.mjs` ada; index aditif terpasang.
- [ ] `docs/` berisi analisis, rencana, laporan bug, laporan sprint.
- [ ] Aplikasi tetap berjalan normal di `:3000`, tidak ada data hilang.
