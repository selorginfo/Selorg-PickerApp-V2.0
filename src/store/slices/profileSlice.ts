import type { AppState } from '../state';
import type { Action } from '../actions';

export function profileSlice(state: AppState, action: Action): AppState | null {
  switch (action.type) {
    case 'profile/setField': {
      const sec = state.profile[action.section];
      let value = action.value;
      if (action.section === 'edit' && action.key === 'phone') {
        value = String(value || '').replace(/\D/g, '').slice(0, 10);
      }
      if (action.section === 'edit' && action.key === 'email') {
        value = String(value || '').trim().toLowerCase();
      }
      return {
        ...state,
        profile: { ...state.profile, [action.section]: { ...sec, [action.key]: value } },
      };
    }
    case 'profile/replaceEdit':
      return { ...state, profile: { ...state.profile, edit: action.value } };
    case 'profile/replacePersonal':
      return { ...state, profile: { ...state.profile, personal: action.value } };
    case 'profile/replaceBank':
      return { ...state, profile: { ...state.profile, bank: action.value } };
    case 'profile/setAttempt':
      return {
        ...state,
        profile: { ...state.profile, attempts: { ...state.profile.attempts, [action.section]: action.value } },
      };
    default:
      return null;
  }
}
