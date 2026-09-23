# 13 — Admin Dashboard API

Frontend: `selorg-dashboard-frontend-v1.2`  
Base: `VITE_API_BASE_URL` → typically `/api/v1`  
Auth: Bearer dashboard JWT from `POST /admin/auth/login`  
Roles for Admin shell: `admin`, `super_admin`

**Important:** Admin UI does **not** include a Live Order status stepper. Order ops live mainly on Darkstore/HHD/Rider; Admin focuses on citywide control, customers, catalog, pickers, support, analytics, CMS, system.

Envelope: `{ success, data, error?, message?, meta? }`

---

## Auth

| Screen | API | Request | Response | Notes |
|--------|-----|---------|----------|-------|
| Login | `POST /admin/auth/login` | `{ email, password, role? }` | `{ token, user }` | 401 invalid |
| Logout | `POST .../logout` | Bearer | — | Client also clears local |

Permissions: JWT `permissions[]`; admin/super_admin may effective `*`.

---

## Citywide Control (`citywide`)

Prefix `/merch/citywide`

| Action | APIs |
|--------|------|
| Live metrics | `GET /live-metrics` |
| Zones | `GET /zones`, `GET /zones/:zoneId`, trend |
| Request riders | `POST /zones/:zoneId/request-riders` |
| Incidents | `GET/PATCH /incidents/:id` |
| Exceptions | `GET /exceptions`, `POST /:id/resolve` |
| Surge | CRUD + `POST /surge/actions` |
| Dispatch | GET/PUT/PATCH, restart, manual-override, logs |
| Health / SLA / seed | integration-health, sla, seed |

Status changes: zone/surge/dispatch operational states — **not** customer order enum.

---

## Customers (`customers`)

| Screen action | API | Body |
|---------------|-----|------|
| List/stats | `GET /admin/customers`, `/stats` | query filters |
| Detail/patch | `GET/PATCH /admin/customers/:id` | status e.g. active/inactive/blocked |
| Orders | `GET /:id/orders` | read-only drawer |
| Addresses / payment methods / password-info | GET | |
| Reset/set password | PUT | |
| Refunds / tickets / risk | GET | |
| Wallet view/credit | `GET /:id/wallet`, `POST /:id/wallet/credit` `{ amount, reason }` |

---

## Catalog / CMS

| Area | Prefix |
|------|--------|
| Products/categories/attributes/banners/sections | `/customer/admin/home/*` |
| CMS uploads/pages/collections/media | `/customer/admin/cms/*` |
| App config | `/customer/admin/app-config*` |
| Legal/FAQ/onboarding/cancellation | `/customer/admin/legal*`, `/faq`, `/onboarding-pages`, `/cancellation-policies` |
| Coupons (CMS) | `/customer/admin/coupons` |

Product actions: create/update/delete, status patch, bulk status, publish, image upload.

---

## Pricing / Coupons screen (`pricing`)

`/merch/pricing/coupons` CRUD + generate-code; also surge-rules, discounts, flash-sales, bundles, stats.

---

## Pickers (`picker-management` and related)

| Module | APIs |
|--------|------|
| Master list | `/admin/pickers`, `/:id`, action-logs, picker-config, training-videos |
| Ops | `/admin/picker/pickers*`, approvals, assignment, status, push |
| Link HHD | `POST/DELETE /admin/picker/pickers/:id/link-hhd` `{ hhdUserId }` |
| Documents/bank/face review | under `/admin/picker/pickers/:id/...` |
| Agencies | `/admin/picker/agencies*` |
| Shift slots | `/admin/picker/stores/:storeId/shift-slots` |
| OT / shift-change approvals | `.../ot-requests`, `.../shift-change-requests` + decision |
| Attendance export | `/admin/picker/attendance*` |
| Analytics | `/admin/analytics/pickers` |

Picker statuses in ops: `pending` \| `approved` \| `rejected` \| `deactivated` (admin ops vocabulary).

---

## Riders

`GET /admin/riders`, `GET/PATCH /admin/riders/:id`, vehicle-types CRUD.  
Fleet dispatch details mostly Rider/Darkstore dashboards + citywide.

---

## HHD

Admin links HHD users to pickers (`link-hhd`). Device fleet UIs under darkstore HSD are **not** Admin sidebar screens.

---

## Payments / Wallet / Refunds

| Area | APIs |
|------|------|
| Gateways | `GET/PUT /admin/system/payment-gateways` |
| Analytics | `GET /admin/analytics/payment-methods` |
| Wallet | customer wallet GET + credit |
| Refund via support | `POST /admin/support/tickets/:id/refund` `{ amount, reasonText?, reason?, reasonCode?, orderNumber? }` |
| Finance policies | `/finance/refund-policies` etc. (finance role screens) |

---

## Notifications

`/admin/notifications/{templates,campaigns,scheduled,automation,analytics,history,channels,timeseries}` + retry.  
Send: `POST /customer/admin/notifications/send`.

---

## Delivery / Logistics / Geofence

| Area | APIs |
|------|------|
| System delivery settings | `GET/PUT /admin/system/delivery` |
| Delivery zones | store-warehouse delivery-zones |
| Redelivery | `POST /admin/support/tickets/:id/redelivery` `{ notes?, orderNumber? }` |
| Logistics providers | `/logistics/admin/providers*` |
| Geofence | `/merch/geofence/*` |

---

## Support (`support`)

Tickets CRUD, assign, notes, close, escalate (`targetTeam`: `darkstore`\|`rider_ops`), refund, redelivery, agents, canned responses, categories, SLA, live-chats, FAQs, feedback.

---

## Analytics / Reports (`analytics`)

`/admin/analytics/{realtime,timeseries,products,categories,regional,customers,operational,revenue,growth,peak-hours,funnel,payment-methods,orders-by-hour,rider-performance,inventory-health,financial-summary}`  
`POST /custom-report`, `GET /export`.

---

## Master data / Settings / System / Fraud / Compliance / Audit / Users

| Screen | Examples |
|--------|----------|
| Master data | stores, warehouses, staff, cities, zones, inventories, GRN, bins |
| Users & roles | `/admin/users`, `/roles`, `/permissions`, sessions, access-logs |
| Platform config | `/admin/platform-config` |
| System tools | server-status, cache, database, logs, cron, env-variables (careful — no secret dumping in redesign docs), migrations |
| Integrations | `/admin/integrations*` |
| Fraud | `/admin/fraud/*` |
| Compliance | `/admin/compliance/*` |
| Audit | `/admin/audit/logs*` |

---

## Orders module (Admin reality)

| Capability | Available? |
|------------|------------|
| View customer orders | Yes — customer drawer |
| Advance pending→delivered | **No Admin screen** |
| Refund / redelivery | Via support ticket APIs |
| Citywide exceptions | Ops resolve — not per-status machine |

If redesign adds an Admin order console, it must call **existing** darkstore/customer update-status APIs with correct roles — do not invent `/admin/orders/:id/status` unless it already exists (not used by current Admin UI).

---

## Permissions note

Sidebar may not gate every item by permission string; API still enforces roles. Redesign should hide unauthorized modules using permissions when present.
