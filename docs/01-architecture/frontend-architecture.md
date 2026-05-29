# Frontend Architecture

## Purpose

This document defines the frontend structure for the Textile ERP & POS System.

The frontend must support fast billing, accurate textile workflows, clear inventory visibility, barcode scanning, receipt printing, and simple user training for shop staff.

---

## Frontend Goals

1. Make POS billing fast and simple.
2. Make roll selection and measurement entry clear.
3. Reduce user mistakes during fabric sales.
4. Keep workflows understandable for non-technical shop staff.
5. Keep permissions visible in the UI, while enforcing permissions on the backend.
6. Keep feature code modular by business domain.
7. Support browser-based barcode scanners and receipt printing.

---

## Recommended Stack

- Next.js.
- React.
- TypeScript.
- Tailwind CSS or a consistent design-system layer.
- TanStack Query for server state.
- Zustand for short-lived POS/cart state.
- React Hook Form for forms.
- Zod for frontend validation schemas where useful.

---

## App Structure

Recommended structure:

```text
frontend/
  src/
    app/
      (auth)/
        login/
      (dashboard)/
        dashboard/
        pos/
        inventory/
        products/
        purchases/
        customers/
        reports/
        settings/
    features/
      auth/
      pos/
      inventory/
      products/
      purchases/
      customers/
      ledger/
      reports/
      barcode/
      settings/
    components/
      ui/
      layout/
      forms/
      tables/
      feedback/
    hooks/
    lib/
      api/
      auth/
      permissions/
      formatting/
      validation/
      printing/
    stores/
    types/
```

---

## Route Groups

### Auth Routes

```text
/auth/login
```

Responsibilities:

- User login.
- Session creation.
- Redirect based on role.

### Dashboard Routes

```text
/dashboard
```

Responsibilities:

- Daily sales summary.
- Stock alerts.
- Low roll alerts.
- Credit outstanding.
- Wastage overview.

### POS Routes

```text
/pos/retail
/pos/wholesale
```

Responsibilities:

- Barcode scanning.
- Product and roll search.
- Cart management.
- Measurement entry.
- Discount entry.
- Payment entry.
- Invoice generation.
- Receipt print.

Retail and wholesale should be separate routes because the workflows are different.

### Inventory Routes

```text
/inventory/rolls
/inventory/remnants
/inventory/stock-movements
/inventory/reconciliation
```

Responsibilities:

- Roll listing.
- Roll details.
- Remaining length visibility.
- Reconciliation workflow.
- Remnant management.
- Stock movement history.

### Product Routes

```text
/products
/products/categories
/products/batches
```

Responsibilities:

- Category management.
- Product management.
- Batch and dye lot management.
- Product barcode data.

### Purchase Routes

```text
/purchases
/purchases/new
/suppliers
```

Responsibilities:

- Supplier management.
- Purchase entry.
- Multiple roll entry.
- Barcode generation after purchase.

### Customer Routes

```text
/customers
/customers/[id]
/customers/[id]/ledger
```

Responsibilities:

- Customer profile.
- Credit limit.
- Outstanding balance.
- Payment history.
- Ledger statement.

---

## Feature Folder Pattern

Each feature should own its screens, components, hooks, and API methods.

Example:

```text
features/pos/
  api/
    pos.api.ts
  components/
    BarcodeInput.tsx
    CartTable.tsx
    MeasurementInput.tsx
    PaymentPanel.tsx
    ReceiptPreview.tsx
  hooks/
    useBarcodeScanner.ts
    useCreateSale.ts
    useRollLookup.ts
  stores/
    posCart.store.ts
  types/
    pos.types.ts
  utils/
    pos-calculations.ts
```

---

## State Management Strategy

### Server State

Use TanStack Query for:

- Products.
- Rolls.
- Batches.
- Customers.
- Purchases.
- Invoices.
- Reports.
- Dashboard metrics.

Rules:

- Mutations must invalidate affected queries.
- Do not duplicate server state in Zustand unless it is temporary screen state.
- Use query keys by domain.

Example query keys:

```ts
['rolls', filters]
['roll', rollId]
['customers', filters]
['customer-ledger', customerId]
['dashboard-summary', date]
```

### Client UI State

Use Zustand or local component state for:

- POS cart.
- Current scanned barcode value.
- Draft sale line.
- Active modal.
- Temporary filter state.
- Unsaved form state.

POS cart should not be treated as confirmed inventory. Backend confirms final deduction.

---

## POS UI Architecture

### Retail POS Layout

Recommended layout:

```text
Top bar: user, shift/date, quick actions
Left: barcode/search input and product/roll results
Center: cart lines
Right: totals, discounts, payment, invoice actions
Bottom: warnings and keyboard shortcuts
```

### Required POS Behaviors

- Barcode input remains focused after scan.
- Scanner Enter key triggers lookup.
- Roll barcode should directly identify the roll.
- Product barcode may show product and available rolls.
- User must enter billed quantity and unit.
- Actual cut defaults to billed quantity.
- If actual cut differs, UI must clearly show wastage.
- If remaining roll becomes small, UI should suggest remnant handling.
- Batch mismatch warnings should be visible before checkout.

---

## Measurement Input

The measurement input component must support:

- Unit selection: yard or meter.
- Decimal values.
- Conversion preview.
- Remaining length preview.
- Actual cut field.
- Billed quantity field.

Rules:

- Frontend may preview conversion.
- Backend performs authoritative conversion.
- Use clear labels: `Billed Quantity`, `Actual Cut`, `Unit`, `Remaining After Cut`.

---

## Barcode Scanner Handling

Most barcode scanners act like keyboards.

Frontend hook responsibilities:

- Capture input from focused barcode field.
- Detect Enter key.
- Debounce accidental repeated scans.
- Call `/barcode/lookup` endpoint.
- Show clear error when barcode is unknown.
- Keep field focused after success or failure.

Do not require special browser permissions for basic scanners.

---

## Receipt Printing

Use browser printing in v1.

Recommended structure:

```text
features/printing/
  components/
    ReceiptTemplate.tsx
  hooks/
    usePrintReceipt.ts
  utils/
    receipt-format.ts
```

Receipt template should support:

- Shop name.
- Invoice number.
- Date and time.
- Cashier name.
- Customer name if available.
- Sale items.
- Fabric quantity and unit.
- Rate.
- Discount.
- Total.
- Paid amount.
- Balance if credit.
- Return policy text.

---

## Form Architecture

Use one standard form pattern across the app.

Recommended:

- React Hook Form for form state.
- Zod for validation schema.
- Shared form components.
- Server error mapping to fields.

Rules:

- Validation should be user-friendly.
- Backend validation remains authoritative.
- Decimal inputs must preserve precision.
- Money inputs must not use floating-point calculations for final totals.

---

## Table Architecture

All data tables should support:

- Server-side pagination.
- Server-side filtering.
- Server-side sorting.
- Empty states.
- Loading states.
- Error states.
- Export action where applicable.

Large lists must not fetch all records at once.

---

## Permission-Based UI

The frontend should hide or disable actions the user cannot perform.

Examples:

- Cashier cannot see inventory adjustment action.
- Inventory staff cannot see financial reports.
- Accountant cannot edit roll inventory.
- Only authorized roles can approve invoice deletion or negative stock override.

Important:

Frontend permissions improve user experience only. Backend must enforce all permissions.

---

## Error Handling

Use consistent error display:

- Field errors for validation.
- Toast for simple action failure.
- Inline alert for page-level failure.
- Blocking modal for critical irreversible action.

Inventory errors must be clear.

Examples:

- `Roll does not have enough remaining fabric.`
- `Actual cut cannot be less than billed quantity without manager approval.`
- `This roll has already been marked as finished.`
- `Batch mismatch detected.`

---

## Loading States

Use loading patterns that match workflow urgency.

- POS barcode lookup: small inline loader.
- Invoice creation: disable submit and show clear progress.
- Reports: skeleton or progress state.
- Tables: skeleton rows.

Avoid blocking the full page when only a small area is loading.

---

## Accessibility and Keyboard Use

POS should be keyboard-friendly.

Recommended shortcuts:

- `/` focus search.
- `Enter` submit barcode/search.
- `Ctrl + Enter` complete sale.
- `Esc` close modal.
- `F2` add customer.
- `F4` payment panel.

All inputs must have labels.

---

## Frontend Security Rules

- Do not store sensitive user data in localStorage unless necessary.
- Prefer HTTP-only cookies for auth if the backend supports it.
- Never trust role information from frontend only.
- Never calculate final stock deduction only on frontend.
- Never expose hidden admin actions through client-only checks.

---

## Frontend Testing Scope

Priority tests:

- POS scan to cart flow.
- Measurement conversion preview.
- Wastage display when actual cut differs.
- Payment validation.
- Permission-based action visibility.
- Roll reconciliation form behavior.
- Customer ledger display.

---

## Non-Negotiable Frontend Rules

1. POS must be fast and keyboard-friendly.
2. Barcode input must stay reliable under repeated scans.
3. UI must never hide important inventory warnings.
4. Actual cut and billed quantity must be visibly separate.
5. Frontend previews are not final business truth.
6. All critical writes must wait for backend confirmation.
7. Role-based UI must match backend permissions.
