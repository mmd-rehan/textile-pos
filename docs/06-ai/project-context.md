# AI Project Context

## Purpose

This file gives AI coding tools a stable understanding of the Textile ERP & POS System before generating code, database changes, UI screens, tests, or refactors.

The system is a specialized ERP and POS platform for textile trading businesses. It must support fabric rolls, variable-length sales, retail billing, wholesale billing, customer credit, supplier purchases, barcode workflows, wastage tracking, roll reconciliation, and textile-specific reporting.

## Product Principle

The system must model the real textile business accurately instead of simplifying workflows for technical convenience.

The most important rule is:

```text
Inventory is tracked at roll/thaan level, not only at product level.
```

A product can have many batches. A batch can have many rolls. Each roll can have a different original length, remaining length, barcode, cost, supplier, and status.

## Confirmed Technical Direction

```text
Frontend: React + TypeScript + Tailwind
Backend: Node.js + NestJS
Database: MySQL
ORM: Prisma
Authentication: email/username + password
Authorization: role-based permissions
Login: session/JWT strategy
Social login: not included
Deployment scope: single-shop first
Multi-branch: deferred
```

## Pending Frontend Build Clarification

The project direction mentions both Next.js and Vite. These should not be mixed blindly.

AI tools must follow this rule:

```text
If the repository is initialized as Next.js, follow Next.js conventions.
If the repository is initialized as Vite, follow Vite SPA conventions.
Do not generate hybrid assumptions unless the developer confirms the chosen frontend runtime.
```

Until confirmed, generated frontend code should stay framework-light where possible and focus on React components, hooks, routes/pages placeholders, forms, and state patterns.

## Core Modules

1. Authentication and roles
2. Dashboard and analytics
3. Inventory management
4. Product and catalog management
5. Retail POS
6. Wholesale POS
7. Roll/thaan management
8. Barcode and label system
9. Customer management
10. Credit/udhaar ledger
11. Purchase management
12. Supplier management
13. Remnant/chant management
14. Wastage and shrinkage tracking
15. Reports and accounting
16. Multi-unit measurement system
17. Expense management
18. User activity and audit logs
19. Settings and configuration

## Inventory Hierarchy

```text
Category
  -> Product
    -> Batch / Dye Lot
      -> Roll / Thaan
        -> Inventory Movements
        -> Sales Transactions
```

## Product Types

### Variable-Length Fabric

Examples:

- Wash and Wear
- Cotton
- Lawn
- Silk
- Palachi

Rules:

- Sold in yards or meters.
- Inventory is deducted from roll remaining length.
- Actual cut may differ from billed quantity.

### Cut Suit Pieces

Examples:

- 3-piece suits
- Kids suits
- Ready-cut suits

Rules:

- Sold as fixed units.
- May come from supplier stock.
- May optionally be produced from a master roll.

### Fixed Products

Examples:

- Shawls
- Scarves
- Blankets
- Accessories

Rules:

- Quantity-based stock.
- Standard inventory deduction.

## Measurement Rules

The system supports yards and meters.

```text
1 meter = 1.09361 yards
1 yard = 0.9144 meters
```

AI tools must not hard-code measurement logic inside UI only. Measurement conversion must be centralized in shared/backend-safe utilities and validated on the backend.

## Sale Deduction Rule

When billed quantity and actual cut differ, inventory deduction must use actual cut.

Example:

```text
Billed quantity: 3 yards
Actual cut: 3.2 yards
Inventory deducted: 3.2 yards
Wastage: 0.2 yards
```

The system must store:

- roll
- billed quantity
- actual cut quantity
- unit
- normalized inventory quantity
- salesperson/user
- timestamp
- wastage amount
- reason if applicable

## Roll Reconciliation

Finished rolls must be closed through a formal reconciliation workflow.

The system compares:

```text
Expected remaining length
Actual physical remaining length
```

The difference becomes shrinkage, wastage, loss, or adjustment depending on the business reason.

## Remnant / Chant Handling

Small leftover pieces must not disappear from inventory.

Pending confirmation:

```text
Exact remnant threshold is not fully locked.
A 2-yard threshold exists in source material as a possible default, but final setting should remain configurable.
```

## Barcode Context

Barcodes are used for:

- roll identification
- product lookup
- POS scanning
- batch tracking
- inventory audits
- label printing

Initial hardware support:

- browser keyboard-input barcode scanner
- simple receipt printer
- simple barcode/label printing from browser print flow

Do not generate native device integration unless explicitly requested.

## Roles

Confirmed roles:

- Admin
- Manager
- Cashier / Salesman
- Inventory Staff
- Accountant
- Super Admin optional for future multi-branch

AI tools must apply role checks to sensitive operations.

## Sensitive Operations

The following actions require permission checks and audit logging:

- inventory adjustment
- invoice deletion or cancellation
- refund approval
- negative stock override
- roll reconciliation
- price change
- user management
- accounting correction
- credit limit change

## Performance Targets

Use these targets while designing UI, API, and database access:

```text
Retail invoice completion: under 60 seconds
Barcode scan response: under 300ms
Standard API response: under 500ms
Dashboard loading: under 2 seconds
Inventory accuracy target: 98%+
Roll traceability target: 100%
```

## Non-Negotiable AI Rules

AI must not invent unconfirmed business policy.

When information is missing, use one of these labels:

```text
Pending Confirmation
Deferred
Not in v1 Scope
```

AI-generated code must preserve traceability and must not bypass business rules for convenience.
