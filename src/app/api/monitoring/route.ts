import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError, parseFilters } from "@/lib/api";
import { pingPool, checkVpnStatus } from "@/lib/ping";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const shouldPing = searchParams.get("ping") === "true";
    const { location } = parseFilters(searchParams, {
      allowed: ["location"],
      ignoreByKey: { location: ["Semua"] },
    });

    const vpn = await checkVpnStatus();

    // Ambil data monitoring beserta nama device dan lokasi dari tabel assets & dvr_assets
    let sql = `
      SELECT 
        m.id,
        m.asset_code,
        m.ip_address,
        m.status,
        m.response_time_ms,
        m.last_heartbeat,
        COALESCE(m.details, a.name, d.location) as details,
        COALESCE(a.name, 'DVR CCTV ' || d.location) as asset_name,
        COALESCE(a.category, 'CCTV / DVR') as category,
        COALESCE(a.shop_location, 'MIS IT Support') as shop_location
      FROM monitoring_devices m
      LEFT JOIN assets a ON m.asset_code = a.asset_code
      LEFT JOIN dvr_assets d ON m.asset_code = d.asset_code
    `;
    const args: any[] = [];

    if (location) {
      sql += ` WHERE (a.shop_location = ? OR (a.shop_location IS NULL AND ? = 'MIS IT Support'))`;
      args.push(location, location);
    }

    sql += ` ORDER BY shop_location ASC, m.asset_code ASC`;

    const result = await db.execute({ sql, args });
    let rows = result.rows as any[];

    // If live ping requested via GET query parameter
    if (shouldPing && rows.length > 0) {
      const pingResults = await pingPool(rows, 25, 400);
      const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);

      for (const res of pingResults) {
        try {
          await db.execute({
            sql: `UPDATE monitoring_devices 
                  SET status = ?, response_time_ms = ?, last_heartbeat = ? 
                  WHERE asset_code = ?`,
            args: [res.status, res.latency || 0, nowIso, res.asset_code],
          });
        } catch (e) {}
      }

      rows = pingResults.map((item) => ({
        ...item,
        status: item.status,
        response_time_ms: item.latency || 0,
        last_heartbeat: nowIso,
      }));
    } else if (!vpn.connected) {
      // Jika VPN tidak aktif di host Windows ini, tandai perangkat VPN private (172.x / 10.x) sebagai OFFLINE
      rows = rows.map((item) => {
        const ip = String(item.ip_address || "").trim();
        const isPrivateVpnIp =
          ip.startsWith("10.") ||
          (ip.startsWith("172.") &&
            parseInt(ip.split(".")[1] || "0", 10) >= 16 &&
            parseInt(ip.split(".")[1] || "0", 10) <= 31);

        if (isPrivateVpnIp) {
          return {
            ...item,
            status: "OFFLINE",
            response_time_ms: 0,
          };
        }
        return item;
      });
    }

    return NextResponse.json({
      success: true,
      vpn,
      data: rows,
      totalCount: rows.length,
      onlineCount: rows.filter((r) => r.status === "ONLINE").length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
