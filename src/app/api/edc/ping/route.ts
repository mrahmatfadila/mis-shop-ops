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

    // Batch IPs Ping with safe chunking (ringan & tidak membebani CPU/jaringan)
    if (Array.isArray(ips) && ips.length > 0) {
      const cleanIps = ips.map((targetIp: string) => String(targetIp).trim()).filter(Boolean);
      const resultsMap: Record<string, { status: "ONLINE" | "OFFLINE"; latency: number | null }> = {};

      const chunkSize = 10;
      for (let i = 0; i < cleanIps.length; i += chunkSize) {
        const chunk = cleanIps.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (clean) => {
            const res = await pingHost(clean, 500);
            resultsMap[clean] = {
              status: res.status,
              latency: res.latency,
            };
          })
        );
      }

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

