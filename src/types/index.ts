// ---------------------------------------------------------------------------
// Domain models — Selorg Picker (workforce app). Mirrors the backend enums in
// _source/uploads/04-picker-workflow.md + BACKEND_ALIGNMENT.md.
// ---------------------------------------------------------------------------

export type DataState = 'normal' | 'loading' | 'empty' | 'error' | 'offline';

// ---- auth ----
export type LoginChannel = 'mobile' | 'whatsapp' | 'email';
export type AuthIntent = 'login' | 'signup';

export interface AuthState {
  channel: LoginChannel;
  intent: AuthIntent;
  loginPhone: string;
  loginEmail: string;
  agree: boolean;
  otp: string;
  resendIn: number;
  token: string | null;
  isAuthenticated: boolean;
  /** False until cold-start session restore finishes. */
  sessionReady: boolean;
  busy: boolean;
  loginNotFound: boolean;
  accountExists: boolean;
}

// ---- picker / profile ----
export type PickerStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'DELETION_PENDING';
/** UI gate keys used by the Status screen. */
export type StatusGate = 'under_review' | 'approved' | 'rejected' | 'blocked' | 'suspended';

export interface Picker {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: PickerStatus;
  memberSince: string;
  hub: string;
  role: string;
  workforceRole?: 'picker' | 'rider' | null;
  loginMethod?: 'mobile' | 'whatsapp' | 'email' | null;
  photoUri?: string | null;
  dob?: string | null;
  gender?: string | null;
  altPhone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  upiId?: string | null;
  upiPayoutVerificationStatus?: 'none' | 'pending' | 'verified' | 'rejected' | null;
  upiPayoutRejectionReason?: string | null;
  upiPayoutSubmittedAt?: string | null;
  emergencyContact?: {
    name?: string | null;
    phone?: string | null;
    relation?: string | null;
  };
}

export interface EditProfileForm {
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
}

export interface PersonalInfoForm {
  altPhone: string;
  address: string;
  city: string;
  pincode: string;
  emgName: string;
  emgPhone: string;
  emgRel: 'Spouse' | 'Parent' | 'Sibling' | 'Friend';
}

export interface BankForm {
  holder: string;
  bank: string;
  acc: string;
  ifsc: string;
}

// ---- onboarding ----
export type ObStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type LocationType = 'Darkstore' | 'Warehouse' | '';

export interface OnboardingProfileForm {
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
}
export interface OnboardingKycForm {
  aadhaar: string;
  pan: string;
  aadhaarUrl: string;
  panUrl: string;
  aadhaarFileName?: string;
  panFileName?: string;
}

export interface WorkLocation {
  id: string;
  title: string;
  sub: string;
}
export interface ShiftOption {
  id: string;
  title: string;
  sub: string;
}
export interface TrainingModule {
  name: string;
  dur: string;
}

// ---- shift / attendance ----
export type ShiftStep = 'none' | 'location' | 'identity' | 'face' | 'fingerprint' | 'success';
export type AttendanceTab = 'details' | 'ot' | 'history';

export interface KeyValue {
  k: string;
  v: string;
}
export interface OtWeek {
  week: string;
  range: string;
  hrs: string;
  amt: string;
}
export interface WorkDay {
  date: string;
  hub: string;
  hrs: string;
  badge: string;
  tone: BadgeTone;
}
export interface CalendarCell {
  n: string;
  tone: 'present' | 'half' | 'none' | 'empty';
  selected: boolean;
}

// ---- performance ----
export interface PerfCard {
  icon: IconName;
  color: string;
  bg: string;
  value: string;
  label: string;
}
export interface WeekBar {
  d: string;
  pct: number;
  highlight: boolean;
}

// ---- wallet / payouts ----
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
export interface Payout {
  id?: string;
  month: string;
  date: string;
  mode: string;
  amt: string;
  /** Normalized lowercase status from API (`pending` | `completed` | …). */
  status?: string;
}

// ---- notifications ----
export interface AppNotification {
  id: string;
  icon: IconName;
  color: string;
  bg: string;
  title: string;
  body: string;
  time: string;
}

// ---- documents / device ----
export interface DocItem {
  id: string;
  name: string;
  num: string;
  verified: boolean;
  pending: boolean;
}

// ---- support ----
export interface ChatMessage {
  who: 'agent' | 'me';
  text: string;
  time: string;
}
export interface Faq {
  q: string;
  a: string;
}
export interface SettingsState {
  push: boolean;
  shiftRem: boolean;
  payout: boolean;
  incentive: boolean;
  sound: boolean;
}
/** Matches selorg-service `PICKER_LANGUAGES`. */
export type Language = 'en' | 'hi' | 'kn' | 'ta' | 'te';

// ---- shared UI ----
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type IconName =
  | 'home' | 'cal' | 'target' | 'user' | 'package' | 'zap' | 'trophy' | 'clock'
  | 'card' | 'wallet' | 'file' | 'settings' | 'phone' | 'briefcase' | 'alert'
  | 'book' | 'check' | 'dollar' | 'box' | 'bell' | 'mail' | 'chat' | 'shield'
  | 'logout' | 'chevronLeft' | 'chevronRight' | 'plus' | 'upload' | 'pin'
  | 'camera' | 'face' | 'fingerprint' | 'play' | 'pause' | 'close' | 'send'
  | 'edit' | 'phoneDevice' | 'faceScan' | 'lock';

export type FormSection = 'edit' | 'personal' | 'bank' | 'obProfile' | 'obKyc' | 'obBank';

export interface FieldValidationOpts {
  req?: boolean;
  phone?: boolean;
  pin?: boolean;
  email?: boolean;
  aadhaar?: boolean;
  pan?: boolean;
  /** Indian IFSC — 11 chars, 5th is 0 */
  ifsc?: boolean;
  /** Bank account number — 9–18 digits */
  bankAcc?: boolean;
  /** DOB display `DD/MM/YYYY` or ISO; age ≥ 18 (matches picker service). */
  dob?: boolean;
  /** UPI ID — matches picker service `UPI_RE`. */
  upi?: boolean;
  /** Max string length after trim. */
  maxLen?: number;
  multiline?: boolean;
}
