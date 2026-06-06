Review the current Settings and Currency implementation.

There is a problem: changing the shop/base currency in settings does not update the displayed shop currency across the app. Also, purchase exchange rates need a proper management screen.

Fix the currency system with the following rules.

Core currency rules:
1. The system has one current shop/base currency.
2. Sales/POS use the current shop/base currency only in v1.
3. Purchases may be entered in different currencies.
4. Every purchase must store:
   - purchaseCurrencyCode
   - baseCurrencyCodeAtTime
   - exchangeRateToBaseCurrency
   - original currency amounts
   - base currency amounts
5. Existing historical purchases, sales, ledgers, and reports must not be silently rewritten when base currency changes.
6. Changing base currency affects new transactions and UI labels going forward.
7. Existing records should display their own saved currencyCode.
8. Do not implement automatic live exchange-rate fetching.
9. Exchange rates are manually managed by Admin.
10. Use Decimal for all money and exchange-rate values.
11. Do not use Float.

Database changes:
1. Add or verify Currency model:
   - code
   - name
   - symbol
   - decimalPlaces
   - isActive

2. Add CurrencyExchangeRate model:
   - id
   - fromCurrencyCode
   - toCurrencyCode
   - rate
   - effectiveFrom
   - isCurrent
   - notes
   - createdByUserId
   - updatedByUserId
   - createdAt
   - updatedAt

3. Ensure company settings store:
   - baseCurrencyCode

4. Ensure purchase records store:
   - purchaseCurrencyCode
   - baseCurrencyCodeAtTime
   - exchangeRateToBaseCurrency
   - totalOriginalCurrency
   - totalBaseCurrency

5. Ensure purchase items and purchase rolls store both:
   - original currency costs
   - base currency costs

6. Ensure supplier ledger entries store:
   - currencyCode
   - amountOriginalCurrency
   - baseCurrencyCodeAtTime
   - exchangeRateToBaseCurrency
   - amountBaseCurrency

7. Ensure sale invoices store:
   - currencyCode
   even though sales use only current base currency in v1.

Important behavior:
1. When Admin changes base currency from USD to GBP:
   - Update company setting.
   - Invalidate frontend settings cache.
   - Refetch current company settings.
   - POS currency labels should show GBP for new sales.
   - Product price labels should show GBP.
   - Purchase form base currency should show GBP.
   - Reports should use saved transaction currencies where applicable.
   - Existing invoices/purchases must still show their saved currency.

2. If exchange rate from selected purchase currency to current base currency does not exist:
   - Default rate to 1.
   - Show warning.
   - Allow admin/user to manually enter rate.
   - Save the manually entered rate on the purchase as snapshot.

3. Editing current exchange rates in Settings should affect future purchases only.
4. Do not automatically recalculate old purchases when current exchange rate changes.
5. If admin wants to adjust an old purchase exchange rate, that should be a separate explicit correction workflow later. Do not implement it now.

Settings UI:
1. Add a new tab:
   Settings → Currencies & Exchange Rates

2. Show:
   - Current base currency selector
   - List of active currencies
   - List of currencies used in purchases
   - Current exchange rate from each purchase currency to current base currency

3. Admin can:
   - Add currency
   - Activate/deactivate currency
   - Edit current exchange rate
   - Save exchange rate notes

4. Display example:
   Base Currency: GBP

   Currency | Current Rate to GBP | Used In Purchases | Last Updated | Actions
   PKR      | 0.0028              | Yes               | date         | Edit
   AED      | 0.21                | Yes               | date         | Edit
   USD      | 0.79                | Yes               | date         | Edit

5. If base currency changes, update the exchange-rate table view to show rates into the new base currency.
6. If no rate exists for a currency into the new base currency, show rate as missing and allow setting it. Default editable value may be 1.

Frontend cache fix:
1. After changing settings or base currency, invalidate:
   - settings
   - company-settings
   - currencies
   - exchange-rates
   - receipt template data
   - POS config
   - purchase form config
   - dashboard summary
   - reports using currency display

2. Remove any hardcoded currency symbols from frontend.
3. All currency symbols must come from:
   - transaction currency for saved records
   - current company base currency for new forms

Backend fix:
1. Remove hardcoded currency assumptions from services.
2. Backend should read current base currency from settings service for new transactions.
3. Backend should save currency snapshots on purchases and sales.
4. Backend must not rely only on frontend-submitted base currency.
5. Settings changes must be audit logged.

Acceptance criteria:
1. Admin changes base currency from USD to GBP.
2. New POS screen shows GBP.
3. New purchase form shows GBP as base currency.
4. Existing PKR purchases still show PKR original values and old base-currency snapshot.
5. Purchase in PKR while base currency is GBP uses PKR -> GBP rate.
6. If PKR -> GBP rate does not exist, form defaults rate to 1 and allows manual edit.
7. Settings page has Currencies & Exchange Rates tab.
8. Admin can edit PKR -> GBP, AED -> GBP, USD -> GBP rates.
9. Editing current exchange rate does not modify old purchases.
10. Settings cache is invalidated correctly after saving.
11. No hardcoded PKR/USD/GBP symbols remain in frontend labels.
12. Tests cover:
    - base currency change
    - purchase with existing exchange rate
    - purchase with missing exchange rate defaulting to 1
    - existing purchase not changing after exchange-rate edit
    - POS using latest base currency for new sale