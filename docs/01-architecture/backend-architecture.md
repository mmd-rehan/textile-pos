# Backend Architecture

## Purpose

This document defines the backend architecture for the Textile ERP & POS System.

The backend is responsible for enforcing business rules, protecting inventory accuracy, processing sales, managing ledgers, and keeping all critical actions traceable.

---

## Backend Goals

1. Keep all business-critical calculations on the server.
2. Protect roll-based inventory from negative or inconsistent stock.
3. Process sales, inventory movements, and ledger entries transactionally.
4. Log wastage, shrinkage, adjustments, and sensitive actions.
5. Keep modules clean and domain-oriented.
6. Support fast POS operations.
7. Keep v1 deployable as a simple single-shop application.

---

## Recommended Backend Style

Use a modular monolith with NestJS.

Why:

- The business domain is connected and transaction-heavy.
- Inventory, sales, ledger, and audit must often update together.
- A single deployable service is easier for a single shop.
- Module boundaries keep the code maintainable.
- Future extraction to services remains possible if needed.

---

## Recommended Stack

- Node.js.
- NestJS.
- TypeScript.
- MySQL 8.
- Prisma, TypeORM, or Drizzle ORM.
- Zod, class-validator, or Nest pipes for validation.
- bcrypt or argon2 for password hashing.
- JWT or secure cookie-based sessions.

---

## Backend Folder Structure

```text
backend/
  src/
    main.ts
    app.module.ts
    config/
    common/
      decorators/
      dto/
      errors/
      filters/
      guards/
      interceptors/
      pipes/
      utils/
    database/
      migrations/
      seeds/
      transaction.ts
    modules/
      auth/
      users/
      roles/
      products/
      inventory/
      batches/
      rolls/
      sales/
      purchases/
      customers/
      ledger/
      suppliers/
      barcode/
      reports/
      settings/
      audit/
```

---

## Module Pattern

Each module should follow this pattern:

```text
module-name/
  dto/
  entities/ or models/
  module-name.controller.ts
  module-name.service.ts
  module-name.repository.ts
  module-name.policy.ts
  module-name.module.ts
```

Controller responsibilities:

- Parse request.
- Validate request DTO.
- Authenticate user.
- Call service.
- Return response.

Service responsibilities:

- Enforce business rules.
- Run transactions.
- Call repositories.
- Call audit service.
- Call ledger service where needed.

Repository responsibilities:

- Database queries.
- Row locks.
- Persistence.

Policy responsibilities:

- Permission checks.
- Critical action authorization.

---

## Core Backend Modules

### Auth Module

Responsibilities:

- Login.
- Logout.
- Token/session refresh.
- Current user endpoint.
- Password verification.
- Session invalidation.

### Users and Roles Module

Responsibilities:

- User management.
- Role assignment.
- Permission mapping.
- Active/inactive users.

### Products Module

Responsibilities:

- Categories.
- Brands.
- Products.
- Product types.
- Colors and designs.
- Unit settings.

### Batches Module

Responsibilities:

- Batch number.
- Supplier batch.
- Dye lot.
- Batch-specific metadata.
- Batch consistency warnings.

### Rolls Module

Responsibilities:

- Roll creation.
- Roll barcode.
- Original length.
- Remaining length.
- Roll status.
- Roll history.
- Roll retirement.

### Inventory Module

Responsibilities:

- Stock movements.
- Stock adjustments.
- Remnants.
- Wastage records.
- Shrinkage records.
- Inventory valuation foundation.

### Sales Module

Responsibilities:

- Retail sale.
- Wholesale sale.
- Invoice creation.
- Sale line creation.
- Payment capture.
- Discount validation.
- Return or void workflow.

### Ledger Module

Responsibilities:

- Customer ledger.
- Supplier ledger foundation.
- Payment entries.
- Outstanding balances.
- Immutable adjustment entries.

### Purchases Module

Responsibilities:

- Purchase invoice.
- Supplier selection.
- Batch creation.
- Multiple roll entry.
- Landed cost foundation.
- Purchase posting to inventory.

### Barcode Module

Responsibilities:

- Barcode generation.
- Barcode lookup.
- Barcode uniqueness.
- Label data.

### Reports Module

Responsibilities:

- Read-only summaries.
- Dashboard data.
- Sales reports.
- Inventory reports.
- Wastage reports.
- Customer credit reports.

### Audit Module

Responsibilities:

- Immutable audit log creation.
- Critical action tracking.
- Before and after values where applicable.

---

## Transaction Boundaries

Use database transactions for all write workflows that affect more than one record or any financial/inventory record.

Mandatory transaction workflows:

- Create sale.
- Create purchase with rolls.
- Receive customer payment.
- Adjust inventory.
- Reconcile roll.
- Mark roll as finished.
- Process return.
- Void invoice.
- Change customer credit limit.

---

## Inventory Deduction Service

Create a dedicated service for roll deduction.

Example interface:

```ts
interface DeductRollInput {
  rollId: string;
  billedQuantity: string;
  actualCutQuantity?: string;
  unit: 'YARD' | 'METER';
  saleLineId?: string;
  userId: string;
  reason?: string;
}
```

Core rules:

1. Convert billed and actual quantities to base unit.
2. If actual cut is empty, use billed quantity.
3. Deduct actual cut from roll remaining length.
4. Prevent negative remaining length unless authorized.
5. If actual cut is greater than billed quantity, create wastage record.
6. Create stock movement record.
7. Update roll status if needed.
8. Return updated roll state.

---

## Sale Processing Flow

```text
createSale(request)
  -> validate customer, cart, payment, permissions
  -> start DB transaction
  -> create invoice draft
  -> for each sale line:
       -> lock roll row if fabric roll item
       -> validate remaining length
       -> deduct actual cut
       -> create stock movement
       -> create wastage if needed
       -> create sale line
  -> calculate invoice totals
  -> create payment records
  -> update customer ledger if credit remains
  -> create audit log
  -> commit transaction
  -> return invoice response
```

Important:

- Roll rows must be locked during deduction.
- Final totals must be calculated on the backend.
- The frontend cart is only a draft.

---

## Roll Reconciliation Flow

```text
reconcileRoll(request)
  -> validate permission
  -> load roll
  -> compare system remaining vs physical remaining
  -> calculate difference
  -> create shrinkage/loss/remnant records where needed
  -> create stock movement
  -> update roll status
  -> create audit log
```

Rules:

- Finished roll closure must be formal.
- Difference must store user, timestamp, and reason.
- If usable fabric remains, create or update remnant record.

---

## Purchase Posting Flow

```text
createPurchase(request)
  -> validate supplier
  -> validate product and batch data
  -> start transaction
  -> create purchase invoice
  -> create or link batch
  -> create individual rolls
  -> generate roll barcodes
  -> create stock movement per roll
  -> update supplier ledger if payable remains
  -> create audit log
  -> commit transaction
```

---

## Customer Ledger Flow

Ledger entries must be append-only.

Examples:

- Sale on credit creates debit entry.
- Customer payment creates credit entry.
- Correction creates adjustment entry.

Do not silently edit historical ledger entries after posting. If a correction is required, create a reversing or adjustment entry.

---

## Authorization Pattern

Use guards for broad access and policies for business rules.

Examples:

```text
JWT Guard
  -> confirms user identity
Role Guard
  -> confirms role can access route group
Policy Check
  -> confirms user can perform exact action
```

Critical actions should call explicit policy methods.

Examples:

```ts
canAdjustInventory(user)
canVoidInvoice(user)
canOverrideNegativeStock(user)
canChangeCreditLimit(user)
canReconcileRoll(user)
```

---

## Error Handling

Use a consistent application error format.

Examples:

- `ROLL_NOT_FOUND`
- `INSUFFICIENT_ROLL_LENGTH`
- `ROLL_ALREADY_FINISHED`
- `BATCH_MISMATCH_WARNING`
- `CUSTOMER_CREDIT_LIMIT_EXCEEDED`
- `PERMISSION_DENIED`
- `INVOICE_ALREADY_PAID`
- `INVALID_MEASUREMENT_UNIT`

Errors should be specific enough for the frontend to show useful messages.

---

## Validation Rules

Backend validation must cover:

- Required fields.
- Decimal precision.
- Allowed units.
- Positive quantities.
- Valid product type.
- Valid roll status.
- Valid customer status.
- Payment total consistency.
- Discount authorization.
- Credit limit rules.

Never rely only on frontend validation.

---

## Idempotency

For sale creation and payment posting, support idempotency keys.

Reason:

- POS users may double-click.
- Network may retry.
- Browser may resubmit.

Recommended header:

```text
Idempotency-Key: <uuid>
```

Backend should store the request key, user, endpoint, and result for a safe retry window.

---

## Concurrency and Locking

Roll deduction must be safe when two users sell from the same roll.

Use database transaction plus row-level lock.

Example SQL concept:

```sql
SELECT * FROM rolls WHERE id = ? FOR UPDATE;
```

Then validate and update remaining length inside the same transaction.

---

## Background Jobs

Not required for v1, but useful later for:

- Daily reports.
- Backups.
- Low stock alerts.
- Due payment reminders.
- Report exports.

If needed, start with a simple in-process scheduler. Move to a queue later only if needed.

---

## Logging

Log:

- Application errors.
- Failed login attempts.
- Critical business action failures.
- Slow queries.
- Failed print or barcode lookups where applicable.

Do not log passwords, tokens, or sensitive payment details.

---

## Backend Testing Priorities

1. Roll deduction exact sale.
2. Roll deduction with actual cut greater than billed quantity.
3. Negative stock prevention.
4. Roll reconciliation loss.
5. Remnant creation.
6. Customer credit ledger update.
7. Sale transaction rollback on failure.
8. Permission rejection for critical action.
9. Barcode lookup.
10. Purchase posting with multiple rolls.

---

## Non-Negotiable Backend Rules

1. Backend is the source of truth for inventory.
2. Inventory writes must be transactional.
3. Roll deduction must lock the roll row.
4. Wastage must be logged when actual cut exceeds billed quantity.
5. Ledger records must be append-only.
6. Audit logs must be created for critical actions.
7. Permissions must be checked server-side.
8. Reports must be read-only.
