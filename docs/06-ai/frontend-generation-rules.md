# Frontend Generation Rules

## Purpose

This file guides AI-generated frontend code for the Textile ERP & POS System.

## Confirmed Frontend Direction

```text
React
TypeScript
Tailwind CSS
TanStack Query
Zustand
React Hook Form
```

## Pending Build Runtime Decision

The project has mentioned both Next.js and Vite.

AI must not assume routing, server components, API routes, or build behavior until the actual frontend repository is initialized.

Use this rule:

```text
If Next.js exists, follow Next.js routing and app conventions.
If Vite exists, follow Vite SPA conventions.
If unclear, generate portable React components and hooks only.
```

## Frontend Architecture Principles

- Keep UI components presentational where possible.
- Use feature-based folders.
- Keep API calls inside typed client functions.
- Use TanStack Query for server state.
- Use Zustand only for local workflow state like POS cart, UI preferences, and temporary selections.
- Use React Hook Form for forms.
- Use Zod or compatible validation schemas where shared validation is needed.
- Keep calculation preview logic separate from backend-authoritative calculation.

## Suggested Frontend Folder Pattern

```text
frontend/src/
├── app/ or pages/             # depends on Next.js or Vite decision
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   └── layout/
├── features/
│   ├── auth/
│   ├── inventory/
│   ├── sales/
│   ├── pos/
│   ├── customers/
│   ├── purchases/
│   ├── accounting/
│   ├── reports/
│   ├── barcode/
│   └── settings/
├── hooks/
├── lib/
├── stores/
├── types/
└── utils/
```

## POS UI Rules

The POS screen must prioritize speed and clarity.

Important behavior:

- Barcode input should stay ready for scanning.
- Salesman should be able to scan, enter quantity, choose unit, and checkout quickly.
- Roll identity must be visible when selling variable-length fabric.
- Batch/dye lot should be visible when relevant.
- Remaining length should be visible before sale confirmation.
- Actual cut must be captured when different from billed quantity.
- Wastage preview should be shown before checkout where possible.
- Backend confirmation is required before showing final success.

## Inventory UI Rules

Inventory screens must show roll-level details.

Do not show only product-level stock for variable-length fabric.

Important roll fields:

- roll code
- barcode
- product
- batch/dye lot
- original length
- remaining length
- unit
- status
- supplier
- purchase reference
- cost
- sale price

## Forms

Use React Hook Form for:

- product creation
- batch creation
- roll entry
- purchase entry
- customer creation
- supplier creation
- payment entry
- stock adjustment
- roll reconciliation
- settings forms

Form rules:

- Validate required fields before submit.
- Show inline validation errors.
- Disable submit while saving.
- Do not hide backend validation errors.
- Do not reset form until backend success.
- Warn users before leaving unsaved POS or purchase workflows.

## Tables

Use tables for operational lists:

- products
- batches
- rolls
- purchases
- invoices
- customers
- ledger entries
- payments
- reports

Table rules:

- Support search and filtering where useful.
- Show status labels clearly.
- Use compact layouts for POS and inventory-heavy screens.
- Avoid showing destructive actions as primary actions.
- Keep audit-sensitive actions behind confirmation modals.

## State Management Rules

### TanStack Query

Use for:

- products
- rolls
- batches
- customers
- invoices
- reports
- settings
- user profile
- permissions

### Zustand

Use for:

- POS cart
- selected customer during POS
- selected roll during sale
- draft purchase entry
- UI sidebar state
- temporary scanner input state

### React Hook Form

Use for:

- all user-entered forms
- validation binding
- dirty state
- form reset after success

## Error Handling

Show errors in user-friendly language.

Examples:

```text
This roll does not have enough remaining fabric.
You do not have permission to adjust inventory.
This invoice cannot be deleted. Create a correction instead.
Batch mismatch warning: selected roll belongs to a different dye lot.
```

Do not expose raw server stack traces.

## Loading States

Use clear loading states:

- button spinner for submit actions
- skeleton for table/page loads
- scan feedback for barcode lookup
- blocking overlay only for critical irreversible operations

## Accessibility

Frontend must support:

- keyboard navigation
- visible focus states
- accessible labels
- readable contrast
- clear error messages
- large enough click targets for POS speed

## Pending Confirmation

The following must not be hard-coded until confirmed:

- final logo and brand colors
- dark mode
- mobile POS requirement
- exact receipt layout
- barcode label layout
- localization languages
- keyboard shortcut list
- exact scanner behavior for all hardware
