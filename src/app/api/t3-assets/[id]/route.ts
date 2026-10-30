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
      sql: "SELECT * FROM t3_fixed_assets WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aset T3 tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error fetching T3 asset by id:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data aset" },
      { status: 500 }
    );
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
  } catch (error: any) {
    console.error("Error updating T3 asset:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data aset" },
      { status: 500 }
    );
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
  } catch (error: any) {
    console.error("Error deleting T3 asset:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data aset" },
      { status: 500 }
    );
  }
}

