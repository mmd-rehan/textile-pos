# Accounting Permissions

## Permission Principle

Permissions must be enforced on the backend. Frontend permission checks only hide or disable UI elements.

Critical actions should be restricted to approved roles:

- Inventory adjustments
- Roll reconciliation
- Invoice deletion or cancellation
- Refund approval
- Negative stock override
- Price override
- Credit limit override
- Accounting adjustment entries

## Audit Requirement

Every sensitive operation must produce an audit trail with:

- Actor user ID
- Action type
- Entity type
- Entity ID
- Previous value where applicable
- New value where applicable
- Reason where applicable
- Timestamp

## Suggested Access

- Admin: full accounting access.
- Accountant: ledgers, payments, expenses, reconciliation, reports.
- Manager: operational summaries and approvals.
- Cashier/Salesman: receive POS payments only.
- Inventory Staff: no financial access.

## Sensitive Accounting Actions

- Ledger adjustment
- Refund
- Expense deletion
- Payment cancellation
- Financial report access
