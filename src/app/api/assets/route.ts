import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError, ok, parseFilters, requireFields, fail } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, category, shop, status } = parseFilters(searchParams, {
      allowed: ["search", "category", "shop", "status"],
      ignore: ["ALL"],
      ignoreByKey: {
        category: ["Semua Kategori", "Semua"],
        shop: ["Semua Toko", "Semua"],
        status: ["Semua Status", "Semua"],
      },
    });

    let sql = "SELECT * FROM assets WHERE 1=1";
    const args: string[] = [];

    if (search) {
      sql += " AND (asset_code LIKE ? OR name LIKE ? OR brand_model LIKE ? OR serial_number LIKE ?)";
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern);
    }

    if (category) {
      sql += " AND category = ?";
      args.push(category);
    }

    if (shop) {
      sql += " AND shop_location = ?";
      args.push(shop);
    }

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }

    sql += " ORDER BY id DESC";

    const result = await db.execute({ sql, args });
    return ok(result.rows);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return jsonError(error, "Failed to fetch assets");
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

    const { missing } = requireFields(body, [
      "asset_code",
      "name",
      "category",
      "shop_location",
      "serial_number",
    ]);

    if (missing.length > 0) {
      return fail(
        "Kode aset, nama, kategori, toko, dan serial number wajib diisi.",
        400
      );
    }

    // Cek apakah kode aset sudah ada
    const existing = await db.execute({
      sql: "SELECT id FROM assets WHERE asset_code = ?",
      args: [asset_code],
    });

    if (existing.rows.length > 0) {
      return fail(`Kode aset ${asset_code} sudah terdaftar!`, 400);
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
  } catch (error) {
    console.error("Error creating asset:", error);
    return jsonError(error, "Failed to create asset");
  }
}
