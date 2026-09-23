# 16 — API Response Examples

Sanitized placeholders only. Shapes reflect fields **frontends actually read** plus common backend envelopes. Where exact nesting differs (`data` wrapper vs raw), clients already normalize — redesign should accept both `{ success, data }` and direct payloads defensively.

---

## Customer auth — verify OTP

```http
POST /api/v1/customer/auth/verify-otp
Content-Type: application/json

{
  "sessionId": "<SESSION_ID>",
  "otp": "<OTP>"
}
```

```json
{
  "success": true,
  "data": {
    "accessToken": "<TOKEN>",
    "refreshToken": "<REFRESH_TOKEN>",
    "user": {
      "id": "<USER_ID>",
      "name": "Alex Customer",
      "email": "alex@example.com",
      "phoneNumber": "<PHONE>"
    }
  }
}
```

---

## Customer send OTP

```json
{
  "success": true,
  "data": {
    "sessionId": "<SESSION_ID>",
    "channel": "sms",
    "resendCooldownSeconds": 30
  }
}
```

---

## Cart get

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "<CART_ITEM_ID>",
        "productId": "<PRODUCT_ID>",
        "variantId": "<VARIANT_ID>",
        "quantity": 2,
        "name": "Sample Product",
        "price": 49,
        "mrp": 60,
        "imageUrl": "https://cdn.example.com/p.png"
      }
    ],
    "itemTotal": 98,
    "deliveryFee": 20,
    "discount": 0,
    "grandTotal": 118
  }
}
```

Field names for totals may vary (`total`, `grandTotal`, etc.) — bind via existing cart service mappers.

---

## Create order

```http
POST /api/v1/customer/orders
Authorization: Bearer <TOKEN>

{
  "items": [
    { "productId": "<PRODUCT_ID>", "variantId": "<VARIANT_ID>", "quantity": 1 }
  ],
  "addressId": "<ADDRESS_ID>",
  "paymentMethodId": "<PAYMENT_METHOD_ID>",
  "paymentMethodType": "online",
  "couponCode": "SAVE10",
  "deliveryTip": 10,
  "customerName": "Alex",
  "customerEmail": "alex@example.com",
  "customerPhone": "<PHONE>"
}
```

```json
{
  "success": true,
  "data": {
    "id": "<ORDER_ID>",
    "orderNumber": "<ORDER_NUMBER>",
    "status": "pending",
    "paymentStatus": "pending",
    "totalBill": 128
  }
}
```

---

## Active order / tracking

```json
{
  "success": true,
  "data": {
    "id": "<ORDER_ID>",
    "orderNumber": "<ORDER_NUMBER>",
    "status": "on-the-way",
    "paymentStatus": "paid",
    "items": [],
    "timeline": [
      { "status": "pending", "timestamp": "2026-08-08T10:00:00.000Z" },
      { "status": "confirmed", "timestamp": "2026-08-08T10:02:00.000Z" },
      { "status": "getting-packed", "timestamp": "2026-08-08T10:10:00.000Z" },
      { "status": "on-the-way", "timestamp": "2026-08-08T10:20:00.000Z" }
    ],
    "store": { "latitude": 0, "longitude": 0 },
    "rider": { "latitude": 0, "longitude": 0, "name": "Rider Name" }
  }
}
```

---

## Worldline session

```json
{
  "success": true,
  "data": {
    "paymentId": "<PAYMENT_ID>",
    "txnId": "<TXN_ID>",
    "hashAlgo": "<ALGO>",
    "sessionPayload": { "NOTE": "opaque gateway fields — pass to SDK; do not log secrets" }
  }
}
```

---

## Worldline status (poll)

```json
{
  "success": true,
  "data": {
    "uiState": "pending",
    "orderPaymentStatus": "pending",
    "latestPayment": { "status": "pending" },
    "recommendedAction": "poll"
  }
}
```

---

## Can cancel

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "cancellationFee": 0,
    "isPastFreeWindow": false,
    "policy": {
      "allowedStatuses": ["pending", "confirmed"],
      "freeWindowMinutes": 2,
      "cancellationFeePercent": 0,
      "maxCancellationFee": 0,
      "customerCanCancel": true,
      "autoRefundOnCancel": true,
      "refundMethod": "original_payment"
    }
  }
}
```

When blocked:

```json
{
  "success": true,
  "data": {
    "allowed": false,
    "reason": "Cannot cancel order while fulfillment is in \"PICKING\" status"
  }
}
```

---

## Wallet balance

```json
{
  "success": true,
  "data": {
    "balance": 250.5,
    "currency": "INR"
  }
}
```

---

## Product detail (illustrative)

```json
{
  "success": true,
  "data": {
    "id": "<PRODUCT_ID>",
    "name": "Sample Product",
    "price": 49,
    "mrp": 60,
    "stockQuantity": 25,
    "images": ["https://cdn.example.com/p.png"],
    "variants": [
      { "id": "<VARIANT_ID>", "name": "500g", "price": 49, "mrp": 60, "stockQuantity": 25 }
    ]
  }
}
```

---

## Address

```json
{
  "success": true,
  "data": {
    "id": "<ADDRESS_ID>",
    "label": "Home",
    "line1": "12 Example Street",
    "line2": "",
    "city": "Chennai",
    "state": "TN",
    "pincode": "600001",
    "latitude": 13.0,
    "longitude": 80.2,
    "isDefault": true
  }
}
```

---

## HHD verify OTP

```json
{
  "success": true,
  "token": "<TOKEN>",
  "user": {
    "id": "<USER_ID>",
    "mobile": "<PHONE>",
    "role": "picker"
  }
}
```

---

## HHD bag scan / order status update

```json
{
  "success": true,
  "data": {
    "orderId": "<ORDER_NUMBER_OR_ID>",
    "status": "picking",
    "bagId": "<BAG_ID>"
  }
}
```

---

## Rider verify OTP (signin)

```json
{
  "token": "<TOKEN>",
  "rider": {
    "id": "<USER_ID>",
    "phoneNumber": "<PHONE>"
  }
}
```

Client stores token as access (+ refresh if provided). Exact wrapper **VERIFY** against live response.

---

## Rider accept / deliver

```json
{
  "success": true,
  "data": {
    "id": "<ORDER_ID>",
    "status": "delivered",
    "orderNumber": "<ORDER_NUMBER>"
  }
}
```

---

## Admin login

```json
{
  "token": "<TOKEN>",
  "user": {
    "id": "<USER_ID>",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": ["*"]
  }
}
```

---

## Admin customer wallet credit

```http
POST /api/v1/admin/customers/<USER_ID>/wallet/credit
Authorization: Bearer <TOKEN>

{ "amount": 100, "reason": "goodwill" }
```

```json
{
  "success": true,
  "data": {
    "wallet": {
      "balance": 350.5,
      "currency": "INR",
      "isActive": true
    }
  }
}
```

---

## Error example

```json
{
  "success": false,
  "message": "Cannot transition from \"delivered\" to \"cancelled\"",
  "error": "INVALID_ORDER_TRANSITION"
}
```

---

## Notes

- Never commit real tokens, hashes, card PANs, UPI secrets, or PII dumps into design docs.
- Prefer capturing new examples from staging with redaction if field names prove incomplete.
