# LAPORAN SPRINT MALAM — MIS SHOP OPS
> Disusun oleh: **PM** · 31 Okt 2026 00:15 WIB · sprint 23:35–00:15 (5 agent: frontend, backend, data, testing, PM)
> Baseline git: `6f175a0` · commit terakhir: **`02e7b59`** (checkpoint Lead, 00:00) · **tidak ada push ke remote** (keputusan Lead)

## 1. Ringkasan Eksekutif

Sprint malam menambah **fondasi teknik** pada aplikasi produksi tanpa mengubah perilaku bisnis: helper DRY (`utils.ts`, `api.ts`, `useApiData.ts`, 7 komponen common), test harness murni Node (smoke 28 endpoint + 29 unit test + `verify.mjs`), dan pengamanan data (2 snapshot backup, 17 index aditif, laporan kualitas data). Semua gate hijau: **`tsc --noEmit` 0 error, smoke 28/28 PASS (0 FAIL), `verify.mjs` exit 0, unit test 29/29 PASS**, dan **data 15 tabel = 982 baris, identik baseline** (integrity `ok`, WAL). Keempat peer menyelesaikan task-nya. Satu insiden lingkungan: dev server mati 23:59:41 akibat tool AI eksternal (Antigravity IDE) yang masih aktif; dipulihkan oleh Lead via managed `next dev` (bukan `start-server.bat`). Auth F2/F3 tidak disentuh; temuan kebocoran password (`B2`) dinaikkan sebagai P1 prioritas. Commit history tercampur aktivitas tool eksternal — state akhir yang diverifikasi, bukan narasi history.

## 2. Task vs Status

| Task | Owner | Deliverable | Status | Bukti kunci |
|---|---|---|---|---|
| task-1 | frontend | `utils.ts` (148), `useApiData.ts` (93), 7 `components/common/*`, adopsi di 2 halaman, `FRONTEND-NOTES.md` | ✅ **completed** | tickets 443→388 (−55 baris), extensions 745→683 (−62), tsc 0, `/tickets` 200 & `/extensions` 200 (saat server hidup), n=2 & n=47 |
| task-2 | backend | `lib/api.ts` (81), `GET /api/health`, adopsi 3 route, `BACKEND-NOTES.md` | ✅ **completed** | parity 6/6 · 156/156 · 2/2 · 53/53 · 27/27 (0 fail), health 200, tsc 0 |
| task-3 | data | `db-health.mjs` (440), `backup-db.mjs` (126), 17 index di `db.ts`, `DATA-HEALTH.md` | ✅ **completed** (rev 6) | 17/17 index dideklarasikan = 17 di DB; row 982 identik; EXPLAIN `SCAN`→`SEARCH`; db-health exit 1 (17 orphan pre-existing) |
| task-4 | testing | `tests/smoke.mjs` (700), `scripts/verify.mjs` (79), `BUGS.md`, `README.md` | ✅ **completed** | smoke **28 PASS · 0 FAIL · 0 SKIP**, login 200/401, 11/11 cross-check, exit 0; verify exit 0 |
| task-6 | testing | `tests/lib.test.mjs`, coverage 9/9 fungsi utils | ✅ **completed** | 29 test / 9 suite PASS, exit 0 |
| task-5 | PM | `PLAN.md`, `TRIASE.md`, verifikasi gate, laporan ini | ✅ selesai | lihat §3 |

## 3. Bukti Verifikasi (dijalankan PM di state akhir, 00:11–00:14 WIB)

| Gate | Perintah | Hasil |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **exit 0 · 0 error** |
| Smoke API | `node tests/smoke.mjs` (run PM sendiri) | **28 PASS · 0 FAIL · 0 SKIP · 1 lambat** (cold compile 639 ms), exit 0, durasi 4,7 s |
| Gate otomatis | `node scripts/verify.mjs` | **exit 0** (tsc 0 → smoke 28/28 → unit 29/29) |
| Unit test | `node --experimental-strip-types --test tests/lib.test.mjs` | **29/29 PASS, 9 suite**, exit 0 |
| Health | `GET /api/health` | **200** dalam 0,018 s → `{"success":true,"db":"ok","tables":15,"wal":"wal"}` |
| DB row count | 15 tabel via `@libsql/client` (read-only) | **982 total = baseline** (assets 159, monitoring 167, rack_ports 135, perms 130, office 77, pos 68, edc 53, ext 47, users 43, t3 35, dvr 27, rack_units 23, purchases 11, kb 5, tickets 2) |
| DB integritas | `PRAGMA integrity_check` / `journal_mode` | **ok** / **wal** |
| Index | `sqlite_master` | **17 explicit index** (10 hot-filter + 7 baseline), semua dideklarasikan di `db.ts` |
| Backup | `backups/` | 2 snapshot: `db_20261030_233502` (Lead, 368 KB) + `db_20261030_235757` (405.504 B, quick_check ok) |
| Smoke cakupan | 25 GET + `/api/health` + 2 login | termasuk 9 endpoint detail; warm terburuk 209 ms (login) |

Catatan: run smoke 23:59:55 (19 FAIL, `fetch failed`) **tidak valid** — server mati, bukan bug aplikasi; digantikan run 00:11 dan run PM 00:14.

## 4. File Berubah

**Dibuat (baru):** `src/lib/utils.ts`, `src/lib/api.ts`, `src/hooks/useApiData.ts`, `src/components/common/{PageHeader,StatCard,EmptyState,LoadingState,StatusBadge,SearchInput,Modal}.tsx`, `src/app/api/health/route.ts`, `scripts/{db-health,backup-db,verify}.mjs`, `tests/{smoke.mjs,lib.test.mjs,README.md}`, `docs/{PLAN,FRONTEND-NOTES,BACKEND-NOTES,DATA-HEALTH,BUGS,TRIASE,LAPORAN-SPRINT}.md`.

**Dimodifikasi tim:** `src/app/tickets/page.tsx`, `src/app/extensions/page.tsx`, `src/app/api/{assets,tickets,edc}/route.ts`, `src/lib/db.ts` (+9 baris index).

**Dimodifikasi tool AI eksternal (Antigravity IDE, bukan tim — dipertahankan):** `src/app/assets/page.tsx`, `src/app/api/anydesk/connect/route.ts` (default password AnyDesk "Cupcake2020"→"cupcake2020" + migrasi localStorage), `src/lib/db.ts` (flag `__db_initialized_v3` + **`UPDATE pos_hardware_assets`** saat init), `src/lib/api.ts` (penghapusan generic `K extends string`), `src/app/extensions/page.tsx` (refactor bersamaan), `.gitignore` (+`.env`, `.env*.local`).

**Status git saat laporan (`git status --short`):** `M docs/DATA-HEALTH.md`, `M docs/FRONTEND-NOTES.md`, `M src/lib/db.ts`, `M tests/last-run.json`, `M tests/smoke.mjs`, `?? docs/BUGS.md`, `?? docs/TRIASE.md`, `?? tests/README.md`, `?? tests/lib.test.mjs` (+ laporan ini). **Belum di-commit** — kewenangan Lead. Riwayat commit `c8c442d`/`6bc1b5f`/`6646f3d` dibuat identitas user oleh tool eksternal (bukan tim; kerja tim tetap aman, terverifikasi di state akhir).

## 5. Insiden & Risiko Tersisa

- **Incident server 23:59:41:** dev server `:3000` mati (bukan tim; tidak ada listener/node, `.next/trace` berhenti 23:59:41) → dugaan kill oleh Antigravity IDE; `.next` sempat korup. **Recovery:** Lead menjalankan managed `npx next dev -H 0.0.0.0 -p 3000` (bukan `start-server.bat`, tanpa kill node global); health 200 dalam 0,018 s; aplikasi normal kembali.
- **Tool AI eksternal masih aktif** → bisa mengubah file/kill server sewaktu-waktu; verifikasi akhir dilakukan pada state akhir + commit history tercampur.
- **Auth lemah (P1, sengaja TIDAK diubah):** F2 auth client-side + API terbuka, F3 backdoor password `"123"`/plaintext, **B2 `GET /api/users` membocorkan password 43 user**. Jangan ekspos aplikasi ke internet sebelum diperbaiki.
- **Data:** 17 orphan `edc_assets.pos_location` (pre-existing, tidak diperbaiki); `lint`/ESLint & CI belum ada; `seed.ts` 177 KB dead code tetap; file monolit `assets`/`purchases` tetap (splitting butuh regresi UI).
- **Push GitHub belum dilakukan** (Lead: remote berisi efek eksternal, keputusan user).

## 6. Rekomendasi P1 untuk User (putaran berikutnya)

1. **Auth server-side** (HttpOnly session/middleware) + **hapus backdoor `"123"`** + hash password + **hapus field `password` dari `GET /api/users(+/[id])`** — satu paket, karena saling bergantung (F2/F3/B2).
2. Migrasi skema bernomor + backup terjadwal (cron) memakai `scripts/backup-db.mjs`.
3. Pecah `assets` (2800) & `purchases` (2557) per sub-modul dengan regresi UI manual.
4. ESLint + Prettier + CI yang menjalankan `node scripts/verify.mjs`.
5. Tindak lanjut orphan EDC + semantik GET yang menulis (B3/B4/B5) sesuai `docs/TRIASE.md`.
