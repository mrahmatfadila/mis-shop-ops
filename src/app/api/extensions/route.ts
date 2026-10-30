import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { fail, jsonError, parseFilters, requireFields } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const { search, division, status } = parseFilters(searchParams, {
      allowed: ["search", "division", "status"],
      ignoreByKey: {
        division: ["ALL"],
        status: ["ALL"],
      },
    });

    let sql = "SELECT * FROM phone_extensions WHERE 1=1";
    const args: any[] = [];

    if (division) {
      sql += " AND division = ?";
      args.push(division);
    }

    if (status) {
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
  } catch (error) {
    console.error("Error fetching phone extensions:", error);
    return jsonError(error, "Gagal mengambil data extension telepon");
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

    const { missing } = requireFields(body, ["division", "user_name"]);

    if (missing.length > 0) {
      return fail("Divisi dan Nama wajib diisi", 400);
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
  } catch (error) {
    console.error("Error adding phone extension:", error);
    return jsonError(error, "Gagal menambahkan extension telepon");
  }
}

