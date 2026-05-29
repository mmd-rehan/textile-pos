# Accounting API Contracts

## Candidate Endpoints

- `GET /accounting/ledgers/customers/:customerId`
- `GET /accounting/ledgers/suppliers/:supplierId`
- `POST /accounting/customer-payments`
- `POST /accounting/supplier-payments`
- `GET /accounting/expenses`
- `POST /accounting/expenses`
- `GET /accounting/profit-loss`
- `GET /accounting/cash-summary`

## Required Behavior

- Financial writes require permission.
- Adjustment endpoints require reason.
- Reports must support date range filters.
