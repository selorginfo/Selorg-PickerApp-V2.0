import { NativeModules, Platform } from 'react-native';

/**
 * Dev API host:
 * Android emulator → 10.0.2.2 (host loopback).
 * Physical Android → Metro LAN IP, then DEV_API_HOST / LAN fallback.
 * Never pin a stale Wi‑Fi IP as the only target — that is what produced
 * "Network unavailable" when Send OTP never reached selorg-service.
 *
 * Set EXPO_PUBLIC_DEV_API_HOST (or DEV_API_HOST) to your PC's current LAN IP
 * when testing on a physical phone (ipconfig → IPv4).
 */
const LAN_FALLBACK_HOST = '192.168.0.9';

function readEnv(name: string): string {
  try {
    const env =
      (typeof globalThis !== 'undefined' &&
        (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) ||
      {};
    const value = env[name];
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

const envHost = readEnv('EXPO_PUBLIC_DEV_API_HOST') || readEnv('DEV_API_HOST');
const envPort = readEnv('EXPO_PUBLIC_DEV_API_PORT') || readEnv('DEV_API_PORT');

export const DEV_API_PORT = envPort || '3333';

function getMetroHost(): string {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) return '';
    const ipv6 = scriptURL.match(/^https?:\/\/\[([^\]]+)\]/i);
    if (ipv6?.[1]) {
      return ipv6[1].toLowerCase() === '::1' ? '127.0.0.1' : ipv6[1];
    }
    const match = scriptURL.match(/^https?:\/\/([^/:?#]+)/i);
    return (match?.[1] || '').trim();
  } catch {
    return '';
  }
}

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
}

function isEmulatorOnlyHost(host: string): boolean {
  return host === '10.0.2.2' || host === '10.0.3.2';
}

function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  const fromNative = (NativeModules.PlatformConstants || {}) as Record<string, string>;
  const fromPlatform =
    ((Platform as unknown as { constants?: Record<string, string> }).constants || {});
  const constants = { ...fromNative, ...fromPlatform };
  const blob = `${constants.Fingerprint || ''} ${constants.Model || ''} ${constants.Brand || ''} ${constants.Manufacturer || ''}`.toLowerCase();
  return (
    blob.includes('generic') ||
    blob.includes('emulator') ||
    blob.includes('sdk_gphone') ||
    blob.includes('goldfish') ||
    blob.includes('ranchu')
  );
}

function pushUnique(list: string[], host?: string): void {
  const value = (host || '').trim();
  if (!value || list.includes(value)) return;
  list.push(value);
}

/** Ordered hosts to try until GET /health succeeds. */
export function getApiHostCandidates(): string[] {
  const metroHost = getMetroHost();
  const hosts: string[] = [];

  if (envHost) pushUnique(hosts, envHost);

  if (Platform.OS === 'android') {
    const emulator = isAndroidEmulator() || isEmulatorOnlyHost(metroHost);
    if (emulator) {
      pushUnique(hosts, metroHost === '10.0.3.2' ? '10.0.3.2' : '10.0.2.2');
      pushUnique(hosts, '127.0.0.1');
    } else {
      // Physical: use the same LAN host Metro already loaded JS from.
      // 127.0.0.1 only works while `adb reverse` is alive — wireless ADB drops
      // that tunnel on reconnect, which produced the Home error card.
      if (metroHost && !isLoopbackHost(metroHost) && !isEmulatorOnlyHost(metroHost)) {
        pushUnique(hosts, metroHost);
      }
      pushUnique(hosts, LAN_FALLBACK_HOST);
      pushUnique(hosts, '127.0.0.1');
    }
  } else {
    pushUnique(hosts, 'localhost');
    pushUnique(hosts, '127.0.0.1');
    if (metroHost && !isLoopbackHost(metroHost)) pushUnique(hosts, metroHost);
  }

  return hosts;
}

let activeHost: string | null = null;

export function getActiveApiHost(): string {
  if (!activeHost) activeHost = getApiHostCandidates()[0] || '127.0.0.1';
  return activeHost;
}

export function pinApiHost(host: string): void {
  activeHost = host;
}

export function apiOriginFor(host: string): string {
  return `http://${host}:${DEV_API_PORT}`;
}

async function probeHost(host: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${apiOriginFor(host)}/health`, { method: 'GET', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown when no candidate API host answers GET /health. */
export class HostUnreachableError extends Error {
  readonly appCode = 'NETWORK_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'HostUnreachableError';
  }
}

/** Probe candidates and pin the first host that answers. Safe to call on every Send OTP.
 *  Throws HostUnreachableError when no host answers — avoids a long silent hang on device.
 */
export async function ensureReachableApiHost(): Promise<string> {
  const current = getActiveApiHost();
  const ordered = [current, ...getApiHostCandidates().filter(h => h !== current)];
  for (const host of ordered) {
    if (await probeHost(host)) {
      pinApiHost(host);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SelorgPicker] API host:', host, 'base:', `http://${host}:${DEV_API_PORT}/api/v1/picker`);
      }
      return host;
    }
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[SelorgPicker] No API host reachable. Tried:', ordered.join(', '));
  }
  throw new HostUnreachableError(
    `Cannot reach the API (${ordered.join(', ')}). Check Wi‑Fi, that selorg-service is running on port ${DEV_API_PORT}, and set EXPO_PUBLIC_DEV_API_HOST to your PC LAN IP.`,
  );
}

/** App-wide configuration. `apiBaseUrl` follows the host pinned by `ensureReachableApiHost`. */
export const config = {
  appVersion: 'Selorg Picker v2.4.1 (build 241)',
  get apiBaseUrl() {
    return `http://${getActiveApiHost()}:${DEV_API_PORT}/api/v1/picker`;
  },
  apiTimeoutMs: 15000,
  /** Longer budget for OTP send (SMTP/SMS) — still under a snappy UX ceiling. */
  otpRequestTimeoutMs: 20000,
  USE_MOCKS: false,
  USE_DUMMY_SHIFT: false,
  /** __DEV__ only: treat submitted applications as Verified so Status can continue. */
  DEV_AUTO_VERIFY: typeof __DEV__ !== 'undefined' && __DEV__,
  otpLength: 4,
  resendCooldownSec: 24,
  minWithdrawal: 100,
  geofenceMeters: 150,
  supportPhone: '+91 9444183378',
  supportEmail: 'selorginfo@gmail.com',
  termsUrl: 'https://selorg.in/terms',
  privacyUrl: 'https://selorg.in/privacy',
};

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[SelorgPicker] API base URL:', config.apiBaseUrl);
}
