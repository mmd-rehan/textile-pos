# Design System

## Status

Draft v1 for the Textile ERP & POS System.

This document defines the product-level UI design rules for the web application. It is written for a single-shop first implementation, while keeping the UI structure flexible enough for future expansion.

---

## Purpose

The design system must support a fast, low-error textile shop workflow where users handle:

- roll-based inventory
- yard and meter sales
- barcode scanning
- retail billing
- wholesale billing
- customer credit ledger
- purchase and supplier entry
- wastage and shrinkage tracking
- reports and analytics

The UI must prioritize speed, clarity, and accuracy over visual decoration.

---

## Product UI Principles

### 1. Inventory clarity first

Every inventory screen must make the true stock unit clear: the roll, also called thaan.

Do not show only product-level quantity when the user needs operational stock visibility. Show roll-level information where decisions depend on:

- roll barcode
- product
- batch or dye lot
- original length
- remaining length
- roll status
- remnant status
- supplier or purchase reference

### 2. Cashier speed first in POS

The POS interface must allow a cashier or salesman to complete a normal retail invoice quickly.

The screen should minimize typing and unnecessary navigation.

POS actions should be optimized for:

- barcode scan
- search by product or roll code
- quick quantity or measurement input
- unit selection between yard and meter
- discount entry where allowed
- payment entry
- invoice print

### 3. Textile language over generic POS language

Use business terms that match the textile workflow.

Preferred terms:

| Use | Avoid |
|---|---|
| Roll / Thaan | Stock item only |
| Remaining Length | Quantity only |
| Actual Cut | Consumed quantity |
| Billed Quantity | Sold quantity only |
| Wastage | Adjustment only |
| Remnant / Chant | Leftover item only |
| Batch / Dye Lot | Variant only |

### 4. Prevent costly mistakes

The UI should prevent mistakes before they reach the backend.

Examples:

- warn before overselling a roll
- highlight when actual cut is greater than billed quantity
- warn when batch mismatch may affect matching fabric
- require reason for wastage, adjustment, invoice deletion, refund, and roll retirement
- show who is responsible for sensitive actions

### 5. Design for low training effort

The application should be understandable to shop staff who may not be technical.

Use:

- simple labels
- clear confirmation messages
- predictable buttons
- visible totals
- visible remaining roll length
- consistent layouts

Avoid:

- hidden critical controls
- unclear icons without text
- multiple flows for the same task
- technical database terminology in the user interface

---

## Application Layout

### Main shell

The default authenticated application layout should contain:

- left sidebar navigation
- top header bar
- main content area
- optional right-side drawer for contextual details

Recommended sidebar groups:

1. Dashboard
2. POS
3. Sales
4. Inventory
5. Purchases
6. Customers
7. Suppliers
8. Accounting
9. Reports
10. Barcode
11. Settings

The visible menu items must be controlled by permissions.

---

## Main Screen Types

### Dashboard screens

Dashboard screens summarize business health.

They should display:

- daily sales
- credit outstanding
- low stock rolls
- remnants
- wastage alerts
- shrinkage trends
- fast-moving products
- dead stock

Dashboard widgets should link to the underlying report or filtered table.

### POS screens

POS screens must be full-width, keyboard-friendly, and optimized for quick operation.

Suggested POS layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Search / Scan barcode                                        │
├─────────────────────────────┬────────────────────────────────┤
│ Product and roll selector   │ Cart and invoice summary       │
│                             │                                │
│ Roll details                │ Payment panel                  │
│ Measurement input           │ Print / Hold / Complete        │
└─────────────────────────────┴────────────────────────────────┘
```

### Inventory screens

Inventory screens should support both overview and roll-level detail.

Recommended views:

- Product list
- Batch list
- Roll list
- Remnant list
- Stock movement history
- Roll reconciliation workflow

### Data management screens

For customers, suppliers, products, batches, and settings, use:

- searchable tables
- filters
- create/edit forms
- detail drawers
- activity history where relevant

---

## Component Standards

### Buttons

Use clear action names.

Examples:

- Save Product
- Add Roll
- Complete Sale
- Print Invoice
- Mark Roll as Finished
- Record Payment
- Approve Adjustment

Avoid vague labels:

- Submit
- Confirm
- OK
- Process

### Primary action

Only one primary action should appear in a form footer or modal footer.

Examples:

- Create Roll
- Save Changes
- Complete Sale

### Secondary action

Use secondary actions for safe alternatives.

Examples:

- Cancel
- Save Draft
- Print Later
- Back to Inventory

### Destructive action

Destructive or sensitive actions must be visually distinct and require confirmation.

Examples:

- Delete Invoice
- Void Sale
- Retire Roll
- Approve Negative Stock Override

---

## Status Indicators

Use clear text with consistent visual treatment.

Recommended roll statuses:

| Status | Meaning |
|---|---|
| Active | Roll can be sold |
| Low Stock | Remaining length is below threshold |
| Remnant | Small leftover fabric piece |
| Finished | Roll has been reconciled and closed |
| Damaged | Roll has damage or restricted sale condition |
| On Hold | Temporarily blocked from sale |

Recommended invoice statuses:

| Status | Meaning |
|---|---|
| Draft | Not finalized |
| Completed | Finalized sale |
| Partially Paid | Some amount is pending |
| Credit | Amount posted to customer ledger |
| Refunded | Fully or partially refunded |
| Voided | Cancelled by authorized user |

---

## Interaction Rules

### Barcode scanning

A barcode scan should behave like fast keyboard input.

Expected behavior:

1. Input field remains focused on POS screen.
2. Barcode scan triggers roll/product lookup.
3. If exact roll match is found, add or select roll.
4. If multiple matches are found, show selection list.
5. If no match is found, show a clear error message.

### Measurement entry

Measurement inputs must show:

- billed quantity
- actual cut quantity where applicable
- selected unit
- converted backend unit where helpful
- remaining roll length after deduction

The UI must make over-cutting visible before sale completion.

### Printing

Receipt and barcode print actions should show:

- print preview when practical
- selected printer instructions if browser print dialog is used
- print status
- retry option after failure

Direct hardware integrations beyond browser-supported printing are not part of the current version unless confirmed later.

---

## Accessibility Rules

The UI should support:

- keyboard navigation for POS
- visible focus indicators
- labels for every input
- sufficient text contrast
- clear error messages
- no color-only status communication
- table cells readable without horizontal confusion

Important POS actions must be reachable through keyboard shortcuts later, but exact shortcut mapping is Pending Confirmation.

---

## Empty States

Empty states must explain what the user should do next.

Examples:

```text
No rolls found
Create a new roll from purchase entry or adjust your filters.
```

```text
No customer selected
Continue as walk-in customer or search an existing credit customer.
```

```text
No wastage recorded
Wastage will appear here when actual cut is greater than billed quantity or roll reconciliation records loss.
```

---

## Pending Confirmation

The following items are not finalized yet:

- final logo and brand identity
- exact brand color palette
- dark mode requirement
- keyboard shortcut list
- exact receipt layout
- exact barcode label design
- language and localization requirements
- mobile-first support level
- accessibility compliance target, such as WCAG level
