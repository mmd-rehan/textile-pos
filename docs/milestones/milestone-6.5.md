Milestone 6.5: Supplier Payments + Color/Design Master Data

Before moving to Milestone 7 Retail POS MVP, review the implementation completed up to Milestone 6.

Fix two missing workflows:

1. Supplier purchase due payment workflow
2. Product color and design master data management

Part A: Supplier Purchase Payment Workflow

Current issue:
- Purchase creation allows initial payment.
- Purchase can become PARTIALLY_PAID.
- But there is no way to record additional payment later.

Required behavior:
1. Add a "Record Payment" action on purchase detail page when purchase has due amount.
2. Add supplier payment API.
3. Add supplier payment history.
4. Add supplier ledger entry for each payment.
5. Update purchase paid amount and due amount.
6. Update purchase payment status:
   - UNPAID
   - PARTIALLY_PAID
   - PAID
7. Payment must be transaction-safe.
8. Payment must create audit log.
9. Payment must use Decimal-safe money handling.
10. Do not silently edit old supplier ledger entries.
11. Do not hard-delete payment records.
12. Do not implement advanced multi-purchase payment allocation yet.

Recommended backend endpoints:
- POST /api/v1/purchases/:purchaseId/payments
- GET /api/v1/purchases/:purchaseId/payments
- GET /api/v1/suppliers/:supplierId/ledger

Payment request:
{
  "amount": "1000.00",
  "paymentMethod": "CASH",
  "paymentDate": "2026-05-31",
  "notes": "Second payment"
}

If purchase supports multi-currency:
- Payment should default to the purchase currency.
- Store amount in original purchase currency.
- Store base currency equivalent using the purchase exchange rate.
- Do not add advanced forex gain/loss accounting now.

Frontend requirements:
1. On purchase detail page, show:
   - Total amount
   - Paid amount
   - Due amount
   - Payment status
2. Add "Record Payment" modal.
3. Validate payment amount:
   - must be greater than zero
   - must not exceed due amount unless override is explicitly implemented, but do not implement override now
4. Show payment history table.
5. Show supplier ledger link or section.
6. Invalidate purchase detail, purchase list, supplier ledger, and dashboard queries after successful payment.

Part B: Product Color and Design Management

Current issue:
- Purchase roll entry uses Color and Design dropdowns.
- But dashboard/admin has no screen to add colors and designs.

Required behavior:
1. Add Product Colors management page.
2. Add Product Designs management page.
3. Add CRUD APIs for product colors and product designs.
4. Add sidebar/navigation links under Product Catalog or Settings:
   - Categories
   - Brands
   - Colors
   - Designs
   - Products
   - Batches
5. Color fields:
   - name
   - code optional
   - hexCode optional
   - status ACTIVE/INACTIVE
6. Design fields:
   - name
   - code optional
   - description optional
   - status ACTIVE/INACTIVE
7. Purchase form dropdowns should load active colors and active designs.
8. Add quick-create option from purchase form:
   - + Add Color
   - + Add Design
9. After creating color/design from modal, refresh dropdown and auto-select the newly created value.
10. Backend validation must prevent duplicate names or duplicate codes if code is provided.
11. Use permissions:
   - Admin and Manager can manage colors/designs.
   - Cashier cannot manage them.
12. Add tests for APIs and basic frontend form validation.

Acceptance criteria:
1. Purchase partial payment can be completed later.
2. Purchase payment history is visible.
3. Supplier ledger updates after payment.
4. Purchase status changes from PARTIALLY_PAID to PAID when fully paid.
5. Admin can create/edit/delete or deactivate colors.
6. Admin can create/edit/delete or deactivate designs.
7. Purchase form dropdowns show colors and designs.
8. Purchase form supports quick-create color/design.
9. No Retail POS work is started yet.