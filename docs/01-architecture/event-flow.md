# Event Flow Architecture

## Purpose

This document defines important business event flows in the Textile ERP & POS System.

In this project, an event means a meaningful business action such as purchase posted, roll deducted, wastage created, invoice posted, customer payment received, or roll reconciled.

The first version does not require a complex event bus. Events can be implemented as domain service calls and audit records inside the backend. Later, the same concepts can be expanded to queues, notifications, or real-time updates.

---

## Event Flow Goals

1. Make business workflows traceable.
2. Keep inventory, sales, ledger, and audit records synchronized.
3. Avoid hidden side effects.
4. Keep all critical flows transaction-safe.
5. Make future reporting and notifications easier.

---

## Event Types

### Inventory Events

```text
ROLL_CREATED
ROLL_BARCODE_GENERATED
ROLL_DEDUCTED
ROLL_RECONCILED
ROLL_MARKED_FINISHED
REMNANT_CREATED
WASTAGE_RECORDED
STOCK_ADJUSTED
```

### Sales Events

```text
SALE_CREATED
SALE_POSTED
SALE_PAYMENT_RECEIVED
SALE_CREDIT_CREATED
SALE_VOIDED
SALE_RETURNED
```

### Purchase Events

```text
PURCHASE_CREATED
PURCHASE_POSTED
PURCHASE_ROLLS_CREATED
SUPPLIER_PAYABLE_CREATED
```

### Ledger Events

```text
CUSTOMER_LEDGER_ENTRY_CREATED
CUSTOMER_PAYMENT_RECEIVED
SUPPLIER_LEDGER_ENTRY_CREATED
LEDGER_ADJUSTMENT_CREATED
```

### Security and Audit Events

```text
USER_LOGGED_IN
LOGIN_FAILED
PERMISSION_CHANGED
CRITICAL_ACTION_PERFORMED
```

---

## Event Implementation in v1

Use direct service orchestration inside one backend transaction.

Example:

```text
SalesService.createRetailSale()
  -> RollService.deductRoll()
  -> InventoryService.createStockMovement()
  -> WastageService.createRecord()
  -> LedgerService.createCustomerEntry()
  -> AuditService.log()
```

This keeps v1 simple and reliable.

Do not introduce Kafka, RabbitMQ, or a distributed event system in v1 unless there is a real operational need.

---

## Purchase Event Flow

```text
Purchase form submitted
  -> Validate supplier
  -> Validate product and batch
  -> Create purchase invoice
  -> Create rolls
  -> Generate barcodes
  -> Create PURCHASE_IN stock movements
  -> Create supplier ledger entry if payable
  -> Audit purchase posting
```

Business result:

- New rolls become available for sale.
- Each roll has original and remaining length.
- Each roll can be scanned by barcode.
- Purchase history is traceable.

---

## Retail Sale Event Flow

```text
Barcode scanned
  -> Barcode lookup returns roll/product
  -> Cashier enters billed quantity and actual cut
  -> Sale submitted
  -> Backend starts transaction
  -> Invoice created
  -> Roll locked
  -> Actual cut converted to base unit
  -> Roll remaining length deducted
  -> Stock movement created
  -> Wastage recorded if actual cut > billed quantity
  -> Payment recorded
  -> Customer ledger updated if credit remains
  -> Audit log created
  -> Transaction committed
  -> Receipt returned for printing
```

---

## Wholesale Sale Event Flow

```text
Wholesale customer selected
  -> Multiple rolls or products selected
  -> Customer-specific price applied
  -> Credit terms checked
  -> Invoice submitted
  -> Backend deducts stock per roll
  -> Ledger entry created for credit balance
  -> Payment records created if partial payment
  -> Delivery challan data generated if needed
  -> Audit log created
```

Wholesale flow should stay separate from retail because order size, pricing, credit, and delivery behavior differ.

---

## Actual Cut and Wastage Event Flow

```text
Sale line submitted
  -> billed quantity = 3.00 yards
  -> actual cut = 3.20 yards
  -> backend calculates wastage = 0.20 yards
  -> roll deducted by 3.20 yards
  -> sale line stores billed and actual values
  -> wastage record created
  -> stock movement created as SALE_OUT or WASTAGE_OUT depending reporting design
  -> salesperson accountability stored
```

Important rule:

Inventory deduction follows actual cut, not billed quantity.

---

## Roll Reconciliation Event Flow

```text
User opens roll reconciliation
  -> System shows expected remaining length
  -> User enters physical remaining length
  -> Backend calculates difference
  -> If difference is zero, mark matched or finished
  -> If physical is lower, record shrinkage/loss
  -> If physical is usable small piece, create remnant
  -> Create stock movement
  -> Update roll status
  -> Audit reconciliation
```

---

## Customer Credit Event Flow

```text
Sale posted with unpaid balance
  -> Customer ledger debit entry created
  -> Customer current balance updated or recalculated
  -> Credit limit checked
  -> Receipt shows remaining balance
```

```text
Customer payment received
  -> Payment record created
  -> Customer ledger credit entry created
  -> Outstanding balance updated or recalculated
  -> Receipt issued if needed
  -> Audit entry created
```

---

## Invoice Void Event Flow

Invoice voiding is sensitive.

```text
Void requested
  -> Check permission
  -> Require reason
  -> Load invoice
  -> Validate invoice can be voided
  -> Reverse stock movements if allowed by policy
  -> Create ledger adjustment if needed
  -> Mark invoice voided
  -> Audit action
```

Do not hard-delete invoices.

---

## Event Recording Strategy

For v1, events are recorded through business tables:

- stock_movements for inventory events.
- customer_ledger_entries for customer financial events.
- supplier_ledger_entries for supplier financial events.
- audit_logs for sensitive user actions.
- sale_invoices and purchase_invoices for commercial documents.

An explicit `domain_events` table is optional later.

---

## Event Consistency Rules

1. If invoice creation fails, roll deduction must rollback.
2. If roll deduction fails, invoice must not be posted.
3. If ledger update fails, sale should rollback.
4. If audit log fails for critical action, the critical action should rollback.
5. Reports should read committed records only.

---

## Real-Time UI Updates

For v1:

- Use API refetch after successful mutations.
- Keep POS simple and reliable.

Later:

- Add WebSocket events for multi-counter stock updates.
- Add dashboard live refresh.
- Add notification events for low stock and due credit.

---

## Non-Negotiable Event Flow Rules

1. Sale posting must update invoice, inventory, payment, ledger, and audit consistently.
2. Roll deduction must be inside the sale transaction.
3. Wastage must be recorded when actual cut exceeds billed quantity.
4. Roll reconciliation must create traceable records.
5. Invoice voiding must reverse through controlled records, not deletion.
6. Event side effects must be explicit in service code.
