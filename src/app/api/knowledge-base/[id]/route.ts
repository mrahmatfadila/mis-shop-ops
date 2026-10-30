import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

// GET /api/knowledge-base/[id]
export async function GET(
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

    // Increment view count
    await db.execute({
      sql: "UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = ?",
      args: [articleId],
    });

    const result = await db.execute({
      sql: "SELECT * FROM knowledge_base WHERE id = ?",
      args: [articleId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Artikel panduan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      article: result.rows[0],
    });
  } catch (error: any) {
    console.error("GET /api/knowledge-base/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-base/[id] (MIS OPS / Admin / Manager)
export async function PUT(
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

    const body = await request.json();
    const {
      title,
      category,
      target_role,
      store_scope,
      summary,
      content,
      steps,
      tags,
      is_pinned,
      is_published,
      author_name,
      author_role,
    } = body;

    const stepsJson = typeof steps === "string" ? steps : JSON.stringify(steps || []);

    await db.execute({
      sql: `
        UPDATE knowledge_base 
        SET 
          title = COALESCE(?, title),
          category = COALESCE(?, category),
          target_role = COALESCE(?, target_role),
          store_scope = COALESCE(?, store_scope),
          summary = COALESCE(?, summary),
          content = COALESCE(?, content),
          steps = COALESCE(?, steps),
          tags = COALESCE(?, tags),
          is_pinned = COALESCE(?, is_pinned),
          is_published = COALESCE(?, is_published),
          author_name = COALESCE(?, author_name),
          author_role = COALESCE(?, author_role),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `,
      args: [
        title,
        category,
        target_role,
        store_scope,
        summary,
        content,
        stepsJson,
        tags,
        is_pinned !== undefined ? (is_pinned ? 1 : 0) : null,
        is_published !== undefined ? (is_published ? 1 : 0) : null,
        author_name,
        author_role,
        articleId,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Panduan SOP berhasil diperbarui oleh tim MIS OPS",
    });
  } catch (error: any) {
    console.error("PUT /api/knowledge-base/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-base/[id]
export async function DELETE(
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
      sql: "DELETE FROM knowledge_base WHERE id = ?",
      args: [articleId],
    });

    return NextResponse.json({
      success: true,
      message: "Panduan berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/knowledge-base/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete article" },
      { status: 500 }
    );
  }
}

