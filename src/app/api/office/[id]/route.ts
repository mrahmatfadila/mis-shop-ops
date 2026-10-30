import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const result = await db.execute({
      sql: `
        SELECT o.*, m.status as ping_status, m.response_time_ms, m.last_heartbeat
        FROM office_hardware_assets o
        LEFT JOIN monitoring_devices m ON m.asset_code = o.asset_code
        WHERE o.id = ? OR o.asset_code = ?
      `,
      args: [id, id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Data perangkat office tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const body = await request.json();

    const {
      asset_code,
      item_no,
      office_location = "Head Office",
      division,
      user_name,
      os,
      motherboard,
      processor,
      ram,
      monitor,
      hard_drive,
      used_disk1,
      used_disk2,
      keyboard,
      mouse,
      printer,
      ip_address,
      device_type,
      status,
      notes,
    } = body;

    await db.execute({
      sql: `UPDATE office_hardware_assets SET
              asset_code = ?,
              item_no = ?,
              office_location = ?,
              division = ?,
              user_name = ?,
              os = ?,
              motherboard = ?,
              processor = ?,
              ram = ?,
              monitor = ?,
              hard_drive = ?,
              used_disk1 = ?,
              used_disk2 = ?,
              keyboard = ?,
              mouse = ?,
              printer = ?,
              ip_address = ?,
              device_type = ?,
              status = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        asset_code, item_no, office_location, division, user_name,
        os, motherboard, processor, ram, monitor, hard_drive,
        used_disk1, used_disk2, keyboard, mouse, printer,
        ip_address, device_type, status, notes,
        id
      ],
    });

    if (ip_address && ip_address !== "-" && (ip_address.startsWith("172.") || ip_address.startsWith("192."))) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [asset_code, ip_address, `${office_location} [${division}] - ${user_name} (${device_type})`],
      });
    }

    // Sync to master assets
    const cat = device_type === 'ROUTER' ? 'Network / Router' : (device_type === 'PABX' ? 'Lainnya' : 'Display / Monitor');
    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        asset_code,
        `Perangkat Office ${user_name}`,
        cat,
        office_location,
        motherboard !== '-' ? `${motherboard} / ${processor}` : device_type,
        "-",
        ip_address !== "-" && ip_address.startsWith("172.") ? ip_address : null,
        status,
        `Divisi: ${division} | Lokasi: ${office_location} | OS: ${os} | RAM: ${ram} | Storage: ${hard_drive} | Printer: ${printer}`
      ]
    });

    return NextResponse.json({ success: true, message: "Perangkat office berhasil diperbarui!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;

    // Get asset_code first
    const item = await db.execute({
      sql: "SELECT asset_code FROM office_hardware_assets WHERE id = ?",
      args: [id],
    });

    if (item.rows.length > 0) {
      const code = item.rows[0].asset_code as string;
      await db.execute({ sql: "DELETE FROM monitoring_devices WHERE asset_code = ?", args: [code] });
      await db.execute({ sql: "DELETE FROM assets WHERE asset_code = ?", args: [code] });
    }

    await db.execute({
      sql: "DELETE FROM office_hardware_assets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Data perangkat office berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

