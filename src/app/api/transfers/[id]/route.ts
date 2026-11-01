import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    const res = await db.execute({
      sql: `SELECT * FROM asset_transfers WHERE id = ? OR transfer_code = ? LIMIT 1`,
      args: [id, id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data mutasi / pemindahan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data transfer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    const res = await db.execute({
      sql: `DELETE FROM asset_transfers WHERE id = ? OR transfer_code = ?`,
      args: [id, id],
    });

    return NextResponse.json({
      success: true,
      message: "Data riwayat mutasi berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus riwayat mutasi" },
      { status: 500 }
    );
  }
}
