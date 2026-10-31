import { createClient } from "@libsql/client";
import path from "path";

// Koneksi ke file database SQLite lokal
const dbPath = path.resolve(process.cwd(), "shop_ops.db");

export const db = createClient({
  url: `file:${dbPath.replace(/\\/g, "/")}`,
});

export async function initDb() {
  if ((globalThis as any).__db_initialized_v3) return;

  try {
    await db.execute("PRAGMA journal_mode = WAL;");
    await db.execute("PRAGMA synchronous = NORMAL;");
    await db.execute("PRAGMA busy_timeout = 5000;");
  } catch (e) {
    // Abaikan jika tidak didukung driver
  }

  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN processor TEXT DEFAULT '-';");
  } catch (e) {
    // Kolom sudah ada
  }

  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN tsigunta_version TEXT DEFAULT '-';");
  } catch (e) {
    // Kolom sudah ada
  }

  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN store_alias TEXT DEFAULT '-';");
  } catch (e) {
    // Kolom sudah ada
  }

  // Kolom UPS Power Backup
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN ups TEXT DEFAULT '-';");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE office_hardware_assets ADD COLUMN ups TEXT DEFAULT '-';");
  } catch (e) {}

  // Update unit POS terpilih yang menggunakan UPS (misal Counter T3 DF2, DF4, DF7) jika belum diset
  try {
    await db.execute(`
      UPDATE pos_hardware_assets 
      SET ups = 'APC Smart-UPS 1500VA LCD' 
      WHERE (pos_code LIKE '%DFD02%' OR pos_code LIKE '%DFD04%' OR pos_code LIKE '%DFD07%') 
        AND (ups IS NULL OR ups = '-' OR ups = '');
    `);
  } catch (e) {}

  // Kolom integrasi Pembelian & Penggantian Hardware POS
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN component_type TEXT DEFAULT '-';");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN serial_number TEXT DEFAULT '-';");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN target_pos_code TEXT DEFAULT '-';");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN installed_pos_code TEXT DEFAULT '-';");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN installed_at DATETIME;");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN installed_by TEXT DEFAULT '-';");
  } catch (e) {}

  // Kolom Workflow Lengkap Pengajuan Barang IT (MIS OPS -> Manager -> MIS Procurement -> T3)
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN capex_number TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN brand_model TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN item_price REAL DEFAULT 0;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN store_type TEXT DEFAULT 'ONLINE_SHOP';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN store_name TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN store_link TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN invoice_url TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN arrival_date TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN shipped_to_t3_date TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN shipping_courier TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN received_by_t3_at TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN manager_approved_at TEXT;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN manager_approved_by TEXT DEFAULT '-';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE purchases ADD COLUMN manager_notes TEXT DEFAULT '-';");
  } catch (e) {}

  // Normalisasi status pengadaan agar konsisten dengan pipeline
  try {
    await db.execute("UPDATE purchases SET status = 'DISETUJUI_MANAGER' WHERE status = 'DISETUJUI'");
    await db.execute("UPDATE purchases SET status = 'DITERIMA_T3' WHERE status = 'DITERIMA'");
    await db.execute("UPDATE purchases SET status = 'PROSES_ORDER' WHERE status = 'PROSES_BELI'");
  } catch (e) {}

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        menu_key TEXT NOT NULL,
        can_view INTEGER DEFAULT 1,
        can_edit INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role, menu_key)
      );
    `);
  } catch (e) {}

  // Kolom Konfigurasi Koneksi Kamera & Streaming DVR CCTV
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN http_port INTEGER DEFAULT 80;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN rtsp_port INTEGER DEFAULT 554;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN server_port INTEGER DEFAULT 8000;");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN protocol TEXT DEFAULT 'HIKVISION';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN channel_names TEXT DEFAULT '';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE dvr_assets ADD COLUMN rtsp_stream_url TEXT DEFAULT '';");
  } catch (e) {}

  // Kolom updated_at pada users
  try {
    await db.execute("ALTER TABLE users ADD COLUMN updated_at DATETIME;");
  } catch (e) {}

  // Kolom AnyDesk Remote & Auto Password
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN anydesk_id TEXT DEFAULT '';");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE pos_hardware_assets ADD COLUMN anydesk_password TEXT DEFAULT 'cupcake2020';");
  } catch (e) {}
  try {
    await db.execute("UPDATE pos_hardware_assets SET anydesk_password = 'cupcake2020' WHERE anydesk_password IS NULL OR anydesk_password = '' OR anydesk_password = 'Cupcake2020';");
  } catch (e) {}

  // Tabel Knowledge Base (Dibuat & diedit oleh MIS OPS, dibaca & dipelajari oleh SPV Toko)
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        category TEXT NOT NULL,
        target_role TEXT DEFAULT 'SPV Toko',
        store_scope TEXT DEFAULT 'Semua Toko',
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        steps TEXT DEFAULT '[]',
        author_name TEXT NOT NULL DEFAULT 'MIS OPS Team',
        author_role TEXT NOT NULL DEFAULT 'MIS',
        tags TEXT DEFAULT '',
        is_pinned INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        view_count INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cek apakah ada data panduan awal
    const countRes = await db.execute("SELECT COUNT(*) as count FROM knowledge_base");
    const count = Number(countRes.rows[0]?.count || 0);

    if (count === 0) {
      const initialGuides = [
        {
          title: "SOP Mengatasi Mesin EDC Offline & Line Error (BCA, BRI, Mandiri, BNI)",
          slug: "sop-mengatasi-mesin-edc-offline",
          category: "Mesin EDC",
          target_role: "SPV Toko",
          store_scope: "Semua Toko",
          summary: "Panduan cepat saat mesin EDC kasir tidak merespons, layar Line Error, atau gagal transaksi gesek / tap kartu debit & kredit.",
          content: `### Masalah:
Mesin EDC di meja kasir mengalami gagal koneksi (muncul tulisan "Line Error", "Connection Timeout", atau lampu indikator LAN/WiFi mati).

### Prosedur Penyelesaian Cepat:
1. **Periksa Kabel Jaringan (LAN)**:
   - Pastikan kabel LAN di belakang mesin EDC terpasang kencang (klik) dan lampu port menyala hijau/oranye.
   - Bila menggunakan base dock nirkabel, pastikan unit EDC duduk pas di dock pengisian.
2. **Restart Mesin EDC**:
   - Untuk **EDC Ingenico / Verifone**: Tekan tombol **Kuning + Titik (.)** secara bersamaan selama 3 detik hingga layar mati dan restart.
   - Untuk **EDC Android (PAX / Smart EDC)**: Tekan dan tahan tombol **Power samping** selama 3 detik lalu pilih *Restart*.
3. **Cek Koneksi Ping IP EDC**:
   - Khusus EDC BRI terhubung LAN dengan IP \`172.19.21.1x\` (sesuai nomor POS). Buka menu *Mesin EDC Bank* di aplikasi ini untuk melihat status live ping online/offline.
4. **Lakukan Logon Ulang Bank**:
   - Masuk ke menu Function EDC -> pilih **Logon** -> tekan Enter.
   - Pastikan layar mencetak struk bertuliskan **LOGON BERHASIL / APPROVED**.
5. **Eskalasi ke MIS OPS**:
   - Jika setelah restart tetap Line Error, hubungi tim MIS OPS via Interkom IT (#201 / #202) atau buat Tiket Kendala dengan melampirkan TID & MID mesin.`,
          steps: JSON.stringify([
            "Periksa kabel LAN / dudukan dock EDC pada meja kasir",
            "Lakukan hard restart dengan tombol Kuning + Titik (.)",
            "Tunggu 1-2 menit hingga layar standby kembali",
            "Jalankan menu Function -> Logon pada mesin EDC",
            "Lakukan test transaksi nominal kecil atau Test Echo",
            "Bila tetap offline, lapor ke MIS OPS sertakan nomor TID/MID"
          ]),
          author_name: "MIS OPS Team",
          author_role: "MIS",
          tags: "edc, bca, bri, mandiri, bni, offline, restart, logon",
          is_pinned: 1,
          is_published: 1,
          view_count: 142,
          helpful_count: 38
        },
        {
          title: "Panduan Menangani Printer Kasir Epson TM-U220D & TM-T82 (Kertas Macet / Cutter Terkunci)",
          slug: "panduan-printer-kasir-epson-macet",
          category: "Printer Kasir",
          target_role: "SPV Toko",
          store_scope: "Semua Toko",
          summary: "Cara aman membuka cover printer yang terkunci saat pisau auto-cutter macet tanpa merusak gear dan mekanik printer.",
          content: `### Masalah:
Lampu merah *ERROR* berkedip, printer berbunyi bip berulang kali, atau cover penutup kertas tidak bisa dibuka karena pisau pemotong (*cutter*) macet di tengah.

### PERINGATAN KERAS:
**JANGAN MEMAKSA MENCONGKEL PENUTUP COVER DENGAN OBENG ATAU PISAU!** Hal ini dapat mematahkan gear plastik di dalam unit pemotong.

### Langkah Penanganan:
1. **Matikan Sakelar Daya**:
   - Tekan tombol power printer di posisi OFF (0).
2. **Reset Pisau Cutter Manual**:
   - Pada **Epson TM-T82 / TM-T88**: Buka penutup kecil di bagian depan cutter, putar roda bergerigi (*gear*) ke arah bawah hingga pisau pemotong kembali ke posisi mundur penuh.
   - Setelah pisau mundur, tuas pembuka cover akan otomatis bisa ditarik dengan mudah dan lembut.
3. **Pembersihan Sisa Kertas**:
   - Angkat gulungan kertas struk, bersihkan sobekan kertas kecil yang terselip di roll pemutar atau sensor kertas.
4. **Pasang Ulang Kertas Struk & Ribbon Cartridge (TM-U220)**:
   - Pastikan gulungan kertas terpasang dengan arah keluar dari bawah ke atas.
   - Bila TM-U220 (pita), putar knop pita searah jarum jam agar pita kencang dan tidak berkerut.
5. **Self-Test Print**:
   - Tahan tombol **FEED**, lalu nyalakan sakelar POWER. Tahan FEED selama 3 detik lalu lepas.
   - Printer akan mencetak test page konfirmasi bahwa mekanik normal.`,
          steps: JSON.stringify([
            "Matikan sakelar power printer ke OFF",
            "Buka penutup darurat cutter dan putar gear manual hingga pisau mundur",
            "Tarik tuas pembuka cover secara perlahan",
            "Bersihkan sobekan kertas di dalam ruang roll",
            "Pasang gulungan kertas struk baru dengan posisi benar",
            "Lakukan Self-Test Print (Tahan FEED + Nyalakan Power)"
          ]),
          author_name: "MIS OPS Team",
          author_role: "MIS",
          tags: "printer, epson, tm-u220, tm-t82, kertas macet, cutter, feed",
          is_pinned: 1,
          is_published: 1,
          view_count: 98,
          helpful_count: 27
        },
        {
          title: "SOP Penanganan Scanner Barcode Honeywell & Passport Reader Gemalto di Terminal 3",
          slug: "sop-scanner-barcode-gemalto-t3",
          category: "Scanner & Periferal",
          target_role: "SPV Toko",
          store_scope: "Terminal 3",
          summary: "Mengatasi scanner barcode tidak memindai dan passport reader Gemalto tidak membaca data paspor penumpang internasional.",
          content: `### Masalah:
Kasir tidak bisa scan barcode item (scanner mati / tidak ada laser merah) atau alat pembaca paspor Gemalto tidak membaca MRZ paspor turis.

### Solusi Cepat:
1. **Periksa Sambungan Kabel USB Kasir**:
   - Telusuri kabel scanner hingga ke belakang PC kasir NCR. Pastikan kabel tertancap rapat di port USB belakang (bukan port longgar).
2. **Cek Kaca Optik Scanner**:
   - Bersihkan kaca scanner dari sidik jari, debu belanjaan, atau noda minyak menggunakan kain mikrofiber kering lembut.
3. **Reset Scanner Honeywell**:
   - Scan barcode *Standard Factory Default* yang ditempel di bawah tatakan kasir atau buku panduan kasir.
   - Scanner akan berbunyi beep 3 kali menandakan reset selesai.
4. **Untuk Passport Reader Gemalto**:
   - Pastikan lampu LED biru/hijau menyala standby.
   - Letakkan halaman data paspor secara rata menempel pada kaca, tahan selama 2 detik hingga terdengar bunyi konfirmasi pada Tsigunta POS.
   - Bila lampu mati total, cabut adaptor power Gemalto 12V di bawah meja, tunggu 10 detik dan tancapkan kembali.`,
          steps: JSON.stringify([
            "Periksa kabel USB scanner & paspor di belakang PC kasir",
            "Bersihkan kaca optik pembaca dari noda/debu",
            "Coba scan barcode barang yang memiliki kontras tinggi",
            "Bila scanner freeze, cabut dan pasang kembali port USB",
            "Untuk Gemalto, pastikan adaptor listrik 12V terpasang dan LED menyala"
          ]),
          author_name: "MIS OPS Team",
          author_role: "MIS",
          tags: "scanner, honeywell, gemalto, barcode, paspor, mrz, usb",
          is_pinned: 0,
          is_published: 1,
          view_count: 76,
          helpful_count: 19
        },
        {
          title: "Panduan Penanganan PC POS Freeze / Not Responding & Remote AnyDesk",
          slug: "panduan-pc-pos-freeze-anydesk",
          category: "Hardware POS",
          target_role: "SPV Toko",
          store_scope: "Semua Toko",
          summary: "Tindakan saat aplikasi kasir Tsigunta membeku (hang), cara restart aman sistem POS, dan koordinasi remote AnyDesk ke MIS OPS.",
          content: `### Masalah:
Layar kasir freeze, kursor mouse tidak bergerak, atau transaksi terhenti di tengah pemindaian.

### Langkah Penanganan Aman:
1. **Jangan Langsung Cabut Colokan Listrik!**:
   - Mencabut kabel daya langsung dari stopkontak dapat merusak database transaksi lokal POS dan harddisk.
2. **Coba Tutup Aplikasi via Keyboard**:
   - Tekan kombinasi tombol **Alt + F4** atau **Ctrl + Alt + Del** lalu pilih *Task Manager*.
   - Tutup proses aplikasi Tsigunta jika berstatus *Not Responding*.
3. **Hard Restart Jika Freeze Total**:
   - Jika keyboard dan mouse sama sekali tidak merespons, tekan dan tahan tombol **POWER** pada unit CPU NCR selama **7 detik** hingga mesin mati total.
   - Tunggu 10 detik, lalu nyalakan kembali.
4. **Bantuan Remote Tim MIS OPS**:
   - Setiap unit kasir dilengkapi AnyDesk otomatis. Informasikan kode POS (misal: \`CGKT3DFD01-P01\`) kepada tim MIS OPS.
   - Tim MIS OPS dapat langsung masuk meremote unit kasir untuk perbaikan tanpa mengganggu operasional kasir lainnya.`,
          steps: JSON.stringify([
            "Tunggu 10 detik apakah sistem merespons kembali",
            "Coba Alt + F4 atau Ctrl + Alt + Del untuk menutup task",
            "Bila macet total, tahan tombol Power CPU selama 7 detik",
            "Nyalakan kembali PC dan tunggu booting Windows selesai",
            "Hubungi MIS OPS dengan menyebutkan Kode POS untuk dicek via AnyDesk"
          ]),
          author_name: "MIS OPS Team",
          author_role: "MIS",
          tags: "pos, ncr, freeze, tsigunta, restart, anydesk, remote",
          is_pinned: 0,
          is_published: 1,
          view_count: 115,
          helpful_count: 42
        },
        {
          title: "SOP Pelaporan Tiket Kerusakan Hardware & Permintaan Penggantian Aset",
          slug: "sop-pelaporan-tiket-kerusakan-hardware",
          category: "SOP Operasional",
          target_role: "SPV Toko",
          store_scope: "Semua Toko",
          summary: "Alur resmi bagi Supervisor Toko untuk mengajukan tiket perbaikan dan penggantian perangkat kasir yang rusak.",
          content: `### Tujuan:
Memastikan seluruh keluhan teknis di toko Terminal 2, Terminal 3, dan Surabaya tercatat dalam sistem terpadu agar penanganan cepat dan memiliki riwayat audit.

### Prosedur Bagi SPV Toko:
1. **Akses Menu 'Tiket Kendala'**:
   - Klik menu *Tiket Kendala* di sidebar kiri.
   - Klik tombol **+ Buat Tiket Baru**.
2. **Isi Detail Masalah**:
   - Pilih unit POS / Aset yang bermasalah.
   - Cantumkan tingkat urgensi (Darurat: jika kasir utama mati di jam sibuk penerbangan; Normal: jika kendala periferal cadangan).
   - Berikan deskripsi ringkas gejala kendala.
3. **Respon Tim MIS OPS**:
   - Tim MIS OPS akan menerima notifikasi tiket dan segera merespons via remote AnyDesk atau kunjungan langsung teknisi ke toko bandara.
   - Pantau status tiket dari *MENUNGGU* -> *DIPROSES* -> *SELESAI*.`,
          steps: JSON.stringify([
            "Buka menu Tiket Kendala di sidebar",
            "Klik tombol + Buat Tiket Baru",
            "Pilih Kode POS & Kategori masalah (EDC/Printer/Scanner/PC)",
            "Tentukan tingkat urgensi sesuai situasi transaksi toko",
            "Kirim tiket dan pantau status pengerjaan tim MIS OPS"
          ]),
          author_name: "MIS OPS Team",
          author_role: "MIS",
          tags: "sop, tiket, kendala, perbaikan, mis ops, spv",
          is_pinned: 0,
          is_published: 1,
          view_count: 88,
          helpful_count: 31
        }
      ];

      for (const guide of initialGuides) {
        await db.execute({
          sql: `
            INSERT INTO knowledge_base 
            (title, slug, category, target_role, store_scope, summary, content, steps, author_name, author_role, tags, is_pinned, is_published, view_count, helpful_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            guide.title,
            guide.slug,
            guide.category,
            guide.target_role,
            guide.store_scope,
            guide.summary,
            guide.content,
            guide.steps,
            guide.author_name,
            guide.author_role,
            guide.tags,
            guide.is_pinned,
            guide.is_published,
            guide.view_count,
            guide.helpful_count
          ]
        });
      }
    }
  } catch (e) {
    console.error("Error creating knowledge_base table or seeding:", e);
  }

  // Index aditif untuk kolom filter panas halaman/API (F8).
  // Aman diulang (IF NOT EXISTS) dan tidak mengubah data/skema destruktif.
  const hotFilterIndexes = [
    "CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)",
    "CREATE INDEX IF NOT EXISTS idx_assets_shop ON assets(shop_location)",
    "CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_asset ON tickets(asset_code)",
    "CREATE INDEX IF NOT EXISTS idx_pos_code ON pos_hardware_assets(pos_code)",
    "CREATE INDEX IF NOT EXISTS idx_monitoring_ip ON monitoring_devices(ip_address)",
    "CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)",
    "CREATE INDEX IF NOT EXISTS idx_edc_pos ON edc_assets(pos_location)",
    "CREATE INDEX IF NOT EXISTS idx_rack_ports_grp ON server_rack_ports(device_group)",
    // Index yang sudah ada di DB sejak baseline namun belum dideklarasikan di initDb()
    // (agar 17/17 index eksplisit terwakili; definisi diambil identik dari sqlite_master).
    "CREATE INDEX IF NOT EXISTS idx_dvr_loc ON dvr_assets(location)",
    "CREATE INDEX IF NOT EXISTS idx_edc_shop ON edc_assets(shop_name)",
    "CREATE INDEX IF NOT EXISTS idx_ext_div ON phone_extensions(division)",
    "CREATE INDEX IF NOT EXISTS idx_office_div ON office_hardware_assets(division)",
    "CREATE INDEX IF NOT EXISTS idx_office_loc ON office_hardware_assets(office_location)",
    "CREATE INDEX IF NOT EXISTS idx_pos_shop ON pos_hardware_assets(shop_name)",
    "CREATE INDEX IF NOT EXISTS idx_rack_ports_rack ON server_rack_ports(rack_type)",
  ];
  for (const sql of hotFilterIndexes) {
    try {
      await db.execute(sql);
    } catch (e) {
      // Tabel/kolom belum ada di instalasi lama — lewati (pola try/catch yang sama).
    }
  }

  (globalThis as any).__db_initialized = true;
  (globalThis as any).__db_initialized_v2 = true;
  (globalThis as any).__db_initialized_v3 = true;
}
