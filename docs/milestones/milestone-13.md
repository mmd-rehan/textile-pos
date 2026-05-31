Milestone 13: Testing and Hardening

Add tests and harden the Textile ERP & POS System.

Backend tests:
1. Unit conversion yard to meter and meter to yard.
2. Roll deduction exact sale.
3. Roll deduction when actual cut is greater than billed quantity.
4. Negative stock prevention.
5. Wastage creation.
6. Purchase posting with multiple rolls.
7. Sale transaction rollback on failure.
8. Customer credit ledger update.
9. Customer payment ledger update.
10. Roll reconciliation loss.
11. Remnant creation.
12. Permission rejection.
13. Barcode lookup.
14. Idempotency key behavior.

Frontend tests:
1. Login flow.
2. Permission-based navigation.
3. Product form validation.
4. Purchase roll entry form.
5. POS barcode scan to cart.
6. Measurement conversion preview.
7. Wastage display.
8. Payment validation.
9. Receipt preview.
10. Roll reconciliation form.

Also add:
- Error state testing.
- Loading state checks.
- Form server error mapping.
- Decimal input validation.
- No Float usage check where practical.

Rules:
- Do not change business behavior unless tests reveal a bug.
- Fix bugs with focused changes.
- Add missing tests for each bug found.

Acceptance criteria:
- Critical backend tests pass.
- Critical frontend tests pass.
- Sale and purchase workflows are protected by tests.
- Decimal, inventory, ledger, and permission rules are covered.