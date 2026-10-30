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
      sql: "SELECT * FROM phone_extensions WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return fail("Extension tidak ditemukan", 404);
    }

    return ok(result.rows[0]);
  } catch (error) {
    console.error("Error fetching extension by id:", error);
    return jsonError(error, "Gagal mengambil data extension");
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

    const {
      item_no,
      division,
      user_name,
      ext,
      location,
      notes,
      ip_address,
      status
    } = body;

    await db.execute({
      sql: `UPDATE phone_extensions SET
              item_no = COALESCE(?, item_no),
              division = COALESCE(?, division),
              user_name = COALESCE(?, user_name),
              ext = COALESCE(?, ext),
              location = COALESCE(?, location),
              notes = COALESCE(?, notes),
              ip_address = COALESCE(?, ip_address),
              status = COALESCE(?, status),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        item_no !== undefined ? Number(item_no) : null,
        division || null,
        user_name || null,
        ext !== undefined ? ext : null,
        location || null,
        notes !== undefined ? notes : null,
        ip_address !== undefined ? ip_address : null,
        status || null,
        id
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Data extension telepon berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating phone extension:", error);
    return jsonError(error, "Gagal memperbarui extension");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;

    await db.execute({
      sql: "DELETE FROM phone_extensions WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Data extension berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting phone extension:", error);
    return jsonError(error, "Gagal menghapus extension");
  }
}

