import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { formatElapsed } from '../utils/formatters';
import { shiftApi } from '../services/api/shiftApi';
import { ApiError } from '../services/api/client';
import { getCurrentCoords, requestLocationPermission } from '../services/location/locationService';
import type { ShiftStep } from '../types';

export function useShift() {
  const { state, dispatch } = useStore();
  const { shift } = state;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const runBusy = useCallback(async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const startShift = useCallback(async () => {
    await runBusy(async () => {
      try {
        const permission = await requestLocationPermission();
        if (permission === 'blocked') {
          dispatch({
            type: 'ui/setToast',
            value: 'Location is blocked. Enable it in system Settings to start your shift.',
          });
          return;
        }
        if (permission === 'denied' || permission === 'unavailable') {
          dispatch({
            type: 'ui/setToast',
            value: 'Allow location access to start your shift at the hub.',
          });
          return;
        }
        const coords = await getCurrentCoords();
        if (!coords) {
          dispatch({
            type: 'ui/setToast',
            value: 'Could not read GPS. Enable location services and try again.',
          });
          return;
        }
        const readiness = await shiftApi.readiness({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracyM: coords.accuracyM,
        });
        if (!readiness.ready) {
          const reason = readiness.blockers?.[0] || 'Move on-site to start your shift';
          dispatch({ type: 'ui/setToast', value: reason });
          return;
        }
        dispatch({ type: 'shift/setStep', step: 'location' });
      } catch (e) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not check shift readiness',
        });
      }
    });
  }, [dispatch, runBusy]);

  const startWork = useCallback(async () => {
    await runBusy(async () => {
      try {
        const coords = await getCurrentCoords();
        if (!coords) {
          dispatch({
            type: 'ui/setToast',
            value: 'Location is required to start a shift. Enable GPS and try again.',
          });
          return;
        }
        const myShifts = await shiftApi.listMy().catch(() => [] as unknown[]);
        const first = Array.isArray(myShifts) ? myShifts[0] as Record<string, unknown> | undefined : undefined;
        const shiftId =
          (first?.shiftId && typeof first.shiftId === 'object' && first.shiftId !== null
            ? String((first.shiftId as { _id?: string; id?: string })._id || (first.shiftId as { id?: string }).id || '')
            : null)
          || (first?.shiftId ? String(first.shiftId) : null)
          || (first?.id ? String(first.id) : null)
          || undefined;

        await shiftApi.start({
          shiftId: shiftId || undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        dispatch({ type: 'shift/startWork' });
      } catch (e) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not start shift',
        });
      }
    });
  }, [dispatch, runBusy]);

  const checkout = useCallback(async () => {
    await runBusy(async () => {
      try {
        const coords = await getCurrentCoords();
        await shiftApi.end(
          coords
            ? { latitude: coords.latitude, longitude: coords.longitude }
            : undefined,
        );
        dispatch({ type: 'shift/checkout' });
      } catch (e) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not end shift',
        });
      }
    });
  }, [dispatch, runBusy]);

  const setStep = useCallback((step: ShiftStep) => dispatch({ type: 'shift/setStep', step }), [dispatch]);
  const closeSheet = useCallback(() => dispatch({ type: 'shift/setStep', step: 'none' }), [dispatch]);

  return {
    ...shift,
    timer: formatElapsed(shift.elapsed),
    busy,
    setStep,
    startShift,
    startWork,
    checkout,
    closeSheet,
  };
}
