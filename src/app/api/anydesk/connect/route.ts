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

    // 2. Luncurkan AnyDesk dengan aman
    // CATATAN KRUSIAL: Pada AnyDesk v8 dan v9+, menyuntikkan password via argumen CLI `--with-password`
    // dengan pipe stdin menyebabkan crash internal "Fatal Program Failure (Address: 0x2)" pada AnyDesk.
    // Solusi resmi & stabil: Luncurkan AnyDesk langsung ke target, dan password otomatis disalin ke clipboard
    // pengguna oleh aplikasi frontend sehingga pengguna cukup menekan Ctrl+V tanpa risiko crash.
    const child = spawn(anydeskExe, [cleanTarget], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.unref();

    return NextResponse.json({
      success: true,
      method: "CLI_SAFE",
      executable: anydeskExe,
      target: cleanTarget,
      password: cleanPassword,
      message: `AnyDesk berhasil dibuka ke ${cleanTarget}. Password (${cleanPassword}) otomatis disalin ke clipboard!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuka AnyDesk otomatis." },
      { status: 500 }
    );
  }
}
