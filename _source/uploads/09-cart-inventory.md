# 09 — Cart & Inventory Workflow

Base: `/api/v1/customer/cart` (auth required for server cart).

---

## 1. Add to cart

| Item | Detail |
|------|--------|
| API | `POST /cart/items` |
| Body | `{ productId, variantId, quantity }` |
| Auth | Bearer customer |
| Backend | `addItem` — if line exists, increments qty; validates stock via `assertStockAllowsAsync` |
| Success | `{ success: true, data: <cart> }` → CartContext |
| Failure | `400` with message (see stock errors below) |

Guest: local storage cart only until login merge.

---

## 2. Update quantity

| API | When | Body |
|-----|------|------|
| `PUT /cart/items/{itemId}` | Known line id | `{ quantity, productId?, variantId? }` |
| `PUT /cart/items` | By product+variant | `{ productId, variantId, quantity }` — `productId` + `quantity` required |

`quantity === 0` removes the line (server `updateItem` path).

Stock re-checked on update (`mode: 'set'`).

Errors: `400` validation/stock; `404` item/cart not found.

---

## 3. Remove item

`DELETE /cart/items/{itemId}`  
Optional body: `{ productId?, variantId? }` for server fallback when line id mismatch.  
`404` if not found.

---

## 4. Clear cart

`DELETE /cart/clear` — after successful paid order / explicit clear.  
Returns `{ success: true, data }`.

---

## 5. Stock validation (verified)

Live sellable qty comes from catalog + `StoreInventory` helpers in `productStock.js`.

Checked on:

- Cart add (`mode: 'add'` — existing cart qty + requested)
- Cart update (`mode: 'set'`)
- Order create (`assertStockAllowsAsync` per line)

### Exact error messages returned to clients

| Condition | Message |
|-----------|---------|
| Inactive / draft | `This product is currently unavailable.` |
| `isSaleable === false` | `This product is currently unavailable.` |
| Available ≤ 0 | `This product is currently out of stock.` |
| Requested &gt; available | `Only {N} unit(s) available.` |
| Max order limit | From `assertMaxOrderLimit` (product `maxOrderLimit`) |

HTTP: cart/order create map these to **400** with `{ success: false, message }`.

Cart GET also attaches live `stock` / `inStock` onto lines for UI.

`GET /store/{storeId}/inventory` exists — **UNUSED IN UI**.  
Store assignment: `POST /store/assign` `{ latitude, longitude }` influences which store inventory applies.

---

## 6. Out-of-stock behavior

| Stage | Behavior |
|-------|----------|
| Browse | Product may show unavailable from catalog fields |
| Add/update | API rejects with messages above — toast; no navigate |
| Order create | Same assert — block payment start |
| HHD pick | `PUT /items/:id/not-found` → possible auto-refund on complete |
| Do not invent soft-OOS customer order statuses beyond existing item statuses |

---

## 7. Price validation

- Cart GET may reprice with query `coupon_code`, `zone`, `payment_method`
- Coupon validate uses `cart_items`, `cart_value`, fees
- Order create recomputes prices from live product/variant + pricing engine when enabled
- Final authority is order create + payment amount on server

MRP / sale: product `originalPrice` / `price` (and variant `price`) stored on order lines.

---

## 8. Cart merge / login

| API | `POST /cart/merge` |
| Body | `{ mergeKey: string, items: [{ productId, variantId?, quantity }] }` |
| When | After successful OTP verify |
| Rules | `mergeKey` required; `items` must be array if present; **idempotent per mergeKey** — call once |
| Errors | `400` mergeKey/items/stock |

---

## 9. Checkout validation

Before `POST /orders`:

- Non-empty `items[]`
- Valid `addressId` owned by user
- Stock assert per line
- Payment method fields (`paymentMethodId`, `paymentMethodType`)
- Optional `couponCode`, `deliveryTip`, contact fields

Server rejects with `{ error: '...' }` mapped to 4xx by controller.

---

## 10. Inventory after order (verified finding)

- **Customer `createOrder` validates stock but does not `$inc` / decrement `stockQuantity` in `orderService`** (no inventory decrement found in that create path).
- Coupon `usageCount` may `$inc` on create when applicable.
- Operational inventory consumption is tied to darkstore / store inventory systems during fulfillment — **exact pick-time decrement path remains operational-backend detail; UI should not assume createOrder reserved units visually unless API returns reduced stock.**

Frontend implication: rely on cart/product stock fields + error messages; do not invent a local “reserved” badge unless CMS provides it.

---

## 11. Inventory / cart after cancellation (verified)

Customer cancel (`executeCancellation`):

1. Sets order `cancelled`
2. May restore **wallet** deduction if unpaid gateway + `walletDeduction`
3. May create refunds / credit wallet for paid orders per cancellation policy
4. If unreleased gateway payment: **`restoreCartFromOrder`** (cart lines restored) — **not** a documented catalog stock `$inc` restore in this service

Darkstore cancel / RTO: separate ops path; customer status → `cancelled`.

**Do not promise “stock instantly restocked” in cancel success copy** unless ops confirms store inventory restore.

---

## 12. Can-cancel (related to checkout post-order)

`GET /orders/{id}/can-cancel` → `{ success, data }` where data includes:

| Field | Meaning |
|-------|---------|
| `allowed` | boolean |
| `reason` | when not allowed |
| `cancellationFee` | number |
| `isPastFreeWindow` | boolean |
| `policy` | active cancellation policy object |

Default policy when none configured: allowed statuses `pending`/`confirmed`, `freeWindowMinutes: 2`, fee 0, `autoRefundOnCancel: true`.

Also blocked when darkstore fulfillment status is in picking/packed/ready/out-for-delivery set even if customer status still `confirmed`.

---

## Cart response fields commonly used by app

`items[]` (line id, productId, variantId, quantity, price, name, image, stock/inStock), totals, coupon, fees — see `16-api-response-examples.md`.
