# Filtering and Sorting

## Purpose

This document defines filtering and sorting rules for API list endpoints.

Filtering must support real textile business workflows:

- finding rolls by product, batch, color, barcode, supplier, and status
- filtering sales by date, cashier, customer, payment status, and retail/wholesale type
- filtering wastage by user, roll, date, and reason
- filtering customer ledger by date and transaction type
- filtering reports by operational date ranges

---

## Query Parameter Style

Use simple query parameters for common filters.

Example:

```http
GET /api/v1/rolls?productId=prod_123&batchId=batch_123&status=ACTIVE
```

Use comma-separated values for multi-select filters.

```http
GET /api/v1/rolls?status=ACTIVE,REMNANT
```

Use date ranges for reports and transactional lists.

```http
GET /api/v1/sales?dateFrom=2026-05-01&dateTo=2026-05-29
```

---

## Common Filter Parameters

| Parameter | Usage |
|---|---|
| `q` | Search text |
| `status` | Record status |
| `dateFrom` | Start date |
| `dateTo` | End date |
| `createdByUserId` | User who created record |
| `customerId` | Customer filter |
| `supplierId` | Supplier filter |
| `productId` | Product filter |
| `batchId` | Batch/dye lot filter |
| `rollId` | Roll filter |
| `paymentStatus` | Payment status filter |
| `saleType` | Retail or wholesale |

---

## Search Parameter

Use `q` for text search.

Examples:

```http
GET /api/v1/products?q=palachi
GET /api/v1/customers?q=ahmed
GET /api/v1/rolls?q=R-1001
GET /api/v1/suppliers?q=karachi
```

Search should be case-insensitive where possible.

Search may match:

- name
- code
- barcode
- phone
- invoice number
- supplier name
- product code
- batch number

---

## Sorting Format

Use the format:

```text
sort=field:direction
```

Examples:

```http
GET /api/v1/rolls?sort=createdAt:desc
GET /api/v1/products?sort=name:asc
GET /api/v1/sales?sort=invoiceDate:desc
```

Multiple sorts:

```http
GET /api/v1/sales?sort=invoiceDate:desc,id:desc
```

Allowed directions:

```text
asc
desc
```

---

## Default Sorting

| Resource | Default |
|---|---|
| Products | `createdAt:desc,id:desc` |
| Categories | `name:asc,id:asc` |
| Batches | `createdAt:desc,id:desc` |
| Rolls | `createdAt:desc,id:desc` |
| Sales | `createdAt:desc,id:desc` |
| Customers | `createdAt:desc,id:desc` |
| Suppliers | `createdAt:desc,id:desc` |
| Purchases | `createdAt:desc,id:desc` |
| Ledger | `entryDate:desc,id:desc` |
| Audit logs | `createdAt:desc,id:desc` |

---

## Allowed Sort Fields

Do not allow arbitrary sorting directly against database fields.

Each endpoint should define allowed sort fields.

Example for rolls:

```text
createdAt
updatedAt
rollNumber
remainingLength
originalLength
status
purchaseDate
```

Example for sales:

```text
createdAt
invoiceDate
invoiceNumber
totalAmount
paymentStatus
saleType
```

Example for customers:

```text
createdAt
name
phone
outstandingBalance
customerType
```

Invalid sort field should return:

```text
422 VALIDATION_FAILED
```

---

## Inventory Filters

Recommended roll filters:

```http
GET /api/v1/rolls
  ?productId=prod_123
  &batchId=batch_123
  &status=ACTIVE
  &supplierId=supplier_123
  &remainingLengthMin=2
  &remainingLengthMax=10
```

Recommended batch filters:

```http
GET /api/v1/batches?productId=prod_123&batchNumber=BATCH-24
```

Recommended inventory movement filters:

```http
GET /api/v1/inventory-movements?rollId=roll_123&type=SALE,WASTAGE
```

---

## Sales Filters

```http
GET /api/v1/sales
  ?dateFrom=2026-05-01
  &dateTo=2026-05-29
  &saleType=RETAIL
  &customerId=customer_123
  &cashierId=user_123
  &paymentStatus=PAID,PARTIAL
```

Retail and wholesale screens may use separate endpoints or shared endpoint with `saleType`.

The workflow creation endpoints should remain separate:

```http
POST /api/v1/sales/retail
POST /api/v1/sales/wholesale
```

---

## Customer Ledger Filters

```http
GET /api/v1/customers/{customerId}/ledger
  ?dateFrom=2026-05-01
  &dateTo=2026-05-29
  &type=INVOICE,PAYMENT,ADJUSTMENT
```

---

## Reports Filters

Reports should require date range where appropriate.

Example:

```http
GET /api/v1/reports/sales?dateFrom=2026-05-01&dateTo=2026-05-29
```

Recommended report filters:

| Report | Filters |
|---|---|
| Sales | date range, sale type, customer, user, payment status |
| Inventory | category, product, batch, roll status, supplier |
| Wastage | date range, user, roll, product, reason |
| Credit Outstanding | customer type, aging bucket, balance range |
| Profitability | date range, product, category, sale type |
| Purchase | date range, supplier, product, batch |

---

## Date Range Rules

Use inclusive date range behavior by business date.

Example:

```http
dateFrom=2026-05-01
dateTo=2026-05-29
```

Should include records from May 1 through May 29 according to shop timezone.

Pending confirmation:

```text
Final shop timezone and whether reports use transaction date or posting date.
```

---

## Boolean Filters

Use `true` or `false`.

Example:

```http
GET /api/v1/products?isActive=true
GET /api/v1/customers?hasOutstandingBalance=true
```

---

## Enum Filters

Enums should use uppercase values.

Example:

```http
GET /api/v1/rolls?status=ACTIVE
GET /api/v1/sales?saleType=WHOLESALE
```

---

## Filtering Validation

Invalid filter values should return `422 VALIDATION_FAILED`.

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields are invalid.",
    "details": {
      "fields": [
        {
          "field": "status",
          "message": "Invalid roll status."
        }
      ]
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Performance Rules

Filters used often in POS and reports must be indexed.

High-priority indexed filters:

- barcode
- roll status
- product ID
- batch ID
- customer ID
- supplier ID
- sale date
- payment status
- invoice number
- inventory movement type
- created by user ID

---

## Prisma Implementation Notes

Build `where` conditions from validated DTOs only.

Do not pass raw query parameters directly into Prisma.

Use endpoint-specific DTOs:

```text
ListRollsQueryDto
ListSalesQueryDto
ListCustomersQueryDto
SalesReportQueryDto
```

---

## Pending Confirmation

```text
- exact report date behavior
- exact shop timezone
- exact search matching behavior
- whether full-text search is needed in v1
- exact enum names in Prisma schema
```
