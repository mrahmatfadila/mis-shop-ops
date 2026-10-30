import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username / NIK dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();

    // Query user by username/NIK
    const result = await db.execute({
      sql: "SELECT id, username, name, role, shop_location, password FROM users WHERE LOWER(username) = ?",
      args: [cleanUser],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Username / NIK tidak terdaftar dalam sistem." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Password validation:
    // 1. Password cocok dengan yang ada di DB
    // 2. Atau jika admin: password 'admin' / '123'
    // 3. Atau jika user NIK: password boleh NIK itu sendiri atau '123'
    const isDbPasswordMatch = user.password === password;
    const isAdminBypass = cleanUser === "admin" && (password === "admin" || password === "123");
    const isNikSelfMatch = password === cleanUser || password === "123";

    if (!isDbPasswordMatch && !isAdminBypass && !isNikSelfMatch) {
      return NextResponse.json(
        { success: false, message: "Password yang Anda masukkan salah!" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        shop_location: user.shop_location,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal melakukan proses login." },
      { status: 500 }
    );
  }
}
