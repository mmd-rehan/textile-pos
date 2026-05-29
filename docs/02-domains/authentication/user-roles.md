# Authentication User Roles

## Purpose

The authentication domain controls login, sessions/tokens, roles, permissions, password policy, audit logging, activity tracking, and security rules.

## Confirmed Principles

- Email or username plus password login.
- JWT/session-based authentication.
- Role-based permissions.
- No social login in version 1.
- Backend must enforce permissions.
- Sensitive actions must be audited.

## Roles

- Admin
- Manager
- Cashier / Salesman
- Inventory Staff
- Accountant
- Super Admin is optional and deferred until multi-branch or enterprise scope is confirmed.

## Out of Scope Unless Confirmed

- Social login
- SSO
- Biometric login
- Multi-branch role scoping

## Role Notes

Roles should be stored as system-controlled values. Permission matrix should define exact actions per role.

## Deferred

Super Admin and branch-scoped roles are deferred until multi-branch scope is confirmed.
