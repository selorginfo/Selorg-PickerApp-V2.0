import type { AppState } from './state';
import type { Action } from './actions';
import { authSlice } from './slices/authSlice';
import { profileSlice } from './slices/profileSlice';
import { onboardingSlice } from './slices/onboardingSlice';
import { shiftSlice } from './slices/shiftSlice';
import { miscSlice } from './slices/miscSlice';
import { uiSlice } from './slices/uiSlice';

const slices = [authSlice, profileSlice, onboardingSlice, shiftSlice, miscSlice, uiSlice];

export function rootReducer(state: AppState, action: Action): AppState {
  if (action.type === 'hydrate') {
    return { ...state, ...action.partial } as AppState;
  }
  for (const slice of slices) {
    const next = slice(state, action);
    if (next) return next;
  }
  return state;
}
