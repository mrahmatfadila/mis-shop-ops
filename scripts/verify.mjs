#!/usr/bin/env node
/**
 * Gate verifikasi MIS SHOP OPS — tanpa dependency baru.
 *
 * Urutan:
 *   1. npx tsc --noEmit                                    (tipe TypeScript)
 *   2. node tests/smoke.mjs                                (API read-only, butuh dev server :3000)
 *   3. node --experimental-strip-types --test tests/lib.test.mjs
 *      (dilewati dengan catatan bila tests/lib.test.mjs belum ada)
 *
 * Pemakaian (dev server user harus tetap hidup):
 *   node scripts/verify.mjs
 *
 * Exit code: 0 bila semua langkah lulus, 1 bila ada yang gagal.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const steps = [];

function runStep(label, command, args, { cwd = ROOT, required = true } = {}) {
  console.log(`\n${"=".repeat(72)}\n▶ ${label}\n  $ ${command} ${args.join(" ")}\n${"=".repeat(72)}`);
  const started = Date.now();
  // npx/npm adalah file .cmd di Windows → harus lewat shell. Perintahnya tetap
  // (npx tsc --noEmit) agar sesuai kontrak, tanpa argumen dinamis.
  const useShell = isWindows && command === "npx";
  const result = useShell
    ? spawnSync(`${command} ${args.join(" ")}`, { cwd, stdio: "inherit", shell: true, env: process.env })
    : spawnSync(command, args, { cwd, stdio: "inherit", env: process.env });
  const durationMs = Date.now() - started;
  const status = result.error ? 1 : (result.status ?? 1);
  console.log(`\n◀ ${label}: ${status === 0 ? "OK" : `GAGAL (exit ${status})`} — ${(durationMs / 1000).toFixed(1)}s`);
  steps.push({ label, status, durationMs, error: result.error?.message });
  return status;
}

// 1) Type-check
runStep("TypeScript type-check", "npx", ["tsc", "--noEmit"]);

// 2) Smoke test API (butuh dev server aktif di :3000)
runStep("Smoke test API read-only", process.execPath, ["tests/smoke.mjs"]);

// 3) Unit test pure function (opsional sampai task-6 selesai)
const unitTestFile = path.join(ROOT, "tests", "lib.test.mjs");
if (existsSync(unitTestFile)) {
  runStep("Unit test src/lib/utils.ts", process.execPath, [
    "--experimental-strip-types",
    "--test",
    "tests/lib.test.mjs",
  ]);
} else {
  console.log("\n[LEWATI] tests/lib.test.mjs belum ada — unit test helper dilewati (akan aktif setelah task-6).");
  steps.push({ label: "Unit test src/lib/utils.ts", status: "skipped", durationMs: 0 });
}

const failed = steps.filter((step) => step.status !== 0 && step.status !== "skipped");
const skipped = steps.filter((step) => step.status === "skipped");
const totalMs = steps.reduce((sum, step) => sum + (step.durationMs || 0), 0);

console.log(`\n${"=".repeat(72)}\nRINGKASAN VERIFIKASI\n${"=".repeat(72)}`);
for (const step of steps) {
  const mark = step.status === 0 ? "✅ LULUS" : step.status === "skipped" ? "⏭️  LEWATI" : "❌ GAGAL";
  console.log(`${mark.padEnd(12)} ${step.label}${step.error ? ` — ${step.error}` : ""}`);
}
console.log(`\nTotal: ${(totalMs / 1000).toFixed(1)}s · ${failed.length} gagal · ${skipped.length} dilewati`);

if (failed.length > 0) {
  console.error("\nVERIFIKASI GAGAL. Perbaiki langkah yang ❌ di atas lalu jalankan ulang.");
  process.exitCode = 1;
} else {
  console.log("\nSEMUA VERIFIKASI LULUS.");
  process.exitCode = 0;
}
