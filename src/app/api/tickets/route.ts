import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const shop = searchParams.get("shop") || "";
    const urgency = searchParams.get("urgency") || "";

    let sql = `
      SELECT t.*, a.name as asset_name, a.category as asset_category 
      FROM tickets t
      LEFT JOIN assets a ON t.asset_code = a.asset_code
      WHERE 1=1
    `;
    const args: any[] = [];

    if (status && status !== "ALL" && status !== "Semua Status" && status !== "Semua") {
      sql += " AND t.status = ?";
      args.push(status);
    }

    if (shop && shop !== "Semua Toko" && shop !== "ALL" && shop !== "Semua") {
      sql += " AND t.shop_location = ?";
      args.push(shop);
    }

    if (urgency && urgency !== "ALL" && urgency !== "Semua" && urgency !== "Semua Urgensi") {
      sql += " AND t.urgency = ?";
      args.push(urgency);
    }

    sql += " ORDER BY CASE t.status WHEN 'MENUNGGU' THEN 1 WHEN 'DIPROSES' THEN 2 ELSE 3 END, t.id DESC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      asset_code,
      shop_location,
      reporter_name,
      urgency,
      problem_title,
      problem_desc,
    } = body;

    if (!asset_code || !reporter_name || !problem_title || !problem_desc) {
      return NextResponse.json(
        { success: false, message: "Aset, nama pelapor, judul, dan deskripsi masalah wajib diisi." },
        { status: 400 }
      );
    }

    // Generate Nomor Tiket: TCK-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TCK-${dateStr}-${randomSuffix}`;

    await db.execute({
      sql: `INSERT INTO tickets (ticket_number, asset_code, shop_location, reporter_name, urgency, status, problem_title, problem_desc)
            VALUES (?, ?, ?, ?, ?, 'MENUNGGU', ?, ?)`,
      args: [
        ticketNumber,
        asset_code,
        shop_location || "Toko Cabang",
        reporter_name,
        urgency || "SEDANG",
        problem_title,
        problem_desc,
      ],
    });

    // Otomatis ubah status aset menjadi 'RUSAK' jika urgensi TINGGI / DARURAT
    if (urgency === "TINGGI" || urgency === "DARURAT") {
      await db.execute({
        sql: "UPDATE assets SET status = 'RUSAK' WHERE asset_code = ?",
        args: [asset_code],
      });
    }

    return NextResponse.json({
      success: true,
      ticket_number: ticketNumber,
      message: `Tiket bantuan ${ticketNumber} berhasil dibuat dan dikirim ke IT Support!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

