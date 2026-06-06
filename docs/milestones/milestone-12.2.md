Milestone 12.2: Currency Cleanup, Migration Safety, and Settings Consistency

Before moving to testing/hardening, clean up the currency implementation and migration workflow.

Goals:
1. Make currency implementation production-safe.
2. Fix remaining UI consistency issues.
3. Ensure seed data is idempotent.
4. Ensure Prisma migration workflow is correct.
5. Do not add new business modules.
6. Do not implement live exchange-rate APIs.
7. Do not implement historical exchange-rate import.
8. Do not implement sales multi-currency.

Part A: Migration safety

Review the current Prisma schema and migration files.

Required:
1. Confirm the migration file for currency changes exists:
   prisma/migrations/20260606000000_add_currency_exchange_rates_and_snapshots/migration.sql

2. Confirm it matches the current schema changes:
   - Currency decimalPlaces
   - CurrencyExchangeRate model/table
   - PurchaseOrder.baseCurrencyCodeAtTime
   - SupplierPayment.baseCurrencyCodeAtTime
   - SupplierLedgerEntry.baseCurrencyCodeAtTime
   - SaleInvoice.currencyCode

3. Do not use prisma db push as the final approach.
4. Ensure the README or backend docs explain:
   - Local development migration command
   - Production migration command
   - Seed command

Required commands to document:
   npx prisma migrate dev
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed

5. Add a note:
   - db push is only for temporary local experiments.
   - shared/staging/production environments must use migrations.

6. If migration SQL is missing or incomplete, create/fix the migration file.
7. Do not reset the database unless explicitly required.
8. Do not destroy existing data.

Acceptance criteria:
- Prisma schema and migration are aligned.
- Migration file is committed.
- README/docs clearly explain proper migration flow.
- No instruction tells developers to use db push for shared or production.

Part B: Currency seed cleanup

Update the seed script to handle currencies and exchange-rate defaults safely.

Required:
1. Seed common currencies idempotently:
   - PKR
   - AED
   - USD
   - GBP
   - EUR
   - SAR
   - INR
   - CNY
   - TRY

2. Each currency should have:
   - code
   - name
   - symbol
   - decimalPlaces
   - isActive

3. Seed base self-rates safely where practical:
   - PKR to PKR = 1
   - AED to AED = 1
   - USD to USD = 1
   - GBP to GBP = 1
   - EUR to EUR = 1
   - SAR to SAR = 1
   - INR to INR = 1
   - CNY to CNY = 1
   - TRY to TRY = 1

4. Do not seed fake real-world exchange rates for cross-currency pairs.
5. Cross-currency rates such as PKR to GBP or AED to GBP should be manually entered by Admin.
6. Seed must be idempotent.
7. Running seed multiple times must not create duplicates.
8. Existing manually entered exchange rates must not be overwritten by seed.

Acceptance criteria:
- Seed creates common currencies.
- Seed creates safe self-rates only.
- Seed does not overwrite admin-entered rates.
- Seed can be run multiple times safely.

Part C: Purchase detail currency snapshot fix

Fix purchase detail page currency display.

Current issue:
Purchase detail page uses current base currency for the base column label.

Required:
1. Purchase detail must use purchase.baseCurrencyCodeAtTime for historical base currency labels.
2. Original purchase amounts must use purchase.purchaseCurrencyCode.
3. Base amounts must use purchase.baseCurrencyCodeAtTime.
4. Current company base currency should not change old purchase display labels.
5. If purchase.baseCurrencyCodeAtTime is missing for old records, fallback gracefully to current base currency and show no crash.

Acceptance criteria:
- Create purchase when base currency is GBP.
- Change base currency to AED.
- Open old purchase.
- It still shows original purchase currency and GBP as the base snapshot currency.
- It does not relabel historical base amounts as AED.

Part D: Currency cache and UI consistency check

Review frontend currency usage.

Required:
1. Search for remaining hardcoded currency labels or symbols:
   - PKR
   - AED
   - USD
   - GBP
   - ₨
   - $
   - د.إ
   - £

2. Hardcoded currency may only exist in:
   - currency constants/seed metadata
   - test data
   - examples/docs
   - explicitly saved transaction data

3. UI screens for new transactions must use current base currency from useBaseCurrency or settings.
4. Historical records must use saved transaction currency fields.
5. Settings save must invalidate:
   - settings
   - company settings
   - currencies
   - exchange rates
   - POS config
   - purchase form config
   - dashboard
   - reports

6. Confirm these pages behave correctly:
   - Retail POS
   - Wholesale POS
   - Purchase create
   - Purchase detail
   - Sales report
   - Purchase report
   - Dashboard
   - Receipt/invoice views

Acceptance criteria:
- Changing base currency updates new-transaction labels.
- Old records still show saved currency.
- No user-facing hardcoded PKR remains unless the record itself is PKR.
- Settings change invalidates relevant query caches.

Part E: Currency tests

Add or update tests for:

Backend:
1. get current base currency from settings.
2. sale invoice stores currencyCode.
3. purchase stores baseCurrencyCodeAtTime.
4. purchase stores exchangeRateToBaseCurrency snapshot.
5. exchange rate lookup returns saved rate.
6. missing exchange rate allows fallback behavior where implemented.
7. editing current exchange rate does not mutate old purchase.
8. seed script is idempotent where practical.

Frontend:
1. base currency hook returns selected company currency.
2. purchase form auto-fills stored exchange rate.
3. purchase form defaults to 1 when rate is missing.
4. purchase detail uses baseCurrencyCodeAtTime.
5. POS displays latest base currency for new sales.

Rules:
- Do not rewrite large parts of the app.
- Make focused fixes only.
- Do not add automatic exchange-rate fetching.
- Do not add multi-currency sales.
- Do not add historical exchange-rate import.
- Keep v1 simple.

At the end, report:
1. Files changed.
2. What was fixed.
3. How to test manually.
4. Any remaining risks.
5. Whether it is safe to move to Milestone 13 Testing and Hardening.