# Picker App — Issues Solved (Last 6 Hours)

**Date:** 24 Sep 2026  
**Window:** ~09:18 – 15:18 IST  
**App:** `Selorg-PickerApp-V2.0` (`com.selorgpickerapp`)  
**Related backend:** `Selorg-backend-V2.0` (`picker.auth.*`, `orderRealtime`)

---

## Summary

Two Picker issues were investigated and fixed in this window:

1. Physical device showed a **black / empty screen** (JS never loaded).
2. Picker **email OTP** was branded as **“Selorg Rider”** instead of **“Selorg Picker”**, with weak Picker/Rider auth isolation.

---

## Issue 1 — Black screen on physical device

| | |
|--|--|
| **When** | ~11:14 IST |
| **Symptom** | Oppo physical device launched to a black/empty native window; React context never became ready; login UI did not appear. |
| **Root cause** | Not an app UI bug. **Metro was hung** and never served the JS bundle. Device logs showed `Detect Empty window`. Metro answered `/status` but the bundle request timed out (HTTP 000). `react-native start --reset-cache` also crashed on Windows with `ENOTEMPTY` on `metro-cache`, leaving Metro dead. |
| **Status** | **Solved** |

### What was fixed

1. Cleared the broken Metro temp cache and restarted the bundler.
2. Restored `adb reverse` for ports **8081** (Metro) and **3333** (API).
3. Set a **white** Android `windowBackground` so load wait is not a black flash on dark-mode phones.
4. Hardened `npm start` so Metro cache is cleared safely before launch (`scripts/clear-metro-cache.js`), avoiding the Windows `ENOTEMPTY` crash path.

### Files touched (Picker app)

| File | Change |
|------|--------|
| `android/app/src/main/res/values/styles.xml` | White `windowBackground` + transparent status bar |
| `scripts/clear-metro-cache.js` | **New** — safe recursive clear of Metro/haste temp dirs on Windows |
| `package.json` | `start` runs `clear-metro-cache.js` before `react-native start` |

### Verification

- Bundle served again (HTTP 200).
- Device log: `Running "SelorgPickerApp"`; login keyboard opened; API host `127.0.0.1:3333`.

### Note

If a black screen returns while developing, Metro likely died or hung — restart with `npm start` (keep it running).

---

## Issue 2 — Picker OTP email showed “Selorg Rider”

| | |
|--|--|
| **When** | ~14:55 IST |
| **Symptom** | Email OTP for Picker login used Rider branding (“Selorg Rider” / Rider from-address). |
| **Root cause** | Backend `picker.auth.service.ts` hard-coded `RIDER_APP_NAME` / `RIDER_EMAIL_FROM` for OTP emails. OTPs and JWT audience were not strictly role-scoped, so Picker and Rider could share branding and (in theory) OTP keys. |
| **Status** | **Solved** |

### What was fixed

1. **Role-aware branding** — Picker OTPs use `Selorg Picker` + `PICKER_EMAIL_FROM` (and Picker SMS/WhatsApp templates).
2. **Role-scoped OTP keys** — e.g. `picker|email|…` vs `rider|email|…` so codes cannot be reused across apps.
3. **Client / role required** — Auth send/verify/check require `workforceRole` (or client identity); mismatch → `ROLE_MISMATCH` / `CLIENT_REQUIRED`, and **no OTP is sent**.
4. **Separate JWT audiences** — New Picker tokens use `selorg-picker` (legacy `picker` still accepted during migration).
5. **Picker app always sends** `workforceRole: 'picker'` on auth API calls.

### Files touched

**Picker app**

| File | Change |
|------|--------|
| `src/services/api/authApi.ts` | Send/resend/verify OTP always include `workforceRole: 'picker'` |

**Backend (shared workforce auth used by Picker)**

| File | Change |
|------|--------|
| `src/modules/picker/picker.auth.service.ts` | Role-aware app name, email from, SMS templates, OTP keys, JWT audience, client-required checks |
| `src/modules/picker/picker.auth.middleware.ts` | Audience + token `workforceRole` must match account; blocks cross-app tokens |
| `src/realtime/orderRealtime.ts` | Socket auth accepts `selorg-picker` / `selorg-rider` / legacy audiences |

### Verification

- Restart backend so auth changes load.
- Request a Picker email OTP — subject/body/from should show **Selorg Picker**, not Selorg Rider.

---

## Commits (this window)

| Repo | Commit | Message |
|------|--------|---------|
| `Selorg-PickerApp-V2.0` | `6f5aade` | Update picker app changes |
| `Selorg-backend-V2.0` | `b952483` | Update backend changes for picker app |
