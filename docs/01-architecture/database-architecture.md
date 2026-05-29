# Database Architecture

## Purpose

This document defines the database architecture for the Textile ERP & POS System.

The database must accurately represent textile business reality: products are important, but fabric inventory is controlled at roll level. Sales, purchases, wastage, remnants, and ledger entries must be traceable and transaction-safe.

---

## Database Choice

Use MySQL 8 or a compatible SQL database for v1.

Reasons:

- Strong relational consistency.
- Transaction support.
- Row-level locking for roll deduction.
- Good indexing for POS lookup.
- Familiar hosting and backup options.
- Suitable for single-shop deployment.

---

## Core Database Principles

1. Roll is the main inventory unit for fabric.
2. Product-level stock is a calculated summary.
3. Inventory must never become negative unless explicitly authorized.
4. Every stock change must create a stock movement record.
5. Financial and ledger records must be append-only where possible.
6. Critical changes must be audit logged.
7. Decimal values must be used for length and money.
8. Reports should read from transactional records or summary views.

---

## Naming Conventions

Use snake_case for database names.

Examples:

```text
products
product_batches
rolls
stock_movements
sale_invoices
sale_invoice_lines
customer_ledger_entries
```

Primary key:

```text
id
```

Foreign keys:

```text
product_id
batch_id
roll_id
customer_id
created_by_user_id
```

Timestamps:

```text
created_at
updated_at
posted_at
voided_at
```

---

## ID Strategy

Recommended:

- Use UUID/ULID for public-facing IDs.
- Use auto-increment internal IDs only if preferred for simplicity.
- Keep human-readable document numbers separately.

Examples:

```text
invoice_no: INV-2026-000001
roll_code: R-1001
purchase_no: PUR-2026-000001
```

Do not expose database implementation details through business document numbers.

---

## Decimal and Unit Strategy

### Length

Use decimal columns.

Recommended:

```sql
DECIMAL(12, 4)
```

Store fabric length internally in a base unit.

Recommended base unit:

```text
YARD
```

Store entered unit separately when needed:

```text
entered_quantity
entered_unit
base_quantity_yard
```

### Money

Use decimal columns.

Recommended:

```sql
DECIMAL(14, 2)
```

Never use floating-point types for money.

---

## Core Entity Groups

### Identity and Access

- users
- roles
- permissions
- role_permissions
- user_roles
- user_sessions

### Product Catalog

- categories
- brands
- products
- product_colors
- product_designs
- units
- product_batches

### Roll Inventory

- rolls
- roll_barcodes
- stock_movements
- inventory_adjustments
- remnants
- wastage_records
- roll_reconciliations

### Sales

- sale_invoices
- sale_invoice_lines
- sale_payments
- sale_returns
- sale_return_lines

### Customers and Ledger

- customers
- customer_ledger_entries
- customer_payments

### Purchases and Suppliers

- suppliers
- purchase_invoices
- purchase_invoice_lines
- purchase_rolls
- supplier_ledger_entries
- supplier_payments

### System and Reporting

- settings
- audit_logs
- idempotency_keys
- report_exports

---

## Suggested Core Tables

### products

Stores sellable items.

Important fields:

```text
id
category_id
brand_id
name
code
product_type
base_unit
default_sale_price
is_active
created_at
updated_at
```

Product types:

```text
FABRIC_ROLL
CUT_PIECE
FIXED_PRODUCT
```

---

### product_batches

Stores dye lot and batch information.

Important fields:

```text
id
product_id
batch_no
supplier_batch_no
dye_lot
color_id
purchase_date
supplier_id
notes
created_at
updated_at
```

Unique recommendation:

```text
product_id + batch_no + dye_lot
```

---

### rolls

Stores individual fabric rolls.

Important fields:

```text
id
roll_code
barcode
product_id
batch_id
supplier_id
purchase_invoice_id
original_length_yard
remaining_length_yard
purchase_price_per_yard
sale_price_per_yard
status
is_remnant
created_at
updated_at
finished_at
```

Roll status values:

```text
AVAILABLE
RESERVED
LOW_REMAINING
REMNANT
FINISHED
DAMAGED
ARCHIVED
```

Important constraints:

```text
remaining_length_yard >= 0
barcode unique
roll_code unique
```

---

### stock_movements

Stores every inventory movement.

Important fields:

```text
id
movement_type
product_id
batch_id
roll_id
quantity_yard
quantity_unit
direction
reference_type
reference_id
reason
created_by_user_id
created_at
```

Movement types:

```text
PURCHASE_IN
SALE_OUT
RETURN_IN
WASTAGE_OUT
SHRINKAGE_OUT
ADJUSTMENT_IN
ADJUSTMENT_OUT
REMNANT_CREATED
ROLL_FINISHED
```

Direction:

```text
IN
OUT
NEUTRAL
```

Rules:

- Every sale deduction creates a stock movement.
- Every reconciliation difference creates a stock movement.
- Manual stock changes must create adjustment movement.

---

### sale_invoices

Stores invoice header.

Important fields:

```text
id
invoice_no
sale_type
customer_id
cashier_user_id
subtotal_amount
discount_amount
tax_amount
total_amount
paid_amount
credit_amount
status
posted_at
created_at
updated_at
voided_at
voided_by_user_id
void_reason
```

Sale type:

```text
RETAIL
WHOLESALE
```

Status:

```text
DRAFT
POSTED
PARTIALLY_PAID
PAID
VOIDED
RETURNED
```

---

### sale_invoice_lines

Stores invoice items.

Important fields:

```text
id
sale_invoice_id
product_id
batch_id
roll_id
line_type
billed_quantity
billed_unit
billed_quantity_yard
actual_cut_quantity
actual_cut_unit
actual_cut_quantity_yard
wastage_quantity_yard
unit_price
discount_amount
line_total
created_at
```

Rules:

- For fabric roll items, roll_id is required.
- Actual cut defaults to billed quantity.
- Inventory deduction uses actual_cut_quantity_yard.
- Wastage is actual_cut_quantity_yard minus billed_quantity_yard when positive.

---

### wastage_records

Stores over-cutting and fabric loss.

Important fields:

```text
id
roll_id
product_id
batch_id
sale_invoice_id
sale_invoice_line_id
wastage_quantity_yard
reason
responsible_user_id
created_by_user_id
created_at
```

Rules:

- Must reference roll.
- Must store responsible user where known.
- Must be reportable user-wise.

---

### roll_reconciliations

Stores formal roll closing/reconciliation.

Important fields:

```text
id
roll_id
system_remaining_yard
physical_remaining_yard
difference_yard
result_type
reason
created_by_user_id
approved_by_user_id
created_at
```

Result types:

```text
MATCHED
SHRINKAGE
EXCESS_FOUND
REMNANT_CREATED
FINISHED_WITH_LOSS
```

---

### remnants

Stores leftover pieces.

Important fields:

```text
id
source_roll_id
product_id
batch_id
length_yard
barcode
sale_price_per_yard
status
created_from
created_at
sold_at
```

Status:

```text
AVAILABLE
SOLD
DAMAGED
ARCHIVED
```

---

### customers

Stores customer profile.

Important fields:

```text
id
name
phone
address
customer_type
credit_limit
current_balance
is_active
created_at
updated_at
```

Customer type:

```text
RETAIL
WHOLESALE
CREDIT
```

Current balance may be cached, but it must be reconcilable from ledger entries.

---

### customer_ledger_entries

Stores customer financial history.

Important fields:

```text
id
customer_id
entry_type
direction
amount
reference_type
reference_id
description
created_by_user_id
posted_at
created_at
```

Entry types:

```text
SALE_CREDIT
PAYMENT_RECEIVED
RETURN_ADJUSTMENT
MANUAL_ADJUSTMENT
OPENING_BALANCE
```

Rules:

- Ledger entries should be append-only.
- Corrections should create adjustment entries.

---

### audit_logs

Stores sensitive action history.

Important fields:

```text
id
user_id
action
entity_type
entity_id
previous_values_json
new_values_json
reason
ip_address
user_agent
created_at
```

---

### idempotency_keys

Stores safe retry records.

Important fields:

```text
id
idempotency_key
user_id
endpoint
request_hash
response_json
status
created_at
expires_at
```

Use for sale creation and payment posting.

---

## Indexing Strategy

### POS-Critical Indexes

```text
rolls.barcode
rolls.roll_code
rolls.product_id
rolls.batch_id
rolls.status
products.code
products.name
customers.phone
```

### Reporting Indexes

```text
sale_invoices.posted_at
sale_invoices.sale_type
sale_invoices.customer_id
stock_movements.created_at
stock_movements.roll_id
stock_movements.movement_type
customer_ledger_entries.customer_id
customer_ledger_entries.posted_at
wastage_records.created_at
wastage_records.responsible_user_id
```

---

## Transaction and Locking Strategy

When selling from a roll:

1. Start transaction.
2. Select roll by ID using row lock.
3. Validate status and remaining length.
4. Update remaining length.
5. Insert sale line.
6. Insert stock movement.
7. Insert wastage record if needed.
8. Commit transaction.

Conceptual SQL:

```sql
SELECT id, remaining_length_yard, status
FROM rolls
WHERE id = ?
FOR UPDATE;
```

---

## Soft Delete Strategy

For business records, prefer status changes over hard deletes.

Use:

```text
is_active
status
archived_at
voided_at
```

Do not hard-delete invoices, ledger entries, stock movements, or audit logs.

---

## Backup Strategy

Minimum v1 backup expectations:

- Daily database backup.
- Backup before migration.
- Store backups outside the application container.
- Periodically test restore.

---

## Future Multi-Branch Readiness

Do not implement full multi-branch in v1.

Future fields that may be added later:

```text
branch_id
company_id
source_branch_id
destination_branch_id
```

Avoid database designs that assume only one shop forever in a way that blocks future migration.

---

## Non-Negotiable Database Rules

1. Roll records are required for fabric inventory.
2. Remaining length must be stored per roll.
3. Stock movement records are mandatory for inventory changes.
4. Ledger entries must be traceable and append-only.
5. Money and length values must use decimal types.
6. Barcode values must be unique.
7. Critical business records must not be hard-deleted.
8. Row locking must protect roll deduction.
