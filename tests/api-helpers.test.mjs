/**
 * Unit test helper API murni `src/lib/api.ts` (task-14).
 *
 * `src/lib/api.ts` meng-import `next/server`, yang tidak bisa di-resolve Node
 * murni (paket `next` tidak mengekspos subpath tersebut untuk konsumen Node).
 * Solusi aman tanpa mengubah src: register loader kecil yang memetakan
 * "next/server" ke stub lokal `tests/helpers/next-server-stub.mjs`.
 * Test tetap dijalankan dengan type-stripping bawaan Node:
 *
 *   node --experimental-strip-types --test tests/api-helpers.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/next-server-loader.mjs", import.meta.url);

const api = await import("../src/lib/api.ts");
const { ok, fail, jsonError, parseFilters, requireFields } = api;

describe("parseFilters()", () => {
  it("membaca hanya param yang diizinkan", () => {
    const params = new URLSearchParams("search=printer&status=OPERASIONAL&evil=1");
    const result = parseFilters(params, { allowed: ["search", "status"] });
    assert.deepEqual(result, { search: "printer", status: "OPERASIONAL" });
    assert.ok(!("evil" in result));
  });

  it("mengembalikan string kosong untuk param yang tidak ada", () => {
    const result = parseFilters(new URLSearchParams(""), {
      allowed: ["search", "category"],
    });
    assert.deepEqual(result, { search: "", category: "" });
  });

  it('menormalkan sentinel global "ALL" menjadi string kosong', () => {
    const result = parseFilters(new URLSearchParams("status=ALL&shop=Semua Toko&q=ALL"), {
      allowed: ["status", "shop"],
      ignore: ["ALL"],
    });
    assert.deepEqual(result, { status: "", shop: "Semua Toko" });
  });

  it('menormalkan sentinel per-key (mis. "Semua Kategori")', () => {
    const result = parseFilters(
      new URLSearchParams("category=Semua Kategori&shop=Semua Toko&status=Semua"),
      {
        allowed: ["category", "shop", "status"],
        ignore: ["ALL"],
        ignoreByKey: {
          category: ["Semua Kategori", "Semua"],
          shop: ["Semua Toko", "Semua"],
          status: ["Semua Status", "Semua"],
        },
      }
    );
    assert.deepEqual(result, { category: "", shop: "", status: "" });
  });

  it("mempertahankan nilai asli (tidak trim/case-fold)", () => {
    const result = parseFilters(new URLSearchParams("search=%20Printer%20"), {
      allowed: ["search"],
    });
    assert.equal(result.search, " Printer ");
  });
});

describe("requireFields()", () => {
  it("mengembalikan daftar field yang hilang", () => {
    const { missing } = requireFields({ nama: "PC", serial: "SN1" }, ["nama", "serial", "kode"]);
    assert.deepEqual(missing, ["kode"]);
  });

  it("field kosong/null/undefined/0/false dianggap tidak ada", () => {
    const { missing } = requireFields(
      { a: "", b: null, c: undefined, d: 0, e: false, f: "ok" },
      ["a", "b", "c", "d", "e", "f"]
    );
    assert.deepEqual(missing, ["a", "b", "c", "d", "e"]);
  });

  it("body null / bukan object tidak melempar error", () => {
    assert.deepEqual(requireFields(null, ["x"]).missing, ["x"]);
    assert.deepEqual(requireFields(undefined, ["x"]).missing, ["x"]);
    assert.deepEqual(requireFields("bukan-object", ["x"]).missing, ["x"]);
  });

  it("mengabaikan field tambahan yang tidak diminta", () => {
    const { missing } = requireFields({ extra: 1 }, ["x"]);
    assert.deepEqual(missing, ["x"]);
  });
});

describe("ok() / fail() / jsonError()", () => {
  it("ok(data) → { success:true, data } status 200", () => {
    const response = ok([{ id: 1 }]);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, data: [{ id: 1 }] });
  });

  it("ok(data, init) meneruskan status kustom", () => {
    const response = ok({ a: 1 }, { status: 201 });
    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
  });

  it("fail(message) default 400 + success false", () => {
    const response = fail("Wajib diisi");
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { success: false, message: "Wajib diisi" });
  });

  it("fail(message, status) memakai status kustom", () => {
    const response = fail("Tidak berwenang", 403);
    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
  });

  it("jsonError(Error) → status 500 + message dari error", () => {
    const response = jsonError(new Error("DB down"));
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { success: false, message: "DB down" });
  });

  it("jsonError memakai fallback bila error tanpa message", () => {
    const response = jsonError({}, "Gagal memuat data");
    assert.equal(response.body.message, "Gagal memuat data");
    assert.equal(response.status, 500);
  });

  it("jsonError mendukung status kustom", () => {
    const response = jsonError(new Error("Bad input"), "fallback", 422);
    assert.equal(response.status, 422);
    assert.equal(response.body.message, "Bad input");
  });
});
