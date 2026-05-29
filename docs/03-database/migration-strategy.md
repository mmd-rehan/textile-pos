# Migration Strategy

## Purpose

This document defines how database changes should be created, reviewed, tested, and deployed for the Textile ERP & POS System.

The system handles sensitive business data: inventory, roll movements, invoices, customer credit, supplier payables, accounting, and audit logs. Database changes must therefore be controlled and reversible where possible.

## Status

Accepted for v1.

## Technology

- Database: MySQL
- ORM and migration tool: Prisma Migrate
- Schema source of truth: `backend/prisma/schema.prisma`
- Migration folder: `backend/prisma/migrations/`

## Migration Principles

1. Never change production schema manually.
2. Every schema change must go through a Prisma migration.
3. Migrations must be committed to version control.
4. Destructive changes require extra review.
5. Inventory, ledger, invoice, and audit tables should be treated as high-risk.
6. Data corrections should be explicit and traceable.
7. Rollback must be planned before deployment.

## Environment Flow

```text
Local Development
  -> Review Migration SQL
  -> Test Database
  -> Staging Database
  -> Production Database
```

## Local Development Flow

1. Update `schema.prisma`.
2. Generate migration locally.
3. Review generated SQL.
4. Run application tests.
5. Seed test data if needed.
6. Commit schema and migration files together.

Recommended commands:

```bash
npx prisma migrate dev --name create_roll_inventory
npx prisma generate
npx prisma studio
```

## Production Deployment Flow

Use deploy mode only.

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not run this in production:

```bash
npx prisma migrate dev
npx prisma db push
```

`db push` is allowed only for quick local experiments, not for shared environments.

## Migration Types

### 1. Safe Additive Migration

Examples:

- Add new nullable column.
- Add new table.
- Add non-unique index.
- Add enum value when compatible.

These are usually safe.

### 2. Backfill Migration

Examples:

- Add `base_quantity` to sale lines and populate it from existing quantity fields.
- Add `balance_after` to ledger entries and compute running balances.

Backfills must be tested with realistic data volume.

### 3. Constraint Migration

Examples:

- Make a nullable column required.
- Add unique constraint.
- Add foreign key constraint.

Constraint migrations require pre-check queries before deployment.

### 4. Destructive Migration

Examples:

- Drop column.
- Rename column.
- Change decimal precision.
- Delete table.

Avoid destructive migrations in production. Use expand-contract strategy.

## Expand-Contract Strategy

Use this for risky changes.

### Step 1: Expand

Add the new field or table without removing the old one.

```text
Add rolls.base_remaining_length
Keep rolls.remaining_length
```

### Step 2: Write Both

Update application code to write both old and new structures.

### Step 3: Backfill

Backfill historical records.

### Step 4: Read New

Update application code to read from the new structure.

### Step 5: Contract

Remove old structure only after verification.

## High-Risk Tables

Changes to these tables require extra review:

```text
rolls
inventory_movements
wastage_entries
roll_reconciliations
sale_invoices
sale_invoice_items
sale_payments
customer_ledger_entries
supplier_ledger_entries
journal_entries
journal_entry_lines
audit_logs
```

## Data Safety Rules

### Inventory Data

Never directly update `rolls.remaining_length` without creating a matching `inventory_movements` record.

### Sales Data

Never silently edit confirmed invoice totals.

Corrections should use:

- cancellation
- return
- refund
- adjustment
- reversal entry

### Ledger Data

Ledger balances should be auditable. If a ledger correction is needed, create an adjustment entry rather than editing old entries silently.

### Accounting Data

Journal entries should be immutable after posting. Corrections should create reversing or adjustment entries.

## Seed Data Strategy

Maintain seed files for baseline setup:

```text
roles
permissions
units
unit_conversions
company_settings
feature_flags
```

Recommended command:

```bash
npx prisma db seed
```

Seed data should be idempotent. Running the seed multiple times should not create duplicates.

## Rollback Strategy

Prisma does not automatically generate down migrations in the same way some migration tools do. For every production migration, document rollback steps in the pull request or release note.

Rollback types:

| Migration Type | Rollback Approach |
|---|---|
| Add table | Usually safe to leave unused or drop manually after review |
| Add nullable column | Usually safe to leave unused |
| Add index | Can drop index if it causes performance issue |
| Add required column | Requires planned rollback SQL |
| Data backfill | Requires backup and manual correction plan |
| Destructive change | Must have backup and restore plan |

## Backup Rule Before Production Migration

Before running production migrations:

1. Take database backup.
2. Confirm backup restore process is known.
3. Confirm application version and migration version are compatible.
4. Run migration during a low-traffic period where possible.

## Migration Review Checklist

Before approving a migration:

- Does it match the domain rule?
- Does it preserve roll-level inventory traceability?
- Does it avoid silent financial edits?
- Does it avoid negative inventory risk?
- Does it include required indexes?
- Does it preserve existing data?
- Does it have a rollback note?
- Does it update Prisma types?
- Does it update related API and test docs?

## Naming Migration Files

Use business meaning:

```bash
npx prisma migrate dev --name create_roll_inventory_tables
npx prisma migrate dev --name add_actual_cut_to_sale_items
npx prisma migrate dev --name create_customer_ledger_entries
```

Avoid unclear names:

```bash
npx prisma migrate dev --name fix
npx prisma migrate dev --name update
npx prisma migrate dev --name changes
```

## Pending Confirmation

1. Production hosting and deployment method.
2. Whether staging database will exist from the beginning.
3. Backup provider and backup schedule.
4. Whether accounting tables are included in v1 migration or phased later.
