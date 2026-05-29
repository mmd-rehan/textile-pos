# Retail Sales Flow

## Goal

Retail POS must support fast walk-in billing with barcode scanning, quick measurement entry, mixed product types, discounts, and receipt printing.

## Flow

1. Cashier opens Retail POS.
2. Cashier scans barcode or searches product.
3. System identifies product or roll.
4. For fabric, cashier selects roll if barcode did not directly identify a roll.
5. Cashier enters billed quantity and unit.
6. Cashier enters actual cut quantity if different.
7. System calculates total amount, remaining stock preview, and wastage if applicable.
8. Cashier adds line to cart.
9. Cashier selects customer, optional for walk-in cash sale.
10. Cashier applies discount if permitted.
11. Cashier records payment.
12. Backend creates invoice, sale lines, payment records, inventory movements, and ledger entries.
13. Receipt is printed through browser print.

## Speed Requirement

Retail invoice completion target is under 60 seconds. Barcode scan response target is under 300ms.

## Rules

- Backend performs final stock validation.
- Actual cut controls stock deduction.
- Billed quantity controls customer charge.
- Wastage is logged automatically when actual cut is greater than billed quantity.
- Cashier cannot silently change inventory.

## Pending Confirmation

- Whether walk-in customers are stored as a default customer record.
- Whether retail credit sales are allowed or only selected customers can buy on credit.
