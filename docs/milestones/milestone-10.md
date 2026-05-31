Milestone 10: Wholesale POS Foundation

Implement wholesale POS foundation.

Backend:
- Reuse sales module.
- Add POST /api/v1/sales/wholesale.
- Support wholesale customer required or strongly recommended.
- Support multiple roll lines.
- Support full roll sale and partial roll sale.
- Support customer-specific pricing placeholder.
- Support partial payment and credit balance.
- Create customer ledger debit for unpaid amount.
- Generate wholesale invoice response.
- Add delivery challan data structure placeholder.

Wholesale sale rules:
1. Wholesale flow is separate from retail.
2. Backend still deducts actual cut or full roll quantity.
3. Use transaction.
4. Use roll locking.
5. Create stock movement per roll.
6. Create customer ledger entry if credit remains.
7. Create audit log.
8. Use idempotency key.

Frontend:
- /pos/wholesale
- Wholesale customer selector
- Bulk line entry
- Roll search and barcode scan
- Multiple roll cart
- Wholesale pricing fields
- Partial payment
- Credit amount display
- Wholesale invoice print view
- Delivery challan placeholder

Rules:
- Do not merge retail and wholesale UI into one confusing flow.
- Reuse shared POS components where practical.
- Keep wholesale-specific behavior separate.

Acceptance criteria:
- Manager/Admin can create wholesale invoice.
- Multiple rolls can be sold in one invoice.
- Partial payment creates customer ledger balance.
- Inventory is deducted correctly.
- Receipt/invoice can be printed.

Currency rule:
- Wholesale sales use global/base currency only in v1.
- Do not add wholesale multi-currency yet.