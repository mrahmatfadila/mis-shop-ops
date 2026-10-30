import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok, parseFilters, requireFields } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, status, location, category, priority } = parseFilters(
      searchParams,
      {
        allowed: ["search", "status", "location", "category", "priority"],
        ignoreByKey: {
          status: ["ALL", "Semua Status", "Semua"],
          location: ["ALL", "Semua Lokasi", "Semua"],
          category: ["ALL", "Semua Kategori", "Semua"],
          priority: ["ALL", "Semua Prioritas", "Semua"],
        },
      }
    );

    let sql = "SELECT * FROM purchases WHERE 1=1";
    const args: any[] = [];

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }

    if (location) {
      sql += " AND target_location = ?";
      args.push(location);
    }

    if (category) {
      sql += " AND category = ?";
      args.push(category);
    }

    if (priority) {
      sql += " AND priority = ?";
      args.push(priority);
    }

    if (search) {
      sql += ` AND (
        po_number LIKE ? OR
        item_name LIKE ? OR
        vendor LIKE ? OR
        target_location LIKE ? OR
        requester LIKE ? OR
        notes LIKE ?
      )`;
      const q = `%${search}%`;
      args.push(q, q, q, q, q, q);
    }

    sql += " ORDER BY id DESC";

    const result = await db.execute({ sql, args });

    return ok(result.rows);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return jsonError(error, "Failed to fetch purchases");
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      item_name,
      category,
      target_location,
      quantity = 1,
      unit = "Unit",
      estimated_price = 0,
      total_price,
      vendor = "-",
      request_date = new Date().toISOString().split("T")[0],
      purchase_date = null,
      received_date = null,
      requester = "MIS IT Support",
      status = "PENGAJUAN",
      priority = "BIASA",
      notes = "",
      component_type = "-",
      serial_number = "-",
      target_pos_code = "-",
      installed_pos_code = "-",
      installed_at = null,
      installed_by = "-",
      capex_number = "-",
      brand_model = "-",
      item_price = 0,
      store_type = "ONLINE_SHOP",
      store_name = "-",
      store_link = "-",
      invoice_url = "-",
      arrival_date = null,
      shipped_to_t3_date = null,
      shipping_courier = "-",
      received_by_t3_at = null,
      manager_approved_at = null,
      manager_approved_by = "-",
      manager_notes = "-",
    } = body;

    const { missing } = requireFields(body, [
      "item_name",
      "category",
      "target_location",
    ]);

    if (missing.length > 0) {
      return fail("Nama barang, kategori, dan lokasi target wajib diisi.", 400);
    }

    // Auto-generate PO Number if not provided
    let poNumber = body.po_number;
    if (!poNumber) {
      const year = new Date().getFullYear();
      const countRes = await db.execute("SELECT COUNT(*) as c FROM purchases");
      const nextNum = (countRes.rows[0].c as number) + 1;
      poNumber = `PO-${year}-${String(nextNum).padStart(3, "0")}`;
    }

    const calcTotal = total_price !== undefined ? total_price : Number(estimated_price) * Number(quantity);

    const result = await db.execute({
      sql: `INSERT INTO purchases (
              po_number, item_name, category, target_location,
              quantity, unit, estimated_price, total_price, vendor,
              request_date, purchase_date, received_date, requester,
              status, priority, notes, component_type, serial_number,
              target_pos_code, installed_pos_code, installed_at, installed_by,
              capex_number, brand_model, item_price, store_type, store_name,
              store_link, invoice_url, arrival_date, shipped_to_t3_date,
              shipping_courier, received_by_t3_at, manager_approved_at,
              manager_approved_by, manager_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        poNumber,
        item_name,
        category,
        target_location,
        Number(quantity),
        unit,
        Number(estimated_price),
        Number(calcTotal),
        vendor,
        request_date,
        purchase_date,
        received_date,
        requester,
        status,
        priority,
        notes,
        component_type,
        serial_number,
        target_pos_code,
        installed_pos_code,
        installed_at,
        installed_by,
        capex_number,
        brand_model,
        Number(item_price || 0),
        store_type,
        store_name,
        store_link,
        invoice_url,
        arrival_date,
        shipped_to_t3_date,
        shipping_courier,
        received_by_t3_at,
        manager_approved_at,
        manager_approved_by,
        manager_notes,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan pembelian berhasil dibuat.",
      id: Number(result.lastInsertRowid),
      po_number: poNumber,
    });
  } catch (error) {
    console.error("Error creating purchase:", error);
    return jsonError(error, "Failed to create purchase");
  }
}

