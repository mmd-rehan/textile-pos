# Settings Permissions

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

- Admin: full settings.
- Manager: limited operational settings if approved.
- Accountant: accounting/tax-related settings if approved.
- Cashier/Salesman: no settings access.
- Inventory Staff: no settings access except maybe barcode print preferences, pending confirmation.

## Sensitive Settings

- Tax settings
- Invoice numbering
- Inventory negative override
- Discount permissions
- Role/permission settings
