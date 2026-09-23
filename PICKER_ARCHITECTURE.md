# PICKER_ARCHITECTURE.md

React Native **CLI** (0.87.1) + **TypeScript** app reproducing
`_source/Selorg Picker Pro (Standalone).html`. Project root: `Selorg PickerApp V1.3/`.

## Stack

| Concern | Choice |
|---|---|
| Runtime | React Native CLI 0.87.1, React 19.2 |
| Language | TypeScript (strict via `@react-native/typescript-config`), **0 `tsc` errors** |
| Navigation | React Navigation 7 — native-stack + bottom-tabs, strongly typed (`navigationTypes.ts`) |
| State | Custom store: `useReducer` + slice reducers + `Context` (`src/store`). No Redux dep — the source is one component, so one store with domain slices mirrors it exactly. |
| Icons | `react-native-svg` (1:1 port of `Component.icon()`) |
| Persistence | `@react-native-async-storage/async-storage` (`auth`, `settings`, `onboarding` slices) |
| Gestures | `react-native-gesture-handler` + `react-native-screens` + `react-native-safe-area-context` |
| Data | Typed mock modules (`src/mock`) behind service layer; flip `config.USE_MOCKS = false` for live API |

## Folder structure

```
src/
├── assets/images/          selorg-logo.jpg (from bundle), selorg-logo.png, selorg-mark.png
├── assets/fonts/           Plus Jakarta Sans + JetBrains Mono .ttf drop-in (README inside)
├── components/
│   ├── icons/Icon.tsx              37-name SVG icon set
│   ├── common/                     Screen, AppHeader, OfflineBanner, ProgressBar,
│   │                               ProgressRing, SectionLabel, Avatar
│   ├── buttons/                     PrimaryButton, OutlineButton
│   ├── inputs/                      TextField, SegmentedControl, Checkbox, Toggle,
│   │                               RadioCard, OtpInput
│   ├── cards/                       Card, IconChip
│   ├── badges/StatusBadge.tsx       5 tones
│   ├── feedback/                    Skeleton, EmptyState, ErrorState
│   ├── lists/KeyValueRow.tsx
│   ├── bottomSheets/BottomSheet.tsx bottom + center (dialog) variants, sheetUp anim
│   └── dev/DataStateSwitcher.tsx    __DEV__ only — preview loading/empty/error/offline
├── screens/
│   ├── auth/                LoginScreen, OtpScreen
│   ├── onboarding/          OnboardingWizardScreen, StatusGateScreen, steps/1..8 + StepTracker
│   ├── dashboard/           HomeScreen
│   ├── attendance/          AttendanceScreen  (Details / OT / History tabs)
│   ├── performance/         PerformanceScreen
│   ├── profile/             ProfileScreen, EditProfileScreen, PersonalInfoScreen,
│   │                        DeviceStatusScreen, WorkHistoryScreen, DocumentsScreen, TrainingScreen
│   ├── payouts/             PayoutsScreen, BankDetailsScreen, UpiDetailsScreen
│   ├── notifications/       NotificationsScreen
│   └── support/             SupportSettingsScreen, FaqsScreen, ChatSupportScreen
├── overlays/                OverlayHost + ShiftVerifySheet, LogoutConfirmModal,
│                            DeviceIssueSheet, TrainingVideoModal, CollectDeviceSheet,
│                            WithdrawSheet, Toast
├── navigation/              RootNavigator, AuthNavigator, OnboardingNavigator,
│                            MainNavigator, BottomTabNavigator, navigationTypes, navigationRef
├── store/
│   ├── AppStore.tsx         provider: hydrate, persist, 1s tick, toast timeout, video progress
│   ├── state.ts             AppState shape + initialState (verbatim from Component.state)
│   ├── actions.ts           discriminated-union Action
│   ├── reducer.ts           rootReducer chaining slices
│   └── slices/              auth, profile, onboarding, shift, misc (attendance/settings/wallet/support), ui
├── hooks/                   useAuth, useOnboarding, useShift, useProfileForms, useWallet,
│                            useSupport, useSettings, useUI, useAttendance, useApiResource
├── services/
│   ├── api/                 client (fetch wrapper: baseURL, bearer, timeout, ApiError) +
│   │                        authApi, onboardingApi, shiftApi, attendanceApi, walletApi,
│   │                        profileApi, notificationApi, performanceApi, trainingApi, supportApi
│   ├── storage/storageService.ts   AsyncStorage JSON wrapper
│   └── scanner/scannerService.ts    documented stub (no scanner in source — HHD-only)
├── mock/                    profile, onboarding, attendance, performance, payouts, notifications,
│                            device, workHistory, documents, training, faqs, support, home
├── types/index.ts           domain models + enums (PickerStatus, WithdrawalStatus, …)
├── constants/config.ts      apiBaseUrl, USE_MOCKS, otpLength, resendCooldownSec, minWithdrawal…
├── theme/                   colors, typography (weight/mono helpers), spacing/radius/shadows
└── utils/                   validators (computeFieldError = Component.computeErr), formatters
App.tsx                      GestureHandlerRootView → SafeAreaProvider → AppStoreProvider →
                             NavigationContainer(RootNavigator) + OverlayHost + DataStateSwitcher
index.js                     import 'react-native-gesture-handler'; registerComponent
```

## Architecture principles applied

- **Screen** = layout only, reads a hook. No `fetch`/business logic in screens.
- **Hook** = coordinates store + services + navigation (thunks like `sendOtp`, `next`, `save`, `submitWithdraw`).
- **Service** = the only place that talks to the network (or returns a typed mock).
- **Store** = shared state (auth, shift timer, onboarding progress, forms, toasts, overlays).
- **Types** = one `types/index.ts` barrel, no gratuitous `any` (a couple of `unknown`-guarded casts for the generic form helpers).
- **Theme** = every colour / size is a token pulled from the HTML inline styles.
- **Navigation** = typed param lists, `navigationRef` for thunk-initiated transitions.

## Navigation graph

```
RootNavigator (native-stack, initialRoute derived from persisted auth)
├── Auth (native-stack)            Login → Otp
├── Onboarding (native-stack)      Wizard(obStep 1-8) ↔ Status(gate)
└── Main (native-stack)
    ├── Tabs (bottom-tabs)         Home · Attendance · Performance · Profile
    ├── Payouts → BankDetails / UpiDetails
    ├── Notifications
    ├── EditProfile / PersonalInfo / DeviceStatus / WorkHistory / Documents / Training
    └── SupportSettings → Faqs / ChatSupport
```
Flow transitions (mirrors the HTML `go()` calls): Otp verify → `Onboarding/Wizard`;
step 7 → `Onboarding/Status`; approved → step 8 → `Wizard`; step 8 finish / "Preview
dashboard" → `Main`; logout → reset `Auth`.

## State management

`AppState` (see `store/state.ts`) is a faithful transcription of `Component.state`:
`auth · profile{edit,personal,bank,attempts} · onboarding{step,profile,kyc,bank,locType,
location,shift,trainDone,faceDone,gate,mgr*,deviceCollected} · shift{step,active,elapsed,
resendIn} · attendance{tab} · settings · wallet{wdSheet,wdAmount,wdBank,wdKey} ·
support{chatMsgs,chatInput,chatTyping,profTrainDone} · ui{dataState,toast,confirmLogout,
deviceSheet,deviceReason,collectSheet,faqOpen,video*}`.

Slice reducers each own a `type`-prefixed action namespace; `rootReducer` tries each.
Timers live in `AppStoreProvider` effects: 1 s `shift/tick` (shift timer + OTP resend
countdown), toast auto-dismiss (2.2 s), training-video progress (~6 s clip → auto-marks
module done). Chat agent auto-reply (1.4 s) is a `setTimeout` in `useSupport`.

## Services / API architecture

`services/api/client.ts` — `request<T>(path, {method,body,query,auth})`: prepends
`config.apiBaseUrl` (`/api/v1/picker`), sets JSON headers, attaches `Bearer` token from
storage, aborts after `config.apiTimeoutMs`, normalises failures to `ApiError`. Each domain
module (`authApi`, `walletApi`, …) exposes typed methods and, while `config.USE_MOCKS`,
returns `mockResponse(fixture, delay)` so loading states are exercised without a backend.
Endpoint names track `_source/uploads/04-picker-workflow.md` / `BACKEND_ALIGNMENT.md`
(`/auth/*`, `/shifts/*`, `/wallet/withdraw {amount,idempotencyKey}`, `/manager/*`, …).
Withdrawal reuses `wdKey` as the idempotency key on retry (18 §must-not-double-call).

## Authentication

OTP login (mobile / WhatsApp / email channel) → 4-digit verify → token stored via
`storageService` and `auth.isAuthenticated`. Resend has a 24 s cooldown driven by the
global tick. Logout is **local only** (no API) — confirm dialog → wipe session + progress
→ reset to `Auth` (matches `BACKEND_ALIGNMENT.md`). `RootNavigator` picks the initial
flow from the persisted `auth`/`onboarding` slices.

## Scanner architecture

`services/scanner/scannerService.ts` is a **documented stub** returning `isAvailable() =
false`. The source app has no scanner / order-pick / scan-result UI — that is a separate
HHD app. The stub + `ScanResult` type keep the seam ready for a future
`react-native-vision-camera` integration without inventing UI the design doesn't contain.

## Mock data

`src/mock/*` — every list/figure from `Component.renderVals()` transcribed verbatim
(profile menu, onboarding locations/shifts/training, attendance rows + March-2026
calendar, OT weeks, performance tiles + week bars, payout history, notifications, device
rows, work-history rows, documents, FAQs, help actions, settings rows, home figures).

## Theme

`theme/colors.ts` (≈55 tokens), `theme/typography.ts` (`weight(500|600|700|800)` →
Plus Jakarta Sans family + RN weight; `mono(size)` → JetBrains Mono; named `text` roles),
`theme/spacing.ts` (`spacing`, `radius`, `shadows`). No invented values.

## Assets

- `selorg-logo.jpg` — extracted from the HTML bundle (`0a666212…`), used on Login / Otp / Chat.
- `selorg-logo.png`, `selorg-mark.png` — from `_source/assets/`.
- Fonts: drop the 6 `.ttf` files into `src/assets/fonts/` and run `npx react-native-asset`
  (`react-native.config.js` already lists the folder). Graceful system-font fallback until then.

## Environment configuration

`src/constants/config.ts` holds `apiBaseUrl`, `apiTimeoutMs`, `USE_MOCKS`, `otpLength`,
`resendCooldownSec`, `minWithdrawal`, `geofenceMeters`, support contacts, `appVersion`.
For multi-env, override these from `process.env` via a `.env` + `react-native-config`
(not added — single config object is enough for the prototype).

## Running

```bash
cd "Selorg PickerApp V1.3"
npm install
npx react-native start          # Metro
npx react-native run-android    # device/emulator required
```
`npm run lint` — 0 errors. `npx tsc --noEmit` — 0 errors.
`__DEV__` build shows a small "DS" button (bottom-right) to preview the
loading / empty / error / offline data-states.
