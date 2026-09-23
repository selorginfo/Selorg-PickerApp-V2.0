import type { AppState } from '../state';
import type { Action } from '../actions';

export function shiftSlice(state: AppState, action: Action): AppState | null {
  switch (action.type) {
    case 'shift/setStep':
      return { ...state, shift: { ...state.shift, step: action.step } };
    case 'shift/startWork':
      return { ...state, shift: { ...state.shift, step: 'none', active: true, elapsed: 0 } };
    case 'shift/checkout':
      return { ...state, shift: { ...state.shift, active: false, elapsed: 0 } };
    case 'shift/tick': {
      const s = state.shift;
      if (!s.active && s.resendIn <= 0 && state.auth.resendIn <= 0) return state;
      return {
        ...state,
        shift: {
          ...s,
          elapsed: s.active ? s.elapsed + 1 : s.elapsed,
          resendIn: Math.max(0, s.resendIn - 1),
        },
        auth: { ...state.auth, resendIn: Math.max(0, state.auth.resendIn - 1) },
      };
    }
    default:
      return null;
  }
}
