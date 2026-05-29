# Typography

## Status

Draft v1.

This document defines typography rules for a fast, readable textile ERP and POS interface.

---

## Typography Goals

Typography must support:

- fast POS usage
- accurate numeric reading
- clear roll and batch identification
- readable tables
- low training effort for cashiers
- clear financial and inventory values

---

## Font Strategy

Use a clean sans-serif font stack.

Recommended frontend default:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

For numeric-heavy screens, use tabular numbers where possible.

Recommended CSS utility:

```css
font-variant-numeric: tabular-nums;
```

This helps align:

- prices
- totals
- roll lengths
- invoice numbers
- ledger balances
- payment amounts

---

## Type Scale

Recommended scale:

| Use | Size | Notes |
|---|---:|---|
| Page title | 24px to 30px | Main screen heading |
| Section title | 18px to 20px | Card or form section |
| Body text | 14px to 16px | Standard content |
| Table text | 13px to 14px | Dense data views |
| Helper text | 12px to 13px | Guidance and hints |
| Badge text | 12px | Status labels |
| POS total | 28px to 36px | Must be highly visible |

---

## POS Typography

POS should use larger, clearer text than admin tables.

Important values must be visually prominent:

- invoice total
- remaining roll length
- billed quantity
- actual cut
- payment due
- change amount

Recommended POS hierarchy:

```text
Invoice total: largest
Payment due: large
Cart item totals: medium
Product and roll metadata: normal
Helper text: small
```

---

## Numeric Formatting

Use consistent numeric formatting across the app.

### Length values

Display fabric length with unit.

Examples:

```text
3 yd
3.25 yd
2.75 m
18.40 yd remaining
```

### Money values

Display currency consistently.

Examples:

```text
AED 125.00
PKR 12,500.00
```

Currency is Pending Confirmation.

### Percent values

Use percent symbol and avoid excessive decimals.

Examples:

```text
12.5% margin
5% discount
```

---

## Labels and Text Style

Use direct labels.

Good:

```text
Actual Cut
Billed Quantity
Remaining Length
Customer Credit Limit
```

Avoid vague labels:

```text
Amount 1
Value
Qty2
Data
```

---

## Error Text

Error messages should explain what happened and how to fix it.

Good:

```text
Actual cut cannot exceed the remaining roll length.
```

Good:

```text
This customer has exceeded the credit limit. Manager approval is required.
```

Bad:

```text
Invalid input.
```

---

## Table Typography

Tables should be compact but readable.

Rules:

- use tabular numbers for numeric columns
- right-align money columns
- right-align measurement columns
- left-align names and descriptions
- keep barcode and roll code visually scannable
- avoid wrapping critical numbers when possible

---

## Localization Readiness

The app should be structured so labels can later be translated.

Implementation note:

- do not hardcode display text deep inside reusable components
- use translation keys where localization is introduced
- keep layout flexible for longer translated labels

Languages are Pending Confirmation.

---

## Pending Confirmation

The following are not finalized:

- final font family
- app language or multilingual support
- currency display format
- date format
- whether right-to-left layout support is required
