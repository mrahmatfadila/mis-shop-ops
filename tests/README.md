# Pengujian MIS SHOP OPS — `tests/`

Jaring pengaman tanpa dependency baru (Node built-in: `fetch`, `node:test`, `node:assert`).
Semua test bersifat **read-only** terhadap data produksi.

## Prasyarat

- Dev server user **sedang hidup** di `http://localhost:3000` (`start-server.bat`).
  Script test **tidak** menyalakan/mematikan/restart server.
- Node.js ≥ 22.6 untuk `--experimental-strip-types` (di mesin ini v22.23.4).
- Tidak perlu `npm install` — semua pakai modul bawaan Node.

## 1. Smoke test API — `tests/smoke.mjs`

```powershell
cd "C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS"
node tests/smoke.mjs
```

Yang diuji:

- **25 endpoint GET** yang ada di `src/app/api/**/route.ts`:
  - 16 endpoint list/statistik: `/api/stats`, `/api/assets`, `/api/auth/accounts`, `/api/dvr`,
    `/api/edc`, `/api/extensions`, `/api/knowledge-base`, `/api/monitoring`, `/api/office`,
    `/api/permissions`, `/api/pos-hardware`, `/api/purchases`, `/api/server-rack`,
    `/api/t3-assets`, `/api/tickets`, `/api/users`.
  - 9 endpoint detail yang ID-nya diambil dari data list (GET read-only):
    `/api/assets/[code]`, `/api/dvr/[id]`, `/api/edc/[id]`, `/api/extensions/[id]`,
    `/api/knowledge-base/[id]`, `/api/office/[id]`, `/api/pos-hardware/[id]`,
    `/api/t3-assets/[id]`, `/api/users/[id]`.
  - 1 endpoint opsional `/api/health` (otomatis di-skip bila belum ada di dev server).
- **POST `/api/auth/login`**: `mis` / `123` → `success:true` (HTTP 200, `user.role` string),
  dan password salah → HTTP 401 `success:false`.
- Setiap request di-assert: HTTP status, `Content-Type: application/json`, JSON valid,
  `success === true`, bentuk field (`data`/`articles`/`accounts`/`ports`/`matrix` array vs object),
  jumlah data, dan konsistensi `/api/stats` vs jumlah baris tiap list.
- **Latency** diukur per endpoint; >500ms ditandai `LAMBAT` (tanda performa, **bukan** FAIL).
- Exit code **1** bila ada FAIL atau server tidak terjangkau; **0** bila semua PASS.
- Hasil mesin: `tests/last-run.json` (ringkasan, warning, cek per endpoint). Nilai field
  `password` diredaksi dari artefak.

**Warm-up:** script melakukan satu panggilan pemanasan tanpa assert ke setiap endpoint sebelum
pengukuran. Ini karena `next dev` mengompilasi route on-demand (request pertama bisa 10–90 detik
saat repo sedang di-edit). **Latency yang dilaporkan adalah latency setelah warm-up**, bukan cold
compile. Bila satu endpoint tetap >150 detik, run mencatat timeout — jangan langsung dianggap bug;
cek beban server.

Opsi environment:

| Env | Default | Fungsi |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | alamat dev server |
| `SMOKE_TIMEOUT_MS` | `150000` | timeout per request (dev compile bisa lambat) |
| `SMOKE_SLOW_MS` | `500` | ambang penanda `LAMBAT` |

Contoh: `$env:BASE_URL="http://localhost:3000"; node tests/smoke.mjs`.

### Batasan read-only

Tidak memanggil POST/PUT/DELETE data (assets, tickets, users, purchases, dll.). Hanya GET dan
`POST /api/auth/login`. Dua GET yang punya efek samping sengaja diperlakukan khusus:

- `GET /api/knowledge-base/[id]` menaikkan `view_count` (mutasi via GET) — tetap diuji karena
  termasuk endpoint GET, sehingga tiap run menambah 2 view (warm-up + pengukuran). Dicatat di
  `docs/BUGS.md`.
- `GET /api/monitoring?ping=true` melakukan UPDATE + ping jaringan — **tidak** dipanggil (hanya
  GET tanpa query, yang read-only).

## 2. Unit test helper — `tests/lib.test.mjs`

```powershell
node --experimental-strip-types --test tests/lib.test.mjs
```

Menguji `src/lib/utils.ts` (tanpa build, langsung type-strip):

| Fungsi | Status |
|---|---|
| `cn()` | diuji (merge Tailwind, conditional, array/object) |
| `formatRupiah()` | diuji (0, 1500, 1234567.89, negatif, null/undefined/NaN/string) |
| `formatNumber()` | diuji (ribuan, negatif, input invalid) |
| `formatDate()` | diuji (tanggal valid, kosong, invalid) |
| `formatDateTime()` | diuji (tanggal + jam, kosong, invalid) |
| `statusBadgeClass()` | diuji (semua status dikenal + fallback + lowercase/trim) |
| `urgencyBadgeClass()` | diuji (DARURAT/TINGGI/SEDANG/RENDAH + fallback) |
| `safeText()` | diuji (null/undefined/string kosong/angka 0) |
| `divisionBadgeClass()` | bonus (di luar 8 fungsi wajib), diuji juga |

**Hitungan fungsi teruji: 9 dari 9 fungsi yang diekspor `src/lib/utils.ts`** (8 fungsi wajib
task-6 + 1 bonus). Hasil saat ini: **29 test, 9 suite — semua PASS** (`node --test`).

## Baseline run final

| Item | Hasil (31 Okt 2026 00:11 WIB, server hangat) |
|---|---|
| Smoke API | **28/28 PASS**, 0 FAIL, 0 SKIP, 0 endpoint >500 ms, durasi 2,6 detik |
| Cakupan smoke | 25 GET + `/api/health` + 2 skenario login; cross-check `/api/stats` vs list 11/11 cocok |
| Login | `mis`/`123` → HTTP 200 `success:true`; password salah → HTTP 401 `success:false` |
| Latency warm terburuk | 169 ms (POST login), 113 ms (GET detail); semua < 500 ms |
| `npx tsc --noEmit` | 0 error |
| Unit test | 29/29 PASS (exit 0) |
| `node scripts/verify.mjs` | **exit 0** — semua 3 langkah LULUS |

Exit code smoke pada baseline ini: **0**. `tests/last-run.json` menyimpan hasil run terakhir.

## 3. Gate verifikasi — `scripts/verify.mjs`

```powershell
node scripts/verify.mjs
```

Urutan: `npx tsc --noEmit` → `node tests/smoke.mjs` →
`node --experimental-strip-types --test tests/lib.test.mjs` (dilewati dengan catatan bila file
unit test belum ada). Exit code 1 bila ada langkah gagal. Butuh dev server hidup untuk langkah 2.

## Troubleshooting

- **Semua endpoint `fetch failed` seketika** → dev server mati/tidak listen di `:3000`
  (bukan bug API). Bukti: `Get-NetTCPConnection -LocalPort 3000 -State Listen`. Nyalakan server
  user lalu ulangi; script smoke menandainya `[FATAL]`.
- **Banyak `LAMBAT`** pada run pertama setelah edit file → kompilasi HMR dev server; jalankan
  ulang untuk angka hangat.
- **`/api/health` SKIP** → route belum ter-deploy di dev server saat run (bukan FAIL).
