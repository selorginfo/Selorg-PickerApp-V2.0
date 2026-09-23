# 06 — Rider Workflow

Base: server root. Login via `/api/signin/*`. Order mutations via `/api/v1/orders/:id/*`.

---

## Rider order statuses (rider_v2 Order)

Observed in backend/models + app workflow:

| Status | Meaning |
|--------|---------|
| `placed` | Created upstream |
| `confirmed` | Confirmed |
| `assigned` | Assigned to rider (awaiting/after accept flow) |
| `arrived_at_darkstore` | Rider at store |
| `picked` | Order picked from hub |
| `out_for_delivery` | En route to customer |
| `arrived_at_customer` | At customer location |
| `delivered` | Delivered |
| `cancelled` | Cancelled |

Active set also referenced in services: `assigned`, `picked`, `picked_up`, `out_for_delivery`, `in_transit` — **`picked_up` / `in_transit` may be legacy aliases; VERIFY before displaying as primary.**

### Propagation to customer

| Rider status | Customer status |
|--------------|-----------------|
| `picked` / `out_for_delivery` | `on-the-way` |
| `arrived_at_customer` | `arrived` |
| `delivered` | `delivered` |

Propagation walks customer chain step-by-step so intermediate statuses remain valid.

---

## 1. Login

```
login
 → optional existing-user-login
 → send-otp → otp → verify-otp
 → GET /api/v1/auth/me + onboarding state
 → onboarding screens OR tabs
```

Refresh: `POST /api/v1/auth/refresh-token`.  
Logout: `POST /api/v1/auth/logout`.

---

## 2. Rider dashboard

| Screen | Home tab |
| API | `GET /api/v1/delivery/home` |
| Also | Availability `POST /delivery/riders/:id/availability` |
| Location | `POST /delivery/riders/:id/location` during active delivery |

---

## 3. Available / assigned orders

| Screen | Live orders / Orders tab |
| API | `GET /api/v1/orders/admin/orders` (filters) |
| Detail | `GET /api/v1/orders/:id` |

---

## 4. Accept / reject

| Action | API | Next |
|--------|-----|------|
| Accept | `POST /orders/:id/accept` | `accepted-order` → travel to darkstore |
| Reject | `POST /orders/:id/reject` `{ reason? }` | Back to list |

---

## 5. Pickup at darkstore

| Screen | `travel-to-darkstore` |
| API | `POST /orders/:id/arrived-at-darkstore` → status `arrived_at_darkstore` |
| Screen | `collect-bag` / `verify-hub-items` |
| Bag scan | **Client-side** match to assigned bag (no dedicated bag-scan API in rider app) |
| API | `POST /orders/:id/pick` → `picked` |

---

## 6. Customer location / navigation

| Screen | `customer-navigation` / `live-order-map` |
| API | Order detail has customer coords; rider posts location |
| Out for delivery | `POST /orders/:id/out-for-delivery` |
| Arrived | `POST /orders/:id/arrived-at-customer` |

Maps may use Google Directions (external) — not Selorg backend.

---

## 7. Delivery + OTP + proof

| Step | Screen | API |
|------|--------|-----|
| Send OTP | `customer-otp-verification` | `POST /orders/:id/otp/send` |
| Resend | same | `POST /orders/:id/otp/resend` |
| Verify | same | `POST /orders/:id/otp/verify` `{ otp }` |
| Photo | `delivery-photo` | `POST /orders/:id/proof/photo` FormData `file` |
| Complete | handover / delivery | `POST /orders/:id/deliver` `{ proofOfDelivery?: { type: 'photo', value: url } }` |

Next: `delivery-complete`.

---

## 8. Failed / cancelled delivery

| Path | Notes |
|------|-------|
| Reject before pickup | `reject` API |
| Incidents / SOS | `POST /api/v1/incidents` |
| Cancelled upstream | Order appears cancelled — exact rider UI handling **VERIFY** |
| Failed delivery dedicated status | **Not found as first-class rider status** — do not invent; use incidents/support |

---

## 9. COD / payment on delivery

| API | Status |
|-----|--------|
| `POST /orders/:id/payment/mark-collected` | Implemented in client **unused by screens** |
| `GET /orders/:id/payment/upi-intent` | Unused by screens |
| Customer COD | On customer `delivered`, backend may set `cod_pending` → `paid` |

---

## 10. Supporting modules

| Module | APIs |
|--------|------|
| Shifts | `/api/v1/rider/shifts/*` |
| Cash | `/api/v1/rider/cash/*` |
| Notifications | `/api/v1/rider/notifications*` |
| KYC | `/api/v1/kyc/*` |
| Payouts | `/api/v1/payouts*` |
| Support | `/api/v1/support/tickets`, `/api/v1/support-chat/rider/*` |
| Config / legal / FAQ | `/api/v1/config`, `/rider/legal/*`, `/content/*` |
| Hub selection | `/operations/warehouses`, preferred-location |

---

## Workflow diagram

```
assigned → accept
  → arrived_at_darkstore
  → pick (picked)
  → out_for_delivery
  → arrived_at_customer
  → OTP + photo
  → deliver (delivered)
```
