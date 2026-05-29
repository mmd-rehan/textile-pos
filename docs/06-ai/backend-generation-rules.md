# Backend Generation Rules

## Purpose

This file guides AI-generated backend code for the Textile ERP & POS System.

## Confirmed Backend Direction

```text
Runtime: Node.js
Framework: NestJS
Database: MySQL
ORM: Prisma
Authentication: email/username + password
Authorization: role-based permissions
```

## Backend Architecture Principles

- Use NestJS modules by business domain.
- Keep controllers thin.
- Keep business logic in services.
- Use DTOs for request validation.
- Use Prisma transactions for multi-step operations.
- Use guards for authentication and role permissions.
- Use audit logging for sensitive operations.
- Use centralized error handling.
- Avoid business logic duplication across controllers.

## Suggested Backend Module Pattern

```text
backend/src/modules/
├── auth/
├── users/
├── inventory/
├── products/
├── batches/
├── rolls/
├── sales/
├── retail-pos/
├── wholesale-pos/
├── customers/
├── customer-ledger/
├── purchases/
├── suppliers/
├── accounting/
├── reports/
├── barcode/
├── audit-logs/
└── settings/
```

## Critical Service Rules

### Inventory Deduction

Inventory deduction must happen inside a database transaction.

Required transaction steps:

1. Read roll with lock or transaction-safe consistency.
2. Validate roll status.
3. Validate remaining length.
4. Convert measurement to inventory base unit.
5. Use actual cut as deduction quantity.
6. Calculate wastage if actual cut is greater than billed quantity.
7. Update roll remaining length.
8. Create inventory movement.
9. Create sale line reference.
10. Create wastage record if applicable.
11. Create audit log.

### Sale Completion

Sale completion must not rely on frontend totals.

Backend must calculate:

- line subtotal
- discounts
- tax if enabled
- total
- amount paid
- outstanding amount
- inventory deduction
- ledger entries if credit is used

### Roll Reconciliation

Roll reconciliation must:

- compare expected remaining against actual physical remaining
- record difference
- store user
- store timestamp
- store reason
- create inventory movement
- update roll status if finished
- create audit log

### Ledger Handling

Ledger changes must be append-only.

Do not update customer balance directly without a ledger entry.

Balance may be stored as a cached value only if it is recalculated or updated safely through ledger operations.

### Accounting Handling

Pending confirmation:

```text
Whether v1 will implement full double-entry accounting is not locked.
```

Until confirmed, do not generate complex accounting journal automation unless asked.

## DTO Validation Rules

Validate on backend:

- required fields
- positive measurements
- supported units
- numeric decimal precision
- valid roll status
- valid product type
- customer credit limits where enabled
- user permissions
- invoice status before modification
- payment amount constraints

## Permission Rules

Use role and permission guards for:

- inventory adjustment
- negative stock override
- price change
- invoice cancellation
- refund approval
- roll reconciliation
- user management
- settings changes
- financial report access
- accounting corrections

## Error Response Pattern

Use consistent structured errors.

Suggested shape:

```json
{
  "success": false,
  "error": {
    "code": "ROLL_INSUFFICIENT_STOCK",
    "message": "This roll does not have enough remaining fabric.",
    "details": {
      "rollId": "...",
      "available": "2.50",
      "requested": "3.00",
      "unit": "YARD"
    }
  }
}
```

## Decimal and Money Rules

Do not use JavaScript floating point arithmetic for authoritative money or measurement calculations.

Use decimal-safe handling through Prisma Decimal, database decimal columns, or a tested decimal library.

## Audit Logging Rules

Create audit logs for:

- create/update/delete of critical records
- inventory adjustments
- roll reconciliation
- invoice cancellation
- payment correction
- credit limit changes
- user role changes
- settings changes

Audit logs should capture:

- actor user ID
- action
- entity type
- entity ID
- before snapshot where relevant
- after snapshot where relevant
- timestamp
- reason where required

## Testing Rules

Backend tests should include:

- unit tests for services
- integration tests for transactional flows
- permission tests
- validation tests
- rollback tests
- decimal edge cases

## Pending Confirmation

Do not implement these as final without confirmation:

- full accounting journal automation
- tax/VAT/GST rules
- invoice numbering format
- barcode format
- multi-branch guards
- offline synchronization
- native printer integration
