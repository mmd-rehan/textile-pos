# Inventory Permissions

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

### Admin

Full inventory access.

### Manager

Can view inventory, approve adjustments, and review reconciliation.

### Inventory Staff

Can enter rolls, print barcodes, perform stock counts, and prepare reconciliation.

### Cashier / Salesman

Can select rolls during POS but cannot manually edit inventory.

### Accountant

Read-only inventory visibility if needed for cost/profit reporting.

## Sensitive Inventory Actions

- Manual adjustment
- Roll reconciliation
- Mark roll damaged
- Delete or archive roll
- Change purchase cost
- Change sale price
- Override stock validation
