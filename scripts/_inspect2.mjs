import { createClient } from "@libsql/client";

const db = createClient({ url: "file:shop_ops.db" });
const idx = await db.execute(
  "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name"
);
for (const r of idx.rows) {
  console.log(`${r.tbl_name} | ${r.name} | ${r.sql ? r.sql.replace(/\s+/g, " ") : "(auto)"}`);
}
export {};
