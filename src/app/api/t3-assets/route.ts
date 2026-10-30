import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, parseFilters, requireFields } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, lokasi, kategori, status } = parseFilters(searchParams, {
      allowed: ["search", "lokasi", "kategori", "status"],
      ignoreByKey: {
        lokasi: ["ALL", "Semua Lokasi"],
        kategori: ["ALL", "Semua Kategori", "Semua"],
        status: ["ALL", "Semua Status", "Semua"],
      },
    });

    let sql = "SELECT * FROM t3_fixed_assets WHERE 1=1";
    const args: any[] = [];

    if (lokasi) {
      sql += " AND lokasi = ?";
      args.push(lokasi);
    }

    if (kategori) {
      sql += " AND kategori = ?";
      args.push(kategori);
    }

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }

    if (search) {
      sql += ` AND (
        no_asset LIKE ? OR
        nama_merk LIKE ? OR
        serial_number LIKE ? OR
        spesifikasi LIKE ? OR
        pengguna LIKE ? OR
        keterangan LIKE ?
      )`;
      const q = `%${search}%`;
      args.push(q, q, q, q, q, q);
    }

    sql += " ORDER BY item_no ASC, id ASC";

    const result = await db.execute({ sql, args });

    // Hitung ringkasan statistik
    const allAssetsResult = await db.execute("SELECT * FROM t3_fixed_assets");
    const allAssets = allAssetsResult.rows as any[];

    const totalAssets = allAssets.length;
    const totalNilai = allAssets.reduce((sum, a) => sum + (Number(a.harga_pembelian) || 0) * (Number(a.qty) || 1), 0);
    const totalQty = allAssets.reduce((sum, a) => sum + (Number(a.qty) || 1), 0);
    const operationalCount = allAssets.filter(a => a.status === "OPERASIONAL").length;

    const countByLocation: Record<string, number> = {
      DF1: 0, DF2: 0, DF3: 0, DF4: 0, DF5: 0, DF6: 0, DF7: 0
    };
    allAssets.forEach(a => {
      if (countByLocation[a.lokasi] !== undefined) {
        countByLocation[a.lokasi]++;
      }
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: {
        totalAssets,
        totalNilai,
        totalQty,
        operationalCount,
        countByLocation
      }
    });
  } catch (error) {
    console.error("Error fetching T3 fixed assets:", error);
    return jsonError(error, "Gagal mengambil data aset T3-DF");
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      tgl_perolehan = new Date().toISOString().split("T")[0],
      tgl_pemakaian = new Date().toISOString().split("T")[0],
      kategori,
      nama_merk,
      serial_number = "-",
      spesifikasi = "-",
      lokasi = "DF1",
      pengguna = "Kasir",
      harga_pembelian = 0,
      qty = 1,
      keterangan = "",
      status = "OPERASIONAL"
    } = body;

    const { missing } = requireFields(body, ["kategori", "nama_merk"]);

    if (missing.length > 0) {
      return fail("Kategori dan Nama/Merk wajib diisi", 400);
    }

    // Hitung item_no & auto-generate no_asset jika belum ada
    const maxRow = await db.execute("SELECT MAX(item_no) as max_no, COUNT(*) as total FROM t3_fixed_assets");
    const nextItemNo = (Number((maxRow.rows[0] as any)?.max_no) || 0) + 1;

    let finalNoAsset = body.no_asset;
    if (!finalNoAsset) {
      const locAssets = await db.execute({
        sql: "SELECT COUNT(*) as count FROM t3_fixed_assets WHERE lokasi = ?",
        args: [lokasi]
      });
      const seq = (Number((locAssets.rows[0] as any)?.count) || 0) + 1;
      finalNoAsset = `AST-MIS-T3-${lokasi}-${String(seq).padStart(3, "0")}`;
    }

    const insertResult = await db.execute({
      sql: `INSERT INTO t3_fixed_assets (
              item_no, tgl_perolehan, tgl_pemakaian, kategori,
              nama_merk, serial_number, spesifikasi, lokasi,
              pengguna, harga_pembelian, qty, no_asset, keterangan, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nextItemNo,
        tgl_perolehan,
        tgl_pemakaian,
        kategori,
        nama_merk,
        serial_number,
        spesifikasi,
        lokasi,
        pengguna,
        Number(harga_pembelian) || 0,
        Number(qty) || 1,
        finalNoAsset,
        keterangan,
        status
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Aset T3-DF berhasil ditambahkan",
      id: insertResult.lastInsertRowid,
      no_asset: finalNoAsset
    });
  } catch (error) {
    console.error("Error creating T3 fixed asset:", error);
    return jsonError(error, "Gagal menambahkan aset T3-DF");
  }
}

