import type {
  AppNotification,
  DocItem,
  Faq,
  IconName,
  KeyValue,
  Payout,
  PerfCard,
  Picker,
  PickerStatus,
  ShiftOption,
  TrainingModule,
  WeekBar,
  WorkDay,
  WorkLocation,
} from './index';

/** Standard service envelope (unwrapped by `request`). */
export interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationMeta | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type OnboardingStateValue = 'ONBOARDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED';

export type NextScreen = 'main' | 'onboarding' | 'pending_review' | 'rejected' | 'suspended';

export interface VerifyOtpResult {
  token: string;
  expiresAt?: string;
  isNewUser: boolean;
  nextScreen?: NextScreen;
  onboardingStatus?: 'ONBOARDING_REQUIRED' | 'ONBOARDING_COMPLETED';
  user?: Partial<Picker> & {
    id?: string;
    status?: string;
    role?: string;
    workforceRole?: 'picker' | 'rider' | null;
    loginMethod?: 'mobile' | 'whatsapp' | 'email' | null;
  };
}

export type ApplicationNextAction = 'bank_details' | 'collect_device' | 'enter_app';

export interface VerificationStepDto {
  key: string;
  label: string;
  status: 'Done' | 'Verifying' | 'Pending' | string;
  done: boolean;
}

export interface OnboardingStateDto {
  state: OnboardingStateValue;
  step?: number;
  completedSteps?: number[];
  submittedForReviewAt?: string | null;
  rejectionReason?: string | null;
  status?: string;
  accountStatus?: string;
  statusMessage?: string | null;
  verification?: VerificationStepDto[];
  nextAction?: ApplicationNextAction | null;
  bankDetailsComplete?: boolean;
  deviceCollected?: boolean;
  canReapply?: boolean;
  documents?: Array<{ type?: string; status?: string; rejectionReason?: string | null }>;
}

export interface HubDto {
  id: string;
  name?: string;
  title?: string;
  sub?: string;
  address?: string | null;
  type?: string;
  distanceKm?: number | null;
  distanceDisplay?: string | null;
  coordinates?: { latitude: number | null; longitude: number | null };
  dispatchBays?: number | null;
  isActive?: boolean;
}

export interface AssignedDeviceDto {
  device: {
    id: string;
    model: string;
    status: string;
    battery: number | null;
    lastSynced: string | null;
  } | null;
  rows: KeyValue[];
}

export interface WalletBalanceDto {
  month: string;
  netPayout: string;
  payDate: string;
  available: string;
  availableAmount: number;
  pending?: string;
  pendingAmount?: number;
  currency?: string;
  bankLabel?: string | null;
  bankVerified?: boolean;
  bankStatus?: PayoutMethodStatus;
  bankSubmittedAt?: string | null;
  bankRejectionReason?: string | null;
  upiVerified?: boolean;
  upiStatus?: PayoutMethodStatus;
  upiSubmittedAt?: string | null;
  upiRejectionReason?: string | null;
  minWithdrawal?: number;
}

/** `none` means nothing submitted yet; everything else mirrors the admin review state. */
export type PayoutMethodStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface AttendanceSummaryDto {
  present: {
    window: string | null;
    punchedInOnTime: boolean;
    hoursToday: string;
    pct: number;
  };
  detailsRows: KeyValue[];
  ot: {
    totalHrs: string;
    rate: string;
    totalEarnings: string;
    weeks: { week: string; range: string; hrs: string; amt: string }[];
  };
  history: {
    month: string;
    dow: string[];
    cells: { n: string; tone: 'present' | 'half' | 'none' | 'empty'; selected: boolean }[];
    presentDays: number;
    halfDays: number;
  };
  stats: { presentDays: number; halfDays: number; otHours: number };
}

export interface WorkHistoryDto {
  month: string;
  summary: { present: string; overtime: string; total: string };
  rows: WorkDay[];
}

export interface MonthlySalaryDto {
  month: string;
  monthKey: string;
  currency: string;
  config: {
    monthlySalary: number;
    standardShiftHours: number;
    breakMinutes: number;
    startHandoverMinutes: number;
    endHandoverMinutes: number;
    productiveWorkMinutes: number;
    overtimeMultiplier: number;
    weekOffAllowance: number;
    weekOffWeekday: number;
    monthlyWorkingDays: number;
  };
  regular: {
    monthlySalary: number;
    monthlySalaryDisplay: string;
    dailySalary: number;
    dailySalaryDisplay: string;
    workingDays: number;
    weekOffs: number;
    weekOffsScheduled: number;
    weekOffsWorked: number;
    paidDays: number;
    unpaidLeave: number;
    leaveDeduction: number;
    leaveDeductionDisplay: string;
  };
  overtime: {
    otHours: number;
    otHoursDisplay: string;
    otRate: number;
    otRateDisplay: string;
    otEarnings: number;
    otEarningsDisplay: string;
    weekOffWorkHours: number;
    weekOffWorkEarnings: number;
    weekOffWorkEarningsDisplay: string;
  };
  finalSalary: number;
  finalSalaryDisplay: string;
  breakdown: {
    monthlySalary: string;
    workingDays: string;
    weekOffs: string;
    paidDays: string;
    unpaidLeave: string;
    leaveDeduction: string;
    otHours: string;
    otRate: string;
    otEarnings: string;
    weekOffWorkEarnings: string;
    finalSalary: string;
  };
  weekOffDates: string[];
  formula: {
    dailySalary: string;
    otHourlyRate: string;
    finalSalary: string;
  };
}

export interface PerformanceDto {
  cards: PerfCard[];
  todaysEarnings: string;
  hub: string | null;
  weekBars: WeekBar[];
  home?: { rank: string; accuracy: number; speedLabel: string; speedPct: number };
}

export interface HomeSummaryDto {
  picker: { id: string; name: string | null; initials: string; role: string };
  hub: {
    name: string | null;
    address: string | null;
    accuracy: string | null;
    onSite: boolean;
    /** Metres from device GPS to hub (null when GPS missing). */
    distanceM?: number | null;
    geofenceM?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  shift: {
    window: string | null;
    active: boolean;
    startedAt: string | null;
    elapsedSeconds: number;
    onBreak: boolean;
  };
  balance: { available: string; pending: string; availableAmount: number };
  orders: { count: number; pending: number; syncedLabel: string; progress: number };
  metrics: { todaysEarnings: string; incentivesToday: string };
  performance: { rank: string; accuracy: number; speedLabel: string; speedPct: number };
  device: { collected: boolean; id: string | null; copy: string | null };
  unreadNotifications: number;
}

export interface ShiftReadinessDto {
  ready: boolean;
  accuracyM: number;
  onSite: boolean;
  distanceM?: number | null;
  geofenceM?: number;
  hub?: string | null;
  hubLatitude?: number | null;
  hubLongitude?: number | null;
  blockers?: string[];
}

export interface BankAccountDto {
  id: string;
  accountHolderName: string;
  bankName: string | null;
  accountNumberMasked: string;
  ifscCode: string;
  branchName?: string | null;
  isVerified: boolean;
  isPrimary: boolean;
  verificationStatus?: PayoutMethodStatus;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  label: string;
}

export interface TrainingModuleDto extends TrainingModule {
  videoId?: string;
  url?: string | null;
  title?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

export interface ChatThreadDto {
  conversationId: string;
  status: string;
  agentOnline: boolean;
  messages: {
    id: string;
    me: boolean;
    text: string;
    senderName?: string | null;
    createdAt: string;
    readAt?: string | null;
  }[];
  unreadCount: number;
}

export interface PreferencesDto {
  pushNotifications: boolean;
  locationSharing: boolean;
  orderSoundAlerts: boolean;
  language: string;
  shiftReminders?: boolean;
  payoutAlerts?: boolean;
  incentiveUpdates?: boolean;
  push?: boolean;
  shiftRem?: boolean;
  payout?: boolean;
  incentive?: boolean;
  sound?: boolean;
  updatedAt?: string;
}

/** KYC document types accepted by `POST /documents`. */
export type KycDocumentType = 'aadhar' | 'pan' | 'dl' | 'rc' | 'ins';
export type KycDocumentSide = 'front' | 'back';

export interface DocumentDto {
  _id?: string;
  id?: string;
  type: string;
  side?: KycDocumentSide | null;
  /** Data URI or remote URL — prefer Base64-backed data URI from API. */
  url?: string;
  base64?: string;
  mimeType?: string;
  fileName?: string;
  status: string;
  documentNumber?: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  uploadedAt?: string;
}

export type {
  AppNotification,
  DocItem,
  Faq,
  IconName,
  KeyValue,
  Payout,
  PerfCard,
  Picker,
  PickerStatus,
  ShiftOption,
  TrainingModule,
  WeekBar,
  WorkDay,
  WorkLocation,
};
