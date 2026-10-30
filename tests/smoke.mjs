#!/usr/bin/env node
/**
 * Smoke test read-only untuk MIS SHOP OPS.
 *
 * Menguji SEMUA endpoint GET yang ada di src/app/api/**\/route.ts terhadap dev
 * server yang SEDANG BERJALAN, plus POST /api/auth/login (kredensial valid &
 * salah). Tidak memanggil endpoint POST/PUT/DELETE yang mengubah data.
 *
 * Pemakaian:
 *   node tests/smoke.mjs
 *   BASE_URL=http://localhost:3000 node tests/smoke.mjs
 *
 * Env (opsional):
 *   BASE_URL            default http://localhost:3000
 *   SMOKE_TIMEOUT_MS    timeout per request, default 150000 (dev compile on-demand)
 *   SMOKE_SLOW_MS       ambang lambat, default 500
 *
 * Exit code: 0 bila semua PASS, 1 bila ada FAIL / server tidak terjangkau.
 * Output: tabel ringkas di terminal + tests/last-run.json.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 150_000);
const SLOW_MS = Number(process.env.SMOKE_SLOW_MS || 500);

/* ------------------------------------------------------------------ */
/* Utilitas kecil                                                      */
/* ------------------------------------------------------------------ */

function typeOf(value) {
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (value === null) return "null";
  return typeof value;
}

function add(checks, name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });
  return Boolean(ok);
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isArray = (v) => Array.isArray(v);

/** Cek field array + (opsional) non-empty. */
function expectArray(checks, body, field, { label = field, nonEmpty = false } = {}) {
  const value = body?.[field];
  add(checks, `${label} array`, isArray(value), `tipe=${typeOf(value)}`);
  if (nonEmpty) {
    add(checks, `${label} tidak kosong`, isArray(value) && value.length > 0, `jumlah=${isArray(value) ? value.length : "-"}`);
  }
  return value;
}

/** Cek field object (bukan null/array). */
function expectObject(checks, body, field, { label = field } = {}) {
  const value = body?.[field];
  add(checks, `${label} object`, isObject(value), `tipe=${typeOf(value)}`);
  return value;
}

function expectNumber(checks, body, field, { label = field } = {}) {
  const value = body?.[field];
  add(checks, `${label} number`, typeof value === "number" && Number.isFinite(value), `tipe=${typeOf(value)} nilai=${String(value)}`);
  return value;
}

/* ------------------------------------------------------------------ */
/* Klien HTTP sederhana                                                */
/* ------------------------------------------------------------------ */

async function callApi(endpoint, { method = "GET", body, expectedStatus = 200 } = {}) {
  const url = BASE_URL + endpoint;
  const started = Date.now();
  const result = {
    method,
    endpoint,
    url,
    expectedStatus,
    httpStatus: null,
    contentType: null,
    latencyMs: 0,
    ok: false,
    skip: false,
    slow: false,
    note: "",
    error: null,
    parseError: null,
    checks: [],
    json: null,
    textPreview: "",
  };

  let response;
  let rawText = "";
  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    result.httpStatus = response.status;
    result.contentType = response.headers.get("content-type") || "";
    rawText = await response.text();
    // Jangan simpan nilai password (mis. GET /api/users) di artefak test.
    result.textPreview = rawText.replace(/("password"\s*:\s*)"[^"]*"/g, '$1"[REDACTED]"').slice(0, 1200);
  } catch (error) {
    result.latencyMs = Date.now() - started;
    result.error = error?.name === "TimeoutError"
      ? `timeout > ${TIMEOUT_MS}ms`
      : (error?.message || String(error));
    result.checks.push({ name: "request berhasil", ok: false, detail: result.error });
    return result;
  }

  result.latencyMs = Date.now() - started;
  result.slow = result.latencyMs > SLOW_MS;
  if (result.slow) result.note = `LAMBAT >${SLOW_MS}ms`;

  add(result.checks, "HTTP status sesuai", result.httpStatus === expectedStatus, `diharapkan=${expectedStatus} dapat=${result.httpStatus}`);
  add(result.checks, "Content-Type JSON", result.contentType.includes("application/json"), result.contentType || "(kosong)");

  try {
    result.json = JSON.parse(rawText);
    add(result.checks, "body JSON valid", true);
  } catch {
    result.parseError = "body bukan JSON valid";
    add(result.checks, "body JSON valid", false, result.textPreview.slice(0, 160));
    return result;
  }

  result.ok = result.checks.every((c) => c.ok);
  return result;
}

/** Validasi tambahan setelah body JSON didapat. */
function finalize(result, validate) {
  if (result.parseError || result.error) return result;
  if (validate) validate(result.json, result.checks, result);
  result.ok = result.httpStatus === result.expectedStatus && result.checks.every((c) => c.ok);
  return result;
}

/* ------------------------------------------------------------------ */
/* Spesifikasi endpoint GET (bentuk respons yang diharapkan)           */
/* ------------------------------------------------------------------ */

const baseListValidate = (field, nonEmpty) => (body, checks) => {
  add(checks, "success true", body.success === true, `success=${String(body.success)}`);
  expectArray(checks, body, field, { nonEmpty });
};

const GET_LISTS = [
  {
    endpoint: "/api/stats",
    label: "Statistik dashboard",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      const stats = expectObject(checks, body, "stats");
      for (const key of ["totalAssets", "pendingTickets", "onlineDevices", "posCount", "edcCount"]) {
        add(checks, `stats.${key} number`, typeof stats?.[key] === "number", `tipe=${typeOf(stats?.[key])}`);
      }
    },
  },
  { endpoint: "/api/assets", label: "Aset POS", validate: baseListValidate("data", true) },
  {
    endpoint: "/api/auth/accounts",
    label: "Akun login",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      expectArray(checks, body, "accounts", { nonEmpty: true });
      expectObject(checks, body, "stats");
      add(checks, "source string", typeof body.source === "string" && body.source.length > 0, typeOf(body.source));
    },
  },
  { endpoint: "/api/dvr", label: "Aset DVR", validate: baseListValidate("data", true) },
  { endpoint: "/api/edc", label: "Aset EDC", validate: baseListValidate("data", true) },
  {
    endpoint: "/api/extensions",
    label: "Ekstensi telepon",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      const data = expectArray(checks, body, "data", { nonEmpty: true });
      const stats = expectObject(checks, body, "stats");
      add(checks, "stats.totalExtensions = jumlah data", stats?.totalExtensions === data?.length, `${String(stats?.totalExtensions)} vs ${data?.length}`);
    },
  },
  {
    endpoint: "/api/knowledge-base",
    label: "Knowledge base",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      const articles = expectArray(checks, body, "articles", { nonEmpty: true });
      const stats = expectObject(checks, body, "stats");
      add(checks, "stats.total_articles = jumlah artikel", stats?.total_articles === articles?.length, `${String(stats?.total_articles)} vs ${articles?.length}`);
    },
  },
  {
    endpoint: "/api/monitoring",
    label: "Monitoring device",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      const data = expectArray(checks, body, "data", { nonEmpty: true });
      const total = expectNumber(checks, body, "totalCount");
      expectNumber(checks, body, "onlineCount");
      add(checks, "totalCount = jumlah data", total === data?.length, `${String(total)} vs ${data?.length}`);
    },
  },
  { endpoint: "/api/office", label: "Aset kantor", validate: baseListValidate("data", true) },
  {
    endpoint: "/api/permissions",
    label: "RBAC permission",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      expectArray(checks, body, "roles", { nonEmpty: true });
      expectArray(checks, body, "menus", { nonEmpty: true });
      expectObject(checks, body, "matrix");
      expectArray(checks, body, "raw", { nonEmpty: true });
    },
  },
  { endpoint: "/api/pos-hardware", label: "Hardware POS", validate: baseListValidate("data", true) },
  { endpoint: "/api/purchases", label: "Pengadaan", validate: baseListValidate("data", true) },
  {
    endpoint: "/api/server-rack",
    label: "Server rack",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      expectArray(checks, body, "ports", { nonEmpty: true });
      expectArray(checks, body, "rackUnits", { nonEmpty: true });
      expectObject(checks, body, "stats");
    },
  },
  {
    endpoint: "/api/t3-assets",
    label: "Aset tetap T3",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      expectArray(checks, body, "data", { nonEmpty: true });
      expectObject(checks, body, "stats");
    },
  },
  { endpoint: "/api/tickets", label: "Tiket helpdesk", validate: baseListValidate("data", true) },
  { endpoint: "/api/users", label: "Pengguna", validate: baseListValidate("data", true) },
];

/* Rute baru dari agent backend (opsional; di-skip bila belum ada). */
const OPTIONAL_GET = [
  {
    endpoint: "/api/health",
    label: "Health check (opsional)",
    validate: (body, checks) => {
      add(checks, "success true", body.success === true, `success=${String(body.success)}`);
      add(checks, "db = ok", body.db === "ok", `db=${String(body.db)}`);
    },
  },
];

/* ------------------------------------------------------------------ */
/* Detail endpoint: path dibangun dari data list (read-only)           */
/* ------------------------------------------------------------------ */

const DETAIL_SOURCES = [
  { listEndpoint: "/api/assets", field: "data", key: "asset_code", build: (v) => `/api/assets/${encodeURIComponent(v)}`, label: "Detail aset" },
  { listEndpoint: "/api/dvr", field: "data", key: "id", build: (v) => `/api/dvr/${encodeURIComponent(v)}`, label: "Detail DVR" },
  { listEndpoint: "/api/edc", field: "data", key: "id", build: (v) => `/api/edc/${encodeURIComponent(v)}`, label: "Detail EDC" },
  { listEndpoint: "/api/extensions", field: "data", key: "id", build: (v) => `/api/extensions/${encodeURIComponent(v)}`, label: "Detail ekstensi" },
  { listEndpoint: "/api/knowledge-base", field: "articles", key: "id", build: (v) => `/api/knowledge-base/${encodeURIComponent(v)}`, label: "Detail artikel", objectField: "article" },
  { listEndpoint: "/api/office", field: "data", key: "id", build: (v) => `/api/office/${encodeURIComponent(v)}`, label: "Detail aset kantor" },
  { listEndpoint: "/api/pos-hardware", field: "data", key: "id", build: (v) => `/api/pos-hardware/${encodeURIComponent(v)}`, label: "Detail hardware POS" },
  { listEndpoint: "/api/t3-assets", field: "data", key: "id", build: (v) => `/api/t3-assets/${encodeURIComponent(v)}`, label: "Detail aset T3" },
  { listEndpoint: "/api/users", field: "data", key: "id", build: (v) => `/api/users/${encodeURIComponent(v)}`, label: "Detail pengguna" },
];

function validateDetail(body, checks, result) {
  add(checks, "success true", body.success === true, `success=${String(body.success)}`);
  if (result.objectField) {
    expectObject(checks, body, result.objectField);
  } else {
    expectObject(checks, body, "data");
    if (result.endpoint.startsWith("/api/assets/")) expectArray(checks, body, "tickets");
  }
}

/* ------------------------------------------------------------------ */
/* Deteksi rute GET di filesystem (jaring pengaman rute baru)          */
/* ------------------------------------------------------------------ */

async function discoverGetRoutes() {
  const apiDir = path.join(ROOT, "src", "app", "api");
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === "route.ts") {
        const text = await readFile(full, "utf8");
        if (/export\s+async\s+function\s+GET/.test(text)) {
          const rel = path.relative(apiDir, path.dirname(full)).split(path.sep);
          found.push("/api" + (rel.length && rel[0] !== "." ? "/" + rel.join("/") : ""));
        }
      }
    }
  }
  await walk(apiDir);
  return found;
}

const normalizeRoute = (route) => route.replace(/\[[^\]]+\]/g, ":param");

/* ------------------------------------------------------------------ */
/* Warm-up: hit sekali tanpa assert agar Next.js selesai compile route  */
/* (dev server berat; latency yang dilaporkan harus latency hangat).    */
/* ------------------------------------------------------------------ */

async function warmUp(endpoints, label) {
  if (endpoints.length === 0) return;
  console.log(`\nWarm-up ${label} (${endpoints.length} endpoint, tanpa assert, error diabaikan)...`);
  for (const endpoint of endpoints) {
    const started = Date.now();
    try {
      const response = await fetch(BASE_URL + endpoint, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      await response.text();
      console.log(`  warm ${endpoint.padEnd(34)} → HTTP ${response.status} ${Date.now() - started}ms`);
    } catch (error) {
      const reason = error?.name === "TimeoutError" ? `timeout >${TIMEOUT_MS}ms` : (error?.message || String(error));
      console.log(`  warm ${endpoint.padEnd(34)} → ${reason} ${Date.now() - started}ms (dilanjutkan)`);
    }
  }
}

async function warmUpPost(endpoint, body) {
  const started = Date.now();
  try {
    const response = await fetch(BASE_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    await response.text();
    console.log(`  warm POST ${endpoint.padEnd(29)} → HTTP ${response.status} ${Date.now() - started}ms`);
  } catch (error) {
    const reason = error?.name === "TimeoutError" ? `timeout >${TIMEOUT_MS}ms` : (error?.message || String(error));
    console.log(`  warm POST ${endpoint.padEnd(29)} → ${reason} ${Date.now() - started}ms (dilanjutkan)`);
  }
}

/* ------------------------------------------------------------------ */
/* Eksekusi                                                            */
/* ------------------------------------------------------------------ */

async function main() {
  const startedAt = new Date();
  const runStarted = Date.now();
  const results = [];
  const warnings = [];
  const bodies = new Map();

  const recorded = (result) => {
    results.push(result);
    if (result.json && result.endpoint.startsWith("/api/") && !result.endpoint.startsWith("/api/auth/login")) {
      bodies.set(result.endpoint, result.json);
    }
    return result;
  };

  // 0) Warm-up endpoint GET statis (Next.js dev compile on-demand; jangan
  //    menganggap request pertama lambat/timeout sebagai endpoint rusak).
  await warmUp([...GET_LISTS.map((spec) => spec.endpoint), ...OPTIONAL_GET.map((spec) => spec.endpoint)], "endpoint GET statis");

  // 1) Endpoint list/GET statis — diukur SETELAH warm-up
  for (const spec of GET_LISTS) {
    const raw = await callApi(spec.endpoint);
    const result = finalize(raw, spec.validate);
    result.label = spec.label;
    recorded(result);
  }

  // 2) Endpoint GET dengan parameter path, dibangun dari data list
  const plannedDetails = [];
  for (const source of DETAIL_SOURCES) {
    const listBody = bodies.get(source.listEndpoint);
    const rows = listBody?.[source.field];
    const row = Array.isArray(rows) ? rows[0] : null;
    const value = row?.[source.key];

    if (value === undefined || value === null || value === "") {
      results.push({
        method: "GET",
        endpoint: source.listEndpoint,
        label: source.label,
        httpStatus: null,
        latencyMs: 0,
        expectedStatus: 200,
        ok: false,
        skip: true,
        slow: false,
        note: `SKIP: data ${source.listEndpoint} kosong / field ${source.key} tidak ada`,
        error: null,
        checks: [],
        textPreview: "",
      });
      continue;
    }

    plannedDetails.push({ source, endpoint: source.build(value) });
  }

  await warmUp(plannedDetails.map((item) => item.endpoint), "endpoint GET detail");

  for (const { source, endpoint } of plannedDetails) {
    const raw = await callApi(endpoint);
    const result = finalize(raw, (body, checks) => validateDetail(body, checks, { ...source, endpoint }));
    result.label = source.label;
    recorded(result);
  }

  // 3) Endpoint opsional (mis. /api/health dari agent backend)
  for (const spec of OPTIONAL_GET) {
    const raw = await callApi(spec.endpoint);
    if (raw.httpStatus === 404 && !raw.json) {
      results.push({ ...raw, label: spec.label, skip: true, ok: false, note: "SKIP: route belum ada di dev server" });
      continue;
    }
    const result = finalize(raw, spec.validate);
    result.label = spec.label;
    recorded(result);
  }

  // 4) POST /api/auth/login — kredensial valid & salah (read-only)
  console.log("\nWarm-up endpoint login...");
  await warmUpPost("/api/auth/login", { username: "mis", password: "123" });
  await warmUpPost("/api/auth/login", { username: "mis", password: "salah-password-qa" });

  const validLogin = await callApi("/api/auth/login", {
    method: "POST",
    body: { username: "mis", password: "123" },
  });
  finalize(validLogin, (body, checks) => {
    add(checks, "success true", body.success === true, `success=${String(body.success)}`);
    const user = expectObject(checks, body, "user");
    add(checks, "user.username = mis", String(user?.username).toLowerCase() === "mis", String(user?.username));
    add(checks, "user.role string", typeof user?.role === "string" && user.role.length > 0, String(user?.role));
    add(checks, "user.password tidak dikirim", user !== null && !("password" in user), user && "password" in user ? "ADA FIELD password" : "aman");
  });
  validLogin.label = "Login valid (mis/123)";
  recorded(validLogin);

  const wrongLogin = await callApi("/api/auth/login", {
    method: "POST",
    body: { username: "mis", password: "salah-password-qa" },
    expectedStatus: 401,
  });
  finalize(wrongLogin, (body, checks) => {
    add(checks, "success false", body.success === false, `success=${String(body.success)}`);
    add(checks, "message string", typeof body.message === "string" && body.message.length > 0, typeOf(body.message));
  });
  wrongLogin.label = "Login salah (mis/salah)";
  recorded(wrongLogin);

  // 4b) Probe keamanan (informational): backdoor password "123" untuk user lain
  //     Hanya POST /api/auth/login (read-only), tidak mengubah data.
  const usersBody = bodies.get("/api/users");
  const firstOtherUser = (usersBody?.data || []).find((u) => String(u.username).toLowerCase() !== "mis");
  if (firstOtherUser) {
    const probe = await callApi("/api/auth/login", {
      method: "POST",
      body: { username: firstOtherUser.username, password: "123" },
    });
    if (probe.json?.success === true) {
      warnings.push(
        `[KEAMANAN] Login user "${firstOtherUser.username}" dengan password "123" berhasil (backdoor universal, lihat auth/login/route.ts:40).`
      );
    } else {
      warnings.push(`[INFO] Backdoor password "123" untuk "${firstOtherUser.username}" sudah tidak aktif (status ${String(probe.httpStatus)}).`);
    }
  }

  // 5) Cross-check angka /api/stats vs jumlah baris list
  const statsBody = bodies.get("/api/stats")?.stats;
  const pairs = [
    ["totalAssets", "/api/assets", "data"],
    ["totalMonitoredDevices", "/api/monitoring", "data"],
    ["totalOfficeAssets", "/api/office", "data"],
    ["posCount", "/api/pos-hardware", "data"],
    ["edcCount", "/api/edc", "data"],
    ["t3Count", "/api/t3-assets", "data"],
    ["dvrCount", "/api/dvr", "data"],
    ["rackPortCount", "/api/server-rack", "ports"],
    ["extensionCount", "/api/extensions", "data"],
    ["purchaseCount", "/api/purchases", "data"],
    ["knowledgeCount", "/api/knowledge-base", "articles"],
  ];
  const crossChecks = [];
  if (statsBody) {
    for (const [statKey, endpoint, field] of pairs) {
      const expected = statsBody[statKey];
      const actual = bodies.get(endpoint)?.[field];
      const pass = typeof expected === "number" && Array.isArray(actual) && expected === actual.length;
      crossChecks.push({
        name: `stats.${statKey} (${String(expected)}) = ${endpoint} ${field} (${Array.isArray(actual) ? actual.length : "?"})`,
        ok: pass,
      });
      if (!pass) {
        warnings.push(`[KONSISTENSI] /api/stats ${statKey}=${String(expected)} berbeda dengan jumlah ${endpoint} (${Array.isArray(actual) ? actual.length : "tidak ada"}).`);
      }
    }
  } else {
    warnings.push("[INFO] /api/stats tidak mengembalikan stats; cross-check dilewati.");
  }

  // 6) Deteksi field sensitif pada respons read-only
  const usersList = bodies.get("/api/users")?.data;
  if (Array.isArray(usersList) && usersList.some((u) => u && Object.prototype.hasOwnProperty.call(u, "password"))) {
    warnings.push(
      `[KEAMANAN] GET /api/users membocorkan field "password" (${usersList.length} baris; nilai terisi: ${usersList.filter((u) => u.password).length}). File: src/app/api/users/route.ts.`
    );
  }
  const usersDetailIndex = results.findIndex((r) => r.endpoint.startsWith("/api/users/") && r.json?.data);
  if (usersDetailIndex >= 0 && results[usersDetailIndex].json.data?.password !== undefined) {
    warnings.push("[KEAMANAN] GET /api/users/[id] membocorkan field \"password\". File: src/app/api/users/[id]/route.ts.");
  }

  // Side effect GET yang perlu diketahui
  if (results.some((r) => r.endpoint.startsWith("/api/knowledge-base/") && r.ok)) {
    warnings.push("[SIDE-EFFECT] GET /api/knowledge-base/[id] menaikkan view_count (mutasi DB via GET). File: src/app/api/knowledge-base/[id]/route.ts:18-22.");
  }
  warnings.push("[SIDE-EFFECT] GET /api/monitoring?ping=true melakukan UPDATE monitoring_devices — smoke test sengaja TIDAK memanggil query itu.");

  // 7) Bandingkan dengan route.ts di filesystem (deteksi rute GET belum tercakup)
  const covered = new Set([
    ...GET_LISTS.map((s) => normalizeRoute(s.endpoint)),
    ...DETAIL_SOURCES.map((s) => normalizeRoute(s.build(":param"))),
    ...OPTIONAL_GET.map((s) => normalizeRoute(s.endpoint)),
  ]);
  const discovered = await discoverGetRoutes();
  const uncovered = discovered.map(normalizeRoute).filter((route) => !covered.has(route));
  if (uncovered.length > 0) {
    warnings.push(`[COVERAGE] Endpoint GET belum tercakup smoke test: ${uncovered.join(", ")}`);
  }
  const stale = [...covered].filter((route) => !discovered.map(normalizeRoute).includes(route));
  if (stale.length > 0) warnings.push(`[COVERAGE] Spesifikasi smoke tidak menemukan route.ts-nya: ${stale.join(", ")}`);

  if (results.some((r) => r.slow)) {
    const slow = results.filter((r) => r.slow).map((r) => `${r.endpoint} ${r.latencyMs}ms`);
    warnings.push(`[PERFORMA] ${slow.length} endpoint > ${SLOW_MS}ms: ${slow.join(", ")}. Catatan: dev server Next.js compile on-demand (cold) — jalankan ulang untuk baseline hangat.`);
  }

  /* ---------------- Ringkasan ---------------- */
  const tested = results.filter((r) => !r.skip);
  const skipped = results.filter((r) => r.skip);
  const failed = tested.filter((r) => !r.ok);
  const passed = tested.filter((r) => r.ok);
  const slowCount = tested.filter((r) => r.slow).length;

  const summary = {
    total: results.length,
    tested: tested.length,
    pass: passed.length,
    fail: failed.length,
    skipped: skipped.length,
    slow: slowCount,
    crossCheckPass: crossChecks.filter((c) => c.ok).length,
    crossCheckFail: crossChecks.filter((c) => !c.ok).length,
  };

  /* ---------------- Tabel terminal ---------------- */
  const w = (value) => new Intl.NumberFormat("id-ID").format(value);
  const rows = results.map((r, i) => [
    String(i + 1),
    r.skip ? "SKIP" : r.ok ? "PASS" : "FAIL",
    `${r.method} ${r.endpoint}`,
    r.httpStatus === null ? "-" : String(r.httpStatus),
    `${w(r.latencyMs)}ms`,
    r.skip ? "-" : `${r.checks.filter((c) => c.ok).length}/${r.checks.length}`,
    r.skip ? r.note : (r.error || r.parseError || r.note || ""),
  ]);
  const header = ["#", "STATUS", "ENDPOINT", "HTTP", "LATENSI", "CHECK", "CATATAN"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join(" | ");

  console.log(`\nMIS SHOP OPS — API smoke test (read-only)\nBase URL : ${BASE_URL}\nWaktu     : ${startedAt.toISOString()}\nAmbang    : ${SLOW_MS}ms (ditandai LAMBAT, bukan FAIL)\nLatency   : diukur SETELAH warm-up (bukan cold compile Next.js dev)\n`);
  console.log(line(header));
  console.log(widths.map((width) => "-".repeat(width)).join("-+-"));
  for (const row of rows) {
    const marker = row[1] === "FAIL" ? " >>" : "";
    console.log(line(row) + marker);
  }

  if (failed.length > 0) {
    console.log("\nDetail FAIL:");
    for (const r of failed) {
      if (r.skip) continue;
      console.log(`- ${r.method} ${r.endpoint}${r.error ? ` — ${r.error}` : ""}`);
      for (const check of r.checks.filter((c) => !c.ok)) console.log(`    ! ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
    }
  }

  if (crossChecks.length > 0) {
    console.log(`\nCross-check /api/stats vs list: ${crossChecks.filter((c) => c.ok).length}/${crossChecks.length} cocok`);
    for (const c of crossChecks.filter((x) => !x.ok)) console.log(`  ! ${c.name}`);
  }

  if (warnings.length > 0) {
    console.log("\nPeringatan / temuan:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  const durationMs = Date.now() - runStarted;
  console.log(
    `\nHASIL: ${summary.pass} PASS · ${summary.fail} FAIL · ${summary.skipped} SKIP · ${summary.slow} lambat (>${SLOW_MS}ms)\nDurasi: ${(durationMs / 1000).toFixed(1)}s\nLaporan JSON: tests/last-run.json\n`
  );

  /* ---------------- tests/last-run.json ---------------- */
  const payload = {
    generatedAt: startedAt.toISOString(),
    baseUrl: BASE_URL,
    node: process.version,
    slowThresholdMs: SLOW_MS,
    latencyNote: "Latency diukur setelah warm-up; dev server Next.js compile on-demand.",
    durationMs,
    summary,
    crossChecks,
    warnings,
    results: results.map((r) => ({
      method: r.method,
      endpoint: r.endpoint,
      label: r.label || "",
      expectedStatus: r.expectedStatus,
      httpStatus: r.httpStatus,
      latencyMs: r.latencyMs,
      slow: r.slow,
      ok: r.ok,
      skip: r.skip,
      note: r.note,
      error: r.error,
      parseError: r.parseError,
      checks: r.checks,
      textPreview: r.textPreview,
    })),
  };
  await writeFile(path.join(HERE, "last-run.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.exitCode = summary.fail > 0 ? 1 : 0;
}

main().catch(async (error) => {
  console.error(`\nFATAL: ${error?.stack || error}`);
  console.error(`Pastikan dev server berjalan di ${BASE_URL} (jangan distop/restart dari script ini).`);
  try {
    await writeFile(
      path.join(HERE, "last-run.json"),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, fatal: String(error?.message || error) }, null, 2)}\n`,
      "utf8"
    );
  } catch {
    /* abaikan kegagalan menulis laporan */
  }
  process.exitCode = 1;
});
