import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type DeviceCoords = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

export type LocationPermissionResult = 'granted' | 'denied' | 'blocked' | 'unavailable';

export type GetCoordsOptions = {
  /** Prefer a brand-new fix (shift start / punch). Default allows a short cached fix. */
  fresh?: boolean;
};

try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'auto',
  });
} catch {
  // Native module may be unavailable until a rebuild; never crash app startup.
}

/** Request (or confirm) fine location — call before shift start so the system dialog is intentional. */
export async function ensureLocationPermission(): Promise<boolean> {
  const status = await requestLocationPermission();
  return status === 'granted';
}

export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  if (Platform.OS !== 'android') {
    return new Promise(resolve => {
      try {
        Geolocation.requestAuthorization(
          () => resolve('granted'),
          () => resolve('denied'),
        );
      } catch {
        resolve('unavailable');
      }
    });
  }
  try {
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (already) return 'granted';
    const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location permission',
      message: 'Selorg Picker needs your location to verify you are on site before starting a shift.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    if (fine === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'unavailable';
  }
}

function toCoords(pos: {
  coords: { latitude: number; longitude: number; accuracy?: number | null };
}): DeviceCoords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyM:
      typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
        ? Math.round(pos.coords.accuracy)
        : undefined,
  };
}

function readPositionOnce(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<DeviceCoords | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve(toCoords(pos)),
      () => resolve(null),
      options,
    );
  });
}

function withHardLimit<T>(work: Promise<T>, hardLimitMs: number, fallback: T): Promise<T> {
  return Promise.race([
    work.catch(() => fallback),
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), hardLimitMs)),
  ]);
}

/**
 * Current device GPS for hub distance / shift APIs.
 * Tries high accuracy first, then a network/coarse fallback (needed on many emulators).
 * Returns null when permission is denied, GPS fails, or the native call hangs.
 */
export function getCurrentCoords(
  timeoutMs = 12000,
  opts: GetCoordsOptions = {},
): Promise<DeviceCoords | null> {
  const hardLimit = Math.max(2000, timeoutMs + 2000);
  const maximumAge = opts.fresh ? 0 : 8_000;

  const work = (async (): Promise<DeviceCoords | null> => {
    const allowed = await ensureLocationPermission();
    if (!allowed) return null;

    const high = await withHardLimit(
      readPositionOnce({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge,
      }),
      hardLimit,
      null,
    );
    if (high) return high;

    // Emulators and indoor devices often fail high-accuracy GPS; fall back to network location.
    const lowTimeout = Math.min(10_000, Math.max(4_000, timeoutMs));
    return withHardLimit(
      readPositionOnce({
        enableHighAccuracy: false,
        timeout: lowTimeout,
        maximumAge,
      }),
      lowTimeout + 2000,
      null,
    );
  })();

  return withHardLimit(work, hardLimit + 12_000, null);
}
