# MIS SHOP OPS - Asset Management, Barcode Tracking & POS Monitoring

Sistem manajemen inventaris aset IT Support (MIS), pelacakan barcode/QR hardware POS, monitoring status perangkat, serta database operasional **CCTV / DVR** dan **Mesin EDC Bank (Plaza Bali)**.

---

## 📋 Modul Aset Utama MIS / IT Support

### 1. Modul Pencatatan Mesin EDC Bank - Plaza Bali (`/edc`)
* Pemetaan 33 titik kasir POS Terminal 3 Soekarno-Hatta (`CGKT3DFD01-P01` s/d `CGKT3DFA02-P02`).
* Kredensial lengkap per kasir:
  * **EDC BCA**: TID (Terminal ID) & MID (Merchant ID: `885000533981` / `885000702701`).
  * **EDC BNI**: TID & MID (contoh: `14888514`, `78385716`).
  * **EDC Mandiri**: TID & MID (`70405015521`).
  * **EDC BRI**: TID & MID (`1999258659` / `1999682212`).
* Fitur: 1-Klik Salin (Copy) TID/MID saat troubleshoot dengan pihak bank atau kasir, Filter Zona Counter (`DFD01` s/d `DFA02`), Filter Status Aktif (`Y`/`N`), Cetak Stiker Label Barcode, dan Export CSV / Excel.

### 2. Modul Pencatatan DVR & CCTV (`/dvr`)
* 25 Unit DVR Hikvision tersebar di area Jakarta, Mall, Warehouse, dan Surabaya.
* Spesifikasi: Alokasi Hardisk (2TB - 8TB), Channel (16 CH / 8 CH), Jumlah Kamera, Retensi Rekaman (hingga 227 hari).
* Fitur: 1-Klik Buka Web GUI DVR lewat IP Address, Intip & Salin Password, Filter Wilayah (Jakarta / Surabaya / Gudang), Cetak Label Stiker Barcode, dan Export CSV / Excel.

### 3. Modul Hardware & Perangkat Kasir POS (`/assets`)
* Inventaris PC Kasir, Printer Thermal Struk, Barcode Scanner, Network / Router, UPS.

### 4. Helpdesk Tiket Kendala (`/tickets`)
* Antrean penanganan kerusakan perangkat toko dengan level urgensi dan catatan teknisi IT.

### 5. Monitoring Koneksi IP Realtime (`/monitoring`)
* Status ping dan heartbeat perangkat kasir & DVR.

---

## 👥 3 Role Pengguna

| Role | Username | Password | Wilayah Toko | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **MIS** (IT Support) | `mis` | `123` | **Semua Toko** | **Superadmin**: Akses master seluruh modul aset (DVR, EDC, Hardware, Monitoring, Tiket). |
| **SPV PLAZABALI** | `spv_plazabali` | `123` | **Plaza Bali** | Akses aset toko Plaza Bali, mesin EDC Plaza Bali, scan barcode, dan laporan tiket. |
| **SPV SAM** | `spv_sam` | `123` | **SAM** | Akses aset toko SAM, scan barcode, dan laporan tiket. |

---

## 💻 Cara Menjalankan

Cukup klik ganda (double-click):
```
start-server.bat
```
Buka di browser PC IT: `http://localhost:3000`
Akses dari HP / Tablet: `http://192.168.0.90:3000`
