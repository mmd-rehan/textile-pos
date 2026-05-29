# Purchase Cost Calculations

## Cost Fields

- Purchase price
- Roll-level purchase cost
- Additional landed cost components, pending confirmation
- Effective cost per yard/meter

## Basic Calculation

```text
cost_per_base_unit = total_roll_cost / original_length_base
```

## Purchase Total

```text
purchase_total = sum(line_amounts) + additional_costs - discounts
```

## Pending Confirmation

- Whether purchase cost is entered per roll, per unit, or total.
- Whether landed costs are allocated by roll length, value, or manually.
- Whether purchase discounts are needed in version 1.
