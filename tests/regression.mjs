#!/usr/bin/env node
/**
 * Regression gate ringan MIS SHOP OPS — dijalankan SETELAH tiap batch agent.
 *
 * Bukan pengganti `scripts/verify.mjs` (tanpa tsc): cukup
 *   1. jalankan `node tests/smoke.mjs` (gate utama API)
 *   2. cek `/api/health` (DB ok, WAL, jumlah tabel)
 *   3. cek jumlah baris DB via API tidak berubah dari baseline 982
 *   4. deteksi field sensitif `password` yang bocor (warning, bukan FAIL)
 *
 * Pemakaian (root proyek, server :3000 hidup — JANGAN restart dari script ini):
 *   node tests/regression.mjs
 *   REGRESSION_BASELINE_ROWS=982 BASE_URL=http://localhost:3000 node tests/regression.mjs
 *
 * Exit code 0 = PASS, 1 = ada FAIL (smoke gagal / health gagal / baris DB berubah).
 * Hasil mesin: tests/regression-last-run.json
 */

import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.REGRESSION_TIMEOUT_MS || 30_000);
const BASELINE_ROWS = Number(process.env.REGRESSION_BASELINE_ROWS || 982);
// Tabel yang dihitung oleh /api/stats saja (tanpa users/tickets/role_permissions/rack_units).
const STATS_TABLES = [
  "totalAssets",
  "totalMonitoredDevices",
  "totalOfficeAssets",
  "posCount",
  "edcCount",
  "t3Count",
  "dvrCount",
  "rackPortCount",
  "extensionCount",
  "purchaseCount",
  "knowledgeCount",
];

const checks = [];
const warnings = [];

function addCheck(name, ok, detail, { fatal = true } = {}) {
  checks.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail), fatal });
  return Boolean(ok);
}

async function getJson(endpoint) {
  const started = Date.now();
  try {
    const response = await fetch(BASE_URL + endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* biarkan null */
    }
    return { endpoint, status: response.status, latencyMs: Date.now() - started, json, preview: text.slice(0, 200) };
  } catch (error) {
    return { endpoint, status: null, latencyMs: Date.now() - started, json: null, error: error?.message || String(error) };
  }
}

async function readSmokeReport() {
  try {
    return JSON.parse(await readFile(path.join(HERE, "last-run.json"), "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const generatedAt = new Date();
  console.log(`\nMIS SHOP OPS — REGRESSION GATE (antar-batch)\nBase URL : ${BASE_URL}\nWaktu    : ${generatedAt.toISOString()}\n`);

  /* 1) Smoke test (gate utama) */
  console.log("▶ [1/4] Smoke test API (node tests/smoke.mjs)...");
  const smoke = spawnSync(process.execPath, ["tests/smoke.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  const smokeExit = smoke.error ? 1 : (smoke.status ?? 1);
  const smokeReport = await readSmokeReport();
  const smokeSummary = smokeReport?.summary || null;
  addCheck(
    "smoke test exit 0",
    smokeExit === 0,
    smoke.error ? smoke.error.message : `exit=${smokeExit}; ${smokeSummary ? `${smokeSummary.pass} PASS / ${smokeSummary.fail} FAIL` : "tanpa last-run.json"}`
  );

  /* 2) Health check */
  console.log("\n▶ [2/4] Health check GET /api/health...");
  const health = await getJson("/api/health");
  const healthOk = health.status === 200 && health.json?.success === true && health.json?.db === "ok";
  addCheck("health 200 + success true + db ok", healthOk, health.error || `HTTP ${health.status}, db=${health.json?.db}, tables=${health.json?.tables}, wal=${health.json?.wal}`);
  if (health.json?.tables !== undefined && health.json.tables !== 15) {
    warnings.push(`[HEALTH] Jumlah tabel ${health.json.tables} ≠ baseline 15 (skema berubah?).`);
  }

  /* 3) Total baris DB via API (baseline 982) */
  console.log("\n▶ [3/4] Jumlah baris DB via API (baseline 982)...");
  const [stats, users, tickets, permissions, serverRack] = await Promise.all([
    getJson("/api/stats"),
    getJson("/api/users"),
    getJson("/api/tickets"),
    getJson("/api/permissions"),
    getJson("/api/server-rack"),
  ]);

  const statsValues = stats.json?.stats || {};
  const statsTotal = STATS_TABLES.reduce((sum, key) => sum + (Number(statsValues[key]) || 0), 0);
  const components = [
    { label: "stats (11 tabel)", value: statsTotal },
    { label: "users", value: users.json?.data?.length ?? null },
    { label: "tickets", value: tickets.json?.data?.length ?? null },
    { label: "role_permissions", value: permissions.json?.raw?.length ?? null },
    { label: "server_rack_units", value: serverRack.json?.rackUnits?.length ?? null },
  ];
  const componentMissing = components.some((c) => c.value === null);
  const actualTotal = componentMissing ? null : components.reduce((sum, c) => sum + c.value, 0);
  const rowsMatch = actualTotal === BASELINE_ROWS;
  addCheck(
    `total baris DB = baseline ${BASELINE_ROWS}`,
    rowsMatch,
    componentMissing
      ? `komponen gagal diambil: ${components.filter((c) => c.value === null).map((c) => c.label).join(", ")}`
      : `actual=${actualTotal} | ${components.map((c) => `${c.label}=${c.value}`).join(", ")}`
  );
  if (!rowsMatch && !componentMissing) {
    warnings.push(`[DATA] Jumlah baris DB berubah: baseline ${BASELINE_ROWS} → ${actualTotal}. Periksa apakah ada operasi data yang tidak diharapkan.`);
  }

  /* 4) Deteksi field password bocor (warning, bukan FAIL) */
  console.log("\n▶ [4/4] Deteksi kebocoran field password...");
  const usersList = users.json?.data;
  const listLeak = Array.isArray(usersList) && usersList.some((row) => row && Object.prototype.hasOwnProperty.call(row, "password"));
  let detailLeak = false;
  const firstUserId = Array.isArray(usersList) ? usersList[0]?.id : undefined;
  if (firstUserId !== undefined) {
    const userDetail = await getJson(`/api/users/${encodeURIComponent(firstUserId)}`);
    detailLeak = Boolean(userDetail.json?.data && Object.prototype.hasOwnProperty.call(userDetail.json.data, "password"));
  }
  const passwordLeak = listLeak || detailLeak;
  if (passwordLeak) {
    const detail = [
      listLeak ? `list ${usersList.length} baris` : null,
      detailLeak ? "detail /api/users/[id]" : null,
    ].filter(Boolean).join(" + ");
    warnings.push(`[KEAMANAN] Field "password" masih bocor di GET /api/users (${detail}) — belum diperbaiki, lihat docs/BUGS.md B2.`);
    console.log(`  WARNING: field password bocor (${detail}) — dicatat, bukan FAIL.`);
  } else {
    console.log("  Tidak ada field password pada respons GET /api/users.");
  }

  /* Kontrak error dari laporan smoke (warning) */
  const contractViolations = smokeReport?.contractViolations || [];
  for (const violation of contractViolations) {
    warnings.push(`[KONTRAK] ${violation.method} ${violation.endpoint} → "${violation.actualField}" bukan "message" (belum diperbaiki, BUGS B5).`);
  }

  /* Ringkasan */
  const failedChecks = checks.filter((check) => !check.ok && check.fatal);
  const passed = failedChecks.length === 0;
  console.log(`\n${"=".repeat(72)}\nRINGKASAN REGRESSION\n${"=".repeat(72)}`);
  for (const check of checks) {
    console.log(`${check.ok ? "✅ PASS" : "❌ FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
  }
  for (const warning of warnings) console.log(`⚠️  WARNING ${warning}`);
  const smokeTag = smokeSummary
    ? `smoke: ${smokeSummary.pass} PASS / ${smokeSummary.fail} FAIL / ${smokeSummary.skipped} SKIP / ${smokeSummary.negative ?? 0} negatif`
    : "smoke: detail tidak tersedia";
  console.log(`\n${smokeTag}`);
  console.log(`Baris DB via API: ${actualTotal === null ? "TIDAK TERBACA" : actualTotal} (baseline ${BASELINE_ROWS})`);
  console.log(`\nHASIL REGRESSION: ${passed ? "PASS ✅ (exit 0)" : "FAIL ❌ (exit 1)"}`);

  const payload = {
    generatedAt: generatedAt.toISOString(),
    baseUrl: BASE_URL,
    baselineRows: BASELINE_ROWS,
    durationMs: 0,
    pass: passed,
    checks,
    warnings,
    smoke: {
      exitCode: smokeExit,
      generatedAt: smokeReport?.generatedAt || null,
      summary: smokeSummary,
      contractViolations,
    },
    health: { status: health.status, json: health.json, latencyMs: health.latencyMs },
    dbRows: { actual: actualTotal, baseline: BASELINE_ROWS, match: rowsMatch, components },
    passwordLeak: { detected: passwordLeak, list: listLeak, detail: detailLeak, rows: Array.isArray(usersList) ? usersList.length : null },
  };
  payload.durationMs = Date.now() - generatedAt.getTime();
  try {
    await writeFile(path.join(HERE, "regression-last-run.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (error) {
    console.error(`Gagal menulis tests/regression-last-run.json: ${error?.message || error}`);
  }
  console.log("Laporan JSON: tests/regression-last-run.json");

  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(`\nFATAL regression: ${error?.stack || error}`);
  console.error(`Pastikan dev server hidup di ${BASE_URL} — script ini tidak menyalakan/mematikan server.`);
  process.exitCode = 1;
});
