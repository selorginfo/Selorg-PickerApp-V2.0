import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { ShiftReadinessDto, ShiftSlotDto } from '../../types/api';

let lastShiftReadiness: ShiftReadinessDto | null = null;

export function getLastShiftReadiness(): ShiftReadinessDto | null {
  return lastShiftReadiness;
}

function asSlotList(raw: unknown): ShiftSlotDto[] {
  if (Array.isArray(raw)) return raw as ShiftSlotDto[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of ['data', 'items', 'shifts', 'list']) {
      if (Array.isArray(r[k])) return r[k] as ShiftSlotDto[];
    }
  }
  return [];
}

export const shiftApi = {
  listAvailable(query?: { warehouseKey?: string; date?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<ShiftSlotDto[]>([
        {
          id: 'dummy-fullday',
          label: 'Full day',
          date: new Date().toISOString().slice(0, 10),
          startTime: '00:00',
          endTime: '23:59',
          timeDisplay: '12:00 AM – 11:59 PM',
          capacity: 5,
          bookedCount: 0,
          remainingSlots: 5,
          booked: false,
          status: 'open',
          hubName: 'Demo Hub',
          breakDuration: 30,
          canStart: false,
          assignmentStatus: null,
        },
      ]);
    }
    return request<ShiftSlotDto[]>('/shifts/available', { query }).then(asSlotList);
  },
  listMy() {
    if (config.USE_MOCKS) {
      return mockResponse<ShiftSlotDto[]>([]);
    }
    return request<unknown[]>('/shifts/my').then(raw => {
      if (!Array.isArray(raw)) return [];
      return raw.map((row: any) => {
        if (row?.shift && typeof row.shift === 'object') {
          return { ...row.shift, assignmentStatus: row.status, id: row.shift.id || row.shiftId } as ShiftSlotDto;
        }
        return row as ShiftSlotDto;
      });
    });
  },
  async readiness(query?: { lat?: number; lng?: number; accuracyM?: number }) {
    if (config.USE_MOCKS) {
      const mock: ShiftReadinessDto = {
        ready: true,
        accuracyM: 8,
        onSite: true,
        distanceM: 8,
        geofenceM: 150,
        canStart: true,
      };
      lastShiftReadiness = mock;
      return mockResponse(mock);
    }
    const result = await request<ShiftReadinessDto>('/shifts/readiness', {
      query: { lat: query?.lat, lng: query?.lng, accuracyM: query?.accuracyM },
    });
    lastShiftReadiness = result;
    return result;
  },
  select(shiftId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/select', { method: 'POST', body: { shiftId } });
  },
  deselect(shiftId: string, reason?: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/deselect', { method: 'POST', body: { shiftId, reason } });
  },
  start(payload?: { shiftId?: string; latitude?: number; longitude?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse({ ok: true, startedAt: Date.now() });
    }
    const path = payload?.shiftId ? `/shifts/${payload.shiftId}/start` : '/shifts/start';
    return request(path, {
      method: 'POST',
      body: {
        latitude: payload?.latitude,
        longitude: payload?.longitude,
        lat: payload?.latitude,
        lng: payload?.longitude,
        shiftId: payload?.shiftId,
        ...(payload?.latitude != null && payload?.longitude != null
          ? { location: { latitude: payload.latitude, longitude: payload.longitude } }
          : {}),
      },
    });
  },
  end(payload?: { shiftId?: string; latitude?: number; longitude?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse({ ok: true });
    }
    const path = payload?.shiftId ? `/shifts/${payload.shiftId}/end` : '/shifts/end';
    return request(path, {
      method: 'POST',
      body: {
        latitude: payload?.latitude,
        longitude: payload?.longitude,
        lat: payload?.latitude,
        lng: payload?.longitude,
        shiftId: payload?.shiftId,
        ...(payload?.latitude != null && payload?.longitude != null
          ? { location: { latitude: payload.latitude, longitude: payload.longitude } }
          : {}),
      },
    });
  },
  startBreak() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/break/start', { method: 'POST' });
  },
  endBreak() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/break/end', { method: 'POST' });
  },
  ping() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/presence/ping', { method: 'POST' });
  },
  heartbeat() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/heartbeat', { method: 'POST' });
  },
};
