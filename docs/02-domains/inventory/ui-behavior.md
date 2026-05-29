# Inventory UI Behavior

## Main Screens

- Categories list
- Products list
- Product detail
- Batch list
- Roll list
- Roll detail
- Roll entry form
- Roll reconciliation screen
- Inventory movement history
- Remnant list

## UI Rules

- Show product stock as a derived summary from active rolls.
- Roll detail must show original length, remaining length, batch, supplier, barcode, and movement history.
- Roll status should be clearly visible.
- Reconciliation must require a reason.
- Manual adjustment must require permission and reason.
- Barcode should be visible and printable from roll detail.
- Batch/dye lot must be visible wherever roll selection happens.

## POS Support

Inventory UI and POS roll selector must share consistent roll naming:

```text
Roll Code | Product | Batch | Remaining Length
```

## Pending Confirmation

- Exact roll list columns.
- Whether roll labels include sale price.
- Whether product image support is required in version 1.
