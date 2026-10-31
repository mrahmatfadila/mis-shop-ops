import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();

    const [
      totalAssetsRes,
      operationalRes,
      brokenRes,
      repairRes,
      pendingTicketsRes,
      onlineDevicesRes,
      totalDevicesRes,
      totalOfficeRes,
      officeLocsRes,
      posCountRes,
      edcCountRes,
      t3CountRes,
      dvrCountRes,
      rackPortsRes,
      extensionsRes,
      purchasesRes,
      knowledgeRes,
      networkCountRes,
    ] = await Promise.all([
      db.execute("SELECT COUNT(*) as c FROM assets"),
      db.execute("SELECT COUNT(*) as c FROM assets WHERE status = 'OPERASIONAL'"),
      db.execute("SELECT COUNT(*) as c FROM assets WHERE status = 'RUSAK'"),
      db.execute("SELECT COUNT(*) as c FROM assets WHERE status = 'PERBAIKAN'"),
      db.execute("SELECT COUNT(*) as c FROM tickets WHERE status IN ('MENUNGGU', 'DIPROSES')"),
      db.execute("SELECT COUNT(*) as c FROM monitoring_devices WHERE status = 'ONLINE'"),
      db.execute("SELECT COUNT(*) as c FROM monitoring_devices"),
      db.execute("SELECT COUNT(*) as c FROM office_hardware_assets"),
      db.execute("SELECT office_location, COUNT(*) as c FROM office_hardware_assets GROUP BY office_location"),
      db.execute("SELECT COUNT(*) as c FROM pos_hardware_assets"),
      db.execute("SELECT COUNT(*) as c FROM edc_assets"),
      db.execute("SELECT COUNT(*) as c FROM t3_fixed_assets"),
      db.execute("SELECT COUNT(*) as c FROM dvr_assets"),
      db.execute("SELECT COUNT(*) as c FROM server_rack_ports"),
      db.execute("SELECT COUNT(*) as c FROM phone_extensions"),
      db.execute("SELECT COUNT(*) as c FROM purchases"),
      db.execute("SELECT COUNT(*) as c FROM knowledge_base WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM network_assets"),
    ]);

    let officeHeadOfficeCount = 0;
    let officeWhsCount = 0;
    let officeT2Count = 0;
    let officeT3Count = 0;
    let officeSbyCount = 0;

    for (const row of officeLocsRes.rows) {
      const loc = String(row.office_location || "Head Office").toLowerCase();
      const cnt = Number(row.c);
      if (loc.includes("warehouse") || loc.includes("whs")) {
        officeWhsCount += cnt;
      } else if (loc.includes("terminal 2") || loc.includes("t2")) {
        officeT2Count += cnt;
      } else if (loc.includes("terminal 3") || loc.includes("t3")) {
        officeT3Count += cnt;
      } else if (loc.includes("surabaya") || loc.includes("sby")) {
        officeSbyCount += cnt;
      } else {
        officeHeadOfficeCount += cnt;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalAssets: Number(totalAssetsRes.rows[0].c),
        operationalAssets: Number(operationalRes.rows[0].c),
        brokenAssets: Number(brokenRes.rows[0].c),
        repairAssets: Number(repairRes.rows[0].c),
        pendingTickets: Number(pendingTicketsRes.rows[0].c),
        onlineDevices: Number(onlineDevicesRes.rows[0].c),
        totalMonitoredDevices: Number(totalDevicesRes.rows[0].c),
        totalOfficeAssets: Number(totalOfficeRes.rows[0].c),
        // Live counts for individual office locations
        officeHeadOfficeCount,
        officeWhsCount,
        officeT2Count,
        officeT3Count,
        officeSbyCount,
        // Live counts for sidebar mapping
        posCount: Number(posCountRes.rows[0].c),
        edcCount: Number(edcCountRes.rows[0].c),
        t3Count: Number(t3CountRes.rows[0].c),
        dvrCount: Number(dvrCountRes.rows[0].c),
        rackPortCount: Number(rackPortsRes.rows[0].c),
        extensionCount: Number(extensionsRes.rows[0].c),
        purchaseCount: Number(purchasesRes.rows[0].c),
        knowledgeCount: Number(knowledgeRes.rows[0].c),
        networkCount: Number(networkCountRes.rows[0]?.c || 0),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

