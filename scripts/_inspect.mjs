import { createClient } from "@libsql/client";

const db = createClient({ url: "file:shop_ops.db" });

const tables = await db.execute(
  "SELECT name, type FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type, name"
);
console.log("=== sqlite_master ===");
for (const r of tables.rows) console.log(r.type, "|", r.name);

const names = tables.rows.filter((r) => r.type === "table").map((r) => r.name);
console.log("\n=== schema ===");
for (const n of names) {
  const sql = await db.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
    [n]
  );
  console.log("\n--", n, "--");
  console.log(sql.rows[0]?.sql);
}

export {};
