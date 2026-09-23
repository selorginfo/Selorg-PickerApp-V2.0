import type { FieldValidationOpts } from '../types';

/** Aligned with selorg-service profile email check / Zod `.email()`. */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isPhone10 = (v: string) => /^\d{10}$/.test(v.replace(/\s/g, ''));
export const isPin6 = (v: string) => /^\d{6}$/.test(v);
export const isOtp4 = (v: string) => /^\d{4}$/.test(v);
export const isAadhaar12 = (v: string) => /^\d{12}$/.test(v.replace(/\s/g, ''));
export const isPan = (v: string) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.toUpperCase());
/** RBI IFSC format — same rule as selorg-service picker bank APIs. */
export const isIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
export const isBankAccount = (v: string) => /^\d{9,18}$/.test(v.replace(/\s/g, ''));
/** Same as selorg-service `UPI_RE`. */
export const isUpi = (v: string) => /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(v.trim());

export type ParsedDob = { iso: string; age: number };

/** Parse UI `DD/MM/YYYY` (optional spaces) or ISO `YYYY-MM-DD`; rejects invalid calendar dates. */
export function parseDisplayDob(input: string): ParsedDob | null {
  const cleaned = String(input || '').replace(/\s/g, '');
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cleaned);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  let y: number;
  let m: number;
  let d: number;
  if (dmy) {
    d = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
  } else if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
  const isoOut = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { iso: isoOut, age };
}

/** Mirrors Component.computeErr() from the source HTML + backend service rules. */
export function computeFieldError(val: string | undefined, opts: FieldValidationOpts): string {
  const v = String(val ?? '').trim();
  if (opts.req && !v) return 'This field is required';
  if (!v) return '';
  if (opts.maxLen != null && v.length > opts.maxLen) return `Max ${opts.maxLen} characters`;
  if (opts.phone && !isPhone10(v)) return 'Enter a valid 10-digit number';
  if (opts.pin && !isPin6(v)) return 'Enter a 6-digit pincode';
  if (opts.email && !isEmail(v)) return 'Enter a valid email address';
  if (opts.aadhaar && !isAadhaar12(v)) return 'Enter a 12-digit Aadhaar number';
  if (opts.pan && !isPan(v)) return 'Enter a valid PAN (ABCDE1234F)';
  if (opts.ifsc && !isIfsc(v)) return 'Enter a valid IFSC (e.g. HDFC0001234)';
  if (opts.bankAcc && !isBankAccount(v)) return 'Enter a 9–18 digit account number';
  if (opts.upi) {
    if (v.length < 3) return 'Enter a valid UPI ID';
    if (!isUpi(v)) return 'Enter a valid UPI ID (e.g. name@upi)';
  }
  if (opts.dob) {
    const parsed = parseDisplayDob(v);
    if (!parsed) return 'Use DD / MM / YYYY';
    if (parsed.age < 18) return 'Must be at least 18 years old';
  }
  return '';
}

export const digitsOnly = (v: string, max?: number) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return max ? d.slice(0, max) : d;
};

export const normalizeIfsc = (v: string) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);

export const last10Digits = (v: string) => String(v || '').replace(/\D/g, '').slice(-10);
