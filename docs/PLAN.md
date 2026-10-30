# RENCANA SPRINT MALAM — MIS SHOP OPS
> Disusun oleh: PM (DeepSeek Harness) · 30 Okt 2026 23:38 WIB
> Referensi: `docs/ANALISIS-PROYEK.md`, `AI_RULES.md`, baseline commit `6f175a0`
> Target selesai: sebelum 05:00 WIB · Dev server user AKTIF di `:3000` (JANGAN distop)

---

## 1. Tujuan Sprint

Membangun **fondasi teknik yang aman** di atas aplikasi produksi yang sedang berjalan, **tanpa mengubah perilaku bisnis** dan **tanpa menyentuh data/auth**. Empat pilar:

1. **DRY + Database-First** — tegakkan `AI_RULES.md`: `utils.ts`, `components/common/`, `hooks/useApiData.ts`, `lib/api.ts` (F6/F10).
2. **Jaring pengaman** — test harness tanpa dependency baru: smoke test 35 endpoint + unit test helper + `scripts/verify.mjs` (F7).
3. **Amankan data** — backup konsisten + index aditif + laporan kualitas data (F8/F9).
4. **Dokumentasi & jejak** — git baseline (sudah), analisis, rencana, laporan bug & sprint.

**Di luar scope (P1, keputusan user):** server-side auth/session (F2/F3), pecah file monolit (F4), hapus `seed.ts` (F5), migrasi skema bernomor (F8).

---

## 2. Tim & Pembagian Task

| Task | Owner | Deliverable utama | Write scope (TIDAK boleh melebar) |
|---|---|---|---|
| task-1 | **frontend** | `src/lib/utils.ts`, `src/components/common/*`, `src/hooks/useApiData.ts`, adopsi di `/tickets` + `/extensions`, `docs/FRONTEND-NOTES.md` | `src/lib/utils.ts`, `src/components/common/`, `src/hooks/`, 2 page tsb, docs/FRONTEND-NOTES.md |
| task-2 | **backend** | `src/lib/api.ts`, `GET /api/health`, adopsi surgical di assets/tickets/edc, `docs/BACKEND-NOTES.md` | `src/lib/api.ts`, `src/app/api/health/`, 3 route tsb, docs/BACKEND-NOTES.md |
| task-3 | **data** | `scripts/db-health.mjs`, `scripts/backup-db.mjs`, index aditif di `src/lib/db.ts`, `docs/DATA-HEALTH.md` | scripts/*, `src/lib/db.ts`, docs/DATA-HEALTH.md |
| task-4 | **testing** | `tests/smoke.mjs` (35 endpoint), `scripts/verify.mjs`, `docs/BUGS.md`, `tests/README.md` | `tests/`, `scripts/verify.mjs`, docs/BUGS.md |
| task-6 | **testing** | `tests/lib.test.mjs` (unit test utils), update `tests/README.md` | `tests/` |
| task-5 | **pm** | `docs/PLAN.md`, triase, verifikasi gate, `docs/LAPORAN-SPRINT.md` | `docs/` saja |

**Urutan/ketergantungan:** task-1 ∥ task-2 ∥ task-3 ∥ task-4 berjalan paralel. **task-6 blocked_by task-1** (butuh `src/lib/utils.ts` ada). task-5 memantau & menutup.

---

## 3. Aturan Anti-Konflik (write scope)

- **Satu file = satu pemilik.** Tidak ada dua agent mengedit file yang sama.
- Titik gesek potensial: `src/lib/db.ts` (milik data) — agent lain hanya **membaca**, tidak mengedit.
- `docs/` dipisah per file; PM satu-satunya yang menulis `PLAN.md`, `LAPORAN-SPRINT.md`, `TRIASE.md`.
- Bila butuh menyentuh file di luar scope → **lapor PM dulu**, jangan bypass.
- `docs/BUGS.md` ditulis testing; perbaikan bug **ditugaskan PM** ke pemilik file, maks 1 fix per peer.

---

## 4. Definisi Selesai (gate penutupan)

- [ ] `npx tsc --noEmit` → **0 error** (diverifikasi PM dari root proyek).
- [ ] `node tests/smoke.mjs` → **semua endpoint PASS** (exit 0), hasil nyata ditulis ke `tests/last-run.json`.
- [ ] `src/lib/utils.ts`, `src/components/common/*`, `src/hooks/useApiData.ts`, `src/lib/api.ts` ada & **dipakai nyata** (bukan dead code).
- [ ] `tests/` + `scripts/verify.mjs` + `scripts/db-health.mjs` + `scripts/backup-db.mjs` berjalan tanpa `npm install`.
- [ ] Index aditif terpasang (terbukti di `sqlite_master`), **row count tiap tabel tidak berubah**.
- [ ] `docs/` berisi: ANALISIS (sudah), PLAN, FRONTEND-NOTES, BACKEND-NOTES, DATA-HEALTH, BUGS, LAPORAN-SPRINT.
- [ ] Aplikasi tetap normal di `:3000`; tidak ada data hilang; keempat task peer **completed**.

---

## 5. Guardrail Operasional (WAJIB)

1. **DB produksi read-only**: dilarang `DROP`/`DELETE`/`UPDATE` data bisnis. Satu-satunya tulis = `CREATE INDEX IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` (aditif, reversible).
2. **Jangan sentuh auth/login** (F2/F3) — dicatat sebagai P1, bukan diubah malam ini.
3. **Jangan** `npm install`, `next build`, `start-server.bat`, atau membunuh proses node — dev server user hidup.
4. **Commit git hanya Lead**; semua agent lain dilarang `git commit/checkout/reset`.
5. **Surgical edits** — jangan menulis ulang file >300 baris utuh.
6. Hemat kuota: baca via grep/offset, 1× verifikasi per tahap, laporan ≤15 baris, **berhenti saat acceptance terpenuhi** (no gold-plating/refactor liar).
7. Jangan spawn subagent/Agent Teams baru.

---

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dua agent mengedit file sama | Perubahan hilang / korup | Write scope ketat (tabel §2), PM arbitrasi |
| Refactor mengubah kontrak API | UI rusak saat dev | Non-breaking wajib; parity test backend; smoke test |
| `next build`/kill node mematikan server user | User kehilangan akses | Dilarang keras; verifikasi via `tsc` + HTTP smoke |
| Data terhapus/berubah | Fatal produksi | Backup sebelum intervensi, DB read-only, row count dibandingkan |
| Waktu habis sebelum 05:00 | Sprint tidak lengkap | Prioritas: gate `tsc` + smoke; task non-kritis masuk backlog |
| Bug ditemukan smoke test | Gate merah | Triase PM: P0 diperbaiki pemilik file (1 fix), P1/P2 backlog |
| **Tool AI eksternal (Cursor user) dapat mengedit file sewaktu-waktu** | Perubahan di luar scope/rencana masuk commit | **Verifikasi akhir wajib cek `git diff` semua file di luar write scope** (mis. `assets/page.tsx`, `api/anydesk/connect/route.ts`); jangan revert otomatis, eskalasi ke Lead. Lead commit terpisah "perubahan eksternal (preserved)". |

---

## 7. Mekanisme Pelaporan

- Tiap peer: `send_message` ke `pm`, ≤15 baris, **wajib sertakan bukti angka** (tsc error count, pass/fail endpoint count, row count).
- PM triase `docs/BUGS.md` → `docs/TRIASE.md` (bila perlu).
- PM verifikasi akhir: `npx tsc --noEmit` + `node tests/smoke.mjs` sendiri sebelum menutup.
- Laporan akhir: `docs/LAPORAN-SPRINT.md` → `send_message` ke `lead` → task-5 completed → STOP.
