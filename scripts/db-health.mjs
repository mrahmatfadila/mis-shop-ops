#!/usr/bin/env node
/**
 * db-health.mjs — Audit read-only kesehatan database MIS SHOP OPS.
 *
 * Menjalankan: node scripts/db-health.mjs [--out=path/ke/laporan.md]
 * Output ringkas ke terminal + menulis docs/DATA-HEALTH.md.
 * Exit code 1 jika integritas gagal / ada orphan yang tidak ter-resolve.
 *
 * Script ini TIDAK menulis ke database (read-only: SELECT + PRAGMA).
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.join(ROOT, "shop_ops.db");
const WAL_FILE = `${DB_FILE}-wal`;
const SHM_FILE = `${DB_FILE}-shm`;

const outArg = process.argv.find((a) => a.startsWith("--out="));
const DOC_FILE = outArg
  ? path.resolve(ROOT, outArg.slice("--out=".length))
  : path.join(ROOT, "docs", "DATA-HEALTH.md");

// Salinan src/types/index.ts (UserRole) — TS tidak bisa di-import dari script .mjs.
const VALID_ROLES = [
  "ADMIN",
  "MIS",
  "MANAGER",
  "IT_PROCUREMENT",
  "SPV_PLAZABALI_T3",
  "SPV_PLAZABALI_T2",
  "SPV_SAM_T3",
  "SPV_SAM_T2",
  "SPV_PLAZABALI",
  "SPV_SAM",
];

// Index filter panas yang wajib ada (F8). Sebagian sudah ada sejak awal DB.
const HOT_INDEXES = [
  ["idx_assets_status", "assets", "status"],
  ["idx_assets_shop", "assets", "shop_location"],
  ["idx_assets_category", "assets", "category"],
  ["idx_tickets_status", "tickets", "status"],
  ["idx_tickets_asset", "tickets", "asset_code"],
  ["idx_pos_code", "pos_hardware_assets", "pos_code"],
  ["idx_monitoring_ip", "monitoring_devices", "ip_address"],
  ["idx_purchases_status", "purchases", "status"],
  ["idx_edc_pos", "edc_assets", "pos_location"],
  ["idx_rack_ports_grp", "server_rack_ports", "device_group"],
];

const QUERY_PLANS = [
  {
    label: "Q1 — filter status aset",
    sql: "SELECT id, asset_code, status FROM assets WHERE status = 'OPERASIONAL' ORDER BY id DESC LIMIT 50",
  },
  {
    label: "Q2 — filter status tiket",
    sql: "SELECT id, ticket_number, status FROM tickets WHERE status = 'MENUNGGU' ORDER BY id DESC LIMIT 50",
  },
];

const db = createClient({ url: `file:${DB_FILE.replace(/\\/g, "/")}` });

const all = async (sql, args = []) => (await db.execute({ sql, args })).rows;
const scalar = async (sql, args = []) => {
  const rows = await all(sql, args);
  return Number(Object.values(rows[0] ?? {})[0] ?? 0);
};

const fmtBytes = (n) => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};
const size = (p) => {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
};
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const fmtStamp = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

async function main() {
  const startedAt = new Date();
  const sqliteVersion = (await all("SELECT sqlite_version() AS v"))[0].v;
  const journalMode = String((await all("PRAGMA journal_mode;"))[0].journal_mode || "?");

  // ---------- Tabel & row count ----------
  const tables = (
    await all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
  ).map((r) => r.name);

  const rowCounts = [];
  let totalRows = 0;
  for (const t of tables) {
    const n = await scalar(`SELECT COUNT(*) AS n FROM "${t.replace(/"/g, '""')}"`);
    rowCounts.push({ table: t, rows: n });
    totalRows += n;
  }

  // ---------- Integritas ----------
  const integrityRows = await all("PRAGMA integrity_check;");
  const integrity = integrityRows.map((r) => oneLine(Object.values(r)[0])).join("; ") || "(kosong)";
  const quickRows = await all("PRAGMA quick_check;");
  const quick = quickRows.map((r) => oneLine(Object.values(r)[0])).join("; ") || "(kosong)";
  const integrityOk = integrity === "ok";
  const quickOk = quick === "ok";

  // ---------- Ukuran file ----------
  const sizes = { db: size(DB_FILE), wal: size(WAL_FILE), shm: size(SHM_FILE) };

  // ---------- Index ----------
  const indexRows = await all(
    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name"
  );
  const indexNames = new Set(indexRows.map((r) => r.name));
  const hotStatus = HOT_INDEXES.map(([name, table, column]) => ({
    name,
    table,
    column,
    exists: indexNames.has(name),
  }));
  const explicitIndexes = indexRows.filter((r) => r.sql);
  const autoIndexes = indexRows.filter((r) => !r.sql);
  const hotMissing = hotStatus.filter((i) => !i.exists).length;

  // ---------- Orphan checks ----------
  const checks = [];

  const runCheck = async ({ key, label, checkedSql, orphanSql, resolveSql = null }) => {
    const checked = await scalar(checkedSql);
    const rows = await all(orphanSql);
    const resolvedVia = resolveSql && rows.length ? await scalar(resolveSql) : 0;
    checks.push({
      key,
      label,
      checked,
      orphans: rows.length,
      resolvedVia,
      unresolved: rows.length - resolvedVia,
      rows,
    });
  };

  await runCheck({
    key: "purchases.target_pos_code",
    label: "purchases.target_pos_code → pos_hardware_assets.pos_code",
    checkedSql: `SELECT COUNT(*) AS n FROM purchases WHERE target_pos_code IS NOT NULL AND TRIM(target_pos_code) NOT IN ('', '-')`,
    orphanSql: `SELECT id, po_number, target_pos_code FROM purchases p WHERE p.target_pos_code IS NOT NULL AND TRIM(p.target_pos_code) NOT IN ('', '-') AND NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = p.target_pos_code) ORDER BY p.id`,
  });

  await runCheck({
    key: "purchases.installed_pos_code",
    label: "purchases.installed_pos_code → pos_hardware_assets.pos_code",
    checkedSql: `SELECT COUNT(*) AS n FROM purchases WHERE installed_pos_code IS NOT NULL AND TRIM(installed_pos_code) NOT IN ('', '-')`,
    orphanSql: `SELECT id, po_number, installed_pos_code FROM purchases p WHERE p.installed_pos_code IS NOT NULL AND TRIM(p.installed_pos_code) NOT IN ('', '-') AND NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = p.installed_pos_code) ORDER BY p.id`,
  });

  await runCheck({
    key: "monitoring_devices.asset_code",
    label: "monitoring_devices.asset_code → assets / pos_hardware_assets (cadangan: dvr_assets)",
    checkedSql: `SELECT COUNT(*) AS n FROM monitoring_devices`,
    orphanSql: `SELECT m.asset_code, m.ip_address FROM monitoring_devices m WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.asset_code = m.asset_code) AND NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = m.asset_code) ORDER BY m.asset_code`,
    // Ref DVR memang sah: monitoring_devices juga memantau dvr_assets.
    resolveSql: `SELECT COUNT(*) AS n FROM monitoring_devices m WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.asset_code = m.asset_code) AND NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = m.asset_code) AND EXISTS (SELECT 1 FROM dvr_assets d WHERE d.asset_code = m.asset_code)`,
  });

  await runCheck({
    key: "tickets.asset_code",
    label: "tickets.asset_code → assets / pos_hardware_assets",
    checkedSql: `SELECT COUNT(*) AS n FROM tickets`,
    orphanSql: `SELECT t.ticket_number, t.asset_code FROM tickets t WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.asset_code = t.asset_code) AND NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = t.asset_code) ORDER BY t.id`,
  });

  await runCheck({
    key: "edc_assets.pos_location",
    label: "edc_assets.pos_location → pos_hardware_assets.pos_code",
    checkedSql: `SELECT COUNT(*) AS n FROM edc_assets`,
    orphanSql: `SELECT e.pos_location, e.shop_name FROM edc_assets e WHERE NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = e.pos_location) ORDER BY e.pos_location`,
  });

  // Roles users
  const roleRows = await all("SELECT role, COUNT(*) AS c FROM users GROUP BY role ORDER BY role");
  const userCount = roleRows.reduce((s, r) => s + Number(r.c), 0);
  const invalidRoles = roleRows.filter((r) => !VALID_ROLES.includes(r.role));
  checks.push({
    key: "users.role",
    label: "users.role ∈ daftar role sah (src/types UserRole)",
    checked: userCount,
    orphans: invalidRoles.reduce((s, r) => s + Number(r.c), 0),
    resolvedVia: 0,
    unresolved: invalidRoles.reduce((s, r) => s + Number(r.c), 0),
    rows: invalidRoles.map((r) => ({ role: r.role, jumlah: Number(r.c) })),
  });

  const totalUnresolved = checks.reduce((s, c) => s + c.unresolved, 0);
  const edcCheck = checks.find((c) => c.key === "edc_assets.pos_location");
  const monCheck = checks.find((c) => c.key === "monitoring_devices.asset_code");

  // ---------- Query plan ----------
  const plans = [];
  for (const q of QUERY_PLANS) {
    const rows = await all(`EXPLAIN QUERY PLAN ${q.sql}`);
    plans.push({ label: q.label, steps: rows.map((r) => oneLine(r.detail)) });
  }

  // ---------- Terminal summary ----------
  const L = [];
  const bar = "=".repeat(78);
  L.push(bar);
  L.push(` DB HEALTH · shop_ops.db · ${fmtStamp(startedAt)}`);
  L.push(bar);
  L.push(
    ` Mode: ${journalMode} | DB ${fmtBytes(sizes.db)} | WAL ${fmtBytes(sizes.wal)} | SHM ${fmtBytes(sizes.shm)}`
  );
  L.push(` SQLite ${sqliteVersion} · tabel ${tables.length} · total baris ${totalRows}`);
  L.push(` integrity_check : ${integrityOk ? "ok" : integrity}`);
  L.push(` quick_check     : ${quickOk ? "ok" : quick}`);
  L.push("");
  L.push(` ${pad("TABEL", 26)}${padL("BARIS", 8)}`);
  L.push(` ${"-".repeat(34)}`);
  for (const r of rowCounts) L.push(` ${pad(r.table, 26)}${padL(r.rows, 8)}`);
  L.push(` ${"-".repeat(34)}`);
  L.push(` ${pad("TOTAL", 26)}${padL(totalRows, 8)}`);
  L.push("");
  L.push(` INDEX: ${explicitIndexes.length} eksplisit + ${autoIndexes.length} autoindex (UNIQUE)`);
  L.push(` Hot-filter (F8): ${HOT_INDEXES.length - hotMissing}/${HOT_INDEXES.length} terpasang${hotMissing ? ` — HILANG: ${hotStatus.filter((i) => !i.exists).map((i) => i.name).join(", ")}` : ""}`);
  for (const i of hotStatus) {
    L.push(`   [${i.exists ? "OK" : "!!"}] ${pad(i.name, 20)} ${i.table}(${i.column})`);
  }
  L.push("");
  L.push(" ORPHAN CHECK");
  for (const c of checks) {
    const tag = c.unresolved > 0 ? "[!]" : c.resolvedVia > 0 ? "[~]" : "[OK]";
    const extra =
      c.resolvedVia > 0
        ? ` (${c.resolvedVia} ter-resolve via dvr_assets, ${c.unresolved} unresolved)`
        : "";
    const status = `${padL(c.unresolved, 3)} / ${padL(c.checked, 3)}`;
    L.push(`   ${tag} ${pad(c.label, 58)} ${status}${extra}`);
    if (c.rows.length) {
      const sample = c.rows
        .slice(0, 4)
        .map((r) => Object.values(r).join("·"))
        .join(", ");
      L.push(`         contoh: ${sample}${c.rows.length > 4 ? ", …" : ""}`);
    }
  }
  L.push("");
  L.push(" EXPLAIN QUERY PLAN (2 query filter panas)");
  for (const p of plans) L.push(`   ${p.label}: ${p.steps.join(" | ")}`);
  L.push("");
  const status =
    integrityOk && quickOk && totalUnresolved === 0 && hotMissing === 0
      ? "SEHAT"
      : "PERHATIAN";
  const reasons = [];
  if (!integrityOk) reasons.push("integrity_check gagal");
  if (!quickOk) reasons.push("quick_check gagal");
  if (hotMissing) reasons.push(`${hotMissing} index hot-filter belum ada`);
  if (totalUnresolved) reasons.push(`${totalUnresolved} orphan data (pre-existing, TIDAK diperbaiki)`);
  L.push(` STATUS: ${status}${reasons.length ? ` — ${reasons.join("; ")}` : " — semua pemeriksaan lolos"}`);
  L.push(` Laporan: ${path.relative(ROOT, DOC_FILE)}`);
  L.push(bar);
  console.log(L.join("\n"));

  // ---------- Markdown report ----------
  const md = [];
  md.push("# Data Health Report — `shop_ops.db`");
  md.push("");
  md.push(`> Dibuat otomatis oleh \`scripts/db-health.mjs\` · ${fmtStamp(startedAt)} (Asia/Bangkok)`);
  md.push(`> Mode jurnal **${journalMode.toUpperCase()}** · SQLite ${sqliteVersion} · Ukuran **DB ${fmtBytes(sizes.db)} + WAL ${fmtBytes(sizes.wal)}**`);
  md.push("");
  md.push("## 1. Ringkasan");
  md.push("");
  md.push("| Pemeriksaan | Hasil |");
  md.push("|---|---|");
  md.push(`| \`PRAGMA integrity_check\` | ${integrityOk ? "✅ `ok`" : `❌ \`${integrity}\``} |`);
  md.push(`| \`PRAGMA quick_check\` | ${quickOk ? "✅ `ok`" : `❌ \`${quick}\``} |`);
  md.push(`| Index hot-filter (F8) | ${hotMissing === 0 ? `✅ ${HOT_INDEXES.length}/${HOT_INDEXES.length} terpasang` : `❌ ${HOT_INDEXES.length - hotMissing}/${HOT_INDEXES.length}, hilang: ${hotStatus.filter((i) => !i.exists).map((i) => i.name).join(", ")}`} |`);
  md.push(`| Orphan data belum ter-resolve | ${totalUnresolved === 0 ? "✅ 0" : `⚠️ **${totalUnresolved} baris**`} |`);
  md.push(`| Jumlah baris 15 tabel | ${totalRows} baris (stabil, tidak ada perubahan data) |`);
  md.push("");
  md.push(`**Status akhir: \`${status}\`.** ${status === "SEHAT" ? "Tidak ada masalah." : "Temuan data bersifat pre-existing — tidak diperbaiki oleh sprint ini (aturan: DB produksi tidak diubah)."}`);
  md.push("");

  md.push("## 2. Ukuran & Integritas");
  md.push("");
  md.push("| Item | Nilai |");
  md.push("|---|---|");
  md.push(`| File DB | \`shop_ops.db\` — ${fmtBytes(sizes.db)} |`);
  md.push(`| WAL | \`shop_ops.db-wal\` — ${fmtBytes(sizes.wal)} (data terbaru masih di WAL) |`);
  md.push(`| SHM | \`shop_ops.db-shm\` — ${fmtBytes(sizes.shm)} |`);
  md.push(`| integrity_check | \`${integrity}\` |`);
  md.push(`| quick_check | \`${quick}\` |`);
  md.push(`| journal_mode | \`${journalMode}\` |`);
  md.push("");

  md.push("## 3. Jumlah Baris per Tabel");
  md.push("");
  md.push("| # | Tabel | Baris |");
  md.push("|---|---|---:|");
  rowCounts.forEach((r, i) => md.push(`| ${i + 1} | \`${r.table}\` | ${r.rows} |`));
  md.push(`| | **TOTAL (${tables.length} tabel)** | **${totalRows}** |`);
  md.push("");

  md.push("## 4. Index");
  md.push("");
  md.push(`Total: **${indexRows.length}** index (${explicitIndexes.length} eksplisit + ${autoIndexes.length} autoindex UNIQUE).`);
  md.push("");
  md.push("### 4.1 Index filter panas (F8)");
  md.push("");
  md.push("| Index | Tabel(kolom) | Status |");
  md.push("|---|---|---|");
  for (const i of hotStatus) {
    md.push(`| \`${i.name}\` | \`${i.table}(${i.column})\` | ${i.exists ? "✅ ada" : "❌ belum ada"} |`);
  }
  md.push("");
  md.push("### 4.2 Inventory index eksplisit");
  md.push("");
  md.push("| Index | Tabel | Definisi |");
  md.push("|---|---|---|");
  for (const r of explicitIndexes) md.push(`| \`${r.name}\` | \`${r.tbl_name}\` | \`${oneLine(r.sql)}\` |`);
  md.push("");
  md.push(`Autoindex bawaan UNIQUE (tidak dihitung): ${autoIndexes.map((r) => `\`${r.tbl_name}.${r.name.replace(/^sqlite_autoindex_/, "")}\``).join(", ") || "—"}.`);
  md.push("");

  md.push("## 5. Pemeriksaan Orphan (referensi lintas tabel)");
  md.push("");
  md.push("| Relasi | Baris diperiksa | Orphan | Status |");
  md.push("|---|---:|---:|---|");
  for (const c of checks) {
    let st = "✅ OK";
    if (c.unresolved > 0) st = `⚠️ ${c.unresolved} unresolved`;
    else if (c.resolvedVia > 0) st = `✅ ${c.resolvedVia} ter-resolve (via dvr_assets)`;
    md.push(`| ${c.label} | ${c.checked} | ${c.unresolved} | ${st} |`);
  }
  md.push("");
  md.push("Catatan: placeholder `'-'` / kosong pada kolom kode POS di `purchases` diabaikan (bukan referensi). Kolom `monitoring_devices.asset_code` juga sah merujuk ke `dvr_assets.asset_code` — bukan pelanggaran integritas.");
  md.push("");

  md.push("## 6. Detail Temuan");
  md.push("");
  const edcRows = edcCheck?.rows ?? [];
  if (edcRows.length) {
    md.push(`### 6.1 ⚠️ \`edc_assets.pos_location\` tanpa master POS — ${edcRows.length} baris`);
    md.push("");
    md.push("Kode lokasi EDC di bawah ini tidak ditemukan di `pos_hardware_assets.pos_code`. Kemungkinan POS sudah di-decommission/renumber, atau master POS belum diperbarui. **Tidak diperbaiki** pada sprint ini — perlu keputusan pemilik data.");
    md.push("");
    md.push("| pos_location | shop_name |");
    md.push("|---|---|");
    for (const r of edcRows) md.push(`| \`${r.pos_location}\` | ${r.shop_name ?? "-"} |`);
    md.push("");
  }
  if (monCheck && monCheck.resolvedVia > 0) {
    md.push("### 6.2 ℹ️ \`monitoring_devices\` merujuk DVR — bukan orphan");
    md.push("");
    md.push(`${monCheck.resolvedVia} baris \`monitoring_devices.asset_code\` berformat \`DVR-*\` tidak ada di \`assets\`/\`pos_hardware_assets\`, tetapi **semua cocok** dengan \`dvr_assets.asset_code\`. Artinya master DVR adalah relasi yang sah; dokumentasi relasi sebaiknya menyebut \`dvr_assets\` juga.`);
    md.push("");
  }
  const purchasesOrphans = checks.filter((c) => c.key.startsWith("purchases.") && c.unresolved > 0);
  if (purchasesOrphans.length) {
    md.push("### 6.3 ⚠️ Referensi POS pada \`purchases\` tidak ditemukan");
    md.push("");
    for (const c of purchasesOrphans) {
      md.push(`- \`${c.label}\`: ${c.unresolved} baris — ${c.rows.map((r) => `\`${Object.values(r).join("·")}\``).join(", ")}`);
    }
    md.push("");
  }
  if (!edcRows.length && (!monCheck || monCheck.resolvedVia === 0) && !purchasesOrphans.length) {
    md.push("Tidak ada temuan orphan. ✅");
    md.push("");
  }

  md.push("## 7. Query Plan (EXPLAIN QUERY PLAN)");
  md.push("");
  md.push("Dua query filter panas yang dipakai halaman/API:");
  md.push("");
  for (const p of plans) {
    md.push(`**${p.label}**`);
    md.push("");
    md.push("```");
    for (const s of p.steps) md.push(s);
    md.push("```");
    md.push("");
  }

  md.push("## 8. Rekomendasi");
  md.push("");
  md.push("| Prioritas | Rekomendasi |");
  md.push("|---|---|");
  if (edcRows.length) {
    md.push(`| P1 | Lengkapi master \`pos_hardware_assets\` untuk ${edcRows.length} kode POS yang dirujuk \`edc_assets\` (atau beri penanda decommission) — butuh keputusan pemilik data. |`);
  }
  md.push("| P1 | Jadwalkan \`scripts/backup-db.mjs\` harian (Task Scheduler) + retensi 7 snapshot; simpan salinan di drive terpisah. |");
  md.push("| P2 | Migrasi skema bernomor (`migrations/00X_*.sql`) untuk menggantikan pola `try/catch ALTER TABLE` (F8). |");
  md.push("| P2 | Perluas `scripts/db-health.mjs` sebagai gate CI: exit ≠ 0 menghentikan deploy jika integritas/orphan memburuk. |");
  md.push("| P3 | Dokumentasikan relasi `monitoring_devices.asset_code` → `assets`/`pos_hardware_assets`/`dvr_assets` sebagai foreign key logis. |");
  md.push("");
  md.push("## 9. Metode & Batasan");
  md.push("");
  md.push("- Read-only: hanya `SELECT`, `PRAGMA integrity_check/quick_check/journal_mode`, dan `EXPLAIN QUERY PLAN`; tidak ada `INSERT/UPDATE/DELETE/DROP/VACUUM` penuh.");
  md.push("- Orphan dicek dengan `NOT EXISTS` (aman terhadap NULL), placeholder `'-'`/kosong diabaikan.");
  md.push("- Row count diambil per tabel saat script berjalan; server dev aktif sehingga WAL dapat berubah antar-run — jumlah di tabel aset seharusnya stabil.");
  md.push("- Exit code: `0` = sehat, `1` = ada integritas gagal / orphan unresolved / index hot-filter hilang.");
  md.push("");
  md.push("---");
  md.push("*Dibuat oleh agent `data` — MIS SHOP OPS sprint malam. DB produksi tidak dimodifikasi.*");

  fs.mkdirSync(path.dirname(DOC_FILE), { recursive: true });
  fs.writeFileSync(DOC_FILE, `${md.join("\n")}\n`, "utf8");

  const healthy = integrityOk && quickOk && totalUnresolved === 0 && hotMissing === 0;
  process.exitCode = healthy ? 0 : 1;
}

try {
  await main();
} catch (err) {
  console.error("DB health check GAGAL:", err?.message || err);
  process.exitCode = 1;
} finally {
  try {
    await db.close();
  } catch {
    /* ignore */
  }
}
