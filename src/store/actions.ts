import type {
  AttendanceTab, DataState, EditProfileForm, Language, LocationType,
  PersonalInfoForm, BankForm, SettingsState, ShiftStep, StatusGate,
} from '../types';

export type ProfileFormSection = 'edit' | 'personal' | 'bank';
export type ObFormSection = 'obProfile' | 'obKyc' | 'obBank';

export type Action =
  // ---- auth ----
  | { type: 'auth/setChannel'; channel: 'mobile' | 'whatsapp' | 'email' }
  | { type: 'auth/setIntent'; value: 'login' | 'signup' }
  | { type: 'auth/toggleIntent' }
  | { type: 'auth/setLoginPhone'; value: string }
  | { type: 'auth/setLoginEmail'; value: string }
  | { type: 'auth/toggleAgree' }
  | { type: 'auth/setOtp'; value: string }
  | { type: 'auth/startResend' }
  | { type: 'auth/setBusy'; value: boolean }
  | { type: 'auth/setLoginNotFound'; value: boolean }
  | { type: 'auth/setAccountExists'; value: boolean }
  | { type: 'auth/loginSuccess'; token: string }
  | { type: 'auth/sessionReady' }
  | { type: 'auth/logout' }
  // ---- profile forms ----
  | { type: 'profile/setField'; section: ProfileFormSection; key: string; value: string }
  | { type: 'profile/setAttempt'; section: ProfileFormSection | ObFormSection; value: boolean }
  | { type: 'profile/replaceEdit'; value: EditProfileForm }
  | { type: 'profile/replacePersonal'; value: PersonalInfoForm }
  | { type: 'profile/replaceBank'; value: BankForm }
  // ---- onboarding ----
  | { type: 'ob/setStep'; step: number }
  | { type: 'ob/setField'; section: ObFormSection; key: string; value: string }
  | { type: 'ob/setLocType'; value: LocationType }
  | { type: 'ob/setLocation'; value: string }
  | { type: 'ob/setShift'; value: string }
  | { type: 'ob/toggleTrain'; index: number }
  | { type: 'ob/setTrainDone'; index: number; value: boolean }
  | { type: 'ob/setFaceDone'; value: boolean }
  | { type: 'ob/setGate'; value: StatusGate }
  | { type: 'ob/statusLoading' }
  | { type: 'ob/statusFetched'; dto: import('../types/api').OnboardingStateDto }
  | { type: 'ob/statusFailed'; error: string }
  | { type: 'ob/setMgrOtp'; value: string }
  | { type: 'ob/setMgrSent'; value: boolean }
  | { type: 'ob/toggleDeviceAck' }
  | { type: 'ob/setDeviceCollected'; value: boolean }
  | { type: 'ob/setBankSaved'; value: boolean }
  // ---- shift ----
  | { type: 'shift/setStep'; step: ShiftStep }
  | { type: 'shift/startWork' }
  | { type: 'shift/checkout' }
  | { type: 'shift/tick' }
  // ---- attendance ----
  | { type: 'attendance/setTab'; tab: AttendanceTab }
  // ---- settings ----
  | { type: 'settings/toggle'; key: keyof SettingsState }
  | { type: 'settings/setLang'; value: Language }
  | { type: 'settings/hydrate'; value: Partial<SettingsState & { lang: Language }> }
  // ---- wallet ----
  | { type: 'wallet/openWithdraw' }
  | { type: 'wallet/closeWithdraw' }
  | { type: 'wallet/setAmount'; value: string }
  | { type: 'wallet/invalidateTxns' }
  // ---- support ----
  | { type: 'support/setChatInput'; value: string }
  | { type: 'support/pushMessage'; who: 'agent' | 'me'; text: string; time: string }
  | { type: 'support/setMessages'; messages: import('../types').ChatMessage[] }
  | { type: 'support/setTyping'; value: boolean }
  | { type: 'support/markTrainingDone'; index: number }
  // ---- ui ----
  | { type: 'ui/setDataState'; value: DataState }
  | { type: 'ui/setToast'; value: string | null }
  | { type: 'ui/setConfirmLogout'; value: boolean }
  | { type: 'ui/openDeviceSheet' }
  | { type: 'ui/closeDeviceSheet' }
  | { type: 'ui/setDeviceReason'; value: string }
  | { type: 'ui/openCollectSheet' }
  | { type: 'ui/closeCollectSheet' }
  | { type: 'ui/setFaqOpen'; index: number }
  | { type: 'ui/openVideo'; scope: 'ob' | 'profile'; index: number; title: string; videoId?: string }
  | { type: 'ui/toggleVideoPlay' }
  | { type: 'ui/setVideoProgress'; value: number }
  | { type: 'ui/closeVideo' }
  // ---- hydration ----
  | { type: 'hydrate'; partial: Partial<import('./state').AppState> };
