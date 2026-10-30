# Data Audit — `shop_ops.db`

> Dibuat otomatis oleh `scripts/db-audit.mjs` · 2026-10-31 00:24:23 (Asia/Bangkok)
> Mode jurnal **WAL** · SQLite 3.45.1 · DB 412.0 KB + WAL 56.4 KB
> **Read-only**: audit ini tidak menulis/mengubah data apa pun.

## 1. Ringkasan

| Pemeriksaan | Hasil |
|---|---|
| Tabel / total baris | 15 tabel · **982 baris** |
| `PRAGMA quick_check` | ✅ `ok` |
| Duplikat dalam tabel | ⚠️ **2 baris** (1 kolom) |
| Status/role di luar enum | ✅ 0 |
| Orphan `edc_assets.pos_location` | ⚠️ **17 baris** |
| Total nilai aset tercatat | **Rp 360.885.000** (t3 Rp 340.550.000 + pengadaan Rp 20.335.000) |

## 2. Duplikat

Nilai placeholder (`NULL`, kosong, `'-'`) diabaikan. Kolom ber-constraint `UNIQUE` seharusnya 0 duplikat.

| Tabel | Kolom | Constraint | Grup duplikat | Baris duplikat | Status |
|---|---|---|---:|---:|---|
| `assets` | `asset_code` | UNIQUE | 0 | 0 | ✅ |
| `assets` | `serial_number` | — | 0 | 0 | ✅ |
| `pos_hardware_assets` | `pos_code` | UNIQUE | 0 | 0 | ✅ |
| `pos_hardware_assets` | `ip_address` | — | 1 | 2 | ⚠️ |
| `office_hardware_assets` | `asset_code` | UNIQUE | 0 | 0 | ✅ |
| `edc_assets` | `pos_location` | UNIQUE | 0 | 0 | ✅ |
| `users` | `username` | UNIQUE | 0 | 0 | ✅ |

### 2.1 Detail `pos_hardware_assets.ip_address`

| Nilai | Jumlah |
|---|---:|
| `172.19.20.34` | 2 |

Baris terkait:

| `pos_code` | `shop_name` | `ip_address` |
|---|---|---|
| CGKT3DFD03-P04 | Plaza Bali | 172.19.20.34 |
| CGKT3DFD03-P05 | Plaza Bali | 172.19.20.34 |

## 3. Null Density

Persentase kolom kosong (`NULL`, string kosong, atau `'-'`). Ambang perhatian: ≥ 50%.

| Tabel | Kolom | Kosong | Total | % Kosong | Status |
|---|---|---:|---:|---:|---|
| `assets` | `serial_number` | 145 | 159 | 91.2% | ⚠️ |
| `assets` | `ip_address` | 18 | 159 | 11.3% | 🟡 |
| `assets` | `purchase_date` | 147 | 159 | 92.5% | ⚠️ |
| `assets` | `status` | 0 | 159 | 0.0% | ✅ |
| `pos_hardware_assets` | `pos_sn` | 68 | 68 | 100.0% | ⚠️ |
| `pos_hardware_assets` | `ip_address` | 2 | 68 | 2.9% | 🟡 |
| `pos_hardware_assets` | `anydesk_id` | 68 | 68 | 100.0% | ⚠️ |
| `pos_hardware_assets` | `anydesk_password` | 0 | 68 | 0.0% | ✅ |
| `pos_hardware_assets` | `status` | 0 | 68 | 0.0% | ✅ |
| `office_hardware_assets` | `ip_address` | 8 | 77 | 10.4% | 🟡 |
| `office_hardware_assets` | `processor` | 26 | 77 | 33.8% | 🟡 |
| `office_hardware_assets` | `ram` | 26 | 77 | 33.8% | 🟡 |
| `office_hardware_assets` | `hard_drive` | 26 | 77 | 33.8% | 🟡 |
| `office_hardware_assets` | `status` | 0 | 77 | 0.0% | ✅ |
| `dvr_assets` | `ip_address` | 0 | 27 | 0.0% | ✅ |
| `dvr_assets` | `password` | 0 | 27 | 0.0% | ✅ |
| `dvr_assets` | `status` | 0 | 27 | 0.0% | ✅ |
| `monitoring_devices` | `ip_address` | 0 | 167 | 0.0% | ✅ |
| `monitoring_devices` | `status` | 0 | 167 | 0.0% | ✅ |
| `edc_assets` | `bca_tid` | 5 | 53 | 9.4% | 🟡 |
| `edc_assets` | `bni_tid` | 49 | 53 | 92.5% | ⚠️ |
| `edc_assets` | `mandiri_tid` | 42 | 53 | 79.2% | ⚠️ |
| `edc_assets` | `bri_tid` | 3 | 53 | 5.7% | 🟡 |
| `users` | `password` | 0 | 43 | 0.0% | ✅ |
| `users` | `updated_at` | 43 | 43 | 100.0% | ⚠️ |
| `tickets` | `it_notes` | 1 | 2 | 50.0% | ⚠️ |
| `tickets` | `resolved_at` | 2 | 2 | 100.0% | ⚠️ |
| `purchases` | `vendor` | 1 | 11 | 9.1% | 🟡 |
| `purchases` | `invoice_url` | 11 | 11 | 100.0% | ⚠️ |
| `purchases` | `installed_at` | 11 | 11 | 100.0% | ⚠️ |

## 4. Inkonsistensi Status / Enum

### `assets.status`

Enum sah: `OPERASIONAL`, `RUSAK`, `PERBAIKAN`, `CADANGAN`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `OPERASIONAL` | 156 | ✅ |
| `CADANGAN` | 3 | ✅ |

Tidak ada nilai di luar enum. ✅

### `pos_hardware_assets.status`

Enum sah: `OPERASIONAL`, `RUSAK`, `PERBAIKAN`, `CADANGAN`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `OPERASIONAL` | 68 | ✅ |

Tidak ada nilai di luar enum. ✅

### `office_hardware_assets.status`

Enum sah: `OPERASIONAL`, `RUSAK`, `PERBAIKAN`, `CADANGAN`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `OPERASIONAL` | 75 | ✅ |
| `CADANGAN` | 2 | ✅ |

Tidak ada nilai di luar enum. ✅

### `t3_fixed_assets.status`

Enum sah: `OPERASIONAL`, `RUSAK`, `PERBAIKAN`, `CADANGAN`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `OPERASIONAL` | 35 | ✅ |

Tidak ada nilai di luar enum. ✅

### `tickets.status`

Enum sah: `MENUNGGU`, `DIPROSES`, `SELESAI`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `DIPROSES` | 1 | ✅ |
| `MENUNGGU` | 1 | ✅ |

Tidak ada nilai di luar enum. ✅

### `users.role`

Enum sah: `ADMIN`, `MIS`, `MANAGER`, `IT_PROCUREMENT`, `SPV_PLAZABALI_T3`, `SPV_PLAZABALI_T2`, `SPV_SAM_T3`, `SPV_SAM_T2`, `SPV_PLAZABALI`, `SPV_SAM`.

| Nilai | Jumlah | Valid |
|---|---:|---|
| `SPV_PLAZABALI` | 34 | ✅ |
| `MIS` | 5 | ✅ |
| `SPV_SAM` | 1 | ✅ |
| `MANAGER` | 1 | ✅ |
| `IT_PROCUREMENT` | 1 | ✅ |
| `ADMIN` | 1 | ✅ |

Tidak ada nilai di luar enum. ✅

Status pengadaan (`purchases.status`) bersifat informasional (bukan enum aset) — nilai saat ini: `PENGAJUAN`×4, `DITERIMA_T3`×3, `DISETUJUI_MANAGER`×2, `PROSES_ORDER`×1, `SIAP_KIRIM_T3`×1.

## 5. Orphan EDC + Kandidat Padanan (fuzzy)

17 kode `edc_assets.pos_location` tidak ditemukan di master `pos_hardware_assets`. Kandidat terdekat dihitung dengan jarak Levenshtein (angka lebih kecil = lebih mirip). **Tidak ada perubahan data yang dilakukan.**

| pos_location | shop_name | Kandidat 1 | Kandidat 2 | Rekomendasi |
|---|---|---|---|---|
| `CGKT2DDD01-P02` | SAM | `CGKT2DDD01-P01` (d=1) | `CGKT2DFD05-P02` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT2GGO02-P01` | SAM | `CGKT2GGO03-P01` (d=1) | `CGKT2GGO03-P02` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT2GGO02-P02` | SAM | `CGKT2GGO03-P02` (d=1) | `CGKT3GGO02-P02` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT2SRR01-P01` | SAM | `CGKT2SSR01-P01` (d=1) | `CGKT2OLR01-P01` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT2SRR01-P90` | SAM | `CGKT2SSR01-P90` (d=1) | `CGKT2OLR01-P90` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3BBV01-P01` | SAM | `CGKT2BBV01-P01` (d=1) | `CGKT3DFD01-P01` (d=3) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3BBV01-P02` | SAM | `CGKT2BBV01-P01` (d=2) | `CGKT3DFD01-P02` (d=3) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3BBV01-P03` | SAM | `CGKT2BBV01-P01` (d=2) | `CGKT3DFD01-P03` (d=3) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3BBV01-P90` | SAM | `CGKT2BBV01-P01` (d=3) | `CGKT3GGO01-P90` (d=3) | Perlu pengecekan master POS (kemungkinan POS decommission) |
| `CGKT3DFD05-P13` | Plaza Bali | `CGKT3DFD04-P13` (d=1) | `CGKT2DFD05-P03` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD05-P14` | Plaza Bali | `CGKT3DFD04-P14` (d=1) | `CGKT2DFD05-P04` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD06-P01` | Plaza Bali | `CGKT3DFD01-P01` (d=1) | `CGKT3DFD02-P01` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD06-P02` | Plaza Bali | `CGKT3DFD01-P02` (d=1) | `CGKT3DFD02-P02` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD06-P03` | Plaza Bali | `CGKT3DFD01-P03` (d=1) | `CGKT3DFD02-P03` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD07-P01` | Plaza Bali | `CGKT3DFD01-P01` (d=1) | `CGKT3DFD02-P01` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3DFD07-P02` | Plaza Bali | `CGKT3DFD01-P02` (d=1) | `CGKT3DFD02-P02` (d=1) | Perlu verifikasi manual — kemungkinan typo/renumber |
| `CGKT3GGO04-P01` | SAM | `CGKT3GGO01-P01` (d=1) | `CGKT2GGO03-P01` (d=2) | Perlu verifikasi manual — kemungkinan typo/renumber |

Tindakan disarankan: petakan kode ke master POS yang benar, atau tandai POS decommission pada master — **butuh persetujuan user** sebelum UPDATE.

## 6. Rekap Nilai Aset (validasi dashboard)

> Catatan: `assets` & `office_hardware_assets` **tidak menyimpan kolom harga**. Nilai aset berasal dari `t3_fixed_assets.harga_pembelian×qty` (aset tetap T3) dan `purchases.total_price` (pengadaan). Keduanya bukan populasi yang sama; jangan dijumlahkan sebagai satu nilai akuntansi tanpa konfirmasi user.

### 6.1 `t3_fixed_assets` per lokasi

| Lokasi | Unit | Nilai |
|---|---:|---:|
| `DF1` | 6 | Rp 68.050.000 |
| `DF3` | 5 | Rp 60.550.000 |
| `DF2` | 6 | Rp 58.100.000 |
| `DF4` | 6 | Rp 52.000.000 |
| `DF5` | 4 | Rp 40.800.000 |
| `DF7` | 4 | Rp 33.650.000 |
| `DF6` | 4 | Rp 27.400.000 |
| **TOTAL** | **35** | **Rp 340.550.000** |

### 6.2 `t3_fixed_assets` per kategori

| Kategori | Unit | Nilai |
|---|---:|---:|
| `POS Terminal` | 14 | Rp 229.000.000 |
| `Passport Reader` | 4 | Rp 53.900.000 |
| `UPS / Kelistrikan` | 3 | Rp 17.400.000 |
| `Network / Jaringan` | 2 | Rp 14.400.000 |
| `Printer Kasir` | 5 | Rp 14.250.000 |
| `PC Office / SPV` | 1 | Rp 6.200.000 |
| `Barcode Scanner` | 3 | Rp 3.750.000 |
| `Cash Drawer` | 3 | Rp 1.650.000 |

### 6.3 `purchases` per lokasi tujuan

| Lokasi tujuan | PO | Total (`total_price`) | Estimasi (`estimated_price×qty`) |
|---|---:|---:|---:|
| `Office Terminal 3` | 1 | Rp 6.800.000 | Rp 6.800.000 |
| `Cabang Surabaya` | 3 | Rp 4.350.000 | Rp 4.350.000 |
| `Plaza Bali (CGK)` | 3 | Rp 3.665.000 | Rp 5.415.000 |
| `Head Office` | 1 | Rp 2.900.000 | Rp 2.900.000 |
| `Toko SAM (CGK)` | 1 | Rp 1.250.000 | Rp 1.700.000 |
| `Warehouse (WHS)` | 1 | Rp 885.000 | Rp 885.000 |
| `Office Terminal 2` | 1 | Rp 485.000 | Rp 900.000 |
| **TOTAL** | **11** | **Rp 20.335.000** | **Rp 22.950.000** |

### 6.4 `purchases` per kategori

| Kategori | PO | Total |
|---|---:|---:|
| `Office PC` | 2 | Rp 7.685.000 |
| `Hardware POS` | 4 | Rp 6.715.000 |
| `CCTV & DVR` | 1 | Rp 2.900.000 |
| `Periferal & Sparepart` | 1 | Rp 1.250.000 |
| `Consumable & Ribbon` | 2 | Rp 1.215.000 |
| `Network` | 1 | Rp 570.000 |

### 6.5 Unit aset per kategori (`assets`) — tanpa nilai

| Kategori | Unit |
|---|---:|
| `Display / Monitor` | 73 |
| `POS Terminal` | 72 |
| `Barcode Scanner` | 3 |
| `Network / Router` | 3 |
| `Printer Thermal` | 3 |
| `CCTV / DVR` | 2 |
| `Lainnya` | 2 |
| `UPS / Kelistrikan` | 1 |

**Grand total (t3 + purchases): Rp 360.885.000.** Angka ini hanya indikasi kebutuhan validasi dashboard, bukan laporan keuangan.

## 7. Rekomendasi & Tindak Lanjut

| Prioritas | Temuan | Tindakan | Eksekusi |
|---|---|---|---|
| P1 | IP ganda pada 1 grup POS | Beri IP unik / dokumentasikan IP virtual | **Perlu persetujuan user** |
| P1 | 17 kode EDC tanpa master POS | Petakan ke POS benar atau tandai decommission | **Perlu persetujuan user** |
| P2 | 11 kolom ≥50% kosong (mis. `users.updated_at` 100%) | Backfill / tandai N/A; review kebutuhan kolom | **Perlu persetujuan user** |
| P2 | `purchases.item_price` = 0 pada 8/11 PO | Konsistenkan sumber harga (item_price vs total_price) | **Perlu persetujuan user** |
| P2 | Tidak ada status/role di luar enum | Pertahankan validasi enum di API; boleh ditambahkan test otomatis | ✅ Aman diotomatiskan (read-only) |
| P3 | Audit ini | Jadwalkan `node scripts/db-audit.mjs` harian / pra-deploy | ✅ Aman diotomatiskan |
| P3 | Duplikat kolom UNIQUE | Tidak perlu tindakan selama constraint dipertahankan | ✅ Tidak perlu tindakan |

> **Aturan**: semua koreksi data (UPDATE/DELETE) di atas **butuh persetujuan user** — sprint malam ini dilarang mengubah data bisnis. Script audit ini hanya membaca.

## 8. Metode & Batasan

- Read-only: hanya `SELECT`, `PRAGMA journal_mode`, dan `PRAGMA quick_check`; tidak ada `INSERT/UPDATE/DELETE/DROP/VACUUM`.
- Duplikat: `GROUP BY ... HAVING COUNT(*) > 1`, placeholder `NULL`/`''`/`'-'` diabaikan.
- Fuzzy matching: jarak Levenshtein pada 68 kode `pos_hardware_assets.pos_code`; kandidat teratas bukan keputusan otomatis.
- Nilai aset: `t3_fixed_assets` (unit tetap T3) dan `purchases` (pengadaan) dilaporkan terpisah.
- Exit code: `0` = tidak ada blocker; `1` = ada orphan EDC / `quick_check` gagal / status di luar enum.

---
*Dibuat oleh agent `data` — MIS SHOP OPS SHIFT 2. DB produksi tidak dimodifikasi.*
