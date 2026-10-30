#!/usr/bin/env node
/**
 * backup-verify.mjs — Restore snapshot backup terbaru ke folder %TEMP% lalu verifikasi.
 *
 * Menjalankan: node scripts/backup-verify.mjs [path/ke/shop_ops.db]
 * Default: snapshot terbaru di backups/db_<timestamp>/shop_ops.db.
 *
 * Langkah:
 *  1. Salin file snapshot ke %TEMP%/mis-shop-ops-backup-verify/verify_<timestamp>/shop_ops.db
 *     (DB LIVE `shop_ops.db` TIDAK disentuh — hanya dibaca untuk pembanding).
 *  2. PRAGMA quick_check pada hasil restore.
 *  3. Cek 15 tabel & total 982 baris (baseline SHIFT 2).
 *  4. Bandingkan row count per tabel: snapshot restore vs DB live (read-only).
 *
 * Exit code: 0 bila semua cocok, 1 bila ada mismatch.
 * Script ini read-only terhadap DB live dan tidak menulis skema/data apa pun.
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_FILE = path.join(ROOT, "shop_ops.db");
const BACKUP_DIR = path.join(ROOT, "backups");
const SNAPSHOT_RE = /^db_(\d{8}_\d{6})(?:_\d+)?$/;

// Baseline gate SHIFT 2 (2026-10-31). Sesuaikan bila jumlah data memang berubah.
const EXPECTED_TABLES = 15;
const EXPECTED_ROWS = 982;

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const fmtBytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);
const fmtStamp = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);

function latestSnapshotPath() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.resolve(ROOT, arg);
    if (!fs.existsSync(p)) throw new Error(`Snapshot tidak ditemukan: ${p}`);
    return p;
  }
  if (!fs.existsSync(BACKUP_DIR)) throw new Error("Folder backups/ tidak ada.");
  const dirs = fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SNAPSHOT_RE.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  if (!dirs.length) throw new Error("Tidak ada snapshot db_<timestamp> di backups/.");
  return path.join(BACKUP_DIR, dirs[0], "shop_ops.db");
}

const quoteId = (name) => `"${String(name).replace(/"/g, '""')}"`;

async function inspect(db) {
  const quick = (await db.execute("PRAGMA quick_check;")).rows.map((r) => String(Object.values(r)[0])).join("; ");
  const tables = (
    await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
  ).rows.map((r) => String(r.name));
  const counts = {};
  let total = 0;
  for (const t of tables) {
    const n = Number((await db.execute(`SELECT COUNT(*) AS n FROM ${quoteId(t)}`)).rows[0].n);
    counts[t] = n;
    total += n;
  }
  return { quick, tables, counts, total };
}

async function main() {
  const startedAt = new Date();
  const snapshot = latestSnapshotPath();
  const snapshotDir = path.basename(path.dirname(snapshot));
  const snapshotSize = fs.statSync(snapshot).size;

  // 1. Restore (salin) snapshot ke %TEMP% — tidak menyentuh DB live.
  const tempDir = path.join(os.tmpdir(), "mis-shop-ops-backup-verify", `verify_${fmtStamp(startedAt)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const restored = path.join(tempDir, "shop_ops.db");
  fs.copyFileSync(snapshot, restored);
  const restoredSize = fs.statSync(restored).size;
  const hashSource = sha256(snapshot);
  const hashRestored = sha256(restored);

  console.log("=".repeat(80));
  console.log(` BACKUP VERIFY · ${startedAt.toISOString()}`);
  console.log("=".repeat(80));
  console.log(` Snapshot : backups/${snapshotDir}/shop_ops.db (${fmtBytes(snapshotSize)})`);
  console.log(` Restore  : ${restored}`);
  console.log(` Copy     : ${fmtBytes(restoredSize)} · sha256[0:16] sumber=${hashSource} restore=${hashRestored} → ${hashSource === hashRestored ? "identik" : "BEDA!"}`);

  // 2. Verifikasi snapshot hasil restore.
  const snapDb = createClient({ url: `file:${restored.replace(/\\/g, "/")}` });
  try {
    await snapDb.execute("PRAGMA busy_timeout = 5000;").catch(() => {});
    await snapDb.execute("PRAGMA query_only = ON;").catch(() => {});
  } catch {
    /* pragma opsional */
  }
  const snap = await inspect(snapDb);
  await snapDb.close();

  // 3. Bandingkan dengan DB live (read-only).
  const liveDb = createClient({ url: `file:${LIVE_FILE.replace(/\\/g, "/")}` });
  try {
    await liveDb.execute("PRAGMA busy_timeout = 5000;").catch(() => {});
    await liveDb.execute("PRAGMA query_only = ON;").catch(() => {});
  } catch {
    /* pragma opsional */
  }
  const live = await inspect(liveDb);
  await liveDb.close();

  // 4. Bandingkan.
  const allTables = [...new Set([...snap.tables, ...live.tables])].sort();
  const diffs = allTables.filter((t) => (snap.counts[t] ?? -1) !== (live.counts[t] ?? -1));
  const checks = [];
  checks.push(["quick_check restore", snap.quick === "ok", snap.quick]);
  checks.push([`jumlah tabel = ${EXPECTED_TABLES}`, snap.tables.length === EXPECTED_TABLES, `${snap.tables.length} tabel`]);
  checks.push([`total baris snapshot = ${EXPECTED_ROWS}`, snap.total === EXPECTED_ROWS, `${snap.total} baris`]);
  checks.push([`total baris live = ${EXPECTED_ROWS}`, live.total === EXPECTED_ROWS, `${live.total} baris`]);
  checks.push(["row count snapshot == live", diffs.length === 0, diffs.length === 0 ? "15/15 tabel sama" : `${diffs.length} tabel beda`]);
  checks.push(["hash file restore == snapshot", hashSource === hashRestored, hashSource === hashRestored ? "identik" : "beda"]);

  console.log("");
  console.log(` ${pad("TABEL", 26)}${padL("SNAPSHOT", 10)}${padL("LIVE", 8)}  STATUS`);
  for (const t of allTables) {
    const s = snap.counts[t] ?? -1;
    const l = live.counts[t] ?? -1;
    console.log(` ${pad(t, 26)}${padL(s, 10)}${padL(l, 8)}  ${s === l ? "OK" : "BEDA"}`);
  }
  console.log(` ${"-".repeat(54)}`);
  console.log(` ${pad("TOTAL", 26)}${padL(snap.total, 10)}${padL(live.total, 8)}  ${snap.total === live.total ? "OK" : "BEDA"}`);

  console.log("");
  console.log(" CHECK");
  let failed = 0;
  for (const [label, ok, detail] of checks) {
    if (!ok) failed += 1;
    console.log(`   [${ok ? "OK" : "!!"}] ${pad(label, 34)} ${detail}`);
  }
  if (diffs.length) {
    console.log(`   Tabel beda: ${diffs.map((t) => `${t}(${snap.counts[t] ?? "-"} vs ${live.counts[t] ?? "-"})`).join(", ")}`);
  }
  console.log("");
  console.log(` STATUS: ${failed === 0 ? "RESTORE-VERIFY LULUS" : `GAGAL (${failed} check)`}`);
  console.log(` Bukti restore tersimpan di %TEMP%: ${restored}`);
  console.log("=".repeat(80));

  process.exitCode = failed === 0 ? 0 : 1;
}

try {
  await main();
} catch (err) {
  console.error(`BACKUP VERIFY GAGAL: ${err?.message || err}`);
  process.exitCode = 1;
}
