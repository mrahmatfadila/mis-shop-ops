import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, ok } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = params.id;
    const result = await db.execute({
      sql: "SELECT * FROM dvr_assets WHERE id = ? OR asset_code = ? OR serial_number = ?",
      args: [id, id, id],
    });

    if (result.rows.length === 0) {
      return fail("DVR tidak ditemukan", 404);
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
      location,
      dvr_type,
      serial_number,
      harddisk,
      channels,
      camera_count,
      retention_days,
      username,
      password,
      ip_address,
      http_port = 80,
      rtsp_port = 554,
      server_port = 8000,
      protocol = "HIKVISION",
      channel_names = "",
      rtsp_stream_url = "",
      status,
      notes,
    } = body;

    await db.execute({
      sql: `UPDATE dvr_assets SET
              location = ?,
              dvr_type = ?,
              serial_number = ?,
              harddisk = ?,
              channels = ?,
              camera_count = ?,
              retention_days = ?,
              username = ?,
              password = ?,
              ip_address = ?,
              http_port = ?,
              rtsp_port = ?,
              server_port = ?,
              protocol = ?,
              channel_names = ?,
              rtsp_stream_url = ?,
              status = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        location,
        dvr_type,
        serial_number,
        harddisk,
        channels,
        camera_count,
        retention_days,
        username,
        password,
        ip_address,
        http_port,
        rtsp_port,
        server_port,
        protocol,
        channel_names,
        rtsp_stream_url,
        status,
        notes,
        id,
      ],
    });

    return NextResponse.json({ success: true, message: "Data DVR berhasil diupdate!" });
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
      sql: "DELETE FROM dvr_assets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Aset DVR berhasil dihapus!" });
  } catch (error) {
    return jsonError(error);
  }
}

