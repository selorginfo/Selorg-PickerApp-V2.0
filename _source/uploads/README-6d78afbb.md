# Selorg Backend ↔ Frontend Integration Documentation

This package documents the **existing production backend APIs and workflows** so Claude (or any frontend redesign agent) can rebuild Customer, Rider, Picker, HHD, and Admin UIs **without receiving backend source code**, while preserving behavior and integrating with the live API.

## Source of truth

| Source | Role |
|--------|------|
| `selorg-backend-v1.2` | Canonical API routes, status enums, auth, transitions |
| `Customer-App-v2` | Customer screens → API mapping |
| `Rider-app-v2` | Rider screens → API mapping |
| `picker-app-v2` | Picker workforce screens → API mapping |
| `HHD-App-v2` | Handheld pick/pack screens → API mapping |
| `selorg-dashboard-frontend-v1.2` | Admin dashboard screens → API mapping |

**Rule for redesign agents:** Do not invent endpoints, request fields, response fields, or order statuses. If a detail is missing here, it is marked `UNKNOWN — VERIFY BEFORE FRONTEND IMPLEMENTATION`.

## What this package deliberately excludes

- Backend source code
- `.env` values, API keys, JWT secrets, DB credentials, Firebase private keys, AWS credentials
- Real tokens, passwords, personal customer data
- Unmounted / dead stub routes under `src/routes/api/v1/*` (not wired in `server.js`)

## Base URL layout (no secrets)

Apps call the production API host configured via env vars (names only):

| App | Env var names | Typical path prefix |
|-----|---------------|---------------------|
| Customer | `API_BASE_URL` → `extra.apiBaseUrl` | `/api/v1/customer` |
| Customer payments (standalone) | `PAYMENT_API_BASE_URL` | `/api/payment` |
| Picker | `EXPO_PUBLIC_API_URL` / `API_BASE_URL` | `/api/v1/picker` |
| HHD | `EXPO_PUBLIC_API_URL` | `/api/v1/hhd` |
| Rider | `EXPO_PUBLIC_API_BASE_URL` | server root (`/api/v1/...`, `/api/signin/...`) |
| Admin | `VITE_API_BASE_URL` | `/api/v1` |

Replace `<API_HOST>` in examples with the configured host. Never hardcode secrets.

## How Claude should use this package

1. Read **`07-order-lifecycle.md`** first — Selorg uses **multiple status vocabularies** (customer / darkstore / HHD / rider) that map into each other.
2. Read the workflow file for the app you are redesigning (`03`–`06`, `13`).
3. Use **`01-api-endpoints.md`** + **`16-api-response-examples.md`** for request/response contracts.
4. Use **`17-api-master-index.md`** as a quick lookup table.
5. Follow **`18-frontend-integration-guide.md`** for loading/empty/error states, idempotent calls, and navigation rules.
6. Treat anything marked **`UNKNOWN — VERIFY BEFORE FRONTEND IMPLEMENTATION`** as blocked until confirmed against the live API or backend owners.

## Document index

| File | Contents |
|------|----------|
| [01-api-endpoints.md](./01-api-endpoints.md) | Endpoint catalog by app |
| [02-authentication-authorization.md](./02-authentication-authorization.md) | Login, tokens, roles, protected routes |
| [03-customer-workflow.md](./03-customer-workflow.md) | Customer journey end-to-end |
| [04-picker-workflow.md](./04-picker-workflow.md) | Picker workforce app (not handheld pick) |
| [05-hhd-workflow.md](./05-hhd-workflow.md) | HHD pick/pack device flow |
| [06-rider-workflow.md](./06-rider-workflow.md) | Rider delivery flow |
| [07-order-lifecycle.md](./07-order-lifecycle.md) | Cross-system order statuses |
| [08-payment-workflow.md](./08-payment-workflow.md) | Checkout, Worldline, wallet, COD |
| [09-cart-inventory.md](./09-cart-inventory.md) | Cart + stock validation |
| [10-product-search-category.md](./10-product-search-category.md) | Catalog APIs |
| [11-customer-profile-address.md](./11-customer-profile-address.md) | Profile, OTP, addresses |
| [12-notification-workflow.md](./12-notification-workflow.md) | Push + in-app notifications |
| [13-admin-dashboard-api.md](./13-admin-dashboard-api.md) | Admin modules & APIs |
| [14-cross-app-workflow.md](./14-cross-app-workflow.md) | E2E Customer → Picker/HHD → Rider → Admin |
| [15-api-errors.md](./15-api-errors.md) | Error codes & frontend behavior |
| [16-api-response-examples.md](./16-api-response-examples.md) | Sanitized JSON examples |
| [17-api-master-index.md](./17-api-master-index.md) | Master API table |
| [18-frontend-integration-guide.md](./18-frontend-integration-guide.md) | Screen integration rules |

## Critical architecture notes for UI redesign

1. **Picker App ≠ picking UI.** `picker-app-v2` is onboarding, shifts, attendance, wallet, and profile. **Actual item scanning / packing is `HHD-App-v2`.**
2. **Customer-facing order status** is the only status customers should see: `pending` → `confirmed` → `getting-packed` → `on-the-way` → `arrived` → `delivered` (or `cancelled`).
3. **Admin does not drive the order status machine** in the Admin UI. Ops status changes come from Darkstore / HHD / Rider; Admin views customers, support refunds/redelivery, citywide control, catalog, pickers, etc.
4. **Customer JWT refresh endpoint is not implemented** in production customer auth routes. Refresh token may be stored client-side but is not refreshed via `/auth/refresh`. On 401, apps clear session and return to login.
5. **Rider** uses `/api/signin/*` for OTP login and `/api/v1/auth/refresh-token` for refresh; delivery mutations live under `/api/v1/orders/:id/*`.

## Placeholders used in examples

| Placeholder | Meaning |
|-------------|---------|
| `<API_HOST>` | Configured API origin |
| `<TOKEN>` | Bearer access token (never log/commit) |
| `<REFRESH_TOKEN>` | Refresh token where applicable |
| `<USER_ID>` | User / customer / rider / picker id |
| `<ORDER_ID>` | Mongo/Object id |
| `<ORDER_NUMBER>` | Human-readable order number |
| `<SESSION_ID>` | OTP session id |
| `<PRODUCT_ID>` / `<VARIANT_ID>` | Catalog ids |
| `<ADDRESS_ID>` | Address id |
| `<STORE_ID>` | Darkstore / store id |

## Maintenance

When the backend changes, update the matching workflow + endpoint docs and the master index. Prefer documenting **what frontends actually call** over dumping every internal dashboard route.

## Verified clarifications (follow-up pass)

These were previously UNKNOWN and are now documented from backend source:

- Wallet debit happens **inside** `POST /orders` (`debitWalletForOrder`), not via customer `/wallet/debit`
- HHD rack scan sets order to **`completed`** (constants `handed_off` / `rack_assigned` / `photo_verified` are not written by those controllers)
- `can-cancel` returns `allowed`, `cancellationFee`, `isPastFreeWindow`, `policy` (and `reason` when blocked)
- Customer order create **validates** stock but does not decrement catalog stock in `orderService`
- Cancel restores **cart** for unpaid gateway orders and may restore/refund **wallet** per policy
