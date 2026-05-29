# Database Naming Conventions

## Purpose

This document defines naming rules for MySQL tables, Prisma models, fields, indexes, constraints, enums, and migrations.

Consistent naming matters because this system has many connected modules: inventory, rolls, batches, sales, customers, purchases, accounting, barcode, reports, settings, and audit logs.

## Status

Accepted for v1 unless changed by ADR.

## Core Rules

1. Database tables use `snake_case` plural names.
2. Prisma models use `PascalCase` singular names.
3. Prisma fields use `camelCase`.
4. Database columns use `snake_case` through Prisma `@map` when needed.
5. Enum values use `UPPER_SNAKE_CASE`.
6. All foreign keys end with `_id` at database level and `Id` in Prisma.
7. All timestamps use `created_at`, `updated_at`, and when needed `deleted_at`.

## Table Naming

| Domain | Table Name Examples |
|---|---|
| Access | users, roles, permissions, user_roles |
| Catalog | categories, brands, products, product_colors |
| Inventory | batches, rolls, inventory_movements, wastage_entries |
| Sales | sale_invoices, sale_invoice_items, sale_payments |
| Customers | customers, customer_ledger_entries |
| Purchases | suppliers, purchase_orders, purchase_items, purchase_rolls |
| Accounting | accounts, journal_entries, journal_entry_lines, expenses |
| Barcode | barcodes, print_jobs |
| Settings | company_settings, app_settings, feature_flags |
| Audit | audit_logs, activity_logs |

## Prisma Model Naming

| Database Table | Prisma Model |
|---|---|
| users | User |
| sale_invoices | SaleInvoice |
| sale_invoice_items | SaleInvoiceItem |
| customer_ledger_entries | CustomerLedgerEntry |
| inventory_movements | InventoryMovement |
| roll_reconciliations | RollReconciliation |

Example:

```prisma
model SaleInvoice {
  id          String   @id
  invoiceNo   String   @unique @map("invoice_no")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("sale_invoices")
}
```

## Field Naming

### ID Fields

| Meaning | Prisma Field | Database Column |
|---|---|---|
| Primary key | id | id |
| User foreign key | userId | user_id |
| Product foreign key | productId | product_id |
| Roll foreign key | rollId | roll_id |
| Customer foreign key | customerId | customer_id |

### Date and Time Fields

Use:

```text
created_at
updated_at
deleted_at
confirmed_at
cancelled_at
paid_at
received_at
retired_at
```

Avoid vague names:

```text
date
time
entry_date
record_time
```

Use domain-specific names only when they clarify the event:

```text
purchase_date
invoice_date
payment_date
reconciliation_date
```

## Enum Naming

Enum type names should be singular and descriptive.

```prisma
enum ProductType {
  FABRIC_ROLL
  CUT_PIECE
  FIXED_PRODUCT
}

enum RollStatus {
  AVAILABLE
  LOW_STOCK
  REMNANT
  FINISHED
  RETIRED
  DAMAGED
}

enum SaleType {
  RETAIL
  WHOLESALE
}
```

Do not use unclear enum values like:

```text
TYPE_1
ACTIVE_2
OTHER
```

Use `OTHER` only when there is a clear notes/reason field.

## Money and Measurement Fields

Use descriptive suffixes.

| Field Type | Naming Examples |
|---|---|
| Money total | subtotal, discount_total, tax_total, grand_total |
| Unit price | price_per_unit, purchase_price_per_unit |
| Fabric length | original_length, remaining_length, billed_quantity, actual_cut_quantity |
| Converted length | base_quantity |
| Ledger | debit, credit, balance_after |

Avoid ambiguous fields:

```text
amount1
qty
price1
value
```

`qty` may be used in code only for local variables, not database fields.

## Status Fields

Every major business document should have one clear status field.

Examples:

```text
users.status
products.status
rolls.status
sale_invoices.invoice_status
sale_invoices.payment_status
purchase_orders.status
```

Avoid multiple conflicting flags such as:

```text
is_active
is_cancelled
is_deleted
is_paid
```

Use flags only when the value is truly independent.

## Soft Delete Naming

Use `deleted_at` for soft deletion.

Do not use:

```text
is_deleted
removed
archived
```

Exceptions:

- Financial records should generally not be deleted.
- Inventory movement records should not be deleted.
- Audit records should not be deleted.

Use cancellation or reversal records instead.

## Index Naming

Use this format:

```text
idx_<table>_<column_or_purpose>
```

Examples:

```text
idx_rolls_barcode_value
idx_rolls_product_batch_status
idx_sale_invoices_created_at
idx_sale_invoice_items_roll_id
idx_customer_ledger_entries_customer_created
```

## Unique Constraint Naming

Use this format:

```text
uq_<table>_<column_or_purpose>
```

Examples:

```text
uq_users_email
uq_users_username
uq_rolls_roll_code
uq_rolls_barcode_value
uq_sale_invoices_invoice_no
```

## Foreign Key Naming

Use this format:

```text
fk_<child_table>_<parent_table>
```

Examples:

```text
fk_rolls_products
fk_rolls_batches
fk_sale_invoice_items_sale_invoices
fk_customer_ledger_entries_customers
```

Prisma may generate foreign key names automatically. If custom names are needed, follow this convention.

## Migration Naming

Use lowercase snake_case and describe the business change.

Examples:

```text
20260601090000_create_access_tables
20260601100000_create_product_catalog
20260601110000_create_roll_inventory
20260601120000_create_sales_invoices
20260601130000_create_customer_ledger
```

Do not use vague migration names:

```text
update_db
changes
new_tables
fix_schema
```

## Prisma Relation Naming

Use explicit relation names only when multiple relations exist between the same models.

Example:

```prisma
model SaleInvoice {
  createdById String @map("created_by_id")
  createdBy   User   @relation("SaleInvoiceCreatedBy", fields: [createdById], references: [id])
}
```

## JSON Field Naming

Use JSON fields only when the structure is flexible and not required for primary reporting.

Acceptable examples:

```text
metadata
before_snapshot
after_snapshot
printer_config
feature_config
```

Avoid using JSON for core searchable fields like:

```text
roll length
customer phone
invoice totals
payment status
batch number
```

## Reserved Words

Avoid MySQL reserved words as table or column names.

Do not use:

```text
order
group
user
key
value
status as a table name
```

Use:

```text
purchase_orders
sale_invoices
users
app_settings
```

## Pending Confirmation

1. Whether primary IDs should use Prisma `cuid()`, `uuid()`, or MySQL auto-increment.
2. Final invoice number pattern.
3. Final barcode value pattern.
4. Final product code pattern.
