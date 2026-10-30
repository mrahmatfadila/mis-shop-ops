import { NextResponse } from "next/server";
import { pingHost } from "@/lib/ping";
import net from "net";

function checkTcpPort(host: string, port: number, timeoutMs = 1500): Promise<{ port: number; open: boolean; message?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ port, open: true });
      }
    });

    socket.on("timeout", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ port, open: false, message: "Timeout" });
      }
    });

    socket.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ port, open: false, message: err.message });
      }
    });

    try {
      socket.connect(port, host);
    } catch (err: any) {
      if (!isResolved) {
        isResolved = true;
        resolve({ port, open: false, message: err.message });
      }
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ip, http_port = 80, rtsp_port = 554, server_port = 8000 } = body;

    if (!ip) {
      return NextResponse.json({ success: false, message: "IP Address DVR wajib diisi." }, { status: 400 });
    }

    // 1. Real ICMP Ping test
    const pingResult = await pingHost(ip, 1200);

    // 2. TCP Port checks
    const [httpCheck, rtspCheck, serverCheck] = await Promise.all([
      checkTcpPort(ip, Number(http_port) || 80, 1500),
      checkTcpPort(ip, Number(rtsp_port) || 554, 1500),
      checkTcpPort(ip, Number(server_port) || 8000, 1500),
    ]);

    return NextResponse.json({
      success: true,
      ip,
      ping: pingResult,
      ports: {
        http: httpCheck,
        rtsp: rtspCheck,
        server: serverCheck,
      },
      isReachable: pingResult.status === "ONLINE" || httpCheck.open || rtspCheck.open || serverCheck.open,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

