import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const region = searchParams.get("region") || "";
    const channels = searchParams.get("channels") || "";

    let sql = "SELECT * FROM dvr_assets WHERE 1=1";
    const args: any[] = [];

    if (search) {
      sql += " AND (location LIKE ? OR ip_address LIKE ? OR serial_number LIKE ? OR dvr_type LIKE ? OR harddisk LIKE ?)";
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (region && region !== "ALL" && region !== "Semua") {
      if (region === "SBY") {
        sql += " AND location LIKE 'SBY%'";
      } else if (region === "WHS") {
        sql += " AND location LIKE 'WHS%'";
      } else if (region === "JKT") {
        sql += " AND location NOT LIKE 'SBY%' AND location NOT LIKE 'WHS%'";
      }
    }

    if (channels && channels !== "ALL" && channels !== "Semua") {
      sql += " AND channels = ?";
      args.push(channels);
    }

    sql += " ORDER BY id ASC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch DVR assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      location,
      dvr_type,
      serial_number,
      harddisk,
      channels,
      camera_count,
      retention_days,
      username = "admin",
      password = "",
      ip_address,
      http_port = 80,
      rtsp_port = 554,
      server_port = 8000,
      protocol = "HIKVISION",
      channel_names = "",
      rtsp_stream_url = "",
      status = "OPERASIONAL",
      notes = "",
    } = body;

    if (!location || !dvr_type || !serial_number || !ip_address) {
      return NextResponse.json(
        { success: false, message: "Lokasi, Tipe DVR, Serial Number, dan IP Address wajib diisi." },
        { status: 400 }
      );
    }

    const code = `DVR-${location.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;

    await db.execute({
      sql: `INSERT INTO dvr_assets (
              asset_code, location, dvr_type, serial_number, harddisk, channels, camera_count, retention_days, username, password, ip_address, http_port, rtsp_port, server_port, protocol, channel_names, rtsp_stream_url, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        location,
        dvr_type,
        serial_number,
        harddisk || "-",
        channels || "8 CH",
        camera_count || "-",
        retention_days || "-",
        username,
        password,
        ip_address,
        http_port,
        rtsp_port,
        server_port,
        protocol,
        channel_names,
        rtsp_stream_url,
        status,
        notes,
      ],
    });

    // Masukkan ke monitoring
    await db.execute({
      sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, response_time_ms, last_heartbeat, details)
            VALUES (?, ?, 'ONLINE', 10, datetime('now'), ?)`,
      args: [code, ip_address, `DVR CCTV ${location}`],
    });

    return NextResponse.json({ success: true, message: "Data DVR berhasil ditambahkan!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

