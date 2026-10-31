import { NextResponse } from "next/server";
import { pingHost } from "@/lib/ping";
import { fail, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ip, ips } = body;

    // 1. Single IP Ping
    if (ip && typeof ip === "string") {
      const cleanIp = ip.trim();
      const realRes = await pingHost(cleanIp, 500);

      if (realRes.status === "ONLINE") {
        return NextResponse.json({
          success: true,
          ip: cleanIp,
          status: "ONLINE",
          latency: realRes.latency || 2,
          source: "real_network",
          tested_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        ip: cleanIp,
        status: "OFFLINE",
        latency: null,
        source: "real_network",
        tested_at: new Date().toISOString(),
      });
    }

    // 2. Batch Ping
    if (Array.isArray(ips) && ips.length > 0) {
      const results: Record<string, { status: "ONLINE" | "OFFLINE"; latency: number | null }> = {};
      const chunkSize = 25;
      for (let i = 0; i < ips.length; i += chunkSize) {
        const chunk = ips.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (targetIp) => {
            if (!targetIp || targetIp === "-") return;
            const res = await pingHost(targetIp, 400);
            results[targetIp] = {
              status: res.status,
              latency: res.latency,
            };
          })
        );
      }
      return NextResponse.json({
        success: true,
        results,
        tested_at: new Date().toISOString(),
      });
    }

    return fail("IP address diperlukan untuk pengujian ping", 400);
  } catch (error) {
    return jsonError(error);
  }
}
