import { config } from '../../constants/config';
import { ApiError, request, mockResponse } from './client';
import type { LoginChannel } from '../../types';
import type { OnboardingStateDto, VerifyOtpResult } from '../../types/api';

const PICKER_ROLE = 'picker' as const;

type SendOtpResponse = {
  ok?: boolean;
  channel?: string;
  message?: string;
  deliveryStatus?: 'sent' | 'failed';
  smsDelivered?: boolean;
};

/**
 * Backend must never return a usable OTP. Treat deliveryStatus === 'failed'
 * as a hard error so the OTP screen is not shown when no SMS/email was sent.
 */
function assertOtpDelivered<T extends SendOtpResponse>(data: T): T {
  if (data && typeof data === 'object') {
    const copy = { ...data } as T & { otp?: unknown };
    delete copy.otp;
    if (copy.deliveryStatus === 'failed') {
      const channel = String(copy.channel || '').toLowerCase();
      const mobile = channel === 'sms' || channel === 'whatsapp';
      throw new ApiError(
        502,
        mobile
          ? 'Mobile OTP is unavailable right now. Use Email to sign in.'
          : copy.message || 'Unable to send OTP. Please try again.',
        copy,
        'OTP_PROVIDER_ERROR',
      );
    }
    return copy;
  }
  return data;
}

export const authApi = {
  sendOtp(payload: { channel: LoginChannel; contact: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<SendOtpResponse>('/auth/send-otp-email', {
        method: 'POST',
        body: { email: payload.contact, intent: payload.intent, workforceRole: PICKER_ROLE },
        auth: false,
        timeoutMs: config.otpRequestTimeoutMs,
      }).then(assertOtpDelivered);
    }
    return request<SendOtpResponse>('/auth/send-otp', {
      method: 'POST',
      body: {
        phone: payload.contact,
        preferredChannel: payload.channel === 'whatsapp' ? 'whatsapp' : 'sms',
        intent: payload.intent,
        workforceRole: PICKER_ROLE,
      },
      auth: false,
      timeoutMs: config.otpRequestTimeoutMs,
    }).then(assertOtpDelivered);
  },

  resendOtp(payload: { channel: LoginChannel; contact: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<SendOtpResponse>('/auth/resend-otp-email', {
        method: 'POST',
        body: { email: payload.contact, intent: payload.intent, workforceRole: PICKER_ROLE },
        auth: false,
        timeoutMs: config.otpRequestTimeoutMs,
      }).then(assertOtpDelivered);
    }
    return request<SendOtpResponse>('/auth/resend-otp', {
      method: 'POST',
      body: { phone: payload.contact, intent: payload.intent, workforceRole: PICKER_ROLE },
      auth: false,
      timeoutMs: config.otpRequestTimeoutMs,
    }).then(assertOtpDelivered);
  },

  verifyOtp(payload: { channel: LoginChannel; contact: string; otp: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<VerifyOtpResult>('/auth/verify-otp-email', {
        method: 'POST',
        body: { email: payload.contact, otp: payload.otp, intent: payload.intent, workforceRole: PICKER_ROLE },
        auth: false,
        timeoutMs: 15000,
      });
    }
    return request<VerifyOtpResult>('/auth/verify-otp', {
      method: 'POST',
      body: {
        phone: payload.contact,
        otp: payload.otp,
        intent: payload.intent,
        preferredChannel: payload.channel === 'whatsapp' ? 'whatsapp' : 'sms',
        workforceRole: PICKER_ROLE,
      },
      auth: false,
      timeoutMs: 15000,
    });
  },

  onboardingState() {
    if (config.USE_MOCKS) return mockResponse<OnboardingStateDto>({ state: 'ONBOARDING' });
    return request<OnboardingStateDto>('/onboarding/state');
  },

  logout() {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request<{ ok?: boolean }>('/auth/logout', { method: 'POST', skipAuthRecovery: true });
  },

  refresh() {
    if (config.USE_MOCKS) return mockResponse<VerifyOtpResult>({ token: 'mock-jwt-token', isNewUser: false });
    // skipAuthRecovery: refresh itself must not recurse into another refresh on 401
    return request<VerifyOtpResult>('/auth/refresh', { method: 'POST', skipAuthRecovery: true });
  },
};
