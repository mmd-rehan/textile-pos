Milestone 7.1: Product-Type Inventory and POS Correction

Review the current implementation completed up to Milestone 7 Retail POS MVP.

The current system is too roll-centric. It treats every purchased product as if it must have roll details and length in yards. This is correct only for fabric roll products, but wrong for fixed products and cut pieces.

Fix the system so inventory and POS behavior depends on product type.

Product types:
1. FABRIC_ROLL
   - Examples: Wash & Wear, Cotton, Lawn, Silk, Palachi
   - Purchased as rolls/thaan
   - Requires roll length
   - Requires batch/dye lot
   - Can generate roll barcode
   - Sold by yard/meter
   - POS must select roll
   - Inventory deducted from roll remaining length using actual cut

2. FIXED_PRODUCT
   - Examples: Kashmiri shawls, scarves, blankets, tops, shirts, pent, tie, handkerchief, accessories
   - Purchased as quantity stock
   - Does not require roll
   - Does not require length in yards
   - Can have color, design, description, location
   - Can have optional product or variant barcode
   - Sold by piece/unit
   - POS should add directly to cart with quantity

3. CUT_PIECE
   - Examples: 3-piece suits, kids suits, ready-cut suits, unstitched suit packs
   - For v1, treat as quantity stock
   - Does not require roll length during normal purchase
   - Can have color, design, description, location
   - Can have optional barcode
   - Sold by piece/unit
   - Later we may add "create cut piece from master roll", but do not implement that now

Required backend changes:
1. Review Prisma schema and services.
2. Ensure purchase flow supports two line modes:
   - Roll-based purchase lines for FABRIC_ROLL
   - Quantity-based purchase lines for FIXED_PRODUCT and CUT_PIECE
3. Add or update inventory stock model for quantity-based products.
   Possible simple v1 approach:
   - product_stock_items or product_inventory_balances
   - productId
   - colorId optional
   - designId optional
   - barcodeValue optional
   - quantityOnHand
   - unitId
   - purchasePricePerUnitBaseCurrency
   - salePricePerUnitBaseCurrency
   - location optional
   - status
4. Do not force roll creation for FIXED_PRODUCT or CUT_PIECE.
5. Inventory movements must support both:
   - roll-based movements with rollId and quantityYard
   - quantity-based movements with productId/productStockItemId and quantity
6. Purchase posting must create stock movements for fixed/cut products too.
7. Retail sale API must support both:
   - roll sale lines
   - quantity product sale lines
8. For quantity product sale lines:
   - validate available quantity
   - deduct quantity
   - create sale invoice item
   - create inventory movement
   - do not require actual cut
   - do not create wastage
   - do not require rollId
9. Barcode lookup must support:
   - ROLL barcode
   - PRODUCT barcode
   - PRODUCT_STOCK_ITEM or PRODUCT_VARIANT barcode
10. If barcode belongs to FABRIC_ROLL product:
   - return product with available rolls
11. If barcode belongs to FIXED_PRODUCT or CUT_PIECE:
   - return product stock item with quantity and price
12. Product search in POS must search:
   - product name
   - product code
   - product barcode
   - stock item barcode
   - roll barcode
13. Fix product view route.
   - Product list view icon must navigate to product detail page, not root URL.
   - Use route such as /products/:id or existing project route pattern.

Required frontend changes:
1. Purchase form must change based on selected product type.
2. For FABRIC_ROLL:
   - show batch/dye lot
   - show roll rows
   - show length in yards/meters
   - show buy per yard
   - show sale per yard
   - show roll barcode generation
3. For FIXED_PRODUCT:
   - hide roll length
   - hide roll rows
   - show quantity
   - show unit
   - show buy per unit
   - show sale per unit
   - show color
   - show design
   - show barcode optional
   - show location optional
   - show description optional
4. For CUT_PIECE:
   - same as fixed product for v1
5. Retail POS must not be barcode-only.
6. Retail POS should allow:
   - barcode scan
   - product name search
   - product code search
7. Retail POS cart must support two line types:
   - FABRIC_ROLL line
   - QUANTITY_PRODUCT line
8. For FABRIC_ROLL cart line:
   - roll required
   - billed quantity
   - actual cut
   - unit yard/meter
   - wastage preview
9. For QUANTITY_PRODUCT cart line:
   - roll not required
   - quantity
   - unit price
   - discount
   - no actual cut
   - no wastage
10. If searching "Summer Collection Catalog Item 4" and it is Fixed Product:
   - POS should show available quantity and allow adding to cart
   - it must not show "No rolls in stock"
11. Product barcode field must be searchable in POS if provided.
12. If product has no barcode, product name and product code search must still work.

Acceptance criteria:
1. Fabric roll product purchase still works with roll length.
2. Fixed product purchase works without roll length.
3. Cut piece purchase works without roll length.
4. Product stock quantity increases after fixed/cut product purchase.
5. Roll stock still increases after fabric roll purchase.
6. POS can sell fabric from roll by yard/meter.
7. POS can sell fixed product by piece.
8. POS can sell cut piece by piece.
9. Product barcode is searchable in POS.
10. Product name and product code are searchable in POS.
11. Fixed product search does not show "No rolls in stock".
12. Product view icon opens product detail page.
13. Stock movements are created for all product types.
14. Backend tests cover:
    - purchase fabric roll
    - purchase fixed product
    - purchase cut piece
    - sell fabric roll
    - sell fixed product
    - sell cut piece
    - barcode lookup for roll
    - barcode lookup for fixed product
    - product search without barcode
15. Do not start wholesale changes yet.