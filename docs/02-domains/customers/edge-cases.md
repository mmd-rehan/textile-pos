# Customer Edge Cases

## Edge Cases

- Duplicate phone number.
- Customer has unpaid balance and user attempts archive.
- Credit limit exceeded.
- Payment amount exceeds outstanding balance.
- Refund creates negative balance.
- Customer-specific price missing for wholesale item.
- Customer ledger entry created but invoice transaction fails.

## Rules

Use database transactions for invoice plus ledger changes. Never create financial records without source consistency.
