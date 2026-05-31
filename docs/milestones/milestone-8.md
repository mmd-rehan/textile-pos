Milestone 8: Customer Management and Credit Ledger

Implement customer management and customer credit ledger.

Backend modules:
- customers
- ledger
- sales
- audit

Backend APIs:
- CRUD customers
- GET /api/v1/customers
- GET /api/v1/customers/:id
- GET /api/v1/customers/:id/ledger
- POST /api/v1/customers/:id/payments
- GET /api/v1/customers/:id/outstanding

Customer fields:
- name
- phone
- address
- customerType: RETAIL, WHOLESALE, CREDIT
- creditLimit
- currentBalance
- status

Ledger rules:
1. Ledger entries are append-only.
2. Credit sale creates debit entry.
3. Customer payment creates credit entry.
4. Corrections must create adjustment entry.
5. Do not silently edit historical ledger entries.
6. Customer current balance can be stored for speed but must be reconcilable from ledger entries.
7. Credit limit must be checked during credit sale.

Frontend:
- Customer list
- Customer create/edit form
- Customer detail page
- Customer ledger page
- Receive payment modal
- Outstanding balance card
- Link customer to retail POS

Rules:
- Customer payment must run in transaction.
- Payment posting should support idempotency key.
- Backend validates payment amount.
- Audit credit limit changes and manual ledger adjustments.

Acceptance criteria:
- Admin/Manager can create customer.
- Cashier can select customer in POS if permitted.
- Credit sale updates customer ledger.
- Customer payment updates ledger.
- Ledger history is visible and paginated.
- Credit limit is enforced.

Currency rule:
- Customer ledger uses global/base sales currency only in v1.
- Do not implement customer ledger multi-currency yet.