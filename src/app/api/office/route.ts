import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok, parseFilters, requireFields } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, location, division, status, device_type: deviceType } = parseFilters(searchParams, {
      allowed: ["search", "location", "division", "status", "device_type"],
      ignoreByKey: {
        location: ["Semua Lokasi", "ALL", "Semua"],
        division: ["Semua Divisi", "ALL", "Semua"],
        status: ["Semua Status", "ALL", "Semua"],
        device_type: ["Semua Tipe", "ALL", "Semua"],
      },
    });

    let sql = `
      SELECT o.*, m.status as ping_status, m.response_time_ms, m.last_heartbeat
      FROM office_hardware_assets o
      LEFT JOIN monitoring_devices m ON m.asset_code = o.asset_code
      WHERE 1=1
    `;
    const args: any[] = [];

    if (location) {
      sql += " AND (o.office_location = ? OR (o.office_location IS NULL AND ? = 'Head Office'))";
      args.push(location, location);
    }

    if (division) {
      sql += " AND o.division = ?";
      args.push(division);
    }

    if (status) {
      sql += " AND o.status = ?";
      args.push(status);
    }

    if (deviceType) {
      sql += " AND o.device_type = ?";
      args.push(deviceType);
    }

    if (search) {
      sql += ` AND (
        o.asset_code LIKE ? OR
        o.user_name LIKE ? OR
        o.division LIKE ? OR
        o.ip_address LIKE ? OR
        o.os LIKE ? OR
        o.motherboard LIKE ? OR
        o.processor LIKE ? OR
        o.ram LIKE ? OR
        o.hard_drive LIKE ? OR
        o.printer LIKE ? OR
        o.notes LIKE ?
      )`;
      const pattern = `%${search}%`;
      args.push(
        pattern, pattern, pattern, pattern, pattern,
        pattern, pattern, pattern, pattern, pattern, pattern
      );
    }

    sql += " ORDER BY o.item_no ASC, o.id ASC";

    const result = await db.execute({ sql, args });
    return ok(result.rows);
  } catch (error) {
    return jsonError(error, "Gagal memuat data perangkat office.");
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      asset_code,
      item_no,
      office_location = "Head Office",
      division = "MIS",
      user_name,
      os = "-",
      motherboard = "-",
      processor = "-",
      ram = "-",
      monitor = "-",
      hard_drive = "-",
      used_disk1 = "-",
      used_disk2 = "-",
      keyboard = "-",
      mouse = "-",
      printer = "-",
      ip_address = "-",
      device_type = "PC",
      status = "OPERASIONAL",
      notes = "",
    } = body;

    const { missing } = requireFields(body, ["user_name"]);

    if (missing.length > 0) {
      return fail("Nama Pengguna / Unit wajib diisi.", 400);
    }

    const finalCode = asset_code || `OFF-${division.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await db.execute({
      sql: `INSERT INTO office_hardware_assets (
              asset_code, item_no, office_location, division, user_name,
              os, motherboard, processor, ram, monitor, hard_drive,
              used_disk1, used_disk2, keyboard, mouse, printer,
              ip_address, device_type, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalCode, item_no || 99, office_location, division, user_name,
        os, motherboard, processor, ram, monitor, hard_drive,
        used_disk1, used_disk2, keyboard, mouse, printer,
        ip_address, device_type, status, notes
      ],
    });

    if (ip_address && ip_address !== "-" && (ip_address.startsWith("172.") || ip_address.startsWith("192."))) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [finalCode, ip_address, `${office_location} [${division}] - ${user_name} (${device_type})`],
      });
    }

    // Sync to master assets
    const cat = device_type === 'ROUTER' ? 'Network / Router' : (device_type === 'PABX' ? 'Lainnya' : 'Display / Monitor');
    await db.execute({
      sql: `INSERT OR REPLACE INTO assets (
              asset_code, name, category, shop_location, brand_model, serial_number, ip_address, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalCode,
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

    return NextResponse.json({ success: true, message: "Perangkat office berhasil ditambahkan!" });
  } catch (error) {
    return jsonError(error, "Gagal menambah data perangkat office.");
  }
}

