# Pagination

## Purpose

This document defines pagination rules for APIs returning lists.

Pagination is required for:

- products
- rolls
- customers
- suppliers
- purchases
- sales
- inventory movements
- audit logs
- ledgers
- reports

---

## Default Pagination Strategy

Use page-based pagination for normal list screens.

Example:

```http
GET /api/v1/rolls?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 135,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## Default Limits

| Screen/API | Default Limit | Max Limit |
|---|---:|---:|
| Normal tables | 20 | 100 |
| POS barcode lookup | Not paginated | Not applicable |
| Search dropdowns | 10 | 50 |
| Reports | 50 | 500 |
| Audit logs | 50 | 200 |
| Ledger entries | 50 | 200 |
| Export endpoints | Pending confirmation | Pending confirmation |

---

## Query Parameters

| Parameter | Required | Default | Description |
|---|---:|---:|---|
| `page` | No | `1` | Page number |
| `limit` | No | `20` | Number of items per page |

Example:

```http
GET /api/v1/products?page=2&limit=50
```

---

## Validation Rules

- `page` must be greater than or equal to `1`
- `limit` must be greater than or equal to `1`
- `limit` must not exceed the endpoint max limit
- invalid pagination should return `422 VALIDATION_FAILED`

---

## Sorting With Pagination

Pagination should always use deterministic sorting.

Bad:

```http
GET /api/v1/sales?page=1&limit=20
```

without stable default sort.

Good default:

```http
GET /api/v1/sales?page=1&limit=20&sort=createdAt:desc,id:desc
```

Recommended default sort:

| Resource | Default Sort |
|---|---|
| Products | `createdAt:desc,id:desc` |
| Rolls | `createdAt:desc,id:desc` |
| Sales | `createdAt:desc,id:desc` |
| Purchases | `createdAt:desc,id:desc` |
| Customers | `createdAt:desc,id:desc` |
| Ledger | `entryDate:desc,id:desc` |
| Audit logs | `createdAt:desc,id:desc` |

---

## Cursor Pagination

Cursor pagination may be used later for very large lists or event streams.

Example:

```http
GET /api/v1/audit-logs?cursor=audit_123&limit=50
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "limit": 50,
    "nextCursor": "audit_456",
    "hasNextPage": true
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

For v1, page-based pagination is acceptable unless performance requires cursor pagination.

---

## POS Search Pagination

POS screens should prioritize speed.

Recommended behavior:

```http
GET /api/v1/barcodes/lookup/{barcode}
```

No pagination.

For product search:

```http
GET /api/v1/products/search?q=palachi&limit=10
```

Response should return the most relevant results quickly.

Do not send huge product or roll lists to POS screens.

---

## Report Pagination

Reports should use pagination unless exporting.

Example:

```http
GET /api/v1/reports/sales?dateFrom=2026-05-01&dateTo=2026-05-29&page=1&limit=50
```

Report responses may include totals separately from paginated rows.

```json
{
  "success": true,
  "data": {
    "summary": {
      "grossSales": "150000.00",
      "discounts": "5000.00",
      "netSales": "145000.00"
    },
    "rows": []
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 400,
    "totalPages": 8
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## Export Endpoints

Exports should not rely on normal table pagination.

Recommended pattern:

```http
POST /api/v1/reports/sales/export
```

Pending confirmation:

```text
Whether exports are generated synchronously or through background jobs in v1.
```

For a small single-shop v1, synchronous export may be acceptable if dataset is small.

---

## Prisma Implementation Notes

Use Prisma `skip` and `take` for page-based pagination.

Example concept:

```ts
const skip = (page - 1) * limit;
const take = limit;
```

Use a transaction or consistent query pattern when returning both rows and count.

```ts
const [rows, total] = await prisma.$transaction([
  prisma.roll.findMany({ skip, take, orderBy }),
  prisma.roll.count({ where }),
]);
```

---

## Empty Result

An empty list is not an error.

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## Pending Confirmation

```text
- max export size
- whether report exports are sync or async
- whether cursor pagination is needed in v1
- default table page size in frontend
```
