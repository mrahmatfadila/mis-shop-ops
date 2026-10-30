import { createClient } from "@libsql/client";
const db = createClient({ url: "file:shop_ops.db" });
const q = async (label, sql) => {
  const r = await db.execute(sql);
  console.log(`\n### ${label} (${r.rows.length})`);
  for (const row of r.rows.slice(0, 30)) console.log(JSON.stringify(row));
};
await q("monitoring orphans", `SELECT m.asset_code, m.ip_address FROM monitoring_devices m WHERE m.asset_code NOT IN (SELECT asset_code FROM assets) AND m.asset_code NOT IN (SELECT pos_code FROM pos_hardware_assets) ORDER BY m.asset_code`);
await q("monitoring orphan match others", `SELECT m.asset_code,
 (SELECT COUNT(*) FROM t3_fixed_assets t WHERE t.no_asset=m.asset_code) t3,
 (SELECT COUNT(*) FROM office_hardware_assets o WHERE o.asset_code=m.asset_code) office,
 (SELECT COUNT(*) FROM dvr_assets d WHERE d.asset_code=m.asset_code) dvr,
 (SELECT COUNT(*) FROM server_rack_units s WHERE s.name=m.asset_code) rack
 FROM monitoring_devices m WHERE m.asset_code NOT IN (SELECT asset_code FROM assets) AND m.asset_code NOT IN (SELECT pos_code FROM pos_hardware_assets) ORDER BY m.asset_code`);
await q("edc orphans", `SELECT e.pos_location, e.shop_name FROM edc_assets e WHERE e.pos_location NOT IN (SELECT pos_code FROM pos_hardware_assets) ORDER BY e.pos_location`);
await q("edc orphan near match", `SELECT e.pos_location,
 (SELECT COUNT(*) FROM pos_hardware_assets p WHERE p.pos_code LIKE '%'||e.pos_location||'%' OR e.pos_location LIKE '%'||p.pos_code||'%') near
 FROM edc_assets e WHERE e.pos_location NOT IN (SELECT pos_code FROM pos_hardware_assets) ORDER BY e.pos_location`);
await q("t3 count", `SELECT COUNT(*) n FROM t3_fixed_assets`);
await q("office count", `SELECT COUNT(*) n FROM office_hardware_assets`);
await q("empty pos codes", `SELECT COUNT(*) n FROM pos_hardware_assets WHERE pos_code IS NULL OR TRIM(pos_code)=''`);
export {};
