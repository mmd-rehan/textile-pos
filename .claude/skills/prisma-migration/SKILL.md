---
name: prisma-migration
description: >
  Help create, modify, or review Prisma schema changes and database migrations for the
  textile-pos project. Use this skill whenever a developer needs to: add a new model, add
  fields to an existing model, create an enum, change a relation, run a migration, fix a
  failed migration, or asks "how do I update the schema for X?". Also trigger when someone
  says "I need a new table", "add a column", "update the database", or shows you a Prisma
  schema file and asks for help.
---

# Prisma Migration Helper

You are helping with Prisma schema changes for **textile-pos**. The schema lives at:

```
backend/prisma/schema.prisma
```

Migrations are generated and applied with:

```bash
cd backend
npx prisma migrate dev --name <descriptive-kebab-case-name>
```

Always re-read `CLAUDE.md` at the repo root — the field-type rules there (Decimal, currency
codes, append-only ledgers) are authoritative and override any general Prisma convention.

---

## Before touching the schema

Answer these questions first (ask the developer if unclear):

1. **What new data needs to be stored?** Name the entities and their key attributes.
2. **Is this additive or breaking?** Adding nullable fields or new tables = safe. Dropping
   columns or changing types = risky, needs a plan.
3. **Does production already have data?** If yes, the migration must be non-destructive or
   include a data migration step.
4. **Does this model hold money or fabric lengths?** If yes, use `Decimal`, not `Float` or `Int`.
5. **Does this model involve purchase amounts in foreign currencies?** If yes, add the three
   required fields together (see Currency rules below).

---

## Field type rules

### Money and lengths — always `Decimal`

```prisma
// Correct
unitPrice     Decimal  @db.Decimal(15, 4)
lengthYards   Decimal  @db.Decimal(10, 3)

// Wrong
unitPrice     Float
lengthYards   Float
```

Use `@db.Decimal(precision, scale)` explicitly. For money: `(15, 4)`. For lengths: `(10, 3)`.

### Currency fields — three fields together

Any model that records a purchase amount in a non-base currency must include all three:

```prisma
amountInCurrency  Decimal   @db.Decimal(15, 4)
currency          String    @db.VarChar(3)   // ISO code: PKR, AED, USD
exchangeRate      Decimal   @db.Decimal(15, 6)
// Plus the converted base-currency amount for reporting:
amountBase        Decimal   @db.Decimal(15, 4)
```

Never store currency as an enum — use string codes so new currencies can be added without a
migration.

### Ledger tables — append-only

Ledger models must **not** have an `updatedAt` field (its presence implies records are modified).
Instead, every state change creates a new row.

```prisma
model CustomerLedger {
  id           Int             @id @default(autoincrement())
  customerId   Int
  type         LedgerEntryType
  amount       Decimal         @db.Decimal(15, 4)
  balanceAfter Decimal         @db.Decimal(15, 4)
  createdAt    DateTime        @default(now())
  // No updatedAt
}
```

### Soft-delete pattern

Use `isActive Boolean @default(true)` for master-data tables (colors, brands, categories, etc.)
rather than hard deletion. This preserves referential integrity and historical records.

---

## Common patterns

### Adding a new model

1. Write the model in `schema.prisma`.
2. Add relations on both sides (Prisma requires both `@relation` sides).
3. Run `npx prisma migrate dev --name add-<model-name>`.
4. Update the seed file if the table needs bootstrap data.
5. The new model is available immediately via `this.prisma.<modelName>` in any service.

### Adding a nullable column to an existing table

Nullable columns are safe on any database with existing data:

```prisma
newField  String?   // nullable = safe migration
```

Run `npx prisma migrate dev --name add-<field>-to-<model>`.

### Adding a NOT NULL column with existing data

Provide a default, or use a two-step migration:

**Step 1** — add as nullable, migrate:
```prisma
newField  String?
```

**Step 2** — backfill data, then make it non-nullable, migrate again:
```prisma
newField  String
```

Or use `@default(...)` if a sensible default exists.

### Renaming a column

Prisma treats rename as drop+add, which loses data. Use a raw SQL migration instead:

```sql
-- In the migration file, replace the generated SQL with:
ALTER TABLE `ModelName` RENAME COLUMN `oldName` TO `newName`;
```

Then run `npx prisma migrate resolve --applied <migration-name>` if you edited the file manually.

### Adding an index

```prisma
@@index([supplierId, createdAt])
@@unique([invoiceNumber])
```

---

## Migration workflow

```bash
# 1. Edit schema.prisma

# 2. Generate and apply (dev only)
cd backend
npx prisma migrate dev --name descriptive-name

# 3. Regenerate the Prisma client
npx prisma generate

# 4. Check the generated migration SQL
cat prisma/migrations/<timestamp>_descriptive-name/migration.sql

# 5. Restart the backend so the new client is loaded
npm run dev
```

For production deploys, use:
```bash
npx prisma migrate deploy
```
This applies pending migrations without creating new ones.

---

## Checklist before committing a migration

- [ ] All money/length fields use `Decimal`, not `Float`
- [ ] Currency fields include all three: `amountInCurrency`, `currency`, `exchangeRate`
- [ ] Ledger models have no `updatedAt`
- [ ] Master-data models have `isActive Boolean @default(true)`
- [ ] NOT NULL columns on existing tables have a `@default(...)` or a two-step plan
- [ ] The generated `migration.sql` has been read and makes sense
- [ ] `prisma generate` was run after schema changes
- [ ] Seed file updated if new bootstrap data is needed
- [ ] New model/fields are referenced in the relevant service — no orphan schema additions
