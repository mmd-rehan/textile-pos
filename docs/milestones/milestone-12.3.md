You are continuing the Textile ERP & POS System.

Current state:
- Retail POS is working.
- Customer selection in POS is optional.
- Walk-in customer sale is supported.
- Customer module exists.
- Sales can be created.
- Sales history page exists but is incomplete.

Now implement two focused enhancements:

1. Add customer quick-create popup inside POS.
2. Complete the Sales History page.

Do not add unrelated features.
Do not change inventory deduction logic.
Do not change currency architecture.
Do not implement returns/refunds unless already partially available.
Do not implement invoice voiding unless permissions and backend already exist.
Focus only on customer quick-create and sales history completion.

Part A: POS Customer Quick Create

Current issue:
In POS, cashier can select an existing customer or leave customer empty for walk-in customer. But if a new customer comes, cashier must leave POS screen to create customer.

Required behavior:
1. In Retail POS customer selector, add button:
   "+ Add Customer"

2. Clicking it opens a modal/popup, not a full page navigation.

3. Modal fields:
   - Name, required
   - Phone, optional or required based on current customer validation
   - Address, optional
   - Customer Type, default RETAIL
   - Credit Limit, default 0
   - Notes, optional if supported

4. Keep the quick-create form simple for cashier use.

5. After customer is created:
   - Close modal
   - Refresh customer search/list query
   - Auto-select the newly created customer in POS
   - Show success message
   - Keep existing POS cart unchanged

6. If customer creation fails:
   - Show validation errors inside modal
   - Do not clear POS cart
   - Do not close modal automatically

7. Cashier permission:
   - Cashier should be allowed to create basic retail customer if business rules allow.
   - If current permission system blocks this, add a specific permission such as:
     customers.create_basic
   - Admin and Manager can create all customer types.
   - Cashier should not be allowed to set high credit limit unless explicitly permitted.
   - For cashier quick-create, default creditLimit to 0.

8. Customer selector behavior:
   - Allow searching customer by name or phone.
   - Keep "Walk-in Customer" or "No customer selected" option.
   - Customer remains optional for normal cash sale.
   - Credit sale should require customer selection.

9. Backend:
   - Reuse existing create customer API if suitable.
   - If needed, support a quick-create endpoint:
     POST /api/v1/customers/quick-create
   - Validate duplicate phone if phone uniqueness is enforced.
   - Create audit/activity log if customer creation is audited.
   - Return the newly created customer object.

10. Frontend:
   - Add CustomerQuickCreateModal component.
   - Reuse existing customer form validation where practical.
   - Use React Hook Form and Zod if already used.
   - Use TanStack Query mutation.
   - Invalidate customer query keys after success.

Acceptance criteria:
1. Cashier can create a new customer from POS without leaving the page.
2. New customer is auto-selected after creation.
3. Existing POS cart remains unchanged.
4. Walk-in customer flow still works.
5. Credit sale requires a selected customer.
6. Validation errors are displayed clearly.
7. Permissions are respected.

Part B: Complete Sales History Page

Current issue:
Sales history page is incomplete.

Required Sales History features:
1. Sales list with server-side pagination.
2. Search and filters:
   - Invoice number
   - Customer name or phone
   - Sale type: RETAIL / WHOLESALE
   - Payment status: PAID / PARTIAL / UNPAID / CREDIT if available
   - Invoice status: CONFIRMED / CANCELLED / RETURNED if available
   - Date range
   - Cashier/user
   - Minimum/maximum total amount if practical

3. Table columns:
   - Invoice No
   - Date/time
   - Customer
   - Sale Type
   - Total
   - Paid
   - Balance/Due
   - Payment Status
   - Invoice Status
   - Cashier
   - Actions

4. Actions:
   - View invoice
   - Print receipt/invoice
   - Open customer detail if customer exists
   - Void/return buttons only if already supported and permission-protected. Do not implement new void/return workflow in this milestone unless already existing.

5. Sale detail view:
   - Invoice header
   - Customer info or Walk-in Customer
   - Cashier
   - Sale date/time
   - Line items
   - For fabric roll lines show:
     - Product
     - Roll code
     - Batch
     - Billed quantity
     - Actual cut quantity
     - Unit
     - Wastage if any
     - Unit price
     - Line total
   - For fixed/cut-piece lines show:
     - Product
     - Color/design if available
     - Quantity
     - Unit
     - Unit price
     - Line total
   - Payment summary
   - Currency code from saved sale invoice currencyCode
   - Receipt print button

6. Backend APIs:
   - Ensure GET /api/v1/sales supports pagination, filtering, and sorting.
   - Ensure GET /api/v1/sales/:id returns full invoice detail.
   - Ensure GET /api/v1/sales/:id/receipt returns printable receipt data if already part of system.
   - Response should follow existing success envelope.
   - Decimal values should be returned safely as strings.
   - Do not expose stack traces.

7. Frontend:
   - Complete SalesHistoryPage.
   - Add SaleDetailPage or modal depending on current route structure.
   - Use URL query params for filters where practical.
   - Use loading, empty, and error states.
   - Use saved invoice currencyCode for historical sales display.
   - Do not use current base currency to relabel old invoices.

8. Reports/dashboard consistency:
   - After creating a sale, Sales History should show the new sale.
   - After customer quick-create and sale completion, customer name should appear in Sales History.

9. Permissions:
   - Admin and Manager can view all sales.
   - Cashier can view own sales unless current business rules allow all.
   - Accountant can view sales history if permission allows.
   - Financial totals should respect permissions if such restrictions already exist.

Acceptance criteria:
1. Sales history page shows real sales data.
2. Pagination works.
3. Date filter works.
4. Invoice number search works.
5. Customer search works.
6. Sale type filter works.
7. Payment status filter works if supported by backend.
8. View invoice works.
9. Print receipt works.
10. Walk-in customer sales display correctly.
11. Fixed product sales display correctly.
12. Fabric roll sales display roll, billed quantity, actual cut, and wastage.
13. Historical invoice currency is shown from sale invoice currencyCode.
14. No inventory or ledger behavior is changed.

Testing:
Add or update tests for:
1. POS quick-create customer modal opens.
2. Customer can be created from POS.
3. Newly created customer is auto-selected.
4. POS cart is not cleared after customer creation.
5. Sales history fetches paginated data.
6. Sales history filters by invoice number.
7. Sales history filters by date range.
8. Sale detail shows fabric roll line correctly.
9. Sale detail shows fixed product line correctly.
10. Sale detail uses saved invoice currencyCode.

At the end, report:
1. Files changed.
2. APIs added or updated.
3. UI screens/components added or updated.
4. How to test manually.
5. Any assumptions made.
6. Whether it is safe to move to final testing and hardening.