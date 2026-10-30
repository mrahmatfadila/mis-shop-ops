# TRIASE TEMUAN QA — MIS SHOP OPS (Sprint Malam 30–31 Okt 2026)

> Disusun oleh: **PM** · sumber: `docs/BUGS.md` (testing) · status akhir: 31 Okt 2026
> Prinsip: gate malam ini = `tsc` 0 + smoke hijau. **Auth/users tidak diubah malam ini** (guardrail Lead).
> Keputusan per temuan, tanpa gold-plating, maksimal 1 fix kecil per peer (bila diperlukan).

## Matriks keputusan

| # | Severity QA | Triase PM | Keputusan malam ini | Alasan |
|---|---|---|---|---|
| B1 | 🔴 Kritis (F3) | **P1 — keputusan user** | **TIDAK diperbaiki** | Guardrail eksplisit: alur auth/login tidak disentuh malam ini. Backdoor `"123"` + plaintext password butuh desain auth server-side (F2) dan migrasi hash — pekerjaan tersendiri, bukan tambalan tengah malam. |
| B2 | 🔴 Kritis | **P1 — prioritas #1 putaran berikutnya** | **TIDAK diperbaiki** | `GET /api/users(+/[id])` mengembalikan 43 `password` plaintext tanpa autentikasi server (F2). Perbaikan = hapus kolom dari `SELECT` di 2 file, KECIL, **tetapi**: (a) di luar write scope semua peer, (b) kontrak respons berubah dan berisiko memutus tampilan Admin/Users yang mungkin menampilkan password, (c) dev server mati → tidak bisa regresi UI. Tidak layak dikerjakan buta. **Rekomendasi:** perbaiki bersama desain auth baru (hash + server session), jangan parsial. |
| B3 | 🟡 Rendah | P2 — backlog | TIDAK diperbaiki | `GET /api/knowledge-base/[id]` menulis `view_count`; semantik GET salah, dampak kecil (counter), menyentuh route di luar scope. |
| B4 | 🟡 Rendah | P2 — backlog | TIDAK diperbaiki | `GET /api/monitoring?ping=true` melakukan UPDATE; berisiko untuk data produksi, tapi butuh pindah ke `POST /api/monitoring/ping` + perubahan klien. Bukan gate malam. |
| B5 | 🟡 Rendah | P2 — backlog | TIDAK diperbaiki | Kontrak error `{error}` vs `{message}` di route knowledge-base; konsumen UI perlu disesuaikan. Dampak kosmetik fungsional. |
| B6 | ⚪ Lingkungan | **BLOCKER gate** | Ditunggu user/Lead | Dev server `:3000` mati 23:59:41 (bukan tim). Gate smoke tidak bisa dieksekusi sampai server hidup; `tsc` tetap bisa. |
| B7 | ⚪ Catatan | Info saja | — | Cold compile `next dev` 13–85 dtk karena repo diedit aktif; bukan bug kode, tidak relevan produksi. |

**Kesimpulan triase: 0 (nol) P0 aplikasi.** Tidak ada endpoint rusak/500 pada 16 GET list + login
saat server hidup (QA: 0 FAIL). Satu-satunya kegagalan smoke bersifat lingkungan (B6), bukan kode.
Dengan demikian **tidak ada bug-fix task untuk peer** — ini juga mencegah gold-plating dan menjaga write scope.

## Risiko yang dibawa ke laporan (bukan bug sprint)

1. **F2/F3 + B2 = permukaan serangan auth**: semua API terbuka tanpa auth server; password plaintext;
   `GET /api/users` membocorkan password; backdoor `"123"`. **Jangan buka aplikasi ini ke internet**
   sebelum diperbaiki (saat ini LAN internal).
2. **17 orphan `edc_assets.pos_location`** (pre-existing, dilaporkan data, tidak diperbaiki) — data
   operasional tidak konsisten dengan master POS; perlu keputusan bisnis.
3. **File monolit** (`assets` 2800 baris, `purchases` 2557) tetap; `extensions` 683 & `tickets` 388
   sudah turun tapi masih >200 (AI_RULES) — splitting di luar scope.
4. **Tool AI eksternal (Antigravity IDE)** masih aktif mengedit repo & mematikan dev server; commit
   history tercampur dan ada file di luar scope berubah. State akhir diverifikasi PM, bukan narasi history.

## Bukti dasar triase

- `docs/BUGS.md` §Status verifikasi: 16 GET list HTTP 200 `success:true` (23:44–23:52), login
  `mis`/`123` 200 & `mis`/salah 401 (23:57).
- Smoke run 23:59:55: 0 PASS / 19 FAIL jaringan / 9 SKIP → **tidak valid** (server mati), lihat B6.
- Unit test `tests/lib.test.mjs` (testing) menguji `src/lib/utils.ts` tanpa mengubah `src/`.
