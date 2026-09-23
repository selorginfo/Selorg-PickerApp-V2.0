import { Platform } from 'react-native';
import { config } from '../../constants/config';
import { request, mockResponse, requestPaginated } from './client';
import type { AppNotification } from '../../types';

export const notificationApi = {
  async list(query?: { page?: number; limit?: number }): Promise<AppNotification[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const { items } = await requestPaginated<AppNotification>('/notifications', { query });
    return items;
  },
  markAllRead() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/notifications/read-all', { method: 'PUT' });
  },
  markRead(notificationId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' });
  },
  registerPushToken(payload: { token: string; platform: 'ios' | 'android'; deviceId?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/push-token', {
      method: 'POST',
      body: {
        token: payload.token,
        platform: payload.platform,
        deviceId: payload.deviceId,
        appVersion: config.appVersion,
      },
    });
  },
};

/** Register a real device push token when provided by FCM/APNs (no fake tokens). */
export async function registerDevicePushToken(token: string | null | undefined): Promise<void> {
  const trimmed = String(token || '').trim();
  if (!trimmed) return;
  await notificationApi.registerPushToken({
    token: trimmed,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}
