import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError } from "@/lib/api";
import { NetworkAsset } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const result = await db.execute({
      sql: "SELECT * FROM network_assets WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return fail("Perangkat jaringan tidak ditemukan", 404);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0] as unknown as NetworkAsset,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
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

    const exist = await db.execute({
      sql: "SELECT id FROM network_assets WHERE id = ?",
      args: [id],
    });

    if (exist.rows.length === 0) {
      return fail("Perangkat jaringan tidak ditemukan", 404);
    }

    await db.execute({
      sql: `
        UPDATE network_assets SET
          asset_code = COALESCE(?, asset_code),
          name = COALESCE(?, name),
          device_type = COALESCE(?, device_type),
          brand_model = COALESCE(?, brand_model),
          serial_number = COALESCE(?, serial_number),
          mac_address = COALESCE(?, mac_address),
          ip_address = COALESCE(?, ip_address),
          subnet_mask = COALESCE(?, subnet_mask),
          gateway = COALESCE(?, gateway),
          vlan = COALESCE(?, vlan),
          port_count = COALESCE(?, port_count),
          location = COALESCE(?, location),
          counter_zone = COALESCE(?, counter_zone),
          firmware_version = COALESCE(?, firmware_version),
          status = COALESCE(?, status),
          purchase_date = COALESCE(?, purchase_date),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
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
        id,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Data perangkat jaringan berhasil diperbarui",
    });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return fail("Kode aset jaringan sudah digunakan oleh perangkat lain", 409);
    }
    return jsonError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const res = await db.execute({
      sql: "DELETE FROM network_assets WHERE id = ?",
      args: [id],
    });

    if (res.rowsAffected === 0) {
      return fail("Perangkat jaringan tidak ditemukan", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Perangkat jaringan berhasil dihapus",
    });
  } catch (error) {
    return jsonError(error);
  }
}
