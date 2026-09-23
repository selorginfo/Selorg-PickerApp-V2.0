# PICKER_COMPONENT_MAP.md

HTML / dc-template construct → React Native implementation. Every construct in the
source has a native counterpart; nothing renders through WebView/HTML.

## Structural / template language

| Source (`sc-*`, dc-runtime) | React Native |
|---|---|
| `<x-dc>` template + `Component extends DCLogic` | `src/store` (state + reducers) driving `src/screens` + `src/overlays` |
| `sc-if value="{{ x }}"` | conditional JSX (`{cond && <.../>}`) |
| `sc-for list="{{ xs }}" as="item"` | `.map()` / `FlatList` / `SectionList` |
| `{{ expr }}` text interpolation | `{value}` in `<Text>` |
| `sc-camel-on-click="{{ fn }}"` | `onPress` on `Pressable` |
| `style="{{ dynamicStyleString }}"` (JS builds inline CSS strings) | `StyleSheet` objects + conditional style arrays; dynamic bits stay inline props |
| `style-focus="border-color:#1E8E43"` | `onFocus/onBlur` state in `TextField` / `OtpInput` |
| `this.setState` / `renderVals()` | `useReducer` + slice reducers + selector hooks |
| `setInterval` timers (shift, resend, video, toast) | effects in `AppStore.tsx` + `setTimeout` in `useSupport` |

## HTML elements

| HTML | RN | File |
|---|---|---|
| `<div>` layout | `View` | everywhere |
| `<div class="vp">` scroller | `ScrollView` (`Screen`) | `components/common/Screen.tsx` |
| text nodes / `<span>` | `Text` | everywhere |
| `<button>` | `Pressable` | `PrimaryButton`, `OutlineButton`, inline |
| `<input>` / `<textarea>` | `TextInput` | `TextField`, `OtpInput`, sheet inputs |
| `<img src=logo>` | `Image` (`require('assets/images/selorg-logo.jpg')`) | Login, Otp, Chat |
| inline `<svg>` icons | `react-native-svg` `Svg/Path/Circle/Rect` | `components/icons/Icon.tsx` |
| CSS `box-shadow` | `shadow*` / `elevation` | `theme/spacing.ts` `shadows` |
| CSS `@keyframes spin/pulse/sheetUp/shimmer/blink` | `Animated` loops | `Skeleton`, `BottomSheet`, `Toast` |
| `position:absolute; inset:0` overlay | `Modal` + absolute `View` | `BottomSheet`, `TrainingVideoModal` |
| `overflow-x:auto` chip row (chat quick replies) | horizontal `ScrollView` | `ChatSupportScreen` |

## Widgets

| Source widget (builder fn) | RN component | File |
|---|---|---|
| `loginTab()` / `attTab()` / `tab()` segmented + tab bars | `SegmentedControl` (`pill`/`outline`), custom tab row, `BottomTabNavigator` | `components/inputs/SegmentedControl.tsx`, `AttendanceScreen`, `navigation/BottomTabNavigator.tsx` |
| `segOpt()` / `segOpt2()` segmented option | `SegmentedControl` `outline` | — |
| `toggleRow()` iOS switch | `Toggle` | `components/inputs/Toggle.tsx` |
| agree checkbox / `obAckBox` | `Checkbox` | `components/inputs/Checkbox.tsx` |
| `radioRow()` / `radioSel()` | `RadioCard` | `components/inputs/RadioCard.tsx` |
| OTP `<input letter-spacing:18>` | `OtpInput` | `components/inputs/OtpInput.tsx` |
| `iconBox()` chip | `IconChip` | `components/cards/IconChip.tsx` |
| status pills (`Verified` / `Pending` / `Present` / `Absent`…) | `StatusBadge` (5 tones) | `components/badges/StatusBadge.tsx` |
| `.skel` blocks | `Skeleton` | `components/feedback/Skeleton.tsx` |
| empty-state blocks (OT / payouts / notifications) | `EmptyState` | `components/feedback/EmptyState.tsx` |
| "Couldn't load dashboard" + Retry | `ErrorState` | `components/feedback/ErrorState.tsx` |
| kv rows (`deviceRows`, `attRows`, `bankFields`) | `KeyValueRow` | `components/lists/KeyValueRow.tsx` |
| SVG ring (`attRingDash`, training ring) | `ProgressRing` | `components/common/ProgressRing.tsx` |
| bar `<div style="width:98%">` | `ProgressBar` | `components/common/ProgressBar.tsx` |
| back-header row | `AppHeader` | `components/common/AppHeader.tsx` |
| offline banner | `OfflineBanner` | `components/common/OfflineBanner.tsx` |
| avatar tile (`RV`) | `Avatar` | `components/common/Avatar.tsx` |
| overlay sheets (`animation:sheetUp`) | `BottomSheet` (`bottom` / `center`) | `components/bottomSheets/BottomSheet.tsx` |
| toast pill | `Toast` | `overlays/Toast.tsx` |
| step tracker (`onbStep()`) | `StepTracker` | `screens/onboarding/steps/StepTracker.tsx` |
| icon set `Component.icon(name,…)` | `Icon` (37 names) | `components/icons/Icon.tsx` |

## Icon name mapping (`Component.icon` → `IconName`)

`home cal target user package zap trophy clock card wallet file settings phone
briefcase alert book check dollar box bell mail chat shield logout` — ported 1:1.
Added for inline SVGs: `chevronLeft chevronRight plus upload pin camera face
fingerprint play pause close send edit phoneDevice faceScan`.
