# PICKER_INTERACTION_AUDIT.md

Every interactive element from `Component` (`template.html:1375‑1969`). RN column = the
native primitive; Handler = the store action wired to it (`src/store/*`, surfaced via hooks).

## Auth

| HTML control | RN | Handler | Effect |
|---|---|---|---|
| Mobile/WhatsApp/Email segment (`loginTab`) | `Pressable` ×3 | `auth.setChannel(key)` | swaps field; changes OTP channel label |
| phone input (`loginPhoneField.on`) | `TextInput` numeric maxLen10 | `auth.setLoginPhone` (strips non‑digit, slice 10) | enables Send OTP when `/^\d{10}$/` |
| email input (`loginEmailField.on`) | `TextInput` email | `auth.setLoginEmail` | enables when valid email regex |
| agree checkbox (`onToggleAgree`) | `Pressable` | `auth.toggleAgree` | toggles `agree`; gates Send OTP |
| **Send OTP** (`onSendOtp`) | `Pressable` | `auth.sendOtp()` | validates contact + agree → toast on fail; else set `resendIn=24`, navigate `Otp` |
| Terms / Privacy / Contact support links | `Text` pressable | – (demo, no‑op / toast) | |
| OTP input (`otpField.on`) | `TextInput` numeric maxLen4 | `auth.setOtp` | enables Verify at 4 digits |
| Resend link (`onResendOtp`) | `Pressable` (active only) | `auth.resendOtp()` | if `resendIn<=0` → `resendIn=24`, clear otp, toast "OTP resent" |
| **Verify & Continue** (`onVerifyOtp`) | `Pressable` | `auth.verifyOtp()` | `/^\d{4}$/` fail → toast; success → `obStep=1`, navigate `Onboarding/Wizard` |
| back ‹ | header back | `nav.goBack` → Login | |

## Onboarding wizard (`obNext` / `obBack`, step 1‑8)

| Control | RN | Handler | Effect |
|---|---|---|---|
| photo upload / location "use current" / doc upload (`obUpload`) | `Pressable` | `ui.toast('… (demo)')` | |
| Full name / DOB inputs (`obf.*.on`) | `TextInput` | `onboarding.setField('obProfile',k,v)` | live value; error shown after attempt |
| Gender segment (`obGenderOpts`) | `Pressable` ×3 | `onboarding.setField('obProfile','gender',label)` | |
| Darkstore/Warehouse (`obLocTypeOpts`) | `Pressable` ×2 | `onboarding.setSimple('obLocType',v)` | |
| location radio (`obLocations`) | `Pressable` ×3 | `onboarding.setSimple('obLocation',id)` | |
| shift radio (`obShifts`) | `Pressable` ×3 | `onboarding.setSimple('obShift',id)` | |
| training row play / mark (`m.play` / `m.toggle`) | `Pressable` | `ui.openVideo('ob',i,name)` / `onboarding.trainToggle(i)` | video auto‑marks done on finish |
| Aadhaar / PAN inputs (`obk.*.on`) | `TextInput` | `onboarding.setField('obKyc',k,v)` | validated (12 digits / PAN regex) |
| Capture & verify (`onFaceCapture`) | `Pressable` | `onboarding.setSimple('obFaceDone',true)` | swaps to "Face verified" |
| Bank inputs (`obb.*.on`) | `TextInput` | `onboarding.setField('obBank',k,v)` | |
| **Continue** (`onObNext`) | `Pressable` | `onboarding.next()` | per‑step gate (see below); step7 → `Status`; step8 → toast + `Home` |
| **Back** (`onObBack`) | `Pressable` | `onboarding.back()` | step1 → `Otp`; step8 → `Status`; else step‑1 |

**Step gates** (`obNext`): 1 `obProfile` valid · 2 `obLocType` set · 3 `obLocation` set ·
4 `obShift` set · 5 all 4 `obTrainDone` · 6 `obKyc` valid · 7 `obFaceDone` (→ Status) ·
8 `obBank` valid (→ Home, toast "Onboarding complete · welcome aboard!"). Fail → toast + mark attempted.

## Status gate

| Control | Handler | Effect |
|---|---|---|
| 5 gate chips (`gateBtn`) | `ui`/`onboarding.setGate(key)` | demo switch between review/approved/rejected/blocked/suspended |
| Continue setup (`onApprovedContinue`) | `onboarding` set `obStep=8, gate=review` → navigate `Onboarding/Wizard` | |
| Contact support (rejected/blocked/suspended) | `nav → Main/SupportSettings` | |
| Preview dashboard (demo) | `nav → Tabs/Home` | |

## Home

| Control | Handler | Effect |
|---|---|---|
| bell | `nav → Main/Notifications` | |
| Collect your device card (`onOpenCollect`) | `ui.openCollectSheet()` (reset otp/ack) | opens CollectDeviceSheet |
| **START MY SHIFT** (`act.startShift`) | `shift.setStep('location')` | opens ShiftVerifySheet |
| **CHECK OUT** (`act.checkout`) | `shift.checkout()` | `shiftActive=false`, elapsed 0 |
| balance card (`nav.payouts`) | `nav → Main/Payouts` | |
| Retry (error state) (`states.normal`) | `ui.setDataState('normal')` | |

### ShiftVerifySheet steps

| Step btn | Handler | Next |
|---|---|---|
| Location verified · Continue (`act.locNext`) | `shift.setStep('identity')` | identity |
| Face verification / Fingerprint (`act.idFace`) | `shift.setStep('face')` | face (spinner) |
| Simulate success (`act.faceNext`) | `shift.setStep('success')` | success |
| Start work (`act.startWork`) | `shift.startWork()` → `shiftActive=true, elapsed=0, step=none` | Home (LIVE) |
| Cancel (`act.closeSheet`) | `shift.setStep('none')` | close |

Timer: `setInterval` 1 s in `componentDidMount` → `elapsed+1` while `shiftActive`; also decrements `resendIn`. Reproduced in `useShiftTimer`.

## Attendance

| Control | Handler |
|---|---|
| Details / OT / History tabs (`attTab`) | `attendance.setTab(key)` |
| month `‹` / `›` (OT, History, Work history) | static in HTML — implemented as no‑op `Pressable` (visual parity) |

## Performance — no interactive controls (data only). Bars/skeletons are static.

## Profile

| Control | Handler |
|---|---|
| Edit (`nav.profileEdit`) | `nav → Main/EditProfile` |
| 8 menu rows (`pmenu(...,target)`) | `nav → Main/<target>` (deviceStatus, personal, workHistory, documents, bank, payouts, training, support) |
| Logout (`onLogout`) | `ui.setConfirmLogout(true)` → LogoutConfirmModal |

## Profile sub‑screens

| Screen | Control | Handler | Effect |
|---|---|---|---|
| EditProfile | inputs `ef.*` | `profile.setField('edit',k,v)` | |
| | Gender `genderOpts` | `profile.setField('edit','gender',l)` | |
| | Change photo (`onChangePhoto`) | `ui.toast('Photo picker (demo)')` | |
| | Save changes (`onSaveEdit`) | `profile.save('edit','profile')` | mark attempt → validate → toast "Changes saved" + `nav.goBack`, else toast "Please fix…" |
| PersonalInfo | inputs `pf.*`, Relationship `relOpts` | `profile.setField('personal',…)` | |
| | Save (`onSavePersonal`) | `profile.save('personal','profile')` | |
| BankDetails | inputs `bf.*` | `profile.setField('bank',…)` | |
| | Save bank details (`onSaveBank`) | `profile.save('bank','payouts')` | on success → `nav → Payouts` |
| UpiDetails | Verify & save UPI | static button — `ui.toast` (no handler in HTML) | |
| DeviceStatus | Report an issue (`onDeviceReport`) | `ui.openDeviceSheet()` | DeviceIssueSheet |
| | Request replacement (`onDeviceReplace`) | `ui.toast('Replacement requested')` | |
| DeviceIssueSheet | 5 reason radios (`radioRow`) | `ui.setDeviceReason(r)` | |
| | Submit report (`onDeviceSubmit`) | no reason → toast; else close + toast "Issue reported · support will call you" | |
| | Cancel (`onDeviceClose`) | close | |
| Documents | 3 doc rows (`d.go`) | `ui.toast('Opening …')` / `ui.toast('Upload licence (demo)')` | |
| | Add another document (`onAddDoc`) | `ui.toast('Add document (demo)')` | |
| Training | module row (`m.open`) | `ui.openVideo('profile',i,name)` | TrainingVideoModal; on finish → `profTrainDone[i]=true` |
| TrainingVideoModal | play/pause (`onToggleVideoPlay`) | `ui.toggleVideoPlay()` | progress interval ~6 s clip |
| | close ✕ (`onCloseVideo`) | `ui.closeVideo()` | |
| Faqs | accordion row (`f.toggle`) | `ui.setFaqOpen(i)` (toggle, single‑open) | |
| SupportSettings | 5 toggles (`toggleRow`) | `settings.toggle(key)` | |
| | Language segment (`langOpts`) | `settings.setLang(l)` | |
| | Chat with support (`h.go`) | `nav → Main/ChatSupport` | |
| | Call support / Email us | `ui.toast('Calling support…' / 'Opening mail…')` | |
| | FAQs (`nav.faqs`) | `nav → Main/Faqs` | |
| | Logout | `ui.setConfirmLogout(true)` | |
| ChatSupport | quick‑reply chip (`q.go`) | `support.quickChat(t)` → sets input then sends | |
| | input (`chatInputField.on`) | `support.setChatInput` | |
| | send (`onSendChat`) | `support.sendChat()` → append `me` msg, `chatTyping=true`, agent auto‑reply after 1.4 s | |

## Payouts

| Control | Handler | Effect |
|---|---|---|
| Withdraw (`onOpenWithdraw`) | `wallet.openWithdraw()` → `wdSheet=true`, `wdKey='wd_'+Date.now()` (idempotency) | WithdrawSheet |
| Bank account row (`nav.bank`) | `nav → Main/BankDetails` | |
| UPI row (`nav.upi`) | `nav → Main/UpiDetails` | |
| WithdrawSheet amount (`onWdAmount`) | `wallet.setWdAmount` (digits, slice 6) | |
| Confirm withdrawal (`onSubmitWithdraw`) | `<100` → toast; `>4850` → toast "exceeds available balance"; else close + toast "Withdrawal requested · status: Pending" | |
| Cancel (`onCloseWithdraw`) | close | |

## Global

| Control | Handler |
|---|---|
| Bottom tabs Home/Attendance/Performance/Profile (`tab`) | `nav.navigate(<tab>)` + `scroll vp to top` |
| Logout dialog — Cancel (`onLogoutCancel`) | close |
| Logout dialog — Log out (`onLogoutConfirm`) | wipe shift state, `auth.logout()` → navigate `Auth/Login` |
| CollectDeviceSheet — Request collection OTP (`onRequestMgrOtp`) | `obMgrSent=true` + toast |
| CollectDeviceSheet — Manager OTP input (`obMgrField.on`) | digits slice 4 |
| CollectDeviceSheet — ack checkbox (`onToggleAck`) | toggle `obDeviceAck` |
| CollectDeviceSheet — Confirm collection (`onConfirmCollect`) | otp≠4 → toast; !ack → toast; else close + `deviceCollected=true` + toast "Device collected · HHD‑2231 assigned" (hides Home collect card) |
| Toast | auto‑dismiss 2.2 s (`setTimeout`) |
