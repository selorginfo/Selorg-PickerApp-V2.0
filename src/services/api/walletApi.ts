import { config } from '../../constants/config';
import { request, mockResponse, requestPaginated } from './client';
import type { WalletBalanceDto } from '../../types/api';
import type { Payout, WithdrawalStatus } from '../../types';

export interface WithdrawResult {
  id: string;
  status: WithdrawalStatus | string;
  amount?: number;
  requestedAt?: string;
  availableBalance?: number;
}

export interface WithdrawalRequestDto {
  id: string;
  status: WithdrawalStatus | string;
  amount: number;
  requestedAt: string;
  paidAt?: string | null;
  rejectionReason?: string | null;
}

type TxnRow = Payout & { id?: string; status?: string; amount?: number; type?: string };

export const walletApi = {
  getWallet() {
    if (config.USE_MOCKS) {
      return mockResponse<WalletBalanceDto>({
        month: '',
        netPayout: '₹0',
        payDate: '',
        available: '₹0',
        availableAmount: 0,
      });
    }
    // Prefer the picker view-model balance endpoint
    return request<WalletBalanceDto>('/wallet/balance');
  },

  getBalance(query?: { month?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<WalletBalanceDto>({
        month: '',
        netPayout: '₹0',
        payDate: '',
        available: '₹0',
        availableAmount: 0,
      });
    }
    return request<WalletBalanceDto>('/wallet/balance', { query });
  },

  async getTransactions(query?: { page?: number; limit?: number }): Promise<Payout[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const { items } = await requestPaginated<TxnRow>('/wallet/transactions', { query });
    return items.map((p) => ({
      id: p.id,
      month: p.month,
      date: p.date,
      mode: p.mode,
      amt: p.amt,
      status: (p.status || 'completed').toLowerCase(),
    }));
  },

  getTransaction(transactionId: string) {
    if (config.USE_MOCKS) return mockResponse(null);
    return request(`/wallet/transactions/${transactionId}`);
  },

  getEarningsBreakdown() {
    if (config.USE_MOCKS) return mockResponse(null);
    return request('/wallet/earnings-breakdown');
  },

  getHistory(query?: { page?: number; limit?: number }) {
    if (config.USE_MOCKS) return mockResponse([]);
    return request('/wallet/history', { query });
  },

  withdraw(payload: { amount: number; idempotencyKey: string; bankAccountId?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<WithdrawResult>({ id: payload.idempotencyKey, status: 'PENDING', amount: payload.amount });
    }
    return request<WithdrawResult>('/wallet/withdraw', {
      method: 'POST',
      body: {
        amount: payload.amount,
        accountId: payload.bankAccountId,
        idempotencyKey: payload.idempotencyKey,
      },
    });
  },

  getWithdrawalRequest(requestId: string) {
    if (config.USE_MOCKS) {
      return mockResponse<WithdrawalRequestDto>({
        id: requestId,
        status: 'PENDING',
        amount: 0,
        requestedAt: new Date().toISOString(),
      });
    }
    return request<WithdrawalRequestDto>(`/wallet/withdrawal-requests/${requestId}`);
  },

  deposit(payload: { amount: number; method: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/wallet/deposit', { method: 'POST', body: payload });
  },
};
