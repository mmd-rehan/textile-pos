# Invoice Rules

## Invoice Requirements

Invoices should store enough detail to explain the sale later.

## Required Invoice Data

- Invoice number
- Sale type: RETAIL or WHOLESALE
- Customer, optional for walk-in retail
- Sale date/time
- Cashier/user
- Line items
- Discounts
- Payments
- Balance due
- Status

## Fabric Line Item Data

- Product
- Batch/dye lot
- Roll ID
- Billed quantity
- Actual cut quantity
- Unit
- Unit price
- Line total
- Wastage quantity if any

## Invoice Statuses

Recommended statuses:

- DRAFT
- COMPLETED
- CANCELLED
- RETURNED_PARTIAL
- RETURNED_FULL

## Rules

- Completed invoices should not be silently edited.
- Corrections should use cancellation, return, refund, or adjustment workflows.
- Invoice deletion should be restricted.

## Pending Confirmation

- Invoice numbering format.
- Receipt layout.
- Whether invoice cancellation is allowed after end-of-day closing.
