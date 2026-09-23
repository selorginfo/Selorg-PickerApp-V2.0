import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState } from './state';
import { initialState } from './state';
import type { Action } from './actions';
import { rootReducer } from './reducer';
import { storageService } from '../services/storage/storageService';
import { trainingApi } from '../services/api/trainingApi';
import { onboardingApi } from '../services/api/onboardingApi';

interface Store {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppStoreContext = createContext<Store | undefined>(undefined);

/** Durable preferences only. Auth token is restored separately on boot. */
const PERSIST_KEYS: (keyof AppState)[] = ['settings'];

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  const hydrated = useRef(false);
  const completingRef = useRef(false);

  // ---- hydrate persisted slices on boot ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storageService.loadPartial(PERSIST_KEYS);
      if (!cancelled && saved && Object.keys(saved).length) {
        dispatch({ type: 'hydrate', partial: saved as Partial<AppState> });
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- persist selected slices ----
  const { settings } = state;
  useEffect(() => {
    if (!hydrated.current) return;
    storageService.savePartial({ settings });
  }, [settings]);

  // ---- global 1s tick (shift timer + OTP resend countdown) ----
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'shift/tick' }), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- toast auto-dismiss (2.2s, mirrors Component.toast) ----
  useEffect(() => {
    if (!state.ui.toast) return;
    const id = setTimeout(() => dispatch({ type: 'ui/setToast', value: null }), 2200);
    return () => clearTimeout(id);
  }, [state.ui.toast]);

  // ---- training video progress (~6s clip → ends & marks done only after API succeeds) ----
  useEffect(() => {
    if (!state.ui.videoOpen || !state.ui.videoPlaying) return;
    const id = setInterval(() => {
      const next = state.ui.videoProgress + 100 / 60;
      if (next >= 100) {
        // Stop ticker immediately so we don't re-fire complete every 100ms.
        // setVideoProgress(100) also clears videoPlaying in uiSlice.
        dispatch({ type: 'ui/setVideoProgress', value: 100 });
        const videoId = state.ui.videoId;
        const idx = state.ui.videoIdx;
        const scope = state.ui.videoScope;
        if (!videoId) {
          dispatch({ type: 'ui/setToast', value: 'Training video id missing — try again' });
          return;
        }
        if (completingRef.current) return;
        completingRef.current = true;
        (async () => {
          try {
            if (scope === 'ob') {
              if (state.onboarding.trainDone[idx]) return;
              await onboardingApi.completeTrainingVideo(videoId);
              dispatch({ type: 'ob/setTrainDone', index: idx, value: true });
            } else if (scope === 'profile') {
              if (state.support.profTrainDone[idx]) return;
              await trainingApi.markComplete(videoId);
              dispatch({ type: 'support/markTrainingDone', index: idx });
            }
          } catch (e) {
            dispatch({
              type: 'ui/setToast',
              value: e instanceof Error ? e.message : 'Could not mark training complete · replay to retry',
            });
          } finally {
            completingRef.current = false;
          }
        })().catch(() => {
          completingRef.current = false;
        });
      } else {
        dispatch({ type: 'ui/setVideoProgress', value: next });
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ui.videoOpen, state.ui.videoPlaying, state.ui.videoProgress]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export function useStore(): Store {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useStore must be used within <AppStoreProvider>');
  return ctx;
}
