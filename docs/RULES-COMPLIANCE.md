# RULES COMPLIANCE — Audit Statis AI_RULES.md

> Dibuat otomatis oleh `tests/static-rules.mjs` (read-only, tanpa dependency baru)
> Waktu: 2026-10-30T17:52:18.596Z · Baseline Shift 2: `e6c8621` · File src: 77
> **Exit code:** 0 (0 pelanggaran berat · 8 warning)

## Ringkasan

| Kategori | Hasil | Status |
|---|---|---|
| File >1000 baris | 10 file (semua legacy) | ⚠️ WARNING |
| File >400 baris | 18 file | ⚠️ WARNING |
| Array hardcoded >5 objek (kandidat) | 11 kandidat | ⚠️ WARNING / tinjau manual |
| Penggunaan `any` | 98 kemunculan di 39 file | ⚠️ WARNING |
| `@ts-ignore` / `@ts-expect-error` | 0 | ✅ tidak ada |
| Duplikasi format di luar utils.ts | 2 file | ⚠️ WARNING |
| `"use client"` halaman | 16/17 | ℹ️ INFO |
| Import lucide-react | 28 file (namespace: 0) | ℹ️ INFO |
| **Pelanggaran berat** | **0** | **✅ LULUS** |

## 1. File sumber panjang (target AI_RULES: 150–200 baris)

| Baris | Tier | File | Legacy? |
|---|---|---|---|
| 3.295 | >1000 | `src/lib/seed.ts` | ya |
| 2.992 | >1000 | `src/app/assets/page.tsx` | ya |
| 2.704 | >1000 | `src/app/purchases/page.tsx` | ya |
| 2.128 | >1000 | `src/app/pos-topology/page.tsx` | ya |
| 1.937 | >1000 | `src/app/edc/page.tsx` | ya |
| 1.532 | >1000 | `src/app/dvr/page.tsx` | ya |
| 1.422 | >1000 | `src/app/server-rack/page.tsx` | ya |
| 1.177 | >1000 | `src/app/office/page.tsx` | ya |
| 1.134 | >1000 | `src/app/knowledge-base/page.tsx` | ya |
| 1.006 | >1000 | `src/components/SidebarLayout.tsx` | ya |
| 946 | >400 | `src/app/t3-assets/page.tsx` | **tidak** |
| 892 | >400 | `src/app/monitoring/page.tsx` | **tidak** |
| 841 | >400 | `src/components/BarcodeGeneratorModal.tsx` | **tidak** |
| 788 | >400 | `src/app/dashboard/page.tsx` | **tidak** |
| 775 | >400 | `src/app/users/page.tsx` | **tidak** |
| 767 | >400 | `src/app/permissions/page.tsx` | **tidak** |
| 683 | >400 | `src/app/extensions/page.tsx` | **tidak** |
| 457 | >400 | `src/lib/db.ts` | **tidak** |

> Semua file >1000 baris saat ini adalah monolit **legacy** yang sudah tercatat di
> `docs/ANALISIS-PROYEK.md` (F4/F5), jadi tidak dihitung pelanggaran berat. File baru >1000 baris
> akan menggagalkan audit.

## 2. Heuristik array data hardcoded (src/app & src/components)

| Objek | File | Variabel | Baris | Shift 2? | Catatan |
|---|---|---|---|---|---|
| 37 | `src/components/BarcodeGeneratorModal.tsx` | opts | 60 | tidak | tinjau manual — config/legacy, kemungkinan false-positive |
| 34 | `src/components/SidebarLayout.tsx` | navGroups | 274 | tidak | tinjau manual — config/legacy, kemungkinan false-positive |
| 27 | `src/app/pos-topology/page.tsx` | reportText | 719 | tidak | tinjau manual — config/legacy, kemungkinan false-positive |
| 15 | `src/app/api/permissions/route.ts` | SYSTEM_MENUS | 14 | ya | kandidat |
| 10 | `src/app/pos-topology/page.tsx` | T3_STORES | 62 | tidak | kandidat |
| 10 | `src/app/users/page.tsx` | ROLE_OPTIONS | 34 | tidak | kandidat |
| 9 | `src/app/monitoring/page.tsx` | locationTabs | 260 | ya | kandidat |
| 9 | `src/app/pos-topology/page.tsx` | peripheralItems | 749 | tidak | kandidat |
| 8 | `src/app/api/permissions/route.ts` | SYSTEM_ROLES | 32 | ya | kandidat |
| 8 | `src/components/SidebarLayout.tsx` | rolesList | 120 | tidak | kandidat |
| 7 | `src/app/purchases/page.tsx` | STATUS_PIPELINE | 84 | tidak | kandidat |

> Heuristik menghitung objek literal `{` di dalam array. Array >20 objek di file **Shift 2** =
> pelanggaran berat; array legacy/config dilaporkan sebagai warning karena bisa berupa konfigurasi UI
> (nav, opsi barcode), bukan data bisnis.

## 3. Penggunaan `any` & directive TS

| File | Jumlah any |
|---|---|
| `src/lib/seed.ts` | 14 |
| `src/app/purchases/page.tsx` | 10 |
| `src/app/server-rack/page.tsx` | 8 |
| `src/app/api/t3-assets/route.ts` | 4 |
| `src/app/assets/page.tsx` | 4 |
| `src/lib/db.ts` | 4 |
| `src/app/api/extensions/route.ts` | 3 |
| `src/app/api/knowledge-base/[id]/route.ts` | 3 |
| `src/app/api/knowledge-base/route.ts` | 3 |
| `src/app/monitoring/page.tsx` | 3 |
| `src/app/permissions/page.tsx` | 3 |
| `src/components/ScannerModal.tsx` | 3 |
| `src/components/SidebarLayout.tsx` | 3 |
| `src/app/api/auth/accounts/route.ts` | 2 |
| `src/app/api/monitoring/ping/route.ts` | 2 |
| `src/app/api/monitoring/route.ts` | 2 |
| `src/app/api/server-rack/route.ts` | 2 |
| `src/app/office/page.tsx` | 2 |
| `src/components/TicketModal.tsx` | 2 |
| `src/lib/cache.ts` | 2 |
| `src/app/api/anydesk/connect/route.ts` | 1 |
| `src/app/api/auth/login/route.ts` | 1 |
| `src/app/api/dvr/route.ts` | 1 |
| `src/app/api/dvr/test-connect/route.ts` | 1 |
| `src/app/api/knowledge-base/[id]/helpful/route.ts` | 1 |
| `src/app/api/office/route.ts` | 1 |
| `src/app/api/permissions/route.ts` | 1 |
| `src/app/api/pos-hardware/route.ts` | 1 |
| `src/app/api/purchases/route.ts` | 1 |
| `src/app/api/users/route.ts` | 1 |
| `src/app/dashboard/page.tsx` | 1 |
| `src/app/dvr/page.tsx` | 1 |
| `src/app/extensions/page.tsx` | 1 |
| `src/app/knowledge-base/page.tsx` | 1 |
| `src/app/page.tsx` | 1 |
| `src/app/pos-topology/page.tsx` | 1 |
| `src/app/t3-assets/page.tsx` | 1 |
| `src/components/BarcodeGeneratorModal.tsx` | 1 |
| `src/components/Navbar.tsx` | 1 |

- Total `any`: **98** di 39 file.
- File Shift 2 yang `any`-nya **bertambah** vs baseline: **0** (tidak ada pelanggaran berat).
- `@ts-ignore`/`@ts-expect-error`: **0**.

## 4. Duplikasi format di luar `src/lib/utils.ts`

| File | formatRupiah | toLocaleString(id-ID) | Format tanggal |
|---|---|---|---|
| `src/app/assets/page.tsx` | 0 | 0 | 4 |
| `src/app/t3-assets/page.tsx` | 3 | 0 | 0 |

> Target AI_RULES: format rupiah/tanggal/badge wajib lewat `src/lib/utils.ts`. Temuan ini
> **warning** (belum diperbaiki) — lihat BUGS F6.

## 5. Info: "use client" & lucide-react

- Halaman `"use client"`: **16/17** halaman `src/app/**/page.tsx`.
- File yang meng-import `lucide-react`: **28**; import namespace (`import * as`): **0**.
  Import per-ikon (named) adalah pola yang dipakai; info saja.

## Pelanggaran berat (exit non-zero)

_Tidak ada._


## Warning (tidak menggagalkan audit)

- ⚠️ [DUPLIKASI] src/app/assets/page.tsx: formatRupiah=0, toLocaleString("id-ID")=0, format tanggal=4 — seharusnya pakai src/lib/utils.ts.
- ⚠️ [ARRAY] src/app/pos-topology/page.tsx:719 "reportText" punya 27 objek literal — file legacy/config, kemungkinan config UI (false-positive), bukan data bisnis baru.
- ⚠️ [DUPLIKASI] src/app/t3-assets/page.tsx: formatRupiah=3, toLocaleString("id-ID")=0, format tanggal=0 — seharusnya pakai src/lib/utils.ts.
- ⚠️ [ARRAY] src/components/BarcodeGeneratorModal.tsx:60 "opts" punya 37 objek literal — file legacy/config, kemungkinan config UI (false-positive), bukan data bisnis baru.
- ⚠️ [ARRAY] src/components/SidebarLayout.tsx:274 "navGroups" punya 34 objek literal — file legacy/config, kemungkinan config UI (false-positive), bukan data bisnis baru.
- ⚠️ [FILE] 10 file >1000 baris (legacy): src/lib/seed.ts (3295), src/app/assets/page.tsx (2992), src/app/purchases/page.tsx (2704), src/app/pos-topology/page.tsx (2128), src/app/edc/page.tsx (1937), src/app/dvr/page.tsx (1532), src/app/server-rack/page.tsx (1422), src/app/office/page.tsx (1177), src/app/knowledge-base/page.tsx (1134), src/components/SidebarLayout.tsx (1006).
- ⚠️ [FILE] 18 file >400 baris; target AI_RULES 150–200 baris per file.
- ⚠️ [ANY] 98 kemunculan any di 39 file (0 file Shift 2 bertambah — lihat heavy).

## Metode & batasan

- Scan read-only `src/**/*.ts{,x}`; hanya menulis file laporan ini.
- File Shift 2 dideteksi via `git diff --name-only e6c8621 -- src` (read-only). Bila git tidak
  tersedia, deteksi "any baru" dilewati dan dilaporkan sebagai warning.
- Heuristik array/`any` memakai regex sederhana — bisa false-positive (config UI, tipe library).
- File legacy pada daftar `LEGACY_MONOLITHS` (dari ANALISIS-PROYEK F4/F5) dikecualikan dari
  pelanggaran berat file >1000 baris.

## Cara menjalankan

```powershell
cd "C:\Users\Lenovo\Documents\Project Coding\MIS SHOP OPS"
node tests/static-rules.mjs
```

Exit code 0 = tidak ada pelanggaran berat; 1 = ada (lihat bagian pelanggaran berat).
