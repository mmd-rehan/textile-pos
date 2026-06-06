---
name: project-review
description: >
  Review code changes in the textile-pos project against the project's rules and conventions.
  Use this skill whenever a developer asks to review, audit, check, or critique code — whether
  it's a PR, a single file, a module, or a paste of code. Also trigger this skill when a
  developer asks "does this follow the rules?", "is this correct?", "can you check this?",
  or shows you code and asks for feedback. This skill checks all 24 project rules from CLAUDE.md
  plus currency, supplier payment, catalog, and product-type rules.
---

# Textile POS — Code Review

You are reviewing code for **textile-pos** against the project's authoritative rule set.
Re-read `CLAUDE.md` at the repo root before starting — those rules override everything else.

---

## How to conduct the review

1. Read the code carefully (or ask the developer to paste/point to the files).
2. For each rule below, check whether the code complies. Note any violation with:
   - **Rule violated** (number + name)
   - **Location** (file + line if possible)
   - **What's wrong**
   - **How to fix it**
3. At the end, give a summary: ✅ PASS / ⚠️ WARNINGS / ❌ FAILURES.

Be specific. "The service looks fine" is not useful feedback. Quote the problematic line.

---

## Rule checklist

### Architecture & patterns

- [ ] **R1 — Thin controllers**: Controllers must not contain business logic, Prisma calls, or
  financial calculations. They should only wire HTTP to the service.
- [ ] **R2 — Services own business logic**: All validation, calculations, and DB writes belong in
  the service layer, not controllers, guards, or interceptors.

### Inventory

- [ ] **R3 — Roll-based inventory**: Fabric inventory is tracked per-roll (`Roll` model), not
  just at the product level. Operations on fabric must reference a `rollId`.
- [ ] **R4 — Stock movements**: Every operation that adds, removes, or transfers stock must create
  an `InventoryMovement` record. Raw Prisma inserts to stock fields without a movement record are
  a violation.
- [ ] **R5 — Actual cut quantity**: Sale line items must deduct the *actual cut* quantity from
  inventory, not the billed quantity.
- [ ] **R6 — Wastage records**: If `actualCut > billedQuantity`, a `WastageEntry` must be created.
  Silently discarding the difference is wrong.
- [ ] **R7 — Product-type awareness**: Code paths that handle `FABRIC_ROLL` must not be applied
  to `FIXED_PRODUCT` or `CUT_PIECE`, and vice versa. Check for assumptions like "every product
  has a roll".

### Financial safety

- [ ] **R8 — No floating-point math**: Money and fabric-length fields must use Prisma `Decimal`
  (or string intermediaries). Look for `number`, `parseFloat`, `*`, `/`, `+`, `-` on money
  variables. Any JS arithmetic on financial values is a violation.
- [ ] **R9 — Decimal-safe DTOs**: Money/length inputs in DTOs must be typed as `string`, not
  `number`. `@IsNumber()` on a price field is a violation.
- [ ] **R10 — Base currency for sales**: Sale invoices and sale prices must use the single global
  base currency. Do not add currency selection to sales in v1.

### Currencies (purchases)

- [ ] **R11 — Multi-currency purchases**: Purchase amounts must be stored in the original currency.
  Do not force-convert to PKR or any single currency.
- [ ] **R12 — Exchange rate storage**: If `currency !== baseCurrency`, the purchase must store
  `amountInCurrency`, `currency`, and `exchangeRate`. Missing any of these three is a violation.
- [ ] **R13 — Manual exchange rates**: Exchange rates must come from user input, not a live API.
- [ ] **R14 — Base currency conversion**: The converted base-currency amount must also be stored
  for inventory valuation and reporting.

### Data integrity

- [ ] **R15 — Transactions**: Any write touching more than one table must be wrapped in
  `prisma.$transaction(...)`. Check for multi-table writes that are *not* transactional.
- [ ] **R16 — Append-only ledgers**: Customer and supplier ledger tables must never be updated or
  deleted. Only inserts. Look for `prisma.customerLedger.update(...)` or similar — violation.
- [ ] **R17 — No silent edits**: Confirmed invoices, stock movements, audit logs, and ledger rows
  must not be silently modified. Voiding must create a reversal entry, not edit the original.
- [ ] **R18 — Backend is source of truth**: The frontend must not compute final financial or
  inventory values. If a frontend file has subtotal/tax/stock calculations that aren't just
  display previews, flag it.

### Audit & security

- [ ] **R19 — Audit logs**: Critical writes (sales, purchases, payments, adjustments, voids) must
  call `AuditService.log(...)` with actor, action, entity, and record id.
- [ ] **R20 — Role-based permissions**: Endpoints must be guarded with `@RequirePermission(...)`.
  Unguarded write endpoints are a violation.

### Supplier payments

- [ ] **R21 — Supplier payment records**: Payments against purchases must create both a
  `SupplierPayment` record and a `SupplierLedger` entry.
- [ ] **R22 — Payment status recalculation**: After recording a supplier payment, the purchase's
  payment status (`PAID` / `PARTIALLY_PAID` / `UNPAID`) must be recalculated and saved.

### Catalog / master data

- [ ] **R23 — No hardcoded dropdown values**: Colors, designs, brands, categories, batches, and
  units must come from the database. Hardcoded arrays of these values are a violation.
- [ ] **R24 — Active-only records in dropdowns**: Queries for master data that power dropdowns
  must include `where: { isActive: true }` unless explicitly fetching for admin management.

---

## Summary format

After the checklist, write:

```
## Review summary

**Result**: ✅ PASS | ⚠️ WARNINGS | ❌ FAILURES

**Violations** (if any):
- R8 (No floating-point math) — backend/src/modules/sales/sales.service.ts:142
  `const total = lineItem.qty * lineItem.price` — both operands are JS numbers.
  Fix: use `new Decimal(lineItem.qty).mul(lineItem.price)`.

**Suggestions** (non-rule issues worth noting):
- ...

**Approved files** (fully compliant):
- ...
```
