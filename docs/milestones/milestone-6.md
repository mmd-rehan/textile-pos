Milestone 6: Barcode Lookup and Inventory Views

Implement barcode lookup and inventory visibility.

Backend APIs:
- GET /api/v1/barcodes/:barcode/lookup
- GET /api/v1/rolls
- GET /api/v1/rolls/:id
- GET /api/v1/rolls/:id/movements
- GET /api/v1/inventory/movements
- GET /api/v1/inventory/stock-summary

Barcode lookup behavior:
1. If barcode belongs to a roll, return roll, product, batch, remaining length, status, sale price.
2. If barcode belongs to a product, return product and available rolls.
3. Unknown barcode returns BARCODE_NOT_FOUND.
4. Finished or damaged roll should return a warning or blocked status.

Frontend:
- Roll inventory page
- Roll detail page
- Inventory movement history
- Barcode lookup test page
- Clear loading and error states
- Server-side pagination, filtering, sorting

Rules:
- Barcode lookup must return current database state.
- Do not rely on cache for remaining roll length.
- Do not create sale yet.
- Roll remaining length is read-only in this milestone.

Acceptance criteria:
- Scanning or entering roll barcode returns correct roll.
- Roll detail shows movement history.
- Inventory list can filter by product, batch, and status.
- Unknown barcode shows clean error.