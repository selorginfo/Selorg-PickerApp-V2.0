# 15 — API Error Documentation

Expected frontend behavior for redesigns. Exact error body shapes may vary; always prefer server `message` / `error` fields when present.

Common envelope:

```json
{
  "success": false,
  "error": "<CODE_OR_MESSAGE>",
  "message": "<HUMAN_READABLE>"
}
```

---

## HTTP status codes

### 400 Bad Request

| Meaning | Frontend |
|---------|----------|
| Validation failed (missing fields, bad OTP format, invalid transition) | Inline field errors or toast; stay on screen; do not clear form blindly |
| Invalid order status transition | Show message; refresh order; disable illegal action |

### 401 Unauthorized

| Meaning | Frontend |
|---------|----------|
| Missing/expired/invalid token | Clear session (except intentional guest mode); navigate Login; optional “Session expired” |
| Rider | Attempt refresh once; if fail → login |
| Customer | No refresh endpoint — logout path |
| Admin | Redirect `/login` |

### 403 Forbidden

| Meaning | Frontend |
|---------|----------|
| Authenticated but wrong role/permission | Keep session; access-denied UI; hide action |
| Blocked user | Dedicated blocked state if API indicates |

### 404 Not Found

| Meaning | Frontend |
|---------|----------|
| Order/product/ticket missing | Empty/not-found screen; back navigation |
| Do not retry endlessly |

### 409 Conflict

| Meaning | Frontend |
|---------|----------|
| Duplicate / state conflict (e.g. merge, double accept) | Refresh authoritative state; show conflict message; disable duplicate submit |

Exact 409 usage per endpoint: **partially UNKNOWN — VERIFY** when implementing.

### 422 Unprocessable Entity

| Meaning | Frontend |
|---------|----------|
| Semantic validation (coupon rules, cancel window) | Show `reason` from payload (e.g. can-cancel); keep user on flow |

### 429 Too Many Requests

| Meaning | Frontend |
|---------|----------|
| OTP / auth rate limit | Show cooldown; disable resend until `resendCooldownSeconds` |

### 500 Internal Server Error

| Meaning | Frontend |
|---------|----------|
| Server failure | Generic error + retry; do not lose local draft if safe; log correlation id if returned |

---

## Network failure

| Case | Frontend |
|------|----------|
| Offline / DNS / connection refused | NoInternet / offline banner; queue only where app already supports (HHD offline queue) |
| Health check fail | Customer/Picker may probe `/health` |

---

## Timeout

| Case | Frontend |
|------|----------|
| Request timeout | Retry with backoff for GETs; **do not auto-retry** payment complete / order create / deliver without idempotency key awareness |
| Payment SDK hang | Abort path + status poll |

---

## Domain-specific failures

| Domain | Behavior |
|--------|----------|
| OTP wrong | Stay; clear OTP boxes optionally; remaining attempts UNKNOWN |
| Cart OOS | Line error; block checkout |
| Coupon invalid | Remove coupon; show reason |
| Payment failed | Retry UI via retry-status |
| Cancel not allowed | Disable CTA; show `can-cancel.reason` |
| Rider accept race | Refresh live orders |
| HHD bad QR | Rescan prompt |

---

## Exact stock / cart messages (Customer)

| Message | Typical HTTP | UX |
|---------|--------------|-----|
| `This product is currently unavailable.` | 400 | Disable add; show unavailable |
| `This product is currently out of stock.` | 400 | OOS state |
| `Only {N} unit(s) available.` | 400 | Cap qty / toast |
| `productId and quantity required` | 400 | Dev/validation |
| `Item not found` / `Cart not found` | 404 | Refresh cart |
| `mergeKey required` | 400 | Re-login merge |
| `Items required` / `Address not found` / `Product not found: …` | 400 on order create | Block pay |
| `Selorg Wallet is not available` | 400 | Disable wallet |
| `Insufficient wallet balance…` | 400 | Prompt top-up |
| Remainder below min online payment | 400 | Prompt top-up or pay without wallet |
| `Cannot cancel order in "{status}" status` | 200 can-cancel allowed:false OR cancel error | Disable cancel |
| `Cannot cancel order while fulfillment is in "{ds}" status` | can-cancel | Disable cancel |
| `Daily cancellation limit reached` | can-cancel | Disable cancel |
| `Invalid OTP` (+ attemptsRemaining) | 400 | Retry OTP |

---

## Mapping table (quick)

| Code | Loading | Empty | Error surface | Navigation |
|------|---------|-------|---------------|------------|
| 400 | stop | — | inline/toast | stay |
| 401 | stop | — | session modal optional | login |
| 403 | stop | — | denied | stay |
| 404 | stop | not found | — | back |
| 409 | stop | — | conflict | refresh |
| 422 | stop | — | reason | stay |
| 429 | stop | — | cooldown | stay |
| 500 | stop | — | retry | stay |
| network | stop | offline | retry | stay |
| timeout | stop | — | retry carefully | stay |
