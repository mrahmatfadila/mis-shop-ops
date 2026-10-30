import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const shop = searchParams.get("shop") || "";
    const terminal = searchParams.get("terminal") || "";
    const zone = searchParams.get("zone") || "";
    const brand = searchParams.get("brand") || "";
    const status = searchParams.get("status") || "";

    let sql = `
      SELECT 
        p.id,
        p.pos_number,
        p.counter_no,
        p.pos_code,
        p.shop_name,
        p.terminal,
        p.counter_zone,
        COALESCE(NULLIF(p.store_alias, ''), '-') as store_alias,
        p.ip_address,
        p.pos_brand,
        p.pos_sn,
        p.processor,
        p.ram,
        p.ssd,
        p.tsigunta_version,
        p.passport_scanner,
        p.barcode_scanner,
        p.printer,
        p.fingerprint_scanner,
        p.keyboard,
        p.mouse,
        p.cash_drawer,
        p.monitor,
        p.os_version,
        p.status,
        p.notes,
        p.created_at,
        p.updated_at,
        COALESCE(NULLIF(e.bca_tid, ''), '-') as bca_tid,
        COALESCE(NULLIF(e.bca_mid, ''), '-') as bca_mid,
        COALESCE(NULLIF(e.bca_credit, ''), '-') as bca_credit,
        COALESCE(NULLIF(e.bca_debit, ''), '-') as bca_debit,
        COALESCE(NULLIF(e.bca_qr, ''), '-') as bca_qr,
        COALESCE(NULLIF(e.bni_tid, ''), '-') as bni_tid,
        COALESCE(NULLIF(e.bni_mid, ''), '-') as bni_mid,
        COALESCE(NULLIF(e.bni_credit, ''), '-') as bni_credit,
        COALESCE(NULLIF(e.bni_debit, ''), '-') as bni_debit,
        COALESCE(NULLIF(e.bni_qr, ''), '-') as bni_qr,
        COALESCE(NULLIF(e.mandiri_tid, ''), '-') as mandiri_tid,
        COALESCE(NULLIF(e.mandiri_mid, ''), '-') as mandiri_mid,
        COALESCE(NULLIF(e.mandiri_credit, ''), '-') as mandiri_credit,
        COALESCE(NULLIF(e.mandiri_debit, ''), '-') as mandiri_debit,
        COALESCE(NULLIF(e.mandiri_qr, ''), '-') as mandiri_qr,
        COALESCE(NULLIF(e.bri_tid, ''), '-') as bri_tid,
        COALESCE(NULLIF(e.bri_mid, ''), '-') as bri_mid,
        COALESCE(NULLIF(e.bri_credit, ''), '-') as bri_credit,
        COALESCE(NULLIF(e.bri_debit, ''), '-') as bri_debit,
        COALESCE(NULLIF(e.bri_qr, ''), '-') as bri_qr
      FROM pos_hardware_assets p
      LEFT JOIN edc_assets e ON (
        UPPER(TRIM(e.pos_location)) = UPPER(TRIM(p.pos_code))
        OR (p.pos_code = 'CGKT3DFD04-P13' AND e.pos_location = 'CGKT3DFD05-P13')
        OR (p.pos_code = 'CGKT3DFD04-P14' AND e.pos_location = 'CGKT3DFD05-P14')
        OR (p.pos_code = 'CGKT2SSR01-P01' AND e.pos_location = 'CGKT2SRR01-P01')
        OR (p.pos_code = 'CGKT2SSR01-P90' AND e.pos_location = 'CGKT2SRR01-P90')
      )
      WHERE 1=1
    `;
    const args: any[] = [];

    if (shop && shop !== "Semua Toko" && shop !== "ALL" && shop !== "Semua") {
      sql += " AND p.shop_name = ?";
      args.push(shop);
    }

    if (terminal && terminal !== "Semua Terminal" && terminal !== "Semua Terminal / Lokasi" && terminal !== "ALL") {
      if (terminal.toLowerCase().includes("surabaya")) {
        sql += " AND p.terminal LIKE 'Surabaya%'";
      } else {
        sql += " AND p.terminal = ?";
        args.push(terminal);
      }
    }

    if (zone && zone !== "Semua Counter Kasir" && zone !== "Semua Zona" && zone !== "ALL") {
      sql += " AND p.counter_zone = ?";
      args.push(zone);
    }

    if (brand && brand !== "Semua Brand Unit POS" && brand !== "Semua Brand" && brand !== "ALL") {
      sql += " AND p.pos_brand = ?";
      args.push(brand);
    }

    if (status && status !== "ALL" && status !== "Semua Status" && status !== "Semua") {
      sql += " AND p.status = ?";
      args.push(status);
    }

    if (search) {
      sql += ` AND (
        p.pos_code LIKE ? OR
        p.store_alias LIKE ? OR
        p.ip_address LIKE ? OR
        p.pos_brand LIKE ? OR
        p.passport_scanner LIKE ? OR
        p.barcode_scanner LIKE ? OR
        p.printer LIKE ? OR
        p.fingerprint_scanner LIKE ? OR
        p.keyboard LIKE ? OR
        p.mouse LIKE ? OR
        p.os_version LIKE ? OR
        p.processor LIKE ? OR
        p.tsigunta_version LIKE ? OR
        e.bca_tid LIKE ? OR
        e.bri_tid LIKE ?
      )`;
      const pattern = `%${search}%`;
      args.push(
        pattern, pattern, pattern, pattern, pattern,
        pattern, pattern, pattern, pattern, pattern,
        pattern, pattern, pattern, pattern, pattern
      );
    }

    sql += " ORDER BY p.shop_name ASC, p.counter_zone ASC, p.pos_code ASC, p.pos_number ASC";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data perangkat POS." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      pos_number,
      counter_no = 1,
      pos_code,
      shop_name = "Plaza Bali",
      terminal = "Terminal 3",
      counter_zone = "DFD01",
      store_alias = "Toko DF1",
      ip_address = "-",
      pos_brand = "NCR",
      pos_sn = "-",
      processor = "-",
      ram = "-",
      ssd = "-",
      tsigunta_version = "-",
      passport_scanner = "-",
      barcode_scanner = "HONEYWELL",
      printer = "EPSON TM-U220D",
      fingerprint_scanner = "-",
      keyboard = "LOGITECH",
      mouse = "LOGITECH",
      cash_drawer = "PANDA",
      monitor = "-",
      os_version = "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status = "OPERASIONAL",
      notes = "",
    } = body;

    if (!pos_code) {
      return NextResponse.json(
        { success: false, message: "Kode Pos (pos_code) wajib diisi." },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `INSERT INTO pos_hardware_assets (
              pos_number, counter_no, pos_code, shop_name, terminal, counter_zone, store_alias,
              ip_address, pos_brand, pos_sn, processor, ram, ssd, tsigunta_version,
              passport_scanner, barcode_scanner, printer, fingerprint_scanner,
              keyboard, mouse, cash_drawer, monitor, os_version, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pos_number || 99, counter_no, pos_code, shop_name, terminal, counter_zone, store_alias,
        ip_address, pos_brand, pos_sn, processor, ram, ssd, tsigunta_version,
        passport_scanner, barcode_scanner, printer, fingerprint_scanner,
        keyboard, mouse, cash_drawer, monitor, os_version, status, notes
      ],
    });

    if (ip_address && ip_address !== "-") {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [pos_code, ip_address, `Kasir ${pos_code} (${pos_brand}) - ${terminal}`],
      });
    }

    return NextResponse.json({ success: true, message: "Data perangkat POS berhasil ditambahkan!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambah data perangkat POS." },
      { status: 500 }
    );
  }
}

