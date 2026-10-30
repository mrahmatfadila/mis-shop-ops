import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

// GET /api/knowledge-base
export async function GET(request: NextRequest) {
  try {
    await initDb();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const scope = searchParams.get("scope")?.trim() || "";
    const onlyPinned = searchParams.get("pinned") === "true";

    let query = "SELECT * FROM knowledge_base WHERE is_published = 1";
    const args: any[] = [];

    if (category && category !== "ALL" && category !== "Semua") {
      query += " AND category = ?";
      args.push(category);
    }

    if (scope && scope !== "ALL" && scope !== "Semua") {
      query += " AND (store_scope = ? OR store_scope = 'Semua Toko')";
      args.push(scope);
    }

    if (onlyPinned) {
      query += " AND is_pinned = 1";
    }

    if (search) {
      query += " AND (LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)";
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern);
    }

    query += " ORDER BY is_pinned DESC, id DESC";

    const result = await db.execute({ sql: query, args });

    // Summary statistics for dashboard/header counters
    const statsRes = await db.execute(`
      SELECT 
        COUNT(*) as total_articles,
        SUM(CASE WHEN is_pinned = 1 THEN 1 ELSE 0 END) as pinned_count,
        SUM(view_count) as total_views,
        SUM(helpful_count) as total_helpful
      FROM knowledge_base
      WHERE is_published = 1
    `);

    const stats = statsRes.rows[0] || {
      total_articles: result.rows.length,
      pinned_count: 0,
      total_views: 0,
      total_helpful: 0,
    };

    return NextResponse.json({
      success: true,
      articles: result.rows,
      stats: {
        total_articles: Number(stats.total_articles || 0),
        pinned_count: Number(stats.pinned_count || 0),
        total_views: Number(stats.total_views || 0),
        total_helpful: Number(stats.total_helpful || 0),
      },
    });
  } catch (error: any) {
    console.error("GET /api/knowledge-base error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base (Author: MIS OPS / Admin / Manager)
export async function POST(request: NextRequest) {
  try {
    await initDb();

    const body = await request.json();
    const {
      title,
      category,
      target_role = "SPV Toko",
      store_scope = "Semua Toko",
      summary,
      content,
      steps = [],
      tags = "",
      is_pinned = 0,
      is_published = 1,
      author_name = "MIS OPS Team",
      author_role = "MIS",
    } = body;

    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: "Judul, kategori, dan isi panduan wajib diisi" },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() + "-" + Date.now().toString().slice(-4);

    const stepsJson = typeof steps === "string" ? steps : JSON.stringify(steps);

    const result = await db.execute({
      sql: `
        INSERT INTO knowledge_base (
          title, slug, category, target_role, store_scope, summary, content, steps,
          author_name, author_role, tags, is_pinned, is_published, view_count, helpful_count,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `,
      args: [
        title.trim(),
        slug,
        category.trim(),
        target_role,
        store_scope,
        summary?.trim() || title.trim(),
        content.trim(),
        stepsJson,
        author_name,
        author_role,
        tags.trim(),
        is_pinned ? 1 : 0,
        is_published ? 1 : 0,
      ],
    });

    const newId = Number(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      message: "Panduan SOP berhasil diterbitkan oleh MIS OPS",
      articleId: newId,
    });
  } catch (error: any) {
    console.error("POST /api/knowledge-base error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create article" },
      { status: 500 }
    );
  }
}

