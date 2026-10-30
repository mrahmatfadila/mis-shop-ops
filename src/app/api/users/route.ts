import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok, parseFilters, requireFields } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, role, shop } = parseFilters(searchParams, {
      allowed: ["search", "role", "shop"],
      ignoreByKey: {
        role: ["ALL"],
        shop: ["ALL"],
      },
    });

    let sql = "SELECT id, username, name, role, shop_location, password, created_at, updated_at FROM users WHERE 1=1";
    const args: any[] = [];

    if (search) {
      sql += " AND (LOWER(username) LIKE ? OR LOWER(name) LIKE ? OR LOWER(shop_location) LIKE ?)";
      const pattern = `%${search.toLowerCase()}%`;
      args.push(pattern, pattern, pattern);
    }

    if (role) {
      sql += " AND role = ?";
      args.push(role);
    }

    if (shop) {
      sql += " AND shop_location LIKE ?";
      args.push(`%${shop}%`);
    }

    sql += " ORDER BY CASE role WHEN 'ADMIN' THEN 1 WHEN 'MANAGER' THEN 2 WHEN 'MIS' THEN 3 WHEN 'IT_PROCUREMENT' THEN 4 ELSE 5 END, name ASC";

    const result = await db.execute({ sql, args });
    return ok(result.rows);
  } catch (error) {
    return jsonError(error, "Gagal memuat data pengguna.");
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { username, name, role, shop_location = "Semua Toko", password = "123" } = body;

    const { missing } = requireFields(body, ["username", "name", "role"]);

    if (missing.length > 0) {
      return fail("Username / NIK, Nama Lengkap, dan Role wajib diisi!", 400);
    }

    const cleanUser = username.trim();

    // Check if username already exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(username) = ?",
      args: [cleanUser.toLowerCase()],
    });

    if (existing.rows.length > 0) {
      return fail(`Username/NIK "${cleanUser}" sudah terdaftar dalam sistem.`, 400);
    }

    await db.execute({
      sql: "INSERT INTO users (username, name, role, shop_location, password) VALUES (?, ?, ?, ?, ?)",
      args: [cleanUser, name.trim(), role, shop_location, password || "123"],
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna "${name}" (${cleanUser}) berhasil ditambahkan!`,
    });
  } catch (error) {
    return jsonError(error, "Gagal menambahkan pengguna baru.");
  }
}

