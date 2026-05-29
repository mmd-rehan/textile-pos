# Error Format

## Purpose

This document defines a consistent API error response format for the Textile ERP & POS System.

Errors must be clear enough for:

- frontend display
- developer debugging
- cashier-friendly messages
- audit tracking
- support investigation

---

## Standard Error Shape

```json
{
  "success": false,
  "error": {
    "code": "ROLL_INSUFFICIENT_LENGTH",
    "message": "Roll does not have enough remaining length.",
    "details": {
      "rollId": "roll_123",
      "requestedLength": "5.00",
      "availableLength": "3.25",
      "unit": "YARD"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Error Fields

| Field | Required | Description |
|---|---:|---|
| `success` | Yes | Always `false` for errors |
| `error.code` | Yes | Stable machine-readable error code |
| `error.message` | Yes | Human-readable message |
| `error.details` | No | Additional structured context |
| `meta.requestId` | Yes | Request correlation ID |
| `meta.timestamp` | Yes | Error timestamp |

---

## Error Code Rules

Error codes must be:

- uppercase
- stable
- specific
- safe to expose to frontend
- not translated

Format:

```text
DOMAIN_REASON
```

Examples:

```text
ROLL_NOT_FOUND
ROLL_ALREADY_RETIRED
ROLL_INSUFFICIENT_LENGTH
SALE_ALREADY_CANCELLED
CUSTOMER_CREDIT_LIMIT_EXCEEDED
AUTH_INVALID_CREDENTIALS
PERMISSION_DENIED
VALIDATION_FAILED
```

---

## User-Facing Message Rules

Messages should be simple and safe.

Good:

```text
Roll does not have enough remaining length.
```

Avoid:

```text
PrismaClientKnownRequestError at inventory.service.ts line 239.
```

Internal technical errors should be logged on the server but not exposed to the user.

---

## HTTP Status Mapping

| Status | Category | Example |
|---:|---|---|
| `400` | Bad request | Invalid JSON body |
| `401` | Authentication | Not logged in |
| `403` | Authorization | User cannot cancel invoice |
| `404` | Not found | Roll not found |
| `409` | Business conflict | Roll already retired |
| `422` | Validation | Length must be greater than zero |
| `429` | Rate limit | Too many login attempts |
| `500` | Server error | Unexpected backend failure |

---

## Validation Error Format

For field validation errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields are invalid.",
    "details": {
      "fields": [
        {
          "field": "actualCutLength",
          "message": "Actual cut length must be greater than zero."
        },
        {
          "field": "unitPrice",
          "message": "Unit price cannot be negative."
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

## Authentication Errors

### Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid username or password."
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

### Session Expired

```json
{
  "success": false,
  "error": {
    "code": "AUTH_SESSION_EXPIRED",
    "message": "Your session has expired. Please log in again."
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Permission Errors

Use `403 Forbidden`.

Example:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action.",
    "details": {
      "requiredPermission": "inventory.adjust"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Textile-Specific Business Errors

### Roll Insufficient Length

```json
{
  "success": false,
  "error": {
    "code": "ROLL_INSUFFICIENT_LENGTH",
    "message": "Roll does not have enough remaining length.",
    "details": {
      "rollId": "roll_123",
      "remainingLength": "2.50",
      "requestedActualCutLength": "3.00",
      "unit": "YARD"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

### Roll Already Retired

```json
{
  "success": false,
  "error": {
    "code": "ROLL_ALREADY_RETIRED",
    "message": "This roll is already retired and cannot be used for sales.",
    "details": {
      "rollId": "roll_123"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

### Actual Cut Lower Than Billed Quantity

This rule is pending final business confirmation.

Recommended default:

```text
Actual cut may be equal to or greater than billed quantity.
If actual cut is lower than billed quantity, require manager approval or block the sale.
```

Error example:

```json
{
  "success": false,
  "error": {
    "code": "ACTUAL_CUT_LESS_THAN_BILLED_REQUIRES_APPROVAL",
    "message": "Actual cut is less than billed quantity and requires approval.",
    "details": {
      "billedLength": "3.00",
      "actualCutLength": "2.90",
      "unit": "YARD"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

### Batch Mismatch Warning

Batch mismatch is usually a warning, not always a hard error.

Use a warning response only when the workflow allows continuation.

```json
{
  "success": true,
  "data": {
    "canProceed": true,
    "warnings": [
      {
        "code": "BATCH_MISMATCH",
        "message": "Selected rolls are from different batches."
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Pending confirmation:

```text
Which batch mismatch cases must block sale vs only warn.
```

### Credit Limit Exceeded

```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_CREDIT_LIMIT_EXCEEDED",
    "message": "Customer credit limit will be exceeded.",
    "details": {
      "customerId": "customer_123",
      "currentOutstanding": "5000.00",
      "newInvoiceAmount": "1500.00",
      "creditLimit": "6000.00"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

Pending confirmation:

```text
Whether manager override is allowed for customer credit limit.
```

---

## Accounting Errors

### Immutable Record

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNTING_RECORD_IMMUTABLE",
    "message": "This financial record cannot be edited directly. Create an adjustment instead.",
    "details": {
      "recordId": "entry_123"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Barcode Errors

### Barcode Not Found

```json
{
  "success": false,
  "error": {
    "code": "BARCODE_NOT_FOUND",
    "message": "No product or roll found for this barcode.",
    "details": {
      "barcode": "R-1001"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

### Barcode Already Exists

```json
{
  "success": false,
  "error": {
    "code": "BARCODE_ALREADY_EXISTS",
    "message": "This barcode is already assigned.",
    "details": {
      "barcode": "R-1001"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Server Error Format

Unexpected backend errors should return:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Something went wrong. Please try again or contact support."
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-29T10:30:00.000Z"
  }
}
```

The server logs should include detailed stack traces, user ID, request ID, and route.

---

## NestJS Implementation Notes

Recommended components:

```text
HttpExceptionFilter
ValidationPipe
Class-validator DTOs
Prisma exception mapper
Request ID middleware/interceptor
Audit logging interceptor for mutating routes
```

Prisma errors should be mapped into safe domain errors.

Examples:

| Prisma/Error Case | API Error |
|---|---|
| Unique constraint | `DUPLICATE_RECORD` or domain-specific duplicate code |
| Foreign key failure | `RELATED_RECORD_NOT_FOUND` |
| Record not found | `RESOURCE_NOT_FOUND` |
| Transaction failure | `TRANSACTION_FAILED` |

---

## Logging Rules

All errors should log:

- request ID
- user ID if available
- method
- path
- status code
- error code
- stack trace for server errors
- important business IDs where safe

Do not log:

- passwords
- access tokens
- refresh tokens
- full payment secrets
- sensitive credentials

---

## Pending Confirmation

```text
- final wording for cashier-facing messages
- whether frontend translations are needed
- manager override rules for selected business errors
- whether batch mismatch is blocking or warning
- rate-limit thresholds
- exact support contact/help wording
```
