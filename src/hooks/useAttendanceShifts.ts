import { useCallback, useEffect, useState } from 'react';
import { shiftApi } from '../services/api/shiftApi';
import { ApiError } from '../services/api/client';
import { useStore } from '../store/AppStore';
import type { ShiftSlotDto } from '../types/api';

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const code = String(err.appCode || '');
    if (code === 'SHIFT_FULL') {
      return 'This shift is already fully booked. Please select another available shift.';
    }
    if (code === 'SHIFT_ALREADY_BOOKED') {
      return 'You have already booked this shift.';
    }
    if (code === 'WRONG_DARK_STORE') {
      return 'This shift belongs to a different Dark Store.';
    }
    if (code === 'WRONG_ROLE') {
      return 'This shift is not available for your role.';
    }
    if (code === 'SHIFT_NOT_STARTABLE') {
      return err.message || 'Start My Shift is available only after the scheduled start time.';
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export function useAttendanceShifts() {
  const { dispatch } = useStore();
  const [slots, setSlots] = useState<ShiftSlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await shiftApi.listAvailable();
      setSlots(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(messageFromError(err, "Couldn't load shifts"));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const bookShift = useCallback(
    async (shiftId: string) => {
      setBusyId(shiftId);
      try {
        await shiftApi.select(shiftId);
        dispatch({ type: 'ui/setToast', value: 'Shift booked successfully' });
        await refresh();
      } catch (err) {
        dispatch({ type: 'ui/setToast', value: messageFromError(err, 'Could not book shift') });
      } finally {
        setBusyId(null);
      }
    },
    [dispatch, refresh],
  );

  return {
    slots,
    loading,
    error,
    busyId,
    refresh,
    bookShift,
  };
}
