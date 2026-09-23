import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { BankAccountDto } from '../../types/api';

export const bankApi = {
  async listAccounts(): Promise<BankAccountDto[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const rows = await request<BankAccountDto[]>('/bank/accounts');
    return Array.isArray(rows) ? rows : [];
  },
  addAccount(payload: {
    accountNumber?: string;
    ifsc?: string;
    holderName?: string;
    holder?: string;
    bank?: string;
    acc?: string;
  }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, id: 'mock-account' });
    return request('/bank/accounts', {
      method: 'POST',
      body: {
        holder: payload.holder || payload.holderName,
        bank: payload.bank,
        acc: payload.acc || payload.accountNumber,
        ifsc: payload.ifsc,
      },
    });
  },
  updateAccount(accountId: string, payload: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/bank/accounts/${accountId}`, { method: 'PUT', body: payload });
  },
  setDefault(accountId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/bank/accounts/${accountId}/set-default`, { method: 'PUT' });
  },
  deleteAccount(accountId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/bank/accounts/${accountId}/delete`, { method: 'POST' });
  },
  verify(payload: {
    accountNumber: string;
    ifsc: string;
    holder?: string;
    accountId?: string;
  }) {
    if (config.USE_MOCKS) return mockResponse({ valid: true, holderName: payload.holder || '' });
    return request<{ valid: boolean; holderName: string | null }>('/bank/verify', {
      method: 'POST',
      body: {
        accountNumber: payload.accountNumber,
        ifsc: payload.ifsc,
        ...(payload.holder ? { holder: payload.holder } : {}),
        ...(payload.accountId ? { accountId: payload.accountId } : {}),
      },
    });
  },
};
