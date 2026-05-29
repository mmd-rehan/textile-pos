# Coding Standards

## Purpose

This document defines coding standards for the Textile ERP & POS System.

The goal is to keep the codebase maintainable, predictable, safe for business-critical workflows, and easy for AI-assisted development to follow.

---

## General Principles

1. Business rules must be explicit.
2. Inventory and ledger logic must be backend-controlled.
3. Use clear names from the textile domain.
4. Prefer simple, readable code over clever code.
5. Keep files focused.
6. Keep modules domain-oriented.
7. Validate inputs at boundaries.
8. Write tests for business-critical calculations.
9. Never silently modify financial history.
10. Never hide inventory changes without stock movements.

---

## Language Standards

Use TypeScript for frontend and backend.

Rules:

- Enable strict TypeScript mode.
- Avoid `any` unless there is a clear reason.
- Use explicit types for public functions.
- Use domain types for important values.
- Keep shared types in a shared package only when stable.

---

## Naming Standards

Use business names consistently.

Preferred terms:

```text
roll
thaan
batch
dyeLot
billedQuantity
actualCutQuantity
wastageQuantity
remainingLength
remnant
ledgerEntry
stockMovement
```

Avoid vague names:

```text
item2
data
thing
qty2
misc
```

---

## Measurement Naming

Use names that show unit and purpose.

Examples:

```ts
billedQuantityYard
actualCutQuantityYard
remainingLengthYard
originalLengthYard
wastageQuantityYard
```

If value is in user-entered unit:

```ts
enteredQuantity
enteredUnit
```

Do not name a base-unit value simply `quantity` when unit matters.

---

## Money Naming

Use clear names:

```ts
subtotalAmount
discountAmount
taxAmount
totalAmount
paidAmount
creditAmount
unitPrice
purchasePricePerYard
salePricePerYard
```

Do not use floating-point math for final money calculations.

---

## Backend Coding Standards

### Controllers

Controllers should be thin.

Allowed:

- Route definition.
- Request DTO binding.
- Auth decorators.
- Calling service methods.

Not allowed:

- Complex business logic.
- Direct inventory deduction.
- Direct ledger posting.

### Services

Services contain business logic.

Responsibilities:

- Business rule validation.
- Calling repositories.
- Managing transactions.
- Calling audit service.
- Calling ledger service.

### Repositories

Repositories contain database access.

Responsibilities:

- Query building.
- Row locking.
- Persistence.

Avoid business decisions in repositories.

---

## Transaction Standards

Use explicit transactions for:

- Sale creation.
- Purchase posting.
- Roll deduction.
- Roll reconciliation.
- Customer payment.
- Supplier payment.
- Inventory adjustment.
- Invoice void.

Pattern:

```ts
await db.transaction(async (tx) => {
  // lock required rows
  // validate current state
  // write business records
  // write stock movement / ledger / audit
});
```

---

## Error Standards

Use typed application errors.

Example:

```ts
throw new AppError({
  code: 'INSUFFICIENT_ROLL_LENGTH',
  message: 'Roll does not have enough remaining fabric.',
  statusCode: 409,
  details: {
    rollId,
    availableYard,
    requestedYard,
  },
});
```

Do not throw plain strings.

---

## Validation Standards

Validate at API boundaries.

Rules:

- Required fields must be checked.
- Decimal fields must be valid decimal strings or decimal-safe values.
- Units must be from allowed enum.
- IDs must be valid.
- Business validation must happen in service layer.

Frontend validation improves UX. Backend validation protects data.

---

## Frontend Coding Standards

### Components

Use small, focused components.

Examples:

```text
BarcodeInput
MeasurementInput
RollSearchResult
CartLineTable
PaymentPanel
ReceiptTemplate
```

Avoid components that mix many domains.

### Hooks

Use hooks for reusable behavior.

Examples:

```text
useBarcodeScanner
useCreateRetailSale
useRollLookup
useCustomerSearch
usePermission
```

### API Calls

Keep API calls in feature API files.

Example:

```text
features/pos/api/pos.api.ts
```

Do not scatter `fetch` calls throughout UI components.

---

## File Size Guidance

Preferred:

- Components: under 250 lines where practical.
- Services: under 400 lines where practical.
- DTOs and types separated.
- Split large workflows into private methods.

Do not split so much that business flow becomes hard to follow.

---

## Formatting Standards

Use:

- Prettier.
- ESLint.
- Consistent import ordering.
- No unused variables.
- No console logs in production code.

Allow console logs only during local debugging and remove before commit.

---

## Comment Standards

Write comments for business rules, not obvious code.

Good:

```ts
// Inventory must be deducted by actual cut because salesman may cut more than billed quantity.
```

Bad:

```ts
// Increment i by 1.
```

---

## Testing Standards

Prioritize tests for:

- Unit conversion.
- Roll deduction.
- Wastage calculation.
- Negative stock prevention.
- Customer ledger posting.
- Invoice totals.
- Permission checks.
- Roll reconciliation.

Test names should describe the business case.

Example:

```text
should deduct actual cut from roll when actual cut is greater than billed quantity
```

---

## Git and Commit Standards

Use clear commit messages.

Examples:

```text
feat(pos): add retail sale checkout flow
fix(inventory): prevent negative roll remaining length
test(rolls): add wastage calculation cases
docs(architecture): add backend transaction rules
```

---

## API Contract Standards

When adding an endpoint, document:

- Method.
- Path.
- Request body.
- Response body.
- Permissions.
- Error codes.
- Side effects.

Side effects are important for this project.

Example side effects:

- Deducts roll inventory.
- Creates stock movement.
- Creates customer ledger entry.
- Creates audit log.

---

## Database Migration Standards

Rules:

- Every schema change must use a migration.
- Never manually change production schema without migration.
- Migrations should be reviewed before running.
- Backup before risky migrations.
- Avoid destructive migrations without data migration plan.

---

## Security Standards

- Never log passwords or tokens.
- Never expose stack traces in production.
- Always check permissions on backend.
- Sanitize user input where needed.
- Use parameterized queries through ORM/query builder.
- Do not trust frontend-calculated totals.

---

## AI-Assisted Development Rules

When using AI to generate code:

1. Provide the relevant domain documentation.
2. Tell AI which module is being changed.
3. Ask AI to list affected business rules.
4. Ask AI to include tests for textile edge cases.
5. Review all inventory and ledger logic manually.
6. Never accept generated code that changes inventory without stock movements.
7. Never accept generated code that edits ledger history silently.

---

## Non-Negotiable Coding Rules

1. Use TypeScript strict mode.
2. Keep business logic out of controllers and UI components.
3. Use transactions for inventory and financial writes.
4. Use decimal-safe handling for money and measurements.
5. Use clear textile domain names.
6. Validate on backend.
7. Audit critical actions.
8. Test roll deduction, wastage, reconciliation, and ledger flows.
