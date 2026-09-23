import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api/client';

interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseApiResourceOptions {
  /** When set, silently re-fetches on this interval while the hook is mounted. */
  pollMs?: number;
}

/** Generic Screen → Hook → Service → API data fetcher with retry. Keeps prior data on error. */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiResourceOptions = {},
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cancelRef = useRef<(() => void) | null>(null);
  const { pollMs } = options;

  const run = useCallback((silent = false) => {
    cancelRef.current?.();
    let cancelled = false;
    cancelRef.current = () => {
      cancelled = true;
    };

    if (!silent || !hasData.current) setLoading(true);
    setError(null);
    fetcherRef.current()
      .then(res => {
        if (!cancelled) {
          hasData.current = true;
          setData(res);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          // Keep previous `data` so screens can continue showing last good payload.
          setError(e instanceof ApiError ? e.message : 'Something went wrong');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  useEffect(() => {
    run(false);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  useEffect(() => {
    if (!pollMs || pollMs < 1000) return undefined;
    const id = setInterval(() => run(true), pollMs);
    return () => clearInterval(id);
  }, [pollMs, run]);

  const refetch = useCallback(() => {
    run(false);
  }, [run]);

  return { data, loading, error, refetch };
}
