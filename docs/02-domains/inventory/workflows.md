# Inventory Workflows

## Main Workflows

### 1. Product and Batch Setup

1. Admin or authorized inventory user creates category.
2. User creates product under category.
3. User creates or selects batch/dye lot.
4. Product can now receive roll stock.

### 2. Roll Entry From Purchase

1. User opens purchase entry.
2. User selects supplier.
3. User selects product and batch.
4. User enters individual roll lengths.
5. System generates roll IDs and barcodes.
6. System creates inventory movement records for roll creation.

### 3. Roll Deduction Through Sale

1. Cashier scans or searches product/roll.
2. User selects roll.
3. User enters billed quantity and unit.
4. User enters actual cut quantity if different.
5. Backend converts quantity to base unit.
6. Backend deducts actual cut from roll remaining length.
7. Backend logs wastage if actual cut is greater than billed quantity.

### 4. Roll Reconciliation

1. Authorized user opens roll reconciliation.
2. System shows expected remaining length.
3. User enters physical remaining length.
4. System calculates shrinkage/loss or surplus.
5. User enters reason.
6. System records reconciliation and closes or updates roll status.

### 5. Remnant Handling

1. System detects remaining length under configured threshold.
2. System marks roll as remnant candidate or creates remnant record.
3. Authorized user confirms pricing and status.
4. Remnant becomes available for discounted sale if approved.

## Pending Confirmation

- Whether remnant conversion should be automatic or require approval.
- Whether reconciliation can be performed by Salesman or only Inventory Staff/Manager/Admin.
