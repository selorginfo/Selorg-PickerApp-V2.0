# Selorg — Master Architecture (All Projects)

This document explains how the six codebases work together.  
Companion API/workflow detail: monorepo folder `backend-frontend-documentation/` (if present).

## System map

```
                    ┌─────────────────────┐
                    │  Admin Dashboard    │
                    │  (Vite React web)   │
                    └──────────┬──────────┘
                               │ HTTPS /api/v1/*
                               ▼
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│ Customer App │─────▶│  selorg-backend     │◀─────│  Rider App   │
│ (Expo RN)    │      │  Express + MongoDB  │      │  (Expo RN)   │
└──────────────┘      │  + Socket.IO / WS   │      └──────────────┘
                      └──────────┬──────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       ┌────────────┐    ┌────────────┐    ┌────────────────┐
       │ Picker App │    │  HHD App   │    │ Darkstore/other│
       │ (workforce)│    │ (handheld) │    │ dashboard roles│
       └────────────┘    └────────────┘    └────────────────┘
```

## Projects

| Folder in this package | Source repo folder | Clients talk to |
|------------------------|--------------------|-----------------|
| `customer-app/` | `Customer-App-v2` | `/api/v1/customer`, `/api/payment` |
| `rider-app/` | `Rider-app-v2` | `/api/signin`, `/api/v1/auth`, `/api/v1/orders`, `/api/v1/delivery`, `/api/v1/rider/*`, … |
| `picker-app/` | `picker-app-v2` | `/api/v1/picker` |
| `hhd-app/` | `HHD-App-v2` | `/api/v1/hhd` + `/hhd-socket.io` |
| `admin-dashboard/` | `selorg-dashboard-frontend-v1.2` | `/api/v1/*` (admin + other role mounts) |
| `backend/` | `selorg-backend-v1.2` | Serves all of the above |

## End-to-end communication flow

```
Customer App
    ↓  create order + pay
 Backend
    ↓  create/assign darkstore order
Picker App (optional counts) / HHD App (actual pick)
    ↓  picking complete → packed/ready
 Backend
    ↓  assign rider
Rider App
    ↓  pickup → deliver
 Backend
    ↓  customer status delivered
Customer App (tracking) + Admin Dashboard (observe / support)
```

## Responsibilities

| Project | Owns |
|---------|------|
| Customer App | Browse, cart, checkout, pay, track, profile, wallet |
| Backend | Auth, data, payments, status transitions, notifications, integrations |
| Picker App | Workforce onboarding, shifts, attendance, payouts |
| HHD App | Bag/item/rack scanning and pick completion |
| Rider App | Delivery execution + POD |
| Admin Dashboard | Ops configuration, CMS, support refunds, citywide, picker approvals |

## Order status bridging (do not invent)

- **Customer-facing:** `pending` → `confirmed` → `getting-packed` → `on-the-way` → `arrived` → `delivered` / `cancelled`
- **Darkstore/workforce:** `ASSIGNED` → `PICKING` → `PICKED` → `PACKED` → `READY_FOR_DISPATCH`
- **HHD device:** primarily `picking` / `completed` in live controllers
- **Rider:** `assigned` → `arrived_at_darkstore` → `picked` → `out_for_delivery` → `arrived_at_customer` → `delivered`

Backend services map darkstore/rider events into the customer chain.

## Auth summary

| App | Login |
|-----|--------|
| Customer / Picker / HHD / Rider | OTP → JWT |
| Admin Dashboard | Email/password → JWT |

Tokens are app-specific; do not reuse customer tokens on admin routes.

## Realtime channels

| Channel | Used by |
|---------|---------|
| Socket.IO `/hhd-socket.io` | HHD + dashboards |
| Rider `/ws` | Rider assignment/order updates |
| Customer WS (derived host) | Order tracking screens |

## What Claude should receive

For UI redesign of an app, give Claude:

1. That app’s source (without `.env`, keystores, google-services private material as needed by policy)
2. This folder’s matching subfolder (`README`, `PROJECT_ARCHITECTURE`, `package.json`, `.env.example`)
3. Prefer also `backend-frontend-documentation/` for API contracts
4. **Do not** give backend source if the goal is frontend-only work — use backend docs here + API docs instead

## What this package intentionally excludes

- Real `.env` values and secrets
- Backend application source
- Signing keys, Firebase Admin JSON, `google-services` private configs as secrets dumps
- Invented endpoints or statuses

## UNKNOWN — VERIFY FROM SOURCE

- Production hostnames and which feature flags are enabled
- Whether a separate `ws-server` process is required in prod vs embedded sockets
- `USE_LEGACY_RIDER` deployment setting
