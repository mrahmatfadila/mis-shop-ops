"use client";

// In-memory client cache for lightning-fast page transitions (< 1ms)
const cacheStore = new Map<string, { data: any; timestamp: number }>();

export function getClientCache<T = any>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const entry = cacheStore.get(key);
  if (!entry) return null;
  // Valid for 2 minutes by default
  if (Date.now() - entry.timestamp > 120000) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setClientCache(key: string, data: any) {
  if (typeof window === "undefined") return;
  cacheStore.set(key, { data, timestamp: Date.now() });
}

export function clearClientCache(prefix?: string) {
  if (typeof window === "undefined") return;
  if (!prefix) {
    cacheStore.clear();
  } else {
    cacheStore.forEach((_, k) => {
      if (k.startsWith(prefix)) {
        cacheStore.delete(k);
      }
    });
  }
}
