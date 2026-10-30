import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    // Ambil data akun user langsung dari tabel users di SQLite
    const usersRes = await db.execute("SELECT id, username, name, role, shop_location FROM users ORDER BY id ASC");

    // Ambil live statistik aset dari database untuk melengkapi info akun
    const [posCountRes, edcCountRes, officeCountRes, rackPortsRes] = await Promise.all([
      db.execute("SELECT COUNT(*) as c FROM pos_hardware_assets"),
      db.execute("SELECT COUNT(*) as c FROM edc_assets"),
      db.execute("SELECT COUNT(*) as c FROM office_hardware_assets"),
      db.execute("SELECT COUNT(*) as c FROM server_rack_ports"),
    ]);

    const posCount = Number(posCountRes.rows[0]?.c || 0);
    const edcCount = Number(edcCountRes.rows[0]?.c || 0);
    const officeCount = Number(officeCountRes.rows[0]?.c || 0);
    const rackPorts = Number(rackPortsRes.rows[0]?.c || 0);

    const accounts = usersRes.rows.map((row: any) => {
      const isAdmin = row.role === "ADMIN";
      const isMIS = row.role === "MIS";
      const isManager = row.role === "MANAGER";
      const isProcurement = row.role === "IT_PROCUREMENT";
      const isActive = isAdmin || isMIS || isManager || isProcurement;

      let badge = "DITANGGUHKAN SEMENTARA";
      let desc = `Menu & hak akses ${row.name} dikosongkan terlebih dahulu karena pengembangan saat ini berfokus pada Aset MIS.`;
      let features = [
        "Menu SPV Toko Dikosongkan Sementara",
        "Belum Masuk ke Tahap Operasional SPV",
        "Dialihkan ke Role IT Support (MIS)",
      ];

      if (isAdmin) {
        badge = "🛡️ SUPERADMIN • KONTROL PENUH";
        desc = "Hak akses administrator tertinggi untuk mengatur role, hak akses menu/permission, dan seluruh modul aplikasi.";
        features = [
          "Pengaturan Permission Menu & Role",
          "Akses Penuh Seluruh Modul & Data",
          "Kontrol Hak Edit & Lihat Semua Pengguna",
          "Audit Log & Konfigurasi Sistem",
        ];
      } else if (isMIS) {
        badge = "⭐ FOKUS UTAMA • AKTIF PENUH";
        desc = "Akses kontrol teknis penuh ke seluruh master aset hardware kasir, mesin EDC, PC kantor/gudang, dan infrastruktur server.";
        features = [
          "Akses Penuh Plaza Bali, SAM & Surabaya",
          `Inventaris ${posCount} POS & ${edcCount} Mesin EDC Bank`,
          `PC Head Office & Gudang WHS (${officeCount} Unit)`,
          `Rak Server 32U & Wallmount (${rackPorts} Port)`,
        ];
      } else if (isManager) {
        badge = "👑 EKSEKUTIF • SUPERVISI OPERASIONAL";
        desc = "Supervisi penuh dan ringkasan eksekutif seluruh aset kasir, jaringan, monitoring, pengadaan pembelian, dan tiket kendala.";
        features = [
          "Executive Dashboard & Laporan KPI",
          "Supervisi Master Aset & Monitoring Ping",
          "Visibilitas Pencatatan Pembelian IT",
          "Akses Penuh Semua Area & Toko",
        ];
      } else if (isProcurement) {
        badge = "📦 PENGADAAN & LOGISTIK IT";
        desc = "Manajemen dan pencatatan pengadaan perangkat hardware kasir, peripheral, sparepart, dan sinkronisasi instalasi IT Support.";
        features = [
          "Pencatatan Pembelian Perangkat Baru",
          "Sinkronisasi Serial Number & Alokasi POS",
          "Katalog Hardware & Spesifikasi Kasir",
          "Tracking Status Pemasangan IT Support",
        ];
      }

      return {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        shop_location: row.shop_location,
        isSuspended: !isActive,
        badge,
        desc,
        features,
      };
    });

    return NextResponse.json({
      success: true,
      source: "database_sqlite_shop_ops",
      accounts,
      stats: {
        posCount,
        edcCount,
        officeCount,
        rackPorts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load accounts" },
      { status: 500 }
    );
  }
}

