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
| **00:11 WIB (31 Okt)** | **FINAL GATE — `node tests/smoke.mjs`: 28/28 PASS, 0 FAIL, 0 SKIP, 0 lambat (>500 ms), durasi 2,6 detik. Login 200/401 benar. Cross-check `/api/stats` vs list 11/11 cocok. Lalu `node scripts/verify.mjs`: tsc 0 error + smoke 28/28 + unit 29/29 → exit 0.** |

**Kesimpulan:** tidak ada endpoint yang gagal. Semua 25 endpoint GET + `/api/health` + 2 skenario login
lulus pada run final. Temuan di bawah adalah risiko keamanan/kontrak/side-effect yang perlu triase PM,
bukan endpoint rusak. Latency warm terburuk: 169 ms (`POST login`) dan 113 ms (`GET /api/edc/[id]`);
semua < 500 ms pada server hangat.

## Ringkasan temuan

| # | Severity | Endpoint | HTTP | Temuan | File terkait |
|---|---|---|---|---|---|
| B1 | 🔴 Kritis (sudah tercatat sebagai F3) | `POST /api/auth/login` | 200 | Password universal `"123"` diterima untuk **user mana pun** (backdoor); password dibandingkan plaintext. Terverifikasi final: user `admin` + password `123` → 200. | `src/app/api/auth/login/route.ts:38-47` |
| B2 | 🔴 Kritis | `GET /api/users`, `GET /api/users/[id]` | 200 | Respons membocorkan field `password` (nilai terisi) untuk 43 user — siapa pun yang bisa memanggil API dapat membaca kredensial. Terverifikasi final. | `src/app/api/users/route.ts:12`, `src/app/api/users/[id]/route.ts:12` |
| B3 | 🟡 Rendah | `GET /api/knowledge-base/[id]` | 200 | GET mengubah data: `view_count = view_count + 1` setiap akses. Melanggar semantik GET (prefetch/crawler/smoke ikut menambah counter). | `src/app/api/knowledge-base/[id]/route.ts:18-22` |
| B4 | 🟡 Rendah | `GET /api/monitoring?ping=true` | 200 | GET dengan query `ping=true` melakukan ICMP ping + `UPDATE monitoring_devices` (status, latency, heartbeat). Write via GET. Smoke sengaja tidak memanggilnya. | `src/app/api/monitoring/route.ts:42-63` |
| B5 | 🟡 Rendah | `GET/POST /api/knowledge-base*` | 400/500 | Kontrak error tidak konsisten: memakai `{ success:false, error }`, bukan `{ success:false, message }` seperti 34 route lain dan `src/lib/api.ts`. Klien yang membaca `message` akan mendapat `undefined`. | `src/app/api/knowledge-base/route.ts:73,102,152`; `[id]/route.ts:15,40`; `[id]/helpful/route.ts:15,36` |
| B6 | ⚪ Lingkungan (transient) | semua | — | Dev server mati 23:59:41 → smoke `fetch failed`. Bukan bug aplikasi; perlu server dinyalakan user lalu smoke diulang. | — |
| B7 | ⚪ Catatan performa | semua | — | Cold compile `next dev` sangat lambat (13–85 detik/request saat repo di-edit + IDE eksternal aktif); setelah hangat `/api/health` ±0,78 detik. Bukan bug kode; perlu diukur ulang di produksi. | — |

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
- **Catatan:** smoke test hanya meng-assert happy path (200), jadi tidak masuk hitungan FAIL.

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
  ditandai `LAMBAT` tetapi tidak menggagalkan test. Pada run final server hangat, **semua endpoint
  <500 ms** (terburuk 214 ms), jadi tidak ada isu performa yang bisa disimpulkan dari dev ini.

---

## Yang TIDAK dilakukan QA

- Tidak mengubah file `src/**` (termasuk `src/app/assets/page.tsx` dan
  `src/app/api/anydesk/connect/route.ts` milik scope eksternal).
- Tidak mengubah skema/data DB, tidak `git commit`, tidak `npm install`, tidak `next build`,
  tidak menyalakan/mematikan/restart dev server.
- Endpoint mutasi (POST/PUT/DELETE data) sengaja tidak dipanggil, hanya `POST /api/auth/login`.
