# State Management Architecture

## Purpose

This document defines how frontend and backend state should be managed in the Textile ERP & POS System.

The system has two types of state:

1. Business truth stored in the database.
2. Temporary UI state used to help the user complete workflows.

The architecture must keep these separate.

---

## Main Principle

The database and backend services are the source of truth for inventory, invoices, ledgers, users, and reports.

Frontend state can hold drafts and previews, but it must not be treated as confirmed business data.

---

## State Categories

### Server State

Data loaded from backend APIs.

Examples:

- Products.
- Rolls.
- Batches.
- Customers.
- Invoices.
- Ledger entries.
- Reports.
- Dashboard metrics.
- Settings.

Use TanStack Query.

### Client UI State

Temporary state that exists only to support the current user interaction.

Examples:

- POS cart draft.
- Current scanned barcode.
- Selected customer in POS.
- Modal open/close state.
- Filter drawer state.
- Unsaved form values.

Use local component state or Zustand.

### Auth State

Current user and permissions.

Can be loaded from `/auth/me` and cached with TanStack Query or a small auth store.

### Persistent UI Preferences

Low-risk preferences can use localStorage.

Examples:

- Collapsed sidebar.
- Last selected report filter.
- Receipt preview preference.

Do not store sensitive business data unnecessarily.

---

## Recommended Frontend State Tools

### TanStack Query

Use for server state.

Benefits:

- Caching.
- Refetching.
- Loading states.
- Error handling.
- Mutation flows.
- Query invalidation.

### Zustand

Use for POS cart and lightweight UI state.

Benefits:

- Simple.
- Good for temporary multi-component state.
- Avoids heavy Redux-style boilerplate.

### React Hook Form

Use for forms.

Benefits:

- Form validation.
- Controlled and uncontrolled input support.
- Good performance.

---

## POS State Design

POS needs fast temporary state, but backend must confirm final sale.

Recommended POS store:

```ts
interface PosState {
  saleType: 'RETAIL' | 'WHOLESALE';
  selectedCustomerId?: string;
  lines: PosCartLine[];
  discountAmount: string;
  payments: PosPaymentDraft[];
  notes?: string;
}
```

Cart line:

```ts
interface PosCartLine {
  tempId: string;
  productId: string;
  rollId?: string;
  productName: string;
  rollCode?: string;
  batchNo?: string;
  billedQuantity: string;
  actualCutQuantity: string;
  unit: 'YARD' | 'METER';
  unitPrice: string;
  discountAmount: string;
  warnings: PosWarning[];
}
```

Important:

- POS cart is a draft.
- Backend calculates final totals.
- Backend validates remaining roll length.
- Backend creates invoice and stock movement.

---

## POS State Reset Rules

Reset POS cart after:

- Sale is successfully posted.
- User manually cancels sale.
- User logs out.

Do not reset automatically on barcode lookup failure.

Ask before clearing cart if unsaved lines exist.

---

## Server State Query Keys

Recommended query key structure:

```ts
const queryKeys = {
  products: (filters) => ['products', filters],
  product: (id) => ['product', id],
  rolls: (filters) => ['rolls', filters],
  roll: (id) => ['roll', id],
  customers: (filters) => ['customers', filters],
  customer: (id) => ['customer', id],
  customerLedger: (id, filters) => ['customer-ledger', id, filters],
  dashboard: (filters) => ['dashboard', filters],
};
```

---

## Mutation State Rules

All critical writes must use mutation hooks.

Examples:

```text
useCreateRetailSale
useCreateWholesaleSale
useReconcileRoll
useCreatePurchase
useReceiveCustomerPayment
useAdjustInventory
```

Mutation rules:

1. Disable submit while pending.
2. Use idempotency key where supported.
3. Show backend validation errors clearly.
4. Invalidate related queries on success.
5. Never assume success before backend confirms.

---

## Optimistic Updates

Avoid optimistic updates for:

- Roll remaining length.
- Customer credit balance.
- Invoice payment status.
- Ledger entries.
- Stock adjustments.

These are too important to fake before backend confirmation.

Optimistic updates may be acceptable for:

- UI preferences.
- Non-critical notes.
- Local table filters.

---

## Form State Rules

Each form should have:

- Initial values.
- Validation schema.
- Submit handler.
- Server error mapping.
- Dirty-state confirmation if leaving page.

Important forms:

- Product creation.
- Roll entry.
- Purchase entry.
- POS sale.
- Customer creation.
- Customer payment.
- Roll reconciliation.

---

## Auth State Rules

Frontend should know:

- Current user.
- Roles.
- Permissions.
- Session status.

Backend remains authoritative.

On 401:

- Clear local auth state.
- Redirect to login.

On 403:

- Show permission error.
- Do not retry automatically.

---

## Report State Rules

Reports should store filters in URL query parameters where practical.

Benefits:

- Shareable report views.
- Browser back/forward works.
- Easy refresh.

Example:

```text
/reports/sales?from=2026-05-01&to=2026-05-29&type=retail
```

---

## State Persistence Rules

Allowed in localStorage:

- Sidebar collapsed state.
- Preferred POS unit.
- Report filter presets.
- Theme preference.

Avoid in localStorage:

- Auth tokens if using cookie sessions.
- Customer credit information.
- Roll remaining length.
- Unsynced final invoices.
- Sensitive financial data.

---

## Backend State Rules

Backend should preserve business state through explicit records:

- invoices for sales.
- invoice lines for sale details.
- stock movements for inventory changes.
- ledger entries for customer/supplier balances.
- audit logs for sensitive actions.
- reconciliation records for roll closure.

Do not rely only on current aggregate columns.

Example:

`customers.current_balance` may exist for speed, but it must be reconcilable from `customer_ledger_entries`.

---

## Non-Negotiable State Rules

1. POS cart is a draft, not confirmed inventory.
2. Roll remaining length must be confirmed by backend during sale.
3. Customer balance must be confirmed by backend during credit sale.
4. Avoid optimistic updates for financial and inventory state.
5. Invalidate queries after mutations.
6. Use URL state for report filters.
7. Keep sensitive data out of browser storage.
