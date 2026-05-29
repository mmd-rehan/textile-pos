# ADR-003: Authentication and Authorization Strategy

## Status

Accepted

## Context

The Textile ERP & POS System requires strict access control because users can perform sensitive operations such as billing, stock deduction, inventory adjustment, wastage logging, refund processing, customer credit updates, supplier payments, and financial reporting.

The first implementation is for a single shop. Social login is not needed. Users will be staff members, managers, administrators, inventory staff, and accounting users.

## Decision

The system will use:

- Email or username plus password login
- JWT/session-based authentication
- Role-based authorization
- No social login in version 1

## User Identity

Each user account should support:

- Name
- Username
- Email, optional if username is used as primary login
- Password hash
- Role
- Active/inactive status
- Last login timestamp
- Audit fields

## Login Identifiers

The system should allow login by username or email.

Reason:

- Shop staff may not always use email frequently.
- Username-based login is faster for POS environments.
- Email can still be used for admin, manager, and recovery flows later.

## Password Rules

Initial password policy:

- Password must be stored only as a secure hash.
- Plain passwords must never be logged or stored.
- Password change should require current password unless changed by Admin.
- Admin reset should generate temporary credentials or require password change on next login when implemented.

Exact password strength rules can be finalized in the authentication domain documentation.

## Token and Session Strategy

Version 1 should use:

- Short-lived access token
- Refresh token or server-managed session depending on implementation detail
- Secure HTTP-only cookie preferred for browser-based app
- Logout should invalidate the current session or refresh token

For local development, bearer tokens may be used for testing, but production browser authentication should prefer secure cookies.

## Roles

Initial roles:

```text
Admin
Manager
Cashier / Salesman
Inventory Staff
Accountant
```

Optional future role:

```text
Super Admin
```

Super Admin is reserved for future multi-branch or enterprise use and should not be implemented in version 1 unless confirmed later.

## Role Responsibilities

### Admin

Full system access.

Can manage:

- Users
- Roles and permissions
- Settings
- Inventory
- Sales
- Purchases
- Reports
- Accounting access
- Critical approvals

### Manager

Operational management access.

Can manage or review:

- Sales oversight
- Inventory monitoring
- Purchase approvals
- Customer management
- Operational reports

Restrictions:

- Limited system configuration access
- Limited financial control depending on accounting permissions

### Cashier / Salesman

POS-focused access.

Can perform:

- Retail billing
- Wholesale billing if permitted
- Barcode scanning
- Customer selection
- Payment capture
- Invoice printing

Restrictions:

- Cannot directly modify inventory master data
- Cannot delete invoices without approval
- Cannot access accounting reports
- Cannot perform stock adjustment unless explicitly permitted

### Inventory Staff

Inventory-focused access.

Can perform:

- Roll entry
- Barcode printing
- Stock receiving support
- Stock adjustment if permitted
- Roll reconciliation if permitted

Restrictions:

- No financial reporting access
- No customer credit ledger access unless confirmed

### Accountant

Accounting-focused access.

Can perform:

- Customer ledger review
- Supplier ledger review
- Payments
- Expenses
- Reconciliation
- Financial reports

Restrictions:

- Cannot modify inventory directly
- Cannot change POS item quantities unless through approved accounting correction workflows

## Permission Model

Use role-based authorization in version 1.

The backend should support permission checks at controller or route level using NestJS guards.

Permission names should follow a consistent pattern:

```text
module:action
```

Examples:

```text
inventory:view
inventory:create
inventory:adjust
sales:create
sales:refund
sales:delete
customers:view-ledger
accounting:view-reports
settings:update
users:manage
```

## Critical Actions Requiring Authorization

The following actions must always require explicit permission:

- Inventory adjustment
- Negative stock override
- Invoice deletion or cancellation
- Refund approval
- Credit limit change
- Customer ledger correction
- Supplier payment correction
- Roll reconciliation
- Wastage correction
- User role change
- Settings update

## Audit Logging

Authentication and authorization events should be logged where useful.

Examples:

- Login success
- Login failure
- Logout
- Password change
- User created
- User disabled
- Role changed
- Permission denied for critical action
- Critical operation approved

## Security Rules

- Never expose password hashes through APIs.
- Never send tokens in query strings.
- Protect sensitive APIs with authentication guards.
- Protect role-specific APIs with permission guards.
- Validate all request DTOs.
- Avoid returning sensitive fields in user list APIs.
- Use rate limiting for login once API infrastructure is ready.

## Consequences

### Positive Consequences

- Simple authentication model for shop staff
- Clear permissions for sensitive textile workflows
- Secure enough for version 1 without unnecessary complexity
- Easy to expand to detailed permissions later

### Tradeoffs

- No social login
- Password reset flow must be implemented carefully later
- Permission matrix needs to be maintained as modules grow

## Non-Goals for Version 1

- Social login
- SSO
- Multi-branch access control
- External customer login
- Mobile app authentication
- Biometric login

## Open Questions

These should be finalized in the authentication domain documentation:

1. Should username be mandatory and email optional?
2. Should Admin be able to create staff accounts without email?
3. Should Cashier/Salesman have access to wholesale billing by default?
4. Should roll reconciliation require Manager/Admin approval?
5. Should invoice cancellation require Manager/Admin approval?
