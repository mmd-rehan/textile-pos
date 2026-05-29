# Purchase Edge Cases

## Edge Cases

- Duplicate roll barcode during purchase.
- Roll length entered as zero or negative.
- Purchase completed but barcode print fails.
- Supplier selected incorrectly.
- Batch created with wrong product.
- Roll cost missing.
- Purchase cancellation after some rolls sold.

## Rule

If purchase creates stock that later moved, cancellation should be restricted and handled by adjustment/return workflow.
