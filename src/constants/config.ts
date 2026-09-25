import { NativeModules, Platform } from 'react-native';
import {
  DEV_API_HOST as ENV_DEV_API_HOST,
  DEV_API_PORT as ENV_DEV_API_PORT,
  EXPO_PUBLIC_DEV_API_HOST as ENV_EXPO_DEV_API_HOST,
  EXPO_PUBLIC_DEV_API_PORT as ENV_EXPO_DEV_API_PORT,
} from '@env';

/**
 * Dev API host resolution (probe + pin first reachable):
 * 1. Metro LAN / emulator gateway from the JS bundle URL
 * 2. Optional DEV_API_HOST from local .env (written by scripts/ensure-dev-api-env.js)
 * 3. 127.0.0.1 when Metro is loopback (needs `adb reverse tcp:3333`)
 * 4. 10.0.2.2 on Android (emulator host loopback)
 *
 * Never commit a machine LAN IP — that is what produced "Cannot reach the API
 * (192.168.x.x, 127.0.0.1)" when the PC DHCP address changed.
 */
function trimEnv(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

const envHost =
  trimEnv(ENV_EXPO_DEV_API_HOST) ||
  trimEnv(ENV_DEV_API_HOST) ||
  '';
const envPort =
  trimEnv(ENV_EXPO_DEV_API_PORT) ||
  trimEnv(ENV_DEV_API_PORT) ||
  '';

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
  const blob = `${constants.Fingerprint || ''} ${constants.Model || ''} ${constants.Brand || ''} ${constants.Manufacturer || ''} ${constants.Product || ''}`.toLowerCase();
  return (
    blob.includes('generic') ||
    blob.includes('emulator') ||
    blob.includes('sdk_gphone') ||
    blob.includes('google_sdk') ||
    blob.includes('goldfish') ||
    blob.includes('ranchu') ||
    blob.includes('sdk_phone')
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
  const metroIsLoopback = Boolean(metroHost && isLoopbackHost(metroHost));
  const metroIsEmulatorGateway = Boolean(metroHost && isEmulatorOnlyHost(metroHost));
  const metroIsLan = Boolean(
    metroHost && !isLoopbackHost(metroHost) && !isEmulatorOnlyHost(metroHost),
  );
  const emulator = Platform.OS === 'android' && (isAndroidEmulator() || metroIsEmulatorGateway);

  // Same machine as Metro when the bundle loaded over Wi‑Fi LAN.
  if (metroIsLan) {
    pushUnique(hosts, metroHost);
  }

  // Emulator gateway from Metro (typical AVD / Genymotion).
  if (metroIsEmulatorGateway) {
    pushUnique(hosts, metroHost);
  }

  // Local .env LAN IP — required when Metro uses adb reverse (scriptURL is
  // loopback) and reverse for :3333 is missing (common on wireless ADB).
  if (envHost && !isLoopbackHost(envHost)) {
    if (!(metroIsLan && envHost === metroHost)) {
      pushUnique(hosts, envHost);
    }
  }

  if (Platform.OS === 'android') {
    // USB / wireless adb reverse: device localhost → PC selorg-service.
    if (metroIsLoopback || !metroHost) {
      pushUnique(hosts, '127.0.0.1');
    }

    // Always offer the emulator gateway on Android — covers mis-detected AVDs
    // that report a consumer device model but still use 10.0.2.2.
    if (emulator || metroIsLoopback || !metroHost) {
      pushUnique(hosts, '10.0.2.2');
    }

    // Last resort reverse target even when Metro already advertised a LAN IP
    // (some OEM wireless-ADB setups keep reverse for API only).
    pushUnique(hosts, '127.0.0.1');
  } else {
    pushUnique(hosts, 'localhost');
    pushUnique(hosts, '127.0.0.1');
    if (metroIsLan) pushUnique(hosts, metroHost);
  }

  // Loopback .env only when Metro is also loopback / reverse.
  if (envHost && isLoopbackHost(envHost) && (metroIsLoopback || !metroHost)) {
    pushUnique(hosts, envHost === 'localhost' ? '127.0.0.1' : envHost);
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
    `Cannot reach the API (${ordered.join(', ')}). Check Wi‑Fi, that selorg-service is running on port ${DEV_API_PORT}, run npm start (sets adb reverse + DEV_API_HOST), and ensure the phone can reach your PC.`,
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
  // eslint-disable-next-line no-console
  console.log('[SelorgPicker] API candidates:', getApiHostCandidates().join(', '));
  // eslint-disable-next-line no-console
  console.log('[SelorgPicker] Metro host:', getMetroHost() || '(none)');
}
