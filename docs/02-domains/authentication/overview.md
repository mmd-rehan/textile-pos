# Authentication Domain Overview

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

## Source Alignment

This document is aligned with the confirmed product direction:

- Single-shop first implementation
- Roll/thaan is the primary inventory unit for variable-length fabric
- Yards and meters must be supported
- Retail and wholesale flows remain separate
- Actual cut length controls inventory deduction
- Wastage, shrinkage, adjustments, and reconciliation must be traceable
- Barcode scanning and simple browser printing are part of version 1
- MySQL with Prisma is the selected database layer
- Node.js with NestJS is the selected backend stack
- Vite, React, TypeScript, and Tailwind CSS are the selected frontend stack
