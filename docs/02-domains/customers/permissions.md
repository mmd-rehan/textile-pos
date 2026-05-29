# Customer Permissions

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

- Admin: full customer access.
- Manager: create/update customers, approve credit overrides.
- Cashier/Salesman: select customer and create basic customer if allowed.
- Accountant: manage payments and ledger adjustments.
- Inventory Staff: no customer financial access.

## Sensitive Customer Actions

- Credit limit change
- Ledger adjustment
- Customer deletion/archive
- Customer-specific price change
