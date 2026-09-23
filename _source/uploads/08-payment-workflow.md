# 08 — Payment Workflow

Uses **existing** customer Worldline + wallet + COD paths. No invented gateways.

---

## Payment-related statuses

### Order `paymentStatus`

`paid` | `cod_pending` | `pending` | `failed`

### Worldline payment record statuses

`created` | `initiated` | `success` | `failed` | `cancelled` | `pending` | `unknown`

### Purpose

`order` | `wallet_topup`

---

## 1. Checkout → Payment screen

1. User configures cart, address, coupon, tip on `Checkout`
2. Pay Now → `Payment`
3. `POST /api/v1/customer/orders` creates order with:
   - `items[]`, `addressId`, `paymentMethodId`, `paymentMethodType?`, `couponCode?`, `deliveryTip?`, contact fields

Exact server-side branching on `paymentMethodType` values used in production: **confirm against live payloads** — app uses COD / wallet / online modes.

---

## 2. Payment initiation (online)

| Step | API |
|------|-----|
| Create session | `POST /payments/worldline/session` `{ orderId, platform, consumerEmailId, consumerMobileNo, paymentMode? }` |
| Response used | `paymentId`, `txnId`, `hashAlgo`, `sessionPayload` |
| Client | Opens native Worldline SDK |

---

## 3. Payment methods

| Method | Behavior in app |
|--------|-----------------|
| Online (UPI/card via Worldline) | `POST /orders` then session → SDK → complete |
| COD (`cash`) | `POST /orders` → `paymentStatus: cod_pending`; skip Worldline; clear cart → tracking |
| Wallet (`wallet` / `selorg_wallet`) | Balance via `GET /wallet/balance`; **server debits inside createOrder** (see §4) |
| Partial wallet + online | Server sets `walletDeduction` + `onlineAmountDue`, stores `digital` / `wallet_partial_worldline`, then Worldline for remainder |
| Saved cards CRUD | Backend `/payments/methods*` — **UNUSED IN UI** |

Admin configures gateways via `/admin/system/payment-gateways`.

`createOrder` resolves method as: `paymentMethodType || (paymentMethodId ? 'card' : 'cash')`.

---

## 4. Wallet

| Flow | API / mechanism |
|------|-----------------|
| View | `GET /wallet/balance`, `GET /wallet/transactions` |
| Top-up | `POST /wallet/top-up/session` → Worldline → `POST /payments/worldline/complete` |
| Debit for checkout | **Server-side in `createOrder`** via `debitWalletForOrder` inside a Mongo transaction when wallet checkout is requested. Customer App must **not** also call `POST /wallet/debit` (route exists; unused by UI). |
| Full wallet cover | `walletDeduction = totalBill`; `paymentStatus = paid`; `methodType = wallet` |
| Partial wallet | Debit wallet portion at create; remainder paid via Worldline; if remainder &lt; min online amount, create fails unless wallet can cover full bill |
| Credit | `POST /wallet/credit` (backend); admin `POST /admin/customers/:id/wallet/credit` |
| Failed online after partial wallet | `refundWalletForFailedOrderPayment` restores deduction (idempotent via `walletRefundedAt`) |
| Cancel unpaid gateway + wallet deduction | Same restore path on customer cancel |

Txn types (backend): `credit` \| `debit`  
Sources include: `refund`, `cashback`, `promotional`, `goodwill`, `order_payment`, `manual_credit`, `manual_debit`, `expiry`, `payment_topup`

---

## 5. Payment success

1. SDK success payload
2. `POST /payments/worldline/complete` `{ orderId, txnId, response, debug? }`
3. Optional `POST /coupons/redeem`
4. `DELETE /cart/clear`
5. Navigate OrderStatus (reset stack)

Order payment should become `paid` when verification succeeds.

---

## 6. Payment failure

| Step | API / UX |
|------|----------|
| SDK fail / user abort | Stay on Payment / show error |
| Abort attempt | `POST /payments/worldline/abort` `{ orderId, txnId, reason? }` |
| Record | `POST /payments/record-failure` `{ orderId, reason }` best-effort |
| Status poll | `GET /payments/worldline/status?orderId=` → `uiState`, `orderPaymentStatus`, `latestPayment`, `recommendedAction` |

---

## 7. Payment cancellation

- User backs out of SDK → abort path
- Order may remain `pending` payment — OrderStatusMain shows awaiting payment / retry

---

## 8. Verification & polling

| Mechanism | Detail |
|-----------|--------|
| Complete API | Server verifies gateway response |
| Poll | Worldline status from OrderStatus when payment unsettled |
| Gateway return URL | `ALL /payments/worldline/return` (server; not app screen) |
| Standalone | `POST /api/payment/callback`; initiate/status mostly unused by screens |

---

## 9. Retry

| API | Purpose |
|-----|---------|
| `GET /payments/{orderId}/retry-status` | `canRetry`, `reason`, … |
| `POST /payments/{orderId}/retry` | `{ platform, paymentMode }` → `nextAction`, `retryCount` |
| Then | New session if allowed |

**Do not double-complete** the same success payload without server idempotency guarantees — treat complete as sensitive (see integration guide).

---

## 10. Order creation vs payment ordering

**Actual app order:** create order **first**, then pay online.  
Do not redesign to “pay then create” unless backend contract changes.

COD / wallet-full: create order then skip gateway.

---

## 11. Refund flow

| Actor | API |
|-------|-----|
| Customer request | `POST /refunds/request` `{ orderId, reasonCode, reasonText, amount? }` |
| Customer list/detail | `GET /refunds`, `GET /refunds/{id}/details` |
| Auto missing-item | Triggered from darkstore/HHD sync (no customer API) |
| Admin support | `POST /admin/support/tickets/:id/refund` |
| Finance | `/finance/refunds*` / policies (finance dashboard) |

RefundRequest statuses: `pending` | `approved` | `rejected` | `processed` | `escalated` | `completed`  
Methods: `original_payment` | `wallet` | `bank_transfer` | `manual`

---

## 12. Wallet restoration on refund / cancel (verified)

Customer cancel (`executeCancellation`):

| Case | Behavior |
|------|----------|
| Unpaid online (`fulfillmentReleased === false` + card/upi/digital) | `paymentStatus → failed`; restore `walletDeduction` if any; **`restoreCartFromOrder`** |
| Paid + `autoRefundOnCancel` + not cash | `refundAmount = totalBill - cancellationFee` |
| Full wallet pay | Credit wallet immediately → `refundStatus: processed` |
| Partial wallet | Credit wallet portion; remainder → finance `RefundRequest` (`original_payment`) unless method is wallet/manual |
| COD (`cash`) | No auto refund of bill via this paid path |

`can-cancel` data: `allowed`, `reason?`, `cancellationFee`, `isPastFreeWindow`, `policy`.

Default policy statuses: `pending`, `confirmed` only. Also blocked when darkstore is already `PICKING`/`PICKED`/`PACKED`/`READY_FOR_DISPATCH`/ready/out-for-delivery even if customer status is still `confirmed`.

---

## 13. Rider COD collection

APIs exist (`mark-collected`, `upi-intent`) but **Rider UI does not call them today**. Customer COD settlement on `delivered` updates `cod_pending` → `paid` in customer order service.
