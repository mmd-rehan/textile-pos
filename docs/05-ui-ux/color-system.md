# Color System

## Status

Draft v1.

The final brand colors are Pending Confirmation. This document defines semantic color usage so the UI can be implemented with Tailwind CSS without hardcoding random colors throughout the application.

---

## Goals

The color system must help users quickly understand:

- safe actions
- warnings
- errors
- successful operations
- pending payments
- low stock
- remnant status
- roll finished status
- credit and outstanding balances

Color must support usability. It should not be used only for decoration.

---

## Tailwind Strategy

Use semantic Tailwind tokens through CSS variables.

Recommended token categories:

```text
background
foreground
card
border
muted
primary
secondary
success
warning
danger
info
credit
inventory
wastage
remnant
```

Implementation should map these tokens in the frontend theme layer.

Example naming pattern:

```text
bg-background
text-foreground
bg-card
border-border
text-muted-foreground
bg-primary
text-primary-foreground
bg-danger
text-danger-foreground
```

Do not use raw colors directly in feature components unless there is a strong reason.

---

## Semantic Color Roles

### Primary

Used for the main positive action on a screen.

Examples:

- Complete Sale
- Save Product
- Add Roll
- Record Payment

### Secondary

Used for lower-priority actions.

Examples:

- Cancel
- Back
- Save Draft
- View Details

### Success

Used when an operation completes successfully.

Examples:

- sale completed
- payment recorded
- roll created
- barcode generated

### Warning

Used when the user must review something before continuing.

Examples:

- low roll stock
- batch mismatch
- actual cut greater than billed quantity
- customer close to credit limit
- remnant threshold reached

### Danger

Used for destructive or high-risk states.

Examples:

- negative stock override
- invoice deletion
- refund approval
- roll loss
- failed payment
- permission denied

### Info

Used for neutral guidance.

Examples:

- conversion note between yard and meter
- print instruction
- pending confirmation label
- helper text

---

## Textile-Specific Status Colors

Use the same status color consistently across the app.

| Status | Semantic color | Usage |
|---|---|---|
| Active roll | success or neutral | Roll can be sold |
| Low stock | warning | Roll is close to finish |
| Remnant / Chant | warning or remnant token | Small leftover fabric |
| Finished roll | muted | Roll is closed after reconciliation |
| Damaged roll | danger | Roll cannot be sold normally |
| On hold | info or muted | Roll is temporarily blocked |
| Credit invoice | credit token | Customer owes amount |
| Overdue payment | danger | Payment requires attention |
| Wastage | wastage token | Hidden loss or over-cut tracking |

---

## Color Rules for POS

POS colors must be calm and functional.

Use strong colors only for:

- final action buttons
- payment status
- warnings that affect inventory or money
- errors that block sale completion

Do not make the POS screen visually noisy with too many colored panels.

---

## Color Rules for Tables

Tables should not rely on full-row colors except for urgent states.

Preferred approach:

- status badge
- small left border indicator
- icon plus text where helpful
- highlighted numeric cell for critical values

Examples:

- low stock roll shows a warning badge
- negative outstanding balance shows a danger badge
- finished roll shows muted status badge

---

## Color and Accessibility

Every colored state must include text.

Examples:

Good:

```text
Warning: Actual cut is greater than billed quantity
```

Bad:

```text
Only yellow border with no explanation
```

Do not depend on color alone to communicate business meaning.

---

## Pending Confirmation

The following must be confirmed before final UI implementation:

- brand primary color
- whether dark mode is required in v1
- final status color palette
- contrast target
- whether the shop needs Urdu, Arabic, Persian, or bilingual UI support
