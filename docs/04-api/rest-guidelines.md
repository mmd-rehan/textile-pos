# REST Guidelines

## Purpose

This document defines REST API rules for the Textile ERP & POS System.

The API must support:

- fast POS billing
- roll/thaan-based inventory
- barcode scanning
- retail and wholesale flows
- customer ledger and credit workflows
- supplier and purchase workflows
- reporting and auditability

The backend stack is:

```text
Node.js + NestJS
Prisma
MySQL
```

---

## Core API Principles

### 1. Business logic belongs on the backend

The frontend may calculate temporary preview values for user experience, but final business calculations must be performed and validated by the backend.

Examples:

- roll remaining length
- actual cut deduction
- wastage calculation
- invoice totals
- discount validation
- customer credit balance
- payment status
- profit calculations

---

### 2. Inventory APIs must be roll-aware

The API must not expose product-level stock as the only source of truth.

For fabric inventory, the true inventory unit is:

```text
Roll / Thaan
```

A product may have many batches, and each batch may have many rolls.

Correct hierarchy:

```text
Category
Product
Batch / Dye Lot
Roll / Thaan
Inventory Movement
```

---

### 3. Mutating operations must be auditable

Any API that changes important business data must create an audit trail.

Examples:

- create sale
- cancel invoice
- return item
- adjust inventory
- retire roll
- record wastage
- update price
- change customer credit limit
- receive customer payment
- record supplier payment

---

### 4. Financial records must not be silently changed

Invoices, ledger entries, journal entries, and payments should not be overwritten without trace.

Corrections must use:

- reversal entries
- adjustment entries
- cancellation records
- refund records

---

## API Base Path

Recommended base path:

```http
/api/v1
```

Examples:

```http
GET    /api/v1/products
POST   /api/v1/sales/retail
POST   /api/v1/rolls/{rollId}/retire
GET    /api/v1/customers/{customerId}/ledger
```

Versioning should start from `v1` so future breaking changes can be introduced safely.

---

## Resource Naming

Use plural resource names.

```http
/products
/categories
/batches
/rolls
/sales
/customers
/suppliers
/purchases
/reports
/settings
```

Use nested routes only when the child resource strongly belongs to the parent context.

Good:

```http
GET /api/v1/products/{productId}/batches
GET /api/v1/batches/{batchId}/rolls
GET /api/v1/customers/{customerId}/ledger
GET /api/v1/rolls/{rollId}/movements
```

Avoid deeply nested URLs beyond 2 levels.

Avoid:

```http
/api/v1/categories/{categoryId}/products/{productId}/batches/{batchId}/rolls/{rollId}/sales
```

Prefer query filters for deeper relationships:

```http
GET /api/v1/rolls?categoryId=...&productId=...&batchId=...
```

---

## HTTP Methods

| Method | Usage |
|---|---|
| `GET` | Read data |
| `POST` | Create records or execute business workflow |
| `PATCH` | Partial update |
| `PUT` | Full replacement only when needed |
| `DELETE` | Soft delete or cancellation where allowed |

---

## DELETE Policy

Hard delete should be avoided for business records.

Prefer:

```text
status = CANCELLED
status = VOIDED
status = INACTIVE
deletedAt = timestamp
```

Hard delete may be acceptable only for:

- draft records
- setup records with no transactions
- temporary records

Pending confirmation:

```text
Exact hard-delete policy for v1.
```

---

## Standard Response Shape

Successful single-resource response:

```json
{
  "success": true,
  "data": {
    "id": "roll_123"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Successful list response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 105,
    "totalPages": 6
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Error response is defined in:

```text
docs/04-api/error-format.md
```

---

## Common Status Codes

| Status | Meaning |
|---|---|
| `200` | Successful read/update |
| `201` | Created |
| `204` | Successful action with no body |
| `400` | Invalid request |
| `401` | Not authenticated |
| `403` | Not allowed |
| `404` | Resource not found |
| `409` | Business conflict |
| `422` | Validation failed |
| `429` | Too many requests |
| `500` | Unexpected server error |

---

## Business Conflict Examples

Use `409 Conflict` for valid requests that cannot be completed because of current business state.

Examples:

- roll does not have enough remaining length
- roll already retired
- invoice already cancelled
- customer exceeds credit limit
- barcode already exists
- payment is already reconciled
- purchase is already posted
- accounting period is closed

---

## Validation Failure Examples

Use `422 Unprocessable Entity` when input is structurally valid JSON but fails validation.

Examples:

- sold length must be greater than zero
- actual cut cannot be less than billed length unless authorized
- price cannot be negative
- phone number format is invalid
- payment amount exceeds outstanding balance
- missing required role permission

---

## Date and Time Format

All API dates should use ISO 8601.

```json
{
  "createdAt": "2026-05-29T10:30:00.000Z"
}
```

Frontend may display local date/time according to shop settings.

Pending confirmation:

```text
Final timezone setting for shop operations.
```

---

## Decimal and Money Handling

Fabric lengths and money values must not use unsafe floating point logic in core business calculations.

Recommended API transport:

```json
{
  "billedLength": "3.25",
  "actualCutLength": "3.30",
  "unitPrice": "450.00",
  "lineTotal": "1485.00"
}
```

Recommended backend handling:

- use Prisma `Decimal`
- store monetary values using decimal columns
- store fabric lengths using decimal columns
- avoid JavaScript floating point arithmetic for final values

---

## Measurement Units

Supported measurement units for fabric:

```text
YARD
METER
```

API requests should include the unit entered by the user and the normalized inventory unit.

Example:

```json
{
  "inputLength": "3.00",
  "inputUnit": "METER",
  "normalizedLength": "3.28083",
  "inventoryUnit": "YARD"
}
```

Pending confirmation:

```text
Whether backend inventory base unit is always YARD, always METER, or configurable.
```

Until confirmed, API docs should say:

```text
Backend must normalize fabric measurements into one inventory base unit.
```

---

## Key API Groups

### Authentication

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

### Users and Roles

```http
GET    /api/v1/users
POST   /api/v1/users
PATCH  /api/v1/users/{userId}
GET    /api/v1/roles
GET    /api/v1/permissions
```

### Catalog

```http
GET    /api/v1/categories
POST   /api/v1/categories
GET    /api/v1/products
POST   /api/v1/products
PATCH  /api/v1/products/{productId}
```

### Batches and Rolls

```http
GET    /api/v1/batches
POST   /api/v1/batches
GET    /api/v1/rolls
POST   /api/v1/rolls
GET    /api/v1/rolls/{rollId}
PATCH  /api/v1/rolls/{rollId}
POST   /api/v1/rolls/{rollId}/retire
GET    /api/v1/rolls/{rollId}/movements
```

### Barcode

```http
POST /api/v1/barcodes/rolls/{rollId}/generate
GET  /api/v1/barcodes/lookup/{barcode}
POST /api/v1/barcodes/print
```

### Sales

Retail and wholesale should be separate workflows.

```http
POST /api/v1/sales/retail
POST /api/v1/sales/wholesale
GET  /api/v1/sales
GET  /api/v1/sales/{saleId}
POST /api/v1/sales/{saleId}/cancel
POST /api/v1/sales/{saleId}/return
```

### Customers and Ledger

```http
GET  /api/v1/customers
POST /api/v1/customers
GET  /api/v1/customers/{customerId}
GET  /api/v1/customers/{customerId}/ledger
POST /api/v1/customers/{customerId}/payments
```

### Suppliers and Purchases

```http
GET  /api/v1/suppliers
POST /api/v1/suppliers
GET  /api/v1/purchases
POST /api/v1/purchases
POST /api/v1/purchases/{purchaseId}/post
```

### Reports

```http
GET /api/v1/reports/sales
GET /api/v1/reports/inventory
GET /api/v1/reports/wastage
GET /api/v1/reports/customers/outstanding
GET /api/v1/reports/profitability
```

---

## Command-Style Endpoints

Use command-style endpoints only for business workflows that are not simple CRUD.

Examples:

```http
POST /api/v1/rolls/{rollId}/retire
POST /api/v1/sales/{saleId}/cancel
POST /api/v1/sales/{saleId}/return
POST /api/v1/purchases/{purchaseId}/post
POST /api/v1/customers/{customerId}/payments
POST /api/v1/inventory-adjustments
```

Do not model these as plain `PATCH` updates because they need:

- validation
- permissions
- audit logs
- inventory movements
- ledger entries
- event publishing

---

## Idempotency

Idempotency is important for POS and payment-related APIs.

Recommended header:

```http
Idempotency-Key: uuid-or-client-generated-key
```

Use idempotency for:

- sale creation
- customer payment
- supplier payment
- purchase posting
- invoice cancellation
- returns
- inventory adjustment

The server should reject duplicate conflicting requests with `409 Conflict`.

Pending confirmation:

```text
Exact idempotency storage duration.
```

Recommended default:

```text
24 hours for POS/payment commands.
```

---

## Request ID

Every request should have a request ID for debugging and audit correlation.

Recommended header:

```http
X-Request-Id: req_123
```

If the frontend does not send one, the backend should generate one.

---

## Audit Metadata

Mutating APIs should capture:

```json
{
  "createdByUserId": "user_123",
  "requestId": "req_123",
  "source": "POS",
  "ipAddress": "127.0.0.1",
  "userAgent": "browser"
}
```

---

## API Performance Targets

Standard API response target:

```text
under 500ms
```

Barcode lookup target:

```text
under 300ms
```

Dashboard target:

```text
under 2 seconds
```

Reports may take longer if they aggregate large datasets, but should support filters and pagination where possible.

---

## Pending Confirmation

The following should remain open until confirmed:

```text
- base inventory unit: yard, meter, or configurable
- exact invoice numbering format
- exact barcode format
- exact tax/VAT/GST behavior
- exact return/refund approval workflow
- exact customer credit-limit enforcement rule
- exact idempotency retention period
- exact timezone and localization settings
- whether API uses cookie sessions, bearer JWT, or hybrid session/JWT in v1
```
