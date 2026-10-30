import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const rack = searchParams.get("rack") || "ALL";
    const group = searchParams.get("group") || "";
    const search = searchParams.get("search") || "";

    let sql = "SELECT * FROM server_rack_ports WHERE 1=1";
    const args: any[] = [];

    if (rack && rack !== "ALL") {
      if (rack === "32U" || rack === "RACK_32U_MAIN") {
        sql += " AND (rack_type = 'RACK_32U_MAIN' OR rack_type IS NULL)";
      } else if (rack === "6U" || rack === "RACK_6U_WALLMOUNT") {
        sql += " AND rack_type = 'RACK_6U_WALLMOUNT'";
      }
    }

    if (group && group !== "ALL") {
      sql += " AND device_group = ?";
      args.push(group);
    }

    if (search) {
      sql += ` AND (
        user_name LIKE ? OR
        port_label LIKE ? OR
        patch_panel_label LIKE ? OR
        ip_address LIKE ? OR
        ext LIKE ? OR
        destination LIKE ? OR
        notes LIKE ?
      )`;
      const q = `%${search}%`;
      args.push(q, q, q, q, q, q, q);
    }

    sql += " ORDER BY port_no ASC, id ASC";

    const portsResult = await db.execute({ sql, args });

    // Ambil susunan Rack Units sesuai filter rack
    let unitsSql = "SELECT * FROM server_rack_units WHERE 1=1";
    if (rack === "32U" || rack === "RACK_32U_MAIN") {
      unitsSql += " AND (rack_type = 'RACK_32U_MAIN' OR rack_type IS NULL)";
    } else if (rack === "6U" || rack === "RACK_6U_WALLMOUNT") {
      unitsSql += " AND rack_type = 'RACK_6U_WALLMOUNT'";
    }
    unitsSql += " ORDER BY u_position DESC";
    const unitsResult = await db.execute(unitsSql);

    // Statistik Port & Network
    const allPortsResult = await db.execute("SELECT * FROM server_rack_ports");
    const allPorts = allPortsResult.rows as any[];

    // Hitung per target rak
    const targetPorts = (rack && rack !== "ALL")
      ? allPorts.filter(p => (rack === "32U" || rack === "RACK_32U_MAIN") ? (p.rack_type === "RACK_32U_MAIN" || !p.rack_type) : p.rack_type === "RACK_6U_WALLMOUNT")
      : allPorts;

    const totalPorts = targetPorts.length;
    const connectedPorts = targetPorts.filter(p => p.status === "CONNECTED").length;
    const voipPorts = targetPorts.filter(p => p.device_type === "VOIP").length;
    const pcPorts = targetPorts.filter(p => p.device_type === "PC").length;
    const uplinkPorts = targetPorts.filter(p => p.device_type === "UPLINK").length;

    // Overall summary
    const rack32Count = allPorts.filter(p => p.rack_type === "RACK_32U_MAIN" || !p.rack_type).length;
    const rack6Count = allPorts.filter(p => p.rack_type === "RACK_6U_WALLMOUNT").length;

    return NextResponse.json({
      success: true,
      ports: portsResult.rows,
      rackUnits: unitsResult.rows,
      stats: {
        totalPorts,
        connectedPorts,
        voipPorts,
        pcPorts,
        uplinkPorts,
        rack32Count,
        rack6Count
      }
    });
  } catch (error: any) {
    console.error("Error fetching server rack data:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data rak server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      rack_type,
      device_group,
      port_no,
      port_label,
      patch_panel_label = "-",
      device_type = "PC",
      user_name = "-",
      ext = "-",
      ip_address = "-",
      destination = "-",
      cable_color = "Green",
      status = "CONNECTED",
      notes = ""
    } = body;

    if (!device_group || !port_no || !port_label) {
      return NextResponse.json(
        { success: false, message: "Grup perangkat, No Port, dan Label Port wajib diisi" },
        { status: 400 }
      );
    }

    const assignedRackType = rack_type || (device_group.startsWith("WALLMOUNT_") ? "RACK_6U_WALLMOUNT" : "RACK_32U_MAIN");

    const insertResult = await db.execute({
      sql: `INSERT INTO server_rack_ports (
              rack_type, device_group, port_no, port_label, patch_panel_label, device_type,
              user_name, ext, ip_address, destination, cable_color, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        assignedRackType,
        device_group,
        Number(port_no),
        port_label,
        patch_panel_label,
        device_type,
        user_name,
        ext,
        ip_address,
        destination,
        cable_color,
        status,
        notes
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Port mapping berhasil ditambahkan",
      id: insertResult.lastInsertRowid,
    });
  } catch (error: any) {
    console.error("Error creating server rack port:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambahkan port mapping" },
      { status: 500 }
    );
  }
}

