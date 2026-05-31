Milestone 9: Roll Reconciliation, Wastage, and Remnants

Implement roll reconciliation, wastage reporting foundation, and remnant handling.

Backend modules:
- rolls
- inventory
- wastage
- remnants
- audit

Backend APIs:
- POST /api/v1/rolls/:id/reconcile
- POST /api/v1/rolls/:id/mark-finished
- GET /api/v1/wastage
- GET /api/v1/remnants
- POST /api/v1/remnants
- GET /api/v1/rolls/:id/reconciliations

Reconciliation flow:
1. Validate permission.
2. Load roll.
3. Compare system remaining length with physical remaining length.
4. Calculate difference.
5. If physical is lower, record shrinkage or loss.
6. If physical remaining is small but usable, create remnant.
7. Create inventory movement.
8. Update roll status.
9. Create audit log.
10. Require reason for mismatch.

Remnant rules:
- Small leftover fabric can be moved to remnant inventory.
- Remnant has sourceRollId, productId, batchId, lengthYard, barcode, salePrice, status.
- Remnant should be traceable back to original roll.

Frontend:
- Roll reconciliation page
- Mark roll as finished action
- Physical remaining input
- Difference preview
- Reason field
- Remnant list
- Wastage list
- User-wise wastage basic report

Rules:
- Reconciliation must use transaction.
- Difference must never be hidden.
- Roll closure must be formal.
- Audit log is required.

Acceptance criteria:
- Inventory staff can reconcile roll if permitted.
- System records matched, shrinkage, excess, or remnant result.
- Inventory movement is created.
- Audit log is created.
- Remnants are listed and traceable.