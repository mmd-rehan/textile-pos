# Customer API Contracts

## Candidate Endpoints

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `GET /customers/:id/ledger`
- `POST /customers/:id/payments`
- `GET /customers/:id/statement`
- `GET /customers/:id/pricing`

## Required Behavior

- Search by name, phone, and customer type.
- Ledger endpoints must support date filtering.
- Payment creation must be transactional.
- Ledger adjustments require permission and reason.
