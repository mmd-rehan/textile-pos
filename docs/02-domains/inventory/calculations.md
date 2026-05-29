# Inventory Calculations

## Base Unit Strategy

The backend should store lengths in a consistent base unit. The recommended base unit is yard because textile shops commonly work in yards, but the final base unit can be changed before database implementation if needed.

## Conversion

Confirmed conversion from source:

```text
1 meter = 1.09361 yards
1 yard = 0.9144 meters
```

## Sale Deduction

```text
remaining_after_sale = current_remaining - actual_cut_quantity_base
```

## Wastage

```text
wastage = actual_cut_quantity_base - billed_quantity_base
```

If wastage is greater than zero, create a wastage entry.

## Product Stock Summary

```text
product_available_stock = sum(remainingLengthBase of active rolls for product)
```

## Batch Stock Summary

```text
batch_available_stock = sum(remainingLengthBase of active rolls for product and batch)
```

## Reconciliation Difference

```text
reconciliation_difference = physical_remaining - expected_remaining
```

Negative difference means shortage/shrinkage/loss.
Positive difference means surplus or previous measurement error.

## Precision Rules

- Use Decimal in Prisma for lengths and money.
- Round display values only in UI.
- Do not round stored inventory movement quantities aggressively.
- Keep conversion utility centralized and tested.
