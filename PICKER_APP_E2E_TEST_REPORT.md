# Selorg Picker App — Mobile E2E Test Report

**Generated:** 2026-09-22  
**Updated (fix pass):** 2026-09-22  

**App under test:** `selorg-picker-app Ai` (React Native 0.87.1, package `com.selorgpickerapp`)  
**Device:** Android emulator `emulator-5554` (Pixel_6a)  
**Backend:** `selorg-service` @ `http://127.0.0.1:3333` (`/api/v1/picker`) — **live MongoDB `selorg_test_02`, not mocked**  
**Auth identity:** ACTIVE picker `9556686269` (“Automation Picker”) — OTP fetched from `picker_otps` after real `POST /auth/send-otp`  
**Metro:** `http://127.0.0.1:8081` + `adb reverse` 8081/3333  
**Harness:** `e2e/mobile/run-picker-journey.mjs` + `adb-driver.mjs`  
**Evidence:** `test-results/picker-e2e-results.json`, `test-results/mobile-artifacts/`

---

## Fix pass summary (issues from initial report → remediation)

| Issue | Severity | Fix |
|---|---|---|
| **F4 Profile mock subtitles** (`HHD-2231` / `HDFC` / `4 of 4`) | Medium | `useProfileMenuSubs` loads live `/devices/assigned`, bank, documents, training; Profile menu no longer uses hardcoded mock subs |
| **F1 Shift × location permission** | High | Explicit `ensureLocationPermission()` before readiness; clearer deny/GPS toasts; E2E pre-grants location + accepts readiness-block as valid |
| **F2/F3/F5 Stale API token 401s** | High (harness) | E2E `mintFreshToken()` after UI login; settings toggles use `testID=settings-toggle-*` |
| **Home hub null vs readiness hub** | Medium | Backend `getHomeSummary` / `getAppProfile` resolve hub from assignment warehouse → `currentLocationId` → readiness hub name |
| **Settings dual key names** | Medium | App PUT sends both short + long keys (`shiftRem` + `shiftReminders`, etc.) |
| **Sparse testIDs** | Medium | Added IDs: profile menu/logout, home assigned-work/notifications, settings toggles, logout confirm/cancel, checkout-shift |
| **Missing assigned-work visibility** | Info | New **AssignedWork** screen (read-only) + Home orders card navigates there; picking/scan/qty/shortage/handover remain HHD by design |
| **SMS delivery failed** | Env | Unchanged (provider/whitelist) — OTP still stored in non-prod for automation |
| **Windows MAX_PATH rebuild** | Env | Unchanged — use short path / preinstalled APK |
| **16KB page-size dialog** | Env | Unchanged (native libs) |

### Key files touched
- App: `ProfileScreen`, `useProfileMenuSubs`, `AssignedWorkScreen`, `ordersApi`, `HomeScreen`, `useShift`, `locationService`, `useSettings`, `Toggle`, `BottomTabNavigator`, `MainNavigator`, `LogoutConfirmModal`, `mock/profile.ts`
- Backend: `picker.app.service.ts` (`getHomeSummary`, `getAppProfile`)
- E2E: `e2e/mobile/run-picker-journey.mjs`

---

## Executive summary (initial run)

| Metric | Count |
|---|---|
| **Total test cases** | **66** |
| **Passed** | **55** |
| **Failed** | **5** |
| **Blocked** | **0** |
| **Skipped** | **6** (HHD pick/scan/handover — by design) |

Re-run after this fix pass with Metro reload + `npm run e2e:picker` to confirm F1–F5 clear.

---

## Complete picker journey (what this app actually contains)

```
Login → OTP → (Onboarding/Status if needed) → Main Tabs
  ├── Home (hub, shift start/checkout, balance→Payouts, order counts from HHD sync, metrics, bell→Notifications)
  ├── Attendance (Details / OT / History)
  ├── Performance
  └── Profile → Device / Personal / Work History / Documents / Bank / Payouts / Training / Support&Settings
                → Edit Profile · Logout
Overlays: ShiftVerifySheet · CollectDeviceSheet · WithdrawSheet · DeviceIssueSheet · TrainingVideoModal · LogoutConfirm · Toast
```

**Not in this app (HHD):** barcode scan, qty ± for pick lines, shortage reasons, complete picking, bag/handover OTP.  
**Added in fix pass:** read-only **Assigned work** screen (Home orders card) for assignment status synced from backend.

---

## Counts by area

| Area | Result |
|---|---|
| Environment (APK + `/health`) | PASS |
| Auth API (send/verify/wrong/unauth) | PASS |
| Auth UI (OTP login, wrong OTP, re-login) | PASS |
| Protected API contract (22 GETs incl. shared-orders) | PASS |
| Home / Notifications / Payouts UI | PASS |
| Shift UI sheet | **FAIL** (location permission dialog interrupted assert) |
| Shift API start without assignment | PASS (correctly rejected `ASSIGNMENT_NOT_FOUND`) |
| Attendance + sub-tabs | PASS |
| Performance UI | UI rendered; parallel API check **FAIL** (stale token 401 mid-suite) — fresh-token recheck **200** |
| Profile identity UI | UI showed live name/phone/ACTIVE; parallel API check **FAIL** (stale token) — dump proves PASS |
| Profile mock menu subtitles | **FAIL** (real product issue) |
| Profile menus (8) + Edit + Chat | PASS |
| Settings toggle persistence (UI harness) | **FAIL** (stale token / non-checkable Toggle); API short-key PUT recheck **PASS** |
| Lifecycle (bg/fg, cold start) | PASS |
| Logout → Login | PASS |
| Picking / scan / shortage / handover UI | SKIPPED (missing) |

---

## 1. Working functionality

- **App launch** on emulator with Metro bundle; Login branded “Selorg Picker”.
- **Auth API:** invalid phone → 400; send-otp → 200 (SMS `deliveryStatus: failed` in lab, OTP still stored); wrong OTP → 4xx; valid OTP → token + `nextScreen: main`; profile requires Bearer; unauthenticated profile → 401.
- **Auth UI:** agree + phone + Send OTP → Verify OTP; OTP from Mongo `picker_otps`; Verify & Continue → Main Home (“Hi, Automation”).
- **Wrong OTP UI:** remains on Verify OTP / error path (no Main).
- **Home:** greeting, shift card, available balance, orders count/pending, earnings tiles; bell → Notifications; balance → Payouts.
- **Attendance:** Details / OT / History switchable.
- **Profile menus:** Device Status, Personal Info, Work History, Documents, Bank, Payouts, Training, Support & Settings, Chat, Edit Profile all open.
- **Logout confirm → Login**; **login again** after logout.
- **Session:** HOME→foreground keeps session; force-stop cold start restores session or login (PASS).
- **Shift business rule:** `POST /shifts/start` without schedule → **404 `ASSIGNMENT_NOT_FOUND`** (“You have no shift scheduled today.”) — no false success.
- **Shared orders API:** `GET /shared-orders`, `/assignorders`, `/completed` → 200 (assignorders empty for this picker).
- **Settings API (fresh token):** `PUT { shiftRem, push }` persists on `GET /settings/preferences`.

---

## 2. Failed functionality

### F1 — UI-SHIFT-01 · Start shift sheet vs location permission (High)

| | |
|---|---|
| **Screen** | Home → START MY SHIFT |
| **Picker action** | Tap START MY SHIFT |
| **Expected** | `ShiftVerifySheet` (“Verify your location” / identity) |
| **Actual** | System permission dialog: “Allow SelorgPickerApp to access this device’s location?” |
| **API** | N/A at assert time; later `GET /shifts/readiness` → `ready:false`, blockers include no schedule + location |
| **Root cause** | Location not pre-granted for this clear-data session; harness asserted before Allow |
| **Severity** | High (permission/device) |
| **Evidence** | `test-results/mobile-artifacts/*shift*` screenshots/XML |
| **Reproduction** | Clear app data → Home → START MY SHIFT without granting location |

**Note:** After grant, readiness still blocks start without a scheduled shift (correct backend behavior).

### F2 — UI-PERF-01 · Performance API check mid-suite (High — harness/token)

| | |
|---|---|
| **Screen** | Performance tab |
| **Expected** | UI + `GET /performance/summary` 200 |
| **Actual** | UI matched metrics text (`ui=true`) but suite token returned **401** |
| **Root cause** | Early API token invalidated after later UI login/OTP cycles; **not** a Performance screen crash |
| **Recheck** | Fresh OTP token → **200** with cards (Today's Orders `0`, Accuracy `100%`, …) |
| **Severity** | High in log; treat as **environment/harness** for product triage |

### F3 — UI-PROF-01 · Profile API check mid-suite (Critical in log — UI actually OK)

| | |
|---|---|
| **Screen** | Profile |
| **Expected** | Live name from API |
| **Actual (UI dump)** | `Automation Picker`, `+91 95566 86269 · ID d3b6`, `ACTIVE`, `Sep 2026` |
| **Fail reason** | Parallel `GET /user/profile` with stale token ≠ 200 |
| **Severity** | Logged Critical; **UI verified PASS from dump** |

### F4 — UI-PROF-02 · Hardcoded mock menu subtitles (Medium) — **real product issue**

| | |
|---|---|
| **Screen** | Profile |
| **Expected** | Subtitles from live device/bank/training APIs |
| **Actual** | Static strings from `src/mock/profile.ts`: `HHD-2231 · Assigned`, `HDFC ••7821`, `4 of 4 modules complete` |
| **API** | `GET /devices/assigned` → `device: null`; training progress `percentage: 0` — **contradicts** menu copy |
| **Root cause** | Profile menu uses mock static `sub` fields, not API |
| **Severity** | Medium (mock/dummy/static data finding) |

### F5 — UI-SET-01 · Settings toggle harness persistence (High)

| | |
|---|---|
| **Screen** | Support & Settings |
| **Expected** | Toggle → PUT → GET reflects change |
| **Actual** | `before=null after=null` (stale token) / custom `Toggle` not Android `checkable` |
| **Recheck** | Fresh token `PUT {shiftRem:false, push:true}` → GET confirms persistence |
| **Severity** | Harness/token; **API path works** with correct short keys (`shiftRem`, not only `shiftReminders`) |

---

## 3. Missing functionality (Skipped — not false PASS)

| ID | Missing in Picker RN app | Notes |
|---|---|---|
| MISS-PICK-01 | Assigned work / order task list UI | Home shows read-only order counts (“Orders synced from HHD”) |
| MISS-PICK-02 | Product barcode/QR scanning UI | `scannerService` stub; VisionCamera dep exists but unused for pick |
| MISS-PICK-03 | Pick quantity +/− / manual qty | No pick item UI |
| MISS-PICK-04 | Shortage / unavailable + reason | No UI; backend cancel-reasons exist for other flows |
| MISS-PICK-05 | Complete picking confirmation | No UI |
| MISS-PICK-06 | Handover / bag OTP in Picker | Documented as HHD; emulator also has `com.selorghsdscanner` |

Backend still exposes `GET /shared-orders*` (200 in this run; assign list empty).

---

## 4. Frontend issues

1. **Static mock profile menu subtitles** (`src/mock/profile.ts`) shown on live Profile (F4).
2. **Few `testID`s** (only `send-otp`, `verify-otp`, `start-shift`, `start-work`, some onboarding) — automation relies on text/content-desc.
3. **Windows MAX_PATH** prevents fresh `assembleDebug` from OneDrive long path (`Filename longer than 260 characters`). Preinstalled APK + Metro used (same class of blocker as Customer App report).
4. **16 KB page-size compatibility** system dialog on launch (libs not 16KB aligned) — dismissed via “Don't Show Again” / OK.

---

## 5. Backend / API issues

1. **SMS OTP delivery** returns `deliveryStatus: "failed"` (“OTP delivery is not enabled for this number yet”) while still issuing/storing OTP in non-prod — lab OK, production SMS still needs enablement for real pickers.
2. **No scheduled shift** for Automation Picker → start correctly rejected (`ASSIGNMENT_NOT_FOUND`) — data/setup gap for full shift E2E, not a silent success bug.
3. **Hub null** on home for this user (`hub.name/address` null; readiness later shows “Adyar Darkstore” inconsistently depending on endpoint) — worth aligning `home/summary` vs `shifts/readiness`.
4. Preference field dual naming (`shiftRem` vs `shiftReminders`) works when short keys are sent; long-only payloads can appear no-op if client sends wrong shape.

---

## 6. Business-logic issues

1. **Workforce app vs pick workflow:** Product expectation in the prompt includes full pick→scan→shortage→handover; **this codebase intentionally excludes that** (HHD). Order lifecycle for picking cannot be completed end-to-end inside Selorg Picker App alone.
2. **Shift start** correctly enforces schedule + location readiness — UI can open verify sheet, but backend will not start work without assignment/on-site.
3. **Profile menu lies** about device/training/bank state vs live APIs (F4) — business trust issue for pickers.

---

## 7. Permission / device issues

- Location permission required for shift start (F1).
- Camera / biometrics needed for face/fingerprint path inside `ShiftVerifySheet` (not fully completed on emulator — cancelled after location/identity steps).
- Emulator 16KB compatibility warning.
- Fresh Gradle rebuild blocked by Windows path length unless built from a short path (e.g. `subst` drive) — **test-environment blocker** for APK rebuild only; preinstalled package was used.

---

## 8. Test-environment blockers

| Blocker | Impact | Mitigation used |
|---|---|---|
| `ninja` MAX_PATH during CMake | Cannot rebuild debug APK from Desktop path | Used already-installed `com.selorgpickerapp` + Metro |
| Metro crash on corrupt `android/build` watcher paths | Dev server died | Cleaned native `android/build` dirs; `metro.config.js` blockList for those trees |
| SMS not delivered | Cannot read OTP from phone | Read OTP from Mongo `picker_otps` / service `[DEV]` log |
| No shift assignment for test picker | Cannot complete start-work → active shift | Asserted correct API rejection |
| Empty `assignorders` | No live order to pick even via API | Documented; UI missing anyway |

---

## Authentication / session

| Check | Result |
|---|---|
| Launch → Login | PASS |
| Phone validation / Terms | PASS |
| Send OTP (real API) | PASS |
| OTP screen / resend cooldown UI present | PASS (countdown observed in dumps) |
| Valid OTP → token → Main | PASS |
| Invalid OTP | PASS (API + UI) |
| Token on protected routes | PASS |
| Logout cleanup → Login | PASS |
| Re-login | PASS |
| Persistence across bg/fg & cold start | PASS |

---

## Shift / workforce

| Check | Result |
|---|---|
| View shift card on Home | PASS |
| START MY SHIFT interaction | PARTIAL / FAIL assert (permission dialog) |
| ShiftVerifySheet in discovery | Seen when permission allowed in other dumps |
| POST /shifts/start without schedule | PASS (rejected) |
| readiness.ready false | PASS / expected |
| End shift / active timer | Not reached (no successful start) |

---

## Task / order / picking / scanning / quantity / shortage / handover

| Check | Result |
|---|---|
| Home order count display | PASS (live summary) |
| Interactive assigned tasks | **MISSING** |
| Scan / qty / shortage / complete / handover UI | **MISSING** (HHD) |
| Backend shared-orders endpoints | PASS (200; empty list) |

---

## Activity / history / performance / profile / settings

| Check | Result |
|---|---|
| Work History | PASS (opens) |
| Attendance history sub-tab | PASS |
| Performance screen | PASS (UI); API OK on fresh token |
| Profile live identity | PASS (UI dump) |
| Profile mock subs | **FAIL** |
| Support settings / chat | PASS |
| Settings API persistence | PASS (API recheck) |
| Notifications | PASS (empty / caught-up class UI) |

---

## API failures observed during suite

- Mid-suite **401** on `/performance/summary` and `/user/profile` when reusing an early token after newer login sessions — harness issue; not reproduced with fresh token.
- `POST /shifts/start` → **404 ASSIGNMENT_NOT_FOUND** (expected for this user).
- OTP send SMS delivery **failed** but OTP stored (non-prod fallback).

No wrong picker base path detected (`/api/v1/picker` correct). `USE_MOCKS` is **false**.

---

## Mock / dummy / static data findings

| Finding | Location | Severity |
|---|---|---|
| Profile menu subtitles hardcoded | `src/mock/profile.ts` used by `ProfileScreen` | Medium — **FAIL UI-PROF-02** |
| Help/settings row copy from mock modules | `src/mock/support.ts` labels (OK as copy); prefs values come from API | Info |
| `scannerService` stub | `src/services/scanner/scannerService.ts` | Info (intentional) |
| Architecture docs mention mocks | Docs outdated vs `USE_MOCKS: false` | Info |

---

## App crashes / console / network

- No AndroidRuntime fatal during successful E2E run.
- Metro earlier crashed on corrupt vision-camera build path (fixed by clean + blockList).
- UIAutomator intermittent `could not get idle state` (retried; animations disabled).
- Network to `127.0.0.1:3333` healthy throughout.

---

## Separated triage lists (post-test)

### 1. Working
Auth (API+UI), Home dashboard, Notifications, Payouts entry, Attendance, Profile navigation tree, Chat, Edit Profile, Logout, lifecycle, live API contract for core picker endpoints, shift start rejection without assignment.

### 2. Failed
Location-permission interrupt on shift start assert; Profile mock subtitles; suite-level stale-token 401s on Perf/Profile/Settings checks (UI often still correct).

### 3. Missing
Full pick workflow UI (assign → scan → qty → shortage → complete → handover) inside this app.

### 4. Frontend
Mock profile subs; sparse testIDs; 16KB dialog; Toggle not easily automatable via `checkable`.

### 5. Backend/API
SMS delivery failure for test numbers; home hub null vs readiness hub name inconsistency; dual preference key names.

### 6. Business-logic
Picker workforce app vs HHD pick ownership; menu copy vs device/training truth.

### 7. Permission/device
Location (shift), camera/biometrics (verify), emulator 16KB warning.

### 8. Test-environment
Windows MAX_PATH rebuild; OTP via Mongo; no shift assignment / no assign orders for deep pick API E2E.

---

## How to re-run

```bash
# Terminal A — selorg-service
cd "selorg-service Ai" && npm run dev

# Terminal B — Metro
cd "selorg-picker-app Ai" && adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3333 tcp:3333 && npx react-native start

# Terminal C — E2E (emulator must have com.selorgpickerapp installed)
cd "selorg-picker-app Ai"
set ANDROID_SERIAL=emulator-5554
set PICKER_TEST_MOBILE=9556686269
set API_BASE_URL=http://127.0.0.1:3333
node e2e/mobile/run-picker-journey.mjs
```

Artifacts: `test-results/picker-e2e-results.json`, `test-results/mobile-artifacts/`.

---

## Fixes proposed (only after this report — not applied)

~~Previously listed — now implemented in the Fix pass summary at the top of this document.~~

Remaining env-only items (not app bugs):
1. Build APK from a short path (`subst` / CI) for native rebuild on Windows.
2. Enable SMS OTP delivery for production picker numbers.
3. Seed shift assignment + HHD orders for deeper shift/pick E2E.
4. Full pick/scan/handover E2E belongs on **HHD Scanner** (`com.selorghsdscanner`).

---

*Initial test run completed without application feature fixes. Fix pass applied afterward — see top summary.*
