import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const active = searchParams.get("active") || "";
    const zone = searchParams.get("zone") || "";
    const shop = searchParams.get("shop") || "";

    let sql = "SELECT * FROM edc_assets WHERE 1=1";
    const args: any[] = [];

    if (shop && shop !== "Semua Toko" && shop !== "ALL" && shop !== "Semua") {
      sql += " AND shop_name = ?";
      args.push(shop);
    }

    if (search) {
      sql += ` AND (
        pos_location LIKE ? OR
        bca_tid LIKE ? OR bca_mid LIKE ? OR
        bni_tid LIKE ? OR bni_mid LIKE ? OR
        mandiri_tid LIKE ? OR mandiri_mid LIKE ? OR
        bri_tid LIKE ? OR bri_mid LIKE ?
      )`;
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (active && active !== "ALL" && active !== "Semua") {
      sql += " AND is_active = ?";
      args.push(active);
    }

    if (zone && zone !== "ALL" && zone !== "Semua Counter") {
      sql += " AND pos_location LIKE ?";
      args.push(`%${zone}%`);
    }

    sql += " ORDER BY id ASC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch EDC assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      pos_location,
      shop_name = "Plaza Bali",
      is_active = "Y",
      bca_credit = "-", bca_debit = "-", bca_qr = "-", bca_tid = "-", bca_mid = "-",
      bni_credit = "-", bni_debit = "-", bni_qr = "-", bni_tid = "-", bni_mid = "-",
      mandiri_credit = "-", mandiri_debit = "-", mandiri_qr = "-", mandiri_tid = "-", mandiri_mid = "-",
      bri_credit = "-", bri_debit = "-", bri_qr = "-", bri_tid = "-", bri_mid = "-",
      notes = "",
    } = body;

    if (!pos_location) {
      return NextResponse.json(
        { success: false, message: "Kode Lokasi POS wajib diisi." },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `INSERT INTO edc_assets (
              pos_location, shop_name, is_active,
              bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
              bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
              mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
              bri_credit, bri_debit, bri_qr, bri_tid, bri_mid, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pos_location, shop_name, is_active,
        bca_credit, bca_debit, bca_qr, bca_tid, bca_mid,
        bni_credit, bni_debit, bni_qr, bni_tid, bni_mid,
        mandiri_credit, mandiri_debit, mandiri_qr, mandiri_tid, mandiri_mid,
        bri_credit, bri_debit, bri_qr, bri_tid, bri_mid, notes,
      ],
    });

    return NextResponse.json({ success: true, message: "Data EDC POS berhasil ditambahkan!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

