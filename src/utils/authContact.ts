import type { LoginChannel } from '../types';
import { last10Digits } from './validators';

export type PickerLoginMethod = 'mobile' | 'whatsapp' | 'email' | null;

export interface AuthContactInput {
  loginMethod?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Auth-session fallbacks while profile is loading / right after OTP. */
  channel?: LoginChannel | null;
  loginPhone?: string | null;
  loginEmail?: string | null;
}

export interface AuthContact {
  loginMethod: PickerLoginMethod;
  /** True when account was created/verified via phone or WhatsApp OTP. */
  phoneLocked: boolean;
  /** True when account was created/verified via email OTP. */
  emailLocked: boolean;
  /** 10-digit phone to show/prefill (empty for email-login until user adds one). */
  phone: string;
  /** Email to show/prefill. */
  email: string;
}

function normalizeLoginMethod(raw?: string | null): PickerLoginMethod {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'email') return 'email';
  if (v === 'whatsapp') return 'whatsapp';
  if (v === 'mobile' || v === 'sms' || v === 'phone') return 'mobile';
  return null;
}

function methodFromChannel(channel?: LoginChannel | null): PickerLoginMethod {
  if (channel === 'email') return 'email';
  if (channel === 'whatsapp') return 'whatsapp';
  if (channel === 'mobile') return 'mobile';
  return null;
}

/** Format 10-digit IN mobile for display. */
export function formatInPhone(digits: string): string {
  const d = last10Digits(digits);
  if (d.length !== 10) return digits?.trim() || '';
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/**
 * Resolve which contact fields are locked to the login identity and what to prefill.
 * Prefer persisted `loginMethod` from the API; fall back to the current auth channel.
 */
export function resolveAuthContact(input: AuthContactInput): AuthContact {
  const loginMethod =
    normalizeLoginMethod(input.loginMethod) || methodFromChannel(input.channel);

  const phoneLocked = loginMethod === 'mobile' || loginMethod === 'whatsapp';
  const emailLocked = loginMethod === 'email';

  const sessionPhone = last10Digits(input.loginPhone || '');
  const profilePhone = last10Digits(input.phone || '');
  const sessionEmail = String(input.loginEmail || '').trim().toLowerCase();
  const profileEmail = String(input.email || '').trim().toLowerCase();

  let phone = '';
  if (phoneLocked) {
    phone = profilePhone || sessionPhone;
  } else if (!emailLocked && profilePhone) {
    phone = profilePhone;
  } else if (emailLocked && profilePhone && profilePhone !== sessionPhone) {
    // Email accounts use a synthetic phone at signup — only surface a later real number.
    // If profile phone equals nothing useful from session, still allow a stored 6–9xxxxxx IN number.
    if (/^[6-9]\d{9}$/.test(profilePhone)) phone = profilePhone;
  }

  let email = '';
  if (emailLocked) {
    email = profileEmail || sessionEmail;
  } else {
    email = profileEmail;
  }

  return { loginMethod, phoneLocked, emailLocked, phone, email };
}
