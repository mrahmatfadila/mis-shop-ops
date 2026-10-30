import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError, ok, parseFilters, requireFields, fail } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, active, zone, shop } = parseFilters(searchParams, {
      allowed: ["search", "active", "zone", "shop"],
      ignore: ["ALL"],
      ignoreByKey: {
        shop: ["Semua Toko", "Semua"],
        active: ["Semua"],
        zone: ["Semua Counter"],
      },
    });

    let sql = "SELECT * FROM edc_assets WHERE 1=1";
    const args: string[] = [];

    if (shop) {
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

    if (active) {
      sql += " AND is_active = ?";
      args.push(active);
    }

    if (zone) {
      sql += " AND pos_location LIKE ?";
      args.push(`%${zone}%`);
    }

    sql += " ORDER BY id ASC";

    const result = await db.execute({ sql, args });
    return ok(result.rows);
  } catch (error) {
    return jsonError(error, "Failed to fetch EDC assets");
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

    const { missing } = requireFields(body, ["pos_location"]);

    if (missing.length > 0) {
      return fail("Kode Lokasi POS wajib diisi.", 400);
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
  } catch (error) {
    return jsonError(error);
  }
}
