# Pengujian MIS SHOP OPS — `tests/`

Jaring pengaman tanpa dependency baru (Node built-in: `fetch`, `node:test`, `node:assert`).
Semua test bersifat **read-only** terhadap data produksi.

## Prasyarat

- Server aplikasi **sedang hidup** di `http://localhost:3000` (shift 2 memakai **mode produksi**
  `npm run start`; shift 1 memakai `next dev`). Script test **tidak** menyalakan/mematikan/restart
  server.
- Node.js ≥ 22.6 untuk `--experimental-strip-types` (di mesin ini v22.23.4).
- Tidak perlu `npm install` — semua pakai modul bawaan Node.

## 1. Smoke test API — `tests/smoke.mjs`

```powershell
cd "C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS"
node tests/smoke.mjs
```

Yang diuji (**47 request, semuanya read-only**):

- **26 endpoint GET** yang ada di `src/app/api/**/route.ts`:
  - 16 endpoint list/statistik: `/api/stats`, `/api/assets`, `/api/auth/accounts`, `/api/dvr`,
    `/api/edc`, `/api/extensions`, `/api/knowledge-base`, `/api/monitoring`, `/api/office`,
    `/api/permissions`, `/api/pos-hardware`, `/api/purchases`, `/api/server-rack`,
    `/api/t3-assets`, `/api/tickets`, `/api/users`.
  - 9 endpoint detail yang ID-nya diambil dari data list (GET read-only):
    `/api/assets/[code]`, `/api/dvr/[id]`, `/api/edc/[id]`, `/api/extensions/[id]`,
    `/api/knowledge-base/[id]`, `/api/office/[id]`, `/api/pos-hardware/[id]`,
    `/api/t3-assets/[id]`, `/api/users/[id]`.
  - 1 endpoint `/api/health` (di-skip otomatis bila belum ada di server).
- **4 skenario login**: `mis`/`123` → 200 `success:true`; password salah → 401; field kosong → 400;
  user tidak terdaftar → 401.
- **17 kasus negatif read-only** (Batch A):
  - 8 detail id tidak ada → 404 `success:false`;
  - 2 knowledge-base (id tidak ada → 404, id bukan angka → 400);
  - 2 path traversal (`..%2F..%2Fpackage.json`, `..%2F..%2F..%2Fetc%2Fpasswd`) → 404, tidak fatal;
  - 5 query param invalid/ngawur (null byte, wildcard, lokasi/status/urgensi ngawur, karakter aneh)
    → 200 `success:true` dengan array aman, tidak crash.
- Setiap request di-assert: HTTP status, `Content-Type: application/json`, JSON valid,
  `success` sesuai, bentuk field, jumlah data, konsistensi `/api/stats` vs jumlah baris list,
  dan **budget latency**.
- **Latency**: >500ms ditandai `LAMBAT`; **>1500ms (setelah warm-up) = FAIL** (budget).
- **Kontrak error**: kasus negatif wajib memakai field `message`; pelanggaran (`error`) dicatat di
  `contractViolations` + warning, tanpa menggagalkan run (bug pre-existing B5).
- Exit code **1** bila ada FAIL atau server tidak terjangkau; **0** bila semua PASS.
- Hasil mesin: `tests/last-run.json` (ringkasan, warning, cek per endpoint). Nilai field
  `password` diredaksi dari artefak.

**Warm-up:** script melakukan satu panggilan pemanasan tanpa assert ke setiap endpoint sebelum
pengukuran. Ini karena `next dev` mengompilasi route on-demand (request pertama bisa 10–90 detik
saat repo sedang di-edit). **Latency yang dilaporkan adalah latency setelah warm-up**, bukan cold
compile. Bila satu endpoint tetap >150 detik, run mencatat timeout — jangan langsung dianggap bug;
cek beban server. Pada `npm run start` (produksi) warm-up tetap dilakukan tetapi semua request
sudah cepat (≤41 ms pada Batch A).

Opsi environment:

| Env | Default | Fungsi |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | alamat server |
| `SMOKE_TIMEOUT_MS` | `150000` | timeout per request (dev compile bisa lambat) |
| `SMOKE_SLOW_MS` | `500` | ambang penanda `LAMBAT` |
| `SMOKE_LATENCY_BUDGET_MS` | `1500` | >nilai ini setelah warm-up = **FAIL** |

Contoh: `$env:BASE_URL="http://localhost:3000"; node tests/smoke.mjs`.

### Batasan read-only

`tests/smoke.mjs` tidak memanggil POST/PUT/DELETE data — hanya GET dan `POST /api/auth/login`
(login valid/salah/negatif, tidak menulis). `tests/contract-post.mjs` mengirim **hanya payload
kosong `{}`** ke endpoint POST yang divalidasi (dijamin 400 sebelum insert) dan memverifikasi baris
DB tetap 982; payload valid/parsial dilarang. Beberapa endpoint punya efek samping dan sengaja
diperlakukan khusus:

- `GET /api/knowledge-base/[id]` menaikkan `view_count` (mutasi via GET) — tetap diuji karena
  termasuk endpoint GET, sehingga tiap run menambah 2 view (warm-up + pengukuran). Dicatat di
  `docs/BUGS.md`.
- `GET /api/monitoring?ping=true` melakukan UPDATE + ping jaringan — **tidak** dipanggil (hanya
  GET tanpa query, yang read-only).
- `POST /api/monitoring/ping` dengan body kosong memicu ping **semua** device + UPDATE — **tidak**
  diuji (bukan kontrak 400); dicatat sebagai B8 di `docs/BUGS.md`.

## 2. Kontrak POST non-mutasi — `tests/contract-post.mjs`

```powershell
node tests/contract-post.mjs
```

Mengirim **payload kosong `{}`** ke 18 endpoint POST yang divalidasi dan mengharapkan
**HTTP 400 `success:false`**, tanpa menulis data:

- CRUD: `/api/assets`, `/api/dvr`, `/api/edc`, `/api/extensions`, `/api/knowledge-base`,
  `/api/office`, `/api/pos-hardware`, `/api/purchases`, `/api/server-rack`, `/api/t3-assets`,
  `/api/tickets`, `/api/users`;
- action: `/api/anydesk/connect`, `/api/dvr/test-connect`, `/api/edc/ping`, `/api/pos/heartbeat`,
  `/api/permissions`, `/api/knowledge-base/abc/helpful` (id invalid).

**Keamanan:** hanya `{}` — tidak pernah mengirim payload valid/parsial yang bisa lolos validasi dan
meng-insert data. Sebelum & sesudah **setiap** tes, total baris DB dibaca ulang via API (stats 784 +
users 43 + tickets 2 + role_permissions 130 + server_rack_units 23) dan harus tetap **982**.
`POST /api/monitoring/ping` **sengaja tidak diuji**: body kosong berarti ping seluruh device lalu
UPDATE tabel monitoring (side effect nyata — dicatat sebagai B8 di `docs/BUGS.md`).

Exit code 0 = semua 400 & baris DB tidak berubah; 1 = ada pelanggaran. Hasil:
`tests/contract-post-last-run.json`. Env: `BASE_URL`, `CONTRACT_BASELINE_ROWS` (default 982),
`CONTRACT_TIMEOUT_MS` (default 30000).

## 3. Regression gate antar-batch — `tests/regression.mjs`

```powershell
node tests/regression.mjs
```

Script ringan untuk dijalankan **setelah setiap batch agent** (tanpa `tsc`):

1. menjalankan `node tests/smoke.mjs` (gate utama, exit code-nya diperiksa);
2. cek `GET /api/health` → 200, `success:true`, `db:"ok"` (warning bila jumlah tabel ≠ 15);
3. menghitung **total baris DB via API** dan membandingkan dengan baseline **982**:
   stats 784 + users 43 + tickets 2 + role_permissions 130 + server_rack_units 23;
4. mendeteksi field `password` yang bocor di `GET /api/users` / `GET /api/users/[id]`
   (**warning, bukan FAIL**, karena bug B2 dikenal dan belum diperbaiki).

Exit code 0 hanya bila smoke pass + health valid + jumlah baris DB cocok. Hasil mesin:
`tests/regression-last-run.json`. Env: `BASE_URL`, `REGRESSION_BASELINE_ROWS` (default 982),
`REGRESSION_TIMEOUT_MS` (default 30000).

## 4. Unit test helper — `tests/lib.test.mjs` + `tests/api-helpers.test.mjs`

```powershell
node --experimental-strip-types --test tests/lib.test.mjs tests/api-helpers.test.mjs
```

**`tests/lib.test.mjs`** menguji `src/lib/utils.ts` (tanpa build, langsung type-strip):

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

**`tests/api-helpers.test.mjs`** menguji helper `src/lib/api.ts`: `parseFilters()` (whitelist param,
sentinel `ALL`/`Semua ...`, nilai tidak di-trim), `requireFields()` (field kosong/null/undefined/0/false
dianggap hilang, body non-object aman), serta `ok()`, `fail()`, `jsonError()` (shape `{success,data|message}`
+ status code).

> **Catatan import `next/server`:** `src/lib/api.ts` meng-import `NextResponse` dari `next/server`,
> yang **tidak bisa di-resolve Node murni** (`ERR_MODULE_NOT_FOUND`, paket `next` tidak mengekspos
> subpath itu untuk konsumen Node). Agar `src/**` tidak diubah, test me-register loader kecil
> (`tests/helpers/next-server-loader.mjs`) yang memetakan `next/server` ke stub
> `tests/helpers/next-server-stub.mjs` ( `NextResponse.json` tiruan yang mengembalikan
> `{ body, status }`). Dengan itu `ok/fail/jsonError` tetap bisa diuji perilakunya.

Hasil unit test saat ini: **45 test, 12 suite — semua PASS** (29 utils + 16 api helpers).

## Baseline run final

| Item | Hasil (Batch B, 31 Okt 2026 00:33 WIB, **server produksi**) |
|---|---|
| Smoke API | **47/47 PASS**, 0 FAIL, 0 SKIP, 0 lambat (>500 ms), 17 kasus negatif |
| Kontrak POST non-mutasi | **18/18 PASS** (semua HTTP 400), baris DB **982 → 982** (tidak berubah) |
| Cakupan smoke | 26 GET (16 list + 9 detail + health) + 4 skenario login + 17 negatif; cross-check `/api/stats` vs list 11/11 cocok |
| Login | 200 valid; 401 salah; 400 field kosong; 401 user tak terdaftar |
| Latency (budget 1500 ms) | maksimum **41 ms** — 0 FAIL budget |
| Kontrak error | 4 pelanggaran dicatat (2 GET + 2 POST knowledge-base memakai `error`, bukan `message`) — warning |
| `npx tsc --noEmit` | 0 error |
| Unit test | **45/45 PASS** (29 utils + 16 api helpers) |
| `node scripts/verify.mjs` | **exit 0** — semua **4** langkah LULUS |
| `node tests/regression.mjs` | **PASS, exit 0** — health ok, baris DB 982 = baseline, warning password bocor |

Exit code smoke & kontrak POST pada baseline ini: **0**. Artefak: `tests/last-run.json`,
`tests/contract-post-last-run.json`, `tests/regression-last-run.json`.

## 5. Gate verifikasi — `scripts/verify.mjs`

```powershell
node scripts/verify.mjs
```

Urutan (4 langkah): `npx tsc --noEmit` → `node tests/smoke.mjs` →
`node tests/contract-post.mjs` → `node --experimental-strip-types --test tests/lib.test.mjs
tests/api-helpers.test.mjs` (file unit test yang belum ada otomatis dilewati). Exit code 1 bila ada
langkah gagal. Butuh server hidup untuk langkah 2–3.

## Troubleshooting

- **Semua endpoint `fetch failed` seketika** → server mati/tidak listen di `:3000`
  (bukan bug API). Bukti: `Get-NetTCPConnection -LocalPort 3000 -State Listen`. Nyalakan server
  user lalu ulangi; script smoke menandainya `[FATAL]`.
- **Banyak `LAMBAT`** pada run pertama setelah edit file → kompilasi HMR dev server; jalankan
  ulang untuk angka hangat.
- **`/api/health` SKIP** → route belum ter-deploy di server saat run (bukan FAIL).
- **`tests/regression.mjs` FAIL pada "total baris DB"** → ada perubahan data antar-batch. Jangan
  abaikan; bandingkan komponen di `tests/regression-last-run.json` dan laporkan ke PM (baseline 982).
- **`tests/contract-post.mjs` FAIL** → ada endpoint POST yang tidak menolak payload kosong dengan 400
  ATAU baris DB berubah (982 → lain). Hentikan, laporkan ke PM sebelum batch lain menulis data.
- **`api-helpers.test.mjs` gagal import `next/server`** → pastikan test dijalankan dengan
  `--experimental-strip-types` dan loader stub tersedia di `tests/helpers/` (lihat catatan di atas).
- **`SMOKE_LATENCY_BUDGET_MS` FAIL** → endpoint >1500 ms setelah warm-up; cek beban server/proses
  lain, ulangi sekali sebelum menyimpulkan regresi performa.
