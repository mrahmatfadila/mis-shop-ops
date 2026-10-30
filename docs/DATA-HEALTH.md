# Data Health Report — `shop_ops.db`

> Dibuat otomatis oleh `scripts/db-health.mjs` · 2026-10-30 23:57:25 (Asia/Bangkok)
> Mode jurnal **WAL** · SQLite 3.45.1 · Ukuran **DB 360.0 KB + WAL 3.94 MB**

## 1. Ringkasan

| Pemeriksaan | Hasil |
|---|---|
| `PRAGMA integrity_check` | ✅ `ok` |
| `PRAGMA quick_check` | ✅ `ok` |
| Index hot-filter (F8) | ✅ 10/10 terpasang |
| Orphan data belum ter-resolve | ⚠️ **17 baris** |
| Jumlah baris 15 tabel | 982 baris (stabil, tidak ada perubahan data) |

**Status akhir: `PERHATIAN`.** Temuan data bersifat pre-existing — tidak diperbaiki oleh sprint ini (aturan: DB produksi tidak diubah).

## 2. Ukuran & Integritas

| Item | Nilai |
|---|---|
| File DB | `shop_ops.db` — 360.0 KB |
| WAL | `shop_ops.db-wal` — 3.94 MB (data terbaru masih di WAL) |
| SHM | `shop_ops.db-shm` — 32.0 KB |
| integrity_check | `ok` |
| quick_check | `ok` |
| journal_mode | `wal` |

## 3. Jumlah Baris per Tabel

| # | Tabel | Baris |
|---|---|---:|
| 1 | `assets` | 159 |
| 2 | `dvr_assets` | 27 |
| 3 | `edc_assets` | 53 |
| 4 | `knowledge_base` | 5 |
| 5 | `monitoring_devices` | 167 |
| 6 | `office_hardware_assets` | 77 |
| 7 | `phone_extensions` | 47 |
| 8 | `pos_hardware_assets` | 68 |
| 9 | `purchases` | 11 |
| 10 | `role_permissions` | 130 |
| 11 | `server_rack_ports` | 135 |
| 12 | `server_rack_units` | 23 |
| 13 | `t3_fixed_assets` | 35 |
| 14 | `tickets` | 2 |
| 15 | `users` | 43 |
| | **TOTAL (15 tabel)** | **982** |

## 4. Index

Total: **30** index (17 eksplisit + 13 autoindex UNIQUE).

### 4.1 Index filter panas (F8)

| Index | Tabel(kolom) | Status |
|---|---|---|
| `idx_assets_status` | `assets(status)` | ✅ ada |
| `idx_assets_shop` | `assets(shop_location)` | ✅ ada |
| `idx_assets_category` | `assets(category)` | ✅ ada |
| `idx_tickets_status` | `tickets(status)` | ✅ ada |
| `idx_tickets_asset` | `tickets(asset_code)` | ✅ ada |
| `idx_pos_code` | `pos_hardware_assets(pos_code)` | ✅ ada |
| `idx_monitoring_ip` | `monitoring_devices(ip_address)` | ✅ ada |
| `idx_purchases_status` | `purchases(status)` | ✅ ada |
| `idx_edc_pos` | `edc_assets(pos_location)` | ✅ ada |
| `idx_rack_ports_grp` | `server_rack_ports(device_group)` | ✅ ada |

### 4.2 Inventory index eksplisit

| Index | Tabel | Definisi |
|---|---|---|
| `idx_assets_category` | `assets` | `CREATE INDEX idx_assets_category ON assets(category)` |
| `idx_assets_shop` | `assets` | `CREATE INDEX idx_assets_shop ON assets(shop_location)` |
| `idx_assets_status` | `assets` | `CREATE INDEX idx_assets_status ON assets(status)` |
| `idx_dvr_loc` | `dvr_assets` | `CREATE INDEX idx_dvr_loc ON dvr_assets(location)` |
| `idx_edc_pos` | `edc_assets` | `CREATE INDEX idx_edc_pos ON edc_assets(pos_location)` |
| `idx_edc_shop` | `edc_assets` | `CREATE INDEX idx_edc_shop ON edc_assets(shop_name)` |
| `idx_monitoring_ip` | `monitoring_devices` | `CREATE INDEX idx_monitoring_ip ON monitoring_devices(ip_address)` |
| `idx_office_div` | `office_hardware_assets` | `CREATE INDEX idx_office_div ON office_hardware_assets(division)` |
| `idx_office_loc` | `office_hardware_assets` | `CREATE INDEX idx_office_loc ON office_hardware_assets(office_location)` |
| `idx_ext_div` | `phone_extensions` | `CREATE INDEX idx_ext_div ON phone_extensions(division)` |
| `idx_pos_code` | `pos_hardware_assets` | `CREATE INDEX idx_pos_code ON pos_hardware_assets(pos_code)` |
| `idx_pos_shop` | `pos_hardware_assets` | `CREATE INDEX idx_pos_shop ON pos_hardware_assets(shop_name)` |
| `idx_purchases_status` | `purchases` | `CREATE INDEX idx_purchases_status ON purchases(status)` |
| `idx_rack_ports_grp` | `server_rack_ports` | `CREATE INDEX idx_rack_ports_grp ON server_rack_ports(device_group)` |
| `idx_rack_ports_rack` | `server_rack_ports` | `CREATE INDEX idx_rack_ports_rack ON server_rack_ports(rack_type)` |
| `idx_tickets_asset` | `tickets` | `CREATE INDEX idx_tickets_asset ON tickets(asset_code)` |
| `idx_tickets_status` | `tickets` | `CREATE INDEX idx_tickets_status ON tickets(status)` |

Autoindex bawaan UNIQUE (tidak dihitung): `assets.assets_1`, `dvr_assets.dvr_assets_1`, `dvr_assets.dvr_assets_2`, `edc_assets.edc_assets_1`, `knowledge_base.knowledge_base_1`, `monitoring_devices.monitoring_devices_1`, `office_hardware_assets.office_hardware_assets_1`, `pos_hardware_assets.pos_hardware_assets_1`, `purchases.purchases_1`, `role_permissions.role_permissions_1`, `t3_fixed_assets.t3_fixed_assets_1`, `tickets.tickets_1`, `users.users_1`.

## 5. Pemeriksaan Orphan (referensi lintas tabel)

| Relasi | Baris diperiksa | Orphan | Status |
|---|---:|---:|---|
| purchases.target_pos_code → pos_hardware_assets.pos_code | 1 | 0 | ✅ OK |
| purchases.installed_pos_code → pos_hardware_assets.pos_code | 1 | 0 | ✅ OK |
| monitoring_devices.asset_code → assets / pos_hardware_assets (cadangan: dvr_assets) | 167 | 0 | ✅ 25 ter-resolve (via dvr_assets) |
| tickets.asset_code → assets / pos_hardware_assets | 2 | 0 | ✅ OK |
| edc_assets.pos_location → pos_hardware_assets.pos_code | 53 | 17 | ⚠️ 17 unresolved |
| users.role ∈ daftar role sah (src/types UserRole) | 43 | 0 | ✅ OK |

Catatan: placeholder `'-'` / kosong pada kolom kode POS di `purchases` diabaikan (bukan referensi). Kolom `monitoring_devices.asset_code` juga sah merujuk ke `dvr_assets.asset_code` — bukan pelanggaran integritas.

## 6. Detail Temuan

### 6.1 ⚠️ `edc_assets.pos_location` tanpa master POS — 17 baris

Kode lokasi EDC di bawah ini tidak ditemukan di `pos_hardware_assets.pos_code`. Kemungkinan POS sudah di-decommission/renumber, atau master POS belum diperbarui. **Tidak diperbaiki** pada sprint ini — perlu keputusan pemilik data.

| pos_location | shop_name |
|---|---|
| `CGKT2DDD01-P02` | SAM |
| `CGKT2GGO02-P01` | SAM |
| `CGKT2GGO02-P02` | SAM |
| `CGKT2SRR01-P01` | SAM |
| `CGKT2SRR01-P90` | SAM |
| `CGKT3BBV01-P01` | SAM |
| `CGKT3BBV01-P02` | SAM |
| `CGKT3BBV01-P03` | SAM |
| `CGKT3BBV01-P90` | SAM |
| `CGKT3DFD05-P13` | Plaza Bali |
| `CGKT3DFD05-P14` | Plaza Bali |
| `CGKT3DFD06-P01` | Plaza Bali |
| `CGKT3DFD06-P02` | Plaza Bali |
| `CGKT3DFD06-P03` | Plaza Bali |
| `CGKT3DFD07-P01` | Plaza Bali |
| `CGKT3DFD07-P02` | Plaza Bali |
| `CGKT3GGO04-P01` | SAM |

### 6.2 ℹ️ `monitoring_devices` merujuk DVR — bukan orphan

25 baris `monitoring_devices.asset_code` berformat `DVR-*` tidak ada di `assets`/`pos_hardware_assets`, tetapi **semua cocok** dengan `dvr_assets.asset_code`. Artinya master DVR adalah relasi yang sah; dokumentasi relasi sebaiknya menyebut `dvr_assets` juga.

## 7. Query Plan (EXPLAIN QUERY PLAN)

Dua query filter panas yang dipakai halaman/API:

**Q1 — filter status aset**

```
SEARCH assets USING INDEX idx_assets_status (status=?)
```

**Q2 — filter status tiket**

```
SEARCH tickets USING INDEX idx_tickets_status (status=?)
```

## 8. Rekomendasi

| Prioritas | Rekomendasi |
|---|---|
| P1 | Lengkapi master `pos_hardware_assets` untuk 17 kode POS yang dirujuk `edc_assets` (atau beri penanda decommission) — butuh keputusan pemilik data. |
| P1 | Jadwalkan `scripts/backup-db.mjs` harian (Task Scheduler) + retensi 7 snapshot; simpan salinan di drive terpisah. |
| P2 | Migrasi skema bernomor (`migrations/00X_*.sql`) untuk menggantikan pola `try/catch ALTER TABLE` (F8). |
| P2 | Perluas `scripts/db-health.mjs` sebagai gate CI: exit ≠ 0 menghentikan deploy jika integritas/orphan memburuk. |
| P3 | Dokumentasikan relasi `monitoring_devices.asset_code` → `assets`/`pos_hardware_assets`/`dvr_assets` sebagai foreign key logis. |

## 9. Metode & Batasan

- Read-only: hanya `SELECT`, `PRAGMA integrity_check/quick_check/journal_mode`, dan `EXPLAIN QUERY PLAN`; tidak ada `INSERT/UPDATE/DELETE/DROP/VACUUM` penuh.
- Orphan dicek dengan `NOT EXISTS` (aman terhadap NULL), placeholder `'-'`/kosong diabaikan.
- Row count diambil per tabel saat script berjalan; server dev aktif sehingga WAL dapat berubah antar-run — jumlah di tabel aset seharusnya stabil.
- Exit code: `0` = sehat, `1` = ada integritas gagal / orphan unresolved / index hot-filter hilang.

---
*Dibuat oleh agent `data` — MIS SHOP OPS sprint malam. DB produksi tidak dimodifikasi.*
