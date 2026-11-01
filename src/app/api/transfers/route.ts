import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

// Helper map component type to column name in pos_hardware_assets
function getPosColumn(compType: string): string | null {
  switch (compType?.toUpperCase()) {
    case "BARCODE_SCANNER":
      return "barcode_scanner";
    case "PRINTER":
      return "printer";
    case "PASSPORT_SCANNER":
      return "passport_scanner";
    case "MONITOR":
      return "monitor";
    case "KEYBOARD":
      return "keyboard";
    case "MOUSE":
      return "mouse";
    case "CASH_DRAWER":
      return "cash_drawer";
    case "RAM":
      return "ram";
    case "SSD":
      return "ssd";
    case "UPS":
      return "ups";
    case "POS_BRAND":
    case "PC_SET":
      return "pos_brand";
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const component = searchParams.get("component") || "";
    const status = searchParams.get("status") || "";
    const assetCode = searchParams.get("assetCode") || "";

    let sql = `SELECT * FROM asset_transfers WHERE 1=1`;
    const args: any[] = [];

    if (search) {
      sql += ` AND (
        transfer_code LIKE ? 
        OR item_name LIKE ? 
        OR source_asset_code LIKE ? 
        OR dest_asset_code LIKE ? 
        OR source_location LIKE ? 
        OR dest_location LIKE ? 
        OR performed_by LIKE ?
        OR reason LIKE ?
      )`;
      const q = `%${search}%`;
      args.push(q, q, q, q, q, q, q, q);
    }

    if (type && type !== "ALL") {
      sql += ` AND transfer_type = ?`;
      args.push(type);
    }

    if (component && component !== "ALL") {
      sql += ` AND component_type = ?`;
      args.push(component);
    }

    if (status && status !== "ALL") {
      sql += ` AND status = ?`;
      args.push(status);
    }

    if (assetCode) {
      sql += ` AND (source_asset_code = ? OR dest_asset_code = ? OR source_asset_code LIKE ? OR dest_asset_code LIKE ?)`;
      args.push(assetCode, assetCode, `%${assetCode}%`, `%${assetCode}%`);
    }

    sql += ` ORDER BY transfer_date DESC, id DESC`;

    const res = await db.execute({ sql, args });
    const transfers = res.rows;

    // Hitung statistik
    const allRes = await db.execute(`SELECT transfer_type, count(*) as count FROM asset_transfers GROUP BY transfer_type`);
    const stats: Record<string, number> = {
      total: 0,
      replace_and_transfer: 0,
      direct_transfer: 0,
      new_install: 0,
      return_to_spare: 0,
    };

    for (const r of allRes.rows as any[]) {
      const cnt = Number(r.count) || 0;
      stats.total += cnt;
      if (r.transfer_type === "REPLACE_AND_TRANSFER") stats.replace_and_transfer = cnt;
      else if (r.transfer_type === "DIRECT_TRANSFER") stats.direct_transfer = cnt;
      else if (r.transfer_type === "NEW_INSTALL") stats.new_install = cnt;
      else if (r.transfer_type === "RETURN_TO_SPARE") stats.return_to_spare = cnt;
    }

    return NextResponse.json({
      success: true,
      data: transfers,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/transfers error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data mutasi/pemindahan aset" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();

    const {
      transfer_type = "REPLACE_AND_TRANSFER",
      component_type = "BARCODE_SCANNER",
      item_name,
      source_type = "POS",
      source_asset_code = "",
      source_location = "",
      source_shop = "Plaza Bali",
      source_item_model = "",
      source_item_sn = "-",
      dest_type = "POS",
      dest_asset_code = "",
      dest_location = "",
      dest_shop = "Plaza Bali",
      new_item_model = "",
      new_item_sn = "-",
      new_item_source = "MIS PROC",
      performed_by = "IT Support",
      reason = "",
      reference_no = "",
      notes = "",
    } = body;

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Alasan pemindahan / replace wajib diisi" },
        { status: 400 }
      );
    }

    // Generate kode transfer unik
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const transfer_code = `TRF-${dateStr}-${randomSuffix}`;
    const transfer_date = new Date().toISOString().replace("T", " ").slice(0, 19);

    const effectiveItemName =
      item_name ||
      `${component_type.replace(/_/g, " ")} (${source_item_model || new_item_model || "Hardware"})`;

    // 1. Simpan ke tabel asset_transfers
    const insertRes = await db.execute({
      sql: `INSERT INTO asset_transfers (
        transfer_code, transfer_type, component_type, item_name,
        source_type, source_asset_code, source_location, source_shop, source_item_model, source_item_sn,
        dest_type, dest_asset_code, dest_location, dest_shop,
        new_item_model, new_item_sn, new_item_source,
        performed_by, transfer_date, reason, reference_no, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`,
      args: [
        transfer_code,
        transfer_type,
        component_type,
        effectiveItemName,
        source_type,
        source_asset_code,
        source_location,
        source_shop,
        source_item_model,
        source_item_sn,
        dest_type,
        dest_asset_code,
        dest_location,
        dest_shop,
        new_item_model,
        new_item_sn,
        new_item_source,
        performed_by,
        transfer_date,
        reason,
        reference_no,
        notes,
      ],
    });

    // 2. Terapkan pemindahan komponen ke perangkat POS secara otomatis
    const posCol = getPosColumn(component_type);

    if (posCol) {
      // A. Skenario: REPLACE_AND_TRANSFER (Contoh: P01 DF6 diganti unit baru MIS PROC, unit lama dipindah ke P02 DF7)
      if (transfer_type === "REPLACE_AND_TRANSFER") {
        // 1) Update POS Asal (Source)
        if (source_asset_code && new_item_model) {
          const logNoteSource = ` [MUTASI: Di-replace dg ${new_item_model} (${new_item_source}), unit lama dipindah ke ${dest_asset_code} | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = ?, 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [new_item_model, logNoteSource, source_asset_code],
          });
        }

        // 2) Update POS Tujuan (Destination)
        if (dest_asset_code && source_item_model) {
          const modelForDest = `${source_item_model} (Mutasi dari ${source_asset_code})`;
          const logNoteDest = ` [MUTASI: Menerima pemindahan ${component_type} dari ${source_asset_code} | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = ?, 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [modelForDest, logNoteDest, dest_asset_code],
          });
        }
      }
      // B. Skenario: DIRECT_TRANSFER (Unit dari POS A dipindah langsung ke POS B)
      else if (transfer_type === "DIRECT_TRANSFER") {
        if (source_asset_code) {
          const logNoteSource = ` [MUTASI_KELUAR: ${component_type} dipindahkan ke ${dest_asset_code} | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = '-', 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [logNoteSource, source_asset_code],
          });
        }
        if (dest_asset_code) {
          const modelForDest = source_item_model || effectiveItemName;
          const logNoteDest = ` [MUTASI_MASUK: Menerima ${modelForDest} dari ${source_asset_code} | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = ?, 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [modelForDest, logNoteDest, dest_asset_code],
          });
        }
      }
      // C. Skenario: NEW_INSTALL (Pasang unit baru dari pengadaan ke POS Tujuan)
      else if (transfer_type === "NEW_INSTALL") {
        if (dest_asset_code && new_item_model) {
          const logNoteDest = ` [PASANG_BARU: ${new_item_model} (${new_item_source}) | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = ?, 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [new_item_model, logNoteDest, dest_asset_code],
          });
        }
      }
      // D. Skenario: RETURN_TO_SPARE (Tarik ke gudang cadangan / perbaikan)
      else if (transfer_type === "RETURN_TO_SPARE") {
        if (source_asset_code) {
          const logNoteSource = ` [RETUR_SPARE: ${component_type} ditarik ke cadangan gudang | TRF: ${transfer_code}]`;
          await db.execute({
            sql: `UPDATE pos_hardware_assets 
                  SET ${posCol} = '-', 
                      notes = COALESCE(notes, '') || ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE pos_code = ?`,
            args: [logNoteSource, source_asset_code],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pemindahan barang berhasil dicatat dengan kode ${transfer_code}`,
      data: {
        id: Number(insertRes.lastInsertRowid),
        transfer_code,
        transfer_type,
        item_name: effectiveItemName,
        source_asset_code,
        dest_asset_code,
      },
    });
  } catch (error: any) {
    console.error("POST /api/transfers error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mencatat pemindahan aset" },
      { status: 500 }
    );
  }
}
