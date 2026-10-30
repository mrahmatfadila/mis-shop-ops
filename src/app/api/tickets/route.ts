import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError, ok, parseFilters, requireFields, fail } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { status, shop, urgency } = parseFilters(searchParams, {
      allowed: ["status", "shop", "urgency"],
      ignore: ["ALL"],
      ignoreByKey: {
        status: ["Semua Status", "Semua"],
        shop: ["Semua Toko", "Semua"],
        urgency: ["Semua", "Semua Urgensi"],
      },
    });

    let sql = `
      SELECT t.*, a.name as asset_name, a.category as asset_category 
      FROM tickets t
      LEFT JOIN assets a ON t.asset_code = a.asset_code
      WHERE 1=1
    `;
    const args: string[] = [];

    if (status) {
      sql += " AND t.status = ?";
      args.push(status);
    }

    if (shop) {
      sql += " AND t.shop_location = ?";
      args.push(shop);
    }

    if (urgency) {
      sql += " AND t.urgency = ?";
      args.push(urgency);
    }

    sql += " ORDER BY CASE t.status WHEN 'MENUNGGU' THEN 1 WHEN 'DIPROSES' THEN 2 ELSE 3 END, t.id DESC";

    const result = await db.execute({ sql, args });
    return ok(result.rows);
  } catch (error) {
    return jsonError(error);
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

    const { missing } = requireFields(body, [
      "asset_code",
      "reporter_name",
      "problem_title",
      "problem_desc",
    ]);

    if (missing.length > 0) {
      return fail("Aset, nama pelapor, judul, dan deskripsi masalah wajib diisi.", 400);
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
  } catch (error) {
    return jsonError(error);
  }
}
