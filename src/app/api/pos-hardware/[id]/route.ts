import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok } from "@/lib/api";

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
          COALESCE(NULLIF(p.ups, ''), '-') as ups,
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
      return fail("Data perangkat POS tidak ditemukan", 404);
    }

    return ok(result.rows[0]);
  } catch (error) {
    return jsonError(error);
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
      ups = "-",
      status,
      notes,
      anydesk_id = "",
      anydesk_password = "",
      bca_tid,
      bca_mid,
      bni_tid,
      bni_mid,
      mandiri_tid,
      mandiri_mid,
      bri_tid,
      bri_mid,
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
              ups = ?,
              status = ?,
              notes = ?,
              anydesk_id = ?,
              anydesk_password = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? OR pos_code = ?`,
      args: [
        pos_code, shop_name, terminal, counter_zone, store_alias,
        ip_address, pos_brand, pos_sn, processor, ram, ssd, tsigunta_version,
        passport_scanner, barcode_scanner, printer, fingerprint_scanner,
        keyboard, mouse, cash_drawer, monitor, os_version, ups, status, notes,
        anydesk_id, anydesk_password,
        id, id
      ],
    });

    // 1. Sync ke monitoring_devices
    if (ip_address && ip_address !== "-") {
      const pingStatus = status === "OPERASIONAL" ? "ONLINE" : "OFFLINE";
      await db.execute({
        sql: `INSERT OR REPLACE INTO monitoring_devices (asset_code, ip_address, status, details)
              VALUES (?, ?, ?, ?)`,
        args: [pos_code, ip_address, pingStatus, `Kasir ${pos_code} (${pos_brand}) - ${terminal}`],
      });
    }

    // 2. Sync ke tabel assets master
    await db.execute({
      sql: `UPDATE assets SET
              brand_model = ?,
              serial_number = ?,
              ip_address = ?,
              status = ?,
              shop_location = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE asset_code = ?`,
      args: [pos_brand, pos_sn, ip_address, status, shop_name, notes, pos_code],
    });

    // 3. Sync ke edc_assets jika ada perubahan data EDC Bank
    if (bca_tid !== undefined || bni_tid !== undefined || mandiri_tid !== undefined || bri_tid !== undefined) {
      const edcExists = await db.execute({
        sql: `SELECT id FROM edc_assets WHERE UPPER(TRIM(pos_location)) = UPPER(TRIM(?))`,
        args: [pos_code],
      });

      if (edcExists.rows.length > 0) {
        await db.execute({
          sql: `UPDATE edc_assets SET
                  bca_tid = COALESCE(?, bca_tid),
                  bca_mid = COALESCE(?, bca_mid),
                  bni_tid = COALESCE(?, bni_tid),
                  bni_mid = COALESCE(?, bni_mid),
                  mandiri_tid = COALESCE(?, mandiri_tid),
                  mandiri_mid = COALESCE(?, mandiri_mid),
                  bri_tid = COALESCE(?, bri_tid),
                  bri_mid = COALESCE(?, bri_mid),
                  shop_name = COALESCE(?, shop_name),
                  updated_at = CURRENT_TIMESTAMP
                WHERE UPPER(TRIM(pos_location)) = UPPER(TRIM(?))`,
          args: [
            bca_tid !== undefined ? bca_tid : null,
            bca_mid !== undefined ? bca_mid : null,
            bni_tid !== undefined ? bni_tid : null,
            bni_mid !== undefined ? bni_mid : null,
            mandiri_tid !== undefined ? mandiri_tid : null,
            mandiri_mid !== undefined ? mandiri_mid : null,
            bri_tid !== undefined ? bri_tid : null,
            bri_mid !== undefined ? bri_mid : null,
            shop_name || null,
            pos_code,
          ],
        });
      } else if (bca_tid || bni_tid || mandiri_tid || bri_tid) {
        await db.execute({
          sql: `INSERT INTO edc_assets (
                  pos_location, shop_name, is_active,
                  bca_tid, bca_mid, bca_credit, bca_debit, bca_qr,
                  bni_tid, bni_mid, bni_credit, bni_debit, bni_qr,
                  mandiri_tid, mandiri_mid, mandiri_credit, mandiri_debit, mandiri_qr,
                  bri_tid, bri_mid, bri_credit, bri_debit, bri_qr
                ) VALUES (
                  ?, ?, 'Y',
                  ?, ?, 'Y', 'Y', 'Y',
                  ?, ?, 'Y', 'Y', 'Y',
                  ?, ?, 'Y', 'Y', 'Y',
                  ?, ?, 'Y', 'Y', 'Y'
                )`,
          args: [
            pos_code, shop_name,
            bca_tid || "-", bca_mid || "-",
            bni_tid || "-", bni_mid || "-",
            mandiri_tid || "-", mandiri_mid || "-",
            bri_tid || "-", bri_mid || "-"
          ],
        });
      }
    }

    return NextResponse.json({ success: true, message: "Data perangkat POS berhasil diupdate dan tersinkronisasi ke seluruh sistem!" });
  } catch (error) {
    return jsonError(error);
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
  } catch (error) {
    return jsonError(error);
  }
}

