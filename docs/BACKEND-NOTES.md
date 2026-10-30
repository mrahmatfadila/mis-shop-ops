# BACKEND-NOTES — MIS SHOP OPS

Catatan pekerjaan backend (task-2): helper API terpusat + kesehatan API, tanpa mengubah kontrak HTTP.

## 1. Helper baru: `src/lib/api.ts`

Kontrak respons lama dipertahankan 100% (klien lama tidak boleh rusak):

| Situasi | Shape |
|---|---|
| Sukses berdata | `{ success: true, data }` |
| Sukses berpesan | `{ success: true, message }` (dibuat inline, mis. POST) |
| Gagal validasi | `{ success: false, message }` + status 400 |
| Gagal server | `{ success: false, message }` + status 500 |

Fungsi:

- `ok(data, init?)` → `NextResponse.json({ success: true, data }, init)`.
- `fail(message, status = 400)` → `{ success: false, message }`.
- `jsonError(error, fallback?, status = 500)` → ambil `error.message`; `fallback` hanya dipakai bila message kosong. Status default 500.
- `parseFilters(searchParams, { allowed, ignore, ignoreByKey })` → objek nilai filter; sentinel "tampilkan semua" menjadi string kosong.
  - `ignore`: sentinel umum (mis. `"ALL"`).
  - `ignoreByKey`: sentinel per param (mis. `status: ["Semua Status", "Semua"]`) supaya semantik tiap param **persis** seperti kode lama.
  - Tidak melakukan `trim()` dan tidak mengubah value non-sentinel — perilaku identik.
- `requireFields(body, fields)` → `{ missing }`; memakai uji falsy (`!value`), sama dengan validasi lama (string kosong/null/undefined dianggap hilang).
- `meta: { total, page }` **tidak ditambahkan** karena tidak ada route paginasi di aplikasi ini.

## 2. Route baru: `GET /api/health`

- File: `src/app/api/health/route.ts` (`dynamic = "force-dynamic"`, tanpa cache).
- Respons 200: `{ success: true, db: "ok", tables: <jumlah tabel>, wal: "wal", uptimeSec: <detik> }`.
- Query ringan: `sqlite_master` (hitung tabel, tanpa data bisnis) + `PRAGMA journal_mode`.
- Error → `jsonError()` (500, `success: false`).

## 3. Route yang dimigrasi (adopsi surgical, zero behavior change)

| Route | Yang diadopsi | Catatan |
|---|---|---|
| `src/app/api/assets/route.ts` | `ok`, `jsonError`, `parseFilters`, `requireFields`, `fail` | GET & POST. SQL, ORDER BY, pesan error/validasi, status code tidak berubah. `console.error` lama dipertahankan. |
| `src/app/api/tickets/route.ts` | idem | GET POST; pesan validasi, `ticket_number` di respons POST, update status aset (RUSAK) tetap. |
| `src/app/api/edc/route.ts` | idem | GET POST; `zone` tetap `LIKE %zone%`, `active` tetap `is_active = ?`. |

Pola sebelum (contoh GET):

```ts
const result = await db.execute({ sql, args });
return NextResponse.json({ success: true, data: result.rows });
} catch (error: any) {
  return NextResponse.json({ success: false, message: error.message || "Failed..." }, { status: 500 });
}
```

Pola sesudah:

```ts
const result = await db.execute({ sql, args });
return ok(result.rows);
} catch (error) {
  return jsonError(error, "Failed...");
}
```

Filter: `if (status && status !== "Semua Status" && status !== "ALL" && status !== "Semua")` → `if (status)` setelah `parseFilters` menormalkan sentinel per param.

## 4. Route yang BELUM dimigrasi (masih pola lama, sengaja tidak disentuh)

`anydesk/connect`, `assets/[code]`, `auth/accounts`, `auth/login`, `dvr`, `dvr/test-connect`, `dvr/[id]`, `edc/ping`, `edc/[id]`, `extensions`, `extensions/[id]`, `knowledge-base`, `knowledge-base/[id]`, `knowledge-base/[id]/helpful`, `monitoring`, `monitoring/ping`, `office`, `office/[id]`, `permissions`, `pos/heartbeat`, `pos-hardware`, `pos-hardware/[id]`, `purchases`, `purchases/[id]`, `server-rack`, `server-rack/[id]`, `stats`, `t3-assets`, `t3-assets/[id]`, `tickets/[id]`, `users`, `users/[id]`.

Migrasinya aman dilakukan bertahap dengan pola yang sama; utamakan route yang menyentuh DB read/write. Route `auth/*` jangan diubah pada sprint ini (di luar scope).

## 5. Bukti parity (sebelum vs sesudah refactor)

Snapshot `%TEMP%\mis-parity-before` diambil sebelum edit; `%TEMP%\mis-parity-after` sesudah edit, lalu dibandingkan jumlah `data` + daftar key objek pertama:

| Endpoint | data sebelum | data sesudah | key objek pertama | Hasil |
|---|---|---|---|---|
| `GET /api/assets?search=printer` | 6 | 6 | 13 key, sama | PASS |
| `GET /api/assets?status=OPERASIONAL` | 156 | 156 | 13 key, sama | PASS |
| `GET /api/tickets` | 2 | 2 | 15 key, sama | PASS |
| `GET /api/edc` | 53 | 53 | 29 key, sama | PASS |
| `GET /api/dvr` | 27 | 27 | 22 key, sama | PASS |
| `GET /api/health` | (route baru) | 200 `{success:true, db:"ok", tables:15, wal:"wal", uptimeSec}` | — | PASS |

Semua `success` bernilai `true`, status HTTP 200. `PARITY_FAILURES=0`.

## 6. Temuan / catatan

- Tidak ditemukan bug respons baru pada 3 route yang dimigrasi; kontrak identik.
- `GET /api/tickets` hanya mengembalikan 2 baris pada snapshot parity (data saat itu) — bukan regresi refactor; nilainya sama sebelum & sesudah.
- `src/lib/db.ts` tidak disentuh (milik data agent); `initDb()` tetap dipanggil di awal handler seperti sebelumnya.
