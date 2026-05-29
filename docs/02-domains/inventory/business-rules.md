# Inventory Business Rules

## Rules

1. Inventory for variable-length fabric must be tracked per roll/thaan.
2. Product-level stock summaries are derived from roll records, not manually maintained as the source of truth.
3. Each roll must have a unique roll ID and barcode.
4. Each roll must store original length and current remaining length.
5. Each roll must link to product and batch/dye lot.
6. Inventory cannot become negative unless an approved override workflow is implemented.
7. Actual cut length must be deducted from inventory.
8. If actual cut is greater than billed quantity, the difference must be logged as wastage.
9. Finished rolls must be closed through roll reconciliation.
10. Small remaining pieces should be handled as remnants/chants when the business threshold is confirmed.
11. All inventory movements must be traceable.

## Derived Stock

Product stock is calculated by summing active roll remaining lengths by product, batch, and unit.

## Pending Business Decisions

- Exact remnant threshold. Source examples mention less than 2 yards, but final threshold should be configurable.
- Whether negative stock override is allowed at all in version 1.
- Whether damaged fabric is handled as wastage, adjustment, remnant, or a separate damage workflow.
