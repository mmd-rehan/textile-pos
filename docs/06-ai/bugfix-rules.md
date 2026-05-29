# Bugfix Rules

## Purpose

This file guides AI-assisted bug fixing for the Textile ERP & POS System.

## Bugfix Principle

Fix the cause, not only the visible symptom.

For textile POS, many bugs can affect inventory, money, or accountability. Treat these as high-risk until proven otherwise.

## Severity Classification

### Critical

- Wrong inventory deduction
- Negative roll length without authorization
- Wrong invoice total
- Payment recorded incorrectly
- Ledger balance wrong
- Sale completed without inventory movement
- Wastage not logged
- Unauthorized inventory or invoice changes

### High

- Barcode scan loads wrong roll
- Batch mismatch warning missing
- Roll reconciliation incorrect
- Report totals wrong
- Customer credit limit bypassed
- Duplicate invoice numbers

### Medium

- UI state lost unexpectedly
- Search/filter incorrect
- Slow dashboard query
- Non-critical validation message missing

### Low

- Visual alignment issue
- Copy/text issue
- Minor UX improvement

## Required Bug Investigation Steps

Before generating a fix, identify:

```text
1. What is the expected behavior?
2. What is the actual behavior?
3. Which business rule is violated?
4. Which database records are affected?
5. Can this affect historical inventory, invoice, ledger, or accounting data?
6. Is a data correction script needed?
7. What regression test will prevent recurrence?
```

## Inventory Bugfix Rules

For inventory bugs:

- Check roll remaining length.
- Check inventory movement history.
- Check sale item billed quantity and actual cut quantity.
- Check unit conversion.
- Check wastage record.
- Check audit log.
- Avoid direct manual correction without adjustment movement.

## Sales Bugfix Rules

For sales bugs:

- Recalculate totals on backend.
- Verify invoice line items.
- Verify payment entries.
- Verify ledger entries for credit sales.
- Verify stock deduction occurred once only.
- Check duplicate submission/idempotency behavior.

## Barcode Bugfix Rules

For barcode bugs:

- Confirm barcode uniqueness.
- Confirm scanner input parsing.
- Confirm roll/product lookup priority.
- Confirm inactive/finished rolls are blocked.
- Confirm scan feedback is visible to user.

## Permission Bugfix Rules

For permission bugs:

- Fix backend guard first.
- Then fix frontend visibility.
- Never rely only on hidden buttons.
- Add tests for unauthorized requests.

## Data Correction Policy

If historical data is wrong, do not silently update records.

Use one of these:

- adjustment entry
- correction invoice
- ledger correction entry
- audit-backed admin correction
- migration/data repair script with clear documentation

## Regression Test Requirement

Every bugfix affecting business logic must include at least one regression test.

Test should fail before the fix and pass after the fix.

## AI Bugfix Output Format

Use this format:

```text
Bug summary
Root cause
Affected business rule
Affected files
Fix approach
Data impact
Tests added
Manual verification steps
Pending confirmations
```

## Do Not Do

- Do not patch only the frontend for backend validation bugs.
- Do not bypass transactions to make a bug disappear.
- Do not delete incorrect history silently.
- Do not hide errors without fixing them.
- Do not change business policy without confirmation.
