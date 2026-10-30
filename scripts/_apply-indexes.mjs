// Scratch: aplicar DDL index aditif yang sama dengan initDb() ke DB yang sedang berjalan.
import { createClient } from "@libsql/client";
import path from "node:path";

const db = createClient({
  url: `file:${path.resolve(process.cwd(), "shop_ops.db").replace(/\\/g, "/")}`,
});
await db.execute("PRAGMA busy_timeout = 5000;");
const ddl = [
  "CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)",
  "CREATE INDEX IF NOT EXISTS idx_assets_shop ON assets(shop_location)",
  "CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)",
  "CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)",
  "CREATE INDEX IF NOT EXISTS idx_tickets_asset ON tickets(asset_code)",
  "CREATE INDEX IF NOT EXISTS idx_pos_code ON pos_hardware_assets(pos_code)",
  "CREATE INDEX IF NOT EXISTS idx_monitoring_ip ON monitoring_devices(ip_address)",
  "CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)",
  "CREATE INDEX IF NOT EXISTS idx_edc_pos ON edc_assets(pos_location)",
  "CREATE INDEX IF NOT EXISTS idx_rack_ports_grp ON server_rack_ports(device_group)",
];
for (const sql of ddl) {
  await db.execute(sql);
  console.log("APPLIED:", sql.replace("CREATE INDEX IF NOT EXISTS ", ""));
}
const names = ["idx_assets_status","idx_assets_shop","idx_assets_category","idx_tickets_status","idx_tickets_asset","idx_pos_code","idx_monitoring_ip","idx_purchases_status","idx_edc_pos","idx_rack_ports_grp"];
const rows = await db.execute(
  `SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name IN (${names.map(() => "?").join(",")}) ORDER BY name`,
  names
);
console.log(`\nVERIFIED IN sqlite_master: ${rows.rows.length}/10`);
for (const r of rows.rows) console.log(` ${r.name} -> ${r.tbl_name}`);
await db.close();
