import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const result = await db.execute({
      sql: "SELECT * FROM edc_assets WHERE id = ? OR pos_location = ?",
      args: [id, id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Data EDC tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
      pos_location,
      shop_name,
      is_active,
      bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
      bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
      mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
      bri_credit, bri_debit, bri_qr, bri_tid, bri_mid,
      notes,
    } = body;

    await db.execute({
      sql: `UPDATE edc_assets SET
              pos_location = ?,
              shop_name = ?,
              is_active = ?,
              bca_credit = ?, bca_debit = ?, bca_qr = ?, bca_tid = ?, bca_mid = ?,
              bni_credit = ?, bni_debit = ?, bni_qr = ?, bni_tid = ?, bni_mid = ?,
              mandiri_credit = ?, mandiri_debit = ?, mandiri_qr = ?, mandiri_tid = ?, mandiri_mid = ?,
              bri_credit = ?, bri_debit = ?, bri_qr = ?, bri_tid = ?, bri_mid = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        pos_location, shop_name, is_active,
        bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
        bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
        mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
        bri_credit, bri_debit, bri_qr, bri_tid, bri_mid,
        notes, id,
      ],
    });

    return NextResponse.json({ success: true, message: "Data EDC berhasil diperbarui!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
      sql: "DELETE FROM edc_assets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Data EDC berhasil dihapus!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

