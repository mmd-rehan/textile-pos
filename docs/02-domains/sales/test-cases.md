# Sales Test Cases

## Retail Tests

1. Complete cash sale for fabric by yards.
2. Complete cash sale for fabric by meters.
3. Complete sale where actual cut equals billed quantity.
4. Complete sale where actual cut is greater and wastage is logged.
5. Reject sale when actual cut exceeds roll remaining length.
6. Scan roll barcode and load correct roll.
7. Scan product barcode and require roll selection.
8. Print receipt after sale.

## Wholesale Tests

1. Create wholesale invoice for multiple rolls.
2. Create credit wholesale invoice and update customer ledger.
3. Apply customer-specific price, pending pricing configuration.
4. Generate delivery challan, pending confirmed format.

## Return Tests

1. Return fixed product quantity.
2. Attempt fabric return and follow confirmed policy.
3. Refund customer and create ledger/cash entry.

## Security Tests

- Cashier cannot delete invoice.
- Unauthorized user cannot override price.
- Duplicate sale submission does not create duplicate stock deduction.
