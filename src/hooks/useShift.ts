import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { formatElapsed } from '../utils/formatters';
import { shiftApi, getLastShiftReadiness } from '../services/api/shiftApi';
import { ApiError } from '../services/api/client';
import { getCurrentCoords, requestLocationPermission } from '../services/location/locationService';
import { config } from '../constants/config';
import { hasValidCoords, haversineMeters, isWithinGeofence } from '../utils/geo';
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
        const coords = await getCurrentCoords(15_000, { fresh: true });
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

        // Client-side distance check against hub GPS (Adyar Dark Store / assigned hub).
        const hubLat = readiness.hubLatitude;
        const hubLng = readiness.hubLongitude;
        const geofenceM = readiness.geofenceM ?? config.geofenceMeters;
        let distanceM = readiness.distanceM ?? null;
        let onSite = Boolean(readiness.onSite);

        if (hasValidCoords(hubLat, hubLng)) {
          distanceM = Math.round(haversineMeters(coords.latitude, coords.longitude, hubLat!, hubLng!));
          onSite = isWithinGeofence(coords.latitude, coords.longitude, hubLat!, hubLng!, geofenceM);
        }

        if (!readiness.ready || !onSite) {
          const reason =
            readiness.blockers?.[0] ||
            (distanceM != null
              ? `You are ${distanceM} m from ${readiness.hub || 'the Dark Store'}. Move within ${geofenceM} m to start.`
              : 'Move on-site to the Dark Store to start your shift');
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
        const coords = await getCurrentCoords(15_000, { fresh: true });
        if (!coords) {
          dispatch({
            type: 'ui/setToast',
            value: 'Location is required to start a shift. Enable GPS and try again.',
          });
          return;
        }

        // Re-validate geofence with a fresh fix before committing start.
        const last = getLastShiftReadiness();
        const hubLat = last?.hubLatitude;
        const hubLng = last?.hubLongitude;
        const geofenceM = last?.geofenceM ?? config.geofenceMeters;
        if (hasValidCoords(hubLat, hubLng)) {
          const distanceM = Math.round(
            haversineMeters(coords.latitude, coords.longitude, hubLat!, hubLng!),
          );
          if (!isWithinGeofence(coords.latitude, coords.longitude, hubLat!, hubLng!, geofenceM)) {
            dispatch({
              type: 'ui/setToast',
              value: `You are ${distanceM} m from ${last?.hub || 'the Dark Store'}. Move within ${geofenceM} m to start.`,
            });
            dispatch({ type: 'shift/setStep', step: 'none' });
            return;
          }
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
    lastReadiness: getLastShiftReadiness(),
    setStep,
    startShift,
    startWork,
    checkout,
    closeSheet,
  };
}
