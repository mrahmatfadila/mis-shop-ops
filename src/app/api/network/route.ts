import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError } from "@/lib/api";
import { NetworkAsset } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const deviceType = searchParams.get("device_type") || "";
    const status = searchParams.get("status") || "";

    let query = "SELECT * FROM network_assets WHERE 1=1";
    const args: any[] = [];

    if (location && location !== "ALL") {
      query += " AND location = ?";
      args.push(location);
    }

    if (deviceType && deviceType !== "ALL") {
      query += " AND device_type = ?";
      args.push(deviceType);
    }

    if (status && status !== "ALL") {
      query += " AND status = ?";
      args.push(status);
    }

    if (search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(asset_code) LIKE ? OR
        LOWER(name) LIKE ? OR
        LOWER(brand_model) LIKE ? OR
        LOWER(serial_number) LIKE ? OR
        LOWER(mac_address) LIKE ? OR
        LOWER(ip_address) LIKE ? OR
        LOWER(vlan) LIKE ? OR
        LOWER(counter_zone) LIKE ? OR
        LOWER(notes) LIKE ?
      )`;
      for (let i = 0; i < 9; i++) {
        args.push(term);
      }
    }

    query += " ORDER BY id ASC";

    const result = await db.execute({ sql: query, args });
    const items = result.rows as unknown as NetworkAsset[];

    // Calculate executive summary metrics
    const allResult = await db.execute("SELECT * FROM network_assets");
    const allItems = allResult.rows as unknown as NetworkAsset[];

    const metrics = {
      total: allItems.length,
      routers: allItems.filter((i) => i.device_type === "ROUTER").length,
      switches: allItems.filter((i) => i.device_type === "SWITCH").length,
      accessPoints: allItems.filter((i) => i.device_type === "ACCESS_POINT").length,
      modems: allItems.filter((i) => i.device_type === "MODEM" || i.device_type === "FIREWALL").length,
      operational: allItems.filter((i) => i.status === "OPERASIONAL").length,
    };

    return NextResponse.json({
      success: true,
      data: items,
      metrics,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json().catch(() => ({}));
    const {
      asset_code,
      name,
      device_type,
      brand_model,
      serial_number,
      mac_address,
      ip_address,
      subnet_mask,
      gateway,
      vlan,
      port_count,
      location,
      counter_zone,
      firmware_version,
      status,
      purchase_date,
      notes,
    } = body;

    if (!name || !device_type || !location) {
      return fail("Nama perangkat, tipe perangkat, dan lokasi wajib diisi", 400);
    }

    // Auto-generate asset code if not provided
    let finalCode = asset_code;
    if (!finalCode || !finalCode.trim()) {
      const locPrefix = location.includes("Terminal 3")
        ? "T3"
        : location.includes("Terminal 2")
        ? "T2"
        : location.includes("Warehouse")
        ? "WHS"
        : location.includes("Surabaya")
        ? "SBY"
        : "HO";
      const typePrefix =
        device_type === "ROUTER"
          ? "RTR"
          : device_type === "SWITCH"
          ? "SW"
          : device_type === "ACCESS_POINT"
          ? "AP"
          : device_type === "MODEM"
          ? "MDM"
          : "NET";
      const countRes = await db.execute("SELECT count(*) as count FROM network_assets");
      const nextSeq = String(Number(countRes.rows[0]?.count || 0) + 1).padStart(3, "0");
      finalCode = `NET-${locPrefix}-${typePrefix}-${nextSeq}`;
    }

    await db.execute({
      sql: `
        INSERT INTO network_assets (
          asset_code, name, device_type, brand_model, serial_number, mac_address,
          ip_address, subnet_mask, gateway, vlan, port_count, location,
          counter_zone, firmware_version, status, purchase_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        finalCode.trim(),
        name.trim(),
        device_type,
        brand_model || "-",
        serial_number || "-",
        mac_address || "-",
        ip_address || "-",
        subnet_mask || "255.255.255.0",
        gateway || "-",
        vlan || "-",
        port_count || "-",
        location,
        counter_zone || "-",
        firmware_version || "-",
        status || "OPERASIONAL",
        purchase_date || "-",
        notes || "-",
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Perangkat jaringan berhasil ditambahkan",
      asset_code: finalCode,
    });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return fail("Kode aset jaringan sudah digunakan oleh perangkat lain", 409);
    }
    return jsonError(error);
  }
}

