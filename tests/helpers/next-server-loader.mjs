// Loader ESM kecil: arahkan import "next/server" ke stub lokal agar
// src/lib/api.ts bisa di-import di Node murni dengan --experimental-strip-types
// (paket `next` tidak mengekspos subpath "next/server" untuk Node langsung).
const STUB_URL = new URL("./next-server-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return { url: STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
