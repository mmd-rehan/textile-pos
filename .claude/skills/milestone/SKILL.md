---
name: milestone
description: >
  Guide end-to-end implementation of a new feature milestone for the textile-pos system.
  Use this skill whenever a developer says "implement milestone X", "build the Y feature",
  "add Z to the system", or describes a new functional requirement that spans backend and
  frontend. This skill ensures the work follows the project's layered architecture, rule set,
  and delivery format. Always use this skill for any multi-file feature implementation.
---

# Milestone Implementation Guide

You are implementing a feature milestone for **textile-pos** — a single-shop Textile ERP & POS.

Always re-read `CLAUDE.md` at the repo root before starting. The rules there are authoritative.
This skill is a checklist and thinking guide, not a replacement for those rules.

---

## Phase 0 — Understand the milestone

Before touching any file, answer these questions (ask the developer if unclear):

1. **Domain** — which Prisma models are involved? Do any need to be created or extended?
2. **Inventory impact** — does this feature add, remove, or transfer stock?
3. **Ledger impact** — does it create customer or supplier ledger entries?
4. **Currencies** — does it involve purchases (multi-currency) or sales (base currency only)?
5. **Product types** — does behaviour differ between `FABRIC_ROLL`, `FIXED_PRODUCT`, `CUT_PIECE`?
6. **Permissions** — what roles should access this feature?
7. **Scope fence** — confirm this is v1. Do not implement: multi-branch, offline sync, mobile,
   RFID, AI forecasting, native printer drivers, multi-currency sales, or advanced FX accounting.

---

## Phase 1 — Schema & migrations

1. Open `backend/prisma/schema.prisma`.
2. Add or extend models. Use `Decimal` for all money and fabric-length fields — never `Float`.
3. Store currency as a string code (`PKR`, `AED`, `USD`, …), never an enum.
4. For purchases that differ from base currency, add three fields together:
   - `amountInCurrency Decimal` — original amount
   - `currency String` — currency code
   - `exchangeRate Decimal` — rate used at time of transaction
5. Ledger tables must have no `update` or `delete` in services — append-only.
6. Run `npx prisma migrate dev --name <descriptive-name>` to generate the migration.
7. Update the Prisma seed if new master data or permissions are needed.

Use the `prisma-migration` skill if you need detailed guidance on schema changes.

---

## Phase 2 — Backend (NestJS)

Follow the **thin-controller / rich-service** pattern throughout.

### Service responsibilities
- All business logic, validation, and Prisma calls live here.
- Wrap any write touching multiple tables in `prisma.$transaction(async (tx) => { ... })`.
- After each critical write, call `AuditService.log(...)`.
- Stock changes must go through `InventoryService.createMovement(...)`, never raw inserts.
- If actual cut > billed quantity, create a `WastageEntry`.
- Ledger entries are inserted, never updated.

### Controller responsibilities
- HTTP routing, auth guards, permission decorators, and calling the service. Nothing else.
- Use `@CurrentUser()` to pass the acting user's id to the service.

### DTO layer
- All money and length inputs: `string` type with `@IsString()` — convert to `Decimal` in the
  service.
- Boolean filters, pagination (`page`, `limit`), and search strings: standard `class-validator`.

Use the `nestjs-module` skill if you're adding a brand-new module.

---

## Phase 3 — Frontend (Vite + React + TypeScript + Tailwind)

The frontend **previews** values; the backend is the source of truth.

- Fetch data via REST calls to the backend API (port 5001 in dev).
- Never compute final inventory, ledger, or financial totals in the frontend — display what the
  API returns.
- For money inputs, use controlled string inputs (not `<input type="number">`), to avoid
  floating-point issues in the UI.
- Product-type-aware forms: show roll-length fields only for `FABRIC_ROLL` products; show
  quantity fields for `FIXED_PRODUCT` and `CUT_PIECE`.
- POS search must handle products with and without rolls.
- Dropdowns for master data (color, design, brand, category, batch, unit) must load from the
  API — never hardcoded values.
- Permissions: hide or disable UI elements the current user's role cannot access.

---

## Phase 4 — Testing the milestone

Describe how to manually verify the feature using the app:

1. Start services: `docker compose up -d` (MySQL), then `npm run dev` in `/backend` and
   `/frontend`.
2. Log in as admin (admin / Admin@123) for setup; use cashier/sales roles to test permissions.
3. Walk through the happy path step by step.
4. Test edge cases: zero quantities, max values, currency mismatch, permission denial.
5. Check the audit log table for expected entries.
6. Check inventory movements for expected records.

The `run-textile-pos` skill (`.claude/skills/run-textile-pos/`) can automate browser testing.

---

## Scope checklist (v1 guard)

Before marking any milestone complete, confirm you did **not** implement:
- [ ] Multi-branch / multi-shop logic
- [ ] Offline sync or service workers
- [ ] Mobile-specific native APIs
- [ ] AI/ML forecasting
- [ ] Live exchange rate feeds
- [ ] Multi-currency sales invoices
- [ ] Complex multi-purchase payment allocation
- [ ] Advanced FX gain/loss accounting

---

## Delivery format (required by CLAUDE.md rule 24)

End every milestone response with:

```
## Files created / changed
- path/to/file — what changed

## What works now
- ...

## What remains pending
- ...

## How to test this milestone
- Step 1: ...
- Step 2: ...

## Assumptions made
- ...
```
