"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/cache";

export interface UseApiDataOptions<T> {
  /** Kunci cache in-memory; default: URL. */
  cacheKey?: string;
  /** Nonaktifkan fetch otomatis (mis. menunggu filter siap). */
  enabled?: boolean;
  /** Ubah payload JSON mentah menjadi bentuk yang dipakai komponen. */
  transform?: (json: unknown) => T;
}

export interface UseApiDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch data GET dari API route internal dengan stale-while-revalidate:
 * cache tampil instan, lalu request jaringan menyegarkan data.
 * AbortController dipakai agar request lama dibatalkan saat filter berubah/unmount.
 */
export function useApiData<T>(
  url: string,
  options: UseApiDataOptions<T> = {}
): UseApiDataResult<T> {
  const { cacheKey = url, enabled = true, transform } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const cached = getClientCache<T>(cacheKey);
    if (cached !== null) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Gagal memuat data (HTTP ${res.status})`);
        }
        const json: unknown = await res.json();
        if (controller.signal.aborted) return;

        const payload = transformRef.current
          ? transformRef.current(json)
          : (json as T);

        setData(payload);
        setClientCache(cacheKey, payload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [url, cacheKey, enabled, revision]);

  return { data, isLoading, error, refresh };
}
