import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const division = searchParams.get("division") || "";
    const status = searchParams.get("status") || "";

    let sql = "SELECT * FROM phone_extensions WHERE 1=1";
    const args: any[] = [];

    if (division && division !== "ALL") {
      sql += " AND division = ?";
      args.push(division);
    }

    if (status && status !== "ALL") {
      sql += " AND status = ?";
      args.push(status);
    }

    if (search) {
      sql += ` AND (
        user_name LIKE ? OR
        ext LIKE ? OR
        division LIKE ? OR
        notes LIKE ? OR
        ip_address LIKE ?
      )`;
      const q = `%${search}%`;
      args.push(q, q, q, q, q);
    }

    sql += " ORDER BY item_no ASC, id ASC";

    const result = await db.execute({ sql, args });

    // Ringkasan statistik
    const allResult = await db.execute("SELECT * FROM phone_extensions");
    const all = allResult.rows as any[];

    const totalExtensions = all.length;
    const activeExtensions = all.filter(e => e.status === "AKTIF").length;
    const countByDivision: Record<string, number> = {
      ACC: 0, BOD: 0, FIN: 0, GS: 0, MCD: 0, MIS: 0, WHS: 0, HRD: 0, FACILITY: 0
    };
    all.forEach(e => {
      countByDivision[e.division] = (countByDivision[e.division] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: {
        totalExtensions,
        activeExtensions,
        countByDivision
      }
    });
  } catch (error: any) {
    console.error("Error fetching phone extensions:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data extension telepon" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const {
      division,
      user_name,
      ext = "-",
      location = "Head Office",
      notes = "",
      ip_address = "-",
      status = "AKTIF"
    } = body;

    if (!division || !user_name) {
      return NextResponse.json(
        { success: false, message: "Divisi dan Nama wajib diisi" },
        { status: 400 }
      );
    }

    const maxRow = await db.execute("SELECT MAX(item_no) as max_no FROM phone_extensions");
    const nextItemNo = (Number((maxRow.rows[0] as any)?.max_no) || 0) + 1;

    const insertResult = await db.execute({
      sql: `INSERT INTO phone_extensions (
              item_no, division, user_name, ext, location, notes, ip_address, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nextItemNo,
        division.toUpperCase(),
        user_name.toUpperCase(),
        ext || "-",
        location,
        notes,
        ip_address || "-",
        status
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Extension telepon berhasil ditambahkan",
      id: insertResult.lastInsertRowid,
    });
  } catch (error: any) {
    console.error("Error adding phone extension:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambahkan extension telepon" },
      { status: 500 }
    );
  }
}

