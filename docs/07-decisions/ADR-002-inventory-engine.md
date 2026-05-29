# ADR-002: Roll-Based Inventory Engine

## Status

Accepted

## Context

The core business problem is that textile inventory is not sold only in fixed units. Fabric is sold in variable measurements such as yards and meters. Sales may deduct 2.75 yards, 3.20 meters, 5.5 yards, full rolls, partial rolls, cut suits, or small remnants.

Traditional product-level inventory is not enough because two rolls of the same product may have different:

- Original length
- Remaining length
- Batch or dye lot
- Purchase cost
- Supplier
- Barcode
- Status
- Wastage history

The system must model the real textile workflow accurately and must not hide losses caused by over-cutting, shrinkage, damaged pieces, incorrect measurement, or untracked remnants.

## Decision

Inventory will be managed primarily at roll level.

The inventory hierarchy will be:

```text
Category
  -> Product
    -> Batch / Dye Lot
      -> Roll / Thaan
        -> Inventory Movements
          -> Sales, Returns, Wastage, Adjustments, Reconciliation
```

A product is not the true stock unit for variable-length fabric. The true stock unit is the roll.

## Core Principles

### 1. Every Roll Is Unique

Each roll must have:

- Unique roll ID
- Barcode
- Product reference
- Batch or dye lot reference
- Original length
- Current remaining length
- Purchase cost
- Sale price or pricing reference
- Supplier or purchase reference
- Status

### 2. Inventory Cannot Become Negative

The system must prevent negative roll balance by default.

Negative stock or overselling may only be allowed through an explicit authorized override, and that override must be logged.

### 3. Actual Cut Controls Inventory Deduction

If billed quantity and actual cut quantity differ, inventory deduction must use actual cut quantity.

Example:

```text
Billed quantity: 3 yards
Actual cut: 3.2 yards
Inventory deducted: 3.2 yards
Wastage recorded: 0.2 yards
```

### 4. Wastage Must Be Logged

Any difference between billed quantity and actual cut must create a wastage entry when actual cut is greater than billed quantity.

The wastage record must include:

- Roll
- Product
- Batch
- Sale line if applicable
- Billed quantity
- Actual cut quantity
- Wastage quantity
- Responsible user
- Reason if provided
- Timestamp

### 5. Roll Retirement Is Mandatory

A finished roll must not simply disappear from stock.

The system must provide a roll retirement or reconciliation workflow:

```text
Expected remaining length
vs
Actual physical remaining length
```

The difference must be recorded as shrinkage, loss, adjustment, or remnant depending on the final business rule selected for that case.

### 6. Remnants Must Be Trackable

Small leftover fabric pieces should be tracked as remnants or chants instead of being lost.

A remnant threshold may be configured later. Until confirmed, the system should support remnant handling but should not hard-code a final threshold inside the core engine without configuration.

### 7. Batch Consistency Must Be Preserved

The POS and sales workflows should be aware of batch and dye lot.

When matching fabric is important, the system should prefer or warn for same-batch selection.

## Supported Inventory Item Types

### Variable-Length Fabric

Examples:

- Wash & Wear
- Cotton
- Lawn
- Silk
- Palachi

Behavior:

- Managed through rolls
- Sold in yards or meters
- Deducted by actual cut length
- Supports wastage, shrinkage, remnant, and roll reconciliation

### Cut Suit Pieces

Examples:

- 3-piece suit
- Kids suit
- Ready-cut suit

Behavior:

- Quantity-based sale
- May be received as finished stock
- May optionally be created from a roll later if confirmed

### Fixed Products

Examples:

- Shawls
- Scarves
- Blankets
- Accessories

Behavior:

- Quantity-based stock
- Simple stock movement
- No roll-length deduction unless linked to a fabric roll by a confirmed workflow

## Inventory Movement Ledger

All inventory changes must be represented as movement records.

Movement types may include:

- Purchase receipt
- Sale deduction
- Sale return
- Wastage
- Shrinkage
- Manual adjustment
- Roll reconciliation
- Remnant creation
- Remnant sale

Each movement should include:

- Movement type
- Product ID
- Batch ID when applicable
- Roll ID when applicable
- Quantity or length
- Unit
- Normalized base quantity
- Reference document
- Responsible user
- Timestamp
- Notes

## Measurement Rules

The system must support yards and meters.

Backend inventory calculations should normalize measurements to a base unit. The recommended base unit is yard because textile businesses in the target context commonly use yards, but this should remain configurable if needed.

Conversion:

```text
1 meter = 1.09361 yards
1 yard = 0.9144 meters
```

Rules:

- Store original input unit for display and audit.
- Store normalized base quantity for calculations.
- Use Decimal, not floating-point numbers.
- Round only at display or invoice level, not during internal movement calculations unless required by confirmed business rules.

## POS Deduction Flow

```text
1. User scans or selects roll.
2. User enters billed quantity and unit.
3. User optionally enters actual cut quantity and unit.
4. System converts both to base unit.
5. System validates enough remaining roll length.
6. System deducts actual cut quantity if provided.
7. System records wastage if actual cut is greater than billed quantity.
8. System creates sale line and inventory movement in a single database transaction.
9. System updates roll remaining length.
10. System prints or prepares invoice.
```

## Transaction Requirements

The following operations must use database transactions:

- Sale posting
- Sale return
- Purchase posting
- Roll adjustment
- Roll reconciliation
- Wastage entry
- Remnant creation
- Invoice cancellation or reversal

## Consequences

### Positive Consequences

- Accurate roll traceability
- Better wastage visibility
- More reliable profit calculation
- Better batch control
- Easier audit of salesperson actions
- Textile-specific workflows remain close to real business behavior

### Tradeoffs

- More complex database model than normal POS software
- POS screens need roll selection and measurement input
- Reporting must aggregate from roll and movement data
- Inventory service must be carefully tested for edge cases

## Implementation Notes

- Never update roll remaining length without an inventory movement.
- Never delete stock movement records silently.
- Use reversal records instead of destructive correction where possible.
- Keep product-level stock as derived or cached data, not the source of truth for variable-length fabric.
- Keep roll-level stock as the source of truth.

## Open Questions

These items require confirmation before implementation:

1. What should be the default remnant threshold?
2. Should actual cut be mandatory for every fabric sale or optional?
3. Should salesmen be allowed to enter actual cut greater than billed quantity without manager approval?
4. Should roll retirement be allowed by Salesman, Inventory Staff, Manager, or only Admin?
5. Should roll length be stored internally in yards, meters, or configurable base unit?
