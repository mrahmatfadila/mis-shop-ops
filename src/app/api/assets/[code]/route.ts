import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const code = decodeURIComponent(params.code);

    const result = await db.execute({
      sql: "SELECT * FROM assets WHERE asset_code = ? OR serial_number = ?",
      args: [code, code],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aset tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil juga riwayat tiket dari aset ini jika ada
    const tickets = await db.execute({
      sql: "SELECT * FROM tickets WHERE asset_code = ? ORDER BY id DESC LIMIT 5",
      args: [result.rows[0].asset_code as string],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      tickets: tickets.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const code = decodeURIComponent(params.code);
    const body = await request.json();

    const {
      name,
      category,
      shop_location,
      brand_model,
      serial_number,
      ip_address,
      purchase_date,
      status,
      notes,
    } = body;

    await db.execute({
      sql: `UPDATE assets SET
              name = ?,
              category = ?,
              shop_location = ?,
              brand_model = ?,
              serial_number = ?,
              ip_address = ?,
              purchase_date = ?,
              status = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE asset_code = ?`,
      args: [
        name,
        category,
        shop_location,
        brand_model,
        serial_number,
        ip_address || null,
        purchase_date || null,
        status,
        notes || null,
        code,
      ],
    });

    // Update monitoring device jika IP diubah
    if (ip_address) {
      await db.execute({
        sql: `INSERT INTO monitoring_devices (asset_code, ip_address, status, last_heartbeat)
              VALUES (?, ?, 'ONLINE', datetime('now'))
              ON CONFLICT(asset_code) DO UPDATE SET ip_address = excluded.ip_address`,
        args: [code, ip_address],
      });
    }

    return NextResponse.json({ success: true, message: "Aset berhasil diperbarui!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const code = decodeURIComponent(params.code);

    await db.execute({
      sql: "DELETE FROM assets WHERE asset_code = ?",
      args: [code],
    });

    await db.execute({
      sql: "DELETE FROM monitoring_devices WHERE asset_code = ?",
      args: [code],
    });

    return NextResponse.json({ success: true, message: "Aset berhasil dihapus!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

