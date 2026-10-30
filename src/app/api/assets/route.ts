import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const shop = searchParams.get("shop") || "";
    const status = searchParams.get("status") || "";

    let sql = "SELECT * FROM assets WHERE 1=1";
    const args: any[] = [];

    if (search) {
      sql += " AND (asset_code LIKE ? OR name LIKE ? OR brand_model LIKE ? OR serial_number LIKE ?)";
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern);
    }

    if (category && category !== "Semua Kategori" && category !== "ALL" && category !== "Semua") {
      sql += " AND category = ?";
      args.push(category);
    }

    if (shop && shop !== "Semua Toko" && shop !== "ALL" && shop !== "Semua") {
      sql += " AND shop_location = ?";
      args.push(shop);
    }

    if (status && status !== "Semua Status" && status !== "ALL" && status !== "Semua") {
      sql += " AND status = ?";
      args.push(status);
    }

    sql += " ORDER BY id DESC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      asset_code,
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

    if (!asset_code || !name || !category || !shop_location || !serial_number) {
      return NextResponse.json(
        { success: false, message: "Kode aset, nama, kategori, toko, dan serial number wajib diisi." },
        { status: 400 }
      );
    }

    // Cek apakah kode aset sudah ada
    const existing = await db.execute({
      sql: "SELECT id FROM assets WHERE asset_code = ?",
      args: [asset_code],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Kode aset ${asset_code} sudah terdaftar!` },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `INSERT INTO assets (asset_code, name, category, shop_location, brand_model, serial_number, ip_address, purchase_date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        asset_code,
        name,
        category,
        shop_location,
        brand_model || "-",
        serial_number,
        ip_address || null,
        purchase_date || null,
        status || "OPERASIONAL",
        notes || null,
      ],
    });

    // Jika device memiliki IP, tambahkan ke monitoring
    if (ip_address) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, response_time_ms, last_heartbeat, details)
              VALUES (?, ?, 'ONLINE', 10, datetime('now'), 'Ditambahkan dari master aset')`,
        args: [asset_code, ip_address],
      });
    }

    return NextResponse.json({ success: true, message: "Aset berhasil ditambahkan!" });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create asset" },
      { status: 500 }
    );
  }
}

