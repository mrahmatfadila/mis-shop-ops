import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const nets = os.networkInterfaces();
    const ips: Array<{ iface: string; ip: string; isVpn: boolean }> = [];

    for (const name of Object.keys(nets)) {
      const netList = nets[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === "IPv4" && !net.internal) {
          const lowerName = name.toLowerCase();
          const isVpn =
            lowerName.includes("vpn") ||
            lowerName.includes("wireguard") ||
            lowerName.includes("tun") ||
            lowerName.includes("tap") ||
            lowerName.includes("ppp") ||
            net.address.startsWith("10.") ||
            (net.address.startsWith("172.") &&
              parseInt(net.address.split(".")[1], 10) >= 16 &&
              parseInt(net.address.split(".")[1], 10) <= 31);

          ips.push({
            iface: name,
            ip: net.address,
            isVpn,
          });
        }
      }
    }

    // Sort: VPN interfaces first, then Wi-Fi / Ethernet
    ips.sort((a, b) => (b.isVpn ? 1 : 0) - (a.isVpn ? 1 : 0));

    const hostHeader = req.headers.get("host") || "localhost:3000";
    const port = hostHeader.includes(":") ? hostHeader.split(":")[1] : "3000";

    return NextResponse.json({
      success: true,
      ips,
      primaryIp: ips.length > 0 ? ips[0].ip : "127.0.0.1",
      port,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      ips: [],
      primaryIp: "127.0.0.1",
      port: "3000",
    });
  }
}
