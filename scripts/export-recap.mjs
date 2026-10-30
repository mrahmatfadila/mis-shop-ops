#!/usr/bin/env node
/**
 * export-recap.mjs — Rekap jumlah & estimasi nilai aset (READ-ONLY) → docs/RECAP-ASET.md
 *
 * Menjalankan: node scripts/export-recap.mjs
 * Sumber: shop_ops.db (SELECT read-only; tidak ada INSERT/UPDATE/DELETE/DROP).
 *
 * Catatan penting: hanya `t3_fixed_assets.harga_pembelian` dan kolom harga di
 * `purchases` yang tersedia. Tabel aset operasional lain TIDAK menyimpan harga,
 * sehingga "estimasi nilai" di sini bukan laporan akuntansi.
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.join(ROOT, "shop_ops.db");
const DOC_FILE = path.join(ROOT, "docs", "RECAP-ASET.md");

const db = createClient({ url: `file:${DB_FILE.replace(/\\/g, "/")}` });

const all = async (sql, args = []) => (await db.execute({ sql, args })).rows;
const scalar = async (sql, args = []) => {
  const rows = await all(sql, args);
  return Number(Object.values(rows[0] ?? {})[0] ?? 0);
};
const fmtRp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const fmtNum = (n) => Number(n || 0).toLocaleString("id-ID");
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const esc = (s) => String(s ?? "-").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const fmtStamp = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const tableCount = async (t) => scalar(`SELECT COUNT(*) AS n FROM "${t}"`);

async function main() {
  const startedAt = new Date();
  const tables = ["assets", "dvr_assets", "edc_assets", "knowledge_base", "monitoring_devices", "office_hardware_assets", "phone_extensions", "pos_hardware_assets", "purchases", "role_permissions", "server_rack_ports", "server_rack_units", "t3_fixed_assets", "tickets", "users"];
  const counts = {};
  let totalRows = 0;
  for (const t of tables) {
    counts[t] = await tableCount(t);
    totalRows += counts[t];
  }

  // ---- Jumlah unit per lokasi (per tabel, taxonomi lokasi berbeda-beda) ----
  const assetsByShop = (await all("SELECT shop_location, COUNT(*) AS n FROM assets GROUP BY shop_location ORDER BY n DESC")).map((r) => ({ key: String(r.shop_location), n: Number(r.n) }));
  const posByShop = (await all("SELECT shop_name, COUNT(*) AS n FROM pos_hardware_assets GROUP BY shop_name ORDER BY n DESC")).map((r) => ({ key: String(r.shop_name), n: Number(r.n) }));
  const posByTerminal = (await all("SELECT terminal, COUNT(*) AS n FROM pos_hardware_assets GROUP BY terminal ORDER BY n DESC")).map((r) => ({ key: String(r.terminal), n: Number(r.n) }));
  const officeByLoc = (await all("SELECT office_location, COUNT(*) AS n FROM office_hardware_assets GROUP BY office_location ORDER BY n DESC")).map((r) => ({ key: String(r.office_location), n: Number(r.n) }));
  const edcByShop = (await all("SELECT shop_name, COUNT(*) AS n FROM edc_assets GROUP BY shop_name ORDER BY n DESC")).map((r) => ({ key: String(r.shop_name), n: Number(r.n) }));
  const dvrByLoc = (await all("SELECT location, COUNT(*) AS n FROM dvr_assets GROUP BY location ORDER BY n DESC")).map((r) => ({ key: String(r.location), n: Number(r.n) }));

  // ---- Kategori ----
  const assetsByCat = (await all("SELECT category, COUNT(*) AS n FROM assets GROUP BY category ORDER BY n DESC")).map((r) => ({ key: String(r.category), n: Number(r.n) }));
  const posByBrand = (await all("SELECT pos_brand, COUNT(*) AS n FROM pos_hardware_assets GROUP BY pos_brand ORDER BY n DESC")).map((r) => ({ key: String(r.pos_brand), n: Number(r.n) }));
  const officeByType = (await all("SELECT device_type, COUNT(*) AS n FROM office_hardware_assets GROUP BY device_type ORDER BY n DESC")).map((r) => ({ key: String(r.device_type), n: Number(r.n) }));
  const dvrByType = (await all("SELECT dvr_type, COUNT(*) AS n FROM dvr_assets GROUP BY dvr_type ORDER BY n DESC")).map((r) => ({ key: String(r.dvr_type), n: Number(r.n) }));

  // ---- t3 fixed assets: nilai per lokasi & kategori ----
  const t3Total = (await all("SELECT COUNT(*) AS n, SUM(harga_pembelian * qty) AS nilai FROM t3_fixed_assets"))[0];
  const t3ByLoc = (await all("SELECT lokasi, COUNT(*) AS n, SUM(harga_pembelian * qty) AS nilai FROM t3_fixed_assets GROUP BY lokasi ORDER BY nilai DESC")).map((r) => ({ key: String(r.lokasi), n: Number(r.n), value: Number(r.nilai) || 0 }));
  const t3ByCat = (await all("SELECT kategori, COUNT(*) AS n, SUM(harga_pembelian * qty) AS nilai FROM t3_fixed_assets GROUP BY kategori ORDER BY nilai DESC")).map((r) => ({ key: String(r.kategori), n: Number(r.n), value: Number(r.nilai) || 0 }));

  // ---- purchases ----
  const pTotal = (await all("SELECT COUNT(*) AS n, SUM(total_price) AS total, SUM(estimated_price * quantity) AS estimasi, SUM(CASE WHEN item_price = 0 OR item_price IS NULL THEN 1 ELSE 0 END) AS item_price_nol FROM purchases"))[0];
  const pByLoc = (await all("SELECT target_location, COUNT(*) AS n, SUM(total_price) AS nilai, SUM(estimated_price * quantity) AS estimasi FROM purchases GROUP BY target_location ORDER BY nilai DESC")).map((r) => ({ key: String(r.target_location), n: Number(r.n), value: Number(r.nilai) || 0, estimate: Number(r.estimasi) || 0 }));
  const pByCat = (await all("SELECT category, COUNT(*) AS n, SUM(total_price) AS nilai FROM purchases GROUP BY category ORDER BY nilai DESC")).map((r) => ({ key: String(r.category), n: Number(r.n), value: Number(r.nilai) || 0 }));
  const pByStatus = (await all("SELECT status, COUNT(*) AS n FROM purchases GROUP BY status ORDER BY n DESC")).map((r) => ({ key: String(r.status), n: Number(r.n) }));
  const pTargetPos = await scalar("SELECT COUNT(*) AS n FROM purchases WHERE target_pos_code IS NOT NULL AND TRIM(target_pos_code) NOT IN ('', '-')");
  const pInstalledPos = await scalar("SELECT COUNT(*) AS n FROM purchases WHERE installed_pos_code IS NOT NULL AND TRIM(installed_pos_code) NOT IN ('', '-')");
  const pInstalledAt = await scalar("SELECT COUNT(*) AS n FROM purchases WHERE installed_at IS NOT NULL AND TRIM(installed_at) NOT IN ('', '-')");

  const grand = (Number(t3Total.nilai) || 0) + (Number(pTotal.total) || 0);

  // ---- Markdown ----
  const md = [];
  md.push("# Rekap Aset — MIS SHOP OPS");
  md.push("");
  md.push(`> Dibuat otomatis oleh \`scripts/export-recap.mjs\` · ${fmtStamp(startedAt)} (Asia/Bangkok)`);
  md.push(`> Sumber: \`shop_ops.db\` (${totalRows} baris / 15 tabel), query **read-only**.`);
  md.push("> ⚠️ Angka nilai adalah **estimasi dari data yang tersedia**, bukan laporan akuntansi — lihat §5 Keterbatasan.");
  md.push("");
  md.push("## 1. Ringkasan");
  md.push("");
  md.push("| Sumber data | Unit | Lokasi | Kategori | Estimasi nilai |");
  md.push("|---|---:|---|---|---:|");
  md.push(`| \`assets\` (aset operasional) | ${counts.assets} | \`shop_location\` | \`category\` | — (tidak ada kolom harga) |`);
  md.push(`| \`pos_hardware_assets\` (POS) | ${counts.pos_hardware_assets} | \`shop_name\` + \`terminal\` | \`pos_brand\` | — (tidak ada kolom harga) |`);
  md.push(`| \`office_hardware_assets\` | ${counts.office_hardware_assets} | \`office_location\` | \`device_type\` | — (tidak ada kolom harga) |`);
  md.push(`| \`edc_assets\` (EDC) | ${counts.edc_assets} | \`shop_name\` | — | — (tidak ada kolom harga) |`);
  md.push(`| \`dvr_assets\` (CCTV/DVR) | ${counts.dvr_assets} | \`location\` | \`dvr_type\` | — (tidak ada kolom harga) |`);
  md.push(`| \`t3_fixed_assets\` (aset tetap T3) | ${counts.t3_fixed_assets} | \`lokasi\` | \`kategori\` | **${fmtRp(t3Total.nilai)}** |`);
  md.push(`| \`purchases\` (pengadaan) | ${counts.purchases} | \`target_location\` | \`category\` | **${fmtRp(pTotal.total)}** |`);
  md.push(`| **TOTAL nilai tercatat** | — | — | — | **${fmtRp(grand)}** |`);
  md.push("");
  md.push(`Grand total = nilai aset tetap T3 (${fmtRp(t3Total.nilai)}) + total pengadaan (${fmtRp(pTotal.total)}). Keduanya **populasi berbeda** — jangan dianggap satu nilai akuntansi.`);
  md.push("");

  const section = (num, title, rows, valueLabel = null) => {
    md.push(`### ${num} ${title}`);
    md.push("");
    md.push(`| ${valueLabel ? "Lokasi/Kategori" : "Lokasi/Kategori"} | Unit |${valueLabel ? ` ${valueLabel} |` : ""}`);
    md.push(`|---|---:|${valueLabel ? "---:|" : ""}`);
    for (const r of rows) md.push(`| \`${esc(r.key)}\` | ${r.n} |${valueLabel ? ` ${fmtRp(r.value)} |` : ""}`);
    const totalN = rows.reduce((s, r) => s + r.n, 0);
    const totalV = rows.reduce((s, r) => s + (r.value || 0), 0);
    md.push(`| **TOTAL** | **${totalN}** |${valueLabel ? ` **${fmtRp(totalV)}** |` : ""}`);
    md.push("");
  };

  md.push("## 2. Jumlah Unit per Lokasi");
  md.push("");
  section("2.1", "`assets` per `shop_location`", assetsByShop);
  section("2.2", "`pos_hardware_assets` per `shop_name`", posByShop);
  section("2.3", "`pos_hardware_assets` per `terminal`", posByTerminal);
  section("2.4", "`office_hardware_assets` per `office_location`", officeByLoc);
  section("2.5", "`edc_assets` per `shop_name`", edcByShop);
  section("2.6", "`dvr_assets` per `location`", dvrByLoc);
  section("2.7", "`t3_fixed_assets` per `lokasi` (dengan nilai)", t3ByLoc, "Nilai");

  md.push("## 3. Jumlah & Nilai per Kategori");
  md.push("");
  section("3.1", "`assets` per `category`", assetsByCat);
  section("3.2", "`pos_hardware_assets` per `pos_brand`", posByBrand);
  section("3.3", "`office_hardware_assets` per `device_type`", officeByType);
  section("3.4", "`dvr_assets` per `dvr_type`", dvrByType);
  section("3.5", "`t3_fixed_assets` per `kategori` (dengan nilai)", t3ByCat, "Nilai");

  md.push("## 4. Rekap `purchases` (PO vs Installed)");
  md.push("");
  md.push(`- Total PO: **${pTotal.n}**`);
  md.push(`- PO dengan \`target_pos_code\` terisi: **${pTargetPos}**`);
  md.push(`- PO dengan \`installed_pos_code\` terisi (terpasang): **${pInstalledPos}**`);
  md.push(`- PO dengan \`installed_at\` terisi: **${pInstalledAt}**`);
  md.push(`- Total nilai (\`total_price\`): **${fmtRp(pTotal.total)}**`);
  md.push(`- Estimasi (\`estimated_price × quantity\`): **${fmtRp(pTotal.estimasi)}**`);
  md.push(`- \`item_price\` = 0: **${pTotal.item_price_nol}/${pTotal.n} PO** — sumber harga tidak konsisten, gunakan \`total_price\` untuk rekap.`);
  md.push("");
  md.push("### 4.1 Status pengadaan");
  md.push("");
  md.push("| Status | PO |");
  md.push("|---|---:|");
  for (const r of pByStatus) md.push(`| \`${esc(r.key)}\` | ${r.n} |`);
  md.push("");
  section("4.2", "`purchases` per `target_location` (dengan nilai)", pByLoc, "Total (`total_price`)");
  md.push("### 4.3 `purchases` per `category`");
  md.push("");
  md.push("| Kategori | PO | Total |");
  md.push("|---|---:|---:|");
  for (const r of pByCat) md.push(`| \`${esc(r.key)}\` | ${r.n} | ${fmtRp(r.value)} |`);
  md.push("");

  md.push("## 5. Keterbatasan Data");
  md.push("");
  md.push("1. **Hanya 2 sumber punya komponen harga**: `t3_fixed_assets.harga_pembelian` dan `purchases` (`estimated_price`, `total_price`, `item_price`). `assets`, `pos_hardware_assets`, `office_hardware_assets`, `edc_assets`, `dvr_assets`, `monitoring_devices`, `tickets`, `users` **tidak punya kolom harga** → jumlah unit tidak bisa dikonversi ke nilai.");
  md.push("2. **`purchases` = pengadaan, bukan kapitalisasi aset.** PO bisa berisi consumable/periferal yang tidak menjadi aset tetap; menjumlahkan dengan `t3_fixed_assets` hanya untuk indikasi kebutuhan, bukan nilai buku.");
  md.push("3. **Harga perolehan, tanpa penyusutan.** `harga_pembelian` adalah nilai beli; tidak ada umur ekonomis/penyusutan di DB.");
  md.push("4. **`purchases.item_price` = 0 pada mayoritas PO** — `total_price` dipakai sebagai basis rekap; `estimated_price × quantity` berbeda (lihat §4).");
  md.push("5. **Nama lokasi tidak konsisten antar tabel**: `Plaza Bali` vs `Plaza Bali (CGK)`; `Surabaya` vs `Cabang Surabaya` vs `Office Surabaya`; `t3_fixed_assets.lokasi` berformat kode `DF1`–`DF7`. Rekap per lokasi **tidak bisa di-join langsung** tanpa mapping.");
  md.push("6. **Snapshot point-in-time**: angka diambil saat script berjalan; DB ber-WAL dan server produksi aktif sehingga data dapat berubah setelah laporan ini dibuat.");
  md.push("7. Nilai dibulatkan ke Rupiah penuh; `qty` pada t3 dipakai sebagai pengali.");
  md.push("");
  md.push("## 6. Rekomendasi");
  md.push("");
  md.push("| Prioritas | Rekomendasi |");
  md.push("|---|---|");
  md.push("| P1 | Buat tabel mapping lokasi standar (`shop_location`) dan terapkan ke `assets`, `pos_hardware_assets`, `office_hardware_assets`, `edc_assets`, `dvr_assets`, `purchases.target_location`, `t3_fixed_assets.lokasi` — **butuh persetujuan user**. |");
  md.push("| P2 | Tambahkan kolom harga perolehan pada tabel aset operasional (atau relasi ke `purchases`) bila dashboard butuh nilai total aset — **butuh keputusan user** (perubahan skema). |");
  md.push("| P2 | Konsistenkan `purchases.item_price` vs `total_price` (sumber harga tunggal) — **butuh persetujuan user**. |");
  md.push("| P3 | Jadwalkan `node scripts/export-recap.mjs` + `scripts/db-audit.mjs` sebagai laporan harian ke docs — aman diotomatiskan (read-only). |");
  md.push("");
  md.push("---");
  md.push("*Dibuat oleh agent `data` — MIS SHOP OPS SHIFT 2. DB live hanya dibaca; tidak ada perubahan data/skema.*");

  fs.mkdirSync(path.dirname(DOC_FILE), { recursive: true });
  fs.writeFileSync(DOC_FILE, `${md.join("\n")}\n`, "utf8");

  // ---- Terminal ringkas ----
  const L = [];
  L.push("=".repeat(76));
  L.push(` EXPORT RECAP ASET · ${fmtStamp(startedAt)}`);
  L.push("=".repeat(76));
  L.push(` Tabel terpantau : ${tables.length} (total ${totalRows} baris)`);
  L.push("");
  L.push(` ${pad("Lokasi (assets)", 24)}${padL("UNIT", 6)}`);
  for (const r of assetsByShop) L.push(` ${pad(r.key, 24)}${padL(r.n, 6)}`);
  L.push("");
  L.push(` ${pad("Kategori (t3)", 24)}${padL("UNIT", 6)}${padL("NILAI", 16)}`);
  for (const r of t3ByCat) L.push(` ${pad(r.key, 24)}${padL(r.n, 6)}${padL(fmtRp(r.value), 16)}`);
  L.push("");
  L.push(` ${pad("Lokasi (purchases)", 24)}${padL("PO", 6)}${padL("TOTAL", 16)}`);
  for (const r of pByLoc) L.push(` ${pad(r.key, 24)}${padL(r.n, 6)}${padL(fmtRp(r.value), 16)}`);
  L.push("");
  L.push(` t3_fixed_assets : ${t3Total.n} unit · ${fmtRp(t3Total.nilai)}`);
  L.push(` purchases       : ${pTotal.n} PO · total ${fmtRp(pTotal.total)} · estimasi ${fmtRp(pTotal.estimasi)}`);
  L.push(` PO terpasang    : target_pos=${pTargetPos} · installed_pos=${pInstalledPos} · installed_at=${pInstalledAt}`);
  L.push(` item_price=0    : ${pTotal.item_price_nol}/${pTotal.n} PO`);
  L.push(` GRAND TOTAL     : ${fmtRp(grand)} (bukan laporan akuntansi)`);
  L.push("");
  L.push(` Laporan: docs/RECAP-ASET.md`);
  L.push("=".repeat(76));
  console.log(L.join("\n"));
}

try {
  await main();
  process.exitCode = 0;
} catch (err) {
  console.error(`EXPORT RECAP GAGAL: ${err?.message || err}`);
  process.exitCode = 1;
} finally {
  try {
    await db.close();
  } catch {
    /* ignore */
  }
}
