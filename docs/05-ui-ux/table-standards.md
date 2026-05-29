# Table Standards

## Status

Draft v1.

Tables are central to this system because users need to inspect rolls, products, customers, invoices, payments, and reports quickly.

---

## Table Principles

Tables must be:

- searchable
- filterable
- readable
- permission-aware
- fast to scan
- clear about status and money
- safe for high-risk actions

---

## Standard Table Structure

Every major table should support:

- page title
- short description where helpful
- search
- filters
- primary action button
- table rows
- pagination
- empty state
- row actions

Example:

```text
Rolls
Search by roll code, barcode, product, or batch.
[Search] [Status filter] [Batch filter] [Add Roll]
Table
Pagination
```

---

## Column Alignment

Use consistent alignment.

| Data type | Alignment |
|---|---|
| Names | Left |
| Codes | Left |
| Status | Center or left |
| Measurements | Right |
| Money | Right |
| Dates | Left or center |
| Actions | Right |

Use tabular numbers for measurements and money.

---

## Inventory Roll Table

Recommended columns:

| Column | Notes |
|---|---|
| Roll Code | User-visible roll identifier |
| Barcode | Scannable identifier |
| Product | Product name/code |
| Batch / Dye Lot | Batch consistency visibility |
| Original Length | Starting roll length |
| Remaining Length | Current available length |
| Unit | Yard or meter display |
| Status | Active, Low Stock, Remnant, Finished |
| Last Movement | Last sale, adjustment, or reconciliation |
| Actions | View, adjust, print barcode, reconcile |

Actions must be permission-aware.

---

## Product Table

Recommended columns:

- product code
- product name
- category
- product type
- total active rolls
- total remaining length
- default unit
- status
- actions

Product-level totals must not replace roll-level stock details.

---

## Sales Table

Recommended columns:

- invoice number
- invoice type: retail or wholesale
- customer
- cashier/salesman
- total amount
- paid amount
- outstanding amount
- payment status
- date/time
- actions

Actions may include:

- view invoice
- print invoice
- record payment
- refund
- void invoice

Refund and void must require permission.

---

## Customer Ledger Table

Recommended columns:

- date
- reference
- type
- debit
- credit
- balance
- created by
- notes

Ledger tables must make running balance clear.

---

## Purchase Table

Recommended columns:

- purchase number
- supplier
- product/batch summary
- total rolls
- total length
- total cost
- payment status
- purchase date
- actions

Purchase detail should show individual roll lengths.

---

## Report Tables

Report tables should support:

- date range filters
- export where allowed
- grouping where useful
- totals row
- drill-down links

Examples:

- daily sales report
- current stock report
- wastage report
- remnant report
- customer outstanding report

---

## Row Actions

Use a compact action menu when there are many actions.

Common row actions:

- View
- Edit
- Print
- Download
- Reconcile
- Record Payment
- View History

High-risk actions should be separated visually.

Examples:

- Void
- Delete
- Override
- Retire

---

## Filtering Rules

Filters should match real business questions.

Inventory filters:

- product
- category
- batch
- supplier
- status
- low stock
- remnant
- date received

Sales filters:

- date range
- invoice type
- payment status
- customer
- cashier

Customer filters:

- customer type
- credit status
- outstanding balance

---

## Empty State Examples

```text
No rolls found
Try changing filters or add rolls from purchase entry.
```

```text
No credit customers found
Create a customer first, then enable credit settings where allowed.
```

---

## Pending Confirmation

The following are not finalized:

- default page size
- export formats
- exact column visibility per role
- saved filters
- advanced table customization
- whether bulk actions are allowed in v1
