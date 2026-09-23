# 12 — Notification Workflow

---

## Customer App

Base: `/api/v1/customer/notifications`

| Action | Method | Path | Auth |
|--------|--------|------|------|
| List | GET | `/` | Yes — query page, limit, category? |
| Unread count | GET | `/unread-count` | Yes |
| Mark read | PUT | `/{id}/read` | Yes |
| Mark unread | PUT | `/{id}/unread` | Yes |
| Read all | PUT | `/read-all` | Yes |
| Delete | DELETE | `/{id}` | Yes |
| Get preferences | GET | `/preferences` | Yes |
| Update preferences | PUT | `/preferences` | Yes |
| Register token | POST | `/register-token` | Yes — `{ token, platform, tokenType?, provider? }` |
| Remove token | POST | `/remove-token` | Yes — `{ token }` |
| Remove all | POST | `/remove-all-tokens` | Yes |
| Web push register | POST | `/register-web-push` | Yes — backend; mobile app primarily FCM/Expo |
| VAPID public | GET | `/vapid-public-key` | No |

### Screens

- `NotificationInbox` — history + read/unread/delete
- `Notifications` — preferences (channels / DND / categories as returned by API)
- Token registration after login (`UserContext`); removal on logout

### Deep links

Client resolves navigation from notification payload via `resolveNotificationNavigation` / `useNotificationDeepLink`. Preserve category → screen mapping when redesigning.

---

## Events that trigger customer notifications (backend)

Order status notifications are sent from `updateCustomerOrderStatus` / push helpers. Mapped examples:

| Customer status | Notification intent (code) |
|-----------------|----------------------------|
| `getting-packed` | packed-style push (`ORDER_PACKED` / “Order Packed”) |
| Other statuses | order status notification service + automation triggers |

Admin automation trigger names observed in dashboard config include: `order_placed`, progress through delivered, `order_cancelled`, `payment_*`, `refund_*`, `wallet_*`, `support_reply`, `cart_abandoned`, etc.

Exact template copy: CMS/admin notifications — do not hardcode.

---

## Picker notifications

| Action | Path |
|--------|------|
| List | `GET /api/v1/picker/notifications` |
| Read | `PUT /:id/read`, `PUT /read-all` |
| Push | `POST /api/v1/picker/api/push-tokens` |

---

## Rider notifications

| Action | Path |
|--------|------|
| List | `GET /api/v1/rider/notifications` |
| Read | `PATCH /:id/read` |
| Read all | `POST /read-all` |

Realtime: `/ws` order assignment updates.

---

## HHD

Primarily Socket.IO assignment events rather than a rich in-app notification inbox — **VERIFY** if redesign adds inbox.

---

## Admin notifications module

`/api/v1/admin/notifications/*` — templates, campaigns, scheduled, automation, analytics, history (+ retry), channels, timeseries.

Customer push send: `POST /api/v1/customer/admin/notifications/send`.

System settings: `GET/PUT /admin/system/notifications`.

---

## Read / unread / history UX requirements

| State | UX |
|-------|-----|
| Loading | Skeleton list |
| Empty | Empty inbox illustration |
| Unread badge | From unread-count |
| Failure | Retry; keep last known |
| Logout | Remove device tokens so pushes stop |
