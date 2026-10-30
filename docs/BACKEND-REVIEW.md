# BACKEND-REVIEW — Review Regresi 30 Route Termigrasi (Shift 2, batch C)

> Reviewer: backend · 31 Okt 2026 · Lingkup: 30 file route di `src/app/api/**` yang memakai helper `src/lib/api.ts` (task-2 + task-7 + task-12).
> Metode: grep pola `jsonError( | fail( | ok( | parseFilters( | requireFields(` per file + audit script (status, `catch (error: any)`, inline `success:false`, shape ekstra, GET-write) + `git diff e6c8621..HEAD -- src/app/api` untuk membandingkan pesan/status lama vs baru.
> Server `:3000` = PRODUKSI (`next start`) — build/restart tidak dijalankan oleh reviewer; verifikasi runtime memakai build yang hidup.

## 1. Matriks review (30 route × 5 cek)

Keterangan kolom: **1** = status code, **2** = pesan `message` identik, **3** = tipe/shape field, **4** = `totalCount`/pagination, **5** = side-effect GET.
`OK` = tidak ada perubahan perilaku. `⚠` = ada catatan (tidak diubah).

| # | Route (file) | 1 | 2 | 3 | 4 | 5 | Catatan |
|---|---|---|---|---|---|---|---|
| 1 | `assets/route.ts` | OK | OK | OK | OK | OK | GET `{success,data}`; POST `{success,message}` |
| 2 | `tickets/route.ts` | OK | OK | OK | OK | OK | POST tetap `{success,ticket_number,message}` (bukan `data`) |
| 3 | `edc/route.ts` | OK | OK | OK | OK | OK | sentinel per-param (`zone` beda dari `shop`) dipertahankan |
| 4 | `health/route.ts` | OK | OK | OK | OK | OK | route baru; 500 + `{success:false,message}` |
| 5 | `dvr/route.ts` | OK | OK | OK | OK | OK | GET `data`; POST `{success,message}` |
| 6 | `purchases/route.ts` | OK | OK | OK | OK | OK | POST tetap `message`+`id`+`po_number` |
| 7 | `users/route.ts` | OK | OK | ⚠ | OK | OK | ⚠ field `password` masih ikut di GET (bug lama B2, bukan regresi) |
| 8 | `office/route.ts` | OK | OK | OK | OK | OK | — |
| 9 | `office/[id]/route.ts` | OK | OK | OK | OK | OK | GET 404; PUT/DELETE message inline |
| 10 | `pos-hardware/route.ts` | OK | OK | OK | OK | OK | — |
| 11 | `pos-hardware/[id]/route.ts` | OK | OK | OK | OK | OK | — |
| 12 | `extensions/[id]/route.ts` | OK | OK | OK | OK | OK | — |
| 13 | `edc/[id]/route.ts` | OK | OK | OK | OK | OK | — |
| 14 | `dvr/[id]/route.ts` | OK | OK | OK | OK | OK | — |
| 15 | `users/[id]/route.ts` | OK | OK | ⚠ | OK | OK | ⚠ `password` ikut di GET (B2) + 403 proteksi `admin` dipertahankan |
| 16 | `t3-assets/route.ts` | OK | OK | OK | OK | OK | GET tetap `data`+`stats`; POST `message`+`id`+`no_asset` |
| 17 | `server-rack/route.ts` | OK | OK | OK | OK | OK | GET tetap `ports`+`rackUnits`+`stats` |
| 18 | `server-rack/[id]/route.ts` | OK | OK | OK | OK | OK | PUT/DELETE message inline |
| 19 | `purchases/[id]/route.ts` | OK | OK | OK | OK | OK | PUT/DELETE message inline |
| 20 | `extensions/route.ts` | OK | OK | OK | OK | OK | GET tetap `data`+`stats`; POST `message`+`id` |
| 21 | `monitoring/route.ts` | OK | OK | OK | OK | ⚠ | ⚠ GET `?ping=true` menulis UPDATE `monitoring_devices` (sudah ada sebelum migrasi) |
| 22 | `stats/route.ts` | OK | OK | OK | OK | OK | shape `{success,stats}` (tanpa `data`) dipertahankan |
| 23 | `permissions/route.ts` | OK | OK | OK | OK | ⚠ | ⚠ GET menulis seed `role_permissions` bila tabel kosong (sudah ada sebelum migrasi) |
| 24 | `pos/heartbeat/route.ts` | OK | OK | OK | OK | n/a | POST; `message`+`timestamp` inline |
| 25 | `tickets/[id]/route.ts` | OK | OK | OK | OK | n/a | PUT message inline |
| 26 | `t3-assets/[id]/route.ts` | OK | OK | OK | OK | OK | GET `{success,data}` via `ok()` |
| 27 | `assets/[code]/route.ts` | OK | OK | OK | OK | OK | GET tetap `data`+`tickets` (inline, bukan `ok`) |
| 28 | `dvr/test-connect/route.ts` | OK | OK | OK | OK | n/a | POST; `ip`+`ping`+`ports`+`isReachable` inline |
| 29 | `edc/ping/route.ts` | OK | OK | OK | OK | n/a | POST; `ip`+`status`+`latency` / `results` inline |
| 30 | `monitoring/ping/route.ts` | OK | OK | OK | OK | n/a | POST; `result` / `count`+`results` inline |

Ringkasan cek: **1 Status code** 30/30 OK · **2 Pesan error** 30/30 OK · **3 Tipe/shape** 28/30 OK, 2 catatan (B2 password, bukan regresi) · **4 totalCount/pagination** 30/30 OK (hanya `monitoring` punya `totalCount` dan tetap ada; tidak ada pagination ditambah) · **5 Side-effect GET** 28/30 OK, 2 pre-existing (`monitoring?ping=true`, `permissions` seed).

## 2. Fix yang dilakukan (zero-behavior)

| # | File | Temuan | Fix | Alasan aman |
|---|---|---|---|---|
| 1 | `src/app/api/users/route.ts` (POST, duplikat username) | Respons error masih inline `NextResponse.json({success:false,message:\`Username/NIK "${cleanUser}" sudah terdaftar...\`},{status:400})` — satu-satunya sisa inline error di 30 route | Ganti ke `fail(\`Username/NIK "${cleanUser}" sudah terdaftar...\`, 400)` | JSON + status code byte-identik; hanya menghapus duplikasi |

Tidak ada fix lain. Temuan yang tidak yakin/berisiko sengaja **tidak** diubah (lihat rekomendasi).

Gate setelah fix: `npx tsc --noEmit` exit 0 · `node tests/smoke.mjs` 47 PASS / 0 FAIL · `node tests/contract-post.mjs` 18/18 PASS (exit 0). Catatan: test berjalan terhadap server produksi (build lama) — build ulang di batas batch oleh Lead.

## 3. Rekomendasi P1 (perlu keputusan, bukan diubah malam ini)

1. **B2 — kebocoran `password`** di `GET /api/users` dan `GET /api/users/[id]` (43 baris). Perbaikan mengubah kontrak JSON → butuh persetujuan; setelah klien UI disesuaikan, hapus field dari SELECT.
2. **Side-effect GET `permissions`**: seeding `role_permissions` saat tabel kosong sebaiknya dipindah ke `initDb()`/migrasi, bukan di GET. Mengubah perilaku → backlog.
3. **Side-effect GET `monitoring`**: `GET /?ping=true` melakukan UPDATE. Sudah ada `POST /api/monitoring/ping`; arahkan klien ke POST lalu hapus jalur GET-ping. Mengubah perilaku → backlog.
4. **Kontrak `knowledge-base*` memakai field `error`** (bukan `message`) — 2 pelanggaran kontrak terdeteksi `tests/contract-post.mjs`. Samakan bersama pemilik UI, jangan diam-diam.
5. **`jsonError(error)` tanpa fallback**: bila `error.message` string kosong, output menjadi `{success:false}` (key `message` hilang), sedangkan kode lama bisa mengirim `message:""`. Tidak pernah terpicu oleh error `@libsql/client`; jika ingin strict, tambah fallback default di `src/lib/api.ts` (di luar write-scope batch ini).
6. **Rebuild & retest pasca-commit**: karena `:3000` mode produksi, jalankan `npm run build` + `node tests/smoke.mjs` + `node tests/regression.mjs` oleh Lead sebelum menutup shift.
7. **Sisa 6 file belum dimigrasi**: `anydesk/connect` (file tool eksternal), `auth/accounts`, `auth/login` (dilarang), `knowledge-base`, `knowledge-base/[id]`, `knowledge-base/[id]/helpful` (kontrak `error`).

## 4. Bukti

- Audit otomatis 30 file: `catch (error: any)` = 0; inline `success:false` = 0 setelah fix (sebelum fix: 1 di `users/route.ts`).
- Diff kontrak `git diff e6c8621..HEAD -- src/app/api`: semua pasangan pesan lama→`jsonError`/`fail` identik teks; status 400/404/403/500 tidak berubah.
- `tests/contract-post.mjs`: 18/18 PASS, 0 FAIL, exit 0; row count DB 982 = baseline (tidak ada mutasi dari review/fix).
