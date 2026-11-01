import { exec } from "child_process";
import os from "os";
import net from "net";

export interface PingResult {
  ip: string;
  status: "ONLINE" | "OFFLINE";
  latency: number | null;
  raw?: string;
}

export interface VpnStatus {
  connected: boolean;
  vpnName: string | null;
  vpnIp: string | null;
  testedAt: string;
}

/**
 * Fast TCP probe for hosts where ICMP ping might be dropped by local Windows Defender Firewall.
 * Attempts quick connection on common Windows management / application ports (RPC 135, SMB 445, AnyDesk 7070, HTTP 80, RDP 3389).
 * Returns true if port connects OR returns ECONNREFUSED (meaning OS network stack is active and replied with TCP RST).
 */
export function tcpProbe(
  ip: string,
  ports: number[] = [135, 445, 7070, 80, 3389],
  timeoutMs = 350
): Promise<{ online: boolean; latency: number | null }> {
  const start = Date.now();
  return Promise.any(
    ports.map(
      (port) =>
        new Promise<{ online: boolean; latency: number }>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(timeoutMs);

          const cleanup = () => {
            socket.removeAllListeners();
            socket.destroy();
          };

          socket.on("connect", () => {
            const latency = Math.max(1, Date.now() - start);
            cleanup();
            resolve({ online: true, latency });
          });

          socket.on("error", (err: any) => {
            cleanup();
            reject(err);
          });

          socket.on("timeout", () => {
            cleanup();
            reject(new Error("TCP timeout"));
          });

          socket.connect(port, ip);
        })
    )
  ).catch(() => ({ online: false, latency: null }));
}

/**
 * Checks whether this Windows host currently has an active VPN connection
 * (via rasdial, L2TP, OpenVPN, WireGuard, or VPN interface IP)
 */
export function checkVpnStatus(): Promise<VpnStatus> {
  return new Promise((resolve) => {
    exec("rasdial", { timeout: 2000 }, (err, stdout) => {
      const output = stdout || "";
      const isRasdialConnected = output.includes("Connected to") && !output.includes("No connections");
      let vpnName: string | null = null;
      if (isRasdialConnected) {
        const m = output.match(/Connected to\s*\r?\n\s*([^\r\n]+)/i);
        if (m) vpnName = m[1].trim();
      }

      const ifaces = os.networkInterfaces();
      let vpnIface: string | null = null;
      let vpnIp: string | null = null;

      for (const [name, addrs] of Object.entries(ifaces)) {
        const lname = name.toLowerCase();
        for (const a of addrs || []) {
          if (a.family === "IPv4" && !a.internal) {
            const isVpnSubnet =
              lname.includes("vpn") ||
              lname.includes("ppp") ||
              lname.includes("wireguard") ||
              lname.includes("tap") ||
              lname.includes("tun") ||
              a.address.startsWith("10.") ||
              (a.address.startsWith("172.") &&
                parseInt(a.address.split(".")[1], 10) >= 16 &&
                parseInt(a.address.split(".")[1], 10) <= 31);

            if (isVpnSubnet) {
              vpnIface = name;
              vpnIp = a.address;
              break;
            }
          }
        }
      }

      const connected = isRasdialConnected || !!vpnIface;
      resolve({
        connected,
        vpnName: vpnName || vpnIface,
        vpnIp,
        testedAt: new Date().toISOString(),
      });
    });
  });
}

/**
 * Pings an IP address or hostname using system ping with fallback to TCP probe.
 * Windows: ping -n 1 -w <timeoutMs> <ip>
 * Linux/macOS: ping -c 1 -W 1 <ip>
 */
export function pingHost(ip: string, timeoutMs = 600): Promise<PingResult> {
  return new Promise((resolve) => {
    // Sanitize IP/hostname to prevent shell injection
    const cleanIp = ip.trim();
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanIp)) {
      return resolve({ ip: cleanIp, status: "OFFLINE", latency: null });
    }

    const isWindows = os.platform() === "win32";
    const command = isWindows
      ? `ping -n 1 -w ${timeoutMs} ${cleanIp}`
      : `ping -c 1 -W 1 ${cleanIp}`;

    const startTime = Date.now();
    exec(command, { timeout: timeoutMs + 1000 }, async (error, stdout) => {
      const output = stdout || "";

      if (isWindows) {
        // Windows check supporting both English and Indonesian locales
        const hasTtl = /TTL=\d+/i.test(output);
        const hasTime = /(?:time|waktu)[<=](\d+)ms/i.test(output);
        const hasReplyFromTarget =
          output.includes(`Reply from ${cleanIp}`) ||
          output.includes(`Balasan dari ${cleanIp}`);

        const hasNegativeMarker =
          output.includes("unreachable") ||
          output.includes("tidak dapat dijangkau") ||
          output.includes("timed out") ||
          output.includes("permintaan habis") ||
          output.includes("failure") ||
          output.includes("kegagalan") ||
          output.includes("could not find host") ||
          output.includes("tidak dapat menemukan host") ||
          output.includes("Transmit failed") ||
          output.includes("100% loss") ||
          output.includes("100% hilang");

        const isOnline = (hasTtl || (hasReplyFromTarget && hasTime)) && !hasNegativeMarker;

        if (isOnline) {
          const timeMatch = output.match(/(?:time|waktu)[<=](\d+)ms/i);
          const latency = timeMatch
            ? parseInt(timeMatch[1], 10)
            : Math.max(1, Date.now() - startTime);
          return resolve({
            ip: cleanIp,
            status: "ONLINE",
            latency,
          });
        }
      } else {
        // Unix check
        if (!error && output.includes(" 0% packet loss")) {
          const timeMatch = output.match(/time[=](\d+(\.\d+)?) ms/i);
          const latency = timeMatch
            ? Math.round(parseFloat(timeMatch[1]))
            : Math.max(1, Date.now() - startTime);
          return resolve({
            ip: cleanIp,
            status: "ONLINE",
            latency,
          });
        }
      }

      // If ICMP ping failed or was blocked by Windows Firewall, fallback to fast TCP probe
      try {
        const tcpRes = await tcpProbe(cleanIp, [135, 445, 7070, 80, 3389], 350);
        if (tcpRes.online) {
          return resolve({
            ip: cleanIp,
            status: "ONLINE",
            latency: tcpRes.latency || Math.max(1, Date.now() - startTime),
          });
        }
      } catch {
        // ignore fallback error
      }

      return resolve({
        ip: cleanIp,
        status: "OFFLINE",
        latency: null,
      });
    });
  });
}

/**
 * Pings multiple targets concurrently with a pool limit
 */
export async function pingPool<T extends { ip_address?: string | null }>(
  items: T[],
  concurrency = 25,
  timeoutMs = 400
): Promise<(T & PingResult)[]> {
  const results: (T & PingResult)[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      const ip = current?.ip_address?.trim() || "";
      if (!ip) {
        results.push({
          ...current,
          ip: "",
          status: "OFFLINE",
          latency: null,
        });
        continue;
      }

      const pingRes = await pingHost(ip, timeoutMs);
      results.push({
        ...current,
        ...pingRes,
      });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
