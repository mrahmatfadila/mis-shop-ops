#!/usr/bin/env node
/**
 * db-audit.mjs — Audit kualitas data MIS SHOP OPS (READ-ONLY).
 *
 * Menjalankan: node scripts/db-audit.mjs
 * Output ringkas ke terminal + menulis docs/DATA-AUDIT.md.
 *
 * Lingkup:
 *  1. Duplikat kode/serial/username (dalam tabel).
 *  2. Null density kolom penting (id_*, password, ip_address, status, ...).
 *  3. Inkonsistensi status/enum (aset, tiket, role user).
 *  4. Orphan EDC + kandidat padanan fuzzy (Levenshtein) — TANPA menulis perubahan.
 *  5. Rekap nilai aset per lokasi & kategori (validasi dashboard).
 *
 * SCRIPT INI TIDAK PERNAH MENULIS KE DATABASE: hanya SELECT + PRAGMA read-only.
 * Exit code: 0 = tidak ada masalah blocker, 1 = ada orphan/integritas gagal
 * (duplikat & null density dilaporkan sebagai warning tanpa menggagalkan gate).
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.join(ROOT, "shop_ops.db");
const DOC_FILE = path.join(ROOT, "docs", "DATA-AUDIT.md");

const ASSET_STATUSES = ["OPERASIONAL", "RUSAK", "PERBAIKAN", "CADANGAN"];
const TICKET_STATUSES = ["MENUNGGU", "DIPROSES", "SELESAI"];
// Salinan src/types/index.ts (UserRole).
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

// identifier untuk detail baris duplikat
const DUP_CHECKS = [
  { table: "assets", column: "asset_code", unique: true, idCols: ["asset_code", "name", "shop_location"] },
  { table: "assets", column: "serial_number", unique: false, idCols: ["asset_code", "name", "serial_number"] },
  { table: "pos_hardware_assets", column: "pos_code", unique: true, idCols: ["pos_code", "shop_name", "terminal"] },
  { table: "pos_hardware_assets", column: "ip_address", unique: false, idCols: ["pos_code", "shop_name", "ip_address"] },
  { table: "office_hardware_assets", column: "asset_code", unique: true, idCols: ["asset_code", "user_name", "division"] },
  { table: "edc_assets", column: "pos_location", unique: true, idCols: ["pos_location", "shop_name"] },
  { table: "users", column: "username", unique: true, idCols: ["username", "name", "role"] },
];

// kolom yang diukur null/empty density. placeholder '-', '', NULL dihitung kosong.
const NULL_CHECKS = [
  ["assets", "serial_number"],
  ["assets", "ip_address"],
  ["assets", "purchase_date"],
  ["assets", "status"],
  ["pos_hardware_assets", "pos_sn"],
  ["pos_hardware_assets", "ip_address"],
  ["pos_hardware_assets", "anydesk_id"],
  ["pos_hardware_assets", "anydesk_password"],
  ["pos_hardware_assets", "status"],
  ["office_hardware_assets", "ip_address"],
  ["office_hardware_assets", "processor"],
  ["office_hardware_assets", "ram"],
  ["office_hardware_assets", "hard_drive"],
  ["office_hardware_assets", "status"],
  ["dvr_assets", "ip_address"],
  ["dvr_assets", "password"],
  ["dvr_assets", "status"],
  ["monitoring_devices", "ip_address"],
  ["monitoring_devices", "status"],
  ["edc_assets", "bca_tid"],
  ["edc_assets", "bni_tid"],
  ["edc_assets", "mandiri_tid"],
  ["edc_assets", "bri_tid"],
  ["users", "password"],
  ["users", "updated_at"],
  ["tickets", "it_notes"],
  ["tickets", "resolved_at"],
  ["purchases", "vendor"],
  ["purchases", "invoice_url"],
  ["purchases", "installed_at"],
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
const fmtRp = (n) =>
  `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const fmtStamp = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const esc = (s) => String(s).replace(/\|/g, "\\|");
const EMPTY_SQL = (col) => `(${col} IS NULL OR TRIM(${col}) = '' OR TRIM(${col}) = '-')`;

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

async function main() {
  const startedAt = new Date();
  const sqliteVersion = (await all("SELECT sqlite_version() AS v"))[0].v;
  const journalMode = String((await all("PRAGMA journal_mode;"))[0].journal_mode || "?");
  const dbSize = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0;
  const walSize = fs.existsSync(`${DB_FILE}-wal`) ? fs.statSync(`${DB_FILE}-wal`).size : 0;

  const tables = (
    await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  ).map((r) => r.name);
  const rowCounts = [];
  let totalRows = 0;
  for (const t of tables) {
    const n = await scalar(`SELECT COUNT(*) AS n FROM "${t.replace(/"/g, '""')}"`);
    rowCounts.push({ table: t, rows: n });
    totalRows += n;
  }
  const integrityRows = await all("PRAGMA quick_check;");
  const quick = integrityRows.map((r) => oneLine(Object.values(r)[0])).join("; ") || "(kosong)";
  const quickOk = quick === "ok";

  // ---------- 1. Duplikat ----------
  const duplicateChecks = [];
  for (const cfg of DUP_CHECKS) {
    const groups = await all(
      `SELECT ${cfg.column} AS nilai, COUNT(*) AS jumlah FROM "${cfg.table}"
       WHERE ${cfg.column} IS NOT NULL AND TRIM(${cfg.column}) NOT IN ('', '-')
       GROUP BY ${cfg.column} HAVING COUNT(*) > 1 ORDER BY jumlah DESC, nilai`
    );
    let detail = [];
    for (const g of groups.slice(0, 5)) {
      const cols = cfg.idCols.join(", ");
      detail.push(
        ...(await all(
          `SELECT ${cols} FROM "${cfg.table}" WHERE ${cfg.column} = ? ORDER BY rowid`,
          [g.nilai]
        ))
      );
    }
    duplicateChecks.push({
      ...cfg,
      groups: groups.map((g) => ({ value: String(g.nilai), count: Number(g.jumlah) })),
      dupRowCount: groups.reduce((s, g) => s + Number(g.jumlah), 0),
      detail,
    });
  }
  const dupTotal = duplicateChecks.reduce((s, c) => s + c.dupRowCount, 0);

  // ---------- 2. Null density ----------
  const nullChecks = [];
  for (const [table, column] of NULL_CHECKS) {
    const row = (
      await all(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN ${EMPTY_SQL(column)} THEN 1 ELSE 0 END) AS kosong FROM "${table}"`
      )
    )[0];
    const total = Number(row.total) || 0;
    const kosong = Number(row.kosong) || 0;
    nullChecks.push({ table, column, total, kosong, pct: total ? (kosong / total) * 100 : 0 });
  }

  // ---------- 3. Status / enum ----------
  const enumChecks = [];
  for (const table of ["assets", "pos_hardware_assets", "office_hardware_assets", "t3_fixed_assets"]) {
    const rows = await all(`SELECT status AS nilai, COUNT(*) AS jumlah FROM "${table}" GROUP BY status ORDER BY jumlah DESC`);
    const invalid = rows.filter((r) => !ASSET_STATUSES.includes(String(r.nilai)));
    enumChecks.push({
      table,
      column: "status",
      allowed: ASSET_STATUSES,
      values: rows.map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
      invalid: invalid.map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
    });
  }
  {
    const rows = await all(`SELECT status AS nilai, COUNT(*) AS jumlah FROM tickets GROUP BY status ORDER BY jumlah DESC`);
    enumChecks.push({
      table: "tickets",
      column: "status",
      allowed: TICKET_STATUSES,
      values: rows.map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
      invalid: rows.filter((r) => !TICKET_STATUSES.includes(String(r.nilai))).map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
    });
  }
  {
    const rows = await all(`SELECT role AS nilai, COUNT(*) AS jumlah FROM users GROUP BY role ORDER BY jumlah DESC`);
    enumChecks.push({
      table: "users",
      column: "role",
      allowed: VALID_ROLES,
      values: rows.map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
      invalid: rows.filter((r) => !VALID_ROLES.includes(String(r.nilai))).map((r) => ({ value: String(r.nilai), count: Number(r.jumlah) })),
    });
  }
  const statusIssues = enumChecks.reduce((s, c) => s + c.invalid.reduce((x, r) => x + r.count, 0), 0);

  // ---------- 4. Orphan EDC + fuzzy ----------
  const posMaster = (
    await all("SELECT pos_code, shop_name, terminal FROM pos_hardware_assets ORDER BY pos_code")
  ).map((r) => ({ code: String(r.pos_code), shop: String(r.shop_name), terminal: String(r.terminal) }));
  const posCodes = posMaster.map((p) => p.code);
  const edcOrphans = (
    await all(
      `SELECT e.pos_location, e.shop_name FROM edc_assets e
       WHERE NOT EXISTS (SELECT 1 FROM pos_hardware_assets h WHERE h.pos_code = e.pos_location)
       ORDER BY e.pos_location`
    )
  ).map((r) => ({ code: String(r.pos_location), shop: String(r.shop_name) }));
  const edcFuzzy = edcOrphans.map((o) => {
    const candidates = posCodes
      .map((c) => ({ code: c, distance: levenshtein(o.code.toLowerCase(), c.toLowerCase()) }))
      .sort((a, b) => a.distance - b.distance || a.code.localeCompare(b.code))
      .slice(0, 2);
    return { ...o, candidates };
  });

  // ---------- 5. Rekap nilai aset ----------
  const t3Total = (
    await all(
      "SELECT COUNT(*) AS n, SUM(harga_pembelian) AS sum_harga, SUM(harga_pembelian * qty) AS sum_total FROM t3_fixed_assets"
    )
  )[0];
  const t3ByLokasi = (
    await all(
      "SELECT lokasi, COUNT(*) AS n, SUM(harga_pembelian * qty) AS nilai FROM t3_fixed_assets GROUP BY lokasi ORDER BY nilai DESC"
    )
  ).map((r) => ({ key: String(r.lokasi), n: Number(r.n), value: Number(r.nilai) || 0 }));
  const t3ByKategori = (
    await all(
      "SELECT kategori, COUNT(*) AS n, SUM(harga_pembelian * qty) AS nilai FROM t3_fixed_assets GROUP BY kategori ORDER BY nilai DESC"
    )
  ).map((r) => ({ key: String(r.kategori), n: Number(r.n), value: Number(r.nilai) || 0 }));

  const purchasesTotal = (
    await all(
      "SELECT COUNT(*) AS n, SUM(total_price) AS total, SUM(estimated_price * quantity) AS estimasi, SUM(CASE WHEN item_price = 0 OR item_price IS NULL THEN 1 ELSE 0 END) AS item_price_nol FROM purchases"
    )
  )[0];
  const purchasesByLokasi = (
    await all(
      "SELECT target_location, COUNT(*) AS n, SUM(total_price) AS nilai, SUM(estimated_price * quantity) AS estimasi FROM purchases GROUP BY target_location ORDER BY nilai DESC"
    )
  ).map((r) => ({
    key: String(r.target_location),
    n: Number(r.n),
    value: Number(r.nilai) || 0,
    estimate: Number(r.estimasi) || 0,
  }));
  const purchasesByKategori = (
    await all(
      "SELECT category, COUNT(*) AS n, SUM(total_price) AS nilai FROM purchases GROUP BY category ORDER BY nilai DESC"
    )
  ).map((r) => ({ key: String(r.category), n: Number(r.n), value: Number(r.nilai) || 0 }));

  const assetsByKategori = (
    await all("SELECT category, COUNT(*) AS n FROM assets GROUP BY category ORDER BY n DESC")
  ).map((r) => ({ key: String(r.category), n: Number(r.n) }));

  const grandTotal = (Number(t3Total.sum_total) || 0) + (Number(purchasesTotal.total) || 0);

  // ---------- Terminal summary ----------
  const L = [];
  const bar = "=".repeat(82);
  L.push(bar);
  L.push(` DATA AUDIT · shop_ops.db · ${fmtStamp(startedAt)}`);
  L.push(bar);
  L.push(` Mode ${journalMode} · SQLite ${sqliteVersion} · DB ${fmtBytes(dbSize)} + WAL ${fmtBytes(walSize)}`);
  L.push(` Tabel ${tables.length} · total baris ${totalRows} · quick_check ${quickOk ? "ok" : quick}`);
  L.push("");
  L.push(" DUPLIKAT (per tabel)");
  for (const c of duplicateChecks) {
    const status = c.dupRowCount === 0 ? "[OK]" : "[!]";
    L.push(`   ${status} ${pad(`${c.table}.${c.column}`, 44)} ${padL(c.groups.length, 3)} grup / ${padL(c.dupRowCount, 3)} baris${c.unique ? " (UNIQUE)" : ""}`);
    for (const g of c.groups.slice(0, 3)) L.push(`         ${g.value} × ${g.count}`);
  }
  L.push("");
  L.push(" NULL DENSITY (>0% kosong; NULL/''/'-' dihitung kosong)");
  for (const c of nullChecks.filter((c) => c.kosong > 0)) {
    const flag = c.pct >= 50 ? "[!]" : "[~]";
    L.push(`   ${flag} ${pad(`${c.table}.${c.column}`, 44)} ${padL(c.kosong, 4)}/${padL(c.total, 4)} ${c.pct.toFixed(1)}%`);
  }
  L.push("");
  L.push(" STATUS / ENUM");
  for (const c of enumChecks) {
    const bad = c.invalid.reduce((s, r) => s + r.count, 0);
    L.push(`   ${bad === 0 ? "[OK]" : "[!]"} ${pad(`${c.table}.${c.column}`, 30)} ${normalizeEnum(c)}`);
  }
  L.push("");
  L.push(` ORPHAN edc_assets.pos_location → pos_hardware_assets : ${edcOrphans.length} baris`);
  for (const o of edcFuzzy.slice(0, 5)) {
    const cand = o.candidates.map((c) => `${c.code}(d=${c.distance})`).join(", ");
    L.push(`   ${pad(o.code, 18)} ${pad(o.shop, 12)} → ${cand}`);
  }
  if (edcFuzzy.length > 5) L.push(`   … ${edcFuzzy.length - 5} baris lain (lengkap di docs/DATA-AUDIT.md)`);
  L.push("");
  L.push(" REKAP NILAI ASET");
  L.push(`   t3_fixed_assets : ${t3Total.n} unit · ${fmtRp(t3Total.sum_total)}`);
  L.push(`   purchases       : ${purchasesTotal.n} PO · total ${fmtRp(purchasesTotal.total)} · estimasi ${fmtRp(purchasesTotal.estimasi)}`);
  L.push(`   GRAND TOTAL     : ${fmtRp(grandTotal)}`);
  L.push(`   Harga aset di t3 per lokasi: ${t3ByLokasi.map((x) => `${x.key}=${fmtRp(x.value)}`).join(" · ")}`);
  const problems = [];
  if (!quickOk) problems.push("quick_check gagal");
  if (edcOrphans.length) problems.push(`${edcOrphans.length} orphan EDC`);
  if (statusIssues) problems.push(`${statusIssues} nilai status/role di luar enum`);
  if (dupTotal) problems.push(`${dupTotal} baris duplikat (warning)`);
  L.push("");
  L.push(` STATUS: ${problems.length ? `PERHATIAN — ${problems.join("; ")}` : "BERSIH"}`);
  L.push(` Laporan: ${path.relative(ROOT, DOC_FILE)}`);
  L.push(bar);
  console.log(L.join("\n"));

  // ---------- Markdown report ----------
  const md = [];
  const now = fmtStamp(startedAt);
  md.push("# Data Audit — `shop_ops.db`");
  md.push("");
  md.push(`> Dibuat otomatis oleh \`scripts/db-audit.mjs\` · ${now} (Asia/Bangkok)`);
  md.push(`> Mode jurnal **${journalMode.toUpperCase()}** · SQLite ${sqliteVersion} · DB ${fmtBytes(dbSize)} + WAL ${fmtBytes(walSize)}`);
  md.push("> **Read-only**: audit ini tidak menulis/mengubah data apa pun.");
  md.push("");
  md.push("## 1. Ringkasan");
  md.push("");
  md.push("| Pemeriksaan | Hasil |");
  md.push("|---|---|");
  md.push(`| Tabel / total baris | ${tables.length} tabel · **${totalRows} baris** |`);
  md.push(`| \`PRAGMA quick_check\` | ${quickOk ? "✅ `ok`" : `❌ \`${quick}\``} |`);
  md.push(`| Duplikat dalam tabel | ${dupTotal === 0 ? "✅ 0 baris" : `⚠️ **${dupTotal} baris** (${duplicateChecks.filter((c) => c.dupRowCount).length} kolom)`} |`);
  md.push(`| Status/role di luar enum | ${statusIssues === 0 ? "✅ 0" : `⚠️ ${statusIssues} baris`} |`);
  md.push(`| Orphan \`edc_assets.pos_location\` | ${edcOrphans.length === 0 ? "✅ 0" : `⚠️ **${edcOrphans.length} baris**`} |`);
  md.push(`| Total nilai aset tercatat | **${fmtRp(grandTotal)}** (t3 ${fmtRp(t3Total.sum_total)} + pengadaan ${fmtRp(purchasesTotal.total)}) |`);
  md.push("");

  md.push("## 2. Duplikat");
  md.push("");
  md.push("Nilai placeholder (`NULL`, kosong, `'-'`) diabaikan. Kolom ber-constraint `UNIQUE` seharusnya 0 duplikat.");
  md.push("");
  md.push("| Tabel | Kolom | Constraint | Grup duplikat | Baris duplikat | Status |");
  md.push("|---|---|---|---:|---:|---|");
  for (const c of duplicateChecks) {
    md.push(
      `| \`${c.table}\` | \`${c.column}\` | ${c.unique ? "UNIQUE" : "—"} | ${c.groups.length} | ${c.dupRowCount} | ${c.dupRowCount === 0 ? "✅" : "⚠️"} |`
    );
  }
  md.push("");
  const dupWithGroups = duplicateChecks.filter((c) => c.groups.length);
  if (dupWithGroups.length) {
    for (const c of dupWithGroups) {
      md.push(`### 2.1 Detail \`${c.table}.${c.column}\``);
      md.push("");
      md.push("| Nilai | Jumlah |");
      md.push("|---|---:|");
      for (const g of c.groups) md.push(`| \`${esc(g.value)}\` | ${g.count} |`);
      md.push("");
      md.push("Baris terkait:");
      md.push("");
      const cols = Object.keys(c.detail[0] ?? {});
      md.push(`| ${cols.map((x) => `\`${x}\``).join(" | ")} |`);
      md.push(`|${cols.map(() => "---").join("|")}|`);
      for (const d of c.detail) md.push(`| ${cols.map((x) => esc(d[x] ?? "-")).join(" | ")} |`);
      md.push("");
    }
  } else {
    md.push("Tidak ada duplikat. ✅");
    md.push("");
  }

  md.push("## 3. Null Density");
  md.push("");
  md.push("Persentase kolom kosong (`NULL`, string kosong, atau `'-'`). Ambang perhatian: ≥ 50%.");
  md.push("");
  md.push("| Tabel | Kolom | Kosong | Total | % Kosong | Status |");
  md.push("|---|---|---:|---:|---:|---|");
  for (const c of nullChecks) {
    const flag = c.pct >= 50 ? "⚠️" : c.pct > 0 ? "🟡" : "✅";
    md.push(`| \`${c.table}\` | \`${c.column}\` | ${c.kosong} | ${c.total} | ${c.pct.toFixed(1)}% | ${flag} |`);
  }
  md.push("");

  md.push("## 4. Inkonsistensi Status / Enum");
  md.push("");
  for (const c of enumChecks) {
    md.push(`### \`${c.table}.${c.column}\``);
    md.push("");
    md.push(`Enum sah: ${c.allowed.map((x) => `\`${x}\``).join(", ")}.`);
    md.push("");
    md.push("| Nilai | Jumlah | Valid |");
    md.push("|---|---:|---|");
    for (const v of c.values) md.push(`| \`${esc(v.value)}\` | ${v.count} | ${c.allowed.includes(v.value) ? "✅" : "❌"} |`);
    md.push("");
    md.push(c.invalid.length === 0 ? "Tidak ada nilai di luar enum. ✅" : `⚠️ **${c.invalid.reduce((s, r) => s + r.count, 0)} baris di luar enum.**`);
    md.push("");
  }
  md.push("Status pengadaan (`purchases.status`) bersifat informasional (bukan enum aset) — nilai saat ini: " +
    (await all("SELECT status AS n, COUNT(*) AS c FROM purchases GROUP BY status ORDER BY c DESC"))
      .map((r) => `\`${r.n}\`×${r.c}`)
      .join(", ") + ".");
  md.push("");

  md.push("## 5. Orphan EDC + Kandidat Padanan (fuzzy)");
  md.push("");
  md.push(`${edcOrphans.length} kode \`edc_assets.pos_location\` tidak ditemukan di master \`pos_hardware_assets\`. Kandidat terdekat dihitung dengan jarak Levenshtein (angka lebih kecil = lebih mirip). **Tidak ada perubahan data yang dilakukan.**`);
  md.push("");
  md.push("| pos_location | shop_name | Kandidat 1 | Kandidat 2 | Rekomendasi |");
  md.push("|---|---|---|---|---|");
  for (const o of edcFuzzy) {
    const c1 = o.candidates[0];
    const c2 = o.candidates[1];
    const rekom =
      c1 && c1.distance <= 2
        ? "Perlu verifikasi manual — kemungkinan typo/renumber"
        : "Perlu pengecekan master POS (kemungkinan POS decommission)";
    md.push(
      `| \`${esc(o.code)}\` | ${esc(o.shop)} | ${c1 ? `\`${c1.code}\` (d=${c1.distance})` : "—"} | ${c2 ? `\`${c2.code}\` (d=${c2.distance})` : "—"} | ${rekom} |`
    );
  }
  md.push("");
  md.push("Tindakan disarankan: petakan kode ke master POS yang benar, atau tandai POS decommission pada master — **butuh persetujuan user** sebelum UPDATE.");
  md.push("");

  md.push("## 6. Rekap Nilai Aset (validasi dashboard)");
  md.push("");
  md.push("> Catatan: `assets` & `office_hardware_assets` **tidak menyimpan kolom harga**. Nilai aset berasal dari `t3_fixed_assets.harga_pembelian×qty` (aset tetap T3) dan `purchases.total_price` (pengadaan). Keduanya bukan populasi yang sama; jangan dijumlahkan sebagai satu nilai akuntansi tanpa konfirmasi user. Rekap lengkap per lokasi/kategori + keterbatasan data: lihat **`docs/RECAP-ASET.md`**.");
  md.push("");
  md.push("### 6.1 `t3_fixed_assets` per lokasi");
  md.push("");
  md.push("| Lokasi | Unit | Nilai |");
  md.push("|---|---:|---:|");
  for (const x of t3ByLokasi) md.push(`| \`${esc(x.key)}\` | ${x.n} | ${fmtRp(x.value)} |`);
  md.push(`| **TOTAL** | **${Number(t3Total.n)}** | **${fmtRp(t3Total.sum_total)}** |`);
  md.push("");
  md.push("### 6.2 `t3_fixed_assets` per kategori");
  md.push("");
  md.push("| Kategori | Unit | Nilai |");
  md.push("|---|---:|---:|");
  for (const x of t3ByKategori) md.push(`| \`${esc(x.key)}\` | ${x.n} | ${fmtRp(x.value)} |`);
  md.push("");
  md.push("### 6.3 `purchases` per lokasi tujuan");
  md.push("");
  md.push("| Lokasi tujuan | PO | Total (`total_price`) | Estimasi (`estimated_price×qty`) |");
  md.push("|---|---:|---:|---:|");
  for (const x of purchasesByLokasi) md.push(`| \`${esc(x.key)}\` | ${x.n} | ${fmtRp(x.value)} | ${fmtRp(x.estimate)} |`);
  md.push(`| **TOTAL** | **${Number(purchasesTotal.n)}** | **${fmtRp(purchasesTotal.total)}** | **${fmtRp(purchasesTotal.estimasi)}** |`);
  md.push("");
  md.push("### 6.4 `purchases` per kategori");
  md.push("");
  md.push("| Kategori | PO | Total |");
  md.push("|---|---:|---:|");
  for (const x of purchasesByKategori) md.push(`| \`${esc(x.key)}\` | ${x.n} | ${fmtRp(x.value)} |`);
  md.push("");
  md.push("### 6.5 Unit aset per kategori (`assets`) — tanpa nilai");
  md.push("");
  md.push("| Kategori | Unit |");
  md.push("|---|---:|");
  for (const x of assetsByKategori) md.push(`| \`${esc(x.key)}\` | ${x.n} |`);
  md.push("");
  md.push(`**Grand total (t3 + purchases): ${fmtRp(grandTotal)}.** Angka ini hanya indikasi kebutuhan validasi dashboard, bukan laporan keuangan.`);
  md.push("");

  md.push("## 7. Rekomendasi & Tindak Lanjut");
  md.push("");
  md.push("| Prioritas | Temuan | Tindakan | Eksekusi |");
  md.push("|---|---|---|---|");
  const dupIp = duplicateChecks.find((c) => c.table === "pos_hardware_assets" && c.column === "ip_address");
  if (dupIp && dupIp.dupRowCount) {
    md.push(`| P1 | IP ganda pada ${dupIp.groups.length} grup POS | Beri IP unik / dokumentasikan IP virtual | **Perlu persetujuan user** |`);
  }
  if (edcOrphans.length) {
    md.push(`| P1 | ${edcOrphans.length} kode EDC tanpa master POS | Petakan ke POS benar atau tandai decommission | **Perlu persetujuan user** |`);
  }
  const nullHigh = nullChecks.filter((c) => c.pct >= 50);
  if (nullHigh.length) {
    md.push(`| P2 | ${nullHigh.length} kolom ≥50% kosong (mis. \`users.updated_at\` 100%) | Backfill / tandai N/A; review kebutuhan kolom | **Perlu persetujuan user** |`);
  }
  if (Number(purchasesTotal.item_price_nol) > 0) {
    md.push(`| P2 | \`purchases.item_price\` = 0 pada ${purchasesTotal.item_price_nol}/${purchasesTotal.n} PO | Konsistenkan sumber harga (item_price vs total_price) | **Perlu persetujuan user** |`);
  }
  if (statusIssues === 0) {
    md.push("| P2 | Tidak ada status/role di luar enum | Pertahankan validasi enum di API; boleh ditambahkan test otomatis | ✅ Aman diotomatiskan (read-only) |");
  }
  md.push("| P3 | Audit ini | Jadwalkan `node scripts/db-audit.mjs` harian / pra-deploy | ✅ Aman diotomatiskan |");
  md.push("| P3 | Duplikat kolom UNIQUE | Tidak perlu tindakan selama constraint dipertahankan | ✅ Tidak perlu tindakan |");
  md.push("");
  md.push("> **Aturan**: semua koreksi data (UPDATE/DELETE) di atas **butuh persetujuan user** — sprint malam ini dilarang mengubah data bisnis. Script audit ini hanya membaca.");
  md.push("");

  md.push("## 8. Metode & Batasan");
  md.push("");
  md.push("- Read-only: hanya `SELECT`, `PRAGMA journal_mode`, dan `PRAGMA quick_check`; tidak ada `INSERT/UPDATE/DELETE/DROP/VACUUM`.");
  md.push("- Duplikat: `GROUP BY ... HAVING COUNT(*) > 1`, placeholder `NULL`/`''`/`'-'` diabaikan.");
  md.push("- Fuzzy matching: jarak Levenshtein pada 68 kode `pos_hardware_assets.pos_code`; kandidat teratas bukan keputusan otomatis.");
  md.push("- Nilai aset: `t3_fixed_assets` (unit tetap T3) dan `purchases` (pengadaan) dilaporkan terpisah.");
  md.push("- Exit code: `0` = tidak ada blocker; `1` = ada orphan EDC / `quick_check` gagal / status di luar enum.");
  md.push("");
  md.push("---");
  md.push("*Dibuat oleh agent `data` — MIS SHOP OPS SHIFT 2. DB produksi tidak dimodifikasi.*");

  fs.mkdirSync(path.dirname(DOC_FILE), { recursive: true });
  fs.writeFileSync(DOC_FILE, `${md.join("\n")}\n`, "utf8");

  const failed = !quickOk || edcOrphans.length > 0 || statusIssues > 0;
  process.exitCode = failed ? 1 : 0;
}

function normalizeEnum(c) {
  return c.values.map((v) => `${v.value}×${v.count}`).join(" · ");
}

try {
  await main();
} catch (err) {
  console.error("DB audit GAGAL:", err?.message || err);
  process.exitCode = 1;
} finally {
  try {
    await db.close();
  } catch {
    /* ignore */
  }
}
