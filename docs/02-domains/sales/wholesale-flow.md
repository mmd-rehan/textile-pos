# Wholesale Sales Flow

## Goal

Wholesale POS supports bulk customers, multiple rolls, credit orders, customer-specific pricing, delivery challan, and roll-wise billing.

## Flow

1. User opens Wholesale POS.
2. User selects wholesale customer.
3. System loads customer pricing and outstanding balance.
4. User adds full rolls or measured quantities from selected rolls.
5. User may group items by product, batch, or roll depending on invoice layout.
6. System validates stock roll by roll.
7. User applies approved discounts or customer pricing.
8. User selects payment method or credit sale.
9. Backend creates invoice, inventory movements, payment/ledger entries, and optional delivery challan.

## Rules

- Wholesale customers should normally be required for wholesale invoices.
- Credit sale must update customer ledger.
- Batch selection must be visible.
- Full-roll sale should still reference individual roll IDs.

## Pending Confirmation

- Delivery challan format.
- Whether wholesale invoices require GST/VAT fields in version 1.
- Whether wholesale pricing is per customer, per tier, per product, or manually entered.
