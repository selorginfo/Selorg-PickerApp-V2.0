import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { LoginChannel } from '../../types';
import type { OnboardingStateDto, VerifyOtpResult } from '../../types/api';

export const authApi = {
  sendOtp(payload: { channel: LoginChannel; contact: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<{ ok?: boolean; smsDelivered?: boolean }>('/auth/send-otp-email', {
        method: 'POST',
        body: { email: payload.contact, intent: payload.intent },
        auth: false,
        timeoutMs: config.otpRequestTimeoutMs,
      });
    }
    return request<{ ok?: boolean; smsDelivered?: boolean }>('/auth/send-otp', {
      method: 'POST',
      body: {
        phone: payload.contact,
        preferredChannel: payload.channel === 'whatsapp' ? 'whatsapp' : 'sms',
        intent: payload.intent,
      },
      auth: false,
      timeoutMs: config.otpRequestTimeoutMs,
    });
  },

  resendOtp(payload: { channel: LoginChannel; contact: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<{ ok?: boolean; smsDelivered?: boolean }>('/auth/resend-otp-email', {
        method: 'POST',
        body: { email: payload.contact, intent: payload.intent },
        auth: false,
        timeoutMs: config.otpRequestTimeoutMs,
      });
    }
    return request<{ ok?: boolean; smsDelivered?: boolean }>('/auth/resend-otp', {
      method: 'POST',
      body: { phone: payload.contact, intent: payload.intent },
      auth: false,
      timeoutMs: config.otpRequestTimeoutMs,
    });
  },

  verifyOtp(payload: { channel: LoginChannel; contact: string; otp: string; intent: 'login' | 'signup' }) {
    if (config.USE_MOCKS) {
      throw new Error('Mock OTP is disabled — configure the API SMS provider');
    }
    if (payload.channel === 'email') {
      return request<VerifyOtpResult>('/auth/verify-otp-email', {
        method: 'POST',
        body: { email: payload.contact, otp: payload.otp, intent: payload.intent, workforceRole: 'picker' },
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
        workforceRole: 'picker',
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
