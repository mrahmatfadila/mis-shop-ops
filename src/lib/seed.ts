import { createClient } from "@libsql/client";
import path from "path";

// Simpan file database di root proyek
const dbPath = path.resolve(process.cwd(), "shop_ops.db");

export const db = createClient({
  url: `file:${dbPath.replace(/\\/g, "/")}`,
});

let isInitialized = false;

export async function runFullSeed() {
  if ((globalThis as any).__db_initialized) return;

  // Optimasi SQLite: WAL mode (non-blocking reads & writes) & memory cache
  try {
    await db.execute("PRAGMA journal_mode = WAL;");
    await db.execute("PRAGMA synchronous = NORMAL;");
    await db.execute("PRAGMA temp_store = MEMORY;");
    await db.execute("PRAGMA cache_size = -64000;");
    await db.execute("PRAGMA busy_timeout = 5000;");
  } catch (e) {
    // Abaikan jika tidak didukung driver
  }

  // Cek instan: jika tabel users sudah ada dan terisi, tandai database siap (< 1ms)
  try {
    const checkUsers = await db.execute("SELECT count(*) as count FROM users");
    if (Number((checkUsers.rows[0] as any)?.count || 0) > 0) {
      (globalThis as any).__db_initialized = true;
      return;
    }
  } catch (e) {
    // Belum terinisialisasi, lanjutkan pembuatan tabel & seed di bawah
  }

  // 1. Tabel Users & Roles (MIS, SPV Plaza Bali, SPV SAM)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      shop_location TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const countUsers = await db.execute("SELECT count(*) as count FROM users");
  if ((Number((countUsers.rows[0] as any)?.count) || 0) === 0) {
    const defaultUsers = [
      {
        username: "admin",
        name: "Administrator Sistem",
        role: "ADMIN",
        shop_location: "Semua Toko",
        password: "123",
      },
      {
        username: "mis",
        name: "MIS OPS",
        role: "MIS",
        shop_location: "Semua Toko",
        password: "123",
      },
      {
        username: "manager",
        name: "MIS MANAGER",
        role: "MANAGER",
        shop_location: "Semua Toko",
        password: "123",
      },
      {
        username: "procurement",
        name: "MIS PROCUREMENT SUPPORT",
        role: "IT_PROCUREMENT",
        shop_location: "Semua Toko",
        password: "123",
      },
      {
        username: "spv_plazabali",
        name: "SPV Plaza Bali",
        role: "SPV_PLAZABALI",
        shop_location: "Plaza Bali",
        password: "123",
      },
      {
        username: "spv_sam",
        name: "SPV SAM",
        role: "SPV_SAM",
        shop_location: "SAM",
        password: "123",
      },
    ];

    for (const u of defaultUsers) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO users (username, name, role, shop_location, password)
              VALUES (?, ?, ?, ?, ?)`,
        args: [u.username, u.name, u.role, u.shop_location, u.password],
      });
    }
  }

  // 2. Tabel Aset Standar (Hardware / POS / Peripheral)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      shop_location TEXT NOT NULL,
      brand_model TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      ip_address TEXT,
      purchase_date TEXT,
      status TEXT DEFAULT 'OPERASIONAL',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. TABEL KHUSUS ASET CCTV & DVR MILIK MIS / IT SUPPORT
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dvr_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      location TEXT NOT NULL,
      dvr_type TEXT NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      harddisk TEXT,
      channels TEXT,
      camera_count TEXT,
      retention_days TEXT,
      username TEXT DEFAULT 'admin',
      password TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'OPERASIONAL',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. TABEL KHUSUS ASET MESIN EDC BANK (PLAZA BALI / POS KASIR)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS edc_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pos_location TEXT UNIQUE NOT NULL,
      shop_name TEXT DEFAULT 'Plaza Bali',
      is_active TEXT DEFAULT 'Y',
      bca_credit TEXT DEFAULT '-',
      bca_debit TEXT DEFAULT '-',
      bca_qr TEXT DEFAULT '-',
      bca_tid TEXT DEFAULT '-',
      bca_mid TEXT DEFAULT '-',
      bni_credit TEXT DEFAULT '-',
      bni_debit TEXT DEFAULT '-',
      bni_qr TEXT DEFAULT '-',
      bni_tid TEXT DEFAULT '-',
      bni_mid TEXT DEFAULT '-',
      mandiri_credit TEXT DEFAULT '-',
      mandiri_debit TEXT DEFAULT '-',
      mandiri_qr TEXT DEFAULT '-',
      mandiri_tid TEXT DEFAULT '-',
      mandiri_mid TEXT DEFAULT '-',
      bri_credit TEXT DEFAULT '-',
      bri_debit TEXT DEFAULT '-',
      bri_qr TEXT DEFAULT '-',
      bri_tid TEXT DEFAULT '-',
      bri_mid TEXT DEFAULT '-',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Tabel Tickets
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      asset_code TEXT NOT NULL,
      shop_location TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      urgency TEXT DEFAULT 'SEDANG',
      status TEXT DEFAULT 'MENUNGGU',
      problem_title TEXT NOT NULL,
      problem_desc TEXT NOT NULL,
      it_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `);

  // 5. Tabel Monitoring Devices
  await db.execute(`
    CREATE TABLE IF NOT EXISTS monitoring_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      ip_address TEXT NOT NULL,
      status TEXT DEFAULT 'ONLINE',
      response_time_ms INTEGER DEFAULT 0,
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT
    )
  `);

  // 6. Tabel Purchases (Pengadaan & Pembelian Aset / Periferal IT & Toko)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_location TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit TEXT DEFAULT 'Unit',
      estimated_price INTEGER DEFAULT 0,
      total_price INTEGER DEFAULT 0,
      vendor TEXT,
      request_date TEXT DEFAULT (DATE('now')),
      purchase_date TEXT,
      received_date TEXT,
      requester TEXT NOT NULL,
      status TEXT DEFAULT 'PENGAJUAN',
      priority TEXT DEFAULT 'BIASA',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Tabel Pencatatan Aset MIS T3-DF1 (DF1 - DF7)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t3_fixed_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_no INTEGER,
      tgl_perolehan TEXT,
      tgl_pemakaian TEXT,
      kategori TEXT NOT NULL,
      nama_merk TEXT NOT NULL,
      serial_number TEXT DEFAULT '-',
      spesifikasi TEXT,
      lokasi TEXT NOT NULL,
      pengguna TEXT NOT NULL,
      harga_pembelian INTEGER DEFAULT 0,
      qty INTEGER DEFAULT 1,
      no_asset TEXT UNIQUE NOT NULL,
      keterangan TEXT,
      status TEXT DEFAULT 'OPERASIONAL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Tabel Direktori Extension Telepon PABX / Intercom
  await db.execute(`
    CREATE TABLE IF NOT EXISTS phone_extensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_no INTEGER,
      division TEXT NOT NULL,
      user_name TEXT NOT NULL,
      ext TEXT,
      location TEXT DEFAULT 'Head Office',
      notes TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'AKTIF',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Tabel Rak Server 32U & Wallmount 6U & Port Mapping Ruang Server
  await db.execute(`
    CREATE TABLE IF NOT EXISTS server_rack_ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_type TEXT DEFAULT 'RACK_32U_MAIN',
      device_group TEXT NOT NULL,
      port_no INTEGER NOT NULL,
      port_label TEXT NOT NULL,
      patch_panel_label TEXT,
      device_type TEXT NOT NULL,
      user_name TEXT,
      ext TEXT,
      ip_address TEXT,
      destination TEXT,
      cable_color TEXT,
      status TEXT DEFAULT 'CONNECTED',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS server_rack_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_type TEXT DEFAULT 'RACK_32U_MAIN',
      u_position INTEGER NOT NULL,
      name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      description TEXT,
      height_u INTEGER DEFAULT 1,
      vendor TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'OPERASIONAL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed 25 Data Riil DVR / CCTV MIS IT Support
  const countDvr = await db.execute("SELECT count(*) as count FROM dvr_assets");
  if ((Number((countDvr.rows[0] as any)?.count) || 0) === 0) {
    const initialDvrList = [
    {
      asset_code: "DVR-DF1",
      location: "DF1",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620240929CCWRFQ5188460WCVU",
      harddisk: "8 TB",
      channels: "16 CH",
      camera_count: "11 CAM (11 ANALOG)",
      retention_days: "157 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.19.1.81",
    },
    {
      asset_code: "DVR-DF2",
      location: "DF2",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620230425CCWRAA6918154WCVU",
      harddisk: "4 TB",
      channels: "16 CH",
      camera_count: "14 CAM (14 ANALOG)",
      retention_days: "33 HARI",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.19.1.82",
    },
    {
      asset_code: "DVR-DF3",
      location: "DF3",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620240518CCWRFE5198490WCVU",
      harddisk: "4 TB",
      channels: "16 CH",
      camera_count: "12 CAM (12 ANALOG)",
      retention_days: "12 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.19.1.83",
    },
    {
      asset_code: "DVR-DF4",
      location: "DF4",
      dvr_type: "iDS-7208HQHI-M1 / E",
      serial_number: "iDS-7208HQHI-M1 / E0820230428CCWRAA8133304WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "45 HARI",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.19.1.84",
    },
    {
      asset_code: "DVR-COLONIAL",
      location: "COLONIAL",
      dvr_type: "DS-7208HQHI-K1",
      serial_number: "DS-7208HQHI-K10820170914CCWR835023779WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "107 HARI",
      username: "admin",
      password: "admin1234",
      ip_address: "172.19.1.86",
    },
    {
      asset_code: "DVR-JADA2",
      location: "JADA2",
      dvr_type: "iDS-7208HQHI-M1 / S",
      serial_number: "iDS-7208HQHI-M1 / S0820230424CCWRAA5668317WCVU",
      harddisk: "2 TB",
      channels: "8 CH",
      camera_count: "5 CAM (5 ANALOG)",
      retention_days: "34 HARI",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.19.1.85",
    },
    {
      asset_code: "DVR-GGO01",
      location: "GGO01-T3",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620250709CCWRGC6950569WCVU",
      harddisk: "4 TB",
      channels: "16 CH",
      camera_count: "12 CAM (12 ANALOG)",
      retention_days: "43 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.33.1.81",
    },
    {
      asset_code: "DVR-KRATON",
      location: "THE KRATON",
      dvr_type: "iDS-7208HQHI-M1 / E",
      serial_number: "iDS-7208HQHI-M1 / E0820230621CCWRAC9298399WCVU",
      harddisk: "2 TB",
      channels: "8 CH",
      camera_count: "3 CAM (3 ANALOG)",
      retention_days: "45 HARI",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.19.1.87",
    },
    {
      asset_code: "DVR-EMPORIUM",
      location: "EMPORIUM",
      dvr_type: "DS-7216HGHI-M1 / T",
      serial_number: "DS-7216HGHI-M1 / T1620250319CCWRFX7228665WCVU",
      harddisk: "8 TB",
      channels: "16 CH",
      camera_count: "14 CAM (14 ANALOG)",
      retention_days: "90 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.19.1.88",
    },
    {
      asset_code: "DVR-MII",
      location: "MII",
      dvr_type: "DS-7208HQHI-K1/E",
      serial_number: "DS-7208HQHI-K1/E0820211015CCWRG85572261WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "65 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.19.1.89",
    },
    {
      asset_code: "DVR-J6",
      location: "J6-LOKATARA",
      dvr_type: "DS-7208HUHI-K1/E",
      serial_number: "DS-7208HUHI-K1/E0820210513CCWRG01062671WCVU",
      harddisk: "2 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "15 HARI",
      username: "admin",
      password: "admin1234",
      ip_address: "172.18.0.105",
    },
    {
      asset_code: "DVR-J3",
      location: "J3-BBV",
      dvr_type: "DS-7216HQHI-K2",
      serial_number: "DS-7216HQHI-K21620180105CCWRC03643804WCVU",
      harddisk: "4 TB + 1 TB",
      channels: "16 CH",
      camera_count: "14 CAM (12 ANALOG + 2 IPCAM)",
      retention_days: "22 HARI",
      username: "admin",
      password: "admin1234",
      ip_address: "172.18.1.103",
    },
    {
      asset_code: "DVR-J5",
      location: "J5",
      dvr_type: "DS-7216HQHI-K2",
      serial_number: "DS-7216HQHI-K21620180105CCWRC03643574WCVU",
      harddisk: "8 TB",
      channels: "16 CH",
      camera_count: "16 CAM (15 ANALOG + 1 IPCAM)",
      retention_days: "77 HARI",
      username: "admin",
      password: "admin1234",
      ip_address: "172.18.1.85",
    },
    {
      asset_code: "DVR-J7",
      location: "J7",
      dvr_type: "iDS-7208HQHI-M1 / E",
      serial_number: "iDS-7208HQHI-M1 / E0820230317CCWRL42401779WCVU",
      harddisk: "1 TB",
      channels: "8 CH",
      camera_count: "8 CAM (5 ANALOG)",
      retention_days: "17 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.18.1.87",
    },
    {
      asset_code: "DVR-GGO02",
      location: "GGO02",
      dvr_type: "iDS-7208HQHI-M1 / E",
      serial_number: "iDS-7208HQHI-M1 / E0820230317CCWRL42401683WCVU",
      harddisk: "6 TB",
      channels: "8 CH",
      camera_count: "8 CAM (4 ANALOG)",
      retention_days: "-",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.18.1.101",
    },
    {
      asset_code: "DVR-WHS-PB",
      location: "WHS-PB",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620230425CCWRAA6918140WCVU",
      harddisk: "4 TB",
      channels: "16 CH",
      camera_count: "16 CAM (15 ANALOG + 1 IPCAM)",
      retention_days: "20 HARI",
      username: "admin",
      password: "Admin1234",
      ip_address: "172.17.1.100",
    },
    {
      asset_code: "DVR-WHS-SAM",
      location: "WHS-SAM",
      dvr_type: "iDS-7208HQHI-M1 / XT",
      serial_number: "iDS-7208HQHI-M1 / XT0820250324CCWRFX9397735WCVU",
      harddisk: "3 TB",
      channels: "8 CH",
      camera_count: "8 CAM (8 ANALOG)",
      retention_days: "74 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.14.1.81",
    },
    // Surabaya Area
    {
      asset_code: "DVR-SBY-BBV2",
      location: "SBY -BBVLT2",
      dvr_type: "iDS-7208HQHI-M1/E",
      serial_number: "iDS-7208HQHI-M1/E0820240119CCWRAZ6937779WCVU",
      harddisk: "2 TB",
      channels: "8 CH",
      camera_count: "9 CAM (7 ANALOG)",
      retention_days: "19 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.85",
    },
    {
      asset_code: "DVR-SBY-BBV1",
      location: "SBY -BBVLT1",
      dvr_type: "iDS-7208HQHI-M1/E",
      serial_number: "iDS-7208HQHI-M1/E0820240204CCWRFA3928344WCVU",
      harddisk: "2 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "19 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.86",
    },
    {
      asset_code: "DVR-SBY-DF1",
      location: "SBY-DF1",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620241031CCWRFR9515509WCVU",
      harddisk: "8 TB",
      channels: "16 CH",
      camera_count: "12 CAM (12 ANALOG)",
      retention_days: "226 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.81",
    },
    {
      asset_code: "DVR-SBY-DF2",
      location: "SBY-DF2",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "DS-7216HGHI-M11620241226CCWRFU9165335WCVU",
      harddisk: "8 TB",
      channels: "16 CH",
      camera_count: "14 CAM (14 ANALOG)",
      retention_days: "227 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.82",
    },
    {
      asset_code: "DVR-SBY-DF3",
      location: "SBY-DF3",
      dvr_type: "iDS-7208HQHI-M1/XT",
      serial_number: "iDS-7208HQHI-M1/XT0820241018CCWRFR2442649WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "7 CAM (7 ANALOG)",
      retention_days: "87 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.83",
    },
    {
      asset_code: "DVR-SBY-WHSBC",
      location: "SBY-WHSBC",
      dvr_type: "iDS-7208HQHI-M1/XT",
      serial_number: "iDS-7208HQHI-M1/XT0820241018CCWRFR2442642WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "3 CAM (3 ANALOG)",
      retention_days: "225 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.84",
    },
    {
      asset_code: "DVR-SBY-DFA01",
      location: "SBY-DFA01",
      dvr_type: "iDS-7208HQHI-M1/XT",
      serial_number: "iDS-7208HQHI-M1/XT0820241018CCWRFR2442619WCVU",
      harddisk: "4 TB",
      channels: "8 CH",
      camera_count: "4 CAM (4 ANALOG)",
      retention_days: "227 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.88",
    },
    {
      asset_code: "DVR-SBY-AZARIAH",
      location: "SBY-AZARIAHAJJ",
      dvr_type: "iDS-7208HQHI-M1/XT",
      serial_number: "iDS-7208HQHI-M1/XT0820240928CCWRFQ4643827WCVU",
      harddisk: "500 GB",
      channels: "8 CH",
      camera_count: "3 CAM (3 ANALOG)",
      retention_days: "54 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.23.1.87",
    },
    {
      asset_code: "DVR-SBY-GUDANG",
      location: "SBY-GUDANG-BBV",
      dvr_type: "Hikvision DVR Standalone",
      serial_number: "DVR-SBY-GUDANG-172255080",
      harddisk: "1 TB",
      channels: "8 CH",
      camera_count: "DVR 1 UNIT",
      retention_days: "-",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.25.50.80",
    },
    {
      asset_code: "DVR-SBY-SHOP",
      location: "SBY-SHOP",
      dvr_type: "Hikvision DVR Standalone",
      serial_number: "DVR-SBY-SHOP-172255081",
      harddisk: "1 TB",
      channels: "4 CH",
      camera_count: "3 CAM (3 ANALOG)",
      retention_days: "-",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.25.50.81",
    },
  ];

  for (const item of initialDvrList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO dvr_assets (
              asset_code, location, dvr_type, serial_number, harddisk, channels, camera_count, retention_days, username, password, ip_address, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPERASIONAL')`,
      args: [
        item.asset_code,
        item.location,
        item.dvr_type,
        item.serial_number,
        item.harddisk,
        item.channels,
        item.camera_count,
        item.retention_days,
        item.username,
        item.password,
        item.ip_address,
      ],
    });

    // Otomatis masukkan juga ke monitoring ping
    if (item.ip_address) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO monitoring_devices (asset_code, ip_address, status, response_time_ms, last_heartbeat, details)
              VALUES (?, ?, 'ONLINE', 8, datetime('now'), ?)`,
        args: [item.asset_code, item.ip_address, `DVR CCTV ${item.location} (${item.channels})`],
      });
    }
  }
}

  // Seed Data Riil EDC (Plaza Bali & SAM)
  const countEdc = await db.execute("SELECT count(*) as count FROM edc_assets");
  if ((Number((countEdc.rows[0] as any)?.count) || 0) === 0) {
    const initialEdcList = [
    {
      pos_location: "CGKT3DFD01-P01", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "CH105545", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10592843", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD01-P02", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "CH154673", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447370", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD01-P03", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0DK8967", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "82921899", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447371", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD01-P04", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0EW0792", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "14888514", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447369", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD01-P05", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "CX498395", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "82921307", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447372", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P01", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HX6021", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "82921901", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447373", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P02", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IC1604", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447375", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P03", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HX0156", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10592842", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P04", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IB4167", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10592840", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P05", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IB4168", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447376", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD02-P06", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0BJ2935", bca_mid: "885000533981",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "82927900", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15167323", bri_mid: "1999682212"
    },
    {
      pos_location: "CGKT3DFD03-P01", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0CB6444", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "80949175", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447378", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD03-P02", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IG5760", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447377", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD03-P03", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IG5761", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "14888511", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10865884", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFD03-P04", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0FC3443", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "84947663", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447379", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD03-P05", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0ET0514", bca_mid: "885000533981",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10865883", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD03-P09", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IG8832", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10592839", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P01", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HZ1360", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447380", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P02", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HY5111", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "82921902", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10592836", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P03", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0GL7275", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "14888513", bni_mid: "100214228884",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447381", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P04", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IB0805", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "83479631", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447382", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P05", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "-", bca_mid: "-",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10592838", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P06", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "CX498540", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "78385716", bni_mid: "71166484875",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447367", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD04-P07", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0CT1874", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "78382523", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10592841", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD05-P13", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0EW2880", bca_mid: "885000533981",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10447368", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD05-P14", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "CP861672", bca_mid: "885000533981",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "80949177", mandiri_mid: "70405015521",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10592837", bri_mid: "1999258659"
    },
    {
      pos_location: "CGKT3DFD06-P01", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C0FW6959", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15045999", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFD06-P02", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C0FW6957", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15046000", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFD06-P03", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C0FW6958", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15045998", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFD07-P01", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "-", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15072852", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFD07-P02", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C2IA1546", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15072853", bri_mid: "-"
    },
    {
      pos_location: "CGKT3DFA02-P01", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IG6748", bca_mid: "885000702701",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "71441691510",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "80949170", mandiri_mid: "70405015521",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15101686", bri_mid: "1999335823"
    },
    {
      pos_location: "CGKT3DFA02-P02", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2JC9444", bca_mid: "885000702701",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10567259", bri_mid: "1999335823"
    },
  ];

  for (const edc of initialEdcList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO edc_assets (
              pos_location, shop_name, is_active,
              bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
              bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
              mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
              bri_credit, bri_debit, bri_qr, bri_tid, bri_mid
            ) VALUES (?, 'Plaza Bali', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        edc.pos_location, edc.is_active,
        edc.bca_credit, edc.bca_debit, edc.bca_qr, edc.bca_tid, edc.bca_mid,
        edc.bni_credit, edc.bni_debit, edc.bni_qr, edc.bni_tid, edc.bni_mid,
        edc.mandiri_credit, edc.mandiri_debit, edc.mandiri_qr, edc.mandiri_tid, edc.mandiri_mid,
        edc.bri_credit, edc.bri_debit, edc.bri_qr, edc.bri_tid, edc.bri_mid,
      ],
    });
  }

  // Seed 20 Data Riil EDC Milik SAM (Terminal 2 & Terminal 3)
  const initialSamEdcList = [
    {
      pos_location: "CGKT3BBV01-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2JI3060", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626170", bri_mid: "-"
    },
    {
      pos_location: "CGKT3BBV01-P02", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0GN0400", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15042795", bri_mid: "-"
    },
    {
      pos_location: "CGKT3BBV01-P03", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0DC8543", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "19934456", bri_mid: "-"
    },
    {
      pos_location: "CGKT3BBV01-P90", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C0DC8542", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15090000", bri_mid: "-"
    },
    {
      pos_location: "CGKT2OLR01-P01", shop_name: "SAM", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "D0DC8541", bca_mid: "885002515806",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626175", bri_mid: "-"
    },
    {
      pos_location: "CGKT2OLR01-P90", shop_name: "SAM", is_active: "N",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "-", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "-", bri_mid: "-"
    },
    {
      pos_location: "CGKT2EAD01-P01", shop_name: "SAM", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "D0DC8545", bca_mid: "885002515809",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626172", bri_mid: "-"
    },
    {
      pos_location: "CGKT2EAD01-P90", shop_name: "SAM", is_active: "N",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "-", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "-", bri_mid: "-"
    },
    {
      pos_location: "CGKT2WSD01-P01", shop_name: "SAM", is_active: "N",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "D0DC8544", bca_mid: "885002515808",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626174", bri_mid: "-"
    },
    {
      pos_location: "CGKT2WSD01-P90", shop_name: "SAM", is_active: "N",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "-", bca_mid: "-",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "-", bri_mid: "-"
    },
    {
      pos_location: "CGKT2SRR01-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2JH6331", bca_mid: "2515804",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626171", bri_mid: "-"
    },
    {
      pos_location: "CGKT2SRR01-P90", shop_name: "SAM", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C2JH6331", bca_mid: "2515804",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10626171", bri_mid: "-"
    },
    {
      pos_location: "CGKT2GGO03-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HX5985", bca_mid: "885002134774",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626176", bri_mid: "1999373212"
    },
    {
      pos_location: "CGKT2GGO03-P02", shop_name: "SAM", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C2HX5985", bca_mid: "885002134774",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10626176", bri_mid: "1999373212"
    },
    {
      pos_location: "CGKT2DDD01-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2JH6333", bca_mid: "2515805",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10626173", bri_mid: "-"
    },
    {
      pos_location: "CGKT2DDD01-P02", shop_name: "SAM", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C2JH6333", bca_mid: "2515805",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "10626173", bri_mid: "-"
    },
    {
      pos_location: "CGKT2BBV01-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IQ2140", bca_mid: "2056090",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "10625234", bri_mid: "1999372394"
    },
    {
      pos_location: "CGKT3GGO04-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2IP6530", bca_mid: "4648440",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15148564", bri_mid: "-"
    },
    {
      pos_location: "CGKT2GGO02-P01", shop_name: "SAM", is_active: "Y",
      bca_credit: "-", bca_debit: "-", bca_qr: "-", bca_tid: "C2HC1956", bca_mid: "4281170",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "-", bri_debit: "-", bri_qr: "-", bri_tid: "15090001", bri_mid: "-"
    },
    {
      pos_location: "CGKT2GGO02-P02", shop_name: "SAM", is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "C2HC1955", bca_mid: "4281170",
      bni_credit: "-", bni_debit: "-", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "-", mandiri_debit: "-", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "15090002", bri_mid: "-"
    },
  ];

  for (const edc of initialSamEdcList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO edc_assets (
              pos_location, shop_name, is_active,
              bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
              bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
              mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
              bri_credit, bri_debit, bri_qr, bri_tid, bri_mid
            ) VALUES (?, 'SAM', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        edc.pos_location, edc.is_active,
        edc.bca_credit, edc.bca_debit, edc.bca_qr, edc.bca_tid, edc.bca_mid,
        edc.bni_credit, edc.bni_debit, edc.bni_qr, edc.bni_tid, edc.bni_mid,
        edc.mandiri_credit, edc.mandiri_debit, edc.mandiri_qr, edc.mandiri_tid, edc.mandiri_mid,
        edc.bri_credit, edc.bri_debit, edc.bri_qr, edc.bri_tid, edc.bri_mid,
      ],
    });
  }
}

  // 6. TABEL KHUSUS PERANGKAT KASIR POS PLAZA BALI & SAM
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pos_hardware_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pos_number INTEGER NOT NULL,
      counter_no INTEGER NOT NULL,
      pos_code TEXT UNIQUE NOT NULL,
      shop_name TEXT DEFAULT 'Plaza Bali',
      terminal TEXT NOT NULL,
      counter_zone TEXT NOT NULL,
      ip_address TEXT,
      pos_brand TEXT NOT NULL,
      pos_sn TEXT DEFAULT '-',
      ram TEXT DEFAULT '-',
      ssd TEXT DEFAULT '-',
      passport_scanner TEXT DEFAULT '-',
      barcode_scanner TEXT DEFAULT '-',
      printer TEXT DEFAULT '-',
      fingerprint_scanner TEXT DEFAULT '-',
      keyboard TEXT DEFAULT '-',
      mouse TEXT DEFAULT '-',
      cash_drawer TEXT DEFAULT '-',
      monitor TEXT DEFAULT '-',
      os_version TEXT DEFAULT '-',
      status TEXT DEFAULT 'OPERASIONAL',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const countPos = await db.execute("SELECT count(*) as count FROM pos_hardware_assets");
  if ((Number((countPos.rows[0] as any)?.count) || 0) === 0) {
    const initialPosHardwareList = [
    // Counter DFD01 (Terminal 3)
    {
      pos_number: 1, counter_no: 1, pos_code: "CGKT3DFD01-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD01", ip_address: "172.19.20.11",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "OK", keyboard: "LOGITECH (PS2)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 2, counter_no: 2, pos_code: "CGKT3DFD01-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD01", ip_address: "172.19.20.12",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH (PS2)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 3, counter_no: 3, pos_code: "CGKT3DFD01-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD01", ip_address: "172.19.20.13",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH (PS2)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 4, counter_no: 4, pos_code: "CGKT3DFD01-P04", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD01", ip_address: "172.19.20.14",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 5, counter_no: 5, pos_code: "CGKT3DFD01-P05", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD01", ip_address: "172.19.20.15",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },

    // Counter DFD02 (Terminal 3)
    {
      pos_number: 6, counter_no: 1, pos_code: "CGKT3DFD02-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.21",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 7, counter_no: 2, pos_code: "CGKT3DFD02-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.22",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 8, counter_no: 3, pos_code: "CGKT3DFD02-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.23",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 9, counter_no: 4, pos_code: "CGKT3DFD02-P04", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.24",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "OK", keyboard: "LOGITECH (PS2)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 10, counter_no: 5, pos_code: "CGKT3DFD02-P05", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.25",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH (PS2)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 11, counter_no: 6, pos_code: "CGKT3DFD02-P06", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD02", ip_address: "172.19.20.26",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },

    // Counter DFD03 (Terminal 3)
    {
      pos_number: 12, counter_no: 1, pos_code: "CGKT3DFD03-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "172.19.20.31",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 13, counter_no: 2, pos_code: "CGKT3DFD03-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "172.19.20.32",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 14, counter_no: 3, pos_code: "CGKT3DFD03-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "172.19.20.33",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 15, counter_no: 4, pos_code: "CGKT3DFD03-P04", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "-",
      pos_brand: "-", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "-", printer: "-",
      fingerprint_scanner: "-", keyboard: "-", mouse: "-",
      cash_drawer: "-", monitor: "-", os_version: "-",
      status: "CADANGAN", notes: "Titik Kasir Cadangan"
    },
    {
      pos_number: 16, counter_no: 5, pos_code: "CGKT3DFD03-P05", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "172.19.20.34",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 17, counter_no: 6, pos_code: "CGKT3DFD03-P09", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD03", ip_address: "172.19.20.39",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },

    // Counter DFD04 (Terminal 3)
    {
      pos_number: 18, counter_no: 1, pos_code: "CGKT3DFD04-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.41",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 19, counter_no: 2, pos_code: "CGKT3DFD04-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.42",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 20, counter_no: 3, pos_code: "CGKT3DFD04-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.43",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 21, counter_no: 4, pos_code: "CGKT3DFD04-P04", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.44",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 22, counter_no: 5, pos_code: "CGKT3DFD04-P05", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.45",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 23, counter_no: 6, pos_code: "CGKT3DFD04-P06", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.46",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "PLUSTEK 100X", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 24, counter_no: 7, pos_code: "CGKT3DFD04-P07", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.47",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 25, counter_no: 8, pos_code: "CGKT3DFD04-P08", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.48",
      pos_brand: "TOSHIBA", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "ACER", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: "Monitor Eksternal ACER"
    },
    {
      pos_number: 26, counter_no: 9, pos_code: "CGKT3DFD04-P13", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.71",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "BIASA",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },
    {
      pos_number: 27, counter_no: 10, pos_code: "CGKT3DFD04-P14", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFD04", ip_address: "172.19.20.72",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULT SP1 64BIT",
      status: "OPERASIONAL", notes: ""
    },

    // Counter DFA02 (Terminal 3)
    {
      pos_number: 28, counter_no: 1, pos_code: "CGKT3DFA02-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFA02", ip_address: "172.19.20.51",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220B",
      fingerprint_scanner: "DIGITAL PERSONA", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: "Fingerprint Digital Persona"
    },
    {
      pos_number: 29, counter_no: 2, pos_code: "CGKT3DFA02-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 3", counter_zone: "DFA02", ip_address: "172.19.20.52",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220B",
      fingerprint_scanner: "DIGITAL PERSONA", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Fingerprint Digital Persona"
    },

    // Counter DPD03 (Terminal 2)
    {
      pos_number: 30, counter_no: 1, pos_code: "CGKT2DPD03-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DPD03", ip_address: "172.18.20.31",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220B",
      fingerprint_scanner: "-", keyboard: "BANDA(GANTI)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2"
    },
    {
      pos_number: 31, counter_no: 2, pos_code: "CGKT2DPD03-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DPD03", ip_address: "172.18.20.32",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220B",
      fingerprint_scanner: "-", keyboard: "HAVIT", mouse: "LOGITECH",
      cash_drawer: "LAMA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2"
    },
    {
      pos_number: 32, counter_no: 3, pos_code: "CGKT2DPD03-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DPD03", ip_address: "172.18.20.33",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220B",
      fingerprint_scanner: "-", keyboard: "BANDA(GANTI)", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2"
    },

    // Counter DFD05 (Terminal 2)
    {
      pos_number: 33, counter_no: 1, pos_code: "CGKT2DFD05-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DFD05", ip_address: "172.18.20.51",
      pos_brand: "NCR", pos_sn: "-", ram: "4GB", ssd: "120GB",
      passport_scanner: "PLUSTEK 100X", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 - RAM 4GB, SSD 120GB"
    },
    {
      pos_number: 34, counter_no: 2, pos_code: "CGKT2DFD05-P02", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DFD05", ip_address: "172.18.20.52",
      pos_brand: "NCR", pos_sn: "-", ram: "4GB", ssd: "120GB",
      passport_scanner: "GEMALTO", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 - RAM 4GB, SSD 120GB"
    },
    {
      pos_number: 35, counter_no: 3, pos_code: "CGKT2DFD05-P03", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DFD05", ip_address: "172.18.20.53",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 - RAM 8GB, SSD 250GB Kassen"
    },
    {
      pos_number: 36, counter_no: 4, pos_code: "CGKT2DFD05-P04", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DFD05", ip_address: "172.18.20.54",
      pos_brand: "NCR", pos_sn: "-", ram: "4GB", ssd: "120GB",
      passport_scanner: "3M", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 - RAM 4GB, SSD 120GB"
    },
    {
      pos_number: 37, counter_no: 5, pos_code: "CGKT2DFD05-P08", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DFD05", ip_address: "172.18.20.58",
      pos_brand: "TOSHIBA", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "3M", barcode_scanner: "ZEBRA", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "ACER", os_version: "-",
      status: "OPERASIONAL", notes: "Terminal 2 - Toshiba, Scanner Zebra, Monitor Acer"
    },

    // Counter DPD06 (Terminal 2)
    {
      pos_number: 38, counter_no: 1, pos_code: "CGKT2DPD06-P01", shop_name: "Plaza Bali",
      terminal: "Terminal 2", counter_zone: "DPD06", ip_address: "172.18.20.61",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 - Kassen"
    }
  ];

  for (const pos of initialPosHardwareList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO pos_hardware_assets (
              pos_number, counter_no, pos_code, shop_name, terminal, counter_zone,
              ip_address, pos_brand, pos_sn, ram, ssd,
              passport_scanner, barcode_scanner, printer, fingerprint_scanner,
              keyboard, mouse, cash_drawer, monitor, os_version, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_number, pos.counter_no, pos.pos_code, pos.shop_name, pos.terminal, pos.counter_zone,
        pos.ip_address, pos.pos_brand, pos.pos_sn, pos.ram, pos.ssd,
        pos.passport_scanner, pos.barcode_scanner, pos.printer, pos.fingerprint_scanner,
        pos.keyboard, pos.mouse, pos.cash_drawer, pos.monitor, pos.os_version, pos.status, pos.notes
      ],
    });

    // Sync IP to monitoring_devices if IP address is valid
    if (pos.ip_address && pos.ip_address !== "-") {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [pos.pos_code, pos.ip_address, `Kasir ${pos.pos_code} (${pos.pos_brand}) - ${pos.terminal}`],
      });
    }

    // Sync to master assets table for standard asset search & ticketing
    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, 'POS Terminal', ?, ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_code,
        `Unit Kasir POS ${pos.pos_code}`,
        pos.shop_name,
        `${pos.pos_brand} (${pos.os_version || 'Win7'})`,
        pos.pos_sn || "-",
        pos.ip_address !== "-" ? pos.ip_address : null,
        pos.status,
        `Passport: ${pos.passport_scanner} | Barcode: ${pos.barcode_scanner} | Printer: ${pos.printer} | RAM: ${pos.ram} | SSD: ${pos.ssd}`
      ]
    });
  }

  // Migrasi Kolom EDC Langsung pada POS Hardware jika belum ada
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN bca_tid TEXT DEFAULT '-'");
  } catch (_) {}
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN bni_tid TEXT DEFAULT '-'");
  } catch (_) {}
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN bri_tid TEXT DEFAULT '-'");
  } catch (_) {}
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN mandiri_tid TEXT DEFAULT '-'");
  } catch (_) {}

  // 7. SEED DATA PERANGKAT KASIR POS TOKO SAM (17 TITIK POS)
  const initialSamPosHardwareList = [
    // Terminal 3 SAM
    {
      pos_number: 1, counter_no: 1, pos_code: "CGKT3GGO01-P01", shop_name: "SAM",
      terminal: "Terminal 3", counter_zone: "GGO01", ip_address: "172.33.70.1",
      pos_brand: "IWARE", pos_sn: "-", ram: "-", ssd: "-",
      bca_tid: "-", bni_tid: "10626170", bri_tid: "74947752", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100USE",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 3 GGO01"
    },
    {
      pos_number: 2, counter_no: 2, pos_code: "CGKT3GGO01-P90", shop_name: "SAM",
      terminal: "Terminal 3", counter_zone: "GGO01", ip_address: "172.33.70.90",
      pos_brand: "IWARE", pos_sn: "-", ram: "-", ssd: "-",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 3 GGO01"
    },
    {
      pos_number: 3, counter_no: 1, pos_code: "CGKT3GGO02-P02", shop_name: "SAM",
      terminal: "Terminal 3", counter_zone: "GGO02", ip_address: "172.33.70.2",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      bca_tid: "-", bni_tid: "10626177", bri_tid: "14595351", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 3 GGO02"
    },
    {
      pos_number: 4, counter_no: 1, pos_code: "CGKT3MMH01-P01", shop_name: "SAM",
      terminal: "Terminal 3", counter_zone: "MMH01", ip_address: "-",
      pos_brand: "KASSEN", pos_sn: "-", ram: "-", ssd: "-",
      bca_tid: "-", bni_tid: "10626178", bri_tid: "14650451", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 3 MMH01"
    },
    {
      pos_number: 5, counter_no: 2, pos_code: "CGKT3MMH01-P90", shop_name: "SAM",
      terminal: "Terminal 3", counter_zone: "MMH01", ip_address: "-",
      pos_brand: "IWARE", pos_sn: "-", ram: "-", ssd: "-",
      bca_tid: "-", bni_tid: "-", bri_tid: "74367570", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 3 MMH01"
    },

    // Terminal 2 SAM
    {
      pos_number: 6, counter_no: 1, pos_code: "CGKT2BBV01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "BBV01", ip_address: "172.18.70.1",
      pos_brand: "IWARE", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "D0BA0585", bni_tid: "-", bri_tid: "10625234", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON-TMU220D",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "AOC",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 BBV01"
    },
    {
      pos_number: 7, counter_no: 1, pos_code: "CGKT2SSR01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "SSR01", ip_address: "172.8.70.1",
      pos_brand: "KASSEN", pos_sn: "-", ram: "4GB", ssd: "150GB",
      bca_tid: "D0DC8539", bni_tid: "74876149", bri_tid: "10626171", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 SSR01"
    },
    {
      pos_number: 8, counter_no: 2, pos_code: "CGKT2SSR01-P90", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "SSR01", ip_address: "172.8.70.90",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 SSR01 - Windows 10 Pro"
    },
    {
      pos_number: 9, counter_no: 1, pos_code: "CGKT2OLR01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "OLR01", ip_address: "172.13.70.1",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "D0DC8541", bni_tid: "74876150", bri_tid: "10626175", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "VSC", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 OLR01"
    },
    {
      pos_number: 10, counter_no: 2, pos_code: "CGKT2OLR01-P90", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "OLR01", ip_address: "172.13.70.90",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 OLR01"
    },
    {
      pos_number: 11, counter_no: 1, pos_code: "CGKT2EAD01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "EAD01", ip_address: "172.10.70.1",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "D0DC8545", bni_tid: "74876152", bri_tid: "10626172", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10 PRO SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 EAD01 (CKGT2EAD01-P01)"
    },
    {
      pos_number: 12, counter_no: 2, pos_code: "CGKT2EAD01-P90", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "EAD01", ip_address: "172.10.70.90",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "VSC", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 EAD01 (CKGT2EAD01-P90)"
    },
    {
      pos_number: 13, counter_no: 1, pos_code: "CGKT2DDD01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "DDD01", ip_address: "172.9.70.1",
      pos_brand: "IWARE", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "D0DC8540", bni_tid: "74876153", bri_tid: "10626173", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "VSC", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 DDD01"
    },
    {
      pos_number: 14, counter_no: 1, pos_code: "CGKT2WSD01-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "WSD01", ip_address: "172.11.70.1",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "120GB",
      bca_tid: "D0DC8544", bni_tid: "-", bri_tid: "10626174", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 WSD01"
    },
    {
      pos_number: 15, counter_no: 2, pos_code: "CGKT2WSD01-P90", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "WSD01", ip_address: "172.11.70.90",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 WSD01"
    },
    {
      pos_number: 16, counter_no: 1, pos_code: "CGKT2GGO03-P01", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "GGO03", ip_address: "172.12.70.1",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "250GB",
      bca_tid: "C0BH8829", bni_tid: "-", bri_tid: "10626176", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 GGO03 (CGKT2GG03-P01)"
    },
    {
      pos_number: 17, counter_no: 2, pos_code: "CGKT2GGO03-P02", shop_name: "SAM",
      terminal: "Terminal 2", counter_zone: "GGO03", ip_address: "172.12.70.2",
      pos_brand: "KASSEN", pos_sn: "-", ram: "8GB", ssd: "150GB",
      bca_tid: "-", bni_tid: "-", bri_tid: "-", mandiri_tid: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "KASSEN:BT-P3100BT",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7 ULTIMATE SP1 64BIT",
      status: "OPERASIONAL", notes: "Terminal 2 GGO03 (CGKT2GG03-P02)"
    }
  ];

  for (const pos of initialSamPosHardwareList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO pos_hardware_assets (
              pos_number, counter_no, pos_code, shop_name, terminal, counter_zone,
              ip_address, pos_brand, pos_sn, ram, ssd,
              passport_scanner, barcode_scanner, printer, fingerprint_scanner,
              keyboard, mouse, cash_drawer, monitor, os_version,
              bca_tid, bni_tid, bri_tid, mandiri_tid,
              status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_number, pos.counter_no, pos.pos_code, pos.shop_name, pos.terminal, pos.counter_zone,
        pos.ip_address, pos.pos_brand, pos.pos_sn, pos.ram, pos.ssd,
        pos.passport_scanner, pos.barcode_scanner, pos.printer, pos.fingerprint_scanner,
        pos.keyboard, pos.mouse, pos.cash_drawer, pos.monitor, pos.os_version,
        pos.bca_tid, pos.bni_tid, pos.bri_tid, pos.mandiri_tid,
        pos.status, pos.notes
      ],
    });

    // Sync IP to monitoring_devices if IP address is valid
    if (pos.ip_address && pos.ip_address !== "-" && pos.ip_address.startsWith("172.")) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [pos.pos_code, pos.ip_address, `Kasir ${pos.pos_code} (${pos.pos_brand}) - ${pos.terminal} Toko SAM`],
      });
    }

    // Sync to master assets table for standard asset search & ticketing
    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, 'POS Terminal', ?, ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_code,
        `Unit Kasir POS ${pos.pos_code}`,
        pos.shop_name,
        `${pos.pos_brand} (${pos.os_version || 'Win7'})`,
        pos.pos_sn || "-",
        pos.ip_address !== "-" && pos.ip_address.startsWith("172.") ? pos.ip_address : null,
        pos.status,
        `Printer: ${pos.printer} | Barcode: ${pos.barcode_scanner} | RAM: ${pos.ram} | SSD: ${pos.ssd} | Drawer: ${pos.cash_drawer}`
      ]
    });
  }

  // DATA INVENTARIS POS KASIR SURABAYA (JUANDA T1 & T2)
  const initialSbyPosHardwareList = [
    // BBV LT 1 (Terminal 1)
    {
      pos_number: 1, counter_no: 1, pos_code: "SUBDPD01-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD01", ip_address: "172.23.22.11",
      pos_brand: "NCR (Lama)", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7",
      status: "OPERASIONAL", notes: "BBV LT 1 - NCR Lama Surabaya"
    },
    {
      pos_number: 2, counter_no: 2, pos_code: "SUBDPD01-P02", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD01", ip_address: "172.23.22.12",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "BBV LT 1 - New POS Surabaya"
    },

    // BOOTH (Terminal 1)
    {
      pos_number: 3, counter_no: 1, pos_code: "SUBDPD02-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD02", ip_address: "172.24.20.1",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "BOOTH Surabaya"
    },

    // BBV LT 2 (Terminal 1)
    {
      pos_number: 4, counter_no: 1, pos_code: "SUBDPD03-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD03", ip_address: "172.23.22.31",
      pos_brand: "NCR (Lama)", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7",
      status: "OPERASIONAL", notes: "BBV LT 2 - NCR Lama Surabaya"
    },
    {
      pos_number: 5, counter_no: 2, pos_code: "SUBDPD03-P02", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD03", ip_address: "172.23.22.32",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "BBV LT 2 - New POS Surabaya"
    },

    // AZZARIA HAJJ (Terminal 1)
    {
      pos_number: 6, counter_no: 1, pos_code: "SUBDPD04-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T1", counter_zone: "SUBDPD04", ip_address: "172.23.22.41",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "AZZARIA HAJJ - New POS Surabaya (sudah sesuai)"
    },

    // DF01 (Terminal 2 SBY)
    {
      pos_number: 7, counter_no: 1, pos_code: "SUBDF01-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF01", ip_address: "172.23.20.11",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DF01 P01 T2 Surabaya - New POS"
    },
    {
      pos_number: 8, counter_no: 2, pos_code: "SUBDF01-P02", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF01", ip_address: "172.23.20.12",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DF01 P02 T2 Surabaya - New POS"
    },

    // DF2 (Terminal 2 SBY)
    {
      pos_number: 9, counter_no: 1, pos_code: "SUBDF02-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF02", ip_address: "172.23.20.21",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DF2 P01 T2 Surabaya - New POS"
    },
    {
      pos_number: 10, counter_no: 2, pos_code: "SUBDF02-P02", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF02", ip_address: "172.23.20.22",
      pos_brand: "NCR", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 7",
      status: "OPERASIONAL", notes: "DF2 P02 T2 Surabaya"
    },

    // DF3 (Terminal 2 SBY)
    {
      pos_number: 11, counter_no: 1, pos_code: "SUBDF03-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF03", ip_address: "172.23.20.31",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DF3 P01 T2 Surabaya - New POS"
    },
    {
      pos_number: 12, counter_no: 2, pos_code: "SUBDF03-P02", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDF03", ip_address: "172.23.20.32",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DF3 P02 T2 Surabaya - New POS"
    },

    // DFA (Terminal 2 SBY Arrival)
    {
      pos_number: 13, counter_no: 1, pos_code: "SUBDFA01-P01", shop_name: "Plaza Bali",
      terminal: "Surabaya T2", counter_zone: "SUBDFA01", ip_address: "172.23.21.11",
      pos_brand: "NEW POS", pos_sn: "-", ram: "-", ssd: "-",
      passport_scanner: "-", barcode_scanner: "HONEYWELL", printer: "EPSON TM-U220",
      fingerprint_scanner: "-", keyboard: "LOGITECH", mouse: "LOGITECH",
      cash_drawer: "PANDA", monitor: "-", os_version: "WINDOWS 10",
      status: "OPERASIONAL", notes: "DFA Arrival T2 Surabaya - New POS"
    }
  ];

  for (const pos of initialSbyPosHardwareList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO pos_hardware_assets (
              pos_number, counter_no, pos_code, shop_name, terminal, counter_zone,
              ip_address, pos_brand, pos_sn, ram, ssd,
              passport_scanner, barcode_scanner, printer, fingerprint_scanner,
              keyboard, mouse, cash_drawer, monitor, os_version,
              status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_number, pos.counter_no, pos.pos_code, pos.shop_name, pos.terminal, pos.counter_zone,
        pos.ip_address, pos.pos_brand, pos.pos_sn, pos.ram, pos.ssd,
        pos.passport_scanner, pos.barcode_scanner, pos.printer, pos.fingerprint_scanner,
        pos.keyboard, pos.mouse, pos.cash_drawer, pos.monitor, pos.os_version,
        pos.status, pos.notes
      ],
    });

    if (pos.ip_address && pos.ip_address !== "-" && pos.ip_address.startsWith("172.")) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [pos.pos_code, pos.ip_address, `Kasir ${pos.pos_code} (${pos.pos_brand}) - ${pos.terminal} Surabaya`],
      });
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, 'POS Terminal', 'Surabaya', ?, ?, ?, ?, ?)`,
      args: [
        pos.pos_code,
        `Unit Kasir POS ${pos.pos_code}`,
        `${pos.pos_brand} (${pos.os_version})`,
        pos.pos_sn || "-",
        pos.ip_address !== "-" && pos.ip_address.startsWith("172.") ? pos.ip_address : null,
        pos.status,
        `Terminal: ${pos.terminal} | Counter: ${pos.counter_zone} | Printer: ${pos.printer} | Drawer: ${pos.cash_drawer}`
      ]
    });
  }
}

  // 6. TABEL KHUSUS PERANGKAT & KOMPUTER OFFICE (MIS, ACCOUNTING, FINANCE, GS, HRD, NETWORK, DLL.)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS office_hardware_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      item_no INTEGER,
      office_location TEXT DEFAULT 'Head Office',
      division TEXT NOT NULL,
      user_name TEXT NOT NULL,
      os TEXT,
      motherboard TEXT,
      processor TEXT,
      ram TEXT,
      monitor TEXT,
      hard_drive TEXT,
      used_disk1 TEXT,
      used_disk2 TEXT,
      keyboard TEXT,
      mouse TEXT,
      printer TEXT,
      ip_address TEXT,
      device_type TEXT DEFAULT 'PC',
      status TEXT DEFAULT 'OPERASIONAL',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE office_hardware_assets ADD COLUMN office_location TEXT DEFAULT 'Head Office'");
  } catch (e) {
    // Column already exists
  }

  const countOffice = await db.execute("SELECT count(*) as count FROM office_hardware_assets");
  if ((Number((countOffice.rows[0] as any)?.count) || 0) === 0) {
    const initialOfficeHardwareList = [
    // MIS
    {
      item_no: 1, asset_code: "PC-MIS-26-001-O", division: "MIS", user_name: "PA PEPEN",
      os: "WIN 7 ULT 64 BIT", motherboard: "GIGABYTE H110M-DS2-CF", processor: "Intel Core i5 7400 @ 3.00GHz",
      ram: "16.0GB Dual-Channel Unknown @ 1200MHz", monitor: "LG 20 INCH",
      hard_drive: "(HDD) HITACHI 100GB / (SSD) V GEN 111GB", used_disk1: "-", used_disk2: "-",
      keyboard: "PS/2", mouse: "LOGITECH USB", printer: "CANON PIXMA G2010", ip_address: "172.16.99.12",
      device_type: "PC", status: "OPERASIONAL", notes: "PC MIS Pa Pepen"
    },
    {
      item_no: 2, asset_code: "PC-MIS-26-002-O", division: "MIS", user_name: "HAMDI",
      os: "WIN 10 PRO 64 BIT", motherboard: "PRIME H610M-K D4 (LGA1700)", processor: "Intel Core i3-12100",
      ram: "16GB", monitor: "LG 24 INCH & 20 INCH",
      hard_drive: "(SSD) V GEN 512GB", used_disk1: "-", used_disk2: "-",
      keyboard: "REXUS", mouse: "REXUS", printer: "-", ip_address: "172.16.99.99",
      device_type: "PC", status: "OPERASIONAL", notes: "PC MIS Hamdi (Dual Monitor)"
    },
    {
      item_no: 3, asset_code: "PC-MIS-26-003-O", division: "MIS", user_name: "FARHAN",
      os: "WIN 11 64 BIT", motherboard: "ASUS PRIME H510M-E (LGA1200)", processor: "Intel Core i3 10300 @ 3.70GHz",
      ram: "24.0GB Dual-Channel Unknown @ 1064MHz", monitor: "LG 24 INCH & AOC 16 INCH",
      hard_drive: "(SSD) 1863GB Seagate ST2000DM008-2FR102", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "-", ip_address: "172.16.99.77",
      device_type: "PC", status: "OPERASIONAL", notes: "PC MIS Farhan (Dual Monitor)"
    },
    {
      item_no: 4, asset_code: "PC-MIS-26-004-O", division: "MIS", user_name: "PA ROBY",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "PC", status: "CADANGAN", notes: "PC MIS Pa Roby"
    },
    {
      item_no: 5, asset_code: "PC-MIS-26-005-O", division: "MIS", user_name: "BILLY",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS PRIME H510M-K (LGA1200)", processor: "Intel Core i5 10400 @ 2.90GHz",
      ram: "16.0GB Single-Channel Unknown @ 1330MHz", monitor: "LG 24 INCH",
      hard_drive: "(SSD) Lexar 512GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "-", ip_address: "172.16.99.11",
      device_type: "PC", status: "OPERASIONAL", notes: "PC MIS Billy"
    },

    // ACCOUNTING
    {
      item_no: 6, asset_code: "PC-ACC-26-001-O", division: "ACCOUNTING", user_name: "BU NYOMAN",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "LG 20 INCH",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "CANON PIXMA G2010", ip_address: "172.16.45.10",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Bu Nyoman"
    },
    {
      item_no: 7, asset_code: "PC-ACC-26-002-O", division: "ACCOUNTING", user_name: "MEGA",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS H61M-K", processor: "Intel Core i3 3240 @ 3.40GHz",
      ram: "8.00GB Single-Channel DDR3 @ 798MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "49.2 GB", used_disk2: "31.0 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.16.70.3",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Mega"
    },
    {
      item_no: 8, asset_code: "PC-ACC-26-003-O", division: "ACCOUNTING", user_name: "REZA-PC",
      os: "WIN 10 EDU 64 BIT", motherboard: "-", processor: "Intel Core i3 Gen 3",
      ram: "8 GB Dual DDR3", monitor: "AOC 16 INCH",
      hard_drive: "SSD ADATA 480GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "-", ip_address: "172.16.70.8",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Reza"
    },
    {
      item_no: 9, asset_code: "PC-ACC-26-004-O", division: "ACCOUNTING", user_name: "INDAH",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H81M-E (SOCKET 1150)", processor: "Intel Pentium G3250 @ 3.20GHz",
      ram: "8.00GB Single-Channel DDR3", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 238GB Lexar SSD NS100", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "-", ip_address: "172.16.45.7",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Indah"
    },
    {
      item_no: 10, asset_code: "PC-ACC-26-005-O", division: "ACCOUNTING", user_name: "BU MARI",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS PRIME H510M-K (LGA1200)", processor: "Intel Pentium Gold @ 4.00GHz",
      ram: "8.00GB Single-Channel Unknown @ 1063MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) Lexar NS100 512GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "HP LaserJet Professional P1102", ip_address: "172.16.45.6",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Bu Mari"
    },
    {
      item_no: 11, asset_code: "PC-ACC-26-006-O", division: "ACCOUNTING", user_name: "BU NURUL",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "Intel Core i3 7100 @ 3.90GHz",
      ram: "8.00GB Dual-Channel Unknown @ 1199MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "51.4 GB", used_disk2: "9.98 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "HP Laser MFP 137fnw (172.16.45.10)", ip_address: "172.16.45.13",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Bu Nurul"
    },
    {
      item_no: 12, asset_code: "PC-ACC-26-007-O", division: "ACCOUNTING", user_name: "SINDY",
      os: "WIN 11 PRO 64 BIT", motherboard: "GIGABYTE H610M-K", processor: "12th Gen Intel Core i3-12100 3.30 GHz",
      ram: "8.00GB Single-Channel Unknown @ 1063MHz", monitor: "LG 20 INCH",
      hard_drive: "SSD ADATA 512GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.16.45.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Sindy"
    },
    {
      item_no: 13, asset_code: "PC-ACC-26-008-O", division: "ACCOUNTING", user_name: "ARYANTI",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS PRIME H510M-K (LGA1200)", processor: "Intel Pentium Gold @ 4.00GHz",
      ram: "8 GB", monitor: "LG 20 INCH",
      hard_drive: "LEXAR 480GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.16.45.14",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Aryanti"
    },
    {
      item_no: 14, asset_code: "PC-ACC-26-009-O", division: "ACCOUNTING", user_name: "SATRIYO",
      os: "WIN 10 PRO 64 BIT", motherboard: "GIGABYTE H510MK V2", processor: "Intel Core i3 10300 @ 3.70GHz",
      ram: "8 GB Single Channel", monitor: "SAMSUNG 20 INCH",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.16.45.9",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Accounting Satriyo"
    },

    // FINANCE
    {
      item_no: 15, asset_code: "PC-FIN-26-001-O", division: "FINANCE", user_name: "YANA",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "8.00GB Single-Channel DDR3 @ 798MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "36.0 GB", used_disk2: "2.02 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.16.45.4",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Yana"
    },
    {
      item_no: 16, asset_code: "PC-FIN-26-002-O", division: "FINANCE", user_name: "ABEL",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H81M-E (SOCKET 1150)", processor: "Intel Pentium G3260 @ 3.30GHz",
      ram: "4.00GB Single-Channel DDR3 @ 698MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "41.1 GB", used_disk2: "13.5 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.16.45.3",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Abel"
    },
    {
      item_no: 17, asset_code: "PC-FIN-26-003-O", division: "FINANCE", user_name: "BU RINA",
      os: "WIN 7 PROF 64 BIT", motherboard: "ASUS H61M-C (LGA1155)", processor: "Intel Pentium G2030 @ 3.00GHz",
      ram: "8.00GB Dual-Channel Unknown", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 120GB SATA Flash Drive", used_disk1: "38.7 GB", used_disk2: "1.63 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "EPSON L3210 Series", ip_address: "172.16.45.40",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Bu Rina"
    },
    {
      item_no: 18, asset_code: "PC-FIN-26-004-O", division: "FINANCE", user_name: "SAYUTI",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "Intel Core i3 7100 @ 3.90GHz",
      ram: "4.00GB DDR4 Single-Channel Unknown @ 1197MHz", monitor: "LG 20 INCH",
      hard_drive: "(HDD) 111GB V-GEN11SM18EG120GB", used_disk1: "33.3 GB", used_disk2: "41.2 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "EPSON L360", ip_address: "172.16.45.8",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Sayuti"
    },
    {
      item_no: 19, asset_code: "PC-FIN-26-005-O", division: "FINANCE", user_name: "BU NUNUNG",
      os: "WIN 7 PROF 64 BIT", motherboard: "ECS H61H2-M12 (SOCKET 0)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "8.00GB Single-Channel DDR3 @ 665MHz", monitor: "LG 27 INCH",
      hard_drive: "(SSD) V-GEN11SM18EG120GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "EPSON L360", ip_address: "172.16.40.5",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Bu Nunung"
    },
    {
      item_no: 20, asset_code: "PC-FIN-26-006-O", division: "FINANCE", user_name: "RENALDY",
      os: "WIN 7 ULT 64 BIT", motherboard: "G41 Series (CPU 1)", processor: "Intel Core 2 Duo E4300 @ 1.80GHz",
      ram: "4.00GB Dual-Channel DDR3 @ 398MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "34.7 GB", used_disk2: "6.22 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "Scanner CanoScan LiDE 210", ip_address: "172.16.45.15",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Renaldy (IP 172.16.45.x)"
    },
    {
      item_no: 21, asset_code: "PC-FIN-26-007-O", division: "FINANCE", user_name: "PA SUGIARTO",
      os: "WIN 10", motherboard: "-", processor: "-",
      ram: "-", monitor: "SAMSUNG 24 INCH",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "EPSON 3210", ip_address: "172.16.99.98",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Finance Pa Sugiarto"
    },

    // MERCHANDISE
    {
      item_no: 22, asset_code: "PC-MCH-26-001-O", division: "MERCHANDISE", user_name: "BU IVED",
      os: "WIN 7 ULT 32 BIT", motherboard: "ASUS H61M-C (LGA1155)", processor: "Intel Core i3 3250 @ 3.50GHz",
      ram: "4.00GB Single-Channel DDR3 @ 798MHz", monitor: "LG 27 INCH",
      hard_drive: "(HDD) 465GB Western Digital WDC WD5000AVCS-632DY", used_disk1: "69.1 GB", used_disk2: "152 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH USB", printer: "EPSON L5290", ip_address: "172.16.70.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Merchandising Bu Ived"
    },
    {
      item_no: 23, asset_code: "PC-MCH-26-002-O", division: "MERCHANDISE", user_name: "FAZRIYAH",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "6.00GB Dual-Channel DDR3 @ 665MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "50.9 GB", used_disk2: "9.37 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "HP Laserjet", ip_address: "172.16.70.9",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Merchandising Fazriyah"
    },
    {
      item_no: 24, asset_code: "PC-MCH-26-003-O", division: "MERCHANDISE", user_name: "PA MIKE",
      os: "WIN 7 ULT 32 BIT", motherboard: "ECS H61H2-M12", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "4 GB DDR3", monitor: "LG 24 INCH",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "HP Laserjet", ip_address: "172.16.70.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Merchandising Pa Mike"
    },
    {
      item_no: 25, asset_code: "PC-MCH-26-004-O", division: "MERCHANDISE", user_name: "BU JULY",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "LG 32 INCH CURVED",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "LOGITECH USB", printer: "Canon MG", ip_address: "-",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Merchandising Bu July (32 Inch Curved Monitor)"
    },
    {
      item_no: 26, asset_code: "PC-MCH-26-005-O", division: "MERCHANDISE", user_name: "BU TIFF",
      os: "WIN 7 PRO 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "Intel Core i3 6100 @ 3.70GHz",
      ram: "8.00GB Single-Channel Unknown @ 1063MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) Western Digital WDC WDS120G2G0A-00JH", used_disk1: "50.1 GB", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "EPSON L5290", ip_address: "172.16.70.4",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Merchandising Bu Tiff"
    },

    // GS
    {
      item_no: 27, asset_code: "PC-GS-26-001-O", division: "GS", user_name: "PA BAGUS",
      os: "WIN 7 PROF 32 BIT", motherboard: "ASUS H61M-C (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "4.00GB Single-Channel DDR3 @ 665MHz", monitor: "SAMSUNG 16 INCH",
      hard_drive: "(HDD) 74GB Seagate ST380817AS", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.16.60.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC GS Pa Bagus"
    },
    {
      item_no: 28, asset_code: "PC-GS-26-002-O", division: "GS", user_name: "DENTI",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "6.00GB Dual-Channel DDR3 @ 665MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) Lexar SSD NS100 512GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.16.60.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC GS Denti"
    },
    {
      item_no: 29, asset_code: "PC-GS-26-003-O", division: "GS", user_name: "RIANI",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "8.00GB Dual-Channel DDR3", monitor: "AOC 16 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "40.8 GB", used_disk2: "18.7 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "CANON PIXMA G2020", ip_address: "172.16.60.5",
      device_type: "PC", status: "OPERASIONAL", notes: "PC GS Riani"
    },
    {
      item_no: 30, asset_code: "PC-GS-26-004-O", division: "GS", user_name: "BU ENNY",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "-",
      ram: "-", monitor: "LG 24 INCH",
      hard_drive: "(SSD) 447GB ADATA SU650", used_disk1: "42.2 GB", used_disk2: "28.2 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.16.60.0",
      device_type: "PC", status: "OPERASIONAL", notes: "PC GS Bu Enny"
    },

    // HRD
    {
      item_no: 31, asset_code: "PC-HRD-26-001-O", division: "HRD", user_name: "BU FITRI",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "Intel Core i3 7100 @ 3.90GHz",
      ram: "8.00GB Dual-Channel Unknown @ 1063MHz", monitor: "LG 27 INCH",
      hard_drive: "(HDD) 465GB Seagate ST350031", used_disk1: "50.1 GB", used_disk2: "63.5 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.16.50.11",
      device_type: "PC", status: "OPERASIONAL", notes: "PC HRD Bu Fitri"
    },
    {
      item_no: 32, asset_code: "PC-HRD-26-002-O", division: "HRD", user_name: "FIKRI",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2120 @ 3.30GHz",
      ram: "8.00GB Dual-Channel DDR3 @ 665MHz", monitor: "LG 20 INCH",
      hard_drive: "(SSD) Lexar SSD NS100 256GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "EPSON L3210", ip_address: "172.16.50.3",
      device_type: "PC", status: "OPERASIONAL", notes: "PC HRD Fikri"
    },
    {
      item_no: 33, asset_code: "PC-HRD-26-003-O", division: "HRD", user_name: "PC EX BENNY",
      os: "WIN 10 ENT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "4.00GB Single-Channel DDR3 @ 665MHz", monitor: "AOC 16 INCH",
      hard_drive: "(HDD) 465GB Hitachi HGST", used_disk1: "34 GB", used_disk2: "947 MB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "-", ip_address: "172.16.50.2",
      device_type: "PC", status: "CADANGAN", notes: "PC HRD Ex Benny (Cadangan)"
    },
    {
      item_no: 34, asset_code: "PC-HRD-26-004-O", division: "HRD", user_name: "PA ARYO",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "Intel(R) Core(TM) i3-7100 CPU",
      ram: "8.00GB Single-Channel Unknown", monitor: "LG 20 INCH",
      hard_drive: "476GB (SSD)", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "-", ip_address: "172.16.50.5",
      device_type: "PC", status: "OPERASIONAL", notes: "PC HRD Pa Aryo"
    },
    {
      item_no: 35, asset_code: "PC-HRD-26-005-O", division: "HRD", user_name: "BU LOLA",
      os: "WIN 7 ULT 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "LG 20 INCH",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH USB", mouse: "LOGITECH USB", printer: "EPSON L355", ip_address: "172.16.50.9",
      device_type: "PC", status: "OPERASIONAL", notes: "PC HRD Bu Lola"
    },

    // SECRETARY
    {
      item_no: 36, asset_code: "PC-SEC-26-001-O", division: "SECRETARY", user_name: "BU SYLVIE",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "4.00GB Single-Channel DDR3 @ 665MHz", monitor: "LG 20 INCH",
      hard_drive: "(HDD) 465GB Seagate ST500DM002", used_disk1: "63.7 GB", used_disk2: "12 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "EPSON L5290", ip_address: "172.16.90.6",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Secretary Bu Sylvie"
    },
    {
      item_no: 37, asset_code: "PC-SEC-26-002-O", division: "SECRETARY", user_name: "PA ANDY",
      os: "WIN 10 PRO 64 BIT", motherboard: "ECS H61H2-M12", processor: "INTEL PENTIUM G630 @ 2.70GHz",
      ram: "8 GB Dual-Channel Unknown DDR3", monitor: "24 INCH",
      hard_drive: "SSD ADATA 256 GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "HP Color LaserJet Pro MFP M177fw[370D1D]", ip_address: "172.16.90.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Secretary Pa Andy"
    },

    // FASILITAS & RUANGAN
    {
      item_no: 38, asset_code: "FCL-FCL-26-001-O", division: "FASILITAS", user_name: "PANTRY",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Area Fasilitas Pantry Office"
    },
    {
      item_no: 39, asset_code: "FCL-FCL-26-002-O", division: "FASILITAS", user_name: "ANAK PA HL",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Ruangan Anak Pa HL"
    },
    {
      item_no: 40, asset_code: "FCL-FCL-26-003-O", division: "FASILITAS", user_name: "TRAINING",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Ruang Training Office"
    },
    {
      item_no: 41, asset_code: "FCL-FCL-26-004-O", division: "FASILITAS", user_name: "MEETING KECIL",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Ruang Meeting Kecil Office"
    },
    {
      item_no: 42, asset_code: "FCL-FCL-26-005-O", division: "FASILITAS", user_name: "MEETING GEDE",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "172.16.90.9",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Ruang Meeting Gede (IP: 172.16.90.9)"
    },
    {
      item_no: 43, asset_code: "FCL-FCL-26-006-O", division: "FASILITAS", user_name: "GUDANG SAM",
      os: "-", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "172.16.16.16",
      device_type: "FACILITY", status: "OPERASIONAL", notes: "Area Gudang SAM (IP: 172.16.16.16)"
    },

    // ROUTER & JARINGAN
    {
      item_no: 44, asset_code: "NET-NET-26-001-O", division: "NETWORK", user_name: "ROUTER PLAZABALI_03",
      os: "RouterOS", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "172.16.1.11",
      device_type: "ROUTER", status: "OPERASIONAL", notes: "Router Plaza Bali 03 - Pass: PB20061991 | IP Sekunder: 172.16.1.102"
    },
    {
      item_no: 45, asset_code: "NET-NET-26-002-O", division: "NETWORK", user_name: "ROUTER PLAZABALI",
      os: "RouterOS", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "172.16.1.12",
      device_type: "ROUTER", status: "OPERASIONAL", notes: "Router Plaza Bali Office - Pass: PB20061991 | Subnet LAN: 192.168.x.x"
    },
    {
      item_no: 46, asset_code: "PBX-NET-26-003-O", division: "NETWORK", user_name: "PABX TELEPON BALI",
      os: "PABX System", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "PABX", status: "OPERASIONAL", notes: "PABX Bali: 10 Pesawat, 50 CH, 1 Operator"
    },
    {
      item_no: 47, asset_code: "PBX-NET-26-004-O", division: "NETWORK", user_name: "PABX TELEPON SURABAYA",
      os: "PABX System", motherboard: "-", processor: "-", ram: "-", monitor: "-", hard_drive: "-",
      used_disk1: "-", used_disk2: "-", keyboard: "-", mouse: "-", printer: "-", ip_address: "-",
      device_type: "PABX", status: "OPERASIONAL", notes: "PABX Surabaya (SBY): 9 Pesawat"
    },

    // WAREHOUSE / GUDANG (WHS)
    {
      item_no: 48, asset_code: "PRN-WHS-26-001-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "PRINTER SHARING WHS",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "FUJI XEROX DocuCentre-V 2060 PCL 6", ip_address: "172.17.99.222",
      device_type: "PRINTER", status: "OPERASIONAL", notes: "Printer Sharing Multifungsi Warehouse / Gudang"
    },
    {
      item_no: 49, asset_code: "PC-WHS-26-002-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "PA SANTO",
      os: "WIN 7 PROF 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2120 @ 3.30GHz",
      ram: "12.00GB Dual-Channel DDR3 @ 665MHz", monitor: "-",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "76.9 GB", used_disk2: "126 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "EPSON L220/L360 Series", ip_address: "172.17.20.3",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Pa Santo Warehouse WHS"
    },
    {
      item_no: 50, asset_code: "PC-WHS-26-003-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "DIMAS",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2100 @ 3.10GHz",
      ram: "8.00GB Dual-Channel DDR3", monitor: "-",
      hard_drive: "(SSD) Lexar SSD NS100 256GB", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "EPSON LX-310 ESC/P", ip_address: "172.17.45.16",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Dimas Warehouse WHS"
    },
    {
      item_no: 51, asset_code: "PC-WHS-26-004-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "PA TOHIR",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS PRIME H510M-K (LGA1200)", processor: "Intel Pentium Gold @ 4.00GHz",
      ram: "8.00GB Single-Channel Unknown @ 1197MHz", monitor: "-",
      hard_drive: "(SSD) 120GB SATA Flash Drive", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "EPSON LX310", ip_address: "172.17.45.15",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Pa Tohir Warehouse WHS (Windows 10)"
    },
    {
      item_no: 52, asset_code: "CCTV-WHS-26-005-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "IPCAM PARKIRAN",
      os: "-", motherboard: "EZVIZ", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "(HDD) 465GB Seagate ST3500312CS", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.17.1.82",
      device_type: "CCTV", status: "OPERASIONAL", notes: "IP Camera Area Parkiran Warehouse (HDD 465GB)"
    },
    {
      item_no: 53, asset_code: "PC-WHS-26-006-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "NURUL",
      os: "WIN 7 ULT 64 BIT", motherboard: "GIGABYTE H110M-DS2-CF", processor: "Intel Pentium G4600 @ 3.60GHz",
      ram: "8.00GB Single-Channel Unknown DDR4 @ 1200MHz", monitor: "-",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "37.1 GB", used_disk2: "14.3 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH PS/2", printer: "EPSON LX-310 ESC/P", ip_address: "172.17.20.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Nurul Warehouse WHS"
    },
    {
      item_no: 54, asset_code: "PC-WHS-26-007-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "ARIS",
      os: "WIN 10 ENT 64 BIT", motherboard: "ASUS PRIME H510M-K (LGA1200)", processor: "Intel Pentium Gold @ 4.00GHz",
      ram: "8.00GB Single-Channel Unknown @ 1197MHz", monitor: "-",
      hard_drive: "(SSD) Lexar 256GB", used_disk1: "44 GB", used_disk2: "23.5 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "EPSON LX-310 ESC/P", ip_address: "172.18.20.4",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Aris Warehouse WHS (Windows 10 Enterprise)"
    },
    {
      item_no: 55, asset_code: "PC-WHS-26-008-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "PA NYOMAN",
      os: "WIN 7 PROF 64 BIT", motherboard: "ASUS H81M-V PLUS", processor: "Intel Core i5 4590 @ 3.30GHz",
      ram: "8.00GB Single-Channel DDR3 @ 665MHz", monitor: "-",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "65.7 GB", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "-", ip_address: "172.17.20.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Pa Nyoman Warehouse WHS"
    },
    {
      item_no: 56, asset_code: "PC-WHS-26-009-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "KOMP GUDANG BELAKANG",
      os: "WIN 7 ULT 32 BIT", motherboard: "-", processor: "Intel Core 2 Duo E8500 @ 3.16GHz",
      ram: "4.00GB Dual-Channel DDR3 @ 398MHz", monitor: "-",
      hard_drive: "(HDD) 111GB Seagate ST3120022A", used_disk1: "47.6 GB", used_disk2: "11.0 GB",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "-", ip_address: "172.17.99.20",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Gudang Belakang Warehouse (HDD 111GB)"
    },
    {
      item_no: 57, asset_code: "PC-WHS-26-010-O", office_location: "Warehouse (WHS)", division: "WHS", user_name: "KOMP BEACUKAI",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.17.1.111",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Custom Clearance Beacukai Warehouse"
    },

    // KOMPUTER DI OFFICE T2 (TERMINAL 2 BANDARA)
    {
      item_no: 58, asset_code: "PC-T2-26-001-O", office_location: "Office Terminal 2", division: "SPV T2", user_name: "SPV J5",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS PRIME H610M-K D4", processor: "Intel(R) Core(TM) i3-12100 3.30 GHz",
      ram: "8.00GB", monitor: "-",
      hard_drive: "(M2) 238GB ADATA", used_disk1: "-", used_disk2: "-",
      keyboard: "LOGITECH PS/2", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.18.25.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV J5 Office Terminal 2"
    },
    {
      item_no: 59, asset_code: "PC-T2-26-002-O", office_location: "Office Terminal 2", division: "STOCK CONTROL T2", user_name: "DANU",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H61M-A (LGA1155)", processor: "Intel Core i3 3250 @ 3.50GHz",
      ram: "8,00GB Dual-Channel DDR3 @ 665MHz", monitor: "-",
      hard_drive: "(SSD) ADATA SU650 480GB", used_disk1: "106 GB", used_disk2: "201 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.18.20.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Stock Control T2 Danu"
    },
    {
      item_no: 60, asset_code: "PC-T2-26-003-O", office_location: "Office Terminal 2", division: "STOCK CONTROL SAM T2", user_name: "HILMI",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "Intel Core i3 2120 @ 3.30GHz",
      ram: "4.00GB Single-Channel DDR3 @ 665MHz", monitor: "-",
      hard_drive: "(HDD) 465GB Seagate ST3500414CS", used_disk1: "50.2 GB", used_disk2: "9.49 GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.18.99.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Stock Control SAM T2 Hilmi"
    },
    {
      item_no: 61, asset_code: "PC-T2-26-004-O", office_location: "Office Terminal 2", division: "SECURITY", user_name: "SECURITY T2-J5",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "INTEL CORE I3 7100 3.90GHz",
      ram: "4GB DDR4-2400 (1200MHz) 1 OF 2", monitor: "-",
      hard_drive: "SSD SATA = 256GB LEXAR", used_disk1: "193GB FREE OF 256GB", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.18.18.100",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Security T2 J5"
    },
    {
      item_no: 62, asset_code: "PC-T2-26-005-O", office_location: "Office Terminal 2", division: "SPV T2", user_name: "BU ANI",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.18.20.5",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Bu Ani SPV Office Terminal 2"
    },

    // KOMPUTER DI OFFICE T3 (TERMINAL 3 BANDARA)
    {
      item_no: 63, asset_code: "PC-T3-26-001-O", office_location: "Office Terminal 3", division: "SECURITY", user_name: "SECURITY T3-COLO",
      os: "WIN 7 PRO 64 BIT", motherboard: "INTEL DH61WW", processor: "INTEL CORE I3 3240 3.40GHz",
      ram: "4GB DDR3-12800 (800MHz)", monitor: "-",
      hard_drive: "SSD SATA = 256GB LEXAR", used_disk1: "68GB FREE OF 101GB", used_disk2: "133GB FREE OF 136GB",
      keyboard: "BANDA", mouse: "LOGITECH", printer: "-", ip_address: "172.19.19.100",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Security T3 Colonial"
    },
    {
      item_no: 64, asset_code: "PC-T3-26-002-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "BU LUHDE",
      os: "WIN 7 PRO 64 BIT", motherboard: "ASUS H510M-K (LGA1200)", processor: "INTEL PENTIUM GOLD COMET LAKE 4GHz",
      ram: "8GB DDR4 (1196MHz)", monitor: "-",
      hard_drive: "SSD SATA = 512GB LEXAR", used_disk1: "63GB FREE OF 106GB", used_disk2: "298GB FREE OF 369GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "HP LASERJET", ip_address: "172.19.25.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV T3 Bu Luhde"
    },
    {
      item_no: 65, asset_code: "PC-T3-26-003-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "SPV DF1",
      os: "WIN 7 PRO 64 BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "INTEL CORE I3 3220 3.30 GHz",
      ram: "6GB DDR3-1200 (800MHz)", monitor: "-",
      hard_drive: "HDD SATA = 500GB SEAGATE", used_disk1: "143 FREE OF 194GB", used_disk2: "86GB FREE OF 270GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.19.25.4",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV Duty Free 1 (DF1) T3"
    },
    {
      item_no: 66, asset_code: "PC-T3-26-004-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "SPV JADA 2",
      os: "WIN 10 ENTERPRISE 64BIT", motherboard: "ASUS H61M-K (LGA1155)", processor: "INTEL I3 2120 3.30GHz",
      ram: "4GB DDR3-12800 (800MHz)", monitor: "-",
      hard_drive: "SSD SATA = 120GB VGEN", used_disk1: "10GB FREE OF 64GB", used_disk2: "30GB FREE OF 47GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.19.50.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV Jada 2 T3"
    },
    {
      item_no: 67, asset_code: "PC-T3-26-005-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "KOMP CCTV SPV T3",
      os: "WIN 10 PRO 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "INTEL CORE I3 7100 3.90GHz",
      ram: "8GB DDR4-2400 (1200MHz)", monitor: "-",
      hard_drive: "SSD SATA = 120GB", used_disk1: "62GB FREE OF 111GB", used_disk2: "-",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.19.25.30",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Monitoring CCTV SPV Terminal 3"
    },
    {
      item_no: 68, asset_code: "PC-T3-26-006-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "SPV COLO",
      os: "WIN 7 ULT 64 BIT", motherboard: "ASUS H110M-K (LGA1151)", processor: "INTEL I3 7100 3.90 GHz",
      ram: "4GB DDR4-2400 (1200MHz)", monitor: "-",
      hard_drive: "HDD SATA = 500GB SEAGATE", used_disk1: "256GB FREE 0F 297GB", used_disk2: "164GB FREE OF 166GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "HP LASERJET PRO M12W", ip_address: "172.19.25.6",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV Colonial T3"
    },
    {
      item_no: 69, asset_code: "PC-T3-26-007-O", office_location: "Office Terminal 3", division: "SPV T3", user_name: "BU LOLA T3",
      os: "WIN 7 ULT 32 BIT", motherboard: "ASUS H61M-A (LGA1155)", processor: "INTEL I3-3240 3.40GHz",
      ram: "4G DDR3-12800", monitor: "-",
      hard_drive: "HDD SATA = 500GB", used_disk1: "109GB FREE OF 146GB", used_disk2: "52GB FREE OF 319GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "CANON PIXMA G2010", ip_address: "172.19.25.0",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Bu Lola Terminal 3"
    },
    {
      item_no: 70, asset_code: "PC-T3-26-008-O", office_location: "Office Terminal 3", division: "STOCK CONTROL T3", user_name: "RIZKY",
      os: "WIN 7 ULT 64 BIT", motherboard: "H612H2-M12 (LGA 1155)", processor: "INTEL PENTIUM G630 2.70GHz",
      ram: "4GB DDR3-10700 (667MHz)", monitor: "-",
      hard_drive: "HDD SATA = 500GB WESTERN DIGITAL", used_disk1: "49GB FREE OF 117GB", used_disk2: "335GB FREE OF 348GB",
      keyboard: "LOGITECH", mouse: "LOGITECH", printer: "-", ip_address: "172.19.25.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Stock Control T3 Rizky"
    },
    {
      item_no: 71, asset_code: "PC-T3-26-009-O", office_location: "Office Terminal 3", division: "ME", user_name: "ME T3",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.19.19.101",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Mechanical Electrical (ME) T3"
    },
    {
      item_no: 72, asset_code: "PC-T3-26-010-O", office_location: "Office Terminal 3", division: "MIS", user_name: "MIS T3",
      os: "WIN 10 PRO 64 BIT", motherboard: "INTEL NUC 10i3FNB (mini pc)", processor: "INTEL CORE I3-10110U 2.10GHz",
      ram: "4GB DDR4-2666 (1333MHz)", monitor: "-",
      hard_drive: "SSD SATA = 250GB", used_disk1: "64GB FREE OF 125GB", used_disk2: "29GB FREE OF 97GB",
      keyboard: "LOGITECH", mouse: "BIASA", printer: "-", ip_address: "172.19.1.44",
      device_type: "PC", status: "OPERASIONAL", notes: "Mini PC Intel NUC Posko MIS IT Support T3"
    },

    // PERANGKAT OFFICE & OPERASIONAL SURABAYA
    {
      item_no: 73, asset_code: "PC-SBY-26-001-O", office_location: "Office Surabaya", division: "SPV SBY", user_name: "PC BU ANI",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.23.25.1",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV Bu Ani Surabaya"
    },
    {
      item_no: 74, asset_code: "PC-SBY-26-002-O", office_location: "Office Surabaya", division: "SPV SBY", user_name: "PC SPV",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.23.25.2",
      device_type: "PC", status: "OPERASIONAL", notes: "PC SPV Office Surabaya"
    },
    {
      item_no: 75, asset_code: "PC-SBY-26-003-O", office_location: "Office Surabaya", division: "SPV SBY", user_name: "PC MONITOR CCTV",
      os: "WIN 10 PRO 64 BIT", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "-", ip_address: "172.23.25.3",
      device_type: "PC", status: "OPERASIONAL", notes: "PC Client Monitoring CCTV Surabaya"
    },
    {
      item_no: 76, asset_code: "PRN-SBY-26-004-O", office_location: "Office Surabaya", division: "OPERASIONAL SBY", user_name: "PRICETAG HANGING",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "PRINTER PRICETAG HANGING", ip_address: "172.23.50.83",
      device_type: "PRINTER", status: "OPERASIONAL", notes: "Perangkat / Printer Pricetag Hanging Surabaya"
    },
    {
      item_no: 77, asset_code: "PRN-SBY-26-005-O", office_location: "Office Surabaya", division: "OPERASIONAL SBY", user_name: "PRICETAG LABEL",
      os: "-", motherboard: "-", processor: "-",
      ram: "-", monitor: "-",
      hard_drive: "-", used_disk1: "-", used_disk2: "-",
      keyboard: "-", mouse: "-", printer: "PRINTER PRICETAG LABEL", ip_address: "172.23.50.84",
      device_type: "PRINTER", status: "OPERASIONAL", notes: "Perangkat / Printer Pricetag Label Surabaya"
    }
  ];

  for (const off of initialOfficeHardwareList) {
    const loc = (off as any).office_location || 'Head Office';
    await db.execute({
      sql: `INSERT OR REPLACE INTO office_hardware_assets (
              asset_code, item_no, office_location, division, user_name,
              os, motherboard, processor, ram, monitor, hard_drive,
              used_disk1, used_disk2, keyboard, mouse, printer,
              ip_address, device_type, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        off.asset_code, off.item_no, loc, off.division, off.user_name,
        off.os, off.motherboard, off.processor, off.ram, off.monitor, off.hard_drive,
        off.used_disk1, off.used_disk2, off.keyboard, off.mouse, off.printer,
        off.ip_address, off.device_type, off.status, off.notes
      ],
    });

    // Sinkronisasi IP ke monitoring_devices jika IP valid
    if (off.ip_address && off.ip_address !== "-" && (off.ip_address.startsWith("172.") || off.ip_address.startsWith("192."))) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [
          off.asset_code,
          off.ip_address,
          `${loc} [${off.division}] - ${off.user_name} (${off.device_type})`
        ],
      });
    }

    // Sinkronisasi ke master assets untuk ticketing & barcode sticker
    const cat = off.device_type === 'ROUTER' ? 'Network / Router' : (off.device_type === 'PABX' ? 'Lainnya' : 'Display / Monitor');
    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        off.asset_code,
        `Perangkat Office ${off.user_name}`,
        cat,
        loc,
        off.motherboard !== '-' ? `${off.motherboard} / ${off.processor}` : off.device_type,
        "-",
        off.ip_address !== "-" && off.ip_address.startsWith("172.") ? off.ip_address : null,
        off.status,
        `Divisi: ${off.division} | Lokasi: ${loc} | OS: ${off.os} | RAM: ${off.ram} | Storage: ${off.hard_drive} | Printer: ${off.printer}`
      ]
    });
  }
}

  // 7. Seed Initial Purchases / Procurement IT & Toko
  const countPurchases = await db.execute("SELECT count(*) as count FROM purchases");
  if ((Number((countPurchases.rows[0] as any)?.count) || 0) === 0) {
    const initialPurchaseList = [
    {
      po_number: "PO-2026-001",
      item_name: "SSD Lexar NS100 512GB SATA III",
      category: "Hardware POS",
      target_location: "Office Terminal 2",
      quantity: 2,
      unit: "Unit",
      estimated_price: 450000,
      total_price: 900000,
      vendor: "Vendor IT Mall Mangga Dua",
      request_date: "2026-10-25",
      purchase_date: "2026-10-28",
      requester: "MIS IT Support",
      status: "PROSES_BELI",
      priority: "URGENT",
      notes: "Upgrade HDD lelet untuk PC Danu & Hilmi T2 Bandara"
    },
    {
      po_number: "PO-2026-002",
      item_name: "Printer Kasir Kassen BT-P3100BT USB/Bluetooth",
      category: "Hardware POS",
      target_location: "Cabang Surabaya",
      quantity: 2,
      unit: "Unit",
      estimated_price: 1650000,
      total_price: 3300000,
      vendor: "Distributor Kassen Resmi",
      request_date: "2026-10-26",
      purchase_date: "2026-10-29",
      requester: "SPV Surabaya",
      status: "DISETUJUI",
      priority: "URGENT",
      notes: "Cadangan unit printer kasir POS SUBDF02 & SUBDPD03 Juanda"
    },
    {
      po_number: "PO-2026-003",
      item_name: "Kertas Thermal Roll 80x80mm Coreless (Dus isi 50 Roll)",
      category: "Consumable & Ribbon",
      target_location: "Plaza Bali (CGK)",
      quantity: 5,
      unit: "Dus",
      estimated_price: 425000,
      total_price: 2125000,
      vendor: "Paper Star Stationery",
      request_date: "2026-10-15",
      purchase_date: "2026-10-18",
      received_date: "2026-10-20",
      requester: "SPV Plaza Bali",
      status: "DITERIMA",
      priority: "BIASA",
      notes: "Stok operasional 1 bulan kasir Terminal 2 & Terminal 3"
    },
    {
      po_number: "PO-2026-004",
      item_name: "Pita Ribbon Epson ERC-38 Black/Red Original",
      category: "Consumable & Ribbon",
      target_location: "Plaza Bali (CGK)",
      quantity: 30,
      unit: "Pcs",
      estimated_price: 28000,
      total_price: 840000,
      vendor: "Mitra Stationary",
      request_date: "2026-10-18",
      purchase_date: "2026-10-20",
      received_date: "2026-10-22",
      requester: "SPV Plaza Bali",
      status: "DITERIMA",
      priority: "BIASA",
      notes: "Untuk printer dot matrix kasir TM-U220D Plaza Bali"
    },
    {
      po_number: "PO-2026-005",
      item_name: "Barcode Scanner Honeywell Voyager 1250g Laser 1D",
      category: "Periferal & Sparepart",
      target_location: "Toko SAM (CGK)",
      quantity: 2,
      unit: "Unit",
      estimated_price: 850000,
      total_price: 1700000,
      vendor: "Honeywell Official Store",
      request_date: "2026-10-27",
      purchase_date: "2026-10-29",
      requester: "SPV SAM",
      status: "PROSES_BELI",
      priority: "BIASA",
      notes: "Penggantian scanner kasir SAM GGO01"
    },
    {
      po_number: "PO-2026-006",
      item_name: "Harddisk Surveillance Seagate SkyHawk 4TB SATA",
      category: "CCTV & DVR",
      target_location: "Head Office",
      quantity: 2,
      unit: "Unit",
      estimated_price: 1450000,
      total_price: 2900000,
      vendor: "CCTV Solusindo Mandiri",
      request_date: "2026-10-29",
      requester: "MIS IT Support",
      status: "PENGAJUAN",
      priority: "URGENT",
      notes: "Upgrade kapasitas rekam DVR Colonial & DFA Surabaya"
    },
    {
      po_number: "PO-2026-007",
      item_name: "Cash Drawer Laci Kasir Panda POS-410 RJ11 Metal",
      category: "Hardware POS",
      target_location: "Cabang Surabaya",
      quantity: 1,
      unit: "Unit",
      estimated_price: 480000,
      total_price: 480000,
      vendor: "Panda POS Technology",
      request_date: "2026-10-29",
      requester: "SPV Surabaya",
      status: "PENGAJUAN",
      priority: "BIASA",
      notes: "Laci kasir macet di counter SUBDF02 Surabaya"
    },
    {
      po_number: "PO-2026-008",
      item_name: "RAM DDR4 8GB PC-21300 (2666MHz) V-Gen Platinum",
      category: "Office PC",
      target_location: "Warehouse (WHS)",
      quantity: 3,
      unit: "Unit",
      estimated_price: 295000,
      total_price: 885000,
      vendor: "V-Gen Official Store",
      request_date: "2026-10-20",
      purchase_date: "2026-10-23",
      received_date: "2026-10-25",
      requester: "MIS IT Support",
      status: "DITERIMA",
      priority: "BIASA",
      notes: "Upgrade PC Gudang Pa Tohir & Nurul WHS"
    },
    {
      po_number: "PO-2026-009",
      item_name: "Switch Hub Gigabit 8-Port TP-Link TL-SG108 Steel",
      category: "Network",
      target_location: "Cabang Surabaya",
      quantity: 2,
      unit: "Unit",
      estimated_price: 285000,
      total_price: 570000,
      vendor: "TP-Link Indonesia",
      request_date: "2026-10-28",
      requester: "MIS IT Support",
      status: "DISETUJUI",
      priority: "BIASA",
      notes: "Perapihan rack jaringan posko IT Surabaya"
    },
    {
      po_number: "PO-2026-010",
      item_name: "Mini PC Intel NUC 12 Pro i5 16GB 512GB SSD",
      category: "Office PC",
      target_location: "Office Terminal 3",
      quantity: 1,
      unit: "Unit",
      estimated_price: 6800000,
      total_price: 6800000,
      vendor: "Intel Enterprise Partner",
      request_date: "2026-10-30",
      requester: "MIS IT Support",
      status: "PENGAJUAN",
      priority: "CRITICAL",
      notes: "Standby server backup POS kasir darurat T3"
    }
  ];

  for (const p of initialPurchaseList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO purchases (
              po_number, item_name, category, target_location,
              quantity, unit, estimated_price, total_price, vendor,
              request_date, purchase_date, received_date, requester,
              status, priority, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.po_number, p.item_name, p.category, p.target_location,
        p.quantity, p.unit, p.estimated_price, p.total_price, p.vendor,
        p.request_date || null, p.purchase_date || null, p.received_date || null, p.requester,
        p.status, p.priority, p.notes
      ],
    });
  }
}

  // 8. Seed Pencatatan Aset MIS T3-DF1 (DF1 - DF7)
  const countT3 = await db.execute("SELECT count(*) as count FROM t3_fixed_assets");
  if ((Number((countT3.rows[0] as any)?.count) || 0) === 0) {
    const initialT3FixedAssetList = [
    // --- DF1 ---
    {
      item_no: 1, tgl_perolehan: "2021-03-15", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992144",
      spesifikasi: "Intel Celeron G540 2.5GHz, 4GB DDR3, 128GB SSD, Dual Display, Win 7 Embed",
      lokasi: "DF1", pengguna: "Kasir DF1-P01", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-001", keterangan: "Mesin Kasir Utama DF1 Gate 1-2, EDC BCA & BRI Aktif", status: "OPERASIONAL"
    },
    {
      item_no: 2, tgl_perolehan: "2021-03-15", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992145",
      spesifikasi: "Intel Celeron G540 2.5GHz, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF1", pengguna: "Kasir DF1-P02", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-002", keterangan: "Mesin Kasir Counter 2 DF1, EDC BCA & BRI", status: "OPERASIONAL"
    },
    {
      item_no: 3, tgl_perolehan: "2021-04-10", tgl_pemakaian: "2021-04-15",
      kategori: "Printer Kasir", nama_merk: "Epson TM-U220D Dot Matrix", serial_number: "EPS-U220-449102",
      spesifikasi: "9-Pin Serial Impact, Auto Cutter, 4.7 lps, 2-Color Print",
      lokasi: "DF1", pengguna: "Kasir DF1-P01", harga_pembelian: 2850000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-003", keterangan: "Printer struk kasir TM-U220D pita ERC-38", status: "OPERASIONAL"
    },
    {
      item_no: 4, tgl_perolehan: "2021-05-20", tgl_pemakaian: "2021-05-25",
      kategori: "Passport Reader", nama_merk: "3M AT9000 Full Page Reader", serial_number: "3M-AT9K-77182",
      spesifikasi: "Optical & RFID e-Passport Reader, Ultra Violet, ICAO 9303 compliant",
      lokasi: "DF1", pengguna: "Kasir DF1-P01", harga_pembelian: 14500000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-004", keterangan: "Scanner Paspor Duty Free untuk Tax Free / boarding check", status: "OPERASIONAL"
    },
    {
      item_no: 5, tgl_perolehan: "2022-01-12", tgl_pemakaian: "2022-01-20",
      kategori: "PC Office / SPV", nama_merk: "Asus Custom Tower SPV", serial_number: "ASUS-H61-90114",
      spesifikasi: "Intel Core i3 3220 3.3GHz, 6GB DDR3, 500GB HDD Seagate, Win 7 Pro",
      lokasi: "DF1", pengguna: "SPV DF1", harga_pembelian: 6200000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-005", keterangan: "PC Supervisor DF1 (IP: 172.19.25.4)", status: "OPERASIONAL"
    },
    {
      item_no: 6, tgl_perolehan: "2021-02-18", tgl_pemakaian: "2021-03-01",
      kategori: "Network / Jaringan", nama_merk: "Cisco Catalyst 2960-24TT", serial_number: "FOC2139W01X",
      spesifikasi: "24-Port Fast Ethernet + 2 Uplink Gigabit, Managed Rackmount",
      lokasi: "DF1", pengguna: "MIS IT Support", harga_pembelian: 7500000, qty: 1,
      no_asset: "AST-MIS-T3-DF1-006", keterangan: "Switch Hub Rack Sub-Distribution DF1", status: "OPERASIONAL"
    },

    // --- DF2 ---
    {
      item_no: 7, tgl_perolehan: "2021-03-15", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992150",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF2", pengguna: "Kasir DF2-P01", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-001", keterangan: "Counter Kosmetik DF2, EDC Mandiri & BCA", status: "OPERASIONAL"
    },
    {
      item_no: 8, tgl_perolehan: "2021-03-15", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992151",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF2", pengguna: "Kasir DF2-P02", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-002", keterangan: "Counter Parfum DF2", status: "OPERASIONAL"
    },
    {
      item_no: 9, tgl_perolehan: "2021-06-10", tgl_pemakaian: "2021-06-15",
      kategori: "Passport Reader", nama_merk: "Gemalto QS1000 Document Reader", serial_number: "GEM-QS1K-55201",
      spesifikasi: "Full page ID & Passport Image Scanner, USB 2.0 High Speed",
      lokasi: "DF2", pengguna: "Kasir DF2-P01", harga_pembelian: 13800000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-003", keterangan: "Reader paspor counter DF2", status: "OPERASIONAL"
    },
    {
      item_no: 10, tgl_perolehan: "2021-07-01", tgl_pemakaian: "2021-07-05",
      kategori: "Barcode Scanner", nama_merk: "Honeywell Voyager 1250g", serial_number: "HW-V1250-88120",
      spesifikasi: "Single-line laser scanner, stand autosense, USB interface",
      lokasi: "DF2", pengguna: "Kasir DF2-P01", harga_pembelian: 950000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-004", keterangan: "Scanner barcode counter kosmetik", status: "OPERASIONAL"
    },
    {
      item_no: 11, tgl_perolehan: "2021-04-05", tgl_pemakaian: "2021-04-10",
      kategori: "Cash Drawer", nama_merk: "Panda POS-410 RJ11 Metal", serial_number: "PND-410-10928",
      spesifikasi: "Heavy duty steel, 5 Bill / 8 Coin, RJ11 trigger to printer",
      lokasi: "DF2", pengguna: "Kasir DF2-P01", harga_pembelian: 550000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-005", keterangan: "Laci uang kasir DF2", status: "OPERASIONAL"
    },
    {
      item_no: 12, tgl_perolehan: "2021-02-10", tgl_pemakaian: "2021-02-15",
      kategori: "UPS / Kelistrikan", nama_merk: "APC Smart-UPS 1500VA LCD", serial_number: "AS1500-998124",
      spesifikasi: "1500VA / 1000W, Pure Sine Wave, AVR, Battery Backup POS Rack",
      lokasi: "DF2", pengguna: "Kasir & Rack DF2", harga_pembelian: 5800000, qty: 1,
      no_asset: "AST-MIS-T3-DF2-006", keterangan: "Backup power listrik kasir POS DF2 jika genset delay", status: "OPERASIONAL"
    },

    // --- DF3 ---
    {
      item_no: 13, tgl_perolehan: "2021-03-20", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992160",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF3", pengguna: "Kasir DF3-P01", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF3-001", keterangan: "Counter Fashion DF3, IP: 172.19.20.31", status: "OPERASIONAL"
    },
    {
      item_no: 14, tgl_perolehan: "2021-03-20", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992161",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF3", pengguna: "Kasir DF3-P02", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF3-002", keterangan: "Counter Accessories DF3, IP: 172.19.20.32", status: "OPERASIONAL"
    },
    {
      item_no: 15, tgl_perolehan: "2021-06-15", tgl_pemakaian: "2021-06-20",
      kategori: "Passport Reader", nama_merk: "Gemalto QS1000 Document Reader", serial_number: "GEM-QS1K-55208",
      spesifikasi: "Full page ID Scanner, USB 2.0",
      lokasi: "DF3", pengguna: "Kasir DF3-P01", harga_pembelian: 13800000, qty: 1,
      no_asset: "AST-MIS-T3-DF3-003", keterangan: "Reader paspor counter DF3", status: "OPERASIONAL"
    },
    {
      item_no: 16, tgl_perolehan: "2021-04-12", tgl_pemakaian: "2021-04-18",
      kategori: "Printer Kasir", nama_merk: "Epson TM-U220D Dot Matrix", serial_number: "EPS-U220-449115",
      spesifikasi: "Auto Cutter, Serial/USB, 2-Color Print",
      lokasi: "DF3", pengguna: "Kasir DF3-P01", harga_pembelian: 2850000, qty: 1,
      no_asset: "AST-MIS-T3-DF3-004", keterangan: "Printer struk kasir DF3", status: "OPERASIONAL"
    },
    {
      item_no: 17, tgl_perolehan: "2021-02-25", tgl_pemakaian: "2021-03-01",
      kategori: "Network / Jaringan", nama_merk: "HP 1920-24G Switch JG924A", serial_number: "CN64FXD109",
      spesifikasi: "24-Port Gigabit 10/100/1000 + 4 SFP, Smart Managed",
      lokasi: "DF3", pengguna: "MIS IT Support", harga_pembelian: 6900000, qty: 1,
      no_asset: "AST-MIS-T3-DF3-005", keterangan: "Switch Rack DF3 distribusi POS & IP Cam", status: "OPERASIONAL"
    },

    // --- DF4 ---
    {
      item_no: 18, tgl_perolehan: "2021-03-25", tgl_pemakaian: "2021-04-01",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992170",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF4", pengguna: "Kasir DF4-P01", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-001", keterangan: "Counter Confectionery & Cokelat DF4, IP: 172.19.20.41", status: "OPERASIONAL"
    },
    {
      item_no: 19, tgl_perolehan: "2022-08-10", tgl_pemakaian: "2022-08-15",
      kategori: "POS Terminal", nama_merk: "Kassen All-in-One POS-150", serial_number: "KSN-POS15-3810",
      spesifikasi: "Intel Celeron J4125 2.0GHz, 8GB DDR4, 256GB SSD, 15 Touchscreen",
      lokasi: "DF4", pengguna: "Kasir DF4-P07", harga_pembelian: 12500000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-002", keterangan: "Kasir Touchscreen Kassen DF4-P07, IP: 172.19.20.47", status: "OPERASIONAL"
    },
    {
      item_no: 20, tgl_perolehan: "2021-06-25", tgl_pemakaian: "2021-07-01",
      kategori: "Passport Reader", nama_merk: "Plustek SecureScan 100X", serial_number: "PLU-100X-77412",
      spesifikasi: "Passport & ID Document Reader, Visible/IR/UV Lighting, USB 2.0",
      lokasi: "DF4", pengguna: "Kasir DF4-P06", harga_pembelian: 11800000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-003", keterangan: "Passport scanner kasir DF4-P06", status: "OPERASIONAL"
    },
    {
      item_no: 21, tgl_perolehan: "2021-04-15", tgl_pemakaian: "2021-04-20",
      kategori: "Printer Kasir", nama_merk: "Epson TM-U220D Dot Matrix", serial_number: "EPS-U220-449122",
      spesifikasi: "Auto Cutter, Serial Port, Pita ERC-38",
      lokasi: "DF4", pengguna: "Kasir DF4-P01", harga_pembelian: 2850000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-004", keterangan: "Printer struk kasir DF4", status: "OPERASIONAL"
    },
    {
      item_no: 22, tgl_perolehan: "2021-05-10", tgl_pemakaian: "2021-05-15",
      kategori: "Cash Drawer", nama_merk: "Panda POS-410 RJ11 Metal", serial_number: "PND-410-10940",
      spesifikasi: "Heavy Duty Metal Cash Drawer, 5B/8C",
      lokasi: "DF4", pengguna: "Kasir DF4-P01", harga_pembelian: 550000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-005", keterangan: "Laci uang kasir counter DF4", status: "OPERASIONAL"
    },
    {
      item_no: 23, tgl_perolehan: "2021-02-15", tgl_pemakaian: "2021-02-20",
      kategori: "UPS / Kelistrikan", nama_merk: "APC Smart-UPS 1500VA LCD", serial_number: "AS1500-998140",
      spesifikasi: "1500VA / 1000W Pure Sine Wave Rackmount",
      lokasi: "DF4", pengguna: "Rack DF4", harga_pembelian: 5800000, qty: 1,
      no_asset: "AST-MIS-T3-DF4-006", keterangan: "UPS Backup Rack Jaringan & POS DF4", status: "OPERASIONAL"
    },

    // --- DF5 ---
    {
      item_no: 24, tgl_perolehan: "2021-04-01", tgl_pemakaian: "2021-04-10",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992185",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF5", pengguna: "Kasir DF5-P13", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF5-001", keterangan: "Counter DF5 Gate Barat T3, IP: 172.19.20.53", status: "OPERASIONAL"
    },
    {
      item_no: 25, tgl_perolehan: "2021-04-01", tgl_pemakaian: "2021-04-10",
      kategori: "POS Terminal", nama_merk: "NCR RealPOS 70XRT", serial_number: "NCR-70X-992186",
      spesifikasi: "Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed",
      lokasi: "DF5", pengguna: "Kasir DF5-P14", harga_pembelian: 18500000, qty: 1,
      no_asset: "AST-MIS-T3-DF5-002", keterangan: "Counter DF5 Gate Barat T3, IP: 172.19.20.54", status: "OPERASIONAL"
    },
    {
      item_no: 26, tgl_perolehan: "2021-07-12", tgl_pemakaian: "2021-07-15",
      kategori: "Barcode Scanner", nama_merk: "Honeywell Voyager 1250g", serial_number: "HW-V1250-88145",
      spesifikasi: "Single-line Laser Scanner USB",
      lokasi: "DF5", pengguna: "Kasir DF5-P13", harga_pembelian: 950000, qty: 1,
      no_asset: "AST-MIS-T3-DF5-003", keterangan: "Scanner barcode kasir DF5", status: "OPERASIONAL"
    },
    {
      item_no: 27, tgl_perolehan: "2021-04-18", tgl_pemakaian: "2021-04-25",
      kategori: "Printer Kasir", nama_merk: "Epson TM-U220D Dot Matrix", serial_number: "EPS-U220-449130",
      spesifikasi: "9-Pin Impact, Auto Cutter, 2-Color",
      lokasi: "DF5", pengguna: "Kasir DF5-P13", harga_pembelian: 2850000, qty: 1,
      no_asset: "AST-MIS-T3-DF5-004", keterangan: "Printer struk kasir DF5", status: "OPERASIONAL"
    },

    // --- DF6 ---
    {
      item_no: 28, tgl_perolehan: "2022-09-01", tgl_pemakaian: "2022-09-10",
      kategori: "POS Terminal", nama_merk: "Kassen All-in-One POS-150", serial_number: "KSN-POS15-4011",
      spesifikasi: "Intel Celeron J4125, 8GB DDR4, 256GB SSD, 15 Touchscreen",
      lokasi: "DF6", pengguna: "Kasir DF6-P01", harga_pembelian: 12500000, qty: 1,
      no_asset: "AST-MIS-T3-DF6-001", keterangan: "Boutique DF6, IP: 172.19.20.61", status: "OPERASIONAL"
    },
    {
      item_no: 29, tgl_perolehan: "2022-09-01", tgl_pemakaian: "2022-09-10",
      kategori: "POS Terminal", nama_merk: "Kassen All-in-One POS-150", serial_number: "KSN-POS15-4012",
      spesifikasi: "Intel Celeron J4125, 8GB DDR4, 256GB SSD, 15 Touchscreen",
      lokasi: "DF6", pengguna: "Kasir DF6-P02", harga_pembelian: 12500000, qty: 1,
      no_asset: "AST-MIS-T3-DF6-002", keterangan: "Boutique DF6, IP: 172.19.20.62", status: "OPERASIONAL"
    },
    {
      item_no: 30, tgl_perolehan: "2022-09-15", tgl_pemakaian: "2022-09-20",
      kategori: "Barcode Scanner", nama_merk: "Honeywell Xenon 1900g 2D", serial_number: "HW-X1900-33102",
      spesifikasi: "Area-Imaging 2D Scanner USB, support QR & Barcode",
      lokasi: "DF6", pengguna: "Kasir DF6-P01", harga_pembelian: 1850000, qty: 1,
      no_asset: "AST-MIS-T3-DF6-003", keterangan: "Scanner barcode & QR Kasir DF6", status: "OPERASIONAL"
    },
    {
      item_no: 31, tgl_perolehan: "2022-09-15", tgl_pemakaian: "2022-09-20",
      kategori: "Cash Drawer", nama_merk: "Panda POS-410 RJ11 Metal", serial_number: "PND-410-11005",
      spesifikasi: "Heavy duty steel cash drawer 5B/8C",
      lokasi: "DF6", pengguna: "Kasir DF6-P01", harga_pembelian: 550000, qty: 1,
      no_asset: "AST-MIS-T3-DF6-004", keterangan: "Laci uang kasir DF6", status: "OPERASIONAL"
    },

    // --- DF7 ---
    {
      item_no: 32, tgl_perolehan: "2022-10-05", tgl_pemakaian: "2022-10-15",
      kategori: "POS Terminal", nama_merk: "Kassen All-in-One POS-150", serial_number: "KSN-POS15-4105",
      spesifikasi: "Intel Celeron J4125, 8GB DDR4, 256GB SSD, 15 Touchscreen",
      lokasi: "DF7", pengguna: "Kasir DF7-P01", harga_pembelian: 12500000, qty: 1,
      no_asset: "AST-MIS-T3-DF7-001", keterangan: "Departure Gate DF7, IP: 172.19.20.71", status: "OPERASIONAL"
    },
    {
      item_no: 33, tgl_perolehan: "2022-10-05", tgl_pemakaian: "2022-10-15",
      kategori: "POS Terminal", nama_merk: "Kassen All-in-One POS-150", serial_number: "KSN-POS15-4106",
      spesifikasi: "Intel Celeron J4125, 8GB DDR4, 256GB SSD, 15 Touchscreen",
      lokasi: "DF7", pengguna: "Kasir DF7-P02", harga_pembelian: 12500000, qty: 1,
      no_asset: "AST-MIS-T3-DF7-002", keterangan: "Departure Gate DF7, IP: 172.19.20.72", status: "OPERASIONAL"
    },
    {
      item_no: 34, tgl_perolehan: "2022-10-18", tgl_pemakaian: "2022-10-20",
      kategori: "Printer Kasir", nama_merk: "Epson TM-U220D Dot Matrix", serial_number: "EPS-U220-449150",
      spesifikasi: "Impact Dot Matrix, Auto Cutter, USB",
      lokasi: "DF7", pengguna: "Kasir DF7-P01", harga_pembelian: 2850000, qty: 1,
      no_asset: "AST-MIS-T3-DF7-003", keterangan: "Printer struk kasir DF7", status: "OPERASIONAL"
    },
    {
      item_no: 35, tgl_perolehan: "2022-09-28", tgl_pemakaian: "2022-10-01",
      kategori: "UPS / Kelistrikan", nama_merk: "APC Smart-UPS 1500VA LCD", serial_number: "AS1500-998188",
      spesifikasi: "1500VA / 1000W Pure Sine Wave Rackmount",
      lokasi: "DF7", pengguna: "Rack DF7", harga_pembelian: 5800000, qty: 1,
      no_asset: "AST-MIS-T3-DF7-004", keterangan: "UPS Backup Daya Kasir POS DF7", status: "OPERASIONAL"
    }
  ];

  for (const a of initialT3FixedAssetList) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO t3_fixed_assets (
              item_no, tgl_perolehan, tgl_pemakaian, kategori,
              nama_merk, serial_number, spesifikasi, lokasi,
              pengguna, harga_pembelian, qty, no_asset, keterangan, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        a.item_no, a.tgl_perolehan, a.tgl_pemakaian, a.kategori,
        a.nama_merk, a.serial_number, a.spesifikasi, a.lokasi,
        a.pengguna, a.harga_pembelian, a.qty, a.no_asset, a.keterangan, a.status
      ],
    });
  }
}

  // 9. Seed Direktori Extension Telepon PABX Head Office & Warehouse
  const countPhoneExt = await db.execute("SELECT count(*) as count FROM phone_extensions");
  if ((Number((countPhoneExt.rows[0] as any)?.count) || 0) === 0) {
    const initialExtensionList = [
      // ACC (Accounting)
      { item_no: 1, division: "ACC", user_name: "BU NYOMAN", ext: "1151", location: "Head Office", notes: "Accounting Manager (VoIP 172.16.11.1 • PC 172.16.45.10)", ip_address: "172.16.11.1", status: "AKTIF" },
      { item_no: 2, division: "ACC", user_name: "BU NURUL", ext: "1194", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.2 • PC 172.16.11.94)", ip_address: "172.16.11.2", status: "AKTIF" },
      { item_no: 3, division: "ACC", user_name: "BU MARI", ext: "1146", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.3 • PC 172.16.45.18)", ip_address: "172.16.11.3", status: "AKTIF" },
      { item_no: 4, division: "ACC", user_name: "INDAH", ext: "1164", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.4 • PC 172.16.45.17)", ip_address: "172.16.11.4", status: "AKTIF" },
      { item_no: 5, division: "ACC", user_name: "SINDI", ext: "1116", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.5 • PC 172.16.45.15)", ip_address: "172.16.11.5", status: "AKTIF" },
      { item_no: 6, division: "ACC", user_name: "ARYANTI (ARE)", ext: "1161", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.6 • PC 172.16.45.16)", ip_address: "172.16.11.6", status: "AKTIF" },
      { item_no: 7, division: "ACC", user_name: "SATRIYO", ext: "1115", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.7 • PC 172.16.45.9)", ip_address: "172.16.11.7", status: "AKTIF" },
      { item_no: 8, division: "ACC", user_name: "REYNALDI", ext: "1123", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.8)", ip_address: "172.16.11.8", status: "AKTIF" },
      { item_no: 9, division: "ACC", user_name: "SAYUTI", ext: "1127", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.9 • PC 172.16.45.23)", ip_address: "172.16.11.9", status: "AKTIF" },
      { item_no: 10, division: "ACC", user_name: "RINA", ext: "1107", location: "Head Office", notes: "Staff Accounting (VoIP 172.16.11.10 • PC 172.16.45.21)", ip_address: "172.16.11.10", status: "AKTIF" },

      // BOD (Board of Directors)
      { item_no: 11, division: "BOD", user_name: "PA HL", ext: "1011", location: "Head Office", notes: "Direksi (VoIP 172.16.21.2 • PC 172.16.1.10)", ip_address: "172.16.21.2", status: "AKTIF" },
      { item_no: 12, division: "BOD", user_name: "PA ANDY", ext: "1022", location: "Head Office", notes: "Direksi (PC 172.16.1.20)", ip_address: "172.16.1.20", status: "AKTIF" },
      { item_no: 13, division: "BOD", user_name: "VIP 3", ext: "1033", location: "Head Office", notes: "Ruang VIP / Meeting BOD (VoIP 172.16.21.4)", ip_address: "172.16.21.4", status: "AKTIF" },
      { item_no: 14, division: "BOD", user_name: "BU JULY", ext: "1044", location: "Head Office", notes: "Sekretaris Direksi (VoIP 172.16.21.1)", ip_address: "172.16.21.1", status: "AKTIF" },

      // FIN (Finance)
      { item_no: 15, division: "FIN", user_name: "PA SUGI (SM)", ext: "1126", location: "Head Office", notes: "Finance Manager (VoIP 172.16.31.1 • PC 172.16.31.26)", ip_address: "172.16.31.1", status: "AKTIF" },
      { item_no: 16, division: "FIN", user_name: "BU NUNUNG", ext: "1154", location: "Head Office", notes: "Staff Finance (VoIP 172.16.31.2 • PC 172.16.30.X)", ip_address: "172.16.31.2", status: "AKTIF" },
      { item_no: 17, division: "FIN", user_name: "BU RINA", ext: "1303", location: "Head Office", notes: "Staff Finance (PC 172.16.45.21)", ip_address: "172.16.45.21", status: "AKTIF" },
      { item_no: 18, division: "FIN", user_name: "ABEL", ext: "1106", location: "Head Office", notes: "Staff Finance (VoIP 172.16.31.3 • PC 172.16.30.X)", ip_address: "172.16.31.3", status: "AKTIF" },
      { item_no: 19, division: "FIN", user_name: "SAYUTI", ext: "1305", location: "Head Office", notes: "Staff Finance (PC 172.16.45.23)", ip_address: "172.16.45.23", status: "AKTIF" },
      { item_no: 20, division: "FIN", user_name: "REY", ext: "1306", location: "Head Office", notes: "Staff Finance (PC 172.16.45.24)", ip_address: "172.16.45.24", status: "AKTIF" },
      { item_no: 21, division: "FIN", user_name: "YANA", ext: "1145", location: "Head Office", notes: "Staff Finance (VoIP 172.16.31.4 • PC 172.16.30.X)", ip_address: "172.16.31.4", status: "AKTIF" },

      // GS (General Services)
      { item_no: 22, division: "GS", user_name: "BU ENNY", ext: "1162", location: "Head Office", notes: "GS Manager (VoIP 172.16.41.1 • PC 172.16.41.62)", ip_address: "172.16.41.1", status: "AKTIF" },
      { item_no: 23, division: "GS", user_name: "PA BAGUS", ext: "1160", location: "Head Office", notes: "Staff GS (VoIP 172.16.41.2 • PC 172.16.41.60)", ip_address: "172.16.41.2", status: "AKTIF" },
      { item_no: 24, division: "GS", user_name: "DENTI", ext: "1159", location: "Head Office", notes: "Staff GS (VoIP 172.16.41.3 • PC 172.16.41.59)", ip_address: "172.16.41.3", status: "AKTIF" },
      { item_no: 25, division: "GS", user_name: "RIANI", ext: "1000", location: "Head Office", notes: "Operator PABX / Resepsionis (Nol 4x • VoIP 172.16.41.4 • PC 172.16.41.1)", ip_address: "172.16.41.4", status: "AKTIF" },

      // MCD (Merchandising)
      { item_no: 26, division: "MCD", user_name: "BU TIFF", ext: "1142", location: "Head Office", notes: "Merchandising Manager (VoIP 172.16.61.7 • PC 172.16.20.10)", ip_address: "172.16.61.7", status: "AKTIF" },
      { item_no: 27, division: "MCD", user_name: "BU IVED", ext: "1190", location: "Head Office", notes: "Staff Merchandising (VoIP 172.16.61.6 • PC 172.16.20.11)", ip_address: "172.16.61.6", status: "AKTIF" },
      { item_no: 28, division: "MCD", user_name: "PA DAHUR", ext: "1503", location: "Head Office", notes: "Staff Merchandising (PC 172.16.20.12)", ip_address: "172.16.20.12", status: "AKTIF" },
      { item_no: 29, division: "MCD", user_name: "FAZIR", ext: "1177", location: "Head Office", notes: "Staff Merchandising (VoIP 172.16.61.1 • PC 172.16.20.13)", ip_address: "172.16.61.1", status: "AKTIF" },
      { item_no: 30, division: "MCD", user_name: "MEGA", ext: "1189", location: "Head Office", notes: "Staff Merchandising (VoIP 172.16.61.3 • PC 172.16.20.14)", ip_address: "172.16.61.3", status: "AKTIF" },
      { item_no: 31, division: "MCD", user_name: "REZA", ext: "1174", location: "Head Office", notes: "Staff Merchandising (VoIP 172.16.61.2 • PC 172.16.20.15)", ip_address: "172.16.61.2", status: "AKTIF" },

      // MIS (IT Support)
      { item_no: 32, division: "MIS", user_name: "PA PEPEN", ext: "1175", location: "Ruang MIS", notes: "IT Support Head / Spv (VoIP 172.16.71.5 • PC 172.16.99.12)", ip_address: "172.16.71.5", status: "AKTIF" },
      { item_no: 33, division: "MIS", user_name: "FARHAN", ext: "1158", location: "Ruang MIS", notes: "Staff IT Support (VoIP 172.16.71.3 • PC 172.16.99.77)", ip_address: "172.16.71.3", status: "AKTIF" },
      { item_no: 34, division: "MIS", user_name: "HAMDI", ext: "1170", location: "Ruang MIS", notes: "Staff IT Support (VoIP 172.16.71.1 • PC 172.16.99.99)", ip_address: "172.16.71.1", status: "AKTIF" },
      { item_no: 35, division: "MIS", user_name: "BILLY", ext: "1180", location: "Ruang MIS", notes: "Staff IT Support (VoIP 172.16.71.2 • PC 172.16.99.11)", ip_address: "172.16.71.2", status: "AKTIF" },
      { item_no: 36, division: "MIS", user_name: "KOSONG", ext: "-", location: "Ruang MIS", notes: "Jalur Standby / Cadangan IT (VoIP 172.16.71.4)", ip_address: "172.16.71.4", status: "KOSONG" },

      // HRD
      { item_no: 37, division: "HRD", user_name: "FITRI", ext: "1169", location: "Head Office", notes: "HRD Manager (VoIP 172.16.51.1 • PC 172.16.51.69)", ip_address: "172.16.51.1", status: "AKTIF" },

      // FACILITY
      { item_no: 38, division: "FACILITY", user_name: "PANTRY", ext: "1111", location: "Head Office", notes: "Pantry Line Telepon Head Office (VoIP 172.16.81.11)", ip_address: "172.16.81.11", status: "AKTIF" },

      // WHS (Warehouse)
      { item_no: 39, division: "WHS", user_name: "WHS MEJA OPERASIONAL", ext: "1701", location: "Warehouse Gudang", notes: "Line Utama Operasional Warehouse (VoIP 172.17.11.1)", ip_address: "172.17.11.1", status: "AKTIF" },
      { item_no: 40, division: "WHS", user_name: "PA SANTO", ext: "1702", location: "Warehouse Gudang", notes: "Supervisor Warehouse / Gudang (PC 172.17.20.3 • VoIP 172.17.11.2)", ip_address: "172.17.11.2", status: "AKTIF" },
      { item_no: 41, division: "WHS", user_name: "WHS LINE 3 (STANDBY)", ext: "1705", location: "Warehouse Gudang", notes: "Jalur Standby / Cadangan Gudang (VoIP 172.17.11.3)", ip_address: "172.17.11.3", status: "STANDBY" },
      { item_no: 42, division: "WHS", user_name: "NURUL (WHS)", ext: "1703", location: "Warehouse Gudang", notes: "Staff Warehouse / Gudang (PC 172.17.20.2 • VoIP 172.17.11.4)", ip_address: "172.17.11.4", status: "AKTIF" },
      { item_no: 43, division: "WHS", user_name: "PA TOHIR", ext: "1704", location: "Warehouse Gudang", notes: "Staff Warehouse / Gudang (PC 172.17.45.15 • VoIP 172.17.11.4)", ip_address: "172.17.11.4", status: "AKTIF" },
      { item_no: 44, division: "WHS", user_name: "WHS INTERCOM (NUNUNG)", ext: "1154", location: "Warehouse Gudang", notes: "Remote VoIP Intercom WHS ke Finance Nunung (VoIP 172.17.11.13)", ip_address: "172.17.11.13", status: "AKTIF" },
      { item_no: 45, division: "WHS", user_name: "WHS INTERCOM (ABEL)", ext: "1106", location: "Warehouse Gudang", notes: "Remote VoIP Intercom WHS ke Finance Abel (VoIP 172.17.11.7)", ip_address: "172.17.11.7", status: "AKTIF" },
      { item_no: 46, division: "WHS", user_name: "WHS INTERCOM (YANA)", ext: "1145", location: "Warehouse Gudang", notes: "Remote VoIP Intercom WHS ke Finance Yana (VoIP 172.17.11.8)", ip_address: "172.17.11.8", status: "AKTIF" },
      { item_no: 47, division: "WHS", user_name: "WHS INTERCOM (SAYUTI)", ext: "1127", location: "Warehouse Gudang", notes: "Remote VoIP Intercom WHS ke Finance Sayuti (VoIP 172.17.11.9)", ip_address: "172.17.11.9", status: "AKTIF" }
    ];

    for (const ext of initialExtensionList) {
      await db.execute({
        sql: `INSERT INTO phone_extensions (
                item_no, division, user_name, ext, location, notes, ip_address, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          ext.item_no, ext.division, ext.user_name, ext.ext,
          ext.location, ext.notes, ext.ip_address, ext.status
        ],
      });
    }
  }

  // 10. Seed Server Rack Units & Ports (Ruang Server 32U)
  const countRackUnits = await db.execute("SELECT count(*) as count FROM server_rack_units");
  if ((Number((countRackUnits.rows[0] as any)?.count) || 0) === 0) {
    const rackUnits = [
      { u_position: 32, name: "SWITCH 1 (VOIP)", device_type: "SWITCH", description: "24-Port Fast/Gigabit Switch khusus IP Phone VoIP", height_u: 1, vendor: "Cisco / Ruijie", ip_address: "172.16.10.11", status: "OPERASIONAL" },
      { u_position: 31, name: "WIRE MANAGEMENT 1", device_type: "MANAGEMENT", description: "1U Cable Organizer Horizontal", height_u: 1, vendor: "Standard Rack", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 30, name: "PATCH PANEL 1", device_type: "PATCH_PANEL", description: "24-Port Cat6 Patch Panel 1", height_u: 1, vendor: "AMP / CommScope", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 29, name: "PATCH PANEL 2 (PC & VOIP)", device_type: "PATCH_PANEL", description: "24-Port Cat6 Patch Panel 2 Distribusi User", height_u: 1, vendor: "AMP / CommScope", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 28, name: "WIRE MANAGEMENT 2", device_type: "MANAGEMENT", description: "1U Cable Organizer Horizontal", height_u: 1, vendor: "Standard Rack", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 27, name: "SWITCH 2 (PC DATA)", device_type: "SWITCH", description: "24-Port Gigabit Switch Jaringan PC User & Staff", height_u: 1, vendor: "Cisco / Ruijie", ip_address: "172.16.10.12", status: "OPERASIONAL" },
      { u_position: 26, name: "SWITCH 3 (CORE & BACKBONE)", device_type: "SWITCH", description: "24-Port Gigabit Core / Distribution Switch", height_u: 1, vendor: "Cisco / Ruijie", ip_address: "172.16.10.13", status: "OPERASIONAL" },
      { u_position: 25, name: "WIRE MANAGEMENT 3", device_type: "MANAGEMENT", description: "1U Cable Organizer Horizontal", height_u: 1, vendor: "Standard Rack", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 24, name: "PATCH PANEL 3 (BB, POE & AP)", device_type: "PATCH_PANEL", description: "24-Port Cat6 Patch Panel 3 Backbone & PoE AP", height_u: 1, vendor: "AMP / CommScope", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 23, name: "WIRE MANAGEMENT 4", device_type: "MANAGEMENT", description: "1U Cable Organizer Horizontal", height_u: 1, vendor: "Standard Rack", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 21, name: "RAK MIKROTIK (ROUTER 140 & 196)", device_type: "ROUTER", description: "Dual MikroTik Gateway Router (RB140 & RB196)", height_u: 2, vendor: "MikroTik", ip_address: "172.16.140.1 / 172.16.196.1", status: "OPERASIONAL" },
      { u_position: 18, name: "RAK ROUTER RUIJIE & MODEM HYPERNET", device_type: "GATEWAY", description: "Ruijie Cloud Gateway & PoE Controller + Modem Hypernet", height_u: 2, vendor: "Ruijie / Hypernet", ip_address: "172.16.10.1", status: "OPERASIONAL" },
      { u_position: 16, name: "WIRE MANAGEMENT 5", device_type: "MANAGEMENT", description: "1U Cable Organizer Horizontal", height_u: 1, vendor: "Standard Rack", ip_address: "-", status: "OPERASIONAL" },
      { u_position: 14, name: "DINSTAR (GATEWAY GSM)", device_type: "GATEWAY", description: "4G/LTE VoIP GSM Gateway Trunk Telepon Luar", height_u: 2, vendor: "Dinstar", ip_address: "172.16.10.201", status: "OPERASIONAL" },
      { u_position: 11, name: "YEASTAR (IP PABX)", device_type: "PABX", description: "Central IP-PBX Server Yeastar S-Series", height_u: 2, vendor: "Yeastar", ip_address: "172.16.10.200", status: "OPERASIONAL" },
      { u_position: 8, name: "MODEM STARLINK SATELLITE", device_type: "MODEM", description: "Starlink Standard Satellite Terminal & PoE Injector", height_u: 2, vendor: "SpaceX Starlink", ip_address: "192.168.100.1", status: "OPERASIONAL" },
      { u_position: 4, name: "UPS APC SMART-UPS 3000VA", device_type: "UPS", description: "3000VA Rackmount Power Backup Server Room", height_u: 4, vendor: "APC Schneider", ip_address: "-", status: "OPERASIONAL" }
    ];

    for (const u of rackUnits) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO server_rack_units (u_position, name, device_type, description, height_u, vendor, ip_address, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.u_position, u.name, u.device_type, u.description, u.height_u, u.vendor, u.ip_address, u.status]
      });
    }
  }

  // High-speed indexes for instantaneous queries (< 2ms)
  try {
    await db.execute("CREATE INDEX IF NOT EXISTS idx_edc_pos ON edc_assets(pos_location);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_edc_shop ON edc_assets(shop_name);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_pos_code ON pos_hardware_assets(pos_code);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_pos_shop ON pos_hardware_assets(shop_name);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_office_div ON office_hardware_assets(division);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_office_loc ON office_hardware_assets(office_location);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_dvr_loc ON dvr_assets(location);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_ext_div ON phone_extensions(division);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_rack_ports_grp ON server_rack_ports(device_group);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_rack_ports_rack ON server_rack_ports(rack_type);");
  } catch (e) {
    // ignore
  }

  isInitialized = true;
  (globalThis as any).__db_initialized = true;
}
