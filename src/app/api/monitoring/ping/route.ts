import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { pingHost, pingPool, checkVpnStatus } from "@/lib/ping";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json().catch(() => ({}));
    const { asset_code, ip_address, asset_codes, location, all } = body;

    const vpn = await checkVpnStatus();

    // Case 1: Single target ping (instant)
    if (asset_code && ip_address) {
      const pingResult = await pingHost(ip_address, 500);
      const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);

      await db.execute({
        sql: `UPDATE monitoring_devices 
              SET status = ?, response_time_ms = ?, last_heartbeat = ? 
              WHERE asset_code = ? OR ip_address = ?`,
        args: [
          pingResult.status,
          pingResult.latency || 0,
          nowIso,
          asset_code,
          ip_address,
        ],
      });

      const payload = {
        asset_code,
        ip_address,
        status: pingResult.status,
        latency: pingResult.latency,
        last_heartbeat: nowIso,
      };

      return NextResponse.json({
        success: true,
        vpn,
        result: payload,
        data: payload,
      });
    }

    // Case 2: Batch ping (by asset_codes, by location, or all)
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
      WHERE m.ip_address IS NOT NULL AND m.ip_address != ''
    `;
    const args: any[] = [];

    if (Array.isArray(asset_codes) && asset_codes.length > 0) {
      const placeholders = asset_codes.map(() => "?").join(",");
      sql += ` AND m.asset_code IN (${placeholders})`;
      args.push(...asset_codes);
    } else if (location && location !== "Semua") {
      sql += ` AND (a.shop_location = ? OR (a.shop_location IS NULL AND ? = 'MIS IT Support'))`;
      args.push(location, location);
    }

    sql += ` ORDER BY shop_location ASC, m.asset_code ASC`;

    const queryRes = await db.execute({ sql, args });
    const devicesToPing = queryRes.rows as any[];

    if (devicesToPing.length === 0) {
      return NextResponse.json({ success: true, count: 0, vpn, results: [] });
    }

    const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);
    let pingResults: any[] = [];

    if (!vpn.connected) {
      // Jika VPN terputus, perangkat private VPN (172.x / 10.x) pasti OFFLINE
      // Hanya ping perangkat local non-VPN jika ada
      const nonVpnDevices: any[] = [];
      const offlineVpnDevices: any[] = [];

      for (const d of devicesToPing) {
        const ip = String(d.ip_address || "").trim();
        const isVpnIp =
          ip.startsWith("10.") ||
          (ip.startsWith("172.") &&
            parseInt(ip.split(".")[1] || "0", 10) >= 16 &&
            parseInt(ip.split(".")[1] || "0", 10) <= 31);

        if (isVpnIp) {
          offlineVpnDevices.push({
            ...d,
            ip,
            status: "OFFLINE",
            latency: null,
          });
        } else {
          nonVpnDevices.push(d);
        }
      }

      const testedNonVpn = nonVpnDevices.length > 0 ? await pingPool(nonVpnDevices, 15, 300) : [];
      pingResults = [...offlineVpnDevices, ...testedNonVpn];
    } else {
      // Jika VPN aktif, jalankan pingPool berkecepatan tinggi dengan 25 concurrent worker & 400ms timeout
      pingResults = await pingPool(devicesToPing, 25, 400);
    }

    // Batch update SQLite database
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

    const updatedData = pingResults.map((item) => ({
      ...item,
      status: item.status,
      latency: item.latency,
      response_time_ms: item.latency || 0,
      last_heartbeat: nowIso,
    }));

    return NextResponse.json({
      success: true,
      vpn,
      count: pingResults.length,
      onlineCount: updatedData.filter((r) => r.status === "ONLINE").length,
      offlineCount: updatedData.filter((r) => r.status === "OFFLINE").length,
      results: updatedData,
    });
  } catch (error) {
    return jsonError(error);
  }
}
