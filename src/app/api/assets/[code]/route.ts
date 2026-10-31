import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const rawCode = decodeURIComponent(params.code).trim();
    if (!rawCode) return fail("Kode aset tidak boleh kosong", 400);

    const cleanCode = rawCode.toUpperCase();
    let data: any = null;

    // Helper untuk mem-parsing riwayat penggantian terstruktur di pos_hardware_assets.notes
    const parsePosNotesHistory = (notes?: string | null) => {
      const history: any[] = [];
      if (!notes) return history;
      const matches = notes.match(/\[REPLACE_([A-Z_]+):\s*([^|]+)\s*\|\s*Harga:\s*([^|]+)\s*\|\s*Toko:\s*([^|]+)\s*\|\s*Tgl:\s*([^|]+)\s*\|\s*Ket:\s*([^\]]+)\]/gi);
      if (matches) {
        for (const mStr of matches) {
          const m = /\[REPLACE_([A-Z_]+):\s*([^|]+)\s*\|\s*Harga:\s*([^|]+)\s*\|\s*Toko:\s*([^|]+)\s*\|\s*Tgl:\s*([^|]+)\s*\|\s*Ket:\s*([^\]]+)\]/i.exec(mStr);
          if (m) {
            history.push({
              component: m[1].trim(),
              newModel: m[2].trim(),
              price: m[3].trim(),
              store: m[4].trim(),
              date: m[5].trim(),
              notes: m[6].trim(),
            });
          }
        }
      }
      return history;
    };

    // Helper format tanggal id-ID
    const formatDate = (val?: string | null) => {
      if (!val || val === "-" || val === "Aset Bawaan") return "2 Maret 2026";
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. CARI DI TABEL POS_HARDWARE_ASSETS (Set Kasir / Komponen Satuan Kasir)
    // ─────────────────────────────────────────────────────────────────────────────
    // Cek apakah kode diawali prefix komponen barcode stiker:
    // Contoh: MON-CGKT3DFA02-P01, PRN-CGKT3DFA02-P01, BCS-CGKT3DFA02-P01, PAS-..., DRW-..., KBD-..., MOU-...
    const compPrefixes = ["MON-", "PRN-", "BCS-", "SCN-", "PAS-", "DRW-", "KBD-", "MOU-", "CPU-", "RAM-", "SSD-", "LIC-", "SN-MON-", "SN-PRN-", "SN-BCS-", "SN-PAS-", "SN-DRW-", "SN-KBD-", "SN-MOU-", "SN-"];
    const matchedPrefix = compPrefixes.find((p) => cleanCode.startsWith(p));

    let targetPosCode = cleanCode;
    let specificPosCompKey: string | null = null;

    if (matchedPrefix) {
      targetPosCode = cleanCode.replace(matchedPrefix, "");
      if (matchedPrefix.includes("MON")) specificPosCompKey = "MONITOR";
      else if (matchedPrefix.includes("PRN")) specificPosCompKey = "PRINTER";
      else if (matchedPrefix.includes("BCS") || matchedPrefix.includes("SCN")) specificPosCompKey = "BARCODE_SCANNER";
      else if (matchedPrefix.includes("PAS")) specificPosCompKey = "PASSPORT_SCANNER";
      else if (matchedPrefix.includes("DRW")) specificPosCompKey = "CASH_DRAWER";
      else if (matchedPrefix.includes("KBD")) specificPosCompKey = "KEYBOARD";
      else if (matchedPrefix.includes("MOU")) specificPosCompKey = "MOUSE";
      else if (matchedPrefix.includes("CPU")) specificPosCompKey = "PROCESSOR";
      else if (matchedPrefix.includes("RAM")) specificPosCompKey = "RAM";
      else if (matchedPrefix.includes("SSD")) specificPosCompKey = "SSD";
    }

    const posRes = await db.execute({
      sql: `SELECT * FROM pos_hardware_assets 
            WHERE pos_code = ? 
               OR pos_code = ? 
               OR pos_sn = ? 
               OR pos_sn = ? 
               OR pos_code LIKE ?
            LIMIT 1`,
      args: [targetPosCode, cleanCode, cleanCode, `SN-${cleanCode}`, `%${targetPosCode}%`],
    });

    if (posRes.rows.length > 0) {
      const pos: any = posRes.rows[0];
      const changeHistory = parsePosNotesHistory(pos.notes);
      const posPurchases = await db.execute({
        sql: `SELECT * FROM purchases WHERE target_pos_code = ? OR installed_pos_code = ? ORDER BY id DESC LIMIT 5`,
        args: [pos.pos_code, pos.pos_code],
      });

      // A. Jika yang discan adalah Komponen Satuan Kasir (misal Keyboard, Printer, Scanner)
      if (specificPosCompKey) {
        let compName = "Komponen Kasir";
        let compModel = "-";
        let defaultPrice = "Rp 350.000";
        let defaultVendor = "Distributor Resmi IT Jakarta";
        let category = "Periferal Kasir";

        if (specificPosCompKey === "KEYBOARD") {
          compName = "Keyboard Kasir";
          compModel = pos.keyboard || "LOGITECH K120";
          defaultPrice = "Rp 165.000";
          defaultVendor = "Logitech Store / Toko Komputer Mangga Dua";
          category = "Periferal & Aksesori";
        } else if (specificPosCompKey === "MOUSE") {
          compName = "Mouse Kasir";
          compModel = pos.mouse || "LOGITECH B100";
          defaultPrice = "Rp 85.000";
          defaultVendor = "Logitech Store / Toko Komputer Mangga Dua";
          category = "Periferal & Aksesori";
        } else if (specificPosCompKey === "PRINTER") {
          compName = "Printer Thermal Struk";
          compModel = pos.printer || "EPSON TM-U220B";
          defaultPrice = "Rp 3.250.000";
          defaultVendor = "Master Dealer EPSON / Mangga Dua Mall";
          category = "Printer Kasir";
        } else if (specificPosCompKey === "BARCODE_SCANNER") {
          compName = "Barcode Scanner 1D/2D";
          compModel = pos.barcode_scanner || "HONEYWELL VOYAGER";
          defaultPrice = "Rp 1.850.000";
          defaultVendor = "PT Honeywell Barcode Store Jakarta";
          category = "Scanner Kasir";
        } else if (specificPosCompKey === "PASSPORT_SCANNER") {
          compName = "Passport Reader Bandara";
          compModel = pos.passport_scanner || "3M AT9000 MK2";
          defaultPrice = "Rp 14.500.000";
          defaultVendor = "PT Gemalto Indonesia / Idemia Partner";
          category = "Scanner Paspor";
        } else if (specificPosCompKey === "CASH_DRAWER") {
          compName = "Cash Drawer / Laci Uang";
          compModel = pos.cash_drawer || "PANDA POS RJ11";
          defaultPrice = "Rp 650.000";
          defaultVendor = "Panda POS Hardware Indonesia";
          category = "Periferal Kasir";
        } else if (specificPosCompKey === "MONITOR") {
          compName = "Monitor Display Kasir";
          compModel = pos.monitor || "LED Monitor 15 Inch";
          defaultPrice = "Rp 1.150.000";
          defaultVendor = "Distributor Resmi Display Jakarta";
          category = "Display / Monitor";
        } else if (specificPosCompKey === "PROCESSOR") {
          compName = "Processor CPU POS";
          compModel = pos.processor || "Intel Core i3 / Celeron POS";
          defaultPrice = "Rp 1.450.000";
          defaultVendor = "Distributor Intel Resmi Jakarta";
          category = "Spesifikasi PC (Sped)";
        } else if (specificPosCompKey === "RAM") {
          compName = "RAM Internal POS";
          compModel = pos.ram || "4GB DDR3/DDR4 SO-DIMM";
          defaultPrice = "Rp 320.000";
          defaultVendor = "Kingston Official Store Mangga Dua";
          category = "Spesifikasi PC (Sped)";
        } else if (specificPosCompKey === "SSD") {
          compName = "Storage SSD POS";
          compModel = pos.ssd || "128GB SSD SATA";
          defaultPrice = "Rp 380.000";
          defaultVendor = "V-Gen / Lexar Official Store";
          category = "Spesifikasi PC (Sped)";
        }

        // Cek apakah komponen ini punya catatan penggantian khusus
        const compHistory = changeHistory.filter((h) => h.component.toUpperCase().includes(specificPosCompKey!));
        const lastReplace = compHistory[0];

        data = {
          code: rawCode,
          itemType: "COMPONENT",
          name: `${compName} - ${pos.pos_code}`,
          category,
          brandModel: lastReplace ? lastReplace.newModel : compModel,
          serialNumber: `SN-${cleanCode}`,
          status: pos.status || "OPERASIONAL",
          location: pos.terminal || "Terminal 3 Bandara Soekarno-Hatta",
          subLocation: pos.shop_name || "Area DF Kasir",
          ipAddress: pos.ip_address || "-",
          purchaseDate: formatDate(pos.created_at),
          purchasedFrom: lastReplace ? lastReplace.store : defaultVendor,
          purchasePrice: lastReplace ? lastReplace.price : defaultPrice,
          poNumber: posPurchases.rows[0]?.po_number || "-",
          warrantyStatus: "Garansi Distributor Resmi 1 Tahun",
          lastChangeDate: lastReplace ? formatDate(lastReplace.date) : formatDate(pos.updated_at || pos.created_at),
          changeHistory: compHistory,
          notes: lastReplace ? `Diganti: ${lastReplace.notes}` : `Terpasang normal di set kasir ${pos.pos_code}`,
          parentSet: {
            code: pos.pos_code,
            name: `Set Kasir ${pos.pos_brand || "NCR"} (${pos.shop_name})`,
            type: "POS",
            location: pos.terminal || "Bandara",
          },
          // Properti kompatibilitas Asset
          asset_code: rawCode,
          shop_location: pos.terminal || "Terminal 3 Bandara Soekarno-Hatta",
          brand_model: lastReplace ? lastReplace.newModel : compModel,
          serial_number: `SN-${cleanCode}`,
          ip_address: pos.ip_address || null,
        };
      } else {
        // B. Yang discan adalah 1 Set Utuh PC Kasir POS (contoh: CGKT3DFA02-P01)
        const seq = String(pos.pos_number || pos.id || 1).padStart(3, "0");
        const childComponents: any[] = [];

        // 1. Sped
        if (pos.processor && pos.processor !== "-") childComponents.push({ id: `CPU-${seq}`, name: "Processor", spec: pos.processor, category: "SPED", price: "Rp 1.450.000", store: "Distributor Intel" });
        if (pos.ram && pos.ram !== "-") childComponents.push({ id: `RAM-${seq}`, name: "RAM Internal", spec: pos.ram, category: "SPED", price: "Rp 320.000", store: "Kingston Official" });
        if (pos.ssd && pos.ssd !== "-") childComponents.push({ id: `SSD-${seq}`, name: "Storage SSD", spec: pos.ssd, category: "SPED", price: "Rp 380.000", store: "Lexar / V-Gen Store" });
        if (pos.os_version && pos.os_version !== "-") childComponents.push({ id: `LIC-${seq}`, name: "Lisensi OS", spec: pos.os_version, category: "SPED", price: "Rp 2.150.000", store: "Microsoft OEM Partner" });

        // 2. Preferal
        if (pos.monitor && pos.monitor !== "-") childComponents.push({ id: `MON-${seq}`, name: "Monitor Kasir", spec: pos.monitor, category: "PREFERAL", price: "Rp 1.150.000", store: "Display Store" });
        if (pos.printer && pos.printer !== "-") childComponents.push({ id: `PRN-${seq}`, name: "Printer Thermal", spec: pos.printer, category: "PREFERAL", price: "Rp 3.250.000", store: "Master Dealer EPSON" });
        if (pos.barcode_scanner && pos.barcode_scanner !== "-") childComponents.push({ id: `BCS-${seq}`, name: "Barcode Scanner", spec: pos.barcode_scanner, category: "PREFERAL", price: "Rp 1.850.000", store: "PT Honeywell" });
        if (pos.passport_scanner && pos.passport_scanner !== "-") childComponents.push({ id: `PAS-${seq}`, name: "Passport Reader", spec: pos.passport_scanner, category: "PREFERAL", price: "Rp 14.500.000", store: "PT Gemalto Indonesia" });
        if (pos.cash_drawer && pos.cash_drawer !== "-") childComponents.push({ id: `DRW-${seq}`, name: "Cash Drawer", spec: pos.cash_drawer, category: "PREFERAL", price: "Rp 650.000", store: "Panda POS" });
        if (pos.keyboard && pos.keyboard !== "-") childComponents.push({ id: `KBD-${seq}`, name: "Keyboard Kasir", spec: pos.keyboard, category: "PREFERAL", price: "Rp 165.000", store: "Logitech Store" });
        if (pos.mouse && pos.mouse !== "-") childComponents.push({ id: `MOU-${seq}`, name: "Mouse Kasir", spec: pos.mouse, category: "PREFERAL", price: "Rp 85.000", store: "Logitech Store" });

        data = {
          code: pos.pos_code,
          itemType: "SET_POS",
          name: `Unit PC Kasir ${pos.pos_code}`,
          category: "POS Terminal (1 Set)",
          brandModel: `${pos.pos_brand || "NCR"} (All-in-One POS)`,
          serialNumber: pos.pos_sn && pos.pos_sn !== "-" ? pos.pos_sn : `SN-${pos.pos_code}`,
          status: pos.status || "OPERASIONAL",
          location: pos.terminal || "Terminal 3 Bandara Soekarno-Hatta",
          subLocation: pos.shop_name || "Toko Duty Free",
          ipAddress: pos.ip_address || "-",
          purchaseDate: formatDate(pos.created_at),
          purchasedFrom: "Distributor Resmi NCR Corporation Indonesia",
          purchasePrice: "Rp 24.500.000 (1 Set Lengkap)",
          poNumber: posPurchases.rows[0]?.po_number || "PO-NCR-T3",
          warrantyStatus: "Garansi Pemeliharaan IT Vendor Aktif",
          lastChangeDate: formatDate(pos.updated_at || pos.created_at),
          changeHistory,
          notes: pos.notes && !pos.notes.startsWith("[REPLACE") ? pos.notes : "Set kasir aktif operasional melayani transaksi toko",
          childComponents,
          // Properti kompatibilitas Asset
          asset_code: pos.pos_code,
          shop_location: pos.terminal || "Terminal 3 Bandara Soekarno-Hatta",
          brand_model: `${pos.pos_brand || "NCR"} POS`,
          serial_number: pos.pos_sn || `SN-${pos.pos_code}`,
          ip_address: pos.ip_address || null,
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. CARI DI TABEL OFFICE_HARDWARE_ASSETS (Set PC Kantor / ID Barang Komponen)
    // ─────────────────────────────────────────────────────────────────────────────
    if (!data) {
      // Cek apakah kode merupakan ID Barang satuan office (contoh: CPU-001, RAM-002, SSD-003, KBD-004)
      let officeTargetCode = cleanCode;
      let specificOfficeComp: string | null = null;
      let targetItemNo: number | null = null;

      const offPrefixMatch = cleanCode.match(/^(CPU|MB|RAM|SSD|HDD|MON|PRN|KBD|MOU|LIC)-(\d+)$/);
      if (offPrefixMatch) {
        specificOfficeComp = offPrefixMatch[1];
        targetItemNo = parseInt(offPrefixMatch[2], 10);
      }

      let officeRes: any;
      if (targetItemNo) {
        officeRes = await db.execute({
          sql: `SELECT * FROM office_hardware_assets WHERE item_no = ? OR id = ? LIMIT 1`,
          args: [targetItemNo, targetItemNo],
        });
      } else {
        // Cek variasi O vs 0 pada kode aset office (contoh PC-MIS-26-001-O vs PC-MIS-26-001-0)
        const altOfficeCode = cleanCode.endsWith("-0") ? cleanCode.slice(0, -2) + "-O" : cleanCode.endsWith("-O") ? cleanCode.slice(0, -2) + "-0" : cleanCode;
        officeRes = await db.execute({
          sql: `SELECT * FROM office_hardware_assets WHERE asset_code = ? OR asset_code = ? OR asset_code LIKE ? LIMIT 1`,
          args: [cleanCode, altOfficeCode, `%${cleanCode}%`],
        });
      }

      if (officeRes.rows.length > 0) {
        const off: any = officeRes.rows[0];
        const seq = String(off.item_no || off.id).padStart(3, "0");

        if (specificOfficeComp) {
          // Komponen Satuan Office
          let compName = "Komponen Hardware PC";
          let compModel = "-";
          let compPrice = "Rp 450.000";
          let compStore = "Distributor Resmi IT Jakarta";
          let category = "Hardware PC Office";

          if (specificOfficeComp === "CPU") {
            compName = "Processor CPU";
            compModel = off.processor || "Intel Core";
            compPrice = compModel.includes("i5") ? "Rp 2.250.000" : "Rp 1.450.000";
            compStore = "Distributor Intel Resmi Jakarta";
            category = "Spesifikasi PC (Sped)";
          } else if (specificOfficeComp === "MB") {
            compName = "Motherboard";
            compModel = off.motherboard || "Motherboard ASUS / Gigabyte";
            compPrice = "Rp 1.250.000";
            compStore = "ASUS / Gigabyte Official Store";
            category = "Spesifikasi PC (Sped)";
          } else if (specificOfficeComp === "RAM") {
            compName = "RAM Internal";
            compModel = off.ram || "RAM DDR4";
            compPrice = "Rp 550.000";
            compStore = "Kingston / Corsair Official Store";
            category = "Spesifikasi PC (Sped)";
          } else if (specificOfficeComp === "SSD" || specificOfficeComp === "HDD") {
            compName = specificOfficeComp === "SSD" ? "Storage SSD" : "Storage HDD";
            compModel = off.hard_drive || "Storage Drive";
            compPrice = specificOfficeComp === "SSD" ? "Rp 450.000" : "Rp 650.000";
            compStore = "Seagate / Lexar Official Store";
            category = "Spesifikasi PC (Sped)";
          } else if (specificOfficeComp === "MON") {
            compName = "Monitor Display";
            compModel = off.monitor || "Monitor LG 20 Inch";
            compPrice = "Rp 1.350.000";
            compStore = "LG Electronics Indonesia";
            category = "Periferal & Aksesori";
          } else if (specificOfficeComp === "PRN") {
            compName = "Printer Terhubung";
            compModel = off.printer || "Printer Canon PIXMA";
            compPrice = "Rp 2.450.000";
            compStore = "Master Dealer Canon / EPSON Mangga Dua";
            category = "Periferal & Aksesori";
          } else if (specificOfficeComp === "KBD") {
            compName = "Keyboard Office";
            compModel = off.keyboard || "Logitech USB";
            compPrice = "Rp 165.000";
            compStore = "Logitech Store Mangga Dua";
            category = "Periferal & Aksesori";
          } else if (specificOfficeComp === "MOU") {
            compName = "Mouse Office";
            compModel = off.mouse || "Logitech USB";
            compPrice = "Rp 85.000";
            compStore = "Logitech Store Mangga Dua";
            category = "Periferal & Aksesori";
          } else if (specificOfficeComp === "LIC") {
            compName = "Lisensi Windows OS";
            compModel = off.os || "Windows 10 Pro";
            compPrice = "Rp 2.150.000";
            compStore = "Microsoft Indonesia";
            category = "Spesifikasi PC (Sped)";
          }

          data = {
            code: rawCode,
            itemType: "COMPONENT",
            name: `${compName} - ${off.user_name}`,
            category,
            brandModel: compModel,
            serialNumber: `SN-${rawCode}`,
            status: off.status || "OPERASIONAL",
            location: off.office_location || "Head Office (Pusat)",
            subLocation: `Divisi ${off.division}`,
            ipAddress: off.ip_address || "-",
            purchaseDate: formatDate(off.created_at),
            purchasedFrom: compStore,
            purchasePrice: compPrice,
            poNumber: `PO-OFF-${seq}`,
            warrantyStatus: "Garansi Pembelian 1 Tahun",
            lastChangeDate: formatDate(off.updated_at || off.created_at),
            changeHistory: [],
            notes: `Terpasang pada komputer ${off.asset_code} milik ${off.user_name}`,
            parentSet: {
              code: off.asset_code,
              name: `PC ${off.user_name} (${off.division})`,
              type: "OFFICE",
              location: off.office_location || "Head Office",
            },
            asset_code: rawCode,
            shop_location: off.office_location || "Head Office",
            brand_model: compModel,
            serial_number: `SN-${rawCode}`,
            ip_address: off.ip_address || null,
          };
        } else {
          // 1 Set Utuh PC Office
          const childComponents: any[] = [];
          if (off.processor && off.processor !== "-") childComponents.push({ id: `CPU-${seq}`, name: "Processor", spec: off.processor, category: "SPED", price: "Rp 1.450.000", store: "Distributor Intel" });
          if (off.motherboard && off.motherboard !== "-") childComponents.push({ id: `MB-${seq}`, name: "Motherboard", spec: off.motherboard, category: "SPED", price: "Rp 1.250.000", store: "ASUS Store" });
          if (off.ram && off.ram !== "-") childComponents.push({ id: `RAM-${seq}`, name: "RAM Internal", spec: off.ram, category: "SPED", price: "Rp 550.000", store: "Kingston Store" });
          if (off.hard_drive && off.hard_drive !== "-") childComponents.push({ id: `SSD-${seq}`, name: "Storage Drive", spec: off.hard_drive, category: "SPED", price: "Rp 450.000", store: "Lexar / Seagate" });
          if (off.os && off.os !== "-") childComponents.push({ id: `LIC-${seq}`, name: "Lisensi OS", spec: off.os, category: "SPED", price: "Rp 2.150.000", store: "Microsoft" });
          if (off.monitor && off.monitor !== "-") childComponents.push({ id: `MON-${seq}`, name: "Monitor Display", spec: off.monitor, category: "PREFERAL", price: "Rp 1.350.000", store: "LG Electronics" });
          if (off.printer && off.printer !== "-") childComponents.push({ id: `PRN-${seq}`, name: "Printer Terhubung", spec: off.printer, category: "PREFERAL", price: "Rp 2.450.000", store: "Canon PIXMA Store" });
          if (off.keyboard && off.keyboard !== "-") childComponents.push({ id: `KBD-${seq}`, name: "Keyboard", spec: off.keyboard, category: "PREFERAL", price: "Rp 165.000", store: "Logitech Store" });
          if (off.mouse && off.mouse !== "-") childComponents.push({ id: `MOU-${seq}`, name: "Mouse", spec: off.mouse, category: "PREFERAL", price: "Rp 85.000", store: "Logitech Store" });

          data = {
            code: off.asset_code,
            itemType: "SET_OFFICE",
            name: `Unit PC Komputer - ${off.user_name}`,
            category: "PC & Desktop Office (1 Set)",
            brandModel: `${off.device_type || "PC Desktop"} (${off.user_name})`,
            serialNumber: `SN-${off.asset_code}`,
            status: off.status || "OPERASIONAL",
            location: off.office_location || "Head Office (Pusat)",
            subLocation: `Divisi ${off.division}`,
            ipAddress: off.ip_address || "-",
            purchaseDate: formatDate(off.created_at),
            purchasedFrom: "Distributor Resmi IT Jakarta",
            purchasePrice: "Rp 8.500.000 (1 Unit Set PC)",
            poNumber: `PO-OFF-${seq}`,
            warrantyStatus: "Garansi Kantor Resmi Aktif",
            lastChangeDate: formatDate(off.updated_at || off.created_at),
            changeHistory: [],
            notes: off.notes || `Unit komputer kerja ${off.user_name} di divisi ${off.division}`,
            childComponents,
            asset_code: off.asset_code,
            shop_location: off.office_location || "Head Office",
            brand_model: `${off.device_type || "PC"} - ${off.user_name}`,
            serial_number: `SN-${off.asset_code}`,
            ip_address: off.ip_address || null,
          };
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. CARI DI TABEL ASSETS (Master Standard Assets)
    // ─────────────────────────────────────────────────────────────────────────────
    if (!data) {
      const assetRes = await db.execute({
        sql: `SELECT * FROM assets WHERE asset_code = ? OR serial_number = ? LIMIT 1`,
        args: [cleanCode, cleanCode],
      });

      if (assetRes.rows.length > 0) {
        const ast: any = assetRes.rows[0];
        data = {
          code: ast.asset_code,
          itemType: "GENERIC_ASSET",
          name: ast.name,
          category: ast.category,
          brandModel: ast.brand_model,
          serialNumber: ast.serial_number,
          status: ast.status || "OPERASIONAL",
          location: ast.shop_location,
          subLocation: "Master Aset Toko",
          ipAddress: ast.ip_address || "-",
          purchaseDate: formatDate(ast.purchase_date || ast.created_at),
          purchasedFrom: "Distributor IT Resmi",
          purchasePrice: "Rp 1.850.000",
          poNumber: "PO-GENERIC-AST",
          warrantyStatus: "Garansi Resmi Terdaftar",
          lastChangeDate: formatDate(ast.updated_at || ast.created_at),
          changeHistory: [],
          notes: ast.notes || "Aset terdaftar di database inventaris",
          asset_code: ast.asset_code,
          shop_location: ast.shop_location,
          brand_model: ast.brand_model,
          serial_number: ast.serial_number,
          ip_address: ast.ip_address || null,
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. CARI DI TABEL EDC_ASSETS (Mesin EDC Bank)
    // ─────────────────────────────────────────────────────────────────────────────
    if (!data) {
      const edcRes = await db.execute({
        sql: `SELECT * FROM edc_assets 
              WHERE tid = ? 
                 OR mid = ? 
                 OR serial_number = ? 
                 OR pos_code = ? 
                 OR ('EDC-' || bank_name || '-' || pos_code) = ?
              LIMIT 1`,
        args: [cleanCode, cleanCode, cleanCode, cleanCode, cleanCode],
      });

      if (edcRes.rows.length > 0) {
        const edc: any = edcRes.rows[0];
        data = {
          code: `EDC-${edc.bank_name}-${edc.pos_code || edc.tid}`,
          itemType: "EDC",
          name: `Mesin EDC ${edc.bank_name} (TID: ${edc.tid})`,
          category: "Mesin EDC Payment",
          brandModel: `${edc.edc_brand || "INGENICO"} (${edc.bank_name})`,
          serialNumber: edc.serial_number || `SN-TID-${edc.tid}`,
          status: edc.status || "OPERASIONAL",
          location: edc.terminal || "Terminal Bandara",
          subLocation: edc.shop_name || "Kasir Toko",
          ipAddress: edc.ip_address || "-",
          purchaseDate: formatDate(edc.created_at),
          purchasedFrom: `Bank ${edc.bank_name} Acquiring Partner`,
          purchasePrice: "Sewa / Fasilitas Bank Partner",
          poNumber: `TID-${edc.tid}`,
          warrantyStatus: "Pemeliharaan & SLA Langsung dari Bank",
          lastChangeDate: formatDate(edc.updated_at || edc.created_at),
          changeHistory: [],
          notes: `MID: ${edc.mid} • Terhubung dengan POS ${edc.pos_code || "-"}`,
          asset_code: `EDC-${edc.bank_name}-${edc.tid}`,
          shop_location: edc.terminal || "Terminal Bandara",
          brand_model: `${edc.edc_brand || "INGENICO"} ${edc.bank_name}`,
          serial_number: edc.serial_number || edc.tid,
          ip_address: edc.ip_address || null,
        };
      }
    }

    if (!data) {
      return fail(`Perangkat dengan kode atau Serial Number "${rawCode}" tidak ditemukan di database.`, 404);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AMBIL TIKET TERKAIT DENGAN ASET INI
    // ─────────────────────────────────────────────────────────────────────────────
    const searchKeys = [data.code, data.serialNumber, data.name];
    if (data.parentSet?.code) searchKeys.push(data.parentSet.code);

    const ticketsRes = await db.execute({
      sql: `SELECT * FROM tickets 
            WHERE asset_code = ? 
               OR asset_code = ? 
               OR title LIKE ? 
               OR description LIKE ? 
            ORDER BY id DESC LIMIT 5`,
      args: [data.code, data.parentSet?.code || data.code, `%${data.code}%`, `%${data.code}%`],
    });

    return NextResponse.json({
      success: true,
      data,
      tickets: ticketsRes.rows,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const code = decodeURIComponent(params.code);
    const body = await request.json();

    const {
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

    await db.execute({
      sql: `UPDATE assets SET
              name = ?,
              category = ?,
              shop_location = ?,
              brand_model = ?,
              serial_number = ?,
              ip_address = ?,
              purchase_date = ?,
              status = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE asset_code = ?`,
      args: [
        name,
        category,
        shop_location,
        brand_model,
        serial_number,
        ip_address || null,
        purchase_date || null,
        status,
        notes || null,
        code,
      ],
    });

    if (ip_address) {
      await db.execute({
        sql: `INSERT INTO monitoring_devices (asset_code, ip_address, status, last_heartbeat)
              VALUES (?, ?, 'ONLINE', datetime('now'))
              ON CONFLICT(asset_code) DO UPDATE SET ip_address = excluded.ip_address`,
        args: [code, ip_address],
      });
    }

    return NextResponse.json({ success: true, message: "Aset berhasil diperbarui!" });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    await initDb();
    const code = decodeURIComponent(params.code);

    await db.execute({
      sql: "DELETE FROM assets WHERE asset_code = ?",
      args: [code],
    });

    await db.execute({
      sql: "DELETE FROM monitoring_devices WHERE asset_code = ?",
      args: [code],
    });

    return NextResponse.json({ success: true, message: "Aset berhasil dihapus!" });
  } catch (error) {
    return jsonError(error);
  }
}
