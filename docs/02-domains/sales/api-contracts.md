# Sales API Contracts

## Candidate Endpoints

### Retail POS

- `POST /sales/retail/preview`
- `POST /sales/retail/complete`

### Wholesale POS

- `POST /sales/wholesale/preview`
- `POST /sales/wholesale/complete`

### Invoices

- `GET /sales/invoices`
- `GET /sales/invoices/:id`
- `POST /sales/invoices/:id/cancel`
- `POST /sales/invoices/:id/reprint`

### Returns

- `POST /sales/returns/preview`
- `POST /sales/returns/complete`

## Required Behavior

- Completion endpoints must run inside a database transaction.
- Stock deduction must happen on the backend.
- Invoice creation, payments, ledger entries, inventory movements, and wastage entries must commit together.
- If any step fails, the transaction must roll back.

## Validation Errors

- `INSUFFICIENT_ROLL_STOCK`
- `ROLL_NOT_ACTIVE`
- `INVALID_UNIT`
- `CUSTOMER_CREDIT_LIMIT_EXCEEDED`
- `DISCOUNT_NOT_ALLOWED`
- `PAYMENT_MISMATCH`
