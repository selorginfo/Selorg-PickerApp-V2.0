import { useCallback, useState } from 'react';
import { useStore } from '../store/AppStore';
import { authApi } from '../services/api/authApi';
import { registerDevicePushToken } from '../services/api/notificationApi';
import { type ApiError, isApiError } from '../services/api/client';
import { ensureReachableApiHost, HostUnreachableError } from '../constants/config';
import { resolvePostAuthDestination } from '../services/api/mappers';
import { resolvePushToken } from '../services/push/pushTokenProvider';
import { storageService } from '../services/storage/storageService';
import { isEmail, isPhone10, isOtp4 } from '../utils/validators';
import { resetTo, navigate, resetToNested } from '../navigation/navigationRef';
import type { AuthIntent, LoginChannel } from '../types';

const ACCOUNT_NOT_FOUND_CODES = new Set(['USER_NOT_FOUND', 'ACCOUNT_NOT_FOUND']);
const ACCOUNT_EXISTS_CODES = new Set([
  'PHONE_EXISTS',
  'EMAIL_EXISTS',
  'USER_EXISTS',
  'PHONE_ALREADY_REGISTERED',
  'EMAIL_ALREADY_REGISTERED',
  'PHONE_AND_EMAIL_ALREADY_REGISTERED',
]);

function toastErrorMessage(e: unknown, fallback: string): string {
  if (isApiError(e)) return e.message;
  if (e instanceof HostUnreachableError) return e.message;
  return (e as Error)?.message || fallback;
}

function isAccountNotFound(error: ApiError): boolean {
  return ACCOUNT_NOT_FOUND_CODES.has(String(error.appCode || ''));
}

function isAccountExists(error: ApiError): boolean {
  return ACCOUNT_EXISTS_CODES.has(String(error.appCode || ''));
}

/** Best-effort push registration — skipped when no FCM/APNs provider is configured. */
async function tryRegisterPush(): Promise<void> {
  try {
    const token = await resolvePushToken();
    await registerDevicePushToken(token);
  } catch {
    // Non-blocking: login must succeed even if push registration fails.
  }
}

function goToDestination(dest: 'Main' | 'Onboarding' | 'Status') {
  if (dest === 'Main') {
    resetTo('Main');
    return;
  }
  if (dest === 'Status') {
    resetToNested('Onboarding', 'Status');
    return;
  }
  resetTo('Onboarding');
}

export function useAuth() {
  const { state, dispatch } = useStore();
  const { auth } = state;
  const [resending, setResending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isSignup = auth.intent === 'signup';
  const contactOk = isSignup
    ? isPhone10(auth.loginPhone) && isEmail(auth.loginEmail)
    : auth.channel === 'email'
      ? isEmail(auth.loginEmail)
      : isPhone10(auth.loginPhone);
  const canSend = contactOk && auth.agree && !auth.busy;
  const canVerify = isOtp4(auth.otp) && !auth.busy;

  const contact = auth.channel === 'email' ? auth.loginEmail : auth.loginPhone;

  const otpDest = isSignup
    ? auth.loginEmail || 'your email'
    : auth.channel === 'email'
      ? auth.loginEmail || 'your email'
      : `+91 ${auth.loginPhone || ''}`;
  const otpChannelLabel = isSignup
    ? 'Email'
    : auth.channel === 'email'
      ? 'Email'
      : auth.channel === 'whatsapp'
        ? 'WhatsApp'
        : 'SMS';

  const sendOtp = useCallback(async (intentOverride?: AuthIntent) => {
    if (auth.busy) return;
    const intent = intentOverride ?? auth.intent;
    const signup = intent === 'signup';

    if (signup) {
      if (!isPhone10(auth.loginPhone)) {
        dispatch({ type: 'ui/setToast', value: 'Enter a 10-digit mobile number' });
        return;
      }
      if (!isEmail(auth.loginEmail)) {
        dispatch({ type: 'ui/setToast', value: 'Enter a valid email address' });
        return;
      }
    } else if (auth.channel === 'email' && !isEmail(auth.loginEmail)) {
      dispatch({ type: 'ui/setToast', value: 'Enter a valid email address' });
      return;
    } else if (auth.channel !== 'email' && !isPhone10(auth.loginPhone)) {
      dispatch({ type: 'ui/setToast', value: 'Enter a 10-digit mobile number' });
      return;
    }

    if (!auth.agree) {
      dispatch({ type: 'ui/setToast', value: 'Please accept the Terms to continue' });
      return;
    }

    dispatch({ type: 'auth/setBusy', value: true });
    try {
      await ensureReachableApiHost();
      if (signup) {
        await authApi.checkRegistration(auth.loginPhone, auth.loginEmail);
        await authApi.sendRegistrationOtp(auth.loginPhone, auth.loginEmail);
      } else {
        await authApi.sendOtp({
          channel: auth.channel,
          contact: auth.channel === 'email' ? auth.loginEmail : auth.loginPhone,
          intent: 'login',
        });
      }
      if (intentOverride && intentOverride !== auth.intent) {
        dispatch({ type: 'auth/setIntent', value: intentOverride });
      }
      dispatch({ type: 'auth/startResend' });
      dispatch({ type: 'auth/setOtp', value: '' });
      dispatch({
        type: 'ui/setToast',
        value: signup || auth.channel === 'email' ? 'OTP sent to your email' : 'OTP sent via SMS',
      });
      navigate('Auth', { screen: 'Otp' });
    } catch (e) {
      const err = isApiError(e) ? e : null;
      if (err && isAccountNotFound(err)) {
        dispatch({ type: 'auth/setLoginNotFound', value: true });
        dispatch({ type: 'ui/setToast', value: err.message });
        return;
      }
      if (err && isAccountExists(err)) {
        dispatch({ type: 'auth/setAccountExists', value: true });
        dispatch({ type: 'ui/setToast', value: err.message });
        return;
      }
      dispatch({ type: 'ui/setToast', value: toastErrorMessage(e, 'Network unavailable.') });
    } finally {
      dispatch({ type: 'auth/setBusy', value: false });
    }
  }, [auth, dispatch]);

  const verifyOtp = useCallback(async () => {
    if (auth.busy) return;
    if (!isOtp4(auth.otp)) {
      dispatch({ type: 'ui/setToast', value: 'Enter the 4-digit OTP' });
      return;
    }
    if (auth.intent === 'signup') {
      if (!isPhone10(auth.loginPhone) || !isEmail(auth.loginEmail)) {
        dispatch({ type: 'ui/setToast', value: 'Phone and email are required to create an account' });
        resetToNested('Auth', 'Login');
        return;
      }
    }
    dispatch({ type: 'auth/setBusy', value: true });
    try {
      await ensureReachableApiHost();
      const otp = String(auth.otp || '').replace(/\D/g, '').slice(0, 4);
      const res =
        auth.intent === 'signup'
          ? await authApi.verifyRegistrationOtp(auth.loginPhone, auth.loginEmail, otp)
          : await authApi.verifyOtp({
              channel: auth.channel,
              contact: auth.channel === 'email' ? auth.loginEmail : auth.loginPhone,
              otp,
              intent: 'login',
            });
      if (!res?.token) {
        dispatch({ type: 'ui/setToast', value: 'Login failed — no token returned' });
        return;
      }
      await storageService.set('token', res.token);
      dispatch({ type: 'auth/loginSuccess', token: res.token });

      const workforceRole = res.user?.workforceRole;
      const displayRole = String(res.user?.role || '').trim();
      if (workforceRole === 'rider' || displayRole === 'Rider') {
        await storageService.remove('token');
        dispatch({ type: 'auth/logout' });
        dispatch({
          type: 'ui/setToast',
          value: 'This account is registered as a Rider. Please use the Rider app.',
        });
        return;
      }

      tryRegisterPush().catch(() => undefined);

      let obState = null;
      try {
        obState = await authApi.onboardingState();
      } catch {
        obState = null;
      }

      if (obState?.state) {
        dispatch({ type: 'ob/statusFetched', dto: obState });
      }

      const dest = resolvePostAuthDestination({
        dto: obState,
        nextScreen: res.nextScreen,
        isNewUser: res.isNewUser,
        intent: auth.intent,
      });

      if (dest === 'Onboarding' && obState?.step && obState.step >= 1 && obState.step <= 8) {
        dispatch({ type: 'ob/setStep', step: obState.step as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 });
      }

      goToDestination(dest);
    } catch (e) {
      const err = isApiError(e) ? e : null;
      if (err && isAccountNotFound(err)) {
        dispatch({ type: 'auth/setLoginNotFound', value: true });
        dispatch({ type: 'ui/setToast', value: err.message });
        resetToNested('Auth', 'Login');
        return;
      }
      if (err && isAccountExists(err)) {
        dispatch({ type: 'auth/setAccountExists', value: true });
        dispatch({ type: 'ui/setToast', value: err.message });
        resetToNested('Auth', 'Login');
        return;
      }
      dispatch({ type: 'ui/setToast', value: toastErrorMessage(e, 'OTP verification failed') });
    } finally {
      dispatch({ type: 'auth/setBusy', value: false });
    }
  }, [auth, dispatch]);

  const resendOtp = useCallback(async () => {
    if (auth.resendIn > 0 || auth.busy || resending) return;
    setResending(true);
    try {
      if (auth.intent === 'signup') {
        await authApi.resendRegistrationOtp(auth.loginPhone, auth.loginEmail);
      } else {
        await authApi.resendOtp({
          channel: auth.channel,
          contact: auth.channel === 'email' ? auth.loginEmail : auth.loginPhone,
          intent: 'login',
        });
      }
      dispatch({ type: 'auth/startResend' });
      dispatch({ type: 'auth/setOtp', value: '' });
      dispatch({
        type: 'ui/setToast',
        value:
          auth.intent === 'signup' || auth.channel === 'email'
            ? 'OTP resent to your email'
            : 'OTP resent via SMS',
      });
    } catch (e) {
      dispatch({ type: 'ui/setToast', value: toastErrorMessage(e, 'Failed to resend OTP') });
    } finally {
      setResending(false);
    }
  }, [auth, dispatch, resending]);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Always clear local session even if the network call fails
    }
    await storageService.remove('token');
    dispatch({ type: 'auth/logout' });
    dispatch({ type: 'ui/setConfirmLogout', value: false });
    setLoggingOut(false);
    resetTo('Auth');
  }, [dispatch, loggingOut]);

  return {
    ...auth,
    contact,
    contactOk,
    canSend,
    canVerify,
    otpDest,
    otpChannelLabel,
    resending,
    loggingOut,
    setChannel: (channel: LoginChannel) => dispatch({ type: 'auth/setChannel', channel }),
    setIntent: (value: AuthIntent) => dispatch({ type: 'auth/setIntent', value }),
    toggleIntent: () => dispatch({ type: 'auth/toggleIntent' }),
    setLoginPhone: (value: string) => dispatch({ type: 'auth/setLoginPhone', value }),
    setLoginEmail: (value: string) => dispatch({ type: 'auth/setLoginEmail', value }),
    toggleAgree: () => dispatch({ type: 'auth/toggleAgree' }),
    setOtp: (value: string) => dispatch({ type: 'auth/setOtp', value }),
    sendOtp,
    continueAsSignup: () => sendOtp('signup'),
    continueAsLogin: () => sendOtp('login'),
    verifyOtp,
    resendOtp,
    logout,
  };
}
