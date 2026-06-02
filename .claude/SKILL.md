You are working on a Textile ERP & POS System for fabric shops.

Important project rules:
1. This is a v1 single-shop system.
2. Do not implement multi-branch, offline sync, mobile app, RFID, AI forecasting, or native printer drivers yet.
3. Frontend stack: Vite + React + TypeScript + Tailwind CSS.
4. Backend stack: Node.js + NestJS + TypeScript.
5. Database: MySQL.
6. ORM: Prisma.
7. API style: REST.
8. Authentication: email/username + password, JWT/session-based login, role-based permissions.
9. Inventory must be roll-based, not product-level only.
10. A roll/thaan is the true inventory unit for fabric.
11. All inventory and financial writes must happen on the backend.
12. Frontend can preview values, but backend is the source of truth.
13. Do not use floating-point math for money or fabric length.
14. Use Decimal-safe handling for money and measurements.
15. Every stock-changing operation must create a stock movement.
16. Actual cut quantity must be used for inventory deduction.
17. If actual cut is greater than billed quantity, create a wastage record.
18. Ledger records should be append-only.
19. Critical actions must create audit logs.
20. Controllers must stay thin. Business rules belong in services.
21. Use transactions for sales, purchases, customer payments, roll reconciliation, inventory adjustments, and invoice voiding.
22. Do not silently edit confirmed invoices, ledgers, stock movements, or audit logs.
23. Implement only the current milestone. Do not jump ahead.
24. At the end, provide:
   - Files created or changed
   - What works now
   - What remains pending
   - How to test this milestone
   - Any assumptions made

Currency rules:
1. Sales in v1 should use one global/base selling currency only.
2. Do not add full sales multi-currency in v1.
3. Purchases must support multiple currencies such as PKR, AED, USD, EUR, GBP, SAR, INR, etc.
4. Currencies should be stored using currency codes, for example PKR, AED, USD.
5. Do not hardcode purchase logic to only PKR.
6. Store purchase amounts in the original purchase currency.
7. Also store converted base currency amounts for inventory valuation, profit reporting, and internal accounting.
8. Store the exchange rate used at the time of purchase.
9. Do not rely on live exchange rates in v1.
10. The exchange rate should be manually entered by admin/user during purchase if purchase currency differs from base currency.
11. Sale prices and sale invoices should remain in the global/base currency for now.
12. Purchase currency support must not break roll costing, supplier ledger, reports, or future accounting.
13. Use Decimal-safe handling for all currency amounts and exchange rates.
14. Do not implement advanced foreign exchange gain/loss accounting yet unless explicitly requested later.

Supplier purchase payment rules:
1. Purchase creation may include an initial payment.
2. If purchase is partially paid or unpaid, the system must support recording later supplier payments.
3. Supplier payments must create supplier payment records and supplier ledger entries.
4. Purchase payment status must be recalculated after payment.
5. Supplier ledger entries must be append-only.
6. Supplier payments must be transaction-safe and audit logged.
7. For v1, supplier payment can be linked directly to one purchase.
8. Do not implement complex multi-purchase payment allocation unless explicitly requested later.

Catalog master data rules:
1. If a form uses dropdown values such as color, design, brand, category, batch, or unit, the admin area must provide a way to manage those values.
2. Product colors and product designs are master data.
3. Purchase forms may support quick-create for color/design to avoid blocking the workflow.
4. Dropdowns should use active records only.
5. Do not hardcode color/design values in frontend.

Product type inventory rules:
1. Product is the catalog/sellable definition.
2. Roll is only required for variable-length fabric products.
3. FABRIC_ROLL products are purchased as one or more rolls with individual lengths.
4. FABRIC_ROLL products are sold by yard/meter from a selected roll.
5. FIXED_PRODUCT products are purchased as quantity stock, not rolls.
6. FIXED_PRODUCT products are sold by piece/unit, not yard/meter.
7. CUT_PIECE products are purchased as quantity stock in v1 unless explicitly created from a roll later.
8. CUT_PIECE products are sold by piece/unit in v1.
9. Purchase forms must change based on product type.
10. POS behavior must change based on product type.
11. Do not ask for roll length for fixed products or cut pieces.
12. Do not require roll barcode for fixed products or cut pieces.
13. Product barcode or product-variant barcode should be searchable in POS.
14. Product search in POS must not assume every product has rolls.
15. Stock movements are required for both roll-based and quantity-based inventory.
16. For roll products, stock movement references rollId and quantityYard.
17. For fixed/cut products, stock movement references productId or productVariantId and quantity.