import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type DeviceCoords = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

export type LocationPermissionResult = 'granted' | 'denied' | 'blocked' | 'unavailable';

/** Request (or confirm) fine location — call before shift start so the system dialog is intentional. */
export async function ensureLocationPermission(): Promise<boolean> {
  const status = await requestLocationPermission();
  return status === 'granted';
}

export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  if (Platform.OS !== 'android') return 'granted';
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

/**
 * Current device position for shift APIs.
 * Returns null when permission is denied, GPS fails, or the native call hangs.
 */
export function getCurrentCoords(timeoutMs = 12000): Promise<DeviceCoords | null> {
  const hardLimit = Math.max(1500, timeoutMs + 1500);
  const work = (async (): Promise<DeviceCoords | null> => {
    const allowed = await ensureLocationPermission();
    if (!allowed) return null;

    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM:
              typeof pos.coords.accuracy === 'number' ? Math.round(pos.coords.accuracy) : undefined,
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 10_000,
        },
      );
    });
  })();

  return Promise.race([
    work.catch(() => null),
    new Promise<null>(resolve => setTimeout(() => resolve(null), hardLimit)),
  ]);
}
