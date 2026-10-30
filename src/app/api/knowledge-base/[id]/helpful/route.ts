import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

// POST /api/knowledge-base/[id]/helpful
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = ?",
      args: [articleId],
    });

    const res = await db.execute({
      sql: "SELECT helpful_count FROM knowledge_base WHERE id = ?",
      args: [articleId],
    });

    return NextResponse.json({
      success: true,
      helpful_count: Number(res.rows[0]?.helpful_count || 0),
      message: "Terima kasih atas feedback Anda! Solusi ini dinilai bermanfaat bagi tim SPV Toko.",
    });
  } catch (error: any) {
    console.error("POST /api/knowledge-base/[id]/helpful error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record feedback" },
      { status: 500 }
    );
  }
}

