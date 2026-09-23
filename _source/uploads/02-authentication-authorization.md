# 02 — Authentication & Authorization

Sanitized. No secrets, JWT private values, or `.env` contents.

---

## Overview

| App | Login mechanism | Token type | Refresh | Logout |
|-----|-----------------|------------|---------|--------|
| Customer | OTP (SMS / WhatsApp / email) | Customer access JWT (+ refresh stored) | **No mounted customer `/auth/refresh`** | `POST /auth/logout` + local clear |
| Picker | OTP (phone / email UI) | Picker JWT (+ session `sid`) | **UNKNOWN / not in auth routes** | Local clear only (API no-op) |
| HHD | OTP (mobile) | HHD JWT | **UNKNOWN — VERIFY** | `POST /auth/logout` |
| Rider | OTP via `/api/signin/*` (optional existing-user skip) | Rider access + refresh | `POST /api/v1/auth/refresh-token` | `POST /api/v1/auth/logout` |
| Admin | Email + password | Dashboard JWT | **UNKNOWN — VERIFY** (401 → login) | Role logout endpoint / local clear |

---

## 1. Customer login flow

```
Login screen
  → POST /api/v1/customer/auth/send-otp
  → OTPVerification
  → POST /api/v1/customer/auth/verify-otp
  → store accessToken + refreshToken + user
  → migrate guest addresses / merge cart
  → MainTabs | LocationPermission | Settings
```

### Channels

- `mobile` → SMS OTP (`phone` / `phoneNumber`, `channel`/`preferredChannel`)
- `whatsapp` → WhatsApp OTP
- `email` → email OTP

### Token usage

- Header: `Authorization: Bearer <TOKEN>`
- Stored under client keys `access_token`, `refresh_token`, `user_data` (SecureStore preferred)
- Axios interceptor: on **401** with a token present → clear tokens → reset to `Login`

### Token refresh

- Refresh token is **returned and stored**
- Client defines `/auth/refresh` but **backend customer auth routes do not expose a working refresh endpoint** (not found in mounted customer auth)
- **Frontend behavior today:** no silent refresh; session ends on 401

### Logout

1. Unregister push tokens (`remove-token` / `remove-all-tokens`)
2. `POST /auth/logout` (best-effort; may send refreshToken in body)
3. Clear local storage → `Login`

### Guest mode

- Skip login allowed for browsing
- Cart/addresses local until login → `POST /cart/merge` + address migrate

### Session expiration

- Access TTL controlled by backend env (`JWT_ACCESS_EXPIRES_SECONDS` default pattern ~24h in code — **do not hardcode**; treat as server-enforced)
- On expiry: 401 → login

### Protected routes (customer)

| Area | Auth required |
|------|---------------|
| Catalog/home/search | No |
| Cart / orders / wallet / profile / addresses / notifications / refunds / support (authenticated) | Yes |
| Coupons validate/list | Mostly public; redeem requires auth |
| Delivery estimate/fee, store assign | optionalAuth |

### Unauthorized (401)

- Clear session; navigate Login; show “session expired” if desired

### Forbidden (403)

- Show “not allowed”; do not loop login unless token invalid

---

## 2. Rider login flow

```
login
  → optional POST /api/signin/existing-user-login { mobileNumber }
       (may return token and skip OTP)
  → POST /api/signin/send-otp
  → otp screen
  → POST /api/signin/verify-otp { mobileNumber, otp, deviceId, deviceName }
  → store access + refresh
  → onboarding gate OR tabs
```

### Token refresh

- On API 401: `POST /api/v1/auth/refresh-token` `{ refreshToken }`
- Update stored tokens; retry request
- If refresh fails → clear auth → login

### Logout

- `POST /api/v1/auth/logout` then `clearStoredAuth()`

### Role

- Rider JWT; many routes use rider `authenticate` / `requireRole('rider', ...)`
- Rider notifications mount also allows `admin`, `super_admin`

### Protected areas

- All delivery mutations, home, profile, shifts, cash, KYC, payouts require auth
- Legal/config FAQ may be readable pre-auth depending on screen (login footer uses legal config)

---

## 3. Picker login flow

```
login → POST /auth/send-otp
     → otp → POST /auth/verify-otp
     → store token
     → GET /onboarding/state → onboarding stack OR tabs
```

### Session

- Backend picker auth validates Bearer + session token alignment with `PickerUser.sessionToken`
- If session invalidated server-side → treat as 401 → login

### Logout

- No logout HTTP route used by app; local token wipe only

### Role / screens

- Authenticated picker user; onboarding statuses from enums: `PENDING`, `ACTIVE`, `REJECTED`, `BLOCKED`, `SUSPENDED`, `DELETION_PENDING`
- Gate screens: under-review, rejection, blocked, suspended

---

## 4. HHD login flow

```
splash → deviceReady → terms → login
  → POST /auth/send-otp { mobile }
  → otp → POST /auth/verify-otp { mobile, otp }
  → token + user (+ optional pickerProfile)
  → home
```

### Logout

- `POST /auth/logout` + clear `@hhd_app_token`

### Role

- HHD middleware `protect` + optional `authorize('picker'|'supervisor'|'admin')`
- Device heartbeat while on home/orders

### Unauthorized

- Force re-login; stop offline queue replay until authed — **confirm queue behavior in redesign**

---

## 5. Admin login flow

```
/login
  → POST /api/v1/admin/auth/login { email, password, role? }
  → { token, user: { id, email, name, role, permissions?, assignedStores?, ... } }
  → /admin/citywide (or last route)
```

Multi-dashboard login endpoint map (same frontend repo):

| Role | Login path |
|------|------------|
| admin | `POST /admin/auth/login` |
| darkstore | `POST /darkstore/auth/login` |
| warehouse / finance / vendor / merch / production / rider | `POST /{role}/auth/login` |

Admin UI allows roles: **`admin`**, **`super_admin`**.

### Permissions

- JWT may include `permissions[]`
- UI util treats `admin`/`super_admin` without permissions as effective `['*']`
- Fine-grained RBAC APIs exist under `/admin/users`, `/admin/roles`, `/admin/permissions`

### 401

- Redirect `/login`

### 403

- Hide/disable actions; show access denied

---

## 6. Role → API / screen access matrix

| Role | Primary API prefix | Can change customer order status? | Notes |
|------|--------------------|-----------------------------------|-------|
| customer | `/api/v1/customer` | Cancel own order (rules); create | Sees customer statuses only |
| picker (workforce app) | `/api/v1/picker` | Mutations unused in UI | Onboarding/shifts |
| hhd / picker device | `/api/v1/hhd` | Via HHD statuses → syncs darkstore → customer `confirmed`/`getting-packed` | Real pick/pack |
| rider | `/api/v1/orders`, `/delivery`, `/auth` | Propagates `on-the-way` → `arrived` → `delivered` | Delivery OTP/POD |
| darkstore ops | `/api/v1/darkstore` | Assign/pick/pack/cancel → maps to customer | Not Admin sidebar |
| admin / super_admin | `/api/v1/admin`, merch, customer admin, etc. | No status machine screen; support refund/redelivery | Citywide + master data |
| finance | `/api/v1/finance` | Payments/refunds/wallet ops | Separate dashboard |

---

## 7. Protected route patterns (frontend)

| App | Unauthenticated entry | Authenticated shell |
|-----|----------------------|---------------------|
| Customer | Splash, Onboarding, Login, OTP, guest browse | MainTabs + account stacks |
| Rider | splash, login, otp, legal | tabs + delivery stack + onboarding |
| Picker | splash, permissions, login, otp | tabs + onboarding |
| HHD | splash, deviceReady, terms, login, otp | home / tasks / profile + order flow |
| Admin | `/login` | `/admin/*` |

---

## 8. Unauthorized vs Forbidden — expected UX

| Code | Meaning | Frontend |
|------|---------|----------|
| 401 | Missing/invalid/expired token | Clear auth (except maybe soft public pages); go to login |
| 403 | Authenticated but wrong role/permission | Keep session; show access denied; do not spam login |

---

## 9. UNKNOWN items

1. Customer access token exact TTL in production — **UNKNOWN — VERIFY BEFORE FRONTEND IMPLEMENTATION**
2. Whether picker/HHD tokens are refreshable — **UNKNOWN — VERIFY**
3. Admin refresh token support — **UNKNOWN — VERIFY**
4. Whether `USE_LEGACY_RIDER` is enabled in production (changes `/api/v1/rider` vs `/api/v1/delivery` mounting) — **UNKNOWN — VERIFY** (Rider-app-v2 currently calls `/api/v1/delivery/*` and `/api/v1/orders/*`)
