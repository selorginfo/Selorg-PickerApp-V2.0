# 03 — Customer App Workflow

Format: **Screen → API → backend action → response → next screen → failures**

Customer-facing order statuses: `pending` | `confirmed` | `getting-packed` | `on-the-way` | `arrived` | `delivered` | `cancelled`.

---

## 1. Login

| Step | Detail |
|------|--------|
| Screen | `Login` |
| API | `POST /auth/send-otp` |
| Backend | Creates OTP session; sends SMS/WhatsApp/email |
| Response | `sessionId`, `channel`, `resendCooldownSeconds` |
| Next | `OTPVerification` |
| Failures | Invalid phone/email; rate limit; delivery failure — stay + error |

| Step | Detail |
|------|--------|
| Screen | `OTPVerification` |
| API | `POST /auth/verify-otp` |
| Backend | Verifies OTP; issues tokens; upserts user |
| Response | `accessToken`, `refreshToken`, `user` |
| Next | `MainTabs` / `LocationPermission` / `Settings` via `completePostAuthNavigation` |
| Side effects | `POST /cart/merge` if guest cart; migrate guest addresses |
| Failures | Wrong OTP; expired session — stay |

| Step | Detail |
|------|--------|
| Screen | OTP | Resend | `POST /auth/resend-otp` | Reset inputs |

Guest: Skip → browse without auth (local cart/addresses).

---

## 2. Home

| Step | Detail |
|------|--------|
| Screen | Home (MainTabs) |
| APIs | `GET /bootstrap`, `GET /home`, `GET /app-config`, optional banner enrich |
| Backend | CMS pages/blocks, categories, feature flags, fees |
| Next | Category / Collection / Banner / Product / Search / Cart |
| Failures | Show offline/empty CMS; retry |

Also: `POST /store/assign` when location available (LocationContext).

---

## 3. Search

| Step | Detail |
|------|--------|
| Screen | `Search` → typeahead | `GET /products/search/suggestions?q=` |
| Screen | `SearchResults` | `GET /products/search?q=` |
| Next | `ProductDetail` |
| Failures | Empty results state; network error |

---

## 4. Categories

| Step | Detail |
|------|--------|
| Screen | `CategoriesExpo` / `Category` / `CategoryProducts` |
| APIs | `GET /categories/{id}`, fallback `GET /categories/{slug}/products` |
| Next | Product detail / subcategory |
| Failures | Empty category; invalid id |

---

## 5. Product

| Step | Detail |
|------|--------|
| Screen | `ProductDetail` |
| API | `GET /products/{id}` |
| Action | Add → `POST /cart/items` `{ productId, variantId, quantity }` |
| Next | Stay / open Cart tab |
| Failures | OOS / validation errors from cart API — toast |

---

## 6. Cart

| Step | Detail |
|------|--------|
| Screen | Cart tab = `Checkout` screen (naming: cart UI lives in Checkout) |
| APIs | `GET /cart`; update/remove endpoints |
| Guest | Local cart only until login merge |
| Next | Continue to address/payment section on same flow → `Payment` |
| Failures | Stock/price errors; show line-level messages |

---

## 7. Address

| Step | Detail |
|------|--------|
| Screens | Addresses stack: list → search → map pin → `EnterCompleteAddress` |
| APIs | CRUD `/addresses*`, set default |
| Checkout | Requires selected/default address |
| Failures | Validation (line1/city/lat-lng); delete last default — UNKNOWN exact rules — VERIFY |

Location permission flow: `LocationPermission` if no addresses post-login.

---

## 8. Checkout

| Step | Detail |
|------|--------|
| Screen | `Checkout` |
| APIs | Cart get; `GET /coupons`; `POST /coupons/validate`; `GET /delivery/estimate`; `GET /delivery/fee`; `GET /user/profile`; optional profile save |
| Backend | Computes fees, tips config from app-config, coupon discount |
| Next | Pay Now → `Payment` |
| Failures | Invalid coupon; no store/zone; empty cart |

---

## 9. Payment

| Step | Detail |
|------|--------|
| Screen | `Payment` |
| API | `POST /orders` create order first |
| Then | Branch by method: |

### COD / full wallet

- Order created with appropriate payment fields
- Clear cart → navigate OrderStatus stack
- Wallet debit path: UI uses wallet balance display; explicit `/wallet/debit` **not called by UI** — **UNKNOWN whether backend auto-debits on create — VERIFY**

### Online (Worldline)

1. `POST /payments/worldline/session`
2. Open native SDK with `sessionPayload`
3. `POST /payments/worldline/complete`
4. Optional `POST /coupons/redeem`
5. Clear cart → reset to MainTabs + OrderStatus
6. Failure → retry-status / retry / new session / abort / record-failure

### Wallet top-up (Wallet screen)

- `POST /wallet/top-up/session` → Worldline → complete → refresh balance

---

## 10. Order created

| Step | Detail |
|------|--------|
| Status | Typically `pending` until payment confirmed / COD accepted path |
| Payment status | `pending` \| `paid` \| `cod_pending` \| `failed` |
| Wallet | If wallet/partial wallet selected, server already deducted `walletDeduction` during create |
| Screen | `OrderStatusMain` polls `GET /orders/active` + Worldline status if unpaid online |
| Failures | Payment pending UI; cancel if allowed |

---

## 10b. Cancel (post-order)

| Step | Detail |
|------|--------|
| Screen | CancelOrderSheet |
| APIs | `GET /orders/{id}/can-cancel` then `POST /orders/{id}/cancel` `{ reason? }` |
| Allowed typically | Customer status `pending`/`confirmed` **and** darkstore not yet picking/packed/OFD |
| Success | Order `cancelled`; may restore cart (unpaid gateway); may refund/credit wallet |
| UI | Show `cancellationFee` if past free window; disable when `allowed: false` + show `reason` |

---

## 11. Order tracking

| Status shown | Meaning (customer) |
|--------------|-------------------|
| pending | Placed / awaiting confirmation or payment |
| confirmed | Store confirmed / assigned into fulfillment |
| getting-packed | Packing / pick complete side of darkstore map |
| on-the-way | Rider picked / out for delivery |
| arrived | Rider at customer |
| delivered | Complete |
| cancelled | Cancelled |

APIs: `GET /orders/active`, `GET /orders/{id}`, WebSocket order updates when connected.

---

## 12. Delivery / arrived / completed

| Step | Detail |
|------|--------|
| Arrived | UI message “partner arrived” |
| Delivered | Navigate `OrderReceived` |
| Cancelled active | Navigate canceled details |

Rider may collect delivery OTP / photo on rider app — customer app may have `POST /orders/{id}/verify-otp` on backend; **customer UI usage not confirmed** → UNKNOWN.

---

## 13. Order history

| Screen | `MyOrders` |
| API | `GET /orders` |
| Filters | all / delivered / cancelled / in_progress |
| Actions | Open detail; reorder `POST /orders/{id}/reorder`; invoice; cancel sheet |
| Rate | Screen stub — `POST /orders/{id}/rate` **not wired** |

---

## 14. Profile

| Screen | `Profile` |
| APIs | GET/PUT `/user/profile`, avatar, phone link OTP trio |
| Next | Stay with success feedback |

---

## 15. Settings

| Screen | Settings (from MainTabs / stack) |
| Actions | Logout → unregister push → `POST /auth/logout` → Login |
| Legal | Terms/Privacy via GeneralInfo stack |

---

## 16. Notifications

| Inbox | `NotificationInbox` — list/read/unread/delete |
| Prefs | `Notifications` — GET/PUT preferences |
| Token | Register FCM/Expo after login; remove on logout |
| Deep link | `resolveNotificationNavigation` |

---

## 17. Wallet

| Screen | `Wallet` |
| APIs | balance, transactions, top-up session |
| Failures | Payment fail → stay; show error |

---

## 18. Support

| Screens | CustomerSupport stack |
| APIs | tickets CRUD/messages/reopen; public fallback create without customer prefix when unauthenticated |
| Next | Ticket detail / chat |

---

## Failure summary (customer journey)

| Stage | Typical failures | UX |
|-------|------------------|-----|
| OTP | Invalid/expired | Retry / resend |
| Cart | Stock | Block checkout line |
| Coupon | Invalid | Clear coupon |
| Order create | Validation / empty address | Stay Payment |
| Payment | Gateway fail/cancel | Retry UI |
| Cancel | Outside window | Disable + reason from can-cancel |
| 401 | Session | Login |
