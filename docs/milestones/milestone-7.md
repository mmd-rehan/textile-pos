Milestone 7: Retail POS MVP

Implement Retail POS MVP end to end.

Backend modules involved:
- sales
- rolls
- inventory
- barcode
- customers
- ledger
- audit

Backend API:
- POST /api/v1/sales/retail
- GET /api/v1/sales/:id
- GET /api/v1/sales/:id/receipt

Retail sale request should support:
- customerId optional
- lines[]
  - productId
  - rollId required for FABRIC_ROLL
  - billedQuantity
  - actualCutQuantity optional
  - unit: YARD or METER
  - unitPrice
  - discountAmount
- payments[]
  - method
  - amount
- notes

Backend sale rules:
1. Use Idempotency-Key header.
2. Start database transaction.
3. Create invoice.
4. For each fabric roll line:
   - lock roll row
   - validate roll status
   - convert billed and actual cut to yard
   - actual cut defaults to billed quantity
   - prevent negative remaining length
   - deduct actual cut from roll remaining length
   - create sale invoice item
   - create inventory movement
   - create wastage entry if actual cut > billed quantity
5. Calculate totals on backend.
6. Create payment records.
7. If unpaid balance exists, create customer ledger debit.
8. Create audit log.
9. Commit transaction.
10. Return invoice and receipt data.

Frontend POS:
- /pos/retail
- Barcode input remains focused.
- Barcode Enter triggers lookup.
- Roll barcode directly adds/selects roll.
- Product barcode shows available rolls.
- Cart table.
- Measurement input with billed quantity, actual cut, unit.
- Show conversion preview.
- Show remaining after cut preview.
- Show wastage if actual cut differs.
- Payment panel.
- Discount field.
- Complete sale button.
- Receipt preview and browser print.

Rules:
- Frontend cart is only a draft.
- Backend confirms final deduction.
- Do not optimistically update roll remaining length.
- Disable submit while sale is being posted.
- Show backend validation errors clearly.

Acceptance criteria:
- Cashier can scan roll, enter quantity, take payment, and post sale.
- Roll remaining length is deducted by actual cut.
- Wastage is created when actual cut is greater than billed quantity.
- Invoice is created.
- Payment is recorded.
- Receipt can be printed.
- Double-click sale submit does not duplicate sale.

Currency rule:
- Retail sales use only the global/base currency in v1.
- Do not add currency selector to POS.
- Sale invoice amounts, payments, discounts, and receipts should use base currency.
- Profit calculation should compare sale amount in base currency against roll purchase cost in base currency.