# Inventory Edge Cases

## Edge Cases

### Sale Quantity Greater Than Remaining Length

Backend must reject the sale unless a future override permission is confirmed.

### Actual Cut Less Than Billed Quantity

The system should allow it only if business approves this scenario. Until confirmed, it should be flagged for review because it affects customer fairness and inventory accuracy.

### Actual Cut Greater Than Billed Quantity

Deduct actual cut and create wastage entry.

### Roll Remaining Length Becomes Zero

Roll should be marked as finished only through reconciliation, not silently hidden.

### Batch Mismatch

If customer requires matching batch, POS should warn before adding fabric from a different batch.

### Duplicate Barcode

System must reject duplicate active barcode values.

### Decimal Precision

All length operations must use decimal-safe calculations, not floating point arithmetic in business logic.

### Manual Adjustment

Manual adjustment requires permission, reason, audit log, and inventory movement record.

### Remnant Threshold

If threshold is not configured, the system should not auto-convert remnants. It may show a warning only.
