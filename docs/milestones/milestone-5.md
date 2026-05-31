Milestone 5: Suppliers, Purchases, Batch, and Roll Entry

Implement purchase entry and roll creation.

Backend modules:
- suppliers
- purchases
- batches
- rolls
- inventory
- barcode

Backend APIs:
- CRUD suppliers
- Create purchase order with purchase items
- Create or link batch during purchase
- Create multiple rolls from purchase
- Generate unique roll code
- Generate unique barcode value
- Create inventory movement for each roll
- Get purchase detail
- List purchases
- List rolls

Purchase flow:
1. Select supplier.
2. Select or create product.
3. Select or create batch/dye lot.
4. Enter multiple rolls.
5. Each roll has original length, remaining length, purchase price, sale price.
6. Generate barcode per roll.
7. Create PURCHASE_IN inventory movement per roll.
8. Update supplier ledger if payable remains.
9. Create audit log.

Frontend:
- Supplier list and form
- Purchase create page
- Multiple roll entry table
- Batch/dye lot fields
- Purchase detail page
- Roll list page
- Roll detail page
- Barcode display/download placeholder

Rules:
- Use transaction for creating purchase with rolls.
- If roll creation fails, entire purchase must rollback.
- Every roll must be individually trackable.
- Do not implement sale deduction yet.

Acceptance criteria:
- Admin can create supplier.
- Admin can post purchase with multiple rolls.
- Rolls are created with unique roll code and barcode.
- Inventory movements are created.
- Supplier ledger entry is created when payable exists.
- Roll list shows current remaining length.

Purchase currency rules:
- Purchases can be entered in different currencies.
- User must select purchase currency.
- If purchase currency differs from base currency, user must enter exchange rate to base currency.
- Store original purchase currency amounts.
- Store converted base currency amounts.
- Inventory valuation must use base currency.
- Supplier ledger should preserve original currency and base currency equivalent.
- Do not assume PKR everywhere.
- Do not implement sales multi-currency in this milestone.