import type { HomeSummaryDto } from '../types/api';

/** In-memory dummy shift for local/dev testing (USE_DUMMY_SHIFT). */
let active = false;
let startedAt: string | null = null;

export const DUMMY_SHIFT_WINDOW = '12:00 AM – 11:59 PM';

export const dummyHub: HomeSummaryDto['hub'] = {
  name: 'Indiranagar Darkstore',
  address: '80 Ft Rd, HAL 2nd Stage, Bengaluru 560038',
  accuracy: '±8 m',
  onSite: true,
  distanceM: 8,
  geofenceM: 150,
  latitude: 12.9784,
  longitude: 77.6408,
};

export const dummyDevice: HomeSummaryDto['device'] = {
  collected: false,
  id: null,
  copy: 'Enter the manager OTP to receive your HHD',
};

export function getDummyShift(): HomeSummaryDto['shift'] {
  const elapsedSeconds =
    active && startedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000)) : 0;
  return {
    window: DUMMY_SHIFT_WINDOW,
    active,
    startedAt,
    elapsedSeconds,
    onBreak: false,
  };
}

export function startDummyShift() {
  active = true;
  startedAt = new Date().toISOString();
}

export function endDummyShift() {
  active = false;
  startedAt = null;
}

/** Overlay dummy hub/shift/device onto a live or empty home summary. */
export function applyDummyShift(summary: HomeSummaryDto): HomeSummaryDto {
  const hub = summary.hub?.name ? summary.hub : { ...dummyHub };
  return {
    ...summary,
    hub: {
      ...hub,
      onSite: true,
      accuracy: hub.accuracy || dummyHub.accuracy,
    },
    shift: getDummyShift(),
    device: {
      ...summary.device,
      collected: true,
      id: summary.device?.id || dummyDevice.id,
      copy: summary.device?.copy || dummyDevice.copy,
    },
  };
}
