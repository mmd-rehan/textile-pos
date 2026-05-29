# Loading and Error States

## Status

Draft v1.

This document defines how loading, empty, success, warning, and error states should behave across the system.

---

## Goals

The UI must reduce confusion during:

- barcode lookup
- sale completion
- payment recording
- roll deduction
- purchase receiving
- report loading
- barcode printing
- receipt printing

Users must know whether an action succeeded, failed, or still needs attention.

---

## Performance Targets

UI loading behavior should support the project performance goals:

- barcode scan response should feel immediate
- POS operations should not block unnecessarily
- dashboard should load quickly
- standard API screens should avoid long blank states

---

## Loading State Types

### Skeleton loading

Use for:

- dashboard cards
- tables
- detail pages
- report summaries

### Inline spinner

Use for:

- small buttons
- save action
- print action
- barcode lookup

### Full-page loading

Use only for:

- initial app load
- authentication check
- route-level loading when needed

Avoid full-page loaders for normal table refreshes.

---

## POS Loading Rules

POS loading must be minimal.

During barcode scan:

- keep input focused
- show lookup progress briefly
- do not clear cart
- do not block entire screen unless sale completion is in progress

During sale completion:

- disable Complete Sale button
- show processing state
- prevent double submission
- preserve cart if request fails

---

## Success States

Success messages should be short and actionable.

Examples:

```text
Sale completed. Invoice INV-000123 is ready to print.
```

```text
Payment recorded. Customer balance updated.
```

```text
Roll R-1001 reconciled successfully.
```

For routine autosave or filter updates, avoid unnecessary success toasts.

---

## Warning States

Warnings should appear before the user makes a risky decision.

Examples:

```text
Actual cut is 0.20 yd greater than billed quantity. This will be recorded as wastage.
```

```text
This roll belongs to a different batch. Confirm before selling as matching fabric.
```

```text
Customer credit limit may be exceeded. Manager approval is required.
```

---

## Error States

Error messages must explain:

1. what failed
2. why it failed if known
3. what the user can do next

Good examples:

```text
Sale could not be completed because the roll has only 2.40 yd remaining.
```

```text
Barcode not found. Check the barcode or search by product name.
```

```text
You do not have permission to approve inventory adjustment.
```

Bad examples:

```text
Error.
```

```text
Something went wrong.
```

---

## Error Categories

### Validation error

Shown near the input.

Examples:

- required field missing
- invalid number
- negative length
- payment amount invalid

### Business rule error

Shown near the affected section or at form top.

Examples:

- insufficient roll length
- invoice already paid
- roll already finished
- duplicate barcode

### Permission error

Shown as blocking message.

Examples:

- cannot delete invoice
- cannot override negative stock
- cannot access accounting report

### Server error

Shown with retry option.

Examples:

- report failed to load
- sale submission failed
- customer ledger failed to refresh

---

## Offline or Local Network State

Offline/local network behavior is planned for later and should not be treated as implemented in v1.

For now, show a clear connection error if the frontend cannot reach the backend.

Example:

```text
Cannot connect to server. Check network connection and try again.
```

Do not promise offline sync behavior until it is designed.

---

## Printing Errors

Receipt and barcode printing should show clear errors.

Examples:

```text
Print dialog did not open. Check browser pop-up settings and try again.
```

```text
Barcode label was generated, but printing was cancelled.
```

```text
Receipt is ready. Use the browser print dialog to select the receipt printer.
```

---

## Empty States

Empty states should guide the next action.

Examples:

```text
No sales found for this date range.
Try a wider date range or clear filters.
```

```text
No low stock rolls.
All active rolls are above the configured threshold.
```

```text
No customer ledger entries yet.
Ledger entries will appear after credit sales or payments.
```

---

## Pending Confirmation

The following need confirmation later:

- toast notification duration
- whether failed POS submissions should auto-retry
- daily closing behavior after server errors
- offline mode and sync strategy
- printer-specific error handling
