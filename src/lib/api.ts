import { NextResponse } from "next/server";

/**
 * Helper respons API standar MIS SHOP OPS.
 *
 * KONTRAK RESPONS (JANGAN DIUBAH — dipakai semua klien lama):
 * - sukses dengan data   : { success: true, data }
 * - sukses dengan pesan  : { success: true, message } (dibuat inline di route)
 * - gagal                : { success: false, message }
 *
 * Pemakaian:
 *   return ok(rows);
 *   return fail("...", 400);
 *   return jsonError(error, "Gagal mengambil data");
 */

/** Bungkus data sukses menjadi `{ success: true, data }`. */
export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

/** Respons gagal dengan pesan yang sudah ramah ke klien. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Respons error 500. Mengambil `error.message` bila ada, fallback opsional
 * dipertahankan agar pesan route yang sudah dipakai klien tetap identik.
 */
export function jsonError(error: unknown, fallback?: string, status = 500) {
  const raw =
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : undefined;
  const message = (typeof raw === "string" && raw) || fallback;
  return NextResponse.json({ success: false, message }, { status });
}

export interface ParseFiltersOptions<K extends string> {
  /** Nama query param yang boleh dibaca. */
  allowed: readonly K[];
  /** Nilai "tampilkan semua" yang berlaku untuk semua param (mis. "ALL"). */
  ignore?: readonly string[];
  /** Nilai "tampilkan semua" yang hanya berlaku untuk param tertentu. */
  ignoreByKey?: Partial<Record<K, readonly string[]>>;
}

/**
 * Baca query param filter sekaligus menormalkan sentinel "Semua X"/"ALL".
 * Nilai sentinel dikembalikan sebagai string kosong sehingga route cukup
 * memakai `if (value) { ... }` — perilaku filter tetap sama seperti kode lama.
 */
export function parseFilters<K extends string>(
  searchParams: URLSearchParams,
  options: ParseFiltersOptions<K>
): Record<K, string> {
  const { allowed, ignore = [], ignoreByKey = {} } = options;
  const result = {} as Record<K, string>;

  for (const key of allowed) {
    const value = searchParams.get(key) ?? "";
    const sentinels = ignoreByKey[key]
      ? [...ignore, ...ignoreByKey[key]]
      : ignore;
    result[key] = value && !sentinels.includes(value) ? value : "";
  }

  return result;
}

/**
 * Cek field wajib pada body request. Empty string, null, undefined, 0, dan
 * false dianggap tidak ada — sama persis dengan validasi `!value` di route lama.
 */
export function requireFields(
  body: unknown,
  fields: readonly string[]
): { missing: string[] } {
  const source = (body ?? {}) as Record<string, unknown>;
  return { missing: fields.filter((field) => !source[field]) };
}
