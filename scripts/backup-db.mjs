#!/usr/bin/env node
/**
 * backup-db.mjs — Snapshot konsisten database produksi MIS SHOP OPS.
 *
 * Menjalankan: node scripts/backup-db.mjs
 * Mekanisme: `VACUUM INTO backups/db_<YYYYMMDD_HHMMSS>/shop_ops.db`
 *   - File snapshot bersih (tanpa WAL), konsisten, dan sudah ter-VACUUM.
 * Retensi: simpan 7 snapshot terbaru; snapshot lama dihapus.
 *   - PENGECUALIAN: backups/db_20261030_233502 (snapshot Lead) SELALU dipertahankan.
 *
 * Script ini hanya MEMBACA shop_ops.db (VACUUM INTO membaca, menulis ke file baru).
 * Tidak ada DROP/DELETE/UPDATE data bisnis.
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.join(ROOT, "shop_ops.db");
const BACKUP_DIR = path.join(ROOT, "backups");
const SNAPSHOT_RE = /^db_(\d{8}_\d{6})(?:_\d+)?$/;
const KEEP_LATEST = 7;
const PROTECTED = new Set(["db_20261030_233502"]); // snapshot manual Lead — jangan dihapus

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const fmtBytes = (n) => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};

function listSnapshots() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SNAPSHOT_RE.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse(); // nama = timestamp, urut leksikografis = kronologis
}

async function main() {
  const startedAt = new Date();
  const started = Date.now();

  // 1. Siapkan direktori snapshot (tidak menimpa snapshot yang sudah ada).
  let dirName = `db_${stamp(startedAt)}`;
  let dirPath = path.join(BACKUP_DIR, dirName);
  for (let i = 2; fs.existsSync(dirPath); i += 1) {
    dirName = `db_${stamp(startedAt)}_${i}`;
    dirPath = path.join(BACKUP_DIR, dirName);
  }
  fs.mkdirSync(dirPath, { recursive: true });
  const target = path.join(dirPath, "shop_ops.db");
  const targetSql = target.replace(/\\/g, "/").replace(/'/g, "''");

  console.log("=".repeat(70));
  console.log(` BACKUP · shop_ops.db · ${startedAt.toISOString()}`);
  console.log("=".repeat(70));

  // 2. Snapshot konsisten via VACUUM INTO.
  const db = createClient({ url: `file:${DB_FILE.replace(/\\/g, "/")}` });
  await db.execute("PRAGMA busy_timeout = 5000;");
  await db.execute(`VACUUM INTO '${targetSql}';`);
  await db.close();

  const size = fs.statSync(target).size;
  if (size <= 0) throw new Error("Snapshot kosong — backup gagal.");

  // 3. Verifikasi snapshot (integritas + jumlah tabel snapshot).
  const snap = createClient({ url: `file:${target.replace(/\\/g, "/")}` });
  const integrity = String(
    (await snap.execute("PRAGMA quick_check;")).rows.map((r) => Object.values(r)[0]).join("; ")
  );
  const tableCount = Number(
    (
      await snap.execute(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
    ).rows[0].n
  );
  await snap.close();
  if (integrity !== "ok") throw new Error(`Snapshot tidak lolos quick_check: ${integrity}`);

  console.log(` Snapshot : backups/${dirName}/shop_ops.db`);
  console.log(` Ukuran   : ${fmtBytes(size)} · gambar: ${tableCount} tabel · quick_check: ok`);

  // 4. Retensi: 7 snapshot terbaru + snapshot Lead yang dilindungi.
  const snapshots = listSnapshots();
  const keep = new Set(PROTECTED);
  snapshots.slice(0, KEEP_LATEST).forEach((n) => keep.add(n));
  const toDelete = snapshots.filter((n) => !keep.has(n));

  for (const name of toDelete) {
    const full = path.resolve(BACKUP_DIR, name);
    // Pengaman: hanya hapus direktori langsung di backups/ yang namanya cocok pola snapshot.
    const parent = path.dirname(full);
    if (parent !== path.resolve(BACKUP_DIR) || !SNAPSHOT_RE.test(path.basename(full))) {
      throw new Error(`Path tidak aman untuk dihapus: ${full}`);
    }
    if (!fs.statSync(full).isDirectory()) continue;
    fs.rmSync(full, { recursive: true, force: true });
    console.log(` Retensi  : hapus snapshot lama backups/${name}`);
  }

  const kept = listSnapshots();
  console.log(` Tersimpan: ${kept.length} snapshot (retensi ${KEEP_LATEST} + ${PROTECTED.size} dilindungi)`);
  for (const name of kept) {
    const p = path.join(BACKUP_DIR, name, "shop_ops.db");
    const s = fs.existsSync(p) ? fmtBytes(fs.statSync(p).size) : "?";
    console.log(`   ${name === dirName ? "★" : " "} backups/${name}  (${s})${PROTECTED.has(name) ? "  [dilindungi]" : ""}`);
  }
  console.log(` Selesai dalam ${((Date.now() - started) / 1000).toFixed(2)}s`);
  console.log("=".repeat(70));
}

try {
  await main();
  process.exitCode = 0;
} catch (err) {
  console.error(` BACKUP GAGAL: ${err?.message || err}`);
  process.exitCode = 1;
}
