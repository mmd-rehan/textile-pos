Milestone 11: Dashboard and Reports

Implement dashboard and v1 reports.

Backend reports:
- Dashboard summary
- Daily sales report
- Monthly sales report
- Current stock report
- Low stock rolls report
- Roll movement report
- Customer outstanding report
- Wastage report
- Purchase report
- Product-wise sales summary

Rules:
1. Reports must be read-only.
2. Reports must not mutate data.
3. Use server-side filters.
4. Use pagination for detail reports.
5. Use date range filters.
6. Use indexes where needed.
7. Avoid heavy report queries inside POS sale endpoint.

Frontend:
- /dashboard
- /reports/sales
- /reports/inventory
- /reports/wastage
- /reports/customers
- /reports/purchases
- Filters in URL query params where practical.
- Export button placeholder.
- Loading, empty, and error states.

Dashboard cards:
- Today sales
- Today invoices
- Total outstanding credit
- Low stock rolls
- Remnants count
- Wastage this month
- Fast-moving products placeholder

Acceptance criteria:
- Dashboard loads real data.
- Reports support date filters.
- Lists are paginated.
- Reports do not mutate records.
- Cashier cannot access financial reports unless permitted.

Currency rule:
- Sales reports use base currency.
- Purchase reports should show both original purchase currency and base currency totals.
- Profit reports must use base currency.
- Supplier payable reports may show original currency and base currency equivalent.