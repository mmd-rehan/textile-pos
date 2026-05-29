# Sales Pricing Rules

## Confirmed Pricing Needs

- Retail sales require fast price entry or default sale price.
- Wholesale sales may require customer-specific pricing.
- Fabric pricing may be per yard or per meter.
- Fixed products use quantity-based pricing.
- Discounts may be required.

## Recommended Rule Shape

Pricing should resolve in this order once confirmed:

1. Customer-specific product price
2. Customer pricing tier price
3. Product/batch/roll sale price
4. Manual price override, only with permission

## Fabric Pricing

For fabric line items:

```text
line_total = billed_quantity_in_price_unit * unit_price
```

Inventory deduction remains based on actual cut, not billed quantity.

## Pending Confirmation

- Whether sale price is stored at product level, batch level, roll level, or all three.
- Whether price overrides are allowed for Cashier/Salesman.
- Whether wholesale customers receive fixed negotiated rates.
- Whether minimum margin controls are required.
