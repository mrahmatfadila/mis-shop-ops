import { NextResponse } from "next/server";
import { checkVpnStatus } from "@/lib/ping";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vpn = await checkVpnStatus();
    return NextResponse.json({
      success: true,
      vpn,
    });
  } catch (error) {
    return jsonError(error);
  }
}

