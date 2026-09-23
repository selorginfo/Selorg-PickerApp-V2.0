import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { walletApi } from '../services/api/walletApi';
import { bankApi } from '../services/api/bankApi';
import { ApiError } from '../services/api/client';
import { config } from '../constants/config';
import { useApiResource } from './useApiResource';
import { navigate } from '../navigation/navigationRef';

const BALANCE_POLL_MS = 30_000;
const WITHDRAW_STATUS_POLL_MS = 5_000;
const TERMINAL_WITHDRAW = new Set(['PAID', 'REJECTED', 'FAILED', 'COMPLETED']);

function statusToast(status: string, reason?: string | null): string {
  const s = status.toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED') return 'Withdrawal paid successfully';
  if (s === 'APPROVED') return 'Withdrawal approved · payout in progress';
  if (s === 'REJECTED' || s === 'FAILED') {
    return reason ? `Withdrawal rejected · ${reason}` : 'Withdrawal rejected';
  }
  return 'Withdrawal requested · status: Pending';
}

export function useWallet(options?: { pollBalance?: boolean }) {
  const { state, dispatch } = useStore();
  const { wallet } = state;
  const balance = useApiResource(
    () => walletApi.getBalance(),
    [],
    options?.pollBalance ? { pollMs: BALANCE_POLL_MS } : {},
  );
  const [withdrawing, setWithdrawing] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableAmount = balance.data?.availableAmount ?? 0;
  const availableLabel = balance.data?.available ?? '₹0';
  const bankLabel = balance.data?.bankLabel ?? wallet.wdBank;
  const bankVerified = balance.data?.bankVerified ?? false;
  const upiVerified = balance.data?.upiVerified ?? false;
  const minWithdrawal = balance.data?.minWithdrawal ?? config.minWithdrawal;
  const canWithdraw = availableAmount >= minWithdrawal && Boolean(bankLabel);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accounts = await bankApi.listAccounts();
        if (cancelled || !accounts.length) return;
        const primary = accounts.find(a => a.isPrimary) || accounts[0];
        setBankAccountId(primary.id);
      } catch {
        // Balance DTO still carries bankLabel for display
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [balance.data?.bankLabel]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const stopStatusPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refetchBalance = balance.refetch;

  const startStatusPoll = useCallback(
    (requestId: string) => {
      stopStatusPoll();
      pollRef.current = setInterval(async () => {
        try {
          const req = await walletApi.getWithdrawalRequest(requestId);
          const status = String(req.status || '').toUpperCase();
          if (status === 'APPROVED') {
            dispatch({ type: 'ui/setToast', value: statusToast(status) });
          }
          if (TERMINAL_WITHDRAW.has(status)) {
            stopStatusPoll();
            dispatch({ type: 'ui/setToast', value: statusToast(status, req.rejectionReason) });
            dispatch({ type: 'wallet/invalidateTxns' });
            refetchBalance();
          }
        } catch {
          // Keep polling through transient network errors
        }
      }, WITHDRAW_STATUS_POLL_MS);
    },
    [dispatch, refetchBalance, stopStatusPoll],
  );

  const openWithdraw = useCallback(() => {
    refetchBalance();
    if (!bankLabel) {
      dispatch({ type: 'ui/setToast', value: 'Add a bank account before withdrawing' });
      navigate('Main', { screen: 'BankDetails' });
      return;
    }
    if (availableAmount < minWithdrawal) {
      dispatch({ type: 'ui/setToast', value: `Minimum withdrawal is ₹${minWithdrawal}` });
      return;
    }
    dispatch({ type: 'wallet/openWithdraw' });
  }, [availableAmount, bankLabel, dispatch, minWithdrawal, refetchBalance]);

  const submitWithdraw = useCallback(async (): Promise<{ id?: string; status: string; amount: number } | null> => {
    if (withdrawing) return null;
    const amt = parseInt(wallet.wdAmount, 10);
    if (!amt || amt < minWithdrawal) {
      dispatch({ type: 'ui/setToast', value: `Enter an amount of ₹${minWithdrawal} or more` });
      return null;
    }
    if (amt > availableAmount) {
      dispatch({ type: 'ui/setToast', value: 'Amount exceeds available balance' });
      return null;
    }
    if (!bankLabel) {
      dispatch({ type: 'ui/setToast', value: 'Add a bank account before withdrawing' });
      return null;
    }

    setWithdrawing(true);
    try {
      const result = await walletApi.withdraw({
        amount: amt,
        idempotencyKey: wallet.wdKey ?? `wd_${Date.now()}`,
        bankAccountId: bankAccountId || undefined,
      });
      dispatch({ type: 'wallet/invalidateTxns' });
      refetchBalance();
      if (result.id) startStatusPoll(result.id);
      return { id: result.id, status: String(result.status || 'PENDING'), amount: amt };
    } catch (e) {
      dispatch({ type: 'ui/setToast', value: e instanceof ApiError ? e.message : 'Withdrawal failed' });
      return null;
    } finally {
      setWithdrawing(false);
    }
  }, [
    availableAmount,
    bankAccountId,
    bankLabel,
    dispatch,
    minWithdrawal,
    refetchBalance,
    startStatusPoll,
    wallet.wdAmount,
    wallet.wdKey,
    withdrawing,
  ]);

  return {
    ...wallet,
    available: availableAmount,
    availableLabel,
    bankLabel,
    bankVerified,
    upiVerified,
    bankAccountId,
    minWithdrawal,
    canWithdraw,
    walletSummary: balance.data,
    loading: balance.loading,
    withdrawing,
    refetchBalance: balance.refetch,
    openWithdraw,
    closeWithdraw: () => dispatch({ type: 'wallet/closeWithdraw' }),
    setAmount: (value: string) => dispatch({ type: 'wallet/setAmount', value }),
    submitWithdraw,
  };
}
