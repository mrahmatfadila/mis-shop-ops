/**
 * Unit test pure function src/lib/utils.ts (task-6).
 *
 * Menjalankan type-stripping bawaan Node (tanpa dependency baru):
 *   node --experimental-strip-types --test tests/lib.test.mjs
 *
 * Catatan locale: Intl id-ID memakai non-breaking space (U+00A0) pada mata
 * uang, jadi hasil dirapikan lewat helper `plain()` sebelum dibandingkan.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  cn,
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  statusBadgeClass,
  urgencyBadgeClass,
  divisionBadgeClass,
  safeText,
} from "../src/lib/utils.ts";

const plain = (value) => String(value).replace(/\u00a0/g, " ");

describe("cn()", () => {
  it("menggabungkan className dasar", () => {
    assert.equal(cn("px-2", "py-1"), "px-2 py-1");
  });

  it("mengabaikan nilai conditional false / null / undefined", () => {
    assert.equal(cn("base", false && "hidden", null, undefined, true && "block"), "base block");
  });

  it("mendukung array dan object clsx", () => {
    assert.equal(cn(["a", "b"], { c: true, d: false }), "a b c");
  });

  it("menggabungkan kelas Tailwind yang konflik (twMerge)", () => {
    assert.equal(cn("px-2", "px-4"), "px-4");
    assert.equal(cn("text-red-500", "text-emerald-700"), "text-emerald-700");
  });

  it("menerima tanpa argumen", () => {
    assert.equal(cn(), "");
  });
});

describe("formatRupiah()", () => {
  it("memformat angka umum tanpa desimal", () => {
    assert.equal(plain(formatRupiah(0)), "Rp 0");
    assert.equal(plain(formatRupiah(1500)), "Rp 1.500");
    assert.equal(plain(formatRupiah(1234567.89)), "Rp 1.234.568");
  });

  it("memformat nilai negatif", () => {
    assert.equal(plain(formatRupiah(-25000)), "-Rp 25.000");
  });

  it("fallback aman untuk null / undefined / NaN / string bukan angka", () => {
    for (const value of [null, undefined, NaN, Infinity, "", "bukan-angka"]) {
      const result = plain(formatRupiah(value));
      assert.equal(result, "Rp 0", `input ${String(value)} → ${result}`);
      assert.ok(!result.includes("NaN"), "tidak boleh menghasilkan Rp NaN");
    }
  });

  it("menerima angka dalam bentuk string", () => {
    assert.equal(plain(formatRupiah("1500")), "Rp 1.500");
  });
});

describe("formatNumber()", () => {
  it("memformat ribuan locale Indonesia", () => {
    assert.equal(formatNumber(0), "0");
    assert.equal(formatNumber(1500), "1.500");
    assert.equal(formatNumber(1234567), "1.234.567");
    assert.equal(formatNumber(-1500), "-1.500");
  });

  it("fallback aman untuk input tidak valid", () => {
    for (const value of [null, undefined, NaN, "", "abc"]) {
      assert.equal(formatNumber(value), "0", `input ${String(value)}`);
    }
  });
});

describe("formatDate()", () => {
  it("memformat tanggal valid (format panjang Indonesia)", () => {
    assert.equal(formatDate(new Date(2026, 9, 30)), "30 Oktober 2026");
    assert.equal(formatDate("2026-10-30T12:00:00"), "30 Oktober 2026");
    assert.equal(formatDate(new Date("2026-01-05T12:00:00")), "5 Januari 2026");
  });

  it("fallback '-' untuk input kosong / invalid", () => {
    for (const value of [null, undefined, "", "bukan-tanggal", new Date("invalid")]) {
      assert.equal(formatDate(value), "-", `input ${String(value)}`);
    }
  });
});

describe("formatDateTime()", () => {
  it("memformat tanggal + jam", () => {
    assert.equal(formatDateTime(new Date(2026, 9, 30, 14, 5)), "30 Okt 2026, 14.05");
    assert.equal(formatDateTime("2026-10-30T09:00:00"), "30 Okt 2026, 09.00");
  });

  it("fallback '-' untuk input kosong / invalid", () => {
    for (const value of [null, undefined, "", "bukan-tanggal", new Date("invalid")]) {
      assert.equal(formatDateTime(value), "-", `input ${String(value)}`);
    }
  });
});

describe("statusBadgeClass()", () => {
  const emerald = ["OPERASIONAL", "AKTIF", "SELESAI", "ONLINE"];
  const amber = ["MENUNGGU", "PENDING", "PERBAIKAN", "STANDBY", "WARNING"];
  const rose = ["RUSAK", "DARURAT", "OFFLINE"];

  it("status normal/aktif → emerald", () => {
    for (const status of emerald) {
      const result = statusBadgeClass(status);
      assert.ok(result.length > 0, status);
      assert.match(result, /emerald/, status);
    }
  });

  it("status menunggu/proses → amber", () => {
    for (const status of amber) {
      const result = statusBadgeClass(status);
      assert.ok(result.length > 0, status);
      assert.match(result, /amber/, status);
    }
  });

  it("status rusak/darurat → rose", () => {
    for (const status of rose) {
      const result = statusBadgeClass(status);
      assert.ok(result.length > 0, status);
      assert.match(result, /rose/, status);
    }
  });

  it("DIPROSES → blue", () => {
    assert.match(statusBadgeClass("DIPROSES"), /blue/);
  });

  it("normalisasi huruf kecil, spasi, dan fallback status tak dikenal", () => {
    assert.match(statusBadgeClass("  operasional  "), /emerald/);
    assert.match(statusBadgeClass("rusak"), /rose/);
    for (const value of ["STATUS_NGARANG", "", null, undefined]) {
      const result = statusBadgeClass(value);
      assert.ok(result.length > 0, String(value));
      assert.match(result, /slate/, String(value));
    }
  });

  it("semua status mengembalikan string non-empty berisi border", () => {
    for (const status of [...emerald, ...amber, ...rose, "DIPROSES", "TIDAK_DIKENAL"]) {
      assert.match(statusBadgeClass(status), /border/);
    }
  });

  it("CADANGAN / DIBATALKAN memakai fallback netral yang aman", () => {
    for (const status of ["CADANGAN", "DIBATALKAN"]) {
      const result = statusBadgeClass(status);
      assert.ok(result.length > 0, status);
      assert.match(result, /slate/, status);
    }
  });
});

describe("urgencyBadgeClass()", () => {
  it("setiap tingkat urgensi punya kelas non-empty", () => {
    const expected = {
      DARURAT: /rose/,
      TINGGI: /amber/,
      SEDANG: /blue/,
      RENDAH: /slate/,
    };
    for (const [urgency, pattern] of Object.entries(expected)) {
      const result = urgencyBadgeClass(urgency);
      assert.ok(result.length > 0, urgency);
      assert.match(result, pattern, urgency);
    }
  });

  it("normalisasi huruf kecil + fallback aman", () => {
    assert.match(urgencyBadgeClass("darurat"), /rose/);
    for (const value of ["URGENSI_NGARANG", "", null, undefined]) {
      const result = urgencyBadgeClass(value);
      assert.ok(result.length > 0, String(value));
      assert.match(result, /slate/, String(value));
    }
  });
});

describe("divisionBadgeClass() (bonus, di luar 8 fungsi wajib)", () => {
  it("divisi dikenal punya warna berbeda / non-empty", () => {
    const divisions = ["ACC", "BOD", "FIN", "GS", "MCD", "MIS", "WHS", "HRD", "FACILITY"];
    const seen = new Set();
    for (const division of divisions) {
      const result = divisionBadgeClass(division);
      assert.ok(result.length > 0, division);
      seen.add(result);
    }
    assert.equal(seen.size, divisions.length, "setiap divisi harus punya kelas unik");
  });

  it("fallback slate untuk null / tak dikenal", () => {
    assert.match(divisionBadgeClass("DIVISI_NGARANG"), /slate/);
    assert.match(divisionBadgeClass(null), /slate/);
    assert.match(divisionBadgeClass(undefined), /slate/);
  });
});

describe("safeText()", () => {
  it("mengembalikan string apa adanya (di-trim)", () => {
    assert.equal(safeText("halo"), "halo");
    assert.equal(safeText("  halo  "), "halo");
  });

  it("fallback '-' untuk null / undefined / string kosong", () => {
    for (const value of [null, undefined, "", "   "]) {
      assert.equal(safeText(value), "-", String(value));
    }
  });

  it("menerima angka termasuk 0", () => {
    assert.equal(safeText(0), "0");
    assert.equal(safeText(123), "123");
    assert.equal(safeText(-5), "-5");
  });
});
