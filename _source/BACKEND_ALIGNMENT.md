# Backend alignment — Selorg Picker Pro prototype

Source: uploaded backend docs (`uploads/01`–`18`). Picker app base path `/api/v1/picker`.
This prototype = **workforce app** (onboarding, shifts, attendance, payouts, profile). Picking is HHD — not built here (the "Picking" screen stays flagged *proposed*).

## Onboarding sequence (per 04-picker-workflow §4)
profile → location-type → select-work-location → select-shift → training →
Aadhaar/PAN + documents → face verification → **under-review gate** →
bank details → collect-device (manager OTP) → success → tabs

Picker statuses (`pickerEnums.PICKER_STATUS`): PENDING · ACTIVE · REJECTED · BLOCKED · SUSPENDED · DELETION_PENDING
Gate screens: under-review, rejection, blocked, suspended.

Key APIs: GET/PUT `/users/profile`, PUT `/users/location-type`, GET `/locations` + POST `/locations/set` + `/locations/validate`,
GET `/shifts/available` + POST `/shifts/select`, `/training/*`, POST `/documents/upload`, POST `/verify/face`,
`/bank/*`, `/devices/assigned` + collection-complete, POST `/manager/request-otp` + `/manager/verify-otp`.

## Auth (02)
OTP send/verify/resend. Logout is **local only** (no API) → confirm dialog + local wipe. Correct in prototype.

## Shift lifecycle (04 §5)
GET `/shifts/readiness` → POST `/shifts/start` (optional geofence `/locations/validate`) →
`/shifts/start-break` `/end-break` → `/shifts/end`. `POST /presence/ping` heartbeat while on shift.

## Wallet / payouts (04 §6)
GET `/wallet/balance`, POST `/wallet/withdraw {amount, bankAccountId, idempotencyKey}`,
GET `/wallet/history`, `/wallet/earnings-breakdown`. Withdrawal statuses: PENDING · APPROVED · PAID · REJECTED.
Withdraw must not double-call — reuse same idempotencyKey on retry (18 §"must not be double-called").

## Home (04 §2) — counts only, no pick UI. Orders synced from HHD. Correct in prototype.

## Confirmations required (18): logout, withdraw, account delete, cancel.
