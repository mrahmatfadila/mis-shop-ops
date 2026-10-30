import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const shop = searchParams.get("shop") || "";

    let sql = "SELECT id, username, name, role, shop_location, password, created_at, updated_at FROM users WHERE 1=1";
    const args: any[] = [];

    if (search) {
      sql += " AND (LOWER(username) LIKE ? OR LOWER(name) LIKE ? OR LOWER(shop_location) LIKE ?)";
      const pattern = `%${search.toLowerCase()}%`;
      args.push(pattern, pattern, pattern);
    }

    if (role && role !== "ALL") {
      sql += " AND role = ?";
      args.push(role);
    }

    if (shop && shop !== "ALL") {
      sql += " AND shop_location LIKE ?";
      args.push(`%${shop}%`);
    }

    sql += " ORDER BY CASE role WHEN 'ADMIN' THEN 1 WHEN 'MANAGER' THEN 2 WHEN 'MIS' THEN 3 WHEN 'IT_PROCUREMENT' THEN 4 ELSE 5 END, name ASC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data pengguna." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { username, name, role, shop_location = "Semua Toko", password = "123" } = body;

    if (!username || !name || !role) {
      return NextResponse.json(
        { success: false, message: "Username / NIK, Nama Lengkap, dan Role wajib diisi!" },
        { status: 400 }
      );
    }

    const cleanUser = username.trim();

    // Check if username already exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(username) = ?",
      args: [cleanUser.toLowerCase()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Username/NIK "${cleanUser}" sudah terdaftar dalam sistem.` },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "INSERT INTO users (username, name, role, shop_location, password) VALUES (?, ?, ?, ?, ?)",
      args: [cleanUser, name.trim(), role, shop_location, password || "123"],
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna "${name}" (${cleanUser}) berhasil ditambahkan!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambahkan pengguna baru." },
      { status: 500 }
    );
  }
}

