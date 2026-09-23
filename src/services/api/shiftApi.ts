import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { ShiftReadinessDto } from '../../types/api';

export const shiftApi = {
  listAvailable(query?: { warehouseKey?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse([
        { id: 'dummy-fullday', title: 'Full day · 12:00 AM – 11:59 PM', sub: 'Dummy 24h shift' },
      ]);
    }
    return request<unknown[]>('/shifts/available', { query });
  },
  listMy() {
    if (config.USE_MOCKS) {
      return mockResponse([
        { id: 'dummy-fullday', title: 'Full day · 12:00 AM – 11:59 PM', sub: 'Dummy 24h shift' },
      ]);
    }
    return request<unknown[]>('/shifts/my');
  },
  readiness(query?: { lat?: number; lng?: number; accuracyM?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse<ShiftReadinessDto>({ ready: true, accuracyM: 8, onSite: true });
    }
    return request<ShiftReadinessDto>('/shifts/readiness', {
      query: { lat: query?.lat, lng: query?.lng, accuracyM: query?.accuracyM },
    });
  },
  select(shiftId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/select', { method: 'POST', body: { shiftId } });
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
