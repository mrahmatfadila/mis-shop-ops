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
      sql: "SELECT * FROM t3_fixed_assets WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return fail("Aset T3 tidak ditemukan", 404);
    }

    return ok(result.rows[0]);
  } catch (error) {
    console.error("Error fetching T3 asset by id:", error);
    return jsonError(error, "Gagal mengambil data aset");
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
      tgl_perolehan,
      tgl_pemakaian,
      kategori,
      nama_merk,
      serial_number,
      spesifikasi,
      lokasi,
      pengguna,
      harga_pembelian,
      qty,
      no_asset,
      keterangan,
      status
    } = body;

    await db.execute({
      sql: `UPDATE t3_fixed_assets SET
              item_no = COALESCE(?, item_no),
              tgl_perolehan = COALESCE(?, tgl_perolehan),
              tgl_pemakaian = COALESCE(?, tgl_pemakaian),
              kategori = COALESCE(?, kategori),
              nama_merk = COALESCE(?, nama_merk),
              serial_number = COALESCE(?, serial_number),
              spesifikasi = COALESCE(?, spesifikasi),
              lokasi = COALESCE(?, lokasi),
              pengguna = COALESCE(?, pengguna),
              harga_pembelian = COALESCE(?, harga_pembelian),
              qty = COALESCE(?, qty),
              no_asset = COALESCE(?, no_asset),
              keterangan = COALESCE(?, keterangan),
              status = COALESCE(?, status),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        item_no !== undefined ? Number(item_no) : null,
        tgl_perolehan || null,
        tgl_pemakaian || null,
        kategori || null,
        nama_merk || null,
        serial_number || null,
        spesifikasi || null,
        lokasi || null,
        pengguna || null,
        harga_pembelian !== undefined ? Number(harga_pembelian) : null,
        qty !== undefined ? Number(qty) : null,
        no_asset || null,
        keterangan !== undefined ? keterangan : null,
        status || null,
        id
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Data aset T3 berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating T3 asset:", error);
    return jsonError(error, "Gagal memperbarui data aset");
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
      sql: "DELETE FROM t3_fixed_assets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Data aset T3 berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting T3 asset:", error);
    return jsonError(error, "Gagal menghapus data aset");
  }
}

