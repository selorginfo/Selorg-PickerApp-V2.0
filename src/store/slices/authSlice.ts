import type { AppState } from '../state';
import { initialState } from '../state';
import type { Action } from '../actions';
import { digitsOnly } from '../../utils/validators';
import { config } from '../../constants/config';

export function authSlice(state: AppState, action: Action): AppState | null {
  switch (action.type) {
    case 'auth/setChannel':
      return { ...state, auth: { ...state.auth, channel: action.channel, loginNotFound: false, accountExists: false } };
    case 'auth/setIntent':
      return { ...state, auth: { ...state.auth, intent: action.value, loginNotFound: false, accountExists: false } };
    case 'auth/toggleIntent':
      return {
        ...state,
        auth: {
          ...state.auth,
          intent: state.auth.intent === 'signup' ? 'login' : 'signup',
          loginNotFound: false,
          accountExists: false,
        },
      };
    case 'auth/setLoginPhone':
      return { ...state, auth: { ...state.auth, loginPhone: digitsOnly(action.value, 10), loginNotFound: false, accountExists: false } };
    case 'auth/setLoginEmail':
      return { ...state, auth: { ...state.auth, loginEmail: action.value, loginNotFound: false, accountExists: false } };
    case 'auth/toggleAgree':
      return { ...state, auth: { ...state.auth, agree: !state.auth.agree } };
    case 'auth/setOtp':
      return { ...state, auth: { ...state.auth, otp: digitsOnly(action.value, config.otpLength) } };
    case 'auth/startResend':
      return { ...state, auth: { ...state.auth, otp: '', resendIn: config.resendCooldownSec }, shift: { ...state.shift, resendIn: config.resendCooldownSec } };
    case 'auth/setBusy':
      return { ...state, auth: { ...state.auth, busy: action.value } };
    case 'auth/setLoginNotFound':
      return { ...state, auth: { ...state.auth, loginNotFound: action.value, accountExists: false, busy: false } };
    case 'auth/setAccountExists':
      return { ...state, auth: { ...state.auth, accountExists: action.value, loginNotFound: false, busy: false } };
    case 'auth/loginSuccess':
      return {
        ...state,
        auth: {
          ...state.auth,
          token: action.token,
          isAuthenticated: true,
          sessionReady: true,
          busy: false,
          loginNotFound: false,
          accountExists: false,
        },
      };
    case 'auth/sessionReady':
      return { ...state, auth: { ...state.auth, sessionReady: true } };
    case 'auth/logout':
      return {
        ...initialState,
        // keep the demo profile / settings data seeded, only wipe session + progress
        profile: state.profile,
        settings: state.settings,
        auth: { ...initialState.auth, sessionReady: true },
      };
    default:
      return null;
  }
}
