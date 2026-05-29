# Inventory Test Cases

## Core Test Cases

1. Create variable fabric product.
2. Create batch for product.
3. Enter purchase with multiple rolls of different lengths.
4. Generate unique barcode for each roll.
5. Deduct exact sale quantity from roll.
6. Deduct actual cut greater than billed quantity and create wastage.
7. Reject sale when actual cut exceeds remaining length.
8. Convert meter sale to base unit correctly.
9. Reconcile finished roll with zero physical remaining.
10. Reconcile roll with shortage and log shrinkage.
11. Reject duplicate barcode.
12. Prevent unauthorized inventory adjustment.
13. Show product stock summary from roll totals.
14. Mark small leftover as remnant candidate.
15. Verify inventory movement history after purchase, sale, wastage, and reconciliation.

## Edge Test Cases

- Fractional lengths such as 2.75 yards and 3.20 meters.
- Roll remaining exactly equals actual cut.
- Actual cut equals billed quantity.
- Actual cut less than billed quantity, pending business decision.
- Inactive product should not accept new rolls unless reactivated.
