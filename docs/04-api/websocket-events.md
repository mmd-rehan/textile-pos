# WebSocket Events

## Purpose

This document defines real-time event guidance for the Textile ERP & POS System.

The system is web-based and single-shop first. WebSockets are optional for v1 but useful for keeping POS, inventory, dashboard, and reporting screens fresh without manual refresh.

---

## When to Use WebSockets

Use WebSockets for:

- roll stock changes
- sale completed events
- roll retired events
- wastage recorded events
- dashboard metric refresh signals
- customer ledger balance updates
- barcode print status if needed
- user/session notifications

Do not use WebSockets for core business validation.

The REST API remains the source of truth.

---

## Real-Time Source of Truth

All important changes must happen through backend REST command endpoints first.

Example:

```http
POST /api/v1/sales/retail
```

After successful transaction commit, backend may publish:

```text
sale.created
roll.updated
inventory.movement.created
customer.ledger.updated
dashboard.metrics.invalidate
```

---

## Event Naming

Use lowercase dot-separated names.

Examples:

```text
sale.created
sale.cancelled
sale.returned
roll.updated
roll.retired
inventory.movement.created
wastage.recorded
customer.ledger.updated
purchase.posted
barcode.printed
dashboard.metrics.invalidate
```

---

## Event Envelope

All WebSocket events should follow one shape.

```json
{
  "event": "roll.updated",
  "data": {
    "rollId": "roll_123",
    "remainingLength": "18.40",
    "status": "ACTIVE"
  },
  "meta": {
    "eventId": "evt_123",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## Event Delivery Rule

WebSocket events are notification signals, not the only data source.

Frontend should:

1. receive event
2. invalidate relevant TanStack Query cache
3. refetch authoritative data from REST API where needed

Example:

```text
roll.updated received
invalidate ["roll", rollId]
invalidate ["rolls"]
invalidate ["inventory-summary"]
```

---

## Recommended WebSocket Technology

With NestJS:

```text
@nestjs/websockets
Socket.IO or native ws
```

Recommended for v1:

```text
Socket.IO
```

Reason:

- simple browser integration
- reconnection support
- room/channel support
- works well for dashboards and POS screens

Pending confirmation:

```text
Whether WebSockets are needed in v1 or can be deferred.
```

---

## Authentication

WebSocket connections must authenticate using the same user/session strategy as REST APIs.

Connection should be rejected if:

- user is not authenticated
- user is inactive
- token/session is expired

Events should be scoped by permission.

Example:

- cashier may receive POS/inventory availability events
- accountant may receive ledger/payment events
- admin may receive all operational events

---

## Rooms / Channels

Single-shop v1 can use simple rooms.

Recommended rooms:

```text
shop:current
pos
inventory
sales
reports
accounting
user:{userId}
```

Future multi-branch may use:

```text
branch:{branchId}
```

but multi-branch implementation is deferred.

---

## Core Events

### Sale Created

```json
{
  "event": "sale.created",
  "data": {
    "saleId": "sale_123",
    "invoiceNumber": "INV-0001",
    "saleType": "RETAIL",
    "customerId": "customer_123",
    "totalAmount": "3500.00",
    "paymentStatus": "PAID"
  },
  "meta": {
    "eventId": "evt_123",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

Frontend action:

```text
invalidate sales list
invalidate dashboard metrics
invalidate customer ledger if customerId exists
```

---

### Roll Updated

```json
{
  "event": "roll.updated",
  "data": {
    "rollId": "roll_123",
    "productId": "product_123",
    "batchId": "batch_123",
    "remainingLength": "18.40",
    "status": "ACTIVE"
  },
  "meta": {
    "eventId": "evt_124",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

Frontend action:

```text
invalidate roll detail
invalidate roll list
invalidate inventory summary
```

---

### Inventory Movement Created

```json
{
  "event": "inventory.movement.created",
  "data": {
    "movementId": "movement_123",
    "rollId": "roll_123",
    "movementType": "SALE",
    "quantity": "3.20",
    "unit": "YARD"
  },
  "meta": {
    "eventId": "evt_125",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

---

### Wastage Recorded

```json
{
  "event": "wastage.recorded",
  "data": {
    "wastageId": "wastage_123",
    "rollId": "roll_123",
    "userId": "user_123",
    "billedLength": "3.00",
    "actualCutLength": "3.20",
    "wastageLength": "0.20",
    "unit": "YARD"
  },
  "meta": {
    "eventId": "evt_126",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

Frontend action:

```text
invalidate wastage report
invalidate user performance metrics
invalidate roll detail
```

---

### Roll Retired

```json
{
  "event": "roll.retired",
  "data": {
    "rollId": "roll_123",
    "expectedRemainingLength": "0.80",
    "actualRemainingLength": "0.00",
    "shrinkageLength": "0.80",
    "retiredByUserId": "user_123"
  },
  "meta": {
    "eventId": "evt_127",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

---

### Customer Ledger Updated

```json
{
  "event": "customer.ledger.updated",
  "data": {
    "customerId": "customer_123",
    "outstandingBalance": "7500.00"
  },
  "meta": {
    "eventId": "evt_128",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

---

### Dashboard Metrics Invalidate

```json
{
  "event": "dashboard.metrics.invalidate",
  "data": {
    "areas": [
      "sales",
      "inventory",
      "wastage",
      "credit"
    ]
  },
  "meta": {
    "eventId": "evt_129",
    "requestId": "req_123",
    "occurredAt": "2026-05-29T10:30:00.000Z"
  }
}
```

Frontend action:

```text
refetch dashboard cards and charts
```

---

## Client-to-Server Events

Avoid using client WebSocket events for business-changing operations in v1.

Business-changing operations should use REST APIs for:

- validation
- database transaction
- audit logs
- idempotency
- permission checks

Allowed client events:

```text
ping
subscribe
unsubscribe
```

Example:

```json
{
  "event": "subscribe",
  "data": {
    "room": "inventory"
  }
}
```

---

## Reconnection Behavior

Frontend should handle reconnects safely:

- do not assume missed events were received
- refetch key queries after reconnect
- show connection status only if it affects POS workflow
- do not block sales only because WebSocket is disconnected if REST API is available

---

## Offline / Local Network Note

The user has mentioned future local-network/offline-style usage, but it is not part of v1 planning yet.

Therefore:

```text
Do not design offline event synchronization in v1.
```

Future planning may include:

- local server
- local network clients
- offline queue
- sync conflict handling

---

## Event Persistence

For v1, WebSocket events do not need to be stored as a separate event store unless needed.

Important business records must still be stored in database tables:

- sales
- inventory movements
- wastage records
- audit logs
- ledger entries
- roll retirements

Pending confirmation:

```text
Whether an outbox/event table is needed in v1.
```

Recommended for reliability:

```text
Use transactional outbox later if events become critical.
```

---

## Pending Confirmation

```text
- whether WebSockets are included in v1
- Socket.IO vs native ws
- exact event names after Prisma models are finalized
- whether event outbox is needed
- whether receipt printer status needs real-time events
- whether dashboard should auto-refresh or use manual refresh in v1
```
