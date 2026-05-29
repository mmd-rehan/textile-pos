# ADR-001: Technology Stack

## Status

Accepted

## Context

The Textile ERP & POS System is a specialized web-based application for textile shops handling roll-based fabric inventory, variable-length sales, retail and wholesale billing, customer credit, purchases, suppliers, barcode workflows, wastage tracking, and reporting.

The first production target is a single shop. The system should be designed cleanly enough to support future expansion, but offline mode and multi-branch behavior are not part of the first implementation scope.

The system must support:

- Fast POS workflows
- Roll-level inventory accuracy
- Yard and meter calculations
- Barcode scanning through browser input
- Simple receipt printing from the browser
- Role-based access
- Audit-friendly backend behavior
- Maintainable code generation and AI-assisted documentation

## Decision

The project will use the following stack for version 1.

## Frontend

- Vite
- React
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- NestJS
- TypeScript

## Database

- MySQL

## ORM and Database Access

- Prisma ORM
- Prisma Migrate for schema migrations
- Prisma Client for type-safe database access

## API Style

- REST APIs for standard application operations
- WebSocket or server-sent events only when needed later for live dashboards, notifications, or POS synchronization

## Authentication

- Email or username plus password
- JWT/session-based authentication
- Role-based authorization
- No social login in version 1

## Hardware Integration

- Barcode scanner treated as keyboard input in browser fields
- Receipt printer handled through browser print flow initially
- Direct printer integration is not part of version 1 unless confirmed later

## Rationale

### Vite + React + TypeScript

Vite provides a fast development experience and keeps the frontend simple. React is suitable for POS screens, admin dashboards, tables, forms, and reusable components. TypeScript is required to reduce mistakes in inventory, billing, and accounting-related workflows.

### Tailwind CSS

Tailwind supports fast, consistent UI development and is suitable for building POS screens, admin panels, tables, forms, badges, alerts, and responsive layouts.

### Node.js + NestJS

NestJS gives structure to a modular ERP system. The project will naturally grow into multiple modules such as authentication, inventory, products, sales, purchases, customers, accounting, reports, barcode, settings, and audit logs.

NestJS is preferred because it provides:

- Module-based architecture
- Dependency injection
- Guards and decorators for permissions
- Validation pipes
- Clear service/controller separation
- Testable backend structure

### MySQL + Prisma

MySQL is accepted as the database for version 1. Prisma will be used to keep the database access layer strongly typed and consistent with the TypeScript backend.

This combination supports:

- Relational inventory modeling
- Transactions for POS sales and stock deduction
- Referential integrity
- Audit-friendly schemas
- Predictable migrations
- Simple local and production deployment

## Consequences

### Positive Consequences

- Strong TypeScript coverage across frontend and backend
- Clear backend module boundaries
- Better maintainability for a growing ERP system
- Prisma schema becomes a reliable source of truth for database models
- MySQL keeps hosting and operations simple for the first version
- Vite keeps the frontend lightweight and fast to build

### Tradeoffs

- Prisma abstractions must be used carefully for complex inventory transactions
- MySQL decimal handling must be designed carefully for fabric lengths and money values
- Advanced reporting may require optimized indexes and raw SQL later
- Browser printing is simpler but less controlled than native printer integration

## Implementation Guidelines

### Repository Structure

```text
frontend/
backend/
shared/
docs/
scripts/
docker/
```

### Frontend Rules

- Use TypeScript everywhere.
- Use Tailwind for styling.
- Keep POS screens optimized for speed and minimal clicks.
- Build reusable components for forms, tables, modals, badges, filters, and action bars.
- Keep business calculations out of UI components when possible.

### Backend Rules

- Use NestJS modules per business domain.
- Keep controllers thin.
- Put business rules inside services or domain-level classes.
- Use DTOs for request validation.
- Use Prisma transactions for inventory and accounting operations.
- Every stock-changing operation must be traceable.

### Database Rules

- Use MySQL-compatible Prisma schema.
- Use `Decimal` for money and fabric measurements.
- Avoid floating-point numbers for lengths and currency.
- Use explicit audit fields such as `createdAt`, `updatedAt`, `createdById`, and `updatedById` where required.
- Use database transactions for sales, returns, wastage, reconciliation, and purchase posting.

## Non-Goals for Version 1

- Mobile application
- Multi-branch implementation
- Offline-first sync engine
- Native printer driver integration
- RFID integration
- AI forecasting
- Online store
- Social login

## Review Notes

This ADR should be reviewed again before implementing:

- Offline/local network mode
- Multi-branch support
- Advanced reporting warehouse
- Native hardware integrations
- Public API integrations
