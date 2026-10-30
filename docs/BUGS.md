# BUGS — Temuan QA MIS SHOP OPS

> Disusun oleh **testing** (QA) · 30 Okt 2026 · sprint malam 5-agent
> Metode: smoke test read-only (`tests/smoke.mjs`), unit test helper, inspeksi kode.
> **Aturan: QA tidak memperbaiki `src/**`.** Semua temuan diserahkan ke PM untuk triase.

## Status verifikasi

| Waktu | Kejadian |
|---|---|
| 23:44–23:52 | 16 endpoint GET list diuji manual → **semua HTTP 200**, JSON `success:true`, bentuk data sesuai (assets 159, monitoring 167, office 77, pos-hardware 68, edc 53, t3 35, dvr 27, rack 135, extensions 47, purchases 11, knowledge 5, users 43, tickets 2). |
| 23:57 | `POST /api/auth/login` `mis`/`123` → 200 `success:true`; `mis`/salah → 401 `success:false`. |
| 23:59:41 | Dev server :3000 mati karena proses eksternal (bukan QA); smoke run 23:59:55 gagal total `fetch failed`. |
| 00:04 | Dev server hidup kembali (restart oleh Lead); warm-up + smoke berhasil, tetapi skrip sempat gagal di tahap laporan (bug skrip QA, sudah diperbaiki). |
| **00:11 WIB (31 Okt)** | **FINAL GATE shift 1 — `node tests/smoke.mjs`: 28/28 PASS, 0 FAIL, 0 SKIP. Lalu `node scripts/verify.mjs`: tsc 0 error + smoke 28/28 + unit 29/29 → exit 0.** |
| **00:23–00:26 WIB (31 Okt, SHIFT 2 · Batch A)** | Server **mode produksi** (`npm run start`). Smoke diperluas: **47/47 PASS, 0 FAIL, 0 SKIP, 0 lambat**, 17 kasus negatif, **2 pelanggaran kontrak** (dicatat, bukan FAIL), budget latency 1500 ms (terukur maks **41 ms**). `node scripts/verify.mjs` → **exit 0** (tsc 0 error + smoke 47/47 + unit 29/29). `node tests/regression.mjs` → **PASS, exit 0** (health ok, 982 baris DB cocok, warning password bocor). |
| **00:33 WIB (31 Okt, SHIFT 2 · Batch B)** | **Kontrak POST non-mutasi**: 18 endpoint POST dengan payload kosong `{}` → **18/18 PASS** (semua HTTP 400 `success:false`), total baris DB **982 → 982** (tidak berubah, dicek sebelum/sesudah tiap tes). Gunakan `tests/contract-post.mjs`. Unit test `src/lib/api.ts` (**16 test PASS**) via loader stub `next/server` (lihat README). `node scripts/verify.mjs` → **exit 0** (4 langkah; unit 45/45). `node tests/regression.mjs` → **PASS** (982). **2 pelanggaran kontrak POST** knowledge-base (`error`, bukan `message`) dicatat. **Temuan baru B8** (`POST /api/monitoring/ping` body kosong = ping massal + UPDATE). |

**Kesimpulan:** tidak ada endpoint yang gagal. Semua 25 endpoint GET + `/api/health` + skenario login
valid/negatif + 17 kasus GET negatif (id tidak ada, query invalid, path traversal) + 18 kontrak POST
(payload kosong) lulus. Temuan di bawah adalah risiko keamanan/kontrak/side-effect yang **belum
diperbaiki** dan perlu triase PM, bukan endpoint rusak. Latency pada server produksi: maksimum
**41 ms** (jauh di bawah budget 1500 ms).

## Ringkasan temuan

| # | Severity | Endpoint | HTTP | Temuan | File terkait |
|---|---|---|---|---|---|
| B1 | 🔴 Kritis (sudah tercatat sebagai F3) | `POST /api/auth/login` | 200 | Password universal `"123"` diterima untuk **user mana pun** (backdoor); password dibandingkan plaintext. Terverifikasi final: user `admin` + password `123` → 200. | `src/app/api/auth/login/route.ts:38-47` |
| B2 | 🔴 Kritis | `GET /api/users`, `GET /api/users/[id]` | 200 | Respons membocorkan field `password` (nilai terisi) untuk 43 user — siapa pun yang bisa memanggil API dapat membaca kredensial. Terverifikasi final. | `src/app/api/users/route.ts:12`, `src/app/api/users/[id]/route.ts:12` |
| B3 | 🟡 Rendah | `GET /api/knowledge-base/[id]` | 200 | GET mengubah data: `view_count = view_count + 1` setiap akses. Melanggar semantik GET (prefetch/crawler/smoke ikut menambah counter). **Masih terjadi di Batch A** — smoke menambah 2 view/run (warm-up + pengukuran). | `src/app/api/knowledge-base/[id]/route.ts:18-22` |
| B4 | 🟡 Rendah | `GET /api/monitoring?ping=true` | 200 | GET dengan query `ping=true` melakukan ICMP ping + `UPDATE monitoring_devices` (status, latency, heartbeat). Write via GET. Smoke sengaja tidak memanggilnya. | `src/app/api/monitoring/route.ts:42-63` |
| B5 | 🟡 Rendah | `GET/POST /api/knowledge-base*` | 400/500 | Kontrak error tidak konsisten: memakai `{ success:false, error }`, bukan `{ success:false, message }` seperti 34 route lain dan `src/lib/api.ts`. Klien yang membaca `message` akan mendapat `undefined`. **Batch B:** terkonfirmasi juga pada POST (body kosong & id invalid) — 2 pelanggaran kontrak POST. | `src/app/api/knowledge-base/route.ts:73,102,152`; `[id]/route.ts:15,40`; `[id]/helpful/route.ts:15,36` |
| B6 | ⚪ Lingkungan (transient) | semua | — | Dev server mati 23:59:41 → smoke `fetch failed`. Bukan bug aplikasi; perlu server dinyalakan user lalu smoke diulang. | — |
| B7 | ⚪ Catatan performa | semua | — | Cold compile `next dev` sangat lambat (13–85 detik/request saat repo di-edit + IDE eksternal aktif); setelah hangat `/api/health` ±0,78 detik. Bukan bug kode; perlu diukur ulang di produksi. | — |
| B8 | 🟡 Rendah | `POST /api/monitoring/ping` | 200 | Body kosong `{}` **tidak** ditolak 400: route masuk "Case 2" → ping SEMUA device (`monitoring_devices`) lalu `UPDATE` status/latency/heartbeat. Ini side-effect massal dari request tanpa parameter; kontrak POST tidak aman untuk retry/prefetch. Karena itu endpoint ini **tidak** diuji `contract-post.mjs` (akan menulis data). | `src/app/api/monitoring/ping/route.ts:42-97` |

---

## B1 — Backdoor password `"123"` pada login (kritis, sudah F3)

- **URL:** `POST /api/auth/login`
- **Status:** 200 (untuk kredensial apa pun yang lolos)
- **Bukti respons valid:**
  `{"success":true,"user":{"id":140,"username":"mis","name":"MIS OPS","role":"MIS","shop_location":"Semua Toko"}}`
- **Bukti respons salah:** 401 `{"success":false,"message":"Password yang Anda masukkan salah!"}`
- **Bukti backdoor (run final):** login user `admin` dengan password `123` → **200 `success:true`**
  (smoke menandainya sebagai warning `[KEAMANAN]`).
- **Dugaan penyebab:** logika validasi menerima `password === "123"` untuk semua user dan
  `password === username`; password DB dibandingkan sebagai string plaintext.
  ```ts
  const isDbPasswordMatch = user.password === password;
  const isAdminBypass = cleanUser === "admin" && (password === "admin" || password === "123");
  const isNikSelfMatch = password === cleanUser || password === "123";   // ← universal "123"
  ```
- **Dampak:** siapa pun yang tahu satu username/NIK valid bisa login sebagai user tersebut.
- **Reproduksi:** `curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"<user-apa-saja>","password":"123"}'`
- **File:** `src/app/api/auth/login/route.ts:38-47` (bypass), `:38` (plaintext compare).
- **Catatan QA:** guardrail sprint melarang mengubah alur auth malam ini — dicatat, **tidak diperbaiki**.

## B2 — `GET /api/users` membocorkan password (kritis)

- **URL:** `GET /api/users` dan `GET /api/users/[id]`
- **Status:** 200
- **Bukti bentuk respons:**
  `{"success":true,"data":[{"id":140,"username":"mis","name":"MIS OPS","role":"MIS","shop_location":"Semua Toko","password":"<terisi>","created_at":"...","updated_at":"..."}]}`
  — 43 baris; seluruh baris memiliki field `password` dan nilainya terisi. Detail `GET /api/users/<id>`
  juga mengembalikan field yang sama.
- **Dugaan penyebab:** query `SELECT` menyertakan kolom `password` (plaintext), bukan hanya untuk
  kebutuhan internal.
  ```ts
  "SELECT id, username, name, role, shop_location, password, created_at, updated_at FROM users ..."
  ```
- **Dampak:** kebocoran kredensial seluruh karyawan lewat API yang terbuka tanpa autentikasi server
  (auth masih client-side, F2). Ini eskalasi serius dari F3.
- **Reproduksi:** `curl -s http://localhost:3000/api/users` → periksa key `password` pada `data[]`.
- **File:** `src/app/api/users/route.ts:12`, `src/app/api/users/[id]/route.ts:12`.
- **Saran triase (bukan dikerjakan QA):** keluarkan `password` dari `SELECT` GET list/detail; field itu
  hanya boleh dipakai di route login (dan sebaiknya di-hash, P1).
- **Catatan QA:** `tests/smoke.mjs` menandai temuan ini pada `warnings` dan meredaksi nilai `password`
  di `tests/last-run.json`.

## B3 — `GET /api/knowledge-base/[id]` menulis `view_count` (rendah)

- **URL:** `GET /api/knowledge-base/<id>`
- **Status:** 200
- **Dugaan penyebab:** route GET menjalankan `UPDATE knowledge_base SET view_count = view_count + 1`
  sebelum membaca artikel.
- **Dampak:** GET tidak idempotent; prefetch, crawler, dan smoke test menambah counter. Setiap run
  smoke menambah 2 view (warm-up + pengukuran).
- **File:** `src/app/api/knowledge-base/[id]/route.ts:19-22`.
- **Saran triase:** pindahkan increment ke `POST` terpisah, atau setidaknya dokumentasikan efeknya.
  QA tidak mengubah route.

## B4 — `GET /api/monitoring?ping=true` melakukan UPDATE (rendah)

- **URL:** `GET /api/monitoring?ping=true`
- **Status:** 200 (diasumsikan; tidak dipanggil smoke karena menulis data)
- **Dugaan penyebab:** query param `ping=true` memicu `pingPool()` lalu `UPDATE monitoring_devices`
  (status, response_time_ms, last_heartbeat) di dalam handler GET.
- **Dampak:** request GET mengubah data produksi dan melakukan ping jaringan; tidak aman di-cache,
  di-prefetch, atau di-retry.
- **File:** `src/app/api/monitoring/route.ts:42-63` (UPDATE di `:49`).
- **Saran triase:** pindahkan ke `POST /api/monitoring/ping` (sudah ada route terpisah
  `src/app/api/monitoring/ping/route.ts`).

## B5 — Kontrak error knowledge-base tidak konsisten (rendah)

- **URL:** `GET/POST /api/knowledge-base`, `GET/PUT/DELETE /api/knowledge-base/[id]`,
  `POST /api/knowledge-base/[id]/helpful`
- **Status:** 400 / 500
- **Respons contoh:** `{"success":false,"error":"Artikel panduan tidak ditemukan"}`
  (route lain: `{"success":false,"message":"..."}`)
- **Dugaan penyebab:** route knowledge-base dibuat dengan pola `error`, sedangkan standar
  `src/lib/api.ts` dan 34 route lain memakai `message`.
- **Dampak:** kode klien yang membaca `res.message` mendapat `undefined`; pesan error tidak tampil.
- **File:** `src/app/api/knowledge-base/route.ts:73,102,152`;
  `src/app/api/knowledge-base/[id]/route.ts:15,40`;
  `src/app/api/knowledge-base/[id]/helpful/route.ts:15,36`.
- **Catatan:** dulu smoke hanya meng-assert happy path; **sejak Batch A** kasus negatif diuji dan
  pelanggaran tercatat otomatis di `tests/last-run.json` (`contractViolations`). Diverifikasi live:
  `GET /api/knowledge-base/999999` → 404 `{"success":false,"error":"Artikel panduan tidak ditemukan"}`;
  `GET /api/knowledge-base/abc` → 400 `{"success":false,"error":"ID tidak valid"}`. **Belum diperbaiki.**
- **Batch B (POST):** `POST /api/knowledge-base` body `{}` → 400
  `{"success":false,"error":"Judul, kategori, dan isi panduan wajib diisi"}`;
  `POST /api/knowledge-base/abc/helpful` → 400 `{"success":false,"error":"ID tidak valid"}`.
  Keduanya tercatat di `tests/contract-post-last-run.json` (`contractViolations`, 2 pelanggaran).

## B6 — Dev server mati saat verifikasi (lingkungan, sudah pulih)

- **Gejala:** semua request `fetch failed` dalam ≤281 ms; tidak ada listener `:3000`; tidak ada
  `node.exe`; `.next/trace` berhenti 23:59:41.
- **Penyebab dugaan:** dev server di-kill proses eksternal (IDE/tool user) saat repo sedang di-edit;
  restart pertama macet karena cache `.next` korup, lalu dibersihkan oleh Lead. Bukan oleh QA.
- **Dampak:** smoke run 23:59:55 tidak valid (0 PASS / 19 FAIL jaringan / 9 SKIP). Bukan temuan bug API.
- **Status: SELESAI/ditutup.** Dev server hidup 00:04 (restart aman oleh Lead), `/api/health` 200,
  lalu final gate 00:10:47 → 28/28 PASS. Script smoke kini punya deteksi `[FATAL]` bila server tidak
  merespons dan berhenti cepat, bukan menghasilkan 19 FAIL palsu.

## B7 — Catatan performa cold compile `next dev` (bukan bug)

- Request pertama per route saat repo aktif diedit: 13.572–85.805 ms (contoh: `/api/stats` 36,8 s;
  `/api/knowledge-base` 80,7 s; login 85,8 s). Setelah route terkompilasi, `/api/health` ±0,78 s
  (laporan Lead). Smoke test melakukan warm-up dan mengukur latency setelah warm-up; nilai >500 ms
  ditandai `LAMBAT`, >1500 ms = FAIL (budget Batch A).
- **Mode produksi (`npm run start`, Batch A):** seluruh 47 request terukur ≤41 ms. Tidak ada isu
  performa pada build produksi; angka cold compile hanya artefak `next dev`.

## B8 — `POST /api/monitoring/ping` body kosong = ping massal + UPDATE (rendah)

- **URL:** `POST /api/monitoring/ping` dengan body `{}` (tanpa `ip`/`asset_codes`/`location`).
- **Status:** 200 `supposedly` (bukan 400) — route masuk "Case 2: Batch ping (by asset_codes, by
  location, or all)" sehingga memilih **semua** `monitoring_devices` yang punya IP, melakukan ICMP
  ping massal (pool 15 worker) lalu `UPDATE monitoring_devices` (status, response_time_ms,
  last_heartbeat).
- **Dugaan penyebab:** tidak ada validasi wajib-parameter di awal handler; fallback "all" adalah
  perilaku sengaja untuk trigger massal, tetapi kontrak POST-nya tidak aman (retry/prefetch/klien
  salah kirim body kosong = menulis 167 baris).
- **Dampak:** side effect massal dari request tanpa argumen; tidak aman dijadikan endpoint kontrak
  generik. Bukan data loss, tetapi mengubah 167 baris monitoring.
- **File:** `src/app/api/monitoring/ping/route.ts:42-97` (Case 2, UPDATE di baris 88).
- **Catatan QA:** endpoint ini **tidak diuji** `tests/contract-post.mjs` karena body kosong tidak
  dijamin 400 dan akan menulis data. **Belum diperbaiki.**

---

## Batch A Shift 2 — perluasan smoke & regression gate (00:26 WIB, server produksi)

**`tests/smoke.mjs` sekarang 47 request** (semuanya read-only):

| Kelompok | Jumlah | Ekspektasi | Hasil |
|---|---|---|---|
| Happy path GET | 26 | 16 list + 9 detail (id nyata) + `/api/health` → 200 `success:true` | ✅ 26/26 PASS |
| Login | 4 | valid 200; salah 401; field kosong 400; user tak terdaftar 401 | ✅ 4/4 PASS |
| Negatif detail id tidak ada | 8 | 404 `success:false` (assets/dvr/edc/extensions/office/pos-hardware/t3/users) | ✅ semua PASS |
| Negatif knowledge-base | 2 | 404 id tidak ada, 400 id bukan angka `success:false` | ✅ PASS, tetapi field `error` (B5) |
| Negatif path traversal | 2 | 404, JSON valid, tidak fatal | ✅ PASS (tidak crash; `..%2F..%2Fpackage.json`, `..%2F..%2F..%2Fetc%2Fpasswd` → 404) |
| Negatif query invalid | 5 | 200 `success:true`, data array (null byte/wildcard/lokasi/status/urgensi/search aneh) | ✅ PASS (array kosong, tidak crash) |

- **Budget latency:** FAIL bila >`SMOKE_LATENCY_BUDGET_MS` (default **1500 ms**) setelah warm-up.
  Hasil mode produksi: maksimum **41 ms**, 0 FAIL, 0 lambat.
- **Kontrak error:** pelanggaran `message` vs `error` dicatat di `contractViolations` +
  `tests/last-run.json` (2 pelanggaran: `/api/knowledge-base/999999` dan `/api/knowledge-base/abc`).
  Tidak menggagalkan run karena B5 adalah bug pre-existing yang belum boleh diperbaiki QA.
- **`tests/regression.mjs`** (gate antar-batch): smoke + `/api/health` + total baris DB via API
  (stats 784 + users 43 + tickets 2 + role_permissions 130 + rack_units 23 = **982**) + warning
  kebocoran `password`. Hasil: **PASS, exit 0**, health 200 `db:ok` tables 15 `wal:wal`, baris DB
  982 = baseline, warning password 43 baris + detail.
- **Temuan baru:** tidak ada bug endpoint baru — seluruh 17 kasus negatif aman. Yang terkonfirmasi
  masih ada: **B1** (backdoor `123`, `admin`/`123` → 200), **B2** (field `password` bocor 43 baris),
  **B3** (view_count bertambah; tiap run smoke +2), **B5** (kontrak `error` di knowledge-base).
  Semua **belum diperbaiki**.

---

## Batch B Shift 2 — kontrak POST non-mutasi & unit test helper API (00:33 WIB, server produksi)

**`tests/contract-post.mjs`** (baru): mengirim **hanya payload kosong `{}`** ke 18 endpoint POST,
semua mengharapkan **HTTP 400 `success:false`**, dan menghitung ulang total baris DB via API
sebelum & sesudah **setiap** tes.

| Kelompok | Jumlah endpoint | Hasil |
|---|---|---|
| CRUD POST (`assets`, `dvr`, `edc`, `extensions`, `knowledge-base`, `office`, `pos-hardware`, `purchases`, `server-rack`, `t3-assets`, `tickets`, `users`) | 12 | ✅ 12/12 HTTP 400, baris DB 982→982 |
| Action POST (`anydesk/connect`, `dvr/test-connect`, `edc/ping`, `pos/heartbeat`, `permissions`, `knowledge-base/abc/helpful`) | 6 | ✅ 6/6 HTTP 400, baris DB 982→982 |

- **Total: 18/18 PASS, 0 FAIL, exit 0.** Baris DB **982 sebelum = 982 sesudah** (stats 784 + users 43
  + tickets 2 + role_permissions 130 + rack_units 23). Tidak ada payload valid/parsial yang dikirim.
- **Kontrak error POST:** 2 pelanggaran (`knowledge-base` & `helpful` memakai `error`) — dicatat,
  tidak menggagalkan gate (B5).
- **`POST /api/monitoring/ping` dikecualikan** karena body kosong memicu ping massal + UPDATE
  (temuan baru **B8**), bukan 400.
- **Unit test `src/lib/api.ts`** (`tests/api-helpers.test.mjs`, 16 test PASS): `parseFilters`,
  `requireFields`, `ok`, `fail`, `jsonError`. Import `next/server` tidak bisa di-resolve Node murni →
  loader stub `tests/helpers/next-server-loader.mjs` (tanpa mengubah `src/**`), dicatat di README.
- **Gate:** `node scripts/verify.mjs` → **exit 0** (tsc 0 error + smoke 47/47 + kontrak POST 18/18 +
  unit 45/45); `node tests/regression.mjs` → **PASS, exit 0** (982, health ok, warning password).
- **Temuan baru:** B8 (monitoring ping massal). B1/B2/B3/B5 tetap ada dan **belum diperbaiki**.

---

## Yang TIDAK dilakukan QA

- Tidak mengubah file `src/**` (termasuk `src/app/assets/page.tsx` dan
  `src/app/api/anydesk/connect/route.ts` milik scope eksternal).
- Tidak mengubah skema/data DB, tidak `git commit`, tidak `npm install`, tidak `next build`,
  tidak menyalakan/mematikan/restart dev server.
- Tidak pernah mengirim payload POST valid/parsial ke endpoint data. Satu-satunya request tulis yang
  dilakukan adalah `POST /api/auth/login` (read-only, tidak membuat baris) dan 18 POST berpayload
  kosong yang dijamin ditolak 400 sebelum insert (diverifikasi kode + baris DB tetap 982).
