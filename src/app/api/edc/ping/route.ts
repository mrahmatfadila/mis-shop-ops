import { NextResponse } from "next/server";
import { pingHost } from "@/lib/ping";
import { fail, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ip, ips } = body;

    // Single IP Ping
    if (ip && typeof ip === "string") {
      const cleanIp = ip.trim();
      const res = await pingHost(cleanIp, 750);
      return NextResponse.json({
        success: true,
        ip: cleanIp,
        status: res.status,
        latency: res.latency,
      });
    }

    // Batch IPs Ping
    if (Array.isArray(ips) && ips.length > 0) {
      const pingPromises = ips.map(async (targetIp: string) => {
        const clean = String(targetIp).trim();
        const res = await pingHost(clean, 750);
        return {
          ip: clean,
          status: res.status,
          latency: res.latency,
        };
      });

      const resultsArray = await Promise.all(pingPromises);
      const resultsMap: Record<string, { status: "ONLINE" | "OFFLINE"; latency: number | null }> = {};
      resultsArray.forEach((r) => {
        resultsMap[r.ip] = { status: r.status, latency: r.latency };
      });

      return NextResponse.json({
        success: true,
        results: resultsMap,
      });
    }

    return fail("Parameter ip atau ips wajib disertakan", 400);
  } catch (error) {
    return jsonError(error, "Gagal melakukan ping");
  }
}

