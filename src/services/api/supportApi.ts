import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import { mapChatMessages } from './mappers';
import type { ChatThreadDto, PreferencesDto } from '../../types/api';
import type { ChatMessage, Faq, SettingsState } from '../../types';

export const supportApi = {
  async faqs(query?: { category?: string }): Promise<Faq[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const rows = await request<Faq[]>('/faq', { query: { category: query?.category || 'picker' } });
    return Array.isArray(rows) ? rows : [];
  },

  listTickets() {
    if (config.USE_MOCKS) return mockResponse([]);
    return request('/support/tickets');
  },

  createTicket(payload: { subject: string; description: string; category?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, id: 'mock-ticket' });
    return request('/support/tickets', {
      method: 'POST',
      body: {
        subject: payload.subject,
        message: payload.description,
        description: payload.description,
        category: payload.category || 'other',
      },
    });
  },

  reportIssue(payload: { type: string; description: string; reason?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/issues', {
      method: 'POST',
      body: {
        type: payload.type,
        description: payload.description,
        reason: payload.reason || payload.description,
      },
    });
  },

  async getChatMessages(): Promise<ChatMessage[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const thread = await request<ChatThreadDto>('/support/chat/messages');
    return mapChatMessages(thread);
  },

  async sendMessage(payload: { text: string }): Promise<ChatMessage> {
    if (config.USE_MOCKS) {
      return mockResponse({ who: 'me' as const, text: payload.text, time: '' });
    }
    const sent = await request<{ text: string; createdAt: string; me: boolean }>('/support/chat/messages', {
      method: 'POST',
      body: { text: payload.text },
    });
    return {
      who: 'me',
      text: sent.text || payload.text,
      time: new Date(sent.createdAt || Date.now()).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  },

  getPreferences() {
    if (config.USE_MOCKS) {
      return mockResponse<PreferencesDto>({
        pushNotifications: true,
        locationSharing: true,
        orderSoundAlerts: true,
        language: 'en',
        push: true,
        shiftRem: true,
        payout: true,
        incentive: false,
        sound: true,
      });
    }
    return request<PreferencesDto>('/settings/preferences');
  },

  updatePreferences(payload: Partial<SettingsState> & { language?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, ...payload });
    return request<PreferencesDto>('/settings/preferences', { method: 'PUT', body: payload });
  },
};
