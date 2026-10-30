import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const body = await request.json();
    const { status, it_notes, asset_status } = body;

    const resolvedAt = status === "SELESAI" ? new Date().toISOString() : null;

    await db.execute({
      sql: `UPDATE tickets SET
              status = ?,
              it_notes = ?,
              resolved_at = COALESCE(?, resolved_at)
            WHERE id = ?`,
      args: [status, it_notes || null, resolvedAt, id],
    });

    // Ambil info tiket untuk tahu asetnya
    const ticketRow = await db.execute({
      sql: "SELECT asset_code FROM tickets WHERE id = ?",
      args: [id],
    });

    if (ticketRow.rows.length > 0 && asset_status) {
      await db.execute({
        sql: "UPDATE assets SET status = ? WHERE asset_code = ?",
        args: [asset_status, ticketRow.rows[0].asset_code],
      });
    }

    return NextResponse.json({ success: true, message: "Status tiket berhasil diupdate!" });
  } catch (error) {
    return jsonError(error);
  }
}

