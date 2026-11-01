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

async function ensureTransfersTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS asset_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_code TEXT UNIQUE NOT NULL,
        transfer_type TEXT NOT NULL,
        component_type TEXT NOT NULL,
        item_name TEXT NOT NULL,

        source_type TEXT NOT NULL,
        source_asset_code TEXT,
        source_location TEXT NOT NULL,
        source_shop TEXT DEFAULT 'Plaza Bali',
        source_item_model TEXT,
        source_item_sn TEXT,

        dest_type TEXT NOT NULL,
        dest_asset_code TEXT,
        dest_location TEXT NOT NULL,
        dest_shop TEXT DEFAULT 'Plaza Bali',

        new_item_model TEXT,
        new_item_sn TEXT,
        new_item_source TEXT,

        performed_by TEXT NOT NULL,
        transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason TEXT NOT NULL,
        reference_no TEXT,
        status TEXT DEFAULT 'COMPLETED',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const countTrf = await db.execute("SELECT count(*) as count FROM asset_transfers");
    if (Number(countTrf.rows[0]?.count || 0) === 0) {
      await db.execute(`
        INSERT INTO asset_transfers (
          transfer_code, transfer_type, component_type, item_name,
          source_type, source_asset_code, source_location, source_shop, source_item_model, source_item_sn,
          dest_type, dest_asset_code, dest_location, dest_shop,
          new_item_model, new_item_sn, new_item_source,
          performed_by, transfer_date, reason, reference_no, status, notes
        ) VALUES 
        (
          'TRF-20261101-001',
          'REPLACE_AND_TRANSFER',
          'BARCODE_SCANNER',
          'Barcode Scanner Kasir',
          'POS',
          'CGKT3DFD06-P01',
          'Terminal 3 - Counter DFD06 (P01)',
          'Plaza Bali',
          'Honeywell Voyager 1400g (Lama)',
          'SN-HON-1400-9821',
          'POS',
          'CGKT3DFD07-P02',
          'Terminal 3 - Counter DFD07 (P02)',
          'Plaza Bali',
          'Honeywell Xenon 1950g 2D (Baru)',
          'SN-HON-1950-4412',
          'MIS PROC (Pengadaan Baru PO-2026-08)',
          'IT Support',
          '2026-11-01 10:30:00',
          'Replace scanner barcode di P01 DF6 dengan unit baru kiriman MIS PROC, dan scanner lama yang masih berfungsi dialihkan ke P02 DF7 untuk menggantikan scanner DF7 yang bermasalah.',
          'BA-MUT-2026-004',
          'COMPLETED',
          'Pemasangan unit baru di DF6 P01 selesai & unit lama berhasil dipindahkan ke DF7 P02. Hasil uji pembacaan barcode boarding pass & produk normal.'
        ),
        (
          'TRF-20261028-002',
          'DIRECT_TRANSFER',
          'PRINTER',
          'Printer Thermal Kasir Epson TM-U220D',
          'POS',
          'CGKT2DFD05-P04',
          'Terminal 2 - Counter DFD05 (P04)',
          'Plaza Bali',
          'Epson TM-U220D Serial',
          'SN-EPS-220-4109',
          'POS',
          'CGKT3DFD01-P04',
          'Terminal 3 - Counter DFD01 (P04)',
          'Plaza Bali',
          NULL, NULL, NULL,
          'MIS OPS',
          '2026-10-28 14:15:00',
          'Relokasi printer thermal kasir cadangan Terminal 2 ke Terminal 3 untuk mengantisipasi lonjakan transaksi penerbangan internasional.',
          'BA-MUT-2026-003',
          'COMPLETED',
          'Printer telah dipasang di Terminal 3 Counter DFD01-P04, tes cetak receipt kasir POS lancar.'
        );
      `);
    }
  } catch (e) {
    console.error("ensureTransfersTable error:", e);
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDb();
    await ensureTransfersTable();
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
    await ensureTransfersTable();
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

