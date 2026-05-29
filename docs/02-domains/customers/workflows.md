# Customer Workflows

## Create Customer

1. User opens customer form.
2. User enters name, phone, address, customer type, and optional credit details.
3. Backend validates uniqueness rules.
4. Customer becomes available in POS.

## Credit Sale

1. User selects credit-enabled customer.
2. POS completes invoice with unpaid balance.
3. Backend creates customer ledger debit.
4. Outstanding balance updates.

## Receive Payment

1. User opens customer account.
2. User enters payment amount and method.
3. Backend creates payment record and ledger credit.
4. Outstanding balance updates.

## Statement

1. User opens customer statement.
2. Selects date range.
3. System shows opening balance, entries, and closing balance.
