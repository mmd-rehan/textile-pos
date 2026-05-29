# AI Instructions

## Purpose

These instructions guide AI tools when generating, editing, reviewing, or refactoring code for the Textile ERP & POS System.

## Golden Rule

Never simplify textile inventory into normal product quantity inventory.

Always ask or mark pending when a rule is unclear.

## Required Source Reading Before Feature Work

Before generating code for any feature, read the matching docs in this order:

```text
1. docs/00-overview/
2. docs/07-decisions/
3. docs/01-architecture/
4. docs/02-domains/<domain>/
5. docs/03-database/
6. docs/04-api/
7. docs/05-ui-ux/
8. docs/06-ai/
```

## AI Must Preserve These Business Rules

1. Inventory is roll-based.
2. Rolls are unique.
3. Inventory cannot become negative unless explicitly authorized.
4. Actual cut overrides billed quantity for deduction.
5. Wastage must be logged.
6. Batch consistency matters.
7. Roll retirement is mandatory.
8. Every inventory movement must be traceable.
9. Accounting records must not be silently modified.
10. Permissions must be strict.
11. Reports should use real-time data where practical.
12. Retail and wholesale flows are separate.

## Implementation Discipline

AI-generated implementation must follow these rules:

- Keep business logic out of React components.
- Validate critical business logic on the backend.
- Use Prisma transactions for multi-step inventory, sales, ledger, and accounting operations.
- Log audit events for sensitive changes.
- Use decimal-safe logic for measurements and money.
- Do not trust frontend totals for financial or inventory decisions.
- Do not delete financial or inventory history silently.
- Prefer append-only adjustment records for corrections.
- Keep role checks close to backend endpoints and service methods.

## Missing Information Policy

If a required business decision is not confirmed, do not invent it.

Use this pattern in generated docs or TODO comments:

```text
Pending Confirmation: <exact question or decision needed>
Safe temporary behavior: <non-destructive default if needed>
```

Safe temporary behavior must not create irreversible financial, inventory, or legal consequences.

## Code Generation Priorities

Generate code in this order:

```text
1. Types and validation contracts
2. Prisma models or migration notes
3. Backend DTOs
4. Backend service logic
5. Backend controller endpoints
6. Frontend API client
7. Frontend state/query hooks
8. Frontend UI components
9. Tests
10. Documentation updates
```

## Naming Expectations

Use textile business names consistently:

- Roll or Thaan for fabric roll
- Batch or Dye Lot for production batch
- Actual Cut for physically cut length
- Billed Quantity for charged length
- Wastage for actual cut minus billed quantity
- Remnant or Chant for leftover fabric piece
- Ledger for customer/supplier financial transaction history

Do not rename textile terms into generic retail terms unless creating internal reusable abstractions.

## Backend Safety Rules

AI must avoid these mistakes:

- Deducting inventory by product only.
- Updating roll remaining length without creating movement history.
- Allowing stock to go negative without authorization.
- Calculating wastage only on the frontend.
- Allowing invoice deletion without audit trail.
- Mutating ledger balances without ledger entries.
- Mixing retail and wholesale workflows into one unclear flow.

## Frontend Safety Rules

AI must avoid these mistakes:

- Hiding roll identity from POS users.
- Showing only product stock when roll-level stock matters.
- Making barcode scanning depend on mouse-only flows.
- Allowing checkout before backend validation.
- Showing success before backend transaction commits.
- Losing unsaved POS cart data on minor UI navigation.

## Database Safety Rules

AI must avoid these mistakes:

- Using floating point for money.
- Using imprecise float logic for fabric lengths.
- Missing indexes on barcode, invoice number, roll status, batch, customer, and date fields.
- Removing old rows that represent financial or inventory history.
- Failing to record who made critical changes.

## Testing Expectations

Every feature that changes inventory, sales, payments, ledger, or accounting must include tests for:

- success case
- validation failure
- permission failure
- transaction rollback
- edge case for decimal quantity
- audit log or movement creation

## AI Output Style

When generating implementation guidance, keep output structured as:

```text
Files to create/change
Business rules covered
Backend changes
Frontend changes
Database changes
Tests
Pending confirmations
```

## Out of Scope Unless Confirmed

Do not implement these without explicit confirmation:

- multi-branch logic
- offline/local network sync
- native printer SDK integration
- RFID
- mobile app
- WhatsApp invoice sending
- SMS reminders
- AI forecasting
- fabric image recognition
- full double-entry accounting if not confirmed for v1
