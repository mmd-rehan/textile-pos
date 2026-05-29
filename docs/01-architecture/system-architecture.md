# System Architecture

## Purpose

This document defines the high-level architecture for the Textile ERP & POS System.

The system is designed for a textile shop that sells fabric rolls, variable-length fabric, cut suit pieces, fixed products, wholesale orders, retail invoices, and credit-based sales.

The first implementation is a single-shop, web-based system. It should be simple enough to build phase by phase, but structured enough to later support offline/local network usage, multi-branch operations, accounting expansion, and advanced analytics.

---

## Architecture Goals

1. Keep roll-based inventory as the core system model.
2. Support fast POS billing for retail and wholesale workflows.
3. Track actual cut, billed quantity, wastage, shrinkage, remnants, and reconciliation.
4. Keep every inventory and financial movement traceable.
5. Use strict permissions for critical actions.
6. Keep accounting records immutable.
7. Keep the first version single-shop and practical.
8. Avoid premature complexity, but leave clean extension points.

---

## Initial Scope

### Included in v1

- Web-based frontend.
- Backend API.
- SQL/MySQL database.
- Single-shop deployment.
- User authentication and role-based access.
- Product, category, batch, and roll management.
- Retail POS.
- Wholesale POS foundation.
- Barcode scanning through normal keyboard-style scanners.
- Simple receipt printing through browser print flow.
- Customer credit ledger.
- Roll reconciliation.
- Audit logs.

### Deferred for later

- True offline-first sync.
- Multi-branch operations.
- Native desktop printer drivers.
- RFID support.
- AI forecasting.
- Online store.
- Mobile apps.
- Full general-ledger accounting depth beyond the required ledger foundation.

---

## Recommended Technical Stack

### Frontend

- Next.js with React.
- TypeScript.
- App Router.
- Tailwind CSS or another consistent design system.
- TanStack Query for server state.
- Zustand or React Context for short-lived POS UI state.

### Backend

- Node.js with NestJS.
- TypeScript.
- Modular monolith architecture.
- REST API first.
- WebSocket/SSE only where real-time updates are clearly needed.

### Database

- MySQL 8 or compatible SQL database.
- Prisma, TypeORM, or Drizzle ORM.
- Transaction-first inventory updates.
- Decimal columns for measurements and money.

### Deployment

- Single backend service.
- Single frontend app.
- Single MySQL database.
- Docker Compose for development.
- Future production can use a VPS, cloud VM, or managed database.

---

## Logical Architecture

```text
Browser Client
  |
  | HTTPS / Local Network HTTP during shop deployment
  v
Next.js Frontend
  |
  | REST API
  v
NestJS Backend API
  |
  | SQL transactions
  v
MySQL Database
```

Optional later components:

```text
Redis cache / queue
Background worker
WebSocket gateway
Backup service
Reporting warehouse
```

These are not required for the first version unless performance or operational needs justify them.

---

## Application Layers

### 1. Presentation Layer

Responsible for:

- POS screens.
- Inventory management screens.
- Purchase entry screens.
- Customer and ledger screens.
- Reports and dashboard screens.
- Barcode scan handling.
- Browser receipt printing.

This layer must not directly calculate final inventory deductions. It can preview calculations, but backend remains the source of truth.

---

### 2. API Layer

Responsible for:

- Request validation.
- Authentication.
- Authorization.
- Response formatting.
- Rate limiting where needed.
- Routing requests to domain services.

API controllers should stay thin. Business logic belongs in services.

---

### 3. Domain Service Layer

Responsible for:

- Inventory deduction.
- Sale processing.
- Purchase posting.
- Roll reconciliation.
- Wastage logging.
- Ledger posting.
- Permission-sensitive workflows.

This is the most important backend layer.

---

### 4. Data Access Layer

Responsible for:

- Database queries.
- Transactions.
- Row locking.
- Repository methods.
- Query optimization.

Inventory-changing operations must use database transactions.

---

## Core Domain Modules

### Authentication & Authorization

Handles login, sessions, users, roles, permissions, and audit identity.

### Inventory

Handles categories, products, batches, rolls, stock status, stock movements, remnants, and adjustments.

### Sales

Handles retail invoices, wholesale invoices, sale lines, payment capture, discounts, returns, and receipt data.

### Roll Engine

Handles roll-level deduction, actual cut vs billed quantity, wastage, roll status, and reconciliation.

### Barcode

Handles barcode generation, roll barcode mapping, product barcode mapping, scan lookup, and label printing data.

### Customers & Ledger

Handles customers, credit limits, outstanding balance, payments, and ledger statements.

### Purchases & Suppliers

Handles suppliers, purchase invoices, batch creation, roll entry, landed cost, and supplier payable foundation.

### Reports

Handles read-only analytics and exported reports.

### Audit Logs

Handles immutable records of sensitive system actions.

### Settings

Handles company profile, invoice preferences, measurement settings, barcode settings, tax settings, and feature flags.

---

## Core Data Flow: Purchase to Sale

```text
Purchase Entry
  -> Supplier selected
  -> Product selected or created
  -> Batch / dye lot selected or created
  -> Individual rolls entered with original length
  -> Roll barcode generated
  -> Inventory movement recorded
  -> Roll becomes available for sale
```

```text
POS Sale
  -> Barcode scanned or product searched
  -> Roll selected
  -> Billed quantity entered
  -> Actual cut entered or defaulted to billed quantity
  -> Backend validates available remaining length
  -> Backend deducts actual cut
  -> Wastage logged if actual cut > billed quantity
  -> Invoice and payment recorded
  -> Customer ledger updated if credit sale
  -> Audit and stock movement recorded
```

---

## Inventory Principle

Inventory must never be treated only as product-level stock.

The true stock unit for fabric is the roll.

```text
Category
  -> Product
    -> Batch / Dye Lot
      -> Roll / Thaan
        -> Stock Movements
```

Product-level stock can be shown as a calculated summary, but it should be derived from roll records and stock movements.

---

## Measurement Principle

The system supports yards and meters.

To avoid inconsistent calculations:

- Store fabric length internally in one base unit.
- Recommended base unit: yard.
- Store the original entered unit for display and audit.
- Use decimal precision suitable for fabric length.

Recommended conversion:

```text
1 meter = 1.09361 yards
1 yard = 0.9144 meters
```

Backend must perform final conversion and validation.

---

## Transaction Principle

Any operation that changes inventory, invoice totals, customer ledger, supplier ledger, or accounting entries must run inside a database transaction.

Examples:

- Create sale.
- Return sale.
- Adjust roll length.
- Mark roll as finished.
- Add purchase with rolls.
- Receive customer payment.
- Delete or void invoice.

---

## Audit Principle

The following actions must always create an audit log:

- Inventory adjustment.
- Price change.
- Invoice void or deletion request.
- Refund approval.
- Wastage entry.
- Roll reconciliation.
- User permission change.
- Customer credit limit change.
- Supplier payable adjustment.

Audit logs should include:

- User ID.
- Action.
- Entity type.
- Entity ID.
- Previous values where practical.
- New values where practical.
- Timestamp.
- Reason if required.

---

## Hardware Architecture

### Barcode Scanner

Use keyboard-emulation barcode scanners first.

Frontend behavior:

- Focus the scan input on POS screen.
- Accept barcode characters as normal keyboard input.
- Submit scan on Enter.
- Call backend scan lookup endpoint.

Backend behavior:

- Resolve barcode to roll or product.
- Prefer roll barcode for fabric sales.
- Return product, batch, roll, price, and remaining length.

### Receipt Printer

Use browser printing first.

Frontend behavior:

- Render receipt template.
- Open print dialog.
- Allow thermal receipt size configuration.

Native printer integration can be added later if required.

---

## Real-Time Requirements

For a single-shop version, real-time can remain simple.

Use normal API refetching after mutations for:

- POS stock updates.
- Dashboard refresh.
- Inventory lists.

Consider WebSocket or Server-Sent Events later for:

- Multi-counter POS stock conflicts.
- Live dashboard updates.
- Long-running report progress.
- Background job notifications.

---

## Security Architecture

- Passwords must be hashed with bcrypt or argon2.
- Access tokens must be short-lived.
- Refresh tokens must be stored securely if used.
- Critical actions must check permission server-side.
- Sensitive writes must require a reason where needed.
- Role checks in frontend are only for UI hiding, not security.

---

## Performance Targets

The architecture should support:

- Barcode lookup under 300ms.
- Standard API response under 500ms.
- Dashboard initial load under 2 seconds for normal shop-sized data.
- Retail invoice completion under 60 seconds.

These targets require good indexing, focused queries, and avoiding heavy reports on transactional endpoints.

---

## Future Extension Points

### Multi-Branch

Do not implement full multi-branch in v1, but avoid blocking it.

Future-ready choices:

- Keep company settings separate from operational records.
- Avoid hardcoding shop identity everywhere.
- Design stock movement records so a future `branch_id` can be added.

### Offline / Local Network

Do not implement offline sync in v1.

Future-ready choices:

- Keep backend deployable on a local shop server.
- Avoid third-party dependencies for core POS billing.
- Keep printer and scanner workflows browser-compatible.

### Advanced Accounting

Start with immutable ledger foundations.

Future-ready choices:

- Do not silently edit paid invoices.
- Use adjustment entries.
- Keep customer and supplier ledgers traceable.

---

## Architecture Decision

For v1, use a modular monolith.

Reason:

- The domain is complex, but the business starts as a single shop.
- Strong SQL transactions are needed for inventory and ledger accuracy.
- Microservices would add unnecessary operational complexity.
- Module boundaries still keep the codebase scalable.

Recommended backend module structure:

```text
src/
  modules/
    auth/
    users/
    inventory/
    products/
    batches/
    rolls/
    sales/
    purchases/
    customers/
    ledger/
    barcode/
    reports/
    settings/
    audit/
```

Recommended frontend module structure:

```text
src/
  app/
  features/
    pos/
    inventory/
    products/
    purchases/
    customers/
    reports/
    settings/
    auth/
  components/
  lib/
  hooks/
  stores/
  types/
```

---

## Non-Negotiable Architecture Rules

1. Inventory deduction must happen on the backend.
2. Roll length must never become negative unless an authorized override exists.
3. Actual cut must be the deduction quantity when provided.
4. Wastage must be logged with user and reason.
5. Accounting and ledger corrections must use adjustment entries.
6. Critical actions must be permission-protected.
7. Reports must not mutate data.
8. Every stock movement must be traceable.
