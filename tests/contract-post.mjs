#!/usr/bin/env node
/**
 * Tes kontrak POST NON-MUTASI (task-14, Batch B).
 *
 * Hanya mengirim payload KOSONG (`{}`) ke endpoint POST yang divalidasi:
 * berdasarkan inspeksi kode, semua endpoint di bawah menolak body kosong
 * dengan HTTP 400 SEBELUM menyentuh database. TIDAK PERNAH mengirim payload
 * valid/parsial yang bisa lolos validasi dan meng-insert data.
 *
 * Sebelum & sesudah setiap tes, total baris DB dibaca via API (read-only):
 *   stats 11 tabel + users + tickets + role_permissions + server_rack_units
 * dan harus tetap 982 (baseline). Bila berubah, gate FAIL.
 *
 * Endpoint POST yang sengaja TIDAK diuji: `POST /api/monitoring/ping`
 * karena body kosong = ping SEMUA device lalu UPDATE tabel monitoring
 * (side effect nyata, bukan kontrak 400).
 *
 * Pemakaian (root proyek, server hidup, jangan restart dari script):
 *   node tests/contract-post.mjs
 *
 * Env: BASE_URL, CONTRACT_BASELINE_ROWS (default 982), CONTRACT_TIMEOUT_MS.
 * Exit code 0 = PASS; 1 = ada FAIL. Output: tests/contract-post-last-run.json
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.CONTRACT_TIMEOUT_MS || 30_000);
const BASELINE_ROWS = Number(process.env.CONTRACT_BASELINE_ROWS || 982);

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

/** Endpoint POST + payload kosong yang dijamin 400 oleh validasi kode. */
const POST_SPECS = [
  { endpoint: "/api/assets", label: "POST aset kosong" },
  { endpoint: "/api/dvr", label: "POST DVR kosong" },
  { endpoint: "/api/edc", label: "POST EDC kosong" },
  { endpoint: "/api/extensions", label: "POST ekstensi kosong" },
  { endpoint: "/api/knowledge-base", label: "POST artikel kosong" },
  { endpoint: "/api/office", label: "POST office kosong" },
  { endpoint: "/api/pos-hardware", label: "POST hardware POS kosong" },
  { endpoint: "/api/purchases", label: "POST pengadaan kosong" },
  { endpoint: "/api/server-rack", label: "POST server rack kosong" },
  { endpoint: "/api/t3-assets", label: "POST aset T3 kosong" },
  { endpoint: "/api/tickets", label: "POST tiket kosong" },
  { endpoint: "/api/users", label: "POST user kosong" },
  { endpoint: "/api/anydesk/connect", label: "POST anydesk kosong" },
  { endpoint: "/api/dvr/test-connect", label: "POST test-connect DVR kosong" },
  { endpoint: "/api/edc/ping", label: "POST ping EDC kosong" },
  { endpoint: "/api/pos/heartbeat", label: "POST heartbeat POS kosong" },
  { endpoint: "/api/permissions", label: "POST permission kosong" },
  { endpoint: "/api/knowledge-base/abc/helpful", label: "POST helpful id invalid", body: {} },
];

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
    return { endpoint, status: response.status, latencyMs: Date.now() - started, json, error: null };
  } catch (error) {
    return { endpoint, status: null, latencyMs: Date.now() - started, json: null, error: error?.message || String(error) };
  }
}

/** Baca total baris DB lewat API read-only. */
async function readDbTotal() {
  const [stats, users, tickets, permissions, serverRack] = await Promise.all([
    getJson("/api/stats"),
    getJson("/api/users"),
    getJson("/api/tickets"),
    getJson("/api/permissions"),
    getJson("/api/server-rack"),
  ]);
  const values = [
    users.json?.data?.length,
    tickets.json?.data?.length,
    permissions.json?.raw?.length,
    serverRack.json?.rackUnits?.length,
  ];
  if (values.some((value) => typeof value !== "number")) {
    const failed = [stats, users, tickets, permissions, serverRack].filter((r) => r.status !== 200 || !r.json);
    return { total: null, components: null, error: `komponen gagal dibaca: ${failed.map((r) => `${r.endpoint} (${r.status ?? r.error})`).join(", ")}` };
  }
  const statsTotal = STATS_TABLES.reduce((sum, key) => sum + (Number(stats.json?.stats?.[key]) || 0), 0);
  const components = {
    stats: statsTotal,
    users: values[0],
    tickets: values[1],
    role_permissions: values[2],
    server_rack_units: values[3],
  };
  return { total: Object.values(components).reduce((sum, value) => sum + value, 0), components, error: null };
}

async function postEmpty(endpoint) {
  const started = Date.now();
  try {
    const response = await fetch(BASE_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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
    return { endpoint, status: response.status, latencyMs: Date.now() - started, json, raw: text.slice(0, 300), error: null };
  } catch (error) {
    return { endpoint, status: null, latencyMs: Date.now() - started, json: null, raw: "", error: error?.message || String(error) };
  }
}

function addCheck(checks, name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });
  return Boolean(ok);
}

async function main() {
  const generatedAt = new Date();
  console.log(`\nMIS SHOP OPS — KONTRAK POST NON-MUTASI\nBase URL : ${BASE_URL}\nWaktu    : ${generatedAt.toISOString()}\nBaseline : ${BASELINE_ROWS} baris DB (dibaca ulang sebelum/sesudah tiap tes)\n`);

  // Guard: baseline harus cocok sebelum mengirim POST apa pun.
  const initial = await readDbTotal();
  if (initial.total !== BASELINE_ROWS) {
    console.error(`FATAL GUARD: total baris DB awal ${initial.total ?? "TIDAK TERBACA"} ≠ baseline ${BASELINE_ROWS}.`);
    console.error(`Detail: ${initial.error || JSON.stringify(initial.components)}`);
    console.error("Tes POST DIBATALKAN agar tidak menyentuh data dengan baseline tak dikenal.");
    process.exitCode = 1;
    return;
  }
  console.log(`Guard OK: baris DB awal = ${initial.total} (${JSON.stringify(initial.components)})\n`);

  const results = [];
  const contractViolations = [];

  for (const spec of POST_SPECS) {
    const before = await readDbTotal();
    const response = await postEmpty(spec.endpoint);
    const after = await readDbTotal();

    const checks = [];
    addCheck(checks, "HTTP 400", response.status === 400, `HTTP ${response.status ?? response.error}`);
    addCheck(checks, "body JSON valid", response.json !== null, response.json ? "json" : `non-JSON: ${response.raw}`);
    addCheck(checks, "success false", response.json?.success === false, `success=${String(response.json?.success)}`);
    addCheck(checks, "baris DB sebelum = baseline", before.total === BASELINE_ROWS, `${before.total ?? "?"} vs ${BASELINE_ROWS}`);
    addCheck(checks, "baris DB sesudah = sebelum", after.total === before.total, `${after.total ?? "?"} vs ${before.total ?? "?"}`);
    addCheck(checks, "baris DB sesudah = baseline", after.total === BASELINE_ROWS, `${after.total ?? "?"} vs ${BASELINE_ROWS}`);

    const hasMessage = typeof response.json?.message === "string" && response.json.message.length > 0;
    const hasError = typeof response.json?.error === "string" && response.json.error.length > 0;
    addCheck(checks, "ada pesan penolakan", hasMessage || hasError, hasMessage ? "message" : hasError ? "error (kontrak menyimpang)" : "tidak ada");
    if (!hasMessage && hasError) {
      contractViolations.push({
        endpoint: spec.endpoint,
        httpStatus: response.status,
        actualField: "error",
        sample: String(response.json.error).slice(0, 140),
      });
    }

    const ok = checks.every((check) => check.ok);
    results.push({
      endpoint: spec.endpoint,
      label: spec.label,
      status: response.status,
      latencyMs: response.latencyMs,
      rowsBefore: before.total,
      rowsAfter: after.total,
      messageField: hasMessage ? "message" : hasError ? "error" : "(tidak ada)",
      ok,
      checks,
    });
    console.log(`${ok ? "PASS" : "FAIL"}  ${spec.endpoint.padEnd(36)} HTTP ${String(response.status ?? "-").padEnd(4)} rows ${before.total}→${after.total} ${hasMessage ? "message" : hasError ? "error!" : "no-msg!"}`);
  }

  const failed = results.filter((result) => !result.ok);
  const final = await readDbTotal();
  const finalOk = final.total === BASELINE_ROWS;

  console.log("\n" + "=".repeat(72));
  console.log("RINGKASAN KONTRAK POST");
  console.log("=".repeat(72));
  for (const result of failed) {
    console.log(`❌ ${result.endpoint}`);
    for (const check of result.checks.filter((check) => !check.ok)) console.log(`   ! ${check.name}: ${check.detail}`);
  }
  for (const violation of contractViolations) {
    console.log(`⚠️  KONTRAK ${violation.endpoint} → field "${violation.actualField}" bukan "message" (${violation.sample})`);
  }
  console.log(`Total baris DB akhir: ${final.total ?? "TIDAK TERBACA"} (baseline ${BASELINE_ROWS}) — ${finalOk ? "OK" : "BERUBAH!"}`);
  console.log(`\nHASIL: ${results.length - failed.length}/${results.length} PASS · ${failed.length} FAIL · ${contractViolations.length} pelanggaran kontrak`);
  console.log(`EXIT: ${failed.length === 0 && finalOk ? "0 (PASS)" : "1 (FAIL)"}`);

  const payload = {
    generatedAt: generatedAt.toISOString(),
    baseUrl: BASE_URL,
    baselineRows: BASELINE_ROWS,
    pass: failed.length === 0 && finalOk,
    summary: {
      total: results.length,
      pass: results.length - failed.length,
      fail: failed.length,
      contractViolations: contractViolations.length,
      rowsBefore: initial.total,
      rowsAfter: final.total,
    },
    contractViolations,
    results,
  };
  try {
    await writeFile(path.join(HERE, "contract-post-last-run.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (error) {
    console.error(`Gagal menulis tests/contract-post-last-run.json: ${error?.message || error}`);
  }
  console.log("Laporan JSON: tests/contract-post-last-run.json");

  process.exitCode = failed.length === 0 && finalOk ? 0 : 1;
}

main().catch((error) => {
  console.error(`\nFATAL contract-post: ${error?.stack || error}`);
  console.error(`Pastikan server hidup di ${BASE_URL} — script ini tidak menyalakan/mematikan server.`);
  process.exitCode = 1;
});
