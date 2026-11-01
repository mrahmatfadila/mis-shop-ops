import { NextResponse } from "next/server";
import { pingHost } from "@/lib/ping";
import { fail, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ip, ips, targets, status } = body;

    // 1. Single IP Ping
    if (ip && typeof ip === "string") {
      const cleanIp = ip.trim();
      const realRes = await pingHost(cleanIp, 800);

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

      // Device is unreachable / offline / VPN disconnected
      return NextResponse.json({
        success: true,
        ip: cleanIp,
        status: "OFFLINE",
        latency: null,
        source: "real_network",
        tested_at: new Date().toISOString(),
      });
    }

    // 2. Batch IPs Ping
    const targetsList: Array<{ ip: string; status?: string }> = [];

    if (Array.isArray(targets) && targets.length > 0) {
      targets.forEach((t) => {
        if (t && t.ip && t.ip !== "-") {
          targetsList.push({ ip: String(t.ip).trim(), status: t.status });
        }
      });
    } else if (Array.isArray(ips) && ips.length > 0) {
      ips.forEach((targetIp) => {
        if (targetIp && targetIp !== "-") {
          targetsList.push({ ip: String(targetIp).trim() });
        }
      });
    }

    if (targetsList.length > 0) {
      const resultsMap: Record<
        string,
        { status: "ONLINE" | "OFFLINE"; latency: number | null; tested_at: string }
      > = {};
      const nowIso = new Date().toISOString();

      const chunkSize = 20;
      for (let i = 0; i < targetsList.length; i += chunkSize) {
        const chunk = targetsList.slice(i, i + chunkSize);
        const settled = await Promise.allSettled(
          chunk.map(async (item) => {
            const clean = item.ip;
            const realRes = await pingHost(clean, 700);
            return {
              ip: clean,
              status: realRes.status,
              latency: realRes.latency,
            };
          })
        );

        for (let j = 0; j < chunk.length; j++) {
          const clean = chunk[j].ip;
          const s = settled[j];
          if (s.status === "fulfilled" && s.value.status === "ONLINE") {
            resultsMap[clean] = {
              status: "ONLINE",
              latency: s.value.latency || 2,
              tested_at: nowIso,
            };
          } else {
            resultsMap[clean] = {
              status: "OFFLINE",
              latency: null,
              tested_at: nowIso,
            };
          }
        }
      }

      const totalCount = targetsList.length;
      const onlineCount = Object.values(resultsMap).filter((r) => r.status === "ONLINE").length;

      return NextResponse.json({
        success: true,
        count: totalCount,
        onlineCount,
        offlineCount: totalCount - onlineCount,
        results: resultsMap,
      });
    }

    return fail("Parameter ip, ips, atau targets wajib disertakan", 400);
  } catch (error) {
    return jsonError(error, "Gagal melakukan ping perangkat office");
  }
}
