import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { UserRole } from "@/types";

interface MenuItemDef {
  key: string;
  label: string;
  href: string;
  group: string;
  description: string;
}

const SYSTEM_MENUS: MenuItemDef[] = [
  { key: "dashboard", label: "Dashboard Kontrol", href: "/dashboard", group: "Ringkasan", description: "Ringkasan KPI, metrik aset live, dan statistik sistem" },
  { key: "assets", label: "Kasir POS", href: "/assets", group: "Master Aset", description: "Master hardware POS, spesifikasi PC kasir & AnyDesk remote" },
  { key: "pos-topology", label: "Topologi Kasir", href: "/pos-topology", group: "Master Aset", description: "Denah tata letak dan detail 1 set POS Terminal Bandara" },
  { key: "edc", label: "Mesin EDC Bank", href: "/edc", group: "Master Aset", description: "Inventaris mesin EDC BCA, Mandiri, BRI & BNI" },
  { key: "office", label: "PC Office & WHS", href: "/office", group: "Master Aset", description: "PC & Printer kantor pusat, cabang, serta gudang warehouse" },
  { key: "t3-assets", label: "Aset Tetap T3", href: "/t3-assets", group: "Master Aset", description: "Inventaris aset tetap Terminal 3 (DF1 s/d DF7)" },
  { key: "dvr", label: "DVR CCTV Toko", href: "/dvr", group: "Master Aset", description: "Perekam CCTV, channel kamera, dan status retensi storage" },
  { key: "server-rack", label: "Rak Server", href: "/server-rack", group: "Infrastruktur", description: "Mapping patch panel switch 32U & 6U wallmount" },
  { key: "monitoring", label: "Monitoring Ping", href: "/monitoring", group: "Infrastruktur", description: "Live heartbeat ping IP address kasir & server toko" },
  { key: "tickets", label: "Tiket Kendala", href: "/tickets", group: "Operasional", description: "Pelaporan kendala kasir dan antrean penanganan IT" },
  { key: "extensions", label: "Interkom IT", href: "/extensions", group: "Operasional", description: "Direktori nomor ekstensi telepon PABX internal" },
  { key: "purchases", label: "Pengajuan Barang IT", href: "/purchases", group: "Operasional", description: "Workflow Pengadaan MIS OPS, review Manager, dan pemrosesan CAPEX Procurement" },
  { key: "knowledge-base", label: "Knowledge Base SOP", href: "/knowledge-base", group: "Operasional", description: "Pusat panduan SOP, troubleshooting POS & EDC kasir oleh MIS OPS untuk SPV Toko" },
  { key: "users", label: "Manajemen User", href: "/users", group: "Administrasi", description: "Pengelolaan akun pengguna, NIK, penugasan role, dan reset password" },
  { key: "permissions", label: "Pengaturan Izin & Role", href: "/permissions", group: "Administrasi", description: "Konfigurasi hak akses menu dan permission per role pengguna" },
];

const SYSTEM_ROLES: { role: UserRole; name: string; desc: string }[] = [
  { role: "ADMIN", name: "Administrator Sistem", desc: "Superuser dengan hak penuh mengubah permission menu dan kontrol sistem" },
  { role: "MIS", name: "MIS OPS", desc: "Tim operasional teknis pengelola hardware kasir, jaringan, server, dan AnyDesk" },
  { role: "MANAGER", name: "MIS MANAGER", desc: "Supervisi manajemen ke seluruh modul operasional dan dashboard" },
  { role: "IT_PROCUREMENT", name: "MIS PROCUREMENT SUPPORT", desc: "Pengadaan barang, input pembelian baru, dan alokasi unit kasir" },
  { role: "SPV_PLAZABALI_T3", name: "SPV Plaza Bali (Terminal 3)", desc: "Supervisor operasional toko Plaza Bali Bandara Terminal 3" },
  { role: "SPV_PLAZABALI_T2", name: "SPV Plaza Bali (Terminal 2)", desc: "Supervisor operasional toko Plaza Bali Bandara Terminal 2" },
  { role: "SPV_SAM_T3", name: "SPV SAM (Terminal 3)", desc: "Supervisor operasional toko SAM Bandara Terminal 3" },
  { role: "SPV_SAM_T2", name: "SPV SAM (Terminal 2)", desc: "Supervisor operasional toko SAM Bandara Terminal 2" },
];

function getDefaultPermissions(): { role: UserRole; menu_key: string; can_view: number; can_edit: number }[] {
  const result: { role: UserRole; menu_key: string; can_view: number; can_edit: number }[] = [];

  for (const r of SYSTEM_ROLES) {
    for (const m of SYSTEM_MENUS) {
      let can_view = 0;
      let can_edit = 0;

      if (r.role === "ADMIN") {
        can_view = 1;
        can_edit = 1;
      } else if (r.role === "MIS") {
        if (m.key !== "permissions") {
          can_view = 1;
          can_edit = 1;
        } else {
          can_view = 1;
          can_edit = 0;
        }
      } else if (r.role === "MANAGER") {
        can_view = m.key !== "permissions" ? 1 : 0;
        can_edit = 0;
      } else if (r.role === "IT_PROCUREMENT") {
        if (["dashboard", "assets", "office", "purchases", "tickets", "extensions", "knowledge-base"].includes(m.key)) {
          can_view = 1;
          can_edit = m.key === "purchases" ? 1 : 0;
        }
      } else if (
        r.role === "SPV_PLAZABALI_T3" ||
        r.role === "SPV_PLAZABALI_T2" ||
        r.role === "SPV_SAM_T3" ||
        r.role === "SPV_SAM_T2" ||
        r.role === "SPV_PLAZABALI" ||
        r.role === "SPV_SAM"
      ) {
        if (["dashboard", "tickets", "extensions", "knowledge-base"].includes(m.key)) {
          can_view = 1;
          can_edit = 0;
        }
      }

      result.push({
        role: r.role,
        menu_key: m.key,
        can_view,
        can_edit,
      });
    }
  }

  return result;
}

export async function GET() {
  try {
    await initDb();

    // Check if table has data
    const existingRes = await db.execute("SELECT role, menu_key, can_view, can_edit FROM role_permissions");
    let permissions = existingRes.rows;

    if (permissions.length === 0) {
      const defaults = getDefaultPermissions();
      for (const p of defaults) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO role_permissions (role, menu_key, can_view, can_edit) VALUES (?, ?, ?, ?)`,
          args: [p.role, p.menu_key, p.can_view, p.can_edit],
        });
      }
      const refetched = await db.execute("SELECT role, menu_key, can_view, can_edit FROM role_permissions");
      permissions = refetched.rows;
    }

    // Convert into convenient dictionary map: { [role]: { [menu_key]: { can_view: boolean, can_edit: boolean } } }
    const matrix: Record<string, Record<string, { can_view: boolean; can_edit: boolean }>> = {};
    for (const r of SYSTEM_ROLES) {
      matrix[r.role] = {};
      for (const m of SYSTEM_MENUS) {
        matrix[r.role][m.key] = { can_view: false, can_edit: false };
      }
    }

    for (const row of permissions as any[]) {
      if (matrix[row.role] && matrix[row.role][row.menu_key]) {
        matrix[row.role][row.menu_key] = {
          can_view: Boolean(row.can_view),
          can_edit: Boolean(row.can_edit),
        };
      }
    }

    return NextResponse.json({
      success: true,
      roles: SYSTEM_ROLES,
      menus: SYSTEM_MENUS,
      matrix,
      raw: permissions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load permissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { action, permissions, role, menu_key, can_view, can_edit } = body;

    // Action 1: Reset to default
    if (action === "reset") {
      await db.execute("DELETE FROM role_permissions");
      const defaults = getDefaultPermissions();
      for (const p of defaults) {
        await db.execute({
          sql: `INSERT INTO role_permissions (role, menu_key, can_view, can_edit) VALUES (?, ?, ?, ?)`,
          args: [p.role, p.menu_key, p.can_view, p.can_edit],
        });
      }
      return NextResponse.json({ success: true, message: "Permission berhasil direset ke pengaturan default" });
    }

    // Action 2: Bulk update matrix
    if (permissions && Array.isArray(permissions)) {
      for (const item of permissions) {
        await db.execute({
          sql: `INSERT INTO role_permissions (role, menu_key, can_view, can_edit, updated_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(role, menu_key) DO UPDATE SET 
                  can_view = excluded.can_view,
                  can_edit = excluded.can_edit,
                  updated_at = CURRENT_TIMESTAMP`,
          args: [item.role, item.menu_key, item.can_view ? 1 : 0, item.can_edit ? 1 : 0],
        });
      }
      return NextResponse.json({ success: true, message: "Seluruh konfigurasi permission berhasil disimpan" });
    }

    // Action 3: Single cell toggle
    if (role && menu_key !== undefined) {
      await db.execute({
        sql: `INSERT INTO role_permissions (role, menu_key, can_view, can_edit, updated_at) 
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(role, menu_key) DO UPDATE SET 
                can_view = excluded.can_view,
                can_edit = excluded.can_edit,
                updated_at = CURRENT_TIMESTAMP`,
        args: [role, menu_key, can_view ? 1 : 0, can_edit ? 1 : 0],
      });
      return NextResponse.json({ success: true, message: `Permission ${role} - ${menu_key} berhasil diperbarui` });
    }

    return NextResponse.json({ success: false, message: "Parameter tidak lengkap" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update permissions" },
      { status: 500 }
    );
  }
}

