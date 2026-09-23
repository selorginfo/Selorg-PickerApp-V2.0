# 05 — HHD Workflow

HHD = handheld device app for **pick / pack / rack** at darkstore.

Base: `/api/v1/hhd`  
Realtime: Socket.IO on `/hhd-socket.io` (events such as `assignorder:assigned`)

---

## HHD order statuses (device flow)

From `hhd/utils/constants.js` (enum definitions):

| Status | Meaning | Set by current controllers? |
|--------|---------|-------------------------------|
| `pending` | Waiting / incoming | Default / lists |
| `received` | Received on device | Order create path sets `received` |
| `bag_scanned` | Bag QR scanned | **Constant exists; bag scan creates Bag with status `scanned` but does not set this order status in `bag.controller`** |
| `picking` | Active pick session | `PUT /orders/:id/status` `{ status: "picking" }` |
| `completed` | Pick/rack complete | Assignorders complete **and** rack scan sets order to `completed`, then moves to CompletedOrders |
| `photo_verified` | Bag photo verified | **Constant exists; photo verify sets `photo.verified=true` only — does not set order status** |
| `rack_assigned` | Rack assigned | **Constant exists; rack scan uses `completed` + `rackLocation`, not this string** |
| `handed_off` | Handed to rider | **Defined only — no controller assignment found** |

**Frontend implication:** Drive UI from APIs the app already calls (`picking`, assignorders `completed`/`paused`/`cancelled`, bag/photo/rack success). Do not require `handed_off` / `rack_assigned` / `photo_verified` order statuses unless a new backend path is added.

Item statuses: `pending`, `found`, `not_found`, `scanned`, `completed`, `substituted` (+ extended).  
Bag statuses: `scanned`, `in_use`, `photo_taken`, `completed`.

---

## 1. Login

```
splash → deviceReady → terms → login
  POST /auth/send-otp { mobile }
→ otp
  POST /auth/verify-otp { mobile, otp }
→ home
```

Also: `GET /auth/me`, `GET /devices/current`, `GET|PUT /users/profile`, periodic `POST /users/heartbeat`.

Logout: `POST /auth/logout`.

---

## 2. Dashboard (Home)

| Action | API |
|--------|-----|
| Pending incoming | `GET /orders/status/pending` (and/or list) |
| Heartbeat | `POST /users/heartbeat` |
| WS | Listen for assignment events → navigate OrderReceived |

---

## 3. Incoming orders / Order received

| Screen | `orderReceived` |
| API | `GET /orders/status/pending` or assignorders status |
| User action | Start picking / accept flow |
| Next | `bagScan` |

---

## 4. Bag scan

| Screen | `bagScan` |
| API | `POST /bags/scan` `{ qrCode, orderId }` |
| Backend | Associates bag; status toward `bag_scanned` |
| Next | `orderOverview` |
| Failure | Invalid QR → retry |

---

## 5. Order overview → start picking

| Screen | `orderOverview` |
| API | `PUT /orders/:id/status` `{ status: "picking" }` |
| Sync | `darkstoreOrderSyncService` maps HHD `picking` → darkstore `PICKING` → customer often stays/moves via darkstore map (`confirmed` while picking) |
| Next | `activePickSession` |
| Also | `GET /items/order/:orderId` |

---

## 6. Item scanning / verification

| Screen | `activePickSession` |
| API | `POST /scanned-items` `{ barcodeData, barcodeType?, orderId?, deviceId?, metadata? }` |
| Optional | `POST /items/scan` `{ itemId, orderId }` (service available) |
| Substitutes | `GET /items/substitutes?sku&orderId&limit` |
| Failure | Unknown barcode → error UI; offline queue may replay |

---

## 7. Out-of-stock / not found

| Action | Mark not found |
| API | `PUT /items/:id/not-found` `{ notes?, substituteSku? }` |
| Item status | `not_found` (and/or substitute) |
| Backend side effect | On pick complete, missing items may trigger **auto refund** path via darkstore sync |

---

## 8. Quantity changes

Exact quantity-edit API fields: **UNKNOWN — VERIFY BEFORE FRONTEND IMPLEMENTATION** (confirm whether qty is only via scan counts vs item update `PUT /items/:id`).

Item update: `PUT /items/:id` `{ status?, scannedAt? }`.

---

## 9. Picking completion

| Screen | `orderCompletion` |
| API | `PUT /orders/assignorders/:id/status` `{ status: "completed" }` |
| Sync | HHD `completed` → darkstore `PICKED` (+ missing item refunds) → customer `getting-packed` when darkstore propagates PICKED/PACKED/READY |
| Pause/Cancel | Same assignorders status endpoint with `paused` / `cancelled` |

---

## 10. Packing / photo

| Screen | `photoInsideBag` |
| API | `POST /photos` multipart `photo` + `bagId`, `orderId` |
| Verify | `PUT /photos/:id/verify` |
| Bag update | `PUT /bags/:id` `{ status?, photoUrl? }` |

---

## 11. Rack / ready for rider

| Screen | `scanRackQR` |
| API | `POST /racks/scan` `{ qrCode, orderId, riderId?, pickTime? }` |
| QR format (enforced) | `Rack-{identifier}-Slot{number} ({rider name})` e.g. `Rack-D1-Slot3 (John Doe)` |
| Backend | Assigns rack; sets HHD order status to **`completed`**; writes CompletedOrder; deletes active HHD order; returns rack |
| Errors | `400` invalid QR / rack unavailable; `401` missing user; `409` not used here |
| Next | `orderComplete` |
| Sync | Darkstore bag-rack may also use `PATCH /darkstore/orders/:orderId/bag-rack` |

---

## 12. Rider handover / completed

| Finding | Detail |
|---------|--------|
| HHD terminal device state in rack path | `completed` (+ completed-orders collection) |
| `handed_off` constant | **Not written by rack/photo controllers found** — do not block UI waiting for it |
| Rider pickup | Rider `POST /api/v1/orders/:id/pick` after `arrived-at-darkstore` |

Tasks screen: `GET /tasks`, update task — operational checklist separate from order machine.

---

## Screen state machine (App.tsx)

```
home
 → orderReceived
 → bagScan
 → orderOverview
 → activePickSession
 → orderCompletion
 → photoInsideBag
 → scanRackQR
 → orderComplete
 → home
```

Parallel tabs: `tasks`, `profile`.

---

## Offline

Client may queue: item not-found, bag scan, rack scan, photo, scanned-item. Redesign must preserve idempotent replay / conflict handling — details **UNKNOWN — VERIFY**.
