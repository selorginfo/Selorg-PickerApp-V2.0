import type {
  AttendanceTab, AuthState, BankForm, ChatMessage, DataState, EditProfileForm,
  Language, LocationType, ObStep, OnboardingKycForm, OnboardingProfileForm,
  PersonalInfoForm, SettingsState, ShiftStep, StatusGate,
} from '../types';

export interface AttemptFlags {
  edit: boolean; personal: boolean; bank: boolean;
  obProfile: boolean; obKyc: boolean; obBank: boolean;
}

export interface AppState {
  auth: AuthState;

  profile: {
    edit: EditProfileForm;
    personal: PersonalInfoForm;
    bank: BankForm;
    attempts: AttemptFlags;
  };

  onboarding: {
    step: ObStep;
    profile: OnboardingProfileForm;
    kyc: OnboardingKycForm;
    bank: BankForm;
    locType: LocationType;
    location: string;
    shift: string;
    trainDone: boolean[];
    faceDone: boolean;
    gate: StatusGate;
    statusHydrated: boolean;
    statusLoading: boolean;
    statusError: string | null;
    application: {
      rejectionReason: string | null;
      statusMessage: string | null;
      verification: { key: string; label: string; status: string; done: boolean }[];
      nextAction: 'bank_details' | 'collect_device' | 'enter_app' | null;
      canReapply: boolean;
    } | null;
    mgrOtp: string;
    mgrSent: boolean;
    deviceAck: boolean;
    deviceCollected: boolean;
    /** Step 8 bank API succeeded — show SUCCESS before entering Main. */
    bankSaved: boolean;
  };

  shift: {
    step: ShiftStep;
    active: boolean;
    elapsed: number;
    resendIn: number; // shared 1s tick w/ auth resend
  };

  attendance: { tab: AttendanceTab };

  settings: SettingsState & { lang: Language };

  wallet: {
    wdSheet: boolean;
    wdAmount: string;
    wdBank: string;
    wdKey: string | null;
    /** Bumped after a successful withdraw so payout screens refetch history. */
    txNonce: number;
  };

  support: {
    chatMsgs: ChatMessage[];
    chatInput: string;
    chatTyping: boolean;
    profTrainDone: boolean[];
  };

  ui: {
    dataState: DataState;
    toast: string | null;
    confirmLogout: boolean;
    deviceSheet: boolean;
    deviceReason: string;
    collectSheet: boolean;
    faqOpen: number;
    videoOpen: boolean;
    videoScope: 'ob' | 'profile' | '';
    videoIdx: number;
    videoId: string | null;
    videoTitle: string;
    videoPlaying: boolean;
    videoProgress: number;
  };
}

export const initialState: AppState = {
  auth: {
    channel: 'mobile',
    intent: 'login',
    loginPhone: '',
    loginEmail: '',
    agree: false,
    otp: '',
    resendIn: 0,
    token: null,
    isAuthenticated: false,
    sessionReady: false,
    busy: false,
    loginNotFound: false,
    accountExists: false,
  },
  profile: {
    edit: { name: '', dob: '', gender: 'male', email: '', phone: '' },
    personal: {
      altPhone: '', address: '', city: '', pincode: '',
      emgName: '', emgPhone: '', emgRel: 'Parent',
    },
    bank: { holder: '', bank: '', acc: '', ifsc: '' },
    attempts: { edit: false, personal: false, bank: false, obProfile: false, obKyc: false, obBank: false },
  },
  onboarding: {
    step: 1,
    profile: { name: '', dob: '', gender: 'male', phone: '', email: '' },
    kyc: { aadhaar: '', pan: '', aadhaarUrl: '', panUrl: '' },
    bank: { holder: '', bank: '', acc: '', ifsc: '' },
    locType: '',
    location: '',
    shift: '',
    trainDone: [false, false, false, false],
    faceDone: false,
    gate: 'under_review',
    statusHydrated: false,
    statusLoading: false,
    statusError: null,
    application: null,
    mgrOtp: '',
    mgrSent: false,
    deviceAck: false,
    deviceCollected: false,
    bankSaved: false,
  },
  shift: { step: 'none', active: false, elapsed: 0, resendIn: 0 },
  attendance: { tab: 'details' },
  settings: { push: true, shiftRem: true, payout: true, incentive: false, sound: true, lang: 'en' },
  wallet: { wdSheet: false, wdAmount: '', wdBank: '', wdKey: null, txNonce: 0 },
  support: {
    chatMsgs: [],
    chatInput: '',
    chatTyping: false,
    profTrainDone: [false, false, false, false],
  },
  ui: {
    dataState: 'normal',
    toast: null,
    confirmLogout: false,
    deviceSheet: false,
    deviceReason: '',
    collectSheet: false,
    faqOpen: -1,
    videoOpen: false,
    videoScope: '',
    videoIdx: -1,
    videoId: null,
    videoTitle: '',
    videoPlaying: false,
    videoProgress: 0,
  },
};
