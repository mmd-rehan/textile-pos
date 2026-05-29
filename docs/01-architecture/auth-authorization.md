# Authentication and Authorization Architecture

## Purpose

This document defines authentication, roles, permissions, session handling, and authorization rules for the Textile ERP & POS System.

The system handles inventory, sales, credit ledgers, wastage, and financial records. Access control must be strict because mistakes or unauthorized changes can directly affect stock and money.

---

## Authentication Goals

1. Identify every user performing an action.
2. Prevent unauthorized access.
3. Keep sessions secure.
4. Support shop roles such as Admin, Manager, Cashier, Inventory Staff, and Accountant.
5. Ensure sensitive actions are checked on the backend.
6. Make audit logs meaningful by always storing user identity.

---

## User Roles

### Admin

Full system access.

Allowed:

- Manage users.
- Manage roles and permissions.
- Manage settings.
- Manage inventory.
- Access reports.
- Access accounting.
- Approve critical actions.

### Manager

Operational management access.

Allowed:

- Monitor inventory.
- Oversee sales.
- Approve selected operational actions.
- Manage customers.
- View reports.

Restricted:

- Limited system configuration.
- Limited role management.

### Cashier / Salesman

POS-focused access.

Allowed:

- Retail billing.
- Wholesale billing if assigned.
- Barcode scanning.
- Customer selection.
- Receipt printing.

Restricted:

- Cannot directly adjust inventory.
- Cannot access accounting reports.
- Cannot void invoices without approval.

### Inventory Staff

Inventory-focused access.

Allowed:

- Roll entry.
- Barcode printing.
- Stock receiving.
- Roll reconciliation if permitted.
- Inventory adjustments with permission or approval.

Restricted:

- No sales payment access unless separately granted.
- No financial reports.

### Accountant

Accounting-focused access.

Allowed:

- Customer ledger.
- Supplier ledger.
- Payments.
- Expenses.
- Reconciliation.
- Financial reports.

Restricted:

- Cannot modify physical inventory.

### Super Admin

Optional future role for multi-branch or enterprise setup.

Not required for v1 single-shop deployment.

---

## Permission Model

Use role-based access control with explicit permissions.

A user can have one or more roles. Roles contain permissions.

Recommended permission format:

```text
module.action
```

Examples:

```text
sales.create_retail
sales.create_wholesale
sales.void_invoice
sales.approve_refund
inventory.view
inventory.create_roll
inventory.adjust_stock
inventory.reconcile_roll
products.manage
customers.manage
customers.change_credit_limit
ledger.view_customer
ledger.record_payment
reports.view_sales
reports.view_financial
settings.manage
users.manage
audit.view
```

---

## Suggested Permission Matrix

| Permission | Admin | Manager | Cashier | Inventory Staff | Accountant |
|---|---:|---:|---:|---:|---:|
| sales.create_retail | Yes | Yes | Yes | No | No |
| sales.create_wholesale | Yes | Yes | Optional | No | No |
| sales.void_invoice | Yes | Optional approval | No | No | No |
| sales.approve_refund | Yes | Optional | No | No | Optional |
| inventory.view | Yes | Yes | Limited | Yes | No |
| inventory.create_roll | Yes | Yes | No | Yes | No |
| inventory.adjust_stock | Yes | Optional approval | No | Optional approval | No |
| inventory.reconcile_roll | Yes | Yes | No | Yes | No |
| products.manage | Yes | Yes | No | Optional | No |
| customers.manage | Yes | Yes | Yes limited | No | Yes |
| customers.change_credit_limit | Yes | Optional | No | No | Optional |
| ledger.view_customer | Yes | Yes | Limited | No | Yes |
| ledger.record_payment | Yes | Yes | Optional | No | Yes |
| reports.view_sales | Yes | Yes | No | No | Yes |
| reports.view_financial | Yes | Optional | No | No | Yes |
| settings.manage | Yes | No | No | No | No |
| users.manage | Yes | No | No | No | No |
| audit.view | Yes | Optional | No | No | Optional |

---

## Authentication Flow

```text
User enters username/password
  -> Backend validates credentials
  -> Backend checks user is active
  -> Backend creates session or tokens
  -> Backend returns current user and permissions
  -> Frontend redirects to allowed area
```

---

## Token / Session Strategy

Two acceptable approaches are possible.

### Recommended for browser app

Use HTTP-only secure cookies.

Benefits:

- Token not exposed to JavaScript.
- Better protection against token theft.
- Works well for a web-based POS.

### Alternative

Use JWT access token and refresh token.

Rules:

- Access token should be short-lived.
- Refresh token should be rotated.
- Refresh tokens should be revocable.
- Do not store long-lived tokens in unsafe frontend storage.

---

## Password Rules

Minimum rules:

- Password length at least 8 characters.
- Hash with bcrypt or argon2.
- Never store plain-text passwords.
- Do not return password hashes in API responses.
- Allow admin password reset flow.

Recommended later:

- Password expiry policy for sensitive environments.
- Login attempt throttling.
- Optional 2FA for Admin.

---

## Backend Authorization Flow

Every protected API should follow this order:

```text
Authenticate user
  -> Load user roles and permissions
  -> Check route-level permission
  -> Check business policy if needed
  -> Execute action
  -> Create audit log if sensitive
```

Frontend checks are not enough.

---

## Business Policy Checks

Some permissions are not enough by themselves. The backend must also check business conditions.

Examples:

### Void Invoice

Check:

- User has `sales.void_invoice`.
- Invoice exists.
- Invoice is not already voided.
- Invoice date is within allowed window or user has override permission.
- Reason is provided.

### Inventory Adjustment

Check:

- User has `inventory.adjust_stock`.
- Roll exists.
- Adjustment reason is provided.
- Negative result is not allowed unless override permission exists.

### Credit Sale

Check:

- User can create sale.
- Customer is active.
- Credit limit is not exceeded, unless approval exists.

---

## Critical Actions Requiring Audit

Always audit:

- Login failure after threshold.
- User creation.
- Role or permission change.
- Password reset.
- Inventory adjustment.
- Roll reconciliation.
- Invoice void.
- Refund approval.
- Credit limit change.
- Ledger adjustment.
- Settings change.

---

## Frontend Authorization Behavior

Frontend should:

- Hide unavailable navigation links.
- Disable buttons when permission is missing.
- Show helpful messages for restricted actions.
- Redirect unauthorized pages.

Frontend must not:

- Treat hidden buttons as security.
- Store fake permissions.
- Allow critical write calls without backend confirmation.

---

## Session Expiry Behavior

When session expires:

- Frontend should show login screen.
- Unsaved POS cart should be protected where possible.
- Backend should return 401.
- Frontend should not retry endlessly.

---

## User Status

User status values:

```text
ACTIVE
INACTIVE
SUSPENDED
```

Rules:

- Inactive or suspended users cannot login.
- Existing sessions for suspended users should be invalidated.
- User records should not be hard-deleted if they are linked to invoices or audit logs.

---

## Data Ownership in v1

Since v1 is single-shop, users belong to the shop instance.

Future multi-branch support can introduce:

- Branch access.
- Company-level roles.
- Branch-level permissions.

Do not implement multi-branch complexity in v1.

---

## Non-Negotiable Authorization Rules

1. Every business write action requires an authenticated user.
2. Every critical action requires explicit permission.
3. Backend must enforce permissions.
4. Frontend permission checks are for UX only.
5. User identity must be stored in audit logs and business records.
6. Historical users must not be hard-deleted if linked to records.
7. Financial and inventory overrides must require reason and audit log.
