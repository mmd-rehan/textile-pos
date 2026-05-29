# Barcode Permissions

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

- Admin: generate and print all barcodes.
- Manager: generate/reprint.
- Inventory Staff: generate/reprint roll labels.
- Cashier/Salesman: scan barcodes in POS, limited reprint if confirmed.
- Accountant: no barcode management.
