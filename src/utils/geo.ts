/** Great-circle distance in metres (Haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasValidCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

/** True when device is within `radiusM` of the hub (inclusive). */
export function isWithinGeofence(
  deviceLat: number,
  deviceLng: number,
  hubLat: number,
  hubLng: number,
  radiusM: number,
): boolean {
  if (!hasValidCoords(deviceLat, deviceLng) || !hasValidCoords(hubLat, hubLng)) return false;
  if (!(radiusM >= 0)) return false;
  return haversineMeters(deviceLat, deviceLng, hubLat, hubLng) <= radiusM;
}

export function formatDistanceMeters(distanceM: number): string {
  if (!Number.isFinite(distanceM) || distanceM < 0) return '—';
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}
