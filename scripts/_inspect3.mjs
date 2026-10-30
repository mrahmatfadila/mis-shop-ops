import { createClient } from "@libsql/client";

const db = createClient({ url: "file:shop_ops.db" });
const q = async (label, sql) => {
  const r = await db.execute(sql);
  console.log(`\n### ${label}`);
  for (const row of r.rows.slice(0, 40)) console.log(JSON.stringify(row));
  console.log(`rows: ${r.rows.length}`);
};

await q("counts", `SELECT 'assets' t, COUNT(*) n FROM assets UNION ALL SELECT 'pos', COUNT(*) FROM pos_hardware_assets UNION ALL SELECT 'purchases', COUNT(*) FROM purchases UNION ALL SELECT 'tickets', COUNT(*) FROM tickets UNION ALL SELECT 'monitoring', COUNT(*) FROM monitoring_devices UNION ALL SELECT 'edc', COUNT(*) FROM edc_assets UNION ALL SELECT 'users', COUNT(*) FROM users`);
await q("purchases target", `SELECT target_pos_code, COUNT(*) c FROM purchases GROUP BY target_pos_code ORDER BY c DESC LIMIT 15`);
await q("purchases installed", `SELECT installed_pos_code, COUNT(*) c FROM purchases GROUP BY installed_pos_code ORDER BY c DESC LIMIT 15`);
await q("monitoring sample", `SELECT asset_code FROM monitoring_devices LIMIT 10`);
await q("tickets sample", `SELECT asset_code FROM tickets LIMIT 10`);
await q("edc sample", `SELECT pos_location FROM edc_assets LIMIT 5`);
await q("users roles", `SELECT role, COUNT(*) c FROM users GROUP BY role`);
await q("distinct tickets asset not in either", `SELECT COUNT(*) c FROM tickets t WHERE t.asset_code NOT IN (SELECT asset_code FROM assets) AND t.asset_code NOT IN (SELECT pos_code FROM pos_hardware_assets)`);
await q("distinct monitoring asset not in either", `SELECT COUNT(*) c FROM monitoring_devices t WHERE t.asset_code NOT IN (SELECT asset_code FROM assets) AND t.asset_code NOT IN (SELECT pos_code FROM pos_hardware_assets)`);
await q("distinct edc orphan", `SELECT COUNT(*) c FROM edc_assets e WHERE e.pos_location NOT IN (SELECT pos_code FROM pos_hardware_assets)`);
await q("purchases target orphan", `SELECT COUNT(*) c FROM purchases p WHERE p.target_pos_code NOT IN ('-','') AND p.target_pos_code IS NOT NULL AND p.target_pos_code NOT IN (SELECT pos_code FROM pos_hardware_assets)`);
await q("purchases installed orphan", `SELECT COUNT(*) c FROM purchases p WHERE p.installed_pos_code NOT IN ('-','') AND p.installed_pos_code IS NOT NULL AND p.installed_pos_code NOT IN (SELECT pos_code FROM pos_hardware_assets)`);
await q("integrity", `PRAGMA integrity_check`);
await q("quick", `PRAGMA quick_check`);
await q("journal", `PRAGMA journal_mode`);
export {};
