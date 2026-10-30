import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const body = await request.json();

    const {
      rack_type,
      device_group,
      port_no,
      port_label,
      patch_panel_label,
      device_type,
      user_name,
      ext,
      ip_address,
      destination,
      cable_color,
      status,
      notes
    } = body;

    await db.execute({
      sql: `UPDATE server_rack_ports SET
              rack_type = COALESCE(?, rack_type),
              device_group = COALESCE(?, device_group),
              port_no = COALESCE(?, port_no),
              port_label = COALESCE(?, port_label),
              patch_panel_label = COALESCE(?, patch_panel_label),
              device_type = COALESCE(?, device_type),
              user_name = COALESCE(?, user_name),
              ext = COALESCE(?, ext),
              ip_address = COALESCE(?, ip_address),
              destination = COALESCE(?, destination),
              cable_color = COALESCE(?, cable_color),
              status = COALESCE(?, status),
              notes = COALESCE(?, notes),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        rack_type || null,
        device_group || null,
        port_no !== undefined ? Number(port_no) : null,
        port_label || null,
        patch_panel_label !== undefined ? patch_panel_label : null,
        device_type || null,
        user_name !== undefined ? user_name : null,
        ext !== undefined ? ext : null,
        ip_address !== undefined ? ip_address : null,
        destination !== undefined ? destination : null,
        cable_color || null,
        status || null,
        notes !== undefined ? notes : null,
        id
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Data port mapping berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Error updating server rack port:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui port" },
      { status: 500 }
    );
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
      sql: "DELETE FROM server_rack_ports WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Data port mapping berhasil dihapus",
    });
  } catch (error: any) {
    console.error("Error deleting server rack port:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus port" },
      { status: 500 }
    );
  }
}

