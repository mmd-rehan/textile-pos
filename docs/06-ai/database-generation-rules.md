# Database Generation Rules

## Purpose

This file guides AI-generated Prisma and MySQL database work for the Textile ERP & POS System.

## Confirmed Database Direction

```text
Database: MySQL
ORM: Prisma
```

## Database Principles

- Model real textile inventory at roll level.
- Use normalized tables for core business entities.
- Use append-only history for inventory movements and ledger entries.
- Avoid silent deletion of financial and inventory records.
- Use decimal columns for money and measurements.
- Keep audit fields on important tables.
- Design single-shop first without blocking future multi-branch.

## Core Entity Groups

### Access

- users
- roles
- permissions
- user_roles or user_permissions
- sessions or refresh_tokens, depending on final auth implementation

### Catalog

- categories
- brands
- products
- colors
- designs
- units

### Inventory

- batches
- rolls
- inventory_movements
- wastage_records
- remnant_records
- stock_adjustments
- roll_reconciliations

### Sales

- invoices
- invoice_items
- payments
- returns
- refunds

### Customers

- customers
- customer_ledger_entries
- customer_payments
- credit_limit_changes

### Purchases

- suppliers
- purchase_orders or purchase_invoices
- purchase_items
- supplier_ledger_entries
- supplier_payments

### Accounting

- expenses
- cash_transactions
- financial_adjustments
- journal_entries, if full double-entry is confirmed
- journal_entry_lines, if full double-entry is confirmed

### System

- settings
- audit_logs
- barcode_labels
- print_jobs, if needed later

## Roll Table Requirements

Each roll must store:

- id
- roll code
- barcode
- product id
- batch id
- supplier id if known
- purchase item id if created from purchase
- original length
- remaining length
- base unit
- purchase cost
- sale price
- status
- created by
- created at
- updated at

## Inventory Movement Requirements

Every inventory change must create a movement record.

Movement types may include:

- PURCHASE_IN
- SALE_OUT
- RETURN_IN
- WASTAGE_OUT
- SHRINKAGE_OUT
- ADJUSTMENT_IN
- ADJUSTMENT_OUT
- REMNANT_TRANSFER
- ROLL_RECONCILIATION

Each movement should include:

- roll id
- product id
- batch id
- quantity
- unit
- normalized quantity
- source type
- source id
- actor user id
- reason
- created at

## Decimal Rules

Use decimal columns for:

- roll length
- remaining length
- billed quantity
- actual cut quantity
- wastage quantity
- purchase price
- sale price
- discount
- tax
- invoice total
- payment amount
- ledger amount

Suggested precision should be documented before migration.

Example:

```text
measurements: Decimal(12, 4)
money: Decimal(12, 2) or Decimal(14, 2)
```

Pending confirmation:

```text
Final decimal precision must be confirmed before production migration.
```

## Prisma Rules

- Keep Prisma model names singular and PascalCase.
- Keep database table names snake_case if mapped through @@map.
- Use enums for stable statuses and types.
- Use relations clearly.
- Use indexes for lookup-heavy fields.
- Use migrations for schema changes.
- Do not manually edit production database schema without migration.

## Important Indexes

Add indexes for:

- barcode
- roll code
- product id
- batch id
- roll status
- customer phone
- supplier name or phone
- invoice number
- invoice date
- customer id
- created at
- movement source
- audit entity type and entity id

## Unique Constraints

Likely unique fields:

- roll barcode
- roll code
- invoice number
- user username or email

Pending confirmation:

```text
Whether customer phone must be globally unique is not confirmed.
```

## Soft Delete and Immutability

Use soft delete or status changes for records that have business history.

Do not hard delete:

- invoices
- invoice items
- payments
- ledger entries
- inventory movements
- wastage records
- reconciliations
- audit logs

## Transaction Rules

Use transactions for:

- purchase creation with rolls
- sale completion
- return processing
- payment posting
- customer ledger update
- supplier ledger update
- stock adjustment
- roll reconciliation
- invoice cancellation

## Future Multi-Branch Readiness

Multi-branch implementation is deferred.

Do not add complex branch logic in v1 unless confirmed.

However, avoid choices that make future branch support impossible.

Possible future fields:

- branch_id on inventory, sales, users, cash registers, and settings
- tenant_id only if SaaS/multi-company is confirmed later

## Pending Confirmation

Before final production schema, confirm:

- ID strategy
- invoice numbering format
- barcode format
- measurement decimal precision
- money decimal precision
- customer phone uniqueness
- tax/VAT/GST behavior
- full accounting model
- soft delete policy per table
- future branch table strategy
