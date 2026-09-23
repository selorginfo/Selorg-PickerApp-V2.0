# 11 — Customer Profile / Address / Phone

Base: `/api/v1/customer`

---

## Profile

| Action | Method | Path | Auth | Body / notes |
|--------|--------|------|------|--------------|
| Get | GET | `/user/profile` | Yes | Fields used: `id`, `name`, `email`, `phoneNumber`, `avatar`/`avatarUrl`, DOB, gender, phone verified, `savedCheckoutContact` |
| Update | PUT | `/user/profile` | Yes | `name`, `email`, `dateOfBirth`, `gender`, `avatar`/`avatarUrl`, `savedCheckoutContact` |
| Avatar | POST | `/user/profile/avatar` | Yes | `{ image }` base64 |
| Change password | PUT | `/user/change-password` | Yes | **UNUSED IN UI** (OTP-only login) |

Screens: `Profile`, Checkout (contact save fire-and-forget).

---

## Email / WhatsApp / Phone login

There is **no password email login** in the active Customer UI.

| Mode | Send OTP body pattern |
|------|----------------------|
| Email | `{ email, preferredChannel, channel }` |
| Phone SMS | `{ phoneNumber|phone, channel, preferredChannel }` |
| WhatsApp | same phone fields with whatsapp channel |

Flow: `POST /auth/send-otp` → `POST /auth/verify-otp` `{ sessionId, otp }` → tokens.

---

## Phone number linking (logged-in)

| Action | Path | Body |
|--------|------|------|
| Send | `POST /user/phone/send-otp` | `{ phoneNumber, channel, preferredChannel }` |
| Verify | `POST /user/phone/verify-otp` | `{ sessionId, otp }` |
| Resend | `POST /user/phone/resend-otp` | `{ sessionId }` |

Screen: Profile.

---

## OTP rules (behavioral)

- Resend cooldown from API (`resendCooldownSeconds`)
- Session id required for verify/resend
- Do not log OTP codes
- Fixed test OTP exists in backend for non-prod patterns — **never document real test numbers/secrets in UI code comments shipped to Claude packages beyond noting non-prod may allow test OTP**

---

## Address CRUD

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/addresses` (app may cache-bust with `_`) |
| Default | GET | `/addresses/default` |
| Create | POST | `/addresses` |
| Update | PUT | `/addresses/{id}` |
| Delete | DELETE | `/addresses/{id}` |
| Set default | POST | `/addresses/{id}/default` |

### Body fields

`label`, `line1`, `line2?`, `landmark?`, `city`, `state?`, `pincode?`, `latitude`, `longitude`, `isDefault?`

### Screens

Addresses stack: `SavedAddressesList`, empty state, `LocationSearch`, map pin, `EnterCompleteAddress`. Also Home drawer, Checkout, post-login migrate.

### Guest

Local `guestAddressStorage` until login migrate.

---

## Location

| Action | API |
|--------|-----|
| Store assign | `POST /store/assign` `{ latitude, longitude }` |
| Delivery | `GET /delivery/estimate`, `GET /delivery/fee` with storeId + lat/lng |

Location permission screen when no saved addresses after auth.

---

## Onboarding

`POST /onboarding/complete` best-effort after onboarding UI. Other onboarding page APIs exist but are lightly used / unused — VERIFY if redesigning onboarding CMS.
