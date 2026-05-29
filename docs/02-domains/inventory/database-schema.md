# Inventory Database Schema

## Purpose

This is a domain-level schema draft for MySQL with Prisma. Final Prisma schema belongs in `docs/03-database/erd.md` and implementation migrations.

## Candidate Models

### Category

- id
- name
- description
- isActive
- createdAt
- updatedAt

### Product

- id
- categoryId
- code
- name
- productType: VARIABLE_FABRIC, CUT_PIECE, FIXED_PRODUCT
- defaultUnit: YARD or METER
- isActive
- createdAt
- updatedAt

### Batch

- id
- productId
- batchNumber
- supplierBatchNumber, optional
- dyeLot, optional
- colorName, optional
- purchaseDate, optional
- isActive

### Roll

- id
- productId
- batchId
- supplierId, optional
- rollCode
- barcode
- originalLengthBase
- remainingLengthBase
- baseUnit
- purchasePrice
- salePrice
- status: ACTIVE, RESERVED, REMNANT, FINISHED, DAMAGED, ARCHIVED
- createdAt
- updatedAt

### InventoryMovement

- id
- rollId
- movementType: PURCHASE, SALE, RETURN, WASTAGE, ADJUSTMENT, RECONCILIATION, REMNANT_CONVERSION
- quantityBase
- quantityDirection: IN or OUT
- referenceType
- referenceId
- reason
- createdByUserId
- createdAt

### WastageEntry

- id
- rollId
- saleLineId, optional
- billedQuantityBase
- actualCutQuantityBase
- wastageQuantityBase
- reason
- createdByUserId
- createdAt

### RollReconciliation

- id
- rollId
- expectedRemainingBase
- physicalRemainingBase
- differenceBase
- reason
- statusAfter
- createdByUserId
- createdAt

## Schema Rules

- Use Decimal for all quantity and money values.
- Do not use JavaScript float for length or money calculations.
- Use database indexes on barcode, rollCode, productId, batchId, status, and createdAt.
- Use soft delete or archived status for important inventory records.
