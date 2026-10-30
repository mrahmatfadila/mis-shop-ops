import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const result = await db.execute({
      sql: `
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
        WHERE p.id = ? OR p.pos_code = ?
      `,
      args: [id, id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Data perangkat POS tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const body = await request.json();

    const {
      pos_code,
      shop_name,
      terminal,
      counter_zone,
      store_alias = "-",
      ip_address,
      pos_brand,
      pos_sn,
      processor = "-",
      ram,
      ssd,
      tsigunta_version = "-",
      passport_scanner,
      barcode_scanner,
      printer,
      fingerprint_scanner,
      keyboard,
      mouse,
      cash_drawer,
      monitor,
      os_version,
      status,
      notes,
      anydesk_id = "",
      anydesk_password = "",
    } = body;

    await db.execute({
      sql: `UPDATE pos_hardware_assets SET
              pos_code = ?,
              shop_name = ?,
              terminal = ?,
              counter_zone = ?,
              store_alias = ?,
              ip_address = ?,
              pos_brand = ?,
              pos_sn = ?,
              processor = ?,
              ram = ?,
              ssd = ?,
              tsigunta_version = ?,
              passport_scanner = ?,
              barcode_scanner = ?,
              printer = ?,
              fingerprint_scanner = ?,
              keyboard = ?,
              mouse = ?,
              cash_drawer = ?,
              monitor = ?,
              os_version = ?,
              status = ?,
              notes = ?,
              anydesk_id = ?,
              anydesk_password = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        pos_code, shop_name, terminal, counter_zone, store_alias,
        ip_address, pos_brand, pos_sn, processor, ram, ssd, tsigunta_version,
        passport_scanner, barcode_scanner, printer, fingerprint_scanner,
        keyboard, mouse, cash_drawer, monitor, os_version, status, notes,
        anydesk_id, anydesk_password,
        id
      ],
    });

    if (ip_address && ip_address !== "-") {
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, 'ONLINE', ?)`,
        args: [pos_code, ip_address, `Kasir ${pos_code} (${pos_brand}) - ${terminal}`],
      });
    }

    return NextResponse.json({ success: true, message: "Data perangkat POS berhasil diupdate!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    await db.execute({
      sql: "DELETE FROM pos_hardware_assets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Data perangkat POS berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

