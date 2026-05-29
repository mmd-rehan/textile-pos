# ADR-004: Frontend State Management Strategy

## Status

Pending Confirmation

## Context

The frontend will use Vite, React, TypeScript, and Tailwind CSS. The application will include POS screens, inventory management, product management, customer ledgers, sales history, reports, settings, authentication, barcode scanning, receipt printing, and dashboards.

Frontend state will include several types of data:

- Server state from APIs
- Authenticated user state
- Role and permission state
- POS cart state
- Current sale draft
- Barcode scan input state
- Filters, pagination, and table state
- Modal and form state
- Dashboard data

Some state should come directly from the backend. Some state should remain local to the current screen.

## Decision

No final state management library is locked yet.

This ADR exists as a placeholder until the decision is confirmed.

## Recommended Direction

Recommended option for version 1:

```text
TanStack Query for server state
Zustand for lightweight client state
React Hook Form for form state
URL query params for filterable/list views where appropriate
```

This is a recommendation only. It is not accepted until confirmed.

## Why This Recommendation Fits

### TanStack Query

Useful for:

- API data fetching
- Caching server responses
- Refetching after mutations
- Loading and error states
- Pagination and filters
- Dashboard data

### Zustand

Useful for:

- POS cart
- Current sale draft
- Auth UI state if needed
- Sidebar or layout state
- Temporary UI state shared across components

### React Hook Form

Useful for:

- Product forms
- Roll entry forms
- Customer forms
- Supplier forms
- Purchase entry forms
- Settings forms
- Payment forms

## State Categories

### 1. Server State

Examples:

- Products
- Rolls
- Batches
- Customers
- Suppliers
- Invoices
- Payments
- Reports

Recommended owner:

```text
TanStack Query
```

### 2. POS Transaction State

Examples:

- Current cart
- Selected customer
- Selected roll
- Billed quantity
- Actual cut quantity
- Discounts
- Payment split
- Draft invoice

Recommended owner:

```text
Zustand or page-level reducer
```

### 3. Form State

Examples:

- Create product
- Add roll
- Create customer
- Purchase entry
- Roll reconciliation

Recommended owner:

```text
React Hook Form
```

### 4. Filter and Table State

Examples:

- Search query
- Page number
- Page size
- Sort order
- Status filter
- Date range

Recommended owner:

```text
URL query params for shareable pages
Local component state for temporary filters
```

### 5. Authentication State

Examples:

- Current user
- Role
- Permissions
- Login status

Recommended owner:

```text
Backend session/JWT plus frontend auth context/query
```

## Rules Regardless of Library

- Do not duplicate server state unnecessarily.
- Keep business calculations in shared utilities or domain services, not scattered in components.
- POS cart state must be easy to reset after sale completion.
- Unsaved POS state should be protected against accidental navigation where practical.
- Avoid global state for simple local modal and input state.
- Keep permission checks centralized.
- Do not rely only on frontend permission checks. Backend must enforce permissions.

## Options to Confirm

### Option A: TanStack Query + Zustand

Recommended for balance of simplicity and scalability.

Pros:

- Lightweight
- Good developer experience
- Strong pattern for server state
- Good fit for POS cart and admin dashboards

Cons:

- Two libraries to understand
- Requires clear rules to avoid duplicated state

### Option B: Redux Toolkit + RTK Query

Pros:

- Strong structure
- Good for large teams
- Good devtools

Cons:

- More boilerplate
- May be heavier than needed for version 1

### Option C: React Context + TanStack Query

Pros:

- Fewer dependencies
- Simple for small app

Cons:

- Context can become messy for POS cart and cross-page state
- More manual performance management

## Required Confirmation

Before final implementation, confirm one of the following:

```text
A. TanStack Query + Zustand
B. Redux Toolkit + RTK Query
C. React Context + TanStack Query
D. Other
```

## Temporary Guidance Until Confirmed

Until this ADR is accepted:

- Use local component state for simple UI behavior.
- Use React Hook Form for forms if confirmed separately.
- Do not introduce global state libraries without approval.
- Keep state logic isolated so it can be moved later.
