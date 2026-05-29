# Refactoring Rules

## Purpose

This file guides AI-assisted refactoring so code improvements do not break textile business logic.

## Refactoring Principle

Refactoring must preserve behavior unless the requested change explicitly changes behavior.

For this project, behavior includes:

- inventory deduction rules
- measurement conversion
- wastage logging
- roll reconciliation
- customer ledger updates
- invoice totals
- permissions
- audit logging

## Required Before Refactoring

Before refactoring, identify:

```text
1. Which domain is affected?
2. Which business rules are involved?
3. Which database records are changed?
4. Which permissions are involved?
5. Which tests currently cover the behavior?
6. Which tests must be added before or during refactor?
```

## Safe Refactoring Targets

Good targets:

- extract duplicated validation logic
- move calculations into shared utilities
- move backend business logic into service methods
- improve DTO validation
- improve error response consistency
- split large components
- improve table/form reuse
- add missing tests
- improve type safety
- improve naming consistency

## High-Risk Refactoring Areas

Do not refactor these casually:

- inventory deduction service
- POS checkout flow
- roll reconciliation
- ledger posting
- payment posting
- invoice cancellation
- audit logging
- permission guards
- Prisma schema relations
- migration history

## Refactoring Checklist

Use this checklist:

```text
- Business behavior preserved
- Existing tests pass
- New tests added for uncovered business rules
- No financial history deleted
- No inventory movement history deleted
- Decimal calculations remain safe
- Permissions preserved
- Audit logs preserved
- Error codes preserved or migration documented
- API contract compatibility checked
- Frontend state behavior checked
```

## Backend Refactoring Rules

- Keep controllers thin.
- Do not move business logic into controllers.
- Keep transaction boundaries explicit.
- Do not split a transaction across independent service calls unless transaction context is preserved.
- Preserve audit log creation.
- Preserve error codes used by the frontend.

## Frontend Refactoring Rules

- Do not break keyboard or barcode scanner flows.
- Do not remove visible roll details from POS.
- Do not hide batch warnings.
- Do not make checkout depend only on frontend validation.
- Preserve dirty state warnings in forms.
- Preserve loading and error states.

## Database Refactoring Rules

- Use migrations.
- Do not rename columns without data migration plan.
- Do not change decimal precision without impact analysis.
- Do not remove indexes used by POS, barcode scan, or reports.
- Do not hard delete business history.

## Documentation Requirement

For any major refactor, update the relevant docs:

```text
docs/02-domains/<domain>/
docs/03-database/
docs/04-api/
docs/06-ai/
```

## AI Refactoring Output Format

When suggesting a refactor, use this format:

```text
Current issue
Affected files
Business rules at risk
Proposed refactor
Database impact
API impact
Frontend impact
Tests required
Rollback plan
Pending confirmations
```
