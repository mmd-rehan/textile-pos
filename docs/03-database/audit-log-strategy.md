# Audit Log Strategy

## Purpose

This document defines how user actions, inventory movements, and sensitive business changes should be logged.

The system must provide accountability for sales, wastage, inventory adjustments, roll reconciliation, invoice changes, customer credit, supplier payments, and accounting entries.

## Status

Accepted for v1 planning.

## Audit Philosophy

Audit logging is not the same as business transaction logging.

The system should keep both:

1. Business ledgers that explain what happened financially or operationally.
2. Audit logs that explain who did it, when, from where, and what changed.

## Log Types

### 1. Inventory Movement Ledger

Table:

```text
inventory_movements
```

Purpose:

Tracks stock movement and roll length changes.

Examples:

- Purchase received
- Sale deduction
- Return stock-in
- Wastage deduction
- Manual adjustment
- Roll reconciliation
- Remnant conversion

This table is business-critical and should be immutable after creation.

### 2. Customer and Supplier Ledgers

Tables:

```text
customer_ledger_entries
supplier_ledger_entries
```

Purpose:

Tracks debit, credit, payments, balances, and adjustments.

These tables are financial records and should not be silently edited.

### 3. Accounting Journal

Tables:

```text
journal_entries
journal_entry_lines
```

Purpose:

Tracks accounting postings if double-entry accounting is enabled.

Posted entries should be immutable. Corrections should create reversal or adjustment entries.

### 4. Audit Log

Table:

```text
audit_logs
```

Purpose:

Tracks sensitive changes and administrative actions.

Examples:

- User created or disabled
- Role changed
- Permission changed
- Product price changed
- Roll length adjusted
- Invoice cancelled
- Refund approved
- Credit limit changed
- Settings changed

### 5. Activity Log

Table:

```text
activity_logs
```

Purpose:

Tracks lower-risk operational events.

Examples:

- User login
- User logout
- Failed login
- Barcode scan failure
- Receipt print attempt
- Export report

## audit_logs Suggested Fields

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| actor_user_id | String | User performing action |
| action | String | For example ROLL_ADJUSTED, INVOICE_CANCELLED |
| entity_type | String | For example Roll, SaleInvoice, Product |
| entity_id | String | ID of changed record |
| before_snapshot | JSON | Previous values, where safe |
| after_snapshot | JSON | New values, where safe |
| reason | String | Required for critical actions |
| ip_address | String | Optional |
| user_agent | String | Optional |
| request_id | String | Request correlation ID |
| created_at | DateTime | Required |

## activity_logs Suggested Fields

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| user_id | String | Optional for failed login |
| activity_type | String | LOGIN, LOGOUT, PRINT_RECEIPT, etc. |
| message | String | Human-readable summary |
| metadata | JSON | Optional |
| ip_address | String | Optional |
| user_agent | String | Optional |
| created_at | DateTime | Required |

## Critical Actions That Must Be Audited

### Access and Security

- User creation
- User disable/suspend
- Password reset by admin
- Role assignment
- Permission assignment
- Failed login attempts

### Inventory

- Roll creation
- Roll length adjustment
- Manual stock adjustment
- Roll retirement
- Remnant creation
- Wastage entry
- Batch correction

### Sales

- Invoice cancellation
- Invoice deletion request, if allowed
- Refund approval
- Return approval
- Price override
- Discount override
- Negative stock override, if ever allowed

### Customers

- Credit limit change
- Customer type change
- Ledger adjustment
- Payment deletion or reversal

### Suppliers and Purchases

- Purchase cancellation
- Supplier payable adjustment
- Purchase price change after confirmation

### Accounting

- Journal posting
- Journal reversal
- Expense approval
- Cash register closing

### Settings

- Invoice settings change
- Tax settings change
- Measurement conversion settings change
- Barcode settings change
- Feature flag change

## Wastage Accountability

When actual cut is more than billed quantity, the system should record:

```text
wastage_entries
inventory_movements
audit_logs, if approval or override is involved
```

The wastage entry should include:

- Roll
- Sale invoice item, if related to sale
- Billed quantity
- Actual cut quantity
- Wastage quantity
- Salesperson/user
- Reason
- Timestamp

## Roll Reconciliation Accountability

When a roll is marked as finished, the system should compare expected remaining length with actual physical remaining length.

The reconciliation should record:

- Roll
- Expected remaining length
- Actual remaining length
- Difference
- Reason
- User responsible
- Approver, if required
- Timestamp

The system should also create an inventory movement for the difference.

## Immutability Rules

### Records That Should Not Be Edited Silently

```text
inventory_movements
customer_ledger_entries
supplier_ledger_entries
journal_entries
journal_entry_lines
audit_logs
sale_invoices after confirmation
sale_invoice_items after confirmation
```

### Correction Pattern

Use correction records instead of direct updates.

Examples:

```text
Wrong invoice amount -> create cancellation, return, or adjustment
Wrong customer payment -> create reversal entry
Wrong inventory length -> create stock adjustment movement
Wrong accounting entry -> create reversing journal entry
```

## Snapshot Rules

Use JSON snapshots carefully.

Good candidates:

- product price changes
- settings changes
- role/permission changes
- invoice cancellation metadata
- stock adjustment metadata

Avoid storing sensitive data unnecessarily:

- password hash
- authentication tokens
- full session token

## Request Correlation

Every backend request should generate or accept a request ID.

Recommended header:

```text
X-Request-Id
```

This request ID should be included in:

- application logs
- audit logs
- error responses
- background job logs, if used later

## Audit Log Retention

Pending confirmation.

Recommended v1:

- Keep audit logs indefinitely for the first version.
- Add export/archive policy later.
- Do not auto-delete audit logs until compliance and storage needs are confirmed.

## Access to Audit Logs

Recommended permissions:

| Role | Audit Access |
|---|---|
| Admin | Full access |
| Manager | Operational audit only |
| Accountant | Financial audit only |
| Cashier / Salesman | No audit log access |
| Inventory Staff | Inventory movement history only |

Exact permission matrix belongs in authentication docs.

## Implementation Notes for NestJS

Recommended implementation approach:

1. Create an `AuditModule`.
2. Provide an `AuditService`.
3. Use explicit audit calls in service methods for critical actions.
4. Use interceptors for generic request logging only.
5. Avoid relying only on automatic ORM hooks because business reasons and actor context are required.

## Pending Confirmation

1. Audit retention period.
2. Whether manager can view all operational audit logs.
3. Whether every price override requires approval.
4. Whether inventory staff can reconcile rolls without manager approval.
5. Whether invoice cancellation is allowed after end-of-day closing.
