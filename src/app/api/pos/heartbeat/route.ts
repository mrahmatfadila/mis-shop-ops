import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { asset_code, ip_address, response_time_ms = 5, details = "Active Ping" } = body;

    if (!asset_code) {
      return NextResponse.json(
        { success: false, message: "asset_code is required" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `INSERT INTO monitoring_devices (asset_code, ip_address, status, response_time_ms, last_heartbeat, details)
            VALUES (?, ?, 'ONLINE', ?, datetime('now'), ?)
            ON CONFLICT(asset_code) DO UPDATE SET
              status = 'ONLINE',
              ip_address = COALESCE(excluded.ip_address, monitoring_devices.ip_address),
              response_time_ms = excluded.response_time_ms,
              last_heartbeat = datetime('now'),
              details = excluded.details`,
      args: [asset_code, ip_address || "0.0.0.0", response_time_ms, details],
    });

    return NextResponse.json({
      success: true,
      message: `Heartbeat received from ${asset_code}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

