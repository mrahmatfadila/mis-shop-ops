# FRONTEND NOTES — Fondasi UI (task-1)

Tanggal: 30 Okt 2026 · Pemilik: frontend · Status: selesai

## 1. File baru (fondasi reusable)

| File | Baris | Isi |
| --- | --- | --- |
| `src/lib/utils.ts` | 148 | `cn`, `formatRupiah`, `formatNumber`, `formatDate`, `formatDateTime`, `statusBadgeClass`, `urgencyBadgeClass`, `divisionBadgeClass`, `safeText` (pure, typed, tanpa `any`) |
| `src/hooks/useApiData.ts` | 93 | `{ data, isLoading, error, refresh }` + SWR cache (`src/lib/cache.ts`) + AbortController |
| `src/components/common/PageHeader.tsx` | 42 | Judul + deskripsi + ikon + slot aksi |
| `src/components/common/StatCard.tsx` | 48 | Kartu statistik (label/nilai/ikon/hint) |
| `src/components/common/EmptyState.tsx` | 35 | Empty state ikon + pesan |
| `src/components/common/LoadingState.tsx` | 25 | Spinner emerald + pesan |
| `src/components/common/StatusBadge.tsx` | 37 | Badge subdued, variant `status` / `urgency` / `division` |
| `src/components/common/SearchInput.tsx` | 40 | Input cari ber-ikon, submit via Enter |
| `src/components/common/Modal.tsx` | 89 | Overlay blur + header ikon + body scrollable, size sm/md/lg |

Palet mengikuti `AI_RULES.md`: emerald `#006622` (aksi utama tetap memakai warna konteks halaman), badge subdued `bg-*-50 text-*-700 border-*-200/80`, `rounded-2xl`, `shadow-sm`, empty state ber-ikon.

## 2. Adopsi nyata di 2 halaman

| File | Sebelum | Sesudah | Komponen/hook yang diadopsi |
| --- | --- | --- | --- |
| `src/app/tickets/page.tsx` | 443 baris | 388 baris | `PageHeader`, `LoadingState`, `EmptyState`, `StatusBadge` (urgensi + status), `Modal`, `useApiData` |
| `src/app/extensions/page.tsx` | 745 baris | 683 baris | `StatCard` (4 kartu), `SearchInput`, `LoadingState`/`EmptyState` (baris tabel), `StatusBadge` (divisi + status), `Modal` (form & cetak), `formatDate`, `useApiData` |

Catatan: jumlah baris diukur aktual (`Get-Content .Count`), bukan estimasi brief.

### Duplikasi yang dihapus
- 2 blok `fetch` + `getClientCache`/`setClientCache` + state loading manual (±60 baris) → `useApiData` (cache key & endpoint tetap sama).
- 2 blok ternary badge status/urgensi di tickets + switch `getDivisionBadgeColor` + ternary status di extensions → `StatusBadge` + util class.
- 3 overlay modal manual (tickets IT, form extension, cetak PABX) → `Modal`.
- 4 markup kartu statistik extensions → `StatCard`.
- Format tanggal cetak (`toLocaleDateString` manual) → `formatDate` (output identik: "30 Oktober 2026").

### Kesetaraan perilaku
- Endpoint & query param tidak berubah: `/api/tickets?status&urgency&shop`, `/api/extensions?search&division` (dipakai juga sebagai cache key).
- Tidak ada data/hardcode baru; semua angka & baris tetap dari API (stats `totalExtensions`, `countByDivision`, dst).
- Modal `?id=` pada tickets tetap auto-buka tiket; aksi PUT/POST/DELETE halaman tidak diubah.
- Pencarian extensions tetap "commit saat submit/refresh/pindah divisi" (bukan fetch tiap ketikan).

## 3. Contoh pemakaian

```tsx
import { useApiData } from "@/hooks/useApiData";

const { data, isLoading, error, refresh } = useApiData<Ticket[]>(`/api/tickets?${params}`, {
  cacheKey,
  transform: (json) => {
    const res = json as { success?: boolean; data?: Ticket[] };
    return res.success && Array.isArray(res.data) ? res.data : [];
  },
});
```

```tsx
<PageHeader
  title="Helpdesk & Tiket Kendala SPV Toko"
  description="Pantau laporan kerusakan perangkat kasir..."
  icon={LifeBuoy}
  iconClassName="text-rose-600"
  actions={<button className="...">Buat Tiket</button>}
/>

<StatusBadge status={t.urgency} variant="urgency" label={`Urgensi: ${t.urgency}`} />

<Modal isOpen={isOpen} onClose={close} title="Tambah Extension Baru" icon={PhoneCall} size="sm">
  <form onSubmit={submit}>...</form>
</Modal>
```

## 4. Verifikasi (bukan dummy)

- `npx tsc --noEmit` dari root proyek → **0 error** (exit 0; dijalankan ulang setelah semua perubahan, termasuk setelah checkpoint git `02e7b59`).
- `curl http://localhost:3000/tickets` → **200**; heading dirender; `/extensions` → **200**; banner, 4 StatCard, dan SearchInput dirender. Dicek langsung setelah refactor (sekitar 23:57).
- CATATAN: sekitar 00:0x dev server :3000 berhenti (tidak ada listener/proses node) karena aktivitas tool AI eksternal user, jadi pengecekan HTTP terakhir tidak bisa diulang dari sisi saya; perubahan task-1 di file sudah terverifikasi tsc 0 dan tercatat di git HEAD checkpoint.
- `GET /api/tickets` → `success:true`, 2 tiket; `GET /api/extensions` → `success:true`, 47 data, `stats.totalExtensions:47`.
- Write-scope dipatuhi: tidak menyentuh `src/app/assets`, `src/app/purchases`, `src/app/dvr`, `src/lib/db.ts`, `src/lib/api.ts`, API route, tests/, scripts/, maupun file di luar daftar.

## 5. Risiko / sisa pekerjaan

- `extensions/page.tsx` masih 683 baris (AI_RULES menargetkan 150–200). Pemecahan sub-komponen tabel/form dapat dilakukan berikutnya; fondasi (`common/`, `utils`, hooks) sudah tersedia.
- `utils.formatRupiah/formatNumber/formatDate` belum diadopsi halaman lain (assets/purchases/dvr di luar write-scope task ini) — kandidat migrasi berikutnya untuk menghapus duplikasi global.
- `formatDate` pada lembar cetak memakai locale server/browser `id-ID` (format sama dengan sebelumnya, bukan hardcode data).

---

# SHIFT 2 — Batch A (task-8)

Tanggal: 31 Okt 2026 · Pemilik: frontend · Status: selesai

## 1. File diubah

| File | Sebelum | Sesudah | Komponen/hook yang diadopsi |
| --- | --- | --- | --- |
| `src/app/knowledge-base/page.tsx` | 1126 baris | 1134 baris | `StatCard` (4 KPI, tone warna dipertahankan), `SearchInput` (+clear), `LoadingState`, `EmptyState` (+action tombol), `StatusBadge` (cakupan toko), `useApiData` (cache `knowledge_base_articles`), `formatNumber`, `formatDate` (tanggal "Diperbarui") |
| `src/app/monitoring/page.tsx` | 891 baris | 892 baris | `StatCard` (4 KPI + tile ikon), `SearchInput` (+clear), `LoadingState`, `EmptyState`, `StatusBadge` (pill ONLINE/OFFLINE grid & tabel), `useApiData` (cache `monitoring_devices_live`), `formatNumber` |

Penyempurnaan komponen common (backward-compatible, opsional):
- `StatCard`: prop `labelClassName`, `iconWrapperClassName` (tile ikon berwarna).
- `SearchInput`: prop `onClear` (tombol X, perilaku lama dipertahankan).
- `EmptyState`: prop `action` (tombol aksi di empty state).

`PageHeader` dan `Modal` sengaja TIDAK dipakai di kedua halaman: hero header KB/monitoring berisi badge dinamis + KPI dan modal reader/editor KB punya layout khusus. Menggantinya akan mengubah visual drastis (melanggar prinsip visual-setara), sehingga komponen lain yang relevan yang diadopsi.

## 2. Kesetaraan perilaku
- Endpoint tetap: `/api/knowledge-base` (cache key `knowledge_base_articles`) dan `/api/monitoring` (cache key `monitoring_devices_live`); query/filter tidak berubah.
- Tidak ada data hardcoded baru; semua angka/artikel/perangkat tetap dari API.
- KB: optimistic counter lokal diganti `refresh()` setelah POST/GET view/helpful — angka akhir tetap dari API.
- Monitoring: hasil `useApiData` dicerminkan ke state lokal agar aksi ping/scan/ping-single tetap bisa update data; cache tetap di-`setClientCache` oleh aksi scan.
- Perubahan baris kedua halaman < 10 baris net (tidak ada penulisan ulang besar).

## 3. Verifikasi Shift 2
- `npx tsc --noEmit` dari root → **0 error** (exit 0).
- `curl http://localhost:3000/knowledge-base` → **200** (heading, KPI "Total Panduan", placeholder search ter-render); `curl http://localhost:3000/monitoring` → **200** (heading, KPI "Total Perangkat", placeholder search ter-render).
- `GET /api/knowledge-base` → `success:true`, 5 artikel; `GET /api/monitoring` → `success:true`, 167 perangkat.
- Write-scope dipatuhi: hanya 2 halaman + `components/common` + `docs`; tidak menyentuh API route, `db.ts`, tests, scripts, maupun halaman lain.

---

# SHIFT 2 — Batch B (task-13)

Tanggal: 31 Okt 2026 · Pemilik: frontend · Status: selesai

## 1. File diubah

| File | Sebelum | Sesudah | Komponen/hook yang diadopsi |
| --- | --- | --- | --- |
| `src/app/t3-assets/page.tsx` | 945 baris (aktual; brief 404) | 946 baris (+0,1%) | `useApiData` (cache key tetap `t3_assets_<search>_<lokasi>_<kategori>_<status>`), 4× `StatCard`, `SearchInput`, `LoadingState`, `EmptyState`, `StatusBadge` (status aset non-operasional), `formatRupiah`/`formatNumber` dari utils (fungsi `formatRupiah` lokal dihapus) |
| `src/app/office/page.tsx` | 1170 baris (aktual; brief 1097) | 1177 baris (+0,6%) | `useApiData` (cache key tetap `office_<search>_<loc>_<div>_<status>_<type>`), 4× `StatCard` (tile ikon dipertahankan), `SearchInput` (+clear), `LoadingState`, `EmptyState`, `StatusBadge` (pill status) |

Kedua halaman berubah jauh di bawah batas 25% baris (tidak ada penulisan ulang; surgical edit).

## 2. Kesetaraan perilaku
- Endpoint & query param TIDAK berubah: `/api/t3-assets?search&lokasi&kategori&status`, `/api/office?search&location&division&status&device_type`; cache key format tetap.
- Tanpa data hardcoded baru; semua baris/angka tetap dari API. `stats` t3 (totalNilai, operationalCount, countByLocation) tetap dari response API.
- T3: pencarian tetap "commit" saat submit/refresh/ganti filter (state `submittedSearch` disinkronkan seperti perilaku lama); aksi CRUD tetap memanggil refresh hook.
- Office: search tetap live per ketikan (dependency URL sama seperti effect lama); `getDivisionBadge` lokal dipertahankan karena palet divisinya spesifik halaman.
- `PageHeader`/`Modal` tidak dipakai (header kedua halaman berupa banner/label kustom dan modal form/Barcode sudah punya komponen khusus) — visual-setara dijaga.

## 3. Verifikasi Batch B
- `npx tsc --noEmit` dari root → **0 error** (exit 0).
- `curl http://localhost:3000/t3-assets` → **200** (heading, KPI "Total Unit Aset", placeholder search ter-render).
- `curl http://localhost:3000/office` → **200** (halaman di balik `Suspense` + `useSearchParams`, sehingga HTML SSR berisi fallback "Memuat"; konten dirender client).
- `GET /api/t3-assets` → `success:true`, **35** baris; `GET /api/office` → `success:true`, **77** baris (sama dengan gate).
- Write-scope dipatuhi: hanya 2 halaman + `docs`; tidak menyentuh assets/purchases/dvr/pos-topology/edc/API/db.ts/tests/scripts.


---

# SHIFT 2 — Batch C (task-16)

Tanggal: 31 Okt 2026 · Pemilik: frontend · Status: selesai

## 1. File diubah

| File | Sebelum | Sesudah | Komponen/hook yang diadopsi |
| --- | --- | --- | --- |
| `src/app/server-rack/page.tsx` | 1394 baris (aktual; brief 1317) | 1422 baris (+2,0%) | `useApiData` (cache key tetap `rack_<rack>_<search>_<tab>`, payload ports+rackUnits+stats), 4× `StatCard` (label/ikon dinamis 32U vs 6U), `SearchInput` (+submit), `LoadingState`, `EmptyState`, `formatDate` (tanggal lembar cetak) |
| `src/app/dvr/page.tsx` | 1535 baris (aktual; brief 1428) | 1532 baris (−0,2%) | `useApiData` (cache key tetap `dvr_<search>_<region>_<channels>`), 4× `StatCard` (tile ikon dipertahankan), `SearchInput` (+clear), `LoadingState`, `EmptyState` |

Kedua halaman berubah jauh di bawah batas 25% baris (~330 baris); surgical, tanpa tulis ulang file penuh.

## 2. Kesetaraan perilaku
- Endpoint & query param TIDAK berubah: `/api/server-rack?rack&search&group`, `/api/dvr?search&region&channels`; cache key format tetap.
- Tanpa data hardcoded baru; ports/rackUnits/stats dan daftar DVR tetap 100% dari API. Angka statis lama (mis. "110+ TB", "Hingga 227 Hari", fallback port rack) dipertahankan apa adanya, bukan data baru.
- Server-rack: pencarian tetap "commit" saat submit/refresh/ganti rak/tab (state `submittedSearch` + helper `selectTab` disinkronkan seperti perilaku lama); aksi CRUD tetap refresh hook.
- DVR: pencarian tetap live per ketikan (URL hook mengikuti `searchTerm` seperti effect lama); CRUD/ping/config tetap memanggil refresh hook.
- `PageHeader`/`Modal` tidak dipakai (header kedua halaman berupa bar label kustom dan modal live-view/config sudah khusus) — visual-setara dijaga; `StatusBadge` tidak dipaksa pada sel status bergaya teks+dot agar tidak berubah visual.

## 3. Verifikasi Batch C
- `npx tsc --noEmit` dari root → **0 error** (exit 0).
- `curl http://localhost:3000/server-rack` → **200** (heading "Rak Server", KPI "Port Aktif" ter-render).
- `curl http://localhost:3000/dvr` → **200** (halaman di balik `Suspense`; SSR berisi fallback "Memuat", konten dirender client).
- `GET /api/server-rack` → `success:true`, **ports 135** & **rackUnits 23** (sama dengan gate); `GET /api/dvr` → `success:true`, **27** baris.
- Write-scope dipatuhi: hanya 2 halaman + `docs`; tidak menyentuh assets/purchases/pos-topology/edc/API/db.ts/tests/scripts, tanpa build/restart/kill, tanpa git.



