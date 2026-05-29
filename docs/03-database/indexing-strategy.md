# Indexing Strategy

## Purpose

This document defines how indexes should be planned for MySQL and Prisma.

The goal is to support fast POS scanning, inventory lookup, customer ledger lookup, reporting, and audit search without over-indexing the database.

## Status

Accepted as an initial strategy. Exact index names and SQL may be adjusted during implementation based on query plans.

## Performance Goals

The database should support:

- Fast barcode lookup during POS.
- Fast roll selection by product, batch, and status.
- Fast invoice listing by date and customer.
- Fast customer ledger history.
- Fast inventory movement tracing.
- Report queries for daily sales, stock, wastage, and credit outstanding.

## Indexing Principles

1. Index columns used in frequent filters.
2. Index foreign keys used in joins.
3. Use composite indexes for real query patterns.
4. Avoid indexing every column.
5. Prefer unique indexes for business identifiers like barcode and invoice number.
6. Review indexes with `EXPLAIN` before optimizing blindly.
7. Add indexes through migrations only.

## High-Priority Lookup Paths

### Barcode Scan

A barcode scan should find a roll or product quickly.

Required indexes:

```text
rolls.barcode_value unique
products.product_code unique or indexed
barcodes.barcode_value unique
```

Recommended:

```text
idx_rolls_barcode_value
idx_products_product_code
idx_barcodes_value_type
```

### Roll Selection in POS

Common query:

```text
Find available rolls for selected product and batch.
```

Recommended composite index:

```text
idx_rolls_product_batch_status
(product_id, batch_id, status)
```

If the UI often lists all available rolls for a product regardless of batch:

```text
idx_rolls_product_status
(product_id, status)
```

### Inventory Movement Trace

Common query:

```text
Show all movements for a roll in chronological order.
```

Recommended index:

```text
idx_inventory_movements_roll_created
(roll_id, created_at)
```

For product-level reports:

```text
idx_inventory_movements_product_created
(product_id, created_at)
```

### Sales Reports

Common query:

```text
Daily sales, monthly sales, customer invoice history.
```

Recommended indexes:

```text
idx_sale_invoices_created_at
idx_sale_invoices_customer_created
idx_sale_invoices_sale_type_created
idx_sale_invoice_items_product_created
idx_sale_invoice_items_roll_id
```

For invoice number lookup:

```text
uq_sale_invoices_invoice_no
```

### Customer Search

Common query:

```text
Search by phone, name, customer type, or credit balance.
```

Recommended indexes:

```text
idx_customers_phone
idx_customers_customer_type
idx_customers_name
```

Phone should be unique only if the business confirms one customer per phone number.

Pending confirmation:

- Whether customer phone must be unique.

### Customer Ledger

Common query:

```text
Show customer ledger history and current outstanding balance.
```

Recommended indexes:

```text
idx_customer_ledger_entries_customer_created
(customer_id, created_at)

idx_customer_ledger_entries_reference
(reference_type, reference_id)
```

### Purchase and Supplier Reports

Recommended indexes:

```text
idx_purchase_orders_supplier_created
idx_purchase_items_product_batch
idx_purchase_rolls_roll_id
idx_supplier_ledger_entries_supplier_created
```

### Wastage and Reconciliation Reports

Recommended indexes:

```text
idx_wastage_entries_roll_created
idx_wastage_entries_user_created
idx_wastage_entries_reason_created
idx_roll_reconciliations_roll_created
idx_roll_reconciliations_user_created
```

### Audit Logs

Recommended indexes:

```text
idx_audit_logs_actor_created
idx_audit_logs_entity
idx_audit_logs_action_created
idx_activity_logs_user_created
```

## Suggested Index List by Table

### users

```text
uq_users_email
uq_users_username
idx_users_status
```

### products

```text
uq_products_product_code
idx_products_category_status
idx_products_type_status
idx_products_name
```

### batches

```text
idx_batches_product_id
idx_batches_product_batch_no
idx_batches_supplier_id
idx_batches_dye_lot_no
```

Possible unique constraint, pending confirmation:

```text
uq_batches_product_batch_no
(product_id, batch_no)
```

### rolls

```text
uq_rolls_roll_code
uq_rolls_barcode_value
idx_rolls_product_batch_status
idx_rolls_product_status
idx_rolls_supplier_id
idx_rolls_remaining_length
idx_rolls_purchase_date
```

### inventory_movements

```text
idx_inventory_movements_roll_created
idx_inventory_movements_product_created
idx_inventory_movements_type_created
idx_inventory_movements_reference
idx_inventory_movements_user_created
```

### sale_invoices

```text
uq_sale_invoices_invoice_no
idx_sale_invoices_created_at
idx_sale_invoices_customer_created
idx_sale_invoices_status_created
idx_sale_invoices_payment_status
idx_sale_invoices_sale_type_created
```

### sale_invoice_items

```text
idx_sale_invoice_items_invoice_id
idx_sale_invoice_items_product_id
idx_sale_invoice_items_roll_id
idx_sale_invoice_items_batch_id
```

### customers

```text
idx_customers_phone
idx_customers_name
idx_customers_customer_type
idx_customers_status
```

### customer_ledger_entries

```text
idx_customer_ledger_entries_customer_created
idx_customer_ledger_entries_reference
idx_customer_ledger_entries_type_created
```

### suppliers

```text
idx_suppliers_phone
idx_suppliers_name
idx_suppliers_status
```

### accounting tables

```text
idx_journal_entries_posted_at
idx_journal_entries_status
idx_journal_entry_lines_account_created
idx_expenses_expense_date
idx_expenses_category_id
```

## Composite Index Design Rules

Column order matters.

Use the most common equality filters first, then range/sort columns.

Good:

```text
(customer_id, created_at)
(product_id, batch_id, status)
(roll_id, created_at)
```

Less useful:

```text
(created_at, customer_id)
(status, created_at, product_id)
```

unless the actual query starts with those filters.

## Prisma Index Example

```prisma
model Roll {
  id             String @id
  productId      String @map("product_id")
  batchId        String @map("batch_id")
  status         RollStatus
  barcodeValue   String @unique @map("barcode_value")

  @@index([productId, batchId, status], map: "idx_rolls_product_batch_status")
  @@index([productId, status], map: "idx_rolls_product_status")
  @@map("rolls")
}
```

## Reporting Indexes

Reports should first use normalized transactional tables. Summary tables or materialized-style tables should be considered later only if reports become slow.

Possible future reporting tables:

```text
daily_sales_summaries
daily_inventory_summaries
daily_wastage_summaries
customer_balance_snapshots
```

Do not introduce summary tables in v1 unless needed.

## Avoid These Indexing Mistakes

1. Indexing every column.
2. Creating duplicate indexes that start with the same columns.
3. Adding indexes before knowing query patterns.
4. Using leading wildcard searches on indexed text fields.
5. Using JSON fields for values that need frequent filtering.
6. Forgetting indexes on foreign keys used in joins.

## Full Text Search

For v1, basic search can use indexed fields like product code, barcode, name, phone, and invoice number.

Full text search is deferred unless product search becomes slow or complex.

## Review Checklist

Before adding an index:

- Which screen or report needs it?
- What exact query does it support?
- Does a similar index already exist?
- Is it worth the write overhead?
- Has it been tested with realistic data?
- Does it belong in Prisma migration?

## Pending Confirmation

1. Whether customer phone is unique.
2. Whether product code is globally unique or category-scoped.
3. Whether barcode table is required from v1 or barcode is stored directly on product/roll only.
4. Expected data volume for first shop.
