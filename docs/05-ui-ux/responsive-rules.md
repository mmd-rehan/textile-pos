# Responsive Rules

## Status

Draft v1.

The current product direction is a web-based single-shop system. The primary operating environment is expected to be desktop or laptop screens used at the counter, with support for tablets where practical.

---

## Responsive Priorities

### Priority 1: Desktop POS

The POS register must work best on desktop or laptop screens.

Target screens:

- cashier counter computer
- laptop
- browser-based shop workstation

### Priority 2: Tablet-friendly operations

Inventory checks, customer lookup, and basic reporting should be usable on tablet-sized screens.

### Priority 3: Mobile read-only or limited tasks

Mobile support should focus on simple views first:

- dashboard summary
- customer lookup
- invoice lookup
- stock lookup

Full POS on small mobile screens is not confirmed for v1.

---

## Breakpoints

Recommended Tailwind breakpoint usage:

| Breakpoint | Usage |
|---|---|
| default | mobile layout |
| sm | small mobile improvements |
| md | tablet layout |
| lg | desktop layout |
| xl | wide desktop layout |
| 2xl | large dashboard or reporting layout |

---

## Layout Behavior

### Sidebar

Desktop:

- full sidebar visible
- grouped navigation
- active route clearly highlighted

Tablet:

- collapsible sidebar
- icon plus label where space allows

Mobile:

- drawer navigation
- bottom navigation only if later confirmed

### Header

Header should show:

- page title or current module
- user identity
- active role
- quick actions where useful
- logout or account menu

Do not overload the header with too many buttons.

---

## POS Layout Rules

### Desktop POS

Recommended desktop layout:

- left or center search and roll selection
- right cart panel
- sticky invoice total
- payment actions always visible

### Tablet POS

Recommended tablet layout:

- search first
- selected roll and measurement input next
- cart below or in drawer
- sticky checkout footer

### Mobile POS

Mobile POS is Pending Confirmation.

If implemented later, use a step-by-step flow:

1. Scan or search
2. Select roll
3. Enter measurement
4. Review cart
5. Payment
6. Print or share invoice

---

## Tables on Small Screens

Large ERP tables do not fit well on mobile.

Use one of these patterns:

- horizontal scroll for admin users
- card list for mobile
- column visibility controls
- detail drawer for row actions

Critical table columns should remain visible.

Examples:

Inventory roll table must prioritize:

- roll code
- product
- remaining length
- batch
- status

Sales table must prioritize:

- invoice number
- customer
- total
- payment status
- date

---

## Forms on Small Screens

Forms should become single-column below desktop width.

Rules:

- keep labels above inputs
- avoid two-column layouts on mobile
- keep primary action sticky only when the form is long
- show validation errors inline

---

## Reports and Dashboards

Dashboard cards should wrap naturally.

Recommended behavior:

```text
Desktop: 4 cards per row
Tablet: 2 cards per row
Mobile: 1 card per row
```

Charts should not be squeezed to unreadable sizes. On mobile, prefer simplified summaries and drill-down links.

---

## Printer and Barcode Considerations

Barcode scanner behavior should remain stable across screen sizes because most scanners behave like keyboard input.

Receipt printing is expected through browser-supported printing in the current scope. UI should provide a print action that works on desktop browsers first.

---

## Pending Confirmation

The following are not finalized:

- minimum supported screen width
- whether mobile POS is required in v1
- whether tablet counter usage is expected
- exact printer/browser compatibility matrix
- whether a dedicated kiosk mode is needed
