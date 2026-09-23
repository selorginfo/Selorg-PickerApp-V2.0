# 07 — Order Lifecycle

Selorg uses **four related status vocabularies**. Redesigns must map carefully and **must not invent new customer statuses**.

---

## A. Customer order statuses (source of truth for Customer App)

Enum on `customer-backend` Order model:

`pending` | `confirmed` | `getting-packed` | `on-the-way` | `arrived` | `delivered` | `cancelled`

### Valid transitions (`VALID_TRANSITIONS`)

| From | Allowed next |
|------|----------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `getting-packed`, `cancelled` |
| `getting-packed` | `on-the-way`, `cancelled` |
| `on-the-way` | `arrived`, `cancelled` |
| `arrived` | `delivered`, `cancelled` |
| `delivered` | (terminal) |
| `cancelled` | (terminal) |

### Status detail table

| Status | Meaning | Who changes it | Typical API / mechanism | Previous | Next | Apps that display |
|--------|---------|----------------|-------------------------|----------|------|-------------------|
| `pending` | Order created; may await payment | System on create | `POST /customer/orders` | — | `confirmed` / `cancelled` | Customer, Admin customer drawer |
| `confirmed` | Accepted into fulfillment | System / darkstore / warehouse sync | Darkstore assign/picking maps `ASSIGNED`/`PICKING`/`processing` → `confirmed`; warehouse may confirm | `pending` | `getting-packed` / `cancelled` | Customer |
| `getting-packed` | Being packed / pick complete side | Darkstore | Map from `PICKED`/`PACKED`/`READY_FOR_DISPATCH`/`ready` | `confirmed` | `on-the-way` / `cancelled` | Customer |
| `on-the-way` | Out for delivery | Rider | Rider `picked` / `out_for_delivery` propagation | `getting-packed` | `arrived` / `cancelled` | Customer, Rider (own vocab) |
| `arrived` | Rider at customer | Rider | `arrived_at_customer` | `on-the-way` | `delivered` / `cancelled` | Customer |
| `delivered` | Complete | Rider | `deliver`; COD may flip payment to `paid` | `arrived` | — | All |
| `cancelled` | Cancelled | Customer / darkstore / system | `POST /orders/:id/cancel`; darkstore cancel | many | — | All |

Dashboard can also call `PUT /customer/orders/:id/update-status` with **dashboard JWT** (not customer token).

### Related enums on customer order

- **Item status:** `picked` | `not_found` | `damaged` | `substituted` | `delivered` | `pending`
- **Payment status:** `paid` | `cod_pending` | `pending` | `failed`
- **Refund status on order:** `none` | `pending` | `approved` | `rejected` | `processed`

---

## B. Darkstore / workforce statuses

From `constants/pickerEnums.js` + legacy:

**Workforce:** `ASSIGNED` | `PICKING` | `PICKED` | `PACKED` | `READY_FOR_DISPATCH` | `CANCELLED`

**Legacy / assignable pool examples:** `new`, `queued`, `pending`, `processing`, `ready`, `assigned`, `completed`, `rto`, `cancelled`

### Darkstore → Customer map

| Darkstore | Customer |
|-----------|----------|
| `ASSIGNED` / `processing` / `PICKING` | `confirmed` |
| `PICKED` / `PACKED` / `READY_FOR_DISPATCH` / `ready` | `getting-packed` |
| `cancelled` / `CANCELLED` | `cancelled` |

### Darkstore transition highlights (`orderStateMachine`)

- `ASSIGNED` → `PICKING` → `PICKED` → `PACKED` → `READY_FOR_DISPATCH`
- Cancel allowed from most non-terminal states
- APIs (Darkstore dashboard, not Admin sidebar): assign, start-picking, complete-picking, cancel, mark-rto, bag-rack

---

## C. HHD device statuses

Constants: `pending` | `received` | `bag_scanned` | `picking` | `completed` | `photo_verified` | `rack_assigned` | `handed_off`

**What controllers actually set today:**

| Action | Order status written |
|--------|----------------------|
| Start pick | `picking` |
| Assignorders complete | `completed` (and related) |
| Rack scan | **`completed`** + move to CompletedOrders (not `rack_assigned` / `handed_off`) |
| Photo verify | photo.verified flag only |

### HHD → Darkstore sync

| HHD | Darkstore |
|-----|-----------|
| `picking` / `PICKING` | `PICKING` |
| `completed` / `COMPLETED` | `PICKED` |

Missing scanned qty vs ordered may trigger auto-refund on customer order.

---

## D. Rider statuses

`placed` | `confirmed` | `assigned` | `arrived_at_darkstore` | `picked` | `out_for_delivery` | `arrived_at_customer` | `delivered` | `cancelled`

| Rider API | New rider status | Customer effect |
|-----------|------------------|-----------------|
| accept | assignment accepted (stays in assigned family) | — |
| arrived-at-darkstore | `arrived_at_darkstore` | — |
| pick | `picked` | → walk to `on-the-way` |
| out-for-delivery | `out_for_delivery` | `on-the-way` |
| arrived-at-customer | `arrived_at_customer` | `arrived` |
| deliver | `delivered` | `delivered` |

---

## E. End-to-end happy path (actual)

```
Customer POST /orders
  → customer status: pending (payment may stay pending until paid / COD)

Payment success / COD path
  → fulfillment release (backend post-order integrations)
  → Darkstore order created / assigned
       darkstore ASSIGNED / PICKING → customer confirmed

HHD bag scan → picking
  → darkstore PICKING → customer confirmed (still)

HHD complete pick (+ photo + rack)
  → darkstore PICKED (+ later PACKED / READY_FOR_DISPATCH)
  → customer getting-packed

Rider assigned → accept → arrive store → pick → OFD → arrive customer → deliver
  → customer on-the-way → arrived → delivered

Admin
  → observes via customer drawer / support / citywide; does not step the machine in Admin UI
```

---

## F. Example chain requested vs actual

User example:

`pending → confirmed → picking → packed → ready_for_pickup → assigned → picked_up → out_for_delivery → delivered`

**Do not use that as customer UI statuses.** Closest real mapping:

| Example (invented-looking) | Actual system |
|----------------------------|---------------|
| pending | customer `pending` |
| confirmed | customer `confirmed` |
| picking | HHD `picking` / darkstore `PICKING` (customer still `confirmed`) |
| packed | darkstore `PACKED` (customer `getting-packed`) |
| ready_for_pickup | darkstore `READY_FOR_DISPATCH` (customer `getting-packed`) — **not** `ready_for_pickup` |
| assigned | rider `assigned` |
| picked_up | rider `picked` (not `picked_up` as primary enum in Order model) |
| out_for_delivery | rider `out_for_delivery` → customer `on-the-way` |
| delivered | both `delivered` |

---

## G. Who can change what (summary)

| Actor | Changes |
|-------|---------|
| Customer app | create; cancel (policy); rate (API exists, UI stub) |
| Payment success path | payment fields; may allow fulfillment |
| Darkstore ops | workforce statuses; cancel/RTO |
| HHD | device statuses; item/bag/rack/photo |
| Rider | rider statuses; customer late-stage statuses via propagation |
| Admin | refund/redelivery via support; view orders; not primary status stepper |
| Dashboard JWT on customer update-status | privileged status update |
