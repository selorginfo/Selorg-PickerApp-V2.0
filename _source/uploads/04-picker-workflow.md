# 04 — Picker Workflow

## Critical distinction

**`picker-app-v2` is the workforce app** (onboarding, shifts, attendance, payouts, profile).  
**It is not the handheld picking UI.** Item scanning, bag/rack, packing photo = **`HHD-App-v2`** (see `05-hhd-workflow.md`).

Backend still exposes picker order mutations; the current picker mobile UI does **not** call them.

Base path: `/api/v1/picker`

---

## 1. Login

| Step | Screen → API → next |
|------|---------------------|
| Probe | `GET /health` |
| Login | `POST /auth/send-otp` → OTP screen |
| OTP | `POST /auth/verify-otp` → store `token` |
| Resend | `POST /auth/resend-otp` |
| Gate | `GET /onboarding/state` → onboarding stack OR Main tabs |

Failure: invalid OTP → stay; blocked/suspended statuses → dedicated screens.

Logout: **local only** (no logout API).

---

## 2. Dashboard (Home tab)

| API | Purpose |
|-----|---------|
| `GET /locations/current` | Current work location |
| `GET /attendance/stats` | Stats widgets |
| `GET /orders?limit=1` (+ status filters) | Pending/picking **counts only** |
| `GET /orders/completed?limit=1` | Completed count |
| Shift start/end/break | Punch controls |
| `POST /presence/ping` | Heartbeat while on shift |

**No order detail / start picking UI in this app.**

---

## 3. Assigned orders (read-only summary)

- Home reads list endpoints for counts.
- Deep order assignment UX is HHD + darkstore assignment sync (`assignorder:assigned` websocket on HHD).

Order mutation APIs present in `orders.service.ts` but **unwired**:

| API | Method | Path | Resulting status (backend intent) | UI |
|-----|--------|------|-----------------------------------|-----|
| Update status | PUT | `/orders/:id/status` | Client sends `{ status }` — values should match workforce enums when used | **UNUSED IN UI** |
| Complete | POST | `/orders/:id/complete` | Complete picking path | **UNUSED IN UI** |

Mark redesign: either remove dead client methods or build a real pick UI that matches HHD/backend contracts — **do not invent a third status vocabulary**.

---

## 4. Onboarding workflow (actual picker app focus)

```
profile → location-type → select-work-location → select-shift
→ training videos/modules/assessment
→ Aadhaar/PAN upload → documents → Didit KYC → face verification
→ under-review | rejection | blocked | suspended
→ bank details → collect-device (manager OTP) → success → tabs
```

Key APIs:

| Action | API |
|--------|-----|
| Profile | GET/PUT `/users/profile` |
| Location type | PUT `/users/location-type` |
| Locations | GET `/locations`, POST `/locations/set`, GPS helpers |
| Shifts | GET `/shifts/available`, POST `/shifts/select` |
| Training | `/training/*` |
| Documents | POST `/documents/upload`, GET `/documents` |
| Didit | POST `/didit/session`, GET `/didit/status` |
| Face | POST `/verify/face` |
| Devices | `/devices/assigned`, collection-complete, return |
| Manager OTP | POST `/manager/request-otp`, `/manager/verify-otp` |
| Bank | `/bank/verify`, `/bank/accounts*` |

Picker employment statuses (`pickerEnums.PICKER_STATUS`): `PENDING`, `ACTIVE`, `REJECTED`, `BLOCKED`, `SUSPENDED`, `DELETION_PENDING`.

---

## 5. Shift lifecycle

| Action | API | Notes |
|--------|-----|-------|
| Readiness | GET `/shifts/readiness` | Before start |
| Start | POST `/shifts/start` | Optional geofence via `/locations/validate` |
| Break | POST `/shifts/start-break`, `/end-break` | |
| End | POST `/shifts/end` | |
| Attendance | GET `/attendance/summary`, `/stats` | |

---

## 6. Wallet / payouts

| Action | API |
|--------|-----|
| Balance | GET `/wallet/balance` |
| Withdraw | POST `/wallet/withdraw` `{ amount, bankAccountId, idempotencyKey }` |
| History | GET `/wallet/history` |
| Txn detail | GET `/wallet/transactions/:id` |
| Withdrawal status | GET `/wallet/withdrawal-requests/:id` |
| Earnings | GET `/wallet/earnings-breakdown` |

Withdrawal statuses: `PENDING` | `APPROVED` | `PAID` | `REJECTED`.

---

## 7. Notifications / support / legal

| Action | API |
|--------|-----|
| List / read | GET `/notifications`, PUT `/:id/read`, PUT `/read-all` |
| Push register | POST `/api/push-tokens` (path as coded under picker base) |
| Support | GET/POST `/support/tickets` |
| FAQs | GET `/faqs` |
| Legal | GET `/legal/terms`, `/privacy`, `/config` |
| Inventory mismatch issue | POST `/issues` |
| Delete account request | POST `/account/delete-request` |

---

## 8. Order status (workforce) — for when HHD/darkstore sync

Workforce / darkstore fulfillment statuses (`pickerEnums.ORDER_STATUS`):

`ASSIGNED` → `PICKING` → `PICKED` → `PACKED` → `READY_FOR_DISPATCH` (or `CANCELLED`)

HHD drives `picking`/`completed` which sync service maps into darkstore `PICKING`/`PICKED`. See `07-order-lifecycle.md`.

---

## 9. What NOT to build into Picker redesign by mistake

- Full barcode pick loop (belongs in HHD)
- Rider delivery OTP
- Customer cart/checkout

If product intent is “one picker app that also picks,” you must explicitly merge HHD APIs — that is a product decision, not current architecture.
