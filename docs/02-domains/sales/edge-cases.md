# Sales Edge Cases

## Edge Cases

### Barcode Scans Product Instead of Roll

System should open roll selection filtered by product.

### Barcode Scans Roll

System should add/select the exact roll.

### Batch Mismatch

Warn user when the sale uses multiple batches for a customer expecting matching fabric.

### Customer Credit Limit Exceeded

Block or require approval, pending final credit limit policy.

### Payment Less Than Invoice Total

Allowed only for credit-enabled customer or approved partial payment workflow.

### Actual Cut Greater Than Remaining Length

Backend must reject.

### Discount Greater Than Line Total

Backend must reject.

### Duplicate Submit

Backend must use idempotency or safe transaction design to prevent duplicate invoices.

### Printer Failure

Invoice should remain completed. User can reprint receipt.
