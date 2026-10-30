import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, requireFields } from "@/lib/api";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { asset_code, ip_address, response_time_ms = 5, details = "Active Ping" } = body;

    const { missing } = requireFields(body, ["asset_code"]);

    if (missing.length > 0) {
      return fail("asset_code is required", 400);
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
  } catch (error) {
    return jsonError(error);
  }
}

