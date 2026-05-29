# API Standards

## Purpose

This document defines REST API standards for the Textile ERP & POS System.

The API must be predictable, easy for the frontend to consume, strict about validation, and safe for inventory and financial operations.

---

## API Style

Use REST-style JSON APIs.

Base path:

```text
/api/v1
```

Examples:

```text
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/rolls/:id
POST   /api/v1/sales/retail
POST   /api/v1/rolls/:id/reconcile
GET    /api/v1/customers/:id/ledger
```

---

## General Rules

1. Use nouns for resources.
2. Use verbs only for business actions that are not simple CRUD.
3. Keep response shape consistent.
4. Validate all input server-side.
5. Use proper HTTP status codes.
6. Return machine-readable error codes.
7. Use pagination for list endpoints.
8. Use idempotency keys for critical write operations.
9. Do not expose internal stack traces.
10. Do not rely on frontend calculations for inventory or money.

---

## Response Envelope

### Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ROLL_LENGTH",
    "message": "Roll does not have enough remaining fabric.",
    "details": {
      "rollId": "roll_123",
      "availableYard": "2.5000",
      "requestedYard": "3.0000"
    }
  }
}
```

---

## HTTP Status Codes

Use these consistently:

```text
200 OK                      Successful read or update
201 Created                 Resource created
204 No Content              Successful delete/archive action with no body
400 Bad Request             Invalid request format
401 Unauthorized            Missing or invalid authentication
403 Forbidden               Authenticated but not allowed
404 Not Found               Resource not found
409 Conflict                Business conflict or concurrency issue
422 Unprocessable Entity    Validation failed
429 Too Many Requests       Rate limit exceeded
500 Internal Server Error   Unexpected server error
```

---

## Error Code Standards

Use uppercase snake case.

Examples:

```text
VALIDATION_ERROR
UNAUTHORIZED
PERMISSION_DENIED
RESOURCE_NOT_FOUND
DUPLICATE_BARCODE
ROLL_NOT_FOUND
ROLL_ALREADY_FINISHED
INSUFFICIENT_ROLL_LENGTH
NEGATIVE_STOCK_NOT_ALLOWED
INVALID_MEASUREMENT_UNIT
CUSTOMER_CREDIT_LIMIT_EXCEEDED
INVOICE_ALREADY_VOIDED
IDEMPOTENCY_KEY_CONFLICT
```

---

## Pagination Standard

List endpoints must support pagination.

Request:

```text
GET /api/v1/rolls?page=1&pageSize=25
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 250,
    "totalPages": 10
  }
}
```

Defaults:

```text
page = 1
pageSize = 25
max pageSize = 100
```

---

## Filtering Standard

Use query parameters for common filters.

Examples:

```text
GET /api/v1/rolls?status=AVAILABLE&productId=123&batchId=456
GET /api/v1/sales?fromDate=2026-01-01&toDate=2026-01-31&type=RETAIL
GET /api/v1/customers?type=CREDIT&search=ahmad
```

Use `search` for free-text search.

---

## Sorting Standard

Use `sortBy` and `sortOrder`.

Example:

```text
GET /api/v1/rolls?sortBy=createdAt&sortOrder=desc
```

Allowed sort fields must be whitelisted server-side.

---

## Date and Time Standard

Use ISO 8601 strings in API responses.

Example:

```json
{
  "createdAt": "2026-05-29T10:15:30.000Z"
}
```

Backend should store timestamps consistently and convert display time on frontend.

---

## Decimal Standard

Return money and measurement decimals as strings to avoid JavaScript floating-point issues.

Example:

```json
{
  "remainingLengthYard": "18.4000",
  "unitPrice": "250.00",
  "totalAmount": "750.00"
}
```

---

## Authentication Header

If using bearer tokens:

```text
Authorization: Bearer <access_token>
```

If using HTTP-only cookies, the frontend should rely on browser cookie handling and CSRF protection where required.

---

## Idempotency Standard

Critical write APIs should accept:

```text
Idempotency-Key: <uuid>
```

Required for:

- Create sale.
- Record payment.
- Process return.
- Create purchase.

If the same key is retried with the same request, return the original response.

If the same key is reused with a different request body, return:

```text
409 Conflict
```

Error code:

```text
IDEMPOTENCY_KEY_CONFLICT
```

---

## Validation Error Standard

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "fields": {
      "billedQuantity": ["Billed quantity must be greater than zero."],
      "unit": ["Unit must be YARD or METER."]
    }
  }
}
```

---

## API Resource Examples

### Barcode Lookup

```text
GET /api/v1/barcodes/:barcode/lookup
```

Response:

```json
{
  "success": true,
  "data": {
    "type": "ROLL",
    "roll": {
      "id": "roll_123",
      "rollCode": "R-1001",
      "barcode": "R1001B24",
      "productId": "prod_123",
      "productName": "Palachi P-001",
      "batchNo": "B-24",
      "remainingLengthYard": "18.4000",
      "salePricePerYard": "250.00",
      "status": "AVAILABLE"
    }
  }
}
```

---

### Create Retail Sale

```text
POST /api/v1/sales/retail
```

Request:

```json
{
  "customerId": "cust_123",
  "lines": [
    {
      "rollId": "roll_123",
      "productId": "prod_123",
      "billedQuantity": "3.00",
      "actualCutQuantity": "3.20",
      "unit": "YARD",
      "unitPrice": "250.00",
      "discountAmount": "0.00"
    }
  ],
  "payments": [
    {
      "method": "CASH",
      "amount": "750.00"
    }
  ],
  "notes": ""
}
```

Response:

```json
{
  "success": true,
  "data": {
    "invoiceId": "inv_123",
    "invoiceNo": "INV-2026-000001",
    "totalAmount": "750.00",
    "paidAmount": "750.00",
    "creditAmount": "0.00",
    "printUrl": "/api/v1/sales/inv_123/receipt"
  }
}
```

---

### Reconcile Roll

```text
POST /api/v1/rolls/:id/reconcile
```

Request:

```json
{
  "physicalRemainingQuantity": "0.00",
  "unit": "YARD",
  "reason": "Roll physically finished during cutting."
}
```

---

### Customer Ledger

```text
GET /api/v1/customers/:id/ledger?page=1&pageSize=50
```

---

## Business Action Endpoints

Use action endpoints for workflows that are not simple CRUD.

Examples:

```text
POST /api/v1/rolls/:id/reconcile
POST /api/v1/invoices/:id/void
POST /api/v1/sales/:id/return
POST /api/v1/customers/:id/payments
POST /api/v1/inventory/adjustments
```

---

## Permission Error Standard

When user is authenticated but not allowed:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action."
  }
}
```

---

## Warning Standard

Some API responses may include warnings for frontend display.

Example:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "warnings": [
      {
        "code": "BATCH_MISMATCH_WARNING",
        "message": "Selected roll belongs to a different dye lot."
      }
    ]
  }
}
```

Warnings do not block the request unless the business rule requires approval.

---

## Versioning

Start with:

```text
/api/v1
```

Breaking changes should create a new API version later.

Do not create new versions for minor additive fields.

---

## Non-Negotiable API Rules

1. Never expose stack traces in production.
2. Never allow inventory mutation without authentication.
3. Never allow critical actions without permission checks.
4. Never trust frontend totals as final.
5. Always return decimal values safely.
6. Always paginate list endpoints.
7. Always use transactions for sale and inventory write APIs.
8. Always return actionable error codes.
