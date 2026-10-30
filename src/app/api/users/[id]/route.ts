import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const result = await db.execute({
      sql: "SELECT id, username, name, role, shop_location, password, created_at, updated_at FROM users WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return fail("Pengguna tidak ditemukan.", 404);
    }

    return ok(result.rows[0]);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const body = await request.json();
    const { name, role, shop_location, password } = body;

    // Check if user exists
    const existing = await db.execute({
      sql: "SELECT id, username FROM users WHERE id = ?",
      args: [id],
    });

    if (existing.rows.length === 0) {
      return fail("Pengguna tidak ditemukan.", 404);
    }

    const current = existing.rows[0];

    // If password is provided, update it; otherwise keep current password
    if (password && password.trim() !== "") {
      await db.execute({
        sql: "UPDATE users SET name = ?, role = ?, shop_location = ?, password = ? WHERE id = ?",
        args: [name.trim(), role, shop_location || "Semua Toko", password.trim(), id],
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET name = ?, role = ?, shop_location = ? WHERE id = ?",
        args: [name.trim(), role, shop_location || "Semua Toko", id],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Data pengguna "${name}" (${current.username}) berhasil diperbarui!`,
    });
  } catch (error) {
    return jsonError(error, "Gagal memperbarui pengguna.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;

    // Get user info first
    const existing = await db.execute({
      sql: "SELECT id, username FROM users WHERE id = ?",
      args: [id],
    });

    if (existing.rows.length === 0) {
      return fail("Pengguna tidak ditemukan.", 404);
    }

    const user = existing.rows[0];

    // Protect superadmin account
    if (user.username === "admin") {
      return fail("Akun Super Administrator 'admin' tidak dapat dihapus!", 403);
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${user.username} berhasil dihapus dari sistem!`,
    });
  } catch (error) {
    return jsonError(error, "Gagal menghapus pengguna.");
  }
}

