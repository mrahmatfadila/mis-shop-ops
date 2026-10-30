#!/usr/bin/env node
/**
 * Audit kepatuhan `AI_RULES.md` — scan statis read-only `src/**` (task-17).
 *
 * TANPA dependency baru, TANPA mengubah src/**, TANPA request/server/git write.
 * Satu-satunya file yang ditulis: `docs/RULES-COMPLIANCE.md` (laporan).
 *
 * Isi audit:
 *   1. File sumber >400 / >1000 baris (target AI_RULES 150–200 baris).
 *   2. Heuristik array data hardcoded (objek literal) di src/app & src/components.
 *   3. Penggunaan `any`, `@ts-ignore`, `@ts-expect-error`.
 *   4. Duplikasi formatRupiah / toLocaleString("id-ID") / format tanggal di luar
 *      src/lib/utils.ts.
 *   5. Info `"use client"` halaman & import ikon dari lucide-react.
 *
 * Exit code: 1 HANYA bila ada pelanggaran berat:
 *   - file >1000 baris yang bukan monolit legacy yang sudah diketahui, ATAU
 *   - array hardcoded >20 objek di file yang disentuh Shift 2, ATAU
 *   - `any` bertambah di file yang disentuh Shift 2 (dibanding commit baseline).
 * Selain itu WARNING saja → exit 0.
 *
 * Pemakaian:
 *   node tests/static-rules.mjs
 *   STATIC_BASE_COMMIT=e6c8621 node tests/static-rules.mjs
 */

import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "src");
const DOC_PATH = path.join(ROOT, "docs", "RULES-COMPLIANCE.md");
// Commit terakhir SEBELUM Shift 2 dimulai (dipakai mendeteksi file/any baru).
const BASE_COMMIT = process.env.STATIC_BASE_COMMIT || "e6c8621";
const ANY_PATTERN = /:\s*any\b|<any>|as any\b/g;

/** Monolit legacy yang sudah tercatat di docs/ANALISIS-PROYEK.md (F4/F5).
 *  Tidak dihitung pelanggaran berat, tetapi tetap dilaporkan sebagai warning. */
const LEGACY_MONOLITHS = new Set([
  "src/app/assets/page.tsx",
  "src/app/purchases/page.tsx",
  "src/app/pos-topology/page.tsx",
  "src/app/edc/page.tsx",
  "src/app/dvr/page.tsx",
  "src/app/server-rack/page.tsx",
  "src/app/office/page.tsx",
  "src/app/knowledge-base/page.tsx",
  "src/components/SidebarLayout.tsx",
  "src/lib/seed.ts",
]);

const rel = (absolute) => path.relative(ROOT, absolute).split(path.sep).join("/");
const countLines = (content) => {
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.length;
};
const countMatches = (content, pattern) => (content.match(pattern) || []).length;

async function walkSource() {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) found.push(full);
    }
  }
  await walk(SRC);
  return found.sort();
}

/** Daftar file src yang tersentuh Shift 2 (committed + working tree) vs baseline. */
function loadShift2Files() {
  try {
    const out = execFileSync("git", ["diff", "--name-only", BASE_COMMIT, "--", "src"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return {
      source: `git diff --name-only ${BASE_COMMIT} -- src`,
      files: new Set(out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)),
      available: true,
    };
  } catch {
    return { source: "git tidak tersedia — deteksi Shift 2 dilewati", files: new Set(), available: false };
  }
}

/** Hitung `any` pada versi file di commit baseline (untuk mendeteksi any BARU). */
function countAnyAtBaseline(relativePath) {
  try {
    const content = execFileSync("git", ["show", `${BASE_COMMIT}:${relativePath}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return countMatches(content, ANY_PATTERN);
  } catch {
    return null;
  }
}

/** Heuristik: cari `const X = [ ... ]` lalu hitung objek literal `{` di dalamnya. */
function findArrayLiterals(content) {
  const arrays = [];
  const declaration = /(?:const|let|var)\s+([A-Za-z0-9_]+)[^=]*=\s*\[/g;
  let match;
  while ((match = declaration.exec(content)) !== null) {
    const startIndex = declaration.lastIndex - 1;
    let depth = 0;
    let endIndex = -1;
    for (let i = startIndex; i < content.length; i += 1) {
      const char = content[i];
      if (char === "[") depth += 1;
      else if (char === "]") {
        depth -= 1;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
    if (endIndex < 0) continue;
    const segment = content.slice(startIndex, endIndex + 1);
    const objects = countMatches(segment, /\{/g);
    if (objects === 0) continue;
    arrays.push({
      name: match[1],
      objects,
      line: content.slice(0, startIndex).split(/\r?\n/).length,
    });
  }
  return arrays;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}

async function main() {
  const startedAt = new Date();
  const files = await walkSource();
  const shift2 = loadShift2Files();

  const lineRows = [];
  const anyRows = [];
  const arrayCandidates = [];
  const duplicationRows = [];
  const heavy = [];
  const warnings = [];

  let useClientPages = 0;
  let totalPages = 0;
  let lucideFiles = 0;
  let lucideNamespace = 0;
  let tsIgnore = 0;
  let newAnyFiles = 0;

  for (const absolute of files) {
    const relativePath = rel(absolute);
    const content = await readFile(absolute, "utf8");
    const lines = countLines(content);

    /* 1) File panjang */
    if (lines > 400) {
      const isLegacy = LEGACY_MONOLITHS.has(relativePath);
      lineRows.push({ path: relativePath, lines, isLegacy, tier: lines > 1000 ? ">1000" : ">400" });
      if (lines > 1000 && !isLegacy) {
        heavy.push({ type: "FILE_BESAR", path: relativePath, detail: `${formatNumber(lines)} baris (>1000) bukan monolit legacy` });
      }
    }

    /* 2) Array hardcoded di halaman/komponen */
    if (/^src\/(app|components)\//.test(relativePath)) {
      for (const array of findArrayLiterals(content)) {
        if (array.objects <= 5) continue;
        const isLegacy = LEGACY_MONOLITHS.has(relativePath);
        const isShift2 = shift2.files.has(relativePath);
        arrayCandidates.push({ path: relativePath, name: array.name, objects: array.objects, line: array.line, isLegacy, isShift2 });
        if (array.objects > 20) {
          if (isShift2) {
            heavy.push({ type: "ARRAY_HARDCODED", path: relativePath, detail: `array "${array.name}" berisi ${array.objects} objek (baris ${array.line}) di file Shift 2` });
          } else {
            warnings.push(
              `[ARRAY] ${relativePath}:${array.line} "${array.name}" punya ${array.objects} objek literal — file legacy/config, kemungkinan config UI (false-positive), bukan data bisnis baru.`
            );
          }
        }
      }
    }

    /* 3) any / ts-ignore */
    const anyCount = countMatches(content, ANY_PATTERN);
    tsIgnore += countMatches(content, /@ts-(ignore|expect-error)/g);
    if (anyCount > 0) {
      anyRows.push({ path: relativePath, any: anyCount });
      if (shift2.available && shift2.files.has(relativePath)) {
        const baseline = countAnyAtBaseline(relativePath);
        if (baseline !== null && anyCount > baseline) {
          newAnyFiles += 1;
          heavy.push({ type: "ANY_BARU", path: relativePath, detail: `any bertambah ${baseline} → ${anyCount} di file Shift 2` });
        }
      }
    }

    /* 4) Duplikasi format di luar src/lib/utils.ts */
    if (relativePath !== "src/lib/utils.ts") {
      const rupiah = countMatches(content, /formatRupiah/g);
      const localeNumber = countMatches(content, /toLocaleString\(\s*["']id-ID["']/g);
      const localeDate = countMatches(content, /toLocaleDateString\(\s*["']id-ID["']|Intl\.DateTimeFormat/g);
      if (rupiah + localeNumber + localeDate > 0) {
        duplicationRows.push({ path: relativePath, rupiah, localeNumber, localeDate });
        warnings.push(
          `[DUPLIKASI] ${relativePath}: formatRupiah=${rupiah}, toLocaleString("id-ID")=${localeNumber}, format tanggal=${localeDate} — seharusnya pakai src/lib/utils.ts.`
        );
      }
    }

    /* 5) Info: "use client" & lucide */
    if (/^src\/app\/.*page\.tsx$/.test(relativePath)) {
      totalPages += 1;
      if (/^\s*["']use client["'];?/m.test(content)) useClientPages += 1;
    }
    if (/from\s+["']lucide-react["']/.test(content)) {
      lucideFiles += 1;
      if (/import\s+\*\s+as\s+/.test(content)) lucideNamespace += 1;
    }
  }

  lineRows.sort((a, b) => b.lines - a.lines);
  arrayCandidates.sort((a, b) => b.objects - a.objects);
  anyRows.sort((a, b) => b.any - a.any);

  const anyTotal = anyRows.reduce((sum, row) => sum + row.any, 0);
  const filesOver1000 = lineRows.filter((row) => row.lines > 1000);
  const filesOver400 = lineRows;

  if (filesOver1000.length > 0) {
    warnings.push(`[FILE] ${filesOver1000.length} file >1000 baris (legacy): ${filesOver1000.map((row) => `${row.path} (${row.lines})`).join(", ")}.`);
  }
  if (filesOver400.length > 0) {
    warnings.push(`[FILE] ${filesOver400.length} file >400 baris; target AI_RULES 150–200 baris per file.`);
  }
  if (anyTotal > 0) {
    warnings.push(`[ANY] ${anyTotal} kemunculan any di ${anyRows.length} file (${newAnyFiles} file Shift 2 bertambah — lihat heavy).`);
  }
  if (tsIgnore > 0) {
    warnings.push(`[TS-IGNORE] ${tsIgnore} directive @ts-ignore/@ts-expect-error.`);
  }
  if (!shift2.available) {
    warnings.push("[SHIFT2] Git tidak tersedia — deteksi 'any baru di file Shift 2' tidak dijalankan (hanya warning).");
  }

  const heavyCount = heavy.length;
  const exitCode = heavyCount > 0 ? 1 : 0;

  /* ---------------- Output terminal ---------------- */
  console.log(`\nMIS SHOP OPS — STATIC RULES AUDIT (AI_RULES.md)\nWaktu     : ${startedAt.toISOString()}\nFile src  : ${files.length}\nShift 2   : ${shift2.available ? `${shift2.files.size} file (${shift2.source})` : "tidak terdeteksi (git unavailable)"}\n`);
  console.log("Top file terpanjang:");
  for (const row of lineRows.slice(0, 10)) {
    console.log(`  ${String(row.lines).padStart(5)} baris  ${row.tier.padEnd(6)}  ${row.path}${row.isLegacy ? "  (legacy)" : ""}`);
  }
  console.log(`\nHeuristik array hardcoded >5 objek: ${arrayCandidates.length} kandidat`);
  for (const row of arrayCandidates.slice(0, 10)) {
    console.log(`  ${String(row.objects).padStart(3)} objek  ${row.path}:${row.line} "${row.name}"${row.isShift2 ? "  (Shift 2)" : ""}${row.isLegacy ? "  (legacy)" : ""}`);
  }
  console.log(`\nany: ${anyTotal} kemunculan di ${anyRows.length} file · @ts-ignore: ${tsIgnore}`);
  console.log(`Duplikasi format di luar utils.ts: ${duplicationRows.length} file`);
  for (const row of duplicationRows) {
    console.log(`  ${row.path} — rupiah=${row.rupiah}, number=${row.localeNumber}, tanggal=${row.localeDate}`);
  }
  console.log(`\nInfo: halaman "use client" ${useClientPages}/${totalPages} · file import lucide-react ${lucideFiles} (namespace import: ${lucideNamespace})`);

  if (heavyCount > 0) {
    console.log("\nPELANGGARAN BERAT:");
    for (const violation of heavy) console.log(`  ❌ [${violation.type}] ${violation.path} — ${violation.detail}`);
  } else {
    console.log("\nTidak ada pelanggaran berat.");
  }
  if (warnings.length > 0) {
    console.log("\nWARNING (tidak menggagalkan audit):");
    for (const warning of warnings.slice(0, 12)) console.log(`  ⚠️  ${warning}`);
    if (warnings.length > 12) console.log(`  … ${warnings.length - 12} warning lainnya (lihat docs/RULES-COMPLIANCE.md)`);
  }
  console.log(`\nHASIL: ${heavyCount} pelanggaran berat · ${warnings.length} warning · exit ${exitCode}`);
  console.log("Laporan: docs/RULES-COMPLIANCE.md\n");

  /* ---------------- Tulis docs/RULES-COMPLIANCE.md ---------------- */
  const table = (headers, rows) => {
    if (rows.length === 0) return "_Tidak ada._\n";
    return [
      `| ${headers.join(" | ")} |`,
      `|${headers.map(() => "---").join("|")}|`,
      ...rows.map((row) => `| ${row.join(" | ")} |`),
      "",
    ].join("\n");
  };

  const doc = `# RULES COMPLIANCE — Audit Statis AI_RULES.md

> Dibuat otomatis oleh \`tests/static-rules.mjs\` (read-only, tanpa dependency baru)
> Waktu: ${startedAt.toISOString()} · Baseline Shift 2: \`${BASE_COMMIT}\` · File src: ${files.length}
> **Exit code:** ${exitCode} (${heavyCount} pelanggaran berat · ${warnings.length} warning)

## Ringkasan

| Kategori | Hasil | Status |
|---|---|---|
| File >1000 baris | ${filesOver1000.length} file (semua legacy) | ⚠️ WARNING |
| File >400 baris | ${filesOver400.length} file | ⚠️ WARNING |
| Array hardcoded >5 objek (kandidat) | ${arrayCandidates.length} kandidat | ⚠️ WARNING / tinjau manual |
| Penggunaan \`any\` | ${anyTotal} kemunculan di ${anyRows.length} file | ⚠️ WARNING |
| \`@ts-ignore\` / \`@ts-expect-error\` | ${tsIgnore} | ${tsIgnore === 0 ? "✅ tidak ada" : "⚠️ WARNING"} |
| Duplikasi format di luar utils.ts | ${duplicationRows.length} file | ⚠️ WARNING |
| \`"use client"\` halaman | ${useClientPages}/${totalPages} | ℹ️ INFO |
| Import lucide-react | ${lucideFiles} file (namespace: ${lucideNamespace}) | ℹ️ INFO |
| **Pelanggaran berat** | **${heavyCount}** | **${heavyCount === 0 ? "✅ LULUS" : "❌ GAGAL"}** |

## 1. File sumber panjang (target AI_RULES: 150–200 baris)

${table(["Baris", "Tier", "File", "Legacy?"], lineRows.map((row) => [formatNumber(row.lines), row.tier, `\`${row.path}\``, row.isLegacy ? "ya" : "**tidak**"]))}
> Semua file >1000 baris saat ini adalah monolit **legacy** yang sudah tercatat di
> \`docs/ANALISIS-PROYEK.md\` (F4/F5), jadi tidak dihitung pelanggaran berat. File baru >1000 baris
> akan menggagalkan audit.

## 2. Heuristik array data hardcoded (src/app & src/components)

${table(["Objek", "File", "Variabel", "Baris", "Shift 2?", "Catatan"], arrayCandidates.map((row) => [row.objects, `\`${row.path}\``, row.name, row.line, row.isShift2 ? "ya" : "tidak", row.objects > 20 ? "tinjau manual — config/legacy, kemungkinan false-positive" : "kandidat"]))}
> Heuristik menghitung objek literal \`{\` di dalam array. Array >20 objek di file **Shift 2** =
> pelanggaran berat; array legacy/config dilaporkan sebagai warning karena bisa berupa konfigurasi UI
> (nav, opsi barcode), bukan data bisnis.

## 3. Penggunaan \`any\` & directive TS

${table(["File", "Jumlah any"], anyRows.map((row) => [`\`${row.path}\``, row.any]))}
- Total \`any\`: **${anyTotal}** di ${anyRows.length} file.
- File Shift 2 yang \`any\`-nya **bertambah** vs baseline: **${newAnyFiles}** (${newAnyFiles === 0 ? "tidak ada pelanggaran berat" : "PELANGGARAN BERAT"}).
- \`@ts-ignore\`/\`@ts-expect-error\`: **${tsIgnore}**.

## 4. Duplikasi format di luar \`src/lib/utils.ts\`

${table(["File", "formatRupiah", "toLocaleString(id-ID)", "Format tanggal"], duplicationRows.map((row) => [`\`${row.path}\``, row.rupiah, row.localeNumber, row.localeDate]))}
> Target AI_RULES: format rupiah/tanggal/badge wajib lewat \`src/lib/utils.ts\`. Temuan ini
> **warning** (belum diperbaiki) — lihat BUGS F6.

## 5. Info: "use client" & lucide-react

- Halaman \`"use client"\`: **${useClientPages}/${totalPages}** halaman \`src/app/**/page.tsx\`.
- File yang meng-import \`lucide-react\`: **${lucideFiles}**; import namespace (\`import * as\`): **${lucideNamespace}**.
  Import per-ikon (named) adalah pola yang dipakai; info saja.

## Pelanggaran berat (exit non-zero)

${heavyCount === 0 ? "_Tidak ada._\n" : heavy.map((v) => `- ❌ [${v.type}] \`${v.path}\` — ${v.detail}`).join("\n") + "\n"}

## Warning (tidak menggagalkan audit)

${warnings.map((warning) => `- ⚠️ ${warning}`).join("\n") || "_Tidak ada._"}

## Metode & batasan

- Scan read-only \`src/**/*.ts{,x}\`; hanya menulis file laporan ini.
- File Shift 2 dideteksi via \`git diff --name-only ${BASE_COMMIT} -- src\` (read-only). Bila git tidak
  tersedia, deteksi "any baru" dilewati dan dilaporkan sebagai warning.
- Heuristik array/`+`\`any\` memakai regex sederhana — bisa false-positive (config UI, tipe library).
- File legacy pada daftar \`LEGACY_MONOLITHS\` (dari ANALISIS-PROYEK F4/F5) dikecualikan dari
  pelanggaran berat file >1000 baris.

## Cara menjalankan

\`\`\`powershell
cd "C:\\Users\\Lenovo\\Documents\\Project Coding\\MIS SHOP OPS"
node tests/static-rules.mjs
\`\`\`

Exit code 0 = tidak ada pelanggaran berat; 1 = ada (lihat bagian pelanggaran berat).
`;

  await writeFile(DOC_PATH, doc, "utf8");
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`\nFATAL static-rules: ${error?.stack || error}`);
  process.exitCode = 1;
});
