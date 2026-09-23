# 18 — Frontend Integration Guide

For Claude UI redesign / frontend re-implementation against the **existing** production backend.

---

## Global rules

1. Use only documented endpoints and **actual** status strings (`07-order-lifecycle.md`).
2. Never ship secrets; configure hosts via env var names in README.
3. Prefer existing navigation success/failure paths in workflow docs.
4. Mark gaps as blocked until verified — do not guess request fields.

---

## Per-screen API & navigation (Customer)

| Screen | Primary APIs | On success navigate | Statuses shown |
|--------|--------------|---------------------|----------------|
| Login | send-otp | OTPVerification | — |
| OTPVerification | verify/resend | MainTabs / LocationPermission | — |
| Home | bootstrap, home, app-config | Category/Product/Search/Cart | — |
| Search / Results | suggestions, search | ProductDetail | — |
| CategoryProducts | categories/{id} | ProductDetail | — |
| ProductDetail | products/{id}, cart add | Stay / Cart | availability |
| Checkout (Cart tab) | cart*, coupons, delivery, addresses | Payment | — |
| Payment | orders create + worldline/wallet/COD | OrderStatus stack | payment pending/paid |
| OrderStatusMain | orders/active, pay status, WS | OrderReceived if delivered | customer statuses |
| MyOrders | orders list | detail stacks | filters |
| Profile | user/profile* | stay | — |
| Addresses | addresses* | prior | — |
| Wallet | balance, txns, top-up | stay / pay SDK | — |
| Notifications | notifications* | deep link targets | read/unread |
| Support | tickets* | ticket detail | — |

### Loading / empty / error / success states (Customer)

| Screen | Loading | Empty | Error | Success |
|--------|---------|-------|-------|---------|
| Home | skeleton blocks | empty CMS | retry banner | content |
| Search | spinner | no results | retry | list |
| Cart | overlay on mutate | empty cart CTA | line errors | updated totals |
| Payment | disable Pay / full-screen while SDK | — | retry panel | navigate tracking |
| Orders | list skeleton | no orders | retry | list |
| Tracking | shimmer timeline | no active | retry | live status |

### Enable / disable rules (Customer)

| Action | Enabled when |
|--------|--------------|
| Pay Now | cart non-empty + address + method |
| Cancel | `can-cancel.allowed` |
| Retry payment | `retry-status.canRetry` |
| Apply coupon | validate success |
| Guest checkout pay | **requires login** for server order — guest must auth (current model) |

### Single-flight / confirmation

| Action | Rule |
|--------|------|
| `POST /orders` | Once per pay attempt; disable button until settle |
| `worldline/complete` | Once per successful SDK response; then poll if unsure |
| `cart/merge` | Once per `mergeKey` |
| Cancel / logout | Confirm dialog |
| Delete address | Confirm |

---

## Picker app

| Screen | APIs | Notes |
|--------|------|-------|
| Login/OTP | auth OTP | |
| Onboarding stack | onboarding/state, profile, locations, shifts, training, docs, KYC, bank, devices | Gate by picker status |
| Home | attendance, orders counts, shifts, presence | **No pick UI** |
| Payouts | wallet* | Confirm withdraw amount |
| Notifications | notifications* | |

Do not add fake picking screens unless product merges HHD APIs deliberately.

---

## HHD app

| Screen | API | Status after | UI locks |
|--------|-----|--------------|----------|
| orderReceived | GET pending | — | Start enabled if order present |
| bagScan | POST bags/scan | bag_scanned | Block next until success |
| orderOverview | PUT status picking | picking | Confirm start |
| activePickSession | scanned-items, not-found | item updates | Pause/cancel confirm |
| orderCompletion | assignorders completed | completed | Confirm complete **once** |
| photoInsideBag | POST photos | photo path | Require photo before rack if current flow does |
| scanRackQR | POST racks/scan | rack_assigned | Complete once |

### Loading / empty / error

- Home empty: waiting for assignments
- Scan errors: keep camera open
- Offline: show queue state; do not double-submit on replay without idempotency

---

## Rider app

| Screen | API | Status | Enable when |
|--------|-----|--------|-------------|
| Live orders | list/accept/reject | assigned | Online + available |
| Travel darkstore | arrived-at-darkstore | arrived_at_darkstore | After accept |
| Collect/verify | pick | picked | At store |
| Navigation/Delivery | OFD / arrived customer | out_for_delivery / arrived_at_customer | After pick |
| OTP | send/verify | — | At customer |
| Photo / handover | proof + deliver | delivered | OTP verified (if required by flow) |

Confirmations: reject, deliver, logout, delete account.

Single-flight: accept, pick, deliver, OTP verify.

---

## Admin

| Module | APIs | Status changes |
|--------|------|----------------|
| Citywide | merch/citywide* | surge/dispatch/exceptions |
| Customers | admin/customers* | user status; wallet credit |
| Catalog/CMS | customer/admin/* | product active/publish |
| Pickers | admin/picker* | approval/link-hhd |
| Support | admin/support* | ticket + refund/redelivery |
| Notifications | admin/notifications* | campaign status |
| Analytics | admin/analytics* | read-only |

No order timeline stepper — if added later, wire to existing darkstore/customer privileged APIs only.

Loading: table skeletons. Empty: zero-state. Errors: toast + retain form. Dangerous actions (credit wallet, refund, deactivate): confirmation modal.

---

## Status display cheat sheet

| App | Display vocabulary |
|-----|--------------------|
| Customer | `pending`, `confirmed`, `getting-packed`, `on-the-way`, `arrived`, `delivered`, `cancelled` (+ payment statuses) |
| HHD | HHD device statuses |
| Rider | Rider order statuses |
| Picker home | count labels only (`pending`/`picking` query usage) — not full machine |
| Admin customer drawer | Customer statuses from order payload |

Never show darkstore `READY_FOR_DISPATCH` as a customer-facing label unless mapped to `getting-packed`.

---

## APIs that must not be double-called

1. Order create  
2. Payment complete  
3. Coupon redeem (non-blocking but avoid spam)  
4. Cart merge per key  
5. Rider accept / deliver  
6. HHD assignorders `completed`  
7. Wallet withdraw (uses `idempotencyKey` — reuse same key on retry)  
8. Admin refund on ticket  

---

## Actions requiring confirmation

- Logout (all apps)
- Cancel order
- Delete address / account delete request
- Rider reject / deliver
- HHD cancel/pause/complete
- Admin refund, redelivery, wallet credit, user deactivate, campaign send

---

## Required UX states checklist (every data screen)

- [ ] Loading  
- [ ] Empty  
- [ ] Error with retry  
- [ ] Success feedback (toast or navigation)  
- [ ] Disabled state while mutating  
- [ ] Auth expiry handling (401)  

---

## What redesign agents should hand back

1. UI screens mapped 1:1 to this guide’s APIs  
2. No new backend fields without verification  
3. Explicit list of `UNKNOWN — VERIFY` items resolved before release  
4. Customer tracking UI using **only** customer statuses  

---

## Quick UNKNOWN backlog (updated)

Resolved in this documentation pass:

| # | Topic | Resolution |
|---|--------|------------|
| 2 | Wallet debit on create | **Verified:** `debitWalletForOrder` inside `createOrder` transaction; UI must not also call `/wallet/debit` |
| 3 | HHD `handed_off` | **Verified:** constant unused by rack/photo controllers; rack path sets `completed` |
| 8 | Cancel fee fields | **Verified:** `cancellationFee`, `isPastFreeWindow`, `policy` on can-cancel |
| — | Cancel wallet/cart restore | **Verified:** unpaid gateway restores wallet + cart; paid refunds per policy |

Still verify before release:

1. Customer JWT refresh support (no mounted refresh route)
2. Stock decrement timing in darkstore/store inventory after pick (not in customer createOrder)
3. Catalog stock restore on cancel (cancel restores **cart**, not proven catalog `$inc`)
4. Rider `picked_up` / `in_transit` alias display vs primary enum
5. Production `USE_LEGACY_RIDER` flag
6. Whether customer `POST /orders/:id/verify-otp` is used in any live flow
7. Standalone payment mode production usage
8. Whether any code path ever persists HHD `bag_scanned` / `photo_verified` / `rack_assigned` on the order document
