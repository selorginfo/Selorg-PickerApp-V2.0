# 01 — API Endpoint Documentation

Base paths use `<API_HOST>`. Auth header pattern unless noted:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Do not invent endpoints. Entries marked **UNUSED IN UI** exist on backend/client services but have no active screen caller in the mapped frontend.

---

## A. Customer App — `/api/v1/customer`

**Auth role:** customer JWT (`sub` = customer user id)  
**Client:** `Customer-App-v2` axios `baseURL` = `{apiBaseUrl}` (already ends with `/api/v1/customer`)

### A.1 Auth

#### Send OTP
| Field | Value |
|-------|--------|
| API name | Customer Send OTP |
| Method | `POST` |
| Path | `/api/v1/customer/auth/send-otp` |
| Auth | No |
| Role | — |
| Headers | `Content-Type: application/json` |
| Body | Email: `{ "email", "preferredChannel"?, "channel"? }` · Phone: `{ "phoneNumber"?, "phone"?, "channel"?, "preferredChannel"? }` — channel values used by app: `sms`, `whatsapp`, `email` |
| Success | `{ success, data: { sessionId, channel, resendCooldownSeconds } }` (shape may vary; app reads these fields) |
| Errors | 400 invalid input; 429 rate limit — UNKNOWN exact body |
| Status codes | 200/201 success; 400; 429; 500 |
| Screen | `Login` |
| Trigger | Continue / send OTP |
| After success | Navigate to `OTPVerification` with `sessionId` |
| After failure | Stay on Login; show error |

#### Verify OTP
| Field | Value |
|-------|--------|
| API name | Customer Verify OTP |
| Method | `POST` |
| Path | `/api/v1/customer/auth/verify-otp` |
| Auth | No |
| Body | `{ "sessionId", "otp" }` |
| Success | `{ data: { accessToken, refreshToken, user } }` |
| Screen | `OTPVerification` |
| Trigger | Submit OTP |
| After success | Persist tokens → post-auth navigation (`MainTabs` / `LocationPermission` / `Settings`) |
| After failure | Show OTP error; stay |

#### Resend OTP
| Field | Value |
|-------|--------|
| Method | `POST` |
| Path | `/api/v1/customer/auth/resend-otp` |
| Auth | No |
| Body | `{ "sessionId" }` |
| Screen | `OTPVerification` |
| Trigger | Resend |

#### Logout
| Field | Value |
|-------|--------|
| Method | `POST` |
| Path | `/api/v1/customer/auth/logout` |
| Auth | Optional Bearer; body may include `{ "refreshToken" }` |
| Screen | Settings logout |
| After success | Clear local tokens → `Login` |

**Note:** Client defines `/auth/refresh` and `/auth/login` but **no production send/verify flow uses password login**, and **no customer refresh route was found mounted** on the backend. See `02-authentication-authorization.md`.

---

### A.2 User / Profile

| API | Method | Path | Auth | Screen | Trigger |
|-----|--------|------|------|--------|---------|
| Get profile | GET | `/user/profile` | Yes | Profile, Checkout | Focus/load |
| Update profile | PUT | `/user/profile` | Yes | Profile, Checkout | Save |
| Upload avatar | POST | `/user/profile/avatar` | Yes | Profile | Pick image — body `{ image }` base64 |
| Send link-phone OTP | POST | `/user/phone/send-otp` | Yes | Profile | Link phone |
| Verify link-phone OTP | POST | `/user/phone/verify-otp` | Yes | Profile | Verify |
| Resend link-phone OTP | POST | `/user/phone/resend-otp` | Yes | Profile | Resend |

Update body fields used by app: `name`, `email`, `dateOfBirth`, `gender`, `avatar`/`avatarUrl`, `savedCheckoutContact`.

---

### A.3 Home / CMS / Catalog (public unless noted)

| API | Method | Path | Auth | Screen |
|-----|--------|------|------|--------|
| Home | GET | `/home` | No | Home bootstrap |
| Bootstrap | GET | `/bootstrap` | No | App/home load |
| App config | GET | `/app-config` | No | AppConfigContext |
| Page by slug | GET | `/pages/{slug}` | No | DynamicPage |
| Collection | GET | `/collections/{slugOrId}` | No | CollectionProducts |
| Banner | GET | `/banners/{id}` | No | BannerDetail |
| Categories list | GET | `/categories` | No | Catalog services |
| Category detail | GET | `/categories/{id}` | No | CategoryProducts — query `subCategoryId?` |
| Category products | GET | `/categories/{slug}/products` | No | Fallback — query `subcategory`, `sort`, `page`, `limit` |
| Products list | GET | `/products` | No | Browse — query `page`, `limit`, `categoryId`, `search`, `sort`, `storeId` |
| Product detail | GET | `/products/{id}` | No | ProductDetail |
| Search | GET | `/products/search` | No | SearchResults — query `q`, list params |
| Suggestions | GET | `/products/search/suggestions` | No | Search typeahead — query `q` |
| Products by category | GET | `/products/category/{categoryId}` | No | Service helper |

Also mounted on backend (same module): `/search`, `/search/suggestions`, `/search/trending`, `/sections/{key}/products` — confirm client usage before relying on them for redesign.

---

### A.4 Cart (auth required)

| API | Method | Path | Body / params | Screen / trigger |
|-----|--------|------|---------------|------------------|
| Get cart | GET | `/cart` | Query: `coupon_code?`, `zone?`, `payment_method?` | CartContext refresh |
| Add item | POST | `/cart/items` | `{ productId, variantId, quantity }` | Add to cart |
| Update by line id | PUT | `/cart/items/{itemId}` | `{ quantity, productId?, variantId? }` | Qty change |
| Update by product | PUT | `/cart/items` | `{ productId, variantId, quantity }` | Qty without line id |
| Remove item | DELETE | `/cart/items/{itemId}` | optional body product/variant | Remove |
| Clear | DELETE | `/cart/clear` | — | After paid order / clear |
| Merge guest | POST | `/cart/merge` | `{ mergeKey, items: [{ productId, variantId?, quantity }] }` | On login |

After success: refresh cart UI. After failure: show error; keep optimistic state rollback per CartContext behavior.

---

### A.5 Orders (auth)

| API | Method | Path | Body | Screen | After success |
|-----|--------|------|------|--------|---------------|
| List | GET | `/orders` | query `page`, `limit`, `status` | MyOrders | Render list |
| Active | GET | `/orders/active` | — | OrderStatusMain | Track; if delivered → OrderReceived; cancelled → canceled UI |
| Detail | GET | `/orders/{id}` | — | Status/success/canceled details | Render |
| Create | POST | `/orders` | `{ items[], addressId, paymentMethodId, paymentMethodType?, couponCode?, deliveryTip?, customerName?, customerEmail?, customerPhone? }` | Payment | Start COD/wallet/Worldline path |
| Can cancel | GET | `/orders/{id}/can-cancel` | — | CancelOrderSheet | Enable/disable cancel |
| Cancel | POST | `/orders/{id}/cancel` | `{ reason? }` | CancelOrderSheet | Refresh canceled UI |
| Reorder | POST | `/orders/{id}/reorder` | `{}` | MyOrders | Navigate Cart/Home |
| Invoice | GET | `/orders/{id}/invoice` | — | OrderItemsDetails | Open/download |

**Backend also has** `POST /orders/{id}/rate`, `GET /orders/{id}/status`, `GET /orders/{id}/tracking`, `POST /orders/{id}/verify-otp`, `PUT /orders/{id}/update-status` (dashboard JWT). Customer UI currently does **not** call rate/status (RateOrder is stub). Mark redesign work as: either wire or omit consciously.

---

### A.6 Payments (customer)

| API | Method | Path | Auth | Screen |
|-----|--------|------|------|--------|
| Worldline session | POST | `/payments/worldline/session` | Yes | Payment, Wallet top-up |
| Worldline complete | POST | `/payments/worldline/complete` | Yes | After SDK |
| Worldline status | GET | `/payments/worldline/status` | Yes | OrderStatusMain poll — query `orderId` |
| Worldline abort | POST | `/payments/worldline/abort` | Yes | Retry helpers |
| Retry status | GET | `/payments/{orderId}/retry-status` | Yes | Payment retry |
| Retry | POST | `/payments/{orderId}/retry` | Yes | Retry pay |
| Record failure | POST | `/payments/record-failure` | Yes | Best-effort |
| Gateway return | ALL | `/payments/worldline/return` | **No** | Gateway callback — not app UI |

Session body fields used: `orderId`, `platform`, `consumerEmailId`, `consumerMobileNo`, `paymentMode?`.

#### Standalone payment host (`paymentApiBaseUrl`)

| API | Method | Path | Notes |
|-----|--------|------|-------|
| Callback | POST | `/api/payment/callback` | Used by StandalonePaymentFlow |
| Initiate | POST | `/api/payment/initiate` | Implemented in client; **no active screen caller found** |
| Status | GET | `/api/payment/status/{orderId}` | Defined; **no screen caller found** |
| Transaction status | POST | `/api/payment/transaction-status` | Backend public; UI usage UNKNOWN |

Saved payment methods CRUD (`/payments/methods`) — **UNUSED IN UI**.

---

### A.7 Wallet / Coupons / Addresses / Delivery / Store

| Module | Endpoints (auth unless noted) |
|--------|-------------------------------|
| Wallet | `GET /wallet/balance`, `GET /wallet/transactions`, `POST /wallet/top-up/session` — `/wallet/debit` UNUSED IN UI; backend also has `/wallet/credit` |
| Coupons | `GET /coupons` (public list params), `POST /coupons/validate` (public), `POST /coupons/redeem` (auth) |
| Addresses | `GET /addresses`, `GET /addresses/default`, `POST /addresses`, `PUT /addresses/{id}`, `DELETE /addresses/{id}`, `POST /addresses/{id}/default` |
| Delivery | `GET /delivery/estimate`, `GET /delivery/fee` (`optionalAuth`) |
| Store | `POST /store/assign` `{ latitude, longitude }` (`optionalAuth`) — `GET /store/{storeId}/inventory` UNUSED IN UI |

Address body fields: `label`, `line1`, `line2?`, `landmark?`, `city`, `state?`, `pincode?`, `latitude`, `longitude`, `isDefault?`.

---

### A.8 Notifications / Refunds / Support / Legal / Onboarding

| Module | Endpoints |
|--------|-----------|
| Notifications | `GET /`, `GET /unread-count`, `PUT /{id}/read`, `PUT /{id}/unread`, `PUT /read-all`, `DELETE /{id}`, `GET|PUT /preferences`, `POST /register-token`, `POST /remove-token`, `POST /remove-all-tokens`, `GET /vapid-public-key` (no auth) |
| Refunds | `GET /refunds`, `GET /refunds/{id}/details`, `POST /refunds/request` |
| Support | `GET|POST /support/tickets`, `GET /support/tickets/active`, `GET|POST /support/tickets/{id}/messages`, `POST /support/tickets/{id}/reopen` |
| Legal | `GET /legal/terms`, `GET /legal/privacy` |
| Onboarding | `POST /onboarding/complete` (best-effort) |
| Health | `GET /health` (NoInternet / probe) |

Refund request body used: `orderId`, `reasonCode`, `reasonText`, amount optional.

---

## B. Picker App — `/api/v1/picker`

**Auth:** Bearer picker JWT + session (`requireAuth`)  
**Important:** Order **mutation** APIs exist (`PUT /orders/:id/status`, `POST /orders/:id/complete`) but **picker-app-v2 UI does not call them**. Home only reads order counts. Picking is HHD.

### B.1 Auth

| API | Method | Path | Auth | Body |
|-----|--------|------|------|------|
| Send OTP | POST | `/auth/send-otp` | No | `{ phone, preferredChannel }` or `{ email, preferredChannel: "email" }` |
| Resend OTP | POST | `/auth/resend-otp` | No | `{ phone }` or `{ email }` |
| Verify OTP | POST | `/auth/verify-otp` | No | `{ phone, otp, preferredChannel? }` or `{ email, otp }` → `{ token }` |
| Dark-store login | POST | `/auth/dark-store-login` | Yes | Backend route — UI usage UNKNOWN |
| Store OTP | GET | `/auth/store-otp` | Yes | Backend route — UI usage UNKNOWN |

Logout: **no API** — client clears local token only.

### B.2 Core app endpoints used by UI

| Area | Method | Path | Trigger |
|------|--------|------|---------|
| Health | GET | `/health` | Pre-login |
| Config | GET | `/config` | App config |
| Onboarding state | GET | `/onboarding/state` | Gate screens |
| Profile | GET/PUT | `/users/profile` | Profile / onboarding |
| Profile overview | GET | `/users/profile/overview` | Profile tab |
| Location type | PUT | `/users/location-type` | Onboarding |
| UPI | PUT | `/users/upi` | Update UPI |
| Locations | GET `/locations`, POST `/locations/set`, POST `/locations/validate`, GET `/locations/current`, GPS helpers | Work location / geofence |
| Shifts | GET `/shifts/available`, GET `/shifts/readiness`, POST `/shifts/select`, `/start`, `/end`, `/start-break`, `/end-break` | Shift lifecycle |
| Attendance | GET `/attendance/summary`, `/attendance/stats` | Attendance / home |
| Orders (read) | GET `/orders`, `/orders/completed` | Home counts only |
| Training / docs / Didit / face / devices / bank / wallet / notifications / support / FAQs / legal / issues / presence / account delete / push-tokens | See picker app report | Onboarding & account |

---

## C. HHD App — `/api/v1/hhd`

**Auth:** `protect` (Bearer); roles in middleware may include `picker`, `supervisor`, `admin`.

### C.1 Auth

| API | Method | Path | Auth |
|-----|--------|------|------|
| Send OTP | POST | `/auth/send-otp` | No — body `{ mobile }` |
| Verify OTP | POST | `/auth/verify-otp` | No — `{ mobile, otp }` → `token`, `user` |
| Resend OTP | POST | `/auth/resend-otp` | No — backend; confirm UI wiring |
| Me | GET | `/auth/me` | Yes |
| Logout | POST | `/auth/logout` | Yes |

### C.2 Order / pick / pack (UI-driven)

| API | Method | Path | Body | Screen | Status effect |
|-----|--------|------|------|--------|---------------|
| List / by status | GET | `/orders`, `/orders/status/{status}` | query | Home, OrderReceived | — |
| Order detail | GET | `/orders/{id}` | — | After rack | — |
| Update order status | PUT | `/orders/{id}/status` | `{ status, bagId?, rack?, ... }` | Start picking → `picking` | HHD status → sync darkstore |
| Assignorder by status | GET | `/orders/assignorders/status/{status}` | — | Lists | — |
| Assignorder status | PUT | `/orders/assignorders/{id}/status` | `{ status }` | complete / pause / cancel | `completed`, `paused`, `cancelled` |
| Completed | GET | `/orders/completed` | — | Stats | — |
| Bag scan | POST | `/bags/scan` | `{ qrCode, orderId }` | BagScanScreen | bag_scanned path |
| Items for order | GET | `/items/order/{orderId}` | — | Active pick | — |
| Item scan (service) | POST | `/items/scan` | `{ itemId, orderId }` | Available in service | — |
| Not found | PUT | `/items/{id}/not-found` | `{ notes?, substituteSku? }` | Pick session | item not_found |
| Substitutes | GET | `/items/substitutes` | query `sku`, `orderId`, `limit` | Pick | — |
| Scanned items | POST | `/scanned-items` | `{ barcodeData, barcodeType?, orderId?, deviceId?, metadata? }` | Each barcode | — |
| Rack scan | POST | `/racks/scan` | `{ qrCode, orderId, riderId?, pickTime? }` | ScanRackQR | rack_assigned |
| Photos | POST `/photos`, GET `/photos/order/{orderId}/bag/{bagId}`, PUT `/photos/{id}/verify` | multipart / verify | PhotoInsideBag | photo_verified |
| Heartbeat | POST | `/users/heartbeat` | `{}` | Home/orders | presence |
| Device | GET | `/devices/current` | — | Device context | — |
| Tasks | GET/PUT | `/tasks`, `/tasks/{id}` | — | Tasks screen | — |
| Profile | GET/PUT | `/users/profile` | — | Profile | — |

HHD order status vocabulary: `pending`, `received`, `bag_scanned`, `picking`, `completed`, `photo_verified`, `rack_assigned`, `handed_off` — see `07-order-lifecycle.md`.

---

## D. Rider App — server root

**Auth:** Bearer rider JWT. Refresh via `/api/v1/auth/refresh-token`.

### D.1 Sign-in / auth

| API | Method | Path | Auth | Body |
|-----|--------|------|------|------|
| Existing user login | POST | `/api/signin/existing-user-login` | No | `{ mobileNumber }` — may skip OTP |
| Send OTP | POST | `/api/signin/send-otp` | No | `{ mobileNumber }` |
| Resend OTP | POST | `/api/signin/resend-otp` | No | `{ mobileNumber }` |
| Verify OTP | POST | `/api/signin/verify-otp` | No | `{ mobileNumber, otp, deviceId, deviceName }` |
| Refresh | POST | `/api/v1/auth/refresh-token` | No | `{ refreshToken }` |
| Me | GET | `/api/v1/auth/me` | Yes | — |
| Logout | POST | `/api/v1/auth/logout` | Yes | — |
| Onboarding / profile photo / delete account | various under `/api/v1/auth/...` | Yes | See rider workflow |

Also backend mounts `/api/v1/auth/send-otp` + `/verify-otp` (rider_v2). **Rider-app-v2 UI uses `/api/signin/*` for login.**

### D.2 Delivery order mutations

| API | Method | Path | Body | Rider status after |
|-----|--------|------|------|--------------------|
| List admin/live | GET | `/api/v1/orders/admin/orders` | query `status`, `darkstoreCode`, `limit` | — |
| Detail | GET | `/api/v1/orders/{id}` | — | — |
| Accept | POST | `/api/v1/orders/{id}/accept` | `{}` | accepted assignment |
| Reject | POST | `/api/v1/orders/{id}/reject` | `{ reason? }` | rejected |
| Arrived darkstore | POST | `.../arrived-at-darkstore` | `{}` | `arrived_at_darkstore` |
| Pick | POST | `.../pick` | `{}` | `picked` |
| Out for delivery | POST | `.../out-for-delivery` | `{}` | `out_for_delivery` |
| Arrived customer | POST | `.../arrived-at-customer` | `{}` | `arrived_at_customer` |
| Deliver | POST | `.../deliver` | `{ proofOfDelivery?: { type, value } }` | `delivered` |
| Proof photo | POST | `.../proof/photo` | FormData `file` | — |
| OTP send/resend/verify | POST | `.../otp/send`, `/resend`, `/verify` | mobile optional; verify `{ otp }` | — |
| Mark COD collected | POST | `.../payment/mark-collected` | `{}` | **Defined in client; no screen caller found** |
| UPI intent | GET | `.../payment/upi-intent` | — | **No screen caller found** |

### D.3 Rider home / profile / shifts / cash / KYC / payouts / incidents / support

See `06-rider-workflow.md` and master index for full list including:

- `/api/v1/delivery/home`, `/delivery/riders/{id}`, availability, location, cities
- `/api/v1/operations/warehouses`
- `/api/v1/rider/shifts/*`, `/api/v1/rider/notifications*`, `/api/v1/rider/cash/*`, `/api/v1/rider/kit/*`, `/api/v1/rider/legal/*`
- `/api/v1/kyc/*`, `/api/v1/payouts/*`, `/api/v1/incidents`, `/api/v1/support/tickets`, `/api/v1/support-chat/rider/*`
- `/api/v1/content/faq/{key}`, `/api/v1/content/page/{key}`, `/api/v1/config`

---

## E. Admin Dashboard — `/api/v1`

**Auth:** Dashboard JWT via `POST /admin/auth/login`  
**Roles:** `admin`, `super_admin` for Admin UI routes.

Admin does **not** expose a full order status machine screen. Key modules:

| Module | Prefix / examples |
|--------|-------------------|
| Auth | `POST /admin/auth/login`, logout |
| Citywide | `/merch/citywide/*` |
| Customers | `/admin/customers`, `.../:id`, orders, wallet credit, refunds, tickets |
| Catalog/CMS | `/customer/admin/home/*`, `/customer/admin/cms/*` |
| Pickers | `/admin/pickers`, `/admin/picker/*` (approvals, link-hhd, attendance, OT, shifts) |
| Riders (list) | `/admin/riders`, vehicle types |
| HHD link | `POST|DELETE /admin/picker/pickers/:id/link-hhd` |
| Support | `/admin/support/*` including refund + redelivery |
| Notifications | `/admin/notifications/*`, `POST /customer/admin/notifications/send` |
| Coupons | `/merch/pricing/coupons`, `/customer/admin/coupons` |
| Analytics | `/admin/analytics/*` |
| System/settings | `/admin/system/*`, `/admin/platform-config`, integrations, fraud, compliance, audit |
| Master data | `/admin/stores`, warehouses, staff, cities, zones, store-warehouse inventories |

Full module detail: `13-admin-dashboard-api.md`.

**Darkstore order ops** (if ops user opens Darkstore UI — not Admin sidebar):  
`GET/PATCH /darkstore/orders/:id`, assign, start-picking, complete-picking, cancel, mark-rto, bag-rack, etc.

---

## F. Realtime (not REST)

| Channel | Path | Used by |
|---------|------|---------|
| Socket.IO | `/hhd-socket.io` | HHD / dashboards — events e.g. `assignorder:assigned`, `order:updated`, `live_orders:snapshot` |
| Rider WS | `/ws` | Rider — `order_assignment_update`, `order_update` |
| Customer tracking | WS derived from API host (strip `/api/v1/customer`) | OrderStatus screens |

Exact event payloads: partially documented in `14-cross-app-workflow.md`; treat unknown fields as **UNKNOWN — VERIFY BEFORE FRONTEND IMPLEMENTATION**.

---

## G. Endpoint documentation template (for additions)

When adding newly discovered endpoints, fill:

- API name · Method · Full path · Auth · Role · Headers · Path/query/body · Success · Errors · Status codes · Screen · Trigger · Success/failure UX
