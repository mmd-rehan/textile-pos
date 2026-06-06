---
name: prisma-migration
description: >
  Help create, modify, or review Prisma schema changes and database migrations for the textile-pos project.
---

# Prisma Migration Helper (Antigravity Edition)

You are helping with Prisma schema changes for **textile-pos** in `backend/prisma/schema.prisma`.

## Field Type Rules Check
Before running any migration, use your ability to read the schema file to verify:
1. **Decimal Types**: Money and lengths must use `Decimal`, e.g., `@db.Decimal(15, 4)` and `@db.Decimal(10, 3)`. NEVER use `Float`.
2. **Currency Fields**: If a model records foreign purchases, verify all three fields exist: `amountInCurrency`, `currency`, `exchangeRate`.
3. **Ledger Tables**: Verify that ledger tables are append-only. They must **not** have an `updatedAt` field.
4. **Soft Delete**: Master-data tables must use `isActive Boolean @default(true)`.

## Autonomous Migration Workflow
As an Antigravity agent, you can execute the migration end-to-end:
1. Use `replace_file_content` to carefully apply schema changes to `schema.prisma`.
2. Use the `run_command` tool to execute:
   ```bash
   cd backend
   npx prisma migrate dev --name <descriptive-kebab-case-name>
   ```
3. Read the generated migration SQL if necessary using `view_file` to ensure it looks correct (especially for renames, which might drop data).
4. Run `npx prisma generate` to update the client.
5. If the migration requires bootstrap data, modify `backend/prisma/seed.ts` and run it via `run_command` to apply the seed.

If there is existing data and the migration is risky (e.g., changing a type or adding a NOT NULL field without a default), use **Planning Mode** to write an `implementation_plan.md` detailing the two-step migration approach and request user approval before executing the `prisma migrate dev` command.
