# Multi-Tenant and Multi-Branch Strategy

## Purpose

This document explains how the database should stay future-ready for multi-branch or multi-company support while keeping v1 focused on a single shop.

## Status

Deferred.

Multi-branch implementation is not part of v1.

## Confirmed Direction

- Build single-shop first.
- Do not implement multi-branch workflows in v1.
- Do not let v1 design block future multi-branch support.
- Revisit this after the single-branch system is stable.

## v1 Scope

The first version should work as one shop instance with one operational business context.

In v1, the system should focus on:

- Authentication and roles
- Product catalog
- Roll-based inventory
- Barcode generation and scanning
- Retail POS
- Wholesale POS
- Customer credit ledger
- Supplier and purchase records
- Roll reconciliation
- Wastage tracking
- Reports
- Settings

## What Not to Build in v1

Do not build these until confirmed:

- Branch management screens
- Branch transfer workflows
- Branch-specific stock visibility
- Cross-branch reporting
- Super Admin operational workflows
- Tenant isolation layer
- Organization subscription layer
- Per-branch invoice series
- Per-branch cash register closing

## Future Multi-Branch Options

### Option 1: Single Database, Shared Tables, branch_id Columns

Each branch-owned table gets a `branch_id` column.

Example tables:

```text
rolls.branch_id
sale_invoices.branch_id
purchase_orders.branch_id
customer_ledger_entries.branch_id
inventory_movements.branch_id
```

Pros:

- Simpler deployment.
- Easier global reporting.
- Works well for one business with multiple branches.

Cons:

- Requires strict branch filtering in every query.
- Mistakes can leak data between branches.
- Some records may be global and some branch-specific.

### Option 2: Separate Database Per Tenant

Each company gets its own database.

Pros:

- Stronger isolation.
- Easier backup/restore per company.
- Lower risk of cross-company data leaks.

Cons:

- Harder deployment and migration management.
- Harder cross-company reporting.
- More operational overhead.

### Option 3: Hybrid

Single database per company, multiple branches inside that database.

Pros:

- Good fit for textile shops expanding from one branch to several.
- Keeps company-level data together.
- Allows branch-specific stock and reports.

Cons:

- Still requires careful branch-level permissions.
- Requires planned migration from v1.

Recommended future direction:

```text
Hybrid: one database per company, branch_id inside company-owned tables.
```

This is only a recommendation, not an accepted decision yet.

## Future Tables

If multi-branch is approved later, likely tables include:

```text
companies
branches
branch_users
branch_settings
stock_transfers
stock_transfer_items
branch_cash_registers
```

## Future branch_id Placement

Likely branch-owned tables:

```text
rolls
inventory_movements
stock_adjustments
wastage_entries
roll_reconciliations
sale_invoices
sale_payments
sale_returns
purchase_orders
customer_ledger_entries
supplier_ledger_entries
cash_register_sessions
expenses
```

Likely company/global tables:

```text
users
roles
permissions
categories
brands
products
units
unit_conversions
customers, pending confirmation
suppliers, pending confirmation
company_settings
feature_flags
```

Pending confirmation:

- Whether customers are shared across branches or branch-specific.
- Whether suppliers are shared across branches or branch-specific.
- Whether product pricing is global or branch-specific.

## How v1 Should Avoid Blocking Multi-Branch

### 1. Do Not Hardcode Shop Identity Everywhere

Use settings for company/shop information instead of hardcoding invoice headers, shop name, address, and phone.

### 2. Keep User Context Explicit

All write operations should know the actor user.

Future branch context can be added beside user context.

### 3. Keep Business Documents Structured

Invoices, purchases, ledgers, and movements should have clear ownership and references.

This makes it easier to add `branch_id` later.

### 4. Avoid Product-Level Stock Shortcuts

Do not rely on a single `products.stock_quantity` field as the source of truth.

Roll stock should remain the source of truth for fabric.

### 5. Use Service Layer Boundaries

NestJS services should query through domain methods. This makes it easier to add branch filters later.

### 6. Design Reports With Filters

Even in v1, report services should accept filter objects.

Example:

```ts
{
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  customerId?: string;
}
```

Later, `branchId` can be added without redesigning the method shape.

## Migration Path From v1 to Multi-Branch

When multi-branch is approved:

1. Add `companies` table.
2. Add `branches` table.
3. Create default company.
4. Create default branch.
5. Add nullable `branch_id` to branch-owned tables.
6. Backfill all records with default branch.
7. Make `branch_id` required where appropriate.
8. Update backend services to apply branch filters.
9. Update auth context to include allowed branch IDs.
10. Update reports to support branch filters.
11. Add stock transfer workflows.
12. Add branch-specific settings if needed.

## Security Requirements for Future Multi-Branch

If multi-branch is implemented later:

- Every branch-scoped query must filter by allowed branch.
- Users should only access assigned branches.
- Admin and Super Admin roles must be clearly separated.
- Reports must respect branch access.
- Audit logs must include branch context.
- Stock transfers must be fully traceable.

## Current Recommendation

For v1, do not add branch tables unless a real requirement appears before implementation.

Instead, write clean domain services and keep settings centralized so the database can be migrated later.

## Pending Confirmation

1. Whether multi-branch means one owner with many shops, or multiple independent companies.
2. Whether customers are shared across branches.
3. Whether suppliers are shared across branches.
4. Whether each branch needs separate invoice number series.
5. Whether stock transfer between branches will be supported.
6. Whether each branch has separate cashier closing and cash drawer.
