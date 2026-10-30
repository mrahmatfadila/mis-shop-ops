import { exec } from "child_process";
import os from "os";

export interface PingResult {
  ip: string;
  status: "ONLINE" | "OFFLINE";
  latency: number | null;
  raw?: string;
}

/**
 * Pings an IP address or hostname using system ping.
 * Windows: ping -n 1 -w <timeoutMs> <ip>
 * Linux/macOS: ping -c 1 -W 1 <ip>
 */
export function pingHost(ip: string, timeoutMs = 800): Promise<PingResult> {
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
    exec(command, { timeout: timeoutMs + 1000 }, (error, stdout) => {
      const output = stdout || "";

      if (isWindows) {
        // Windows check:
        // Must contain Reply from <cleanIp> (or matching IP)
        // AND must NOT contain unreachable, timed out, could not find host, General failure
        const hasReply =
          output.includes(`Reply from ${cleanIp}`) ||
          (output.includes("Reply from") &&
            !output.includes("Destination host unreachable") &&
            !output.includes("Request timed out") &&
            !output.includes("General failure") &&
            !output.includes("could not find host"));

        if (hasReply) {
          const timeMatch = output.match(/time[<=](\d+)ms/i);
          const latency = timeMatch ? parseInt(timeMatch[1], 10) : Math.max(1, Date.now() - startTime);
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
          const latency = timeMatch ? Math.round(parseFloat(timeMatch[1])) : Math.max(1, Date.now() - startTime);
          return resolve({
            ip: cleanIp,
            status: "ONLINE",
            latency,
          });
        }
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
  concurrency = 15,
  timeoutMs = 800
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

