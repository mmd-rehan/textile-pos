# Reports API Contracts

## Candidate Endpoints

- `GET /reports/dashboard`
- `GET /reports/inventory/current-stock`
- `GET /reports/sales`
- `GET /reports/wholesale`
- `GET /reports/customers/outstanding`
- `GET /reports/accounting/profit-loss`
- `GET /reports/wastage`
- `GET /reports/remnants`
- `GET /reports/export/:reportType`

## Required Behavior

- Support date range filters.
- Enforce report permissions.
- Use pagination for detailed reports.
- Use optimized queries and indexes for large datasets.
