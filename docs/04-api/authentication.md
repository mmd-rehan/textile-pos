# API Authentication

## Purpose

This document defines API authentication and authorization rules for the Textile ERP & POS System.

Confirmed strategy:

```text
Email/username + password
Role-based permissions
Session/JWT login
No social login
```

---

## User Identity

A user should be able to log in with:

```text
username or email
password
```

Pending confirmation:

```text
Whether email is mandatory for all users or username is enough for shop staff.
```

Recommended for shop POS:

```text
username is required
email is optional but recommended for admins/managers
```

---

## Auth Endpoints

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
```

Admin user management:

```http
GET   /api/v1/users
POST  /api/v1/users
PATCH /api/v1/users/{userId}
PATCH /api/v1/users/{userId}/status
POST  /api/v1/users/{userId}/reset-password
```

---

## Login Request

```json
{
  "login": "admin",
  "password": "password"
}
```

`login` may be username or email.

---

## Login Response

Recommended response if using access token strategy:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "Admin User",
      "username": "admin",
      "role": "ADMIN",
      "permissions": [
        "sales.create",
        "inventory.read",
        "inventory.adjust"
      ]
    },
    "accessToken": "jwt-access-token",
    "expiresIn": 900
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Refresh token transport is pending final implementation choice.

Recommended secure approach for web app:

```text
Access token: short-lived
Refresh token/session: httpOnly secure cookie
```

Pending confirmation:

```text
Whether v1 should use bearer JWT only, cookie session only, or hybrid access token + httpOnly refresh cookie.
```

---

## Current Recommendation

For a web-based POS:

```text
Use hybrid JWT/session approach.
```

Suggested pattern:

- short-lived access token for API calls
- refresh token or session ID stored in httpOnly cookie
- server validates active user and session
- logout invalidates refresh/session
- role and permissions are loaded from backend

Reason:

- works well with browser-based app
- safer than storing long-lived tokens in localStorage
- supports future session management and forced logout

---

## Authenticated Request

Bearer token example:

```http
Authorization: Bearer access_token
```

Cookie/session example:

```http
Cookie: refreshToken=...
```

The final approach should be implemented consistently after confirmation.

---

## Role Model

Initial roles:

```text
ADMIN
MANAGER
CASHIER_SALESMAN
INVENTORY_STAFF
ACCOUNTANT
```

Optional future role:

```text
SUPER_ADMIN
```

Multi-branch role behavior is deferred.

---

## Permission Model

Use permissions internally instead of hard-coding only role names.

Example permissions:

```text
sales.read
sales.create
sales.cancel
sales.return
inventory.read
inventory.create
inventory.adjust
roll.retire
barcode.print
customers.read
customers.create
customers.update
customer_ledger.read
customer_payment.create
purchases.read
purchases.create
purchases.post
accounting.read
accounting.adjust
reports.read
settings.manage
users.manage
```

Roles should map to permissions.

---

## Example Role Permissions

### Admin

Full access.

### Manager

Operational access:

```text
sales.read
sales.create
sales.cancel.approve
inventory.read
customers.read
customers.update
purchases.read
purchases.approve
reports.read
```

### Cashier / Salesman

POS-focused access:

```text
sales.create
sales.read.own
barcode.lookup
customers.read
customers.create.limited
```

Restrictions:

```text
cannot directly adjust inventory
cannot access accounting reports
cannot delete invoices
```

### Inventory Staff

Inventory-focused access:

```text
inventory.read
inventory.create
inventory.adjust.request
roll.retire
barcode.print
```

Restrictions:

```text
no financial access
```

### Accountant

Accounting-focused access:

```text
customer_ledger.read
customer_payment.create
supplier_payment.create
expenses.create
accounting.read
reports.financial
```

Restrictions:

```text
no inventory modification
```

Pending confirmation:

```text
Exact permission matrix per role.
```

---

## Protected Routes

All business APIs should require authentication except:

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
```

Public registration is not required for v1.

Users should be created by Admin.

---

## Authorization Rules

Use layered authorization:

1. User must be authenticated.
2. User account must be active.
3. User must have required permission.
4. Some actions may require manager/admin approval.
5. Sensitive actions must create audit logs.

Examples:

| Action | Required Permission |
|---|---|
| Create retail sale | `sales.create` |
| Cancel invoice | `sales.cancel` or approval |
| Adjust inventory | `inventory.adjust` |
| Retire roll | `roll.retire` |
| Change product price | `product.price.update` |
| View accounting reports | `reports.financial` |
| Manage users | `users.manage` |

---

## Approval-Based Actions

Some workflows should support approval even if normal user cannot perform them alone.

Examples:

- negative stock override
- sale cancellation
- refund approval
- inventory adjustment approval
- customer credit limit override
- actual cut lower than billed override

Pending confirmation:

```text
Which approval workflows are required in v1.
```

---

## Session Expiry

Recommended defaults:

```text
Access token expiry: 15 minutes
Refresh/session expiry: 8 to 12 hours
Idle timeout: pending confirmation
```

For a shop POS, long daily login sessions may be useful, but security must be considered.

Pending confirmation:

```text
Whether POS users should stay logged in for full business day.
```

---

## Password Policy

Recommended minimum v1 policy:

```text
minimum 8 characters
must not be empty
admin reset required if forgotten
passwords hashed using bcrypt or argon2
```

Pending confirmation:

```text
Whether strict complexity rules are required.
```

---

## Failed Login Protection

Recommended:

- rate-limit login attempts
- lock or delay after repeated failures
- log failed attempts

Pending confirmation:

```text
Exact threshold for failed login attempts.
```

Suggested default:

```text
5 failed attempts within 15 minutes triggers temporary lock or delay.
```

---

## Audit Requirements

Authentication-related events should be logged:

- login success
- login failure
- logout
- password change
- user created
- role changed
- user disabled
- user enabled
- permission changed

---

## NestJS Implementation Notes

Recommended guards/interceptors:

```text
JwtAuthGuard
RolesGuard
PermissionsGuard
CurrentUser decorator
AuditLogInterceptor
RequestIdMiddleware
```

Recommended modules:

```text
AuthModule
UsersModule
RolesModule
PermissionsModule
SessionsModule
AuditModule
```

---

## Frontend Auth Rules

Frontend should:

- redirect unauthenticated users to login
- hide menu items without permission
- still rely on backend permission enforcement
- refresh session/token safely
- show clear session-expired message
- avoid storing sensitive long-lived tokens in localStorage if cookie approach is selected

---

## Pending Confirmation

```text
- final token/session transport
- exact access token expiry
- exact session duration
- exact permission matrix
- whether username-only login is allowed
- password complexity rules
- failed login lockout rules
- approval workflow requirements
```
