import { config, ensureReachableApiHost, HostUnreachableError } from '../../constants/config';
import { storageService } from '../storage/storageService';
import type { PaginationMeta } from '../../types/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
    public appCode?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  /** When true, skip JSON Content-Type (multipart uploads). */
  formData?: boolean;
  /** Internal: do not attempt token refresh / unauthorized logout on 401. */
  skipAuthRecovery?: boolean;
  /** Override the default API timeout (ms). */
  timeoutMs?: number;
  /** Internal: already tried another API host after a network failure. */
  skipHostFailover?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta | null;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  let url = `${base}${pathPart}`;
  if (query) {
    const params: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    if (params.length) url += `?${params.join('&')}`;
  }
  return url;
}

function extractAppCode(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const p = parsed as { appCode?: unknown; error?: { appCode?: unknown } };
  if (typeof p.error?.appCode === 'string') return p.error.appCode;
  if (typeof p.appCode === 'string') return p.appCode;
  return undefined;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (!!error &&
      typeof error === 'object' &&
      (error as ApiError).name === 'ApiError' &&
      typeof (error as ApiError).status === 'number')
  );
}

function extractMessage(parsed: unknown, fallback: string): string {
  if (!parsed || typeof parsed !== 'object') return fallback;
  const p = parsed as {
    message?: string;
    error?: { message?: string; detail?: string; appCode?: string; details?: unknown };
  };
  const details = p.error?.details;
  if (Array.isArray(details) && details.length) {
    const msgs = details
      .map(d => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object' && 'message' in d) return String((d as { message: string }).message);
        return null;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join(' · ');
  }
  return p.error?.detail || p.error?.message || p.message || fallback;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

let refreshInFlight: Promise<boolean> | null = null;

/** POST /auth/refresh — rotates JWT; returns true when a new token was stored. */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const existing = await storageService.get<string>('token');
    if (!existing) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.apiTimeoutMs);
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Selorg-Client': 'picker',
          Authorization: `Bearer ${existing}`,
        },
        signal: controller.signal,
      });
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok || !parsed?.success) return false;
      const token = parsed?.data?.token;
      if (typeof token !== 'string' || !token) return false;
      await storageService.set('token', token);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Thin fetch wrapper: base URL, JSON, bearer token, timeout, unified errors.
 * Unwraps `{ success, data, pagination }` envelopes.
 * On 401, tries POST /auth/refresh once then retries the original request.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, auth = true, headers, formData, skipAuthRecovery, timeoutMs, skipHostFailover, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? config.apiTimeoutMs);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    'X-Selorg-Client': 'picker',
    ...(headers as Record<string, string>),
  };
  if (!formData) finalHeaders['Content-Type'] = 'application/json';

  if (auth) {
    const token = await storageService.get<string>('token');
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(buildUrl(path, query), {
      ...rest,
      method: rest.method || 'GET',
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : formData
            ? (body as Blob | FormData | string)
            : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { message: text };
      }
    }

    if (!res.ok) {
      const msg = extractMessage(parsed, `HTTP ${res.status}`);

      if (res.status === 401 && auth && !skipAuthRecovery) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return request<T>(path, { ...options, skipAuthRecovery: true });
        }
        if (onUnauthorized) onUnauthorized();
      } else if (res.status === 401 && onUnauthorized && !skipAuthRecovery) {
        onUnauthorized();
      }

      throw new ApiError(res.status, msg, parsed, extractAppCode(parsed));
    }

    if (parsed && typeof parsed === 'object' && 'success' in parsed) {
      const envelope = parsed as {
        success: boolean;
        message?: string;
        data?: T;
        pagination?: PaginationMeta | null;
      };
      if (!envelope.success) {
        throw new ApiError(
          res.status,
          envelope.message || 'Request failed',
          parsed,
          extractAppCode(parsed),
        );
      }
      return (envelope.data ?? parsed) as T;
    }
    return parsed as T;
  } catch (err) {
    if (isApiError(err)) throw err;
    if (err instanceof HostUnreachableError) {
      throw new ApiError(0, err.message, undefined, 'NETWORK_UNAVAILABLE');
    }
    const name = (err as Error)?.name;
    const message = String((err as Error)?.message || '');
    const timedOut =
      name === 'AbortError' || controller.signal.aborted || /aborted|timed out/i.test(message);

    // Timeouts are not host-failover cases — retrying OTP would wait another full
    // timeout window and can double-send SMS/email. Fail fast with TIMEOUT.
    if (timedOut) {
      throw new ApiError(0, 'Request timed out. Please try again.', undefined, 'TIMEOUT');
    }

    // Stale adb-reverse / OkHttp sockets often fail the first POST even though
    // GET /health on the same host succeeds. Retry once on a reachable host.
    if (!skipHostFailover) {
      try {
        await ensureReachableApiHost();
      } catch (hostErr) {
        if (hostErr instanceof HostUnreachableError) {
          throw new ApiError(0, hostErr.message, undefined, 'NETWORK_UNAVAILABLE');
        }
        throw hostErr;
      }
      return request<T>(path, { ...options, skipHostFailover: true });
    }
    throw new ApiError(0, 'Network unavailable.', undefined, 'NETWORK_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

/** Same as request but keeps pagination meta for list endpoints. */
export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<PaginatedResult<T>> {
  const { body, query, auth = true, headers, skipAuthRecovery, timeoutMs, skipHostFailover: _skipHostFailover, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? config.apiTimeoutMs);
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Selorg-Client': 'picker',
    ...(headers as Record<string, string>),
  };
  if (auth) {
    const token = await storageService.get<string>('token');
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) {
      if (res.status === 401 && auth && !skipAuthRecovery) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return requestPaginated<T>(path, { ...options, skipAuthRecovery: true });
        }
        if (onUnauthorized) onUnauthorized();
      }
      throw new ApiError(res.status, extractMessage(parsed, `HTTP ${res.status}`), parsed);
    }
    if (parsed && typeof parsed === 'object' && 'success' in parsed) {
      if (!parsed.success) throw new ApiError(res.status, parsed.message || 'Request failed', parsed);
      const items = Array.isArray(parsed.data) ? (parsed.data as T[]) : [];
      return { items, pagination: parsed.pagination ?? null };
    }
    return { items: Array.isArray(parsed) ? parsed : [], pagination: null };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const name = (err as Error)?.name;
    const message = String((err as Error)?.message || '');
    if (name === 'AbortError' || controller.signal.aborted || /aborted|timed out/i.test(message)) {
      throw new ApiError(0, 'Request timed out. Please try again.', undefined, 'TIMEOUT');
    }
    throw new ApiError(0, 'Network unavailable.', undefined, 'NETWORK_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve a mock payload after a small delay so loading states are exercised. */
export function mockResponse<T>(data: T, delayMs = 350): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), delayMs));
}
