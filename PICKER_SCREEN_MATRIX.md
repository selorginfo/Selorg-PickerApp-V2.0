# PICKER_SCREEN_MATRIX.md

`screen` state → 21 named screens (`isKeys` array, `template.html:1689`) + 8 conditional
overlays. Every one is implemented. "UI Count" = discrete visual elements
(header, card, row, button, badge, input, icon group, chart, empty/loading block…).

| # | HTML screen (`screen`) | RN screen | Route | UI | RN | Missing |
|--:|------------------------|-----------|-------|---:|---:|:------:|
| 1 | `login` | `LoginScreen` | `Auth/Login` | 22 | 22 | 0 |
| 2 | `otp` | `OtpScreen` | `Auth/Otp` | 13 | 13 | 0 |
| 3 | `onboarding` (obStep 1‑8) | `OnboardingWizardScreen` (+ 8 step views) | `Onboarding/Wizard` | 74 | 74 | 0 |
| 4 | `status` (gate: review/approved/rejected/blocked/suspended) | `StatusGateScreen` | `Onboarding/Status` | 31 | 31 | 0 |
| 5 | `home` (normal/loading/error/offline + collect card + shift active/inactive) | `HomeScreen` | `Tabs/Home` | 46 | 46 | 0 |
| 6 | `attendance` (tabs: details/ot/history; ot empty/normal) | `AttendanceScreen` | `Tabs/Attendance` | 44 | 44 | 0 |
| 7 | `performance` (loading/normal) | `PerformanceScreen` | `Tabs/Performance` | 24 | 24 | 0 |
| 8 | `profile` | `ProfileScreen` | `Tabs/Profile` | 20 | 20 | 0 |
| 9 | `profileEdit` | `EditProfileScreen` | `Main/EditProfile` | 14 | 14 | 0 |
| 10 | `personal` | `PersonalInfoScreen` | `Main/PersonalInfo` | 20 | 20 | 0 |
| 11 | `payouts` (normal/empty) | `PayoutsScreen` | `Main/Payouts` | 22 | 22 | 0 |
| 12 | `notifications` (normal/empty) | `NotificationsScreen` | `Main/Notifications` | 8 | 8 | 0 |
| 13 | `bank` | `BankDetailsScreen` | `Main/BankDetails` | 12 | 12 | 0 |
| 14 | `upi` | `UpiDetailsScreen` | `Main/UpiDetails` | 8 | 8 | 0 |
| 15 | `deviceStatus` | `DeviceStatusScreen` | `Main/DeviceStatus` | 15 | 15 | 0 |
| 16 | `workHistory` | `WorkHistoryScreen` | `Main/WorkHistory` | 13 | 13 | 0 |
| 17 | `documents` | `DocumentsScreen` | `Main/Documents` | 8 | 8 | 0 |
| 18 | `training` | `TrainingScreen` | `Main/Training` | 11 | 11 | 0 |
| 19 | `faqs` | `FaqsScreen` | `Main/Faqs` | 7 | 7 | 0 |
| 20 | `support` | `SupportSettingsScreen` | `Main/SupportSettings` | 22 | 22 | 0 |
| 21 | `chat` | `ChatSupportScreen` | `Main/ChatSupport` | 15 | 15 | 0 |

### Overlays (rendered from `OverlayHost`, driven by `useUI` store)

| # | HTML block (`sc-if`) | RN component | Trigger |
|--:|----------------------|--------------|---------|
| O1 | shift verify (`shiftOverlay`, steps location/identity/face/success) | `ShiftVerifySheet` | `act.startShift` on Home |
| O2 | `confirmLogout` | `LogoutConfirmModal` | Logout button (Profile / Support) |
| O3 | `deviceSheet` | `DeviceIssueSheet` | "Report an issue" (Device Status) |
| O4 | `videoOpen` | `TrainingVideoModal` | any training module play |
| O5 | `collectSheet` | `CollectDeviceSheet` | "Collect your device" card (Home) / onboarding |
| O6 | `wdSheet` | `WithdrawSheet` | "Withdraw" (Payouts) |
| O7 | `toastShow` | `Toast` | `Component.toast()` |
| O8 | bottom tab bar (`tabScreen`) | `BottomTabNavigator` bar | tab screens |

### Screen‑by‑screen element inventory

**1 · LoginScreen** — green rounded header (logo 96 in 24‑radius shadowed tile, "Selorg Picker",
subtitle) · white card: "Choose login method" label, 3‑segment control (Mobile/WhatsApp/Email,
pill active), conditional Mobile field (`🇮🇳 +91` prefix box + numeric input, maxLen 10) OR Email
field, agree checkbox row (22 box + Terms/Privacy links), "Send OTP" button (disabled tint until
`loginContactOk()&&agree`) · footer "Need help? Contact support".

**2 · OtpScreen** — back‑header "Verify OTP" · card: logo 60, "Verify OTP" title, "Enter the 4‑digit
OTP sent to **{otpDest}** via **{otpChannelLabel}**", 4‑box OTP input (mono, letter‑spacing 18),
resend row (active link `Resend OTP` / countdown `Resend OTP in Ns`), "Verify & Continue" button
(disabled until 4 digits).

**3 · OnboardingWizardScreen** — back‑header "Complete your profile" · 5‑node step tracker
(Profile/Work/Training/KYC/Bank, done ✓ / current ringed / future grey) · one of 8 step bodies:
1 photo‑upload circle + Full name + DOB + Gender segmented(3);
2 "Where will you work?" Darkstore/Warehouse segmented(2) + helper;
3 "Select your work location" + "Use my current location" outline btn + 3 radio location cards;
4 "Choose a shift" + 3 radio shift cards (slots open);
5 training banner (n/4 · %) + 4 module rows (play mark + Watch/Rewatch btn);
6 "Identity & KYC" Aadhaar input(12) + upload‑Aadhaar dashed btn + PAN input(10) + upload‑PAN btn;
7 "Face verification" — dashed circle + "Capture & verify" OR verified check + "Face verified";
8 "Bank account" holder/bank/acc/IFSC inputs · nav row: Back({obBackLabel}) + Continue({obContinueLabel}).

**4 · StatusGateScreen** — 5 demo toggle chips (Under review/Approved/Rejected/Blocked/Suspended) ·
one gate body: **review** spinner ring + "Application under review" + "2–4 hours" + 4 review‑item
rows (✓/… mark, status colour) + "Next after approval…" hint; **approved** green check + "You're
approved!" + "Continue setup" btn; **rejected/blocked/suspended** coloured icon + title + copy +
"Contact support" outline btn · "Preview dashboard (demo)" ghost btn.

**5 · HomeScreen** — header (RV avatar, "Hi, Rahul" / "Picker · ID 4821", bell w/ red dot →
Notifications) · states: **loading** 5 skeleton blocks · **error** card + Retry · **normal**:
optional amber "Collect your device" card → CollectDeviceSheet; hub/shift card (name +
LIVE pill when active, pin icon, address, Accuracy ±8 m / Status On site ✓, divider, then
active row [Shift Active + mono timer + red CHECK OUT] or inactive row [Today's Shift 9–6 +
green START MY SHIFT]); dark balance card (wallet icon, "Available Balance", ₹4,850 gold,
"₹1,200 pending", chevron → Payouts); orders card (box icon, "64 orders", "8 pending",
"Orders synced from HHD", 88% bar); 2 metric tiles (₹720 Today's Earnings, ₹150 Incentives Today);
performance card (Top 12% pill, Accuracy 98% bar, Speed 42 items/hr bar).

**6 · AttendanceScreen** — white header ("Attendance" / subtitle / 3 icon tabs Details/OT/History,
underline active) · present status card (green dot + "Present", 9–6, "Punched in on time",
"Hours Worked Today" mono {attHours}, 88% progress ring) · **Details**: 4 kv rows + Status "Active"
· **OT**: month pager "March 2026"; empty → "No overtime hours recorded"; normal → green summary
(Total OT Hours 12 hrs, OT Rate 1.5x) + "Weekly Breakdown" 3 rows + green "Total OT Earnings ₹1,800"
· **History**: month pager + calendar (7 dow + 35 cells w/ present/half/none dot, day 14 selected) +
"22 Present Days" / "1 Half Days" tiles.

**7 · PerformanceScreen** — "My Performance" title + subtitle · loading → tile/bar skeletons ·
normal → 4 metric tiles (64 Today's Orders, 98% Accuracy, 42 Speed Score, Top 12% Performance),
dark "Today's Earnings ₹720" card, "Weekly Earnings" bar chart (7 bars, Thu highlighted).

**8 · ProfileScreen** — "Profile" title · dark profile card (RV tile, name {editName}, phone·ID,
Edit btn → EditProfile, 2 stat chips Account Status Active / Member Since Jan 2026) · 8‑row menu
(Device Status, Personal Information, Work History, Documents, Bank Account, Payouts, Training,
Support & Settings — each icon chip + title + sub + chevron) · red outline Logout.

**9 · EditProfileScreen** — back‑header · avatar 96 w/ camera badge + "Change photo" · Full name /
DOB / Email inputs (validated) · Gender segmented(3) · "Save changes".

**10 · PersonalInfoScreen** — back‑header · Primary phone (read‑only + Verified pill) · Alternate
phone input · Address textarea · City / Pincode row · divider · "Emergency contact": name / phone /
Relationship segmented(4 Spouse/Parent/Sibling/Friend) · "Save changes".

**11 · PayoutsScreen** — back‑header · dark payout card (March 2026, Net Payout ₹18,450, pay date,
divider, "Available to withdraw" ₹4,850 + gold "Withdraw" btn → WithdrawSheet) · "Bank & UPI
verification" card (Bank account · Verified → Bank; UPI · Pending → Upi) · "Transaction history":
empty → "No transaction history yet"; normal → 3 payout rows (month, date·mode, amount mono, Paid).

**12 · NotificationsScreen** — back‑header · empty → "You're all caught up"; normal → 4 notif cards
(icon chip, title, body, relative time).

**13 · BankDetailsScreen** — back‑header · green "Verified · payouts go to this account" banner ·
holder / bank / account / IFSC inputs (validated) · "Save bank details".

**14 · UpiDetailsScreen** — back‑header · amber "Pending verification" banner · UPI ID field
(placeholder display) · Confirm UPI ID field · "Verify & save UPI" btn.

**15 · DeviceStatusScreen** — back‑header · dark device card (HHD‑2231, Zebra TC21 · Handheld,
Active pill, Battery 86% bar) · 5 kv rows (Model, Serial, Assigned on, Hub, Last synced 2 min ago) ·
"Report an issue" btn → DeviceIssueSheet · "Request replacement" outline btn (toast).

**16 · WorkHistoryScreen** — back‑header · month pager · 3 tiles (22 Present, 12h Overtime, 198h
Total) · 5 day rows (date, hub · hrs, status badge Present/Present +OT/Half day/Absent).

**17 · DocumentsScreen** — back‑header · 3 doc rows (Aadhaar ✓Verified, PAN ✓Verified, Driving
licence Upload) · "Add another document" dashed btn (toast).

**18 · TrainingScreen** — back‑header · progress ring banner (profTrainPct, all‑done vs in‑progress
copy) · 4 module rows (mark icon done/play, name, sub "12 min · completed"/"tap to watch", chevron)
→ TrainingVideoModal.

**19 · FaqsScreen** — back‑header · 5 accordion rows (question + +/− chip, expand answer).

**20 · SupportSettingsScreen** — back‑header · "Notifications" 5 toggle rows (push, shiftRem,
payout, incentive, sound) · "Language" segmented(3 English/हिंदी/বাংলা) · "Get help" list
(Chat with support → Chat, Call support toast, Email us toast, FAQs → Faqs) · app version ·
red outline Logout.

**21 · ChatSupportScreen** — dark chat header (back, logo, "Selorg Support", "Online · replies in
~5 min") · scrollable message list (agent/me bubbles + time) + typing indicator · quick‑reply chips
(3) · input + circular send btn.
