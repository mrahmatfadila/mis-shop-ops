# Rekap Aset — MIS SHOP OPS

> Dibuat otomatis oleh `scripts/export-recap.mjs` · 2026-10-31 00:32:34 (Asia/Bangkok)
> Sumber: `shop_ops.db` (982 baris / 15 tabel), query **read-only**.
> ⚠️ Angka nilai adalah **estimasi dari data yang tersedia**, bukan laporan akuntansi — lihat §5 Keterbatasan.

## 1. Ringkasan

| Sumber data | Unit | Lokasi | Kategori | Estimasi nilai |
|---|---:|---|---|---:|
| `assets` (aset operasional) | 159 | `shop_location` | `category` | — (tidak ada kolom harga) |
| `pos_hardware_assets` (POS) | 68 | `shop_name` + `terminal` | `pos_brand` | — (tidak ada kolom harga) |
| `office_hardware_assets` | 77 | `office_location` | `device_type` | — (tidak ada kolom harga) |
| `edc_assets` (EDC) | 53 | `shop_name` | — | — (tidak ada kolom harga) |
| `dvr_assets` (CCTV/DVR) | 27 | `location` | `dvr_type` | — (tidak ada kolom harga) |
| `t3_fixed_assets` (aset tetap T3) | 35 | `lokasi` | `kategori` | **Rp 340.550.000** |
| `purchases` (pengadaan) | 11 | `target_location` | `category` | **Rp 20.335.000** |
| **TOTAL nilai tercatat** | — | — | — | **Rp 360.885.000** |

Grand total = nilai aset tetap T3 (Rp 340.550.000) + total pengadaan (Rp 20.335.000). Keduanya **populasi berbeda** — jangan dianggap satu nilai akuntansi.

## 2. Jumlah Unit per Lokasi

### 2.1 `assets` per `shop_location`

| Lokasi/Kategori | Unit |
|---|---:|
| `Head Office` | 47 |
| `Plaza Bali` | 41 |
| `SAM` | 20 |
| `Surabaya` | 15 |
| `Office Terminal 3` | 10 |
| `Warehouse (WHS)` | 10 |
| `Office Surabaya` | 5 |
| `Office Terminal 2` | 5 |
| `Toko Senayan` | 5 |
| `Toko Grand Indonesia` | 1 |
| **TOTAL** | **159** |

### 2.2 `pos_hardware_assets` per `shop_name`

| Lokasi/Kategori | Unit |
|---|---:|
| `Plaza Bali` | 51 |
| `SAM` | 17 |
| **TOTAL** | **68** |

### 2.3 `pos_hardware_assets` per `terminal`

| Lokasi/Kategori | Unit |
|---|---:|
| `Terminal 3` | 34 |
| `Terminal 2` | 21 |
| `Surabaya T2` | 7 |
| `Surabaya T1` | 6 |
| **TOTAL** | **68** |

### 2.4 `office_hardware_assets` per `office_location`

| Lokasi/Kategori | Unit |
|---|---:|
| `Head Office` | 47 |
| `Office Terminal 3` | 10 |
| `Warehouse (WHS)` | 10 |
| `Office Surabaya` | 5 |
| `Office Terminal 2` | 5 |
| **TOTAL** | **77** |

### 2.5 `edc_assets` per `shop_name`

| Lokasi/Kategori | Unit |
|---|---:|
| `Plaza Bali` | 33 |
| `SAM` | 20 |
| **TOTAL** | **53** |

### 2.6 `dvr_assets` per `location`

| Lokasi/Kategori | Unit |
|---|---:|
| `COLONIAL` | 1 |
| `DF1` | 1 |
| `DF2` | 1 |
| `DF3` | 1 |
| `DF4` | 1 |
| `EMPORIUM` | 1 |
| `GGO01-T3` | 1 |
| `GGO02` | 1 |
| `J3-BBV` | 1 |
| `J5` | 1 |
| `J6-LOKATARA` | 1 |
| `J7` | 1 |
| `JADA2` | 1 |
| `MII` | 1 |
| `SBY -BBVLT1` | 1 |
| `SBY -BBVLT2` | 1 |
| `SBY-AZARIAHAJJ` | 1 |
| `SBY-DF1` | 1 |
| `SBY-DF2` | 1 |
| `SBY-DF3` | 1 |
| `SBY-DFA01` | 1 |
| `SBY-GUDANG-BBV` | 1 |
| `SBY-SHOP` | 1 |
| `SBY-WHSBC` | 1 |
| `THE KRATON` | 1 |
| `WHS-PB` | 1 |
| `WHS-SAM` | 1 |
| **TOTAL** | **27** |

### 2.7 `t3_fixed_assets` per `lokasi` (dengan nilai)

| Lokasi/Kategori | Unit | Nilai |
|---|---:|---:|
| `DF1` | 6 | Rp 68.050.000 |
| `DF3` | 5 | Rp 60.550.000 |
| `DF2` | 6 | Rp 58.100.000 |
| `DF4` | 6 | Rp 52.000.000 |
| `DF5` | 4 | Rp 40.800.000 |
| `DF7` | 4 | Rp 33.650.000 |
| `DF6` | 4 | Rp 27.400.000 |
| **TOTAL** | **35** | **Rp 340.550.000** |

## 3. Jumlah & Nilai per Kategori

### 3.1 `assets` per `category`

| Lokasi/Kategori | Unit |
|---|---:|
| `Display / Monitor` | 73 |
| `POS Terminal` | 72 |
| `Barcode Scanner` | 3 |
| `Network / Router` | 3 |
| `Printer Thermal` | 3 |
| `CCTV / DVR` | 2 |
| `Lainnya` | 2 |
| `UPS / Kelistrikan` | 1 |
| **TOTAL** | **159** |

### 3.2 `pos_hardware_assets` per `pos_brand`

| Lokasi/Kategori | Unit |
|---|---:|
| `NCR` | 31 |
| `KASSEN` | 17 |
| `NEW POS` | 10 |
| `IWARE` | 5 |
| `TOSHIBA` | 2 |
| `NCR (Lama)` | 2 |
| `-` | 1 |
| **TOTAL** | **68** |

### 3.3 `office_hardware_assets` per `device_type`

| Lokasi/Kategori | Unit |
|---|---:|
| `PC` | 63 |
| `FACILITY` | 6 |
| `PRINTER` | 3 |
| `ROUTER` | 2 |
| `PABX` | 2 |
| `CCTV` | 1 |
| **TOTAL** | **77** |

### 3.4 `dvr_assets` per `dvr_type`

| Lokasi/Kategori | Unit |
|---|---:|
| `DS-7216HGHI-M1` | 7 |
| `iDS-7208HQHI-M1/XT` | 4 |
| `iDS-7208HQHI-M1 / E` | 4 |
| `iDS-7208HQHI-M1/E` | 2 |
| `Hikvision DVR Standalone` | 2 |
| `DS-7216HQHI-K2` | 2 |
| `iDS-7208HQHI-M1 / XT` | 1 |
| `iDS-7208HQHI-M1 / S` | 1 |
| `DS-7216HGHI-M1 / T` | 1 |
| `DS-7208HUHI-K1/E` | 1 |
| `DS-7208HQHI-K1/E` | 1 |
| `DS-7208HQHI-K1` | 1 |
| **TOTAL** | **27** |

### 3.5 `t3_fixed_assets` per `kategori` (dengan nilai)

| Lokasi/Kategori | Unit | Nilai |
|---|---:|---:|
| `POS Terminal` | 14 | Rp 229.000.000 |
| `Passport Reader` | 4 | Rp 53.900.000 |
| `UPS / Kelistrikan` | 3 | Rp 17.400.000 |
| `Network / Jaringan` | 2 | Rp 14.400.000 |
| `Printer Kasir` | 5 | Rp 14.250.000 |
| `PC Office / SPV` | 1 | Rp 6.200.000 |
| `Barcode Scanner` | 3 | Rp 3.750.000 |
| `Cash Drawer` | 3 | Rp 1.650.000 |
| **TOTAL** | **35** | **Rp 340.550.000** |

## 4. Rekap `purchases` (PO vs Installed)

- Total PO: **11**
- PO dengan `target_pos_code` terisi: **1**
- PO dengan `installed_pos_code` terisi (terpasang): **1**
- PO dengan `installed_at` terisi: **0**
- Total nilai (`total_price`): **Rp 20.335.000**
- Estimasi (`estimated_price × quantity`): **Rp 22.950.000**
- `item_price` = 0: **8/11 PO** — sumber harga tidak konsisten, gunakan `total_price` untuk rekap.

### 4.1 Status pengadaan

| Status | PO |
|---|---:|
| `PENGAJUAN` | 4 |
| `DITERIMA_T3` | 3 |
| `DISETUJUI_MANAGER` | 2 |
| `PROSES_ORDER` | 1 |
| `SIAP_KIRIM_T3` | 1 |

### 4.2 `purchases` per `target_location` (dengan nilai)

| Lokasi/Kategori | Unit | Total (`total_price`) |
|---|---:|---:|
| `Office Terminal 3` | 1 | Rp 6.800.000 |
| `Cabang Surabaya` | 3 | Rp 4.350.000 |
| `Plaza Bali (CGK)` | 3 | Rp 3.665.000 |
| `Head Office` | 1 | Rp 2.900.000 |
| `Toko SAM (CGK)` | 1 | Rp 1.250.000 |
| `Warehouse (WHS)` | 1 | Rp 885.000 |
| `Office Terminal 2` | 1 | Rp 485.000 |
| **TOTAL** | **11** | **Rp 20.335.000** |

### 4.3 `purchases` per `category`

| Kategori | PO | Total |
|---|---:|---:|
| `Office PC` | 2 | Rp 7.685.000 |
| `Hardware POS` | 4 | Rp 6.715.000 |
| `CCTV & DVR` | 1 | Rp 2.900.000 |
| `Periferal & Sparepart` | 1 | Rp 1.250.000 |
| `Consumable & Ribbon` | 2 | Rp 1.215.000 |
| `Network` | 1 | Rp 570.000 |

## 5. Keterbatasan Data

1. **Hanya 2 sumber punya komponen harga**: `t3_fixed_assets.harga_pembelian` dan `purchases` (`estimated_price`, `total_price`, `item_price`). `assets`, `pos_hardware_assets`, `office_hardware_assets`, `edc_assets`, `dvr_assets`, `monitoring_devices`, `tickets`, `users` **tidak punya kolom harga** → jumlah unit tidak bisa dikonversi ke nilai.
2. **`purchases` = pengadaan, bukan kapitalisasi aset.** PO bisa berisi consumable/periferal yang tidak menjadi aset tetap; menjumlahkan dengan `t3_fixed_assets` hanya untuk indikasi kebutuhan, bukan nilai buku.
3. **Harga perolehan, tanpa penyusutan.** `harga_pembelian` adalah nilai beli; tidak ada umur ekonomis/penyusutan di DB.
4. **`purchases.item_price` = 0 pada mayoritas PO** — `total_price` dipakai sebagai basis rekap; `estimated_price × quantity` berbeda (lihat §4).
5. **Nama lokasi tidak konsisten antar tabel**: `Plaza Bali` vs `Plaza Bali (CGK)`; `Surabaya` vs `Cabang Surabaya` vs `Office Surabaya`; `t3_fixed_assets.lokasi` berformat kode `DF1`–`DF7`. Rekap per lokasi **tidak bisa di-join langsung** tanpa mapping.
6. **Snapshot point-in-time**: angka diambil saat script berjalan; DB ber-WAL dan server produksi aktif sehingga data dapat berubah setelah laporan ini dibuat.
7. Nilai dibulatkan ke Rupiah penuh; `qty` pada t3 dipakai sebagai pengali.

## 6. Rekomendasi

| Prioritas | Rekomendasi |
|---|---|
| P1 | Buat tabel mapping lokasi standar (`shop_location`) dan terapkan ke `assets`, `pos_hardware_assets`, `office_hardware_assets`, `edc_assets`, `dvr_assets`, `purchases.target_location`, `t3_fixed_assets.lokasi` — **butuh persetujuan user**. |
| P2 | Tambahkan kolom harga perolehan pada tabel aset operasional (atau relasi ke `purchases`) bila dashboard butuh nilai total aset — **butuh keputusan user** (perubahan skema). |
| P2 | Konsistenkan `purchases.item_price` vs `total_price` (sumber harga tunggal) — **butuh persetujuan user**. |
| P3 | Jadwalkan `node scripts/export-recap.mjs` + `scripts/db-audit.mjs` sebagai laporan harian ke docs — aman diotomatiskan (read-only). |

---
*Dibuat oleh agent `data` — MIS SHOP OPS SHIFT 2. DB live hanya dibaca; tidak ada perubahan data/skema.*
