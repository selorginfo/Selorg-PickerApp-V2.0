# 17 — API Master Index

Paths are relative to each app’s base unless absolute. Auth: Bearer unless noted.

| App | Module | API | Method | Auth | Role | Purpose | Screen | Success Action | Failure Action |
|-----|--------|-----|--------|------|------|---------|--------|----------------|----------------|
| Customer | Auth | `/auth/send-otp` | POST | No | — | Send login OTP | Login | → OTP screen | Show error |
| Customer | Auth | `/auth/verify-otp` | POST | No | — | Verify OTP / issue tokens | OTPVerification | Save tokens → main/location | Show error |
| Customer | Auth | `/auth/resend-otp` | POST | No | — | Resend OTP | OTPVerification | Reset inputs | Show error |
| Customer | Auth | `/auth/logout` | POST | Optional | customer | Logout revoke | Settings | → Login | Still clear local |
| Customer | Profile | `/user/profile` | GET | Yes | customer | Load profile | Profile/Checkout | Render | Error/retry |
| Customer | Profile | `/user/profile` | PUT | Yes | customer | Update profile | Profile | Success UI | Show error |
| Customer | Profile | `/user/profile/avatar` | POST | Yes | customer | Upload avatar | Profile | Refresh profile | Show error |
| Customer | Profile | `/user/phone/send-otp` | POST | Yes | customer | Link phone OTP | Profile | Wait verify | Show error |
| Customer | Profile | `/user/phone/verify-otp` | POST | Yes | customer | Verify link phone | Profile | Mark verified | Show error |
| Customer | Profile | `/user/phone/resend-otp` | POST | Yes | customer | Resend link OTP | Profile | Cooldown | Show error |
| Customer | Home | `/bootstrap` | GET | No | — | CMS bootstrap | Home/App | Render blocks | Empty/retry |
| Customer | Home | `/home` | GET | No | — | Home payload | Home | Render | Empty/retry |
| Customer | Home | `/app-config` | GET | No | — | Fees/tips/config | App start | Apply config | Defaults/retry |
| Customer | CMS | `/pages/{slug}` | GET | No | — | Dynamic page | DynamicPage | Render | 404 |
| Customer | CMS | `/collections/{id}` | GET | No | — | Collection | CollectionProducts | List products | Empty |
| Customer | CMS | `/banners/{id}` | GET | No | — | Banner detail | BannerDetail | Render | Error |
| Customer | Catalog | `/categories` | GET | No | — | Categories | Catalog | Render | Empty |
| Customer | Catalog | `/categories/{id}` | GET | No | — | Category detail | CategoryProducts | Render | Empty |
| Customer | Catalog | `/categories/{slug}/products` | GET | No | — | Fallback products | Category | Render | Empty |
| Customer | Catalog | `/products` | GET | No | — | Product list | Browse | Render | Empty |
| Customer | Catalog | `/products/{id}` | GET | No | — | PDP | ProductDetail | Render | 404 |
| Customer | Search | `/products/search` | GET | No | — | Search results | SearchResults | Render | Empty |
| Customer | Search | `/products/search/suggestions` | GET | No | — | Typeahead | Search | Suggestions | Hide |
| Customer | Cart | `/cart` | GET | Yes | customer | Get cart | Checkout/CartContext | Render totals | Error |
| Customer | Cart | `/cart/items` | POST | Yes | customer | Add item | PDP/cards | Update badge | Toast OOS |
| Customer | Cart | `/cart/items/{id}` | PUT | Yes | customer | Update qty | Cart | Refresh | Toast |
| Customer | Cart | `/cart/items` | PUT | Yes | customer | Update by product | Cart | Refresh | Toast |
| Customer | Cart | `/cart/items/{id}` | DELETE | Yes | customer | Remove | Cart | Refresh | Toast |
| Customer | Cart | `/cart/clear` | DELETE | Yes | customer | Clear | After pay | Empty cart | Ignore/best-effort |
| Customer | Cart | `/cart/merge` | POST | Yes | customer | Guest merge | Post-login | Synced cart | Keep guest retry |
| Customer | Orders | `/orders` | GET | Yes | customer | History | MyOrders | List | Empty/error |
| Customer | Orders | `/orders/active` | GET | Yes | customer | Track active | OrderStatusMain | Timeline UI | Empty |
| Customer | Orders | `/orders/{id}` | GET | Yes | customer | Detail | Details screens | Render | 404 |
| Customer | Orders | `/orders` | POST | Yes | customer | Create order | Payment | Start pay path | Stay+error |
| Customer | Orders | `/orders/{id}/can-cancel` | GET | Yes | customer | Cancel eligibility | Cancel sheet | Enable/disable | Disable |
| Customer | Orders | `/orders/{id}/cancel` | POST | Yes | customer | Cancel | Cancel sheet | Canceled UI | Show reason |
| Customer | Orders | `/orders/{id}/reorder` | POST | Yes | customer | Reorder | MyOrders | → Cart | Error |
| Customer | Orders | `/orders/{id}/invoice` | GET | Yes | customer | Invoice | Order items | Download | Error |
| Customer | Pay | `/payments/worldline/session` | POST | Yes | customer | Start gateway | Payment/Wallet | Open SDK | Error |
| Customer | Pay | `/payments/worldline/complete` | POST | Yes | customer | Verify pay | After SDK | → tracking | Retry UI |
| Customer | Pay | `/payments/worldline/status` | GET | Yes | customer | Poll pay | OrderStatus | Update UI | Retry poll |
| Customer | Pay | `/payments/worldline/abort` | POST | Yes | customer | Abort attempt | Retry helpers | Continue | Ignore |
| Customer | Pay | `/payments/{id}/retry-status` | GET | Yes | customer | Can retry? | Payment | Enable retry | Disable |
| Customer | Pay | `/payments/{id}/retry` | POST | Yes | customer | Retry | Payment | New session | Error |
| Customer | Pay | `/payments/record-failure` | POST | Yes | customer | Log failure | Payment | — | Best-effort |
| Customer | Pay* | `/api/payment/callback` | POST | Yes | customer | Standalone callback | Standalone flow | Success path | Error |
| Customer | Wallet | `/wallet/balance` | GET | Yes | customer | Balance | Wallet/Payment | Show | Error |
| Customer | Wallet | `/wallet/transactions` | GET | Yes | customer | Ledger | Wallet | List | Empty |
| Customer | Wallet | `/wallet/top-up/session` | POST | Yes | customer | Top-up pay | Wallet | SDK | Error |
| Customer | Coupon | `/coupons` | GET | No* | — | List | Checkout/Coupons | List | Empty |
| Customer | Coupon | `/coupons/validate` | POST | No* | — | Validate | Checkout | Apply | Reject |
| Customer | Coupon | `/coupons/redeem` | POST | Yes | customer | Redeem | After place | Non-blocking | Ignore |
| Customer | Address | `/addresses` | GET | Yes | customer | List | Addresses | List | Empty |
| Customer | Address | `/addresses/default` | GET | Yes | customer | Default | Checkout | Select | None |
| Customer | Address | `/addresses` | POST | Yes | customer | Create | EnterCompleteAddress | Success | Validation |
| Customer | Address | `/addresses/{id}` | PUT | Yes | customer | Update | Edit address | Success | Validation |
| Customer | Address | `/addresses/{id}` | DELETE | Yes | customer | Delete | List | Refresh | Error |
| Customer | Address | `/addresses/{id}/default` | POST | Yes | customer | Set default | List | Refresh | Error |
| Customer | Store | `/store/assign` | POST | Optional | — | Bind store | Location | Update store | Error |
| Customer | Delivery | `/delivery/estimate` | GET | Optional | — | ETA | Checkout | Show ETA | Hide |
| Customer | Delivery | `/delivery/fee` | GET | Optional | — | Fee | Checkout | Show fee | Fallback |
| Customer | Notif | `/notifications` | GET | Yes | customer | Inbox | NotificationInbox | List | Empty |
| Customer | Notif | `/notifications/unread-count` | GET | Yes | customer | Badge | Tabs/hooks | Badge | Hide |
| Customer | Notif | `/notifications/{id}/read` | PUT | Yes | customer | Mark read | Inbox | Update | Ignore |
| Customer | Notif | `/notifications/{id}/unread` | PUT | Yes | customer | Mark unread | Inbox | Update | Ignore |
| Customer | Notif | `/notifications/read-all` | PUT | Yes | customer | Read all | Inbox | Update | Ignore |
| Customer | Notif | `/notifications/{id}` | DELETE | Yes | customer | Delete | Inbox | Remove | Error |
| Customer | Notif | `/notifications/preferences` | GET/PUT | Yes | customer | Prefs | Notifications | Save | Error |
| Customer | Notif | `/notifications/register-token` | POST | Yes | customer | Push register | Post-login | — | Ignore |
| Customer | Notif | `/notifications/remove-token` | POST | Yes | customer | Unregister | Logout | — | Ignore |
| Customer | Notif | `/notifications/remove-all-tokens` | POST | Yes | customer | Unregister all | Logout | — | Ignore |
| Customer | Refund | `/refunds` | GET | Yes | customer | List | Refunds | List | Empty |
| Customer | Refund | `/refunds/{id}/details` | GET | Yes | customer | Detail | RefundDetails | Render | 404 |
| Customer | Refund | `/refunds/request` | POST | Yes | customer | Request | ReturnRequest | Success | Error |
| Customer | Support | `/support/tickets` | GET/POST | Yes | customer | Tickets | Support stack | List/create | Error |
| Customer | Support | `/support/tickets/active` | GET | Yes | customer | Active chat | Chat util | Open | None |
| Customer | Support | `/support/tickets/{id}/messages` | GET/POST | Yes | customer | Messages | Ticket detail | Render/send | Error |
| Customer | Support | `/support/tickets/{id}/reopen` | POST | Yes | customer | Reopen | Ticket detail | Refresh | Error |
| Customer | Legal | `/legal/terms` | GET | No | — | Terms | Terms | Render | Error |
| Customer | Legal | `/legal/privacy` | GET | No | — | Privacy | Privacy | Render | Error |
| Customer | Onboarding | `/onboarding/complete` | POST | Yes? | customer | Complete | Onboarding | Continue | Ignore |
| Customer | Health | `/health` | GET | No | — | Probe | NoInternet | Online | Offline UI |
| Picker | Auth | `/auth/send-otp` | POST | No | — | OTP | Login | → OTP | Error |
| Picker | Auth | `/auth/verify-otp` | POST | No | — | Login | OTP | → onboarding/tabs | Error |
| Picker | Auth | `/auth/resend-otp` | POST | No | — | Resend | OTP | Cooldown | Error |
| Picker | Onboarding | `/onboarding/state` | GET | Yes | picker | Gate | Many | Route screens | Error |
| Picker | Profile | `/users/profile` | GET/PUT | Yes | picker | Profile | Profile/onboarding | Save | Error |
| Picker | Profile | `/users/profile/overview` | GET | Yes | picker | Overview | Profile tab | Render | Error |
| Picker | Location | `/locations*` | mixed | Yes | picker | Work location | Onboarding/home | Set location | Error |
| Picker | Shifts | `/shifts/*` | mixed | Yes | picker | Shift lifecycle | Home/select | Punch | Error |
| Picker | Attendance | `/attendance/*` | GET | Yes | picker | Attendance | Tabs | Render | Empty |
| Picker | Orders | `/orders` | GET | Yes | picker | Counts | Home | Stats only | Empty |
| Picker | Orders | `/orders/completed` | GET | Yes | picker | Counts | Home | Stats | Empty |
| Picker | Orders | `/orders/:id/status` | PUT | Yes | picker | Status update | **UNUSED UI** | N/A | N/A |
| Picker | Orders | `/orders/:id/complete` | POST | Yes | picker | Complete | **UNUSED UI** | N/A | N/A |
| Picker | Wallet | `/wallet/*` | mixed | Yes | picker | Payouts | Payouts | Withdraw | Error |
| Picker | Notif | `/notifications*` | mixed | Yes | picker | Inbox | Notifications | Update | Error |
| Picker | Devices | `/devices/*` | mixed | Yes | picker | Device assign/return | Collect/return | Next step | Error |
| Picker | Manager | `/manager/*-otp` | POST | Yes | picker | Manager OTP | Collect device | Unlock | Error |
| Picker | Bank/Docs/Training/KYC | various | mixed | Yes | picker | Onboarding | Onboarding stack | Advance | Error |
| Picker | Support/Legal/FAQ/Issues | various | mixed | Yes | picker | Account help | Support screens | Done | Error |
| HHD | Auth | `/auth/send-otp` | POST | No | — | OTP | Login | → OTP | Error |
| HHD | Auth | `/auth/verify-otp` | POST | No | — | Login | OTP | → home | Error |
| HHD | Auth | `/auth/me` | GET | Yes | hhd | Session | Restore | Home | Login |
| HHD | Auth | `/auth/logout` | POST | Yes | hhd | Logout | Profile | Login | Clear local |
| HHD | User | `/users/profile` | GET/PUT | Yes | hhd | Profile | Profile | Save | Error |
| HHD | User | `/users/heartbeat` | POST | Yes | hhd | Presence | Home | — | Ignore |
| HHD | Device | `/devices/current` | GET | Yes | hhd | Device | Context | Bind | Error |
| HHD | Orders | `/orders` | GET | Yes | hhd | List | Home | List | Empty |
| HHD | Orders | `/orders/status/:status` | GET | Yes | hhd | By status | OrderReceived | Show | Empty |
| HHD | Orders | `/orders/:id` | GET | Yes | hhd | Detail | Flow | Render | 404 |
| HHD | Orders | `/orders/:id/status` | PUT | Yes | hhd | Set picking etc | Overview | → pick | Error |
| HHD | Orders | `/orders/assignorders/:id/status` | PUT | Yes | hhd | complete/pause/cancel | Completion | Next/photo | Error |
| HHD | Bags | `/bags/scan` | POST | Yes | hhd | Scan bag | BagScan | → overview | Rescan |
| HHD | Items | `/items/order/:id` | GET | Yes | hhd | Line items | Pick session | List | Error |
| HHD | Items | `/items/:id/not-found` | PUT | Yes | hhd | OOS | Pick session | Mark | Error |
| HHD | Items | `/items/substitutes` | GET | Yes | hhd | Subs | Pick session | Show | Empty |
| HHD | Scan | `/scanned-items` | POST | Yes | hhd | Barcode | Pick session | Advance qty | Reject code |
| HHD | Photos | `/photos` | POST | Yes | hhd | Bag photo | Photo screen | → rack | Retry |
| HHD | Photos | `/photos/:id/verify` | PUT | Yes | hhd | Verify photo | Photo | Continue | Error |
| HHD | Racks | `/racks/scan` | POST | Yes | hhd | Rack QR | ScanRack | Complete | Rescan |
| HHD | Tasks | `/tasks*` | GET/PUT | Yes | hhd | Tasks | Tasks | Update | Error |
| Rider | Auth | `/api/signin/send-otp` | POST | No | — | OTP | Login | → OTP | Error |
| Rider | Auth | `/api/signin/verify-otp` | POST | No | — | Login | OTP | Onboarding/tabs | Error |
| Rider | Auth | `/api/signin/resend-otp` | POST | No | — | Resend | OTP | Cooldown | Error |
| Rider | Auth | `/api/signin/existing-user-login` | POST | No | — | Skip OTP? | Login | Maybe skip | Fallback OTP |
| Rider | Auth | `/api/v1/auth/refresh-token` | POST | No | — | Refresh | Client 401 | Retry request | Logout |
| Rider | Auth | `/api/v1/auth/me` | GET | Yes | rider | Profile session | Startup | Continue | Login |
| Rider | Auth | `/api/v1/auth/logout` | POST | Yes | rider | Logout | Profile | Login | Clear |
| Rider | Home | `/api/v1/delivery/home` | GET | Yes | rider | Dashboard | Home | Render | Error |
| Rider | Profile | `/api/v1/delivery/riders/:id` | GET/PATCH | Yes | rider | Profile | Profile/edit | Save | Error |
| Rider | Profile | `.../availability` | POST | Yes | rider | Online toggle | Home | Update | Error |
| Rider | Profile | `.../location` | POST | Yes | rider | GPS | Active delivery | — | Ignore |
| Rider | Orders | `/api/v1/orders/admin/orders` | GET | Yes | rider | Live list | Orders | List | Empty |
| Rider | Orders | `/api/v1/orders/:id` | GET | Yes | rider | Detail | Details | Render | 404 |
| Rider | Orders | `.../accept` | POST | Yes | rider | Accept | Live orders | → travel | Conflict |
| Rider | Orders | `.../reject` | POST | Yes | rider | Reject | Live orders | Back list | Error |
| Rider | Orders | `.../arrived-at-darkstore` | POST | Yes | rider | At store | Travel | → collect | Error |
| Rider | Orders | `.../pick` | POST | Yes | rider | Pickup | Collect/verify | → navigate | Error |
| Rider | Orders | `.../out-for-delivery` | POST | Yes | rider | OFD | Delivery | Continue | Error |
| Rider | Orders | `.../arrived-at-customer` | POST | Yes | rider | Arrived | Navigation | → OTP | Error |
| Rider | Orders | `.../deliver` | POST | Yes | rider | Complete | Handover | Complete UI | Error |
| Rider | Orders | `.../proof/photo` | POST | Yes | rider | POD photo | Delivery photo | Continue | Retry |
| Rider | Orders | `.../otp/send|resend|verify` | POST | Yes | rider | Customer OTP | OTP screen | Next/verify | Error |
| Rider | Shifts | `/api/v1/rider/shifts/*` | mixed | Yes | rider | Shifts | My shifts | Update | Error |
| Rider | Cash | `/api/v1/rider/cash/*` | mixed | Yes | rider | Floating cash | Cash screens | Update | Error |
| Rider | Notif | `/api/v1/rider/notifications*` | mixed | Yes | rider | Inbox | Notifications | Update | Error |
| Rider | KYC | `/api/v1/kyc/*` | mixed | Yes | rider | Docs | KYC screens | Advance | Error |
| Rider | Payouts | `/api/v1/payouts*` | mixed | Yes | rider | Earnings | Earnings | Render | Error |
| Rider | Incidents | `/api/v1/incidents` | POST/GET | Yes | rider | SOS/issues | Issues | Submitted | Error |
| Rider | Support | `/api/v1/support*` / support-chat | mixed | Yes | rider | Help | Support/chat | Send | Error |
| Admin | Auth | `/admin/auth/login` | POST | No | — | Login | /login | → /admin | Error |
| Admin | Citywide | `/merch/citywide/*` | mixed | Yes | admin | Ops control | citywide | Update | Error |
| Admin | Customers | `/admin/customers*` | mixed | Yes | admin | CRM | customers | CRUD/view | Error |
| Admin | Catalog | `/customer/admin/home/*` | mixed | Yes | admin | Catalog | catalog/CMS | Save | Error |
| Admin | CMS | `/customer/admin/cms/*` | mixed | Yes | admin | Content | content hub | Save | Error |
| Admin | Coupons | `/merch/pricing/coupons*` | mixed | Yes | admin | Coupons | pricing | Save | Error |
| Admin | Pickers | `/admin/picker*` `/admin/pickers*` | mixed | Yes | admin | Workforce | picker screens | Approve/link | Error |
| Admin | Riders | `/admin/riders*` | mixed | Yes | admin | Rider list | riders | Patch | Error |
| Admin | Support | `/admin/support/*` | mixed | Yes | admin | Tickets/refund/redelivery | support | Resolve | Error |
| Admin | Notif | `/admin/notifications/*` | mixed | Yes | admin | Campaigns | notifications | Launch | Error |
| Admin | Analytics | `/admin/analytics/*` | mixed | Yes | admin | Reports | analytics | Render | Error |
| Admin | System | `/admin/system/*` | mixed | Yes | admin | Settings | system/master | Save | Error |
| Admin | Wallet | `/admin/customers/:id/wallet*` | mixed | Yes | admin | Credit wallet | customers | Updated bal | Error |

\* Coupon list/validate called without requiring login in current app for browse/checkout preview; redeem requires auth.

---

## Intentionally omitted from index

- Unmounted P2.1 stub routes
- Full warehouse/vendor/production/finance endpoint dumps not rendered by Admin screens
- Client-defined but unwired endpoints (customer rate/refresh/login password, rider mark-collected, etc.) — see workflow docs
