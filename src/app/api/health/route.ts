import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — cek ringan kesehatan API + database.
 * Tidak mengekspos data bisnis: hanya jumlah tabel, mode journal, uptime.
 */
export async function GET() {
  try {
    await initDb();

    const tables = await db.execute({
      sql: "SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      args: [],
    });
    const journal = await db.execute("PRAGMA journal_mode;");

    const total = Number(tables.rows[0]?.total ?? 0);
    const wal = String(journal.rows[0]?.journal_mode ?? "unknown").toLowerCase();

    return NextResponse.json({
      success: true,
      db: "ok",
      tables: total,
      wal,
      uptimeSec: Math.round(process.uptime()),
    });
  } catch (error) {
    return jsonError(error, "Database health check failed");
  }
}
