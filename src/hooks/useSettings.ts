import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { supportApi } from '../services/api/supportApi';
import { ApiError } from '../services/api/client';
import type { Language, SettingsState } from '../types';

const LANG_CODES = new Set<Language>(['en', 'hi', 'kn', 'ta', 'te']);

function coerceLang(value: unknown): Language {
  const raw = String(value || '').trim().toLowerCase();
  if (LANG_CODES.has(raw as Language)) return raw as Language;
  return 'en';
}

type ToggleKey = keyof Omit<SettingsState, 'lang'>;

export function useSettings() {
  const { state, dispatch } = useStore();
  const langBusy = useRef(false);
  const toggleBusyRef = useRef<Partial<Record<ToggleKey, boolean>>>({});
  const [langSaving, setLangSaving] = useState(false);
  const [toggleBusy, setToggleBusy] = useState<Partial<Record<ToggleKey, boolean>>>({});
  const [hydrating, setHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setHydrating(true);
    setHydrateError(null);
    try {
      const prefs = await supportApi.getPreferences();
      dispatch({
        type: 'settings/hydrate',
        value: {
          push: prefs.push ?? prefs.pushNotifications,
          shiftRem: prefs.shiftRem ?? prefs.shiftReminders ?? true,
          payout: prefs.payout ?? prefs.payoutAlerts ?? true,
          incentive: prefs.incentive ?? prefs.incentiveUpdates ?? false,
          sound: prefs.sound ?? prefs.orderSoundAlerts,
          lang: coerceLang(prefs.language),
        },
      });
    } catch (e) {
      setHydrateError(e instanceof ApiError ? e.message : 'Could not load settings');
    } finally {
      setHydrating(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadPreferences().catch(() => undefined);
  }, [loadPreferences]);

  const toggle = useCallback(
    async (key: ToggleKey) => {
      if (toggleBusyRef.current[key]) return;
      toggleBusyRef.current[key] = true;
      setToggleBusy(prev => ({ ...prev, [key]: true }));
      const nextValue = !state.settings[key];
      dispatch({ type: 'settings/toggle', key });
      try {
        // Send both short (app) and long (API canonical) keys so either schema path persists.
        const longKey =
          key === 'push'
            ? 'pushNotifications'
            : key === 'shiftRem'
              ? 'shiftReminders'
              : key === 'payout'
                ? 'payoutAlerts'
                : key === 'incentive'
                  ? 'incentiveUpdates'
                  : key === 'sound'
                    ? 'orderSoundAlerts'
                    : key;
        await supportApi.updatePreferences({
          [key]: nextValue,
          [longKey]: nextValue,
        } as Partial<SettingsState> & Record<string, boolean>);
      } catch (e) {
        dispatch({ type: 'settings/toggle', key });
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not save setting',
        });
      } finally {
        toggleBusyRef.current[key] = false;
        setToggleBusy(prev => ({ ...prev, [key]: false }));
      }
    },
    [dispatch, state.settings],
  );

  const setLang = useCallback(
    async (value: Language) => {
      if (langBusy.current || value === state.settings.lang) return;
      const previous = state.settings.lang;
      langBusy.current = true;
      setLangSaving(true);
      dispatch({ type: 'settings/setLang', value });
      try {
        await supportApi.updatePreferences({ language: value } as Partial<SettingsState> & {
          language: Language;
        });
      } catch (e) {
        dispatch({ type: 'settings/setLang', value: previous });
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not save language',
        });
      } finally {
        langBusy.current = false;
        setLangSaving(false);
      }
    },
    [dispatch, state.settings.lang],
  );

  return {
    ...state.settings,
    hydrating,
    hydrateError,
    reload: loadPreferences,
    toggle,
    setLang,
    langSaving,
    toggleBusy,
  };
}
