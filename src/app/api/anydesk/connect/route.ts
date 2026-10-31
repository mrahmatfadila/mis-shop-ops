import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Daftar path standar instalasi AnyDesk di Windows
const CANDIDATE_PATHS = [
  "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe",
  "C:\\Program Files\\AnyDesk\\AnyDesk.exe",
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "AnyDesk", "AnyDesk.exe") : "",
  process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "AnyDesk", "AnyDesk.exe") : "",
  process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "AnyDesk", "AnyDesk.exe") : "",
].filter(Boolean);

function findAnydeskPath(): string | null {
  for (const p of CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {}
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target, password = "cupcake2020", posCode = "" } = body;

    if (!target || typeof target !== "string") {
      return NextResponse.json(
        { success: false, message: "Target IP Address atau AnyDesk ID wajib diisi." },
        { status: 400 }
      );
    }

    const cleanTarget = target.trim();
    const cleanPassword = (password || "cupcake2020").trim();

    // 1. Cari file AnyDesk.exe di Windows
    const anydeskExe = findAnydeskPath();

    if (!anydeskExe) {
      return NextResponse.json({
        success: false,
        notFound: true,
        message: "File AnyDesk.exe tidak ditemukan di lokasi standar C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe.",
        target: cleanTarget,
      });
    }

    // 2. Luncurkan AnyDesk dengan parameter --with-password dan pipa password ke stdin
    // Sintaks resmi AnyDesk: echo <password> | anydesk <target> --with-password
    const args = cleanPassword ? [cleanTarget, "--with-password"] : [cleanTarget];

    const child = spawn(anydeskExe, args, {
      detached: true,
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: false,
    });

    if (cleanPassword && child.stdin) {
      child.stdin.write(cleanPassword + "\n");
      child.stdin.end();
    }

    child.unref();

    return NextResponse.json({
      success: true,
      method: "AUTO_CLI",
      executable: anydeskExe,
      target: cleanTarget,
      message: `AnyDesk berhasil dibuka ke ${cleanTarget} dan password telah otomatis diisikan oleh sistem!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuka AnyDesk otomatis." },
      { status: 500 }
    );
  }
}

