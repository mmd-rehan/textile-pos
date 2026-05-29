# Accounting Database Schema

## Candidate Models

### LedgerEntry

- id
- ledgerType
- accountId, optional
- customerId, optional
- supplierId, optional
- entryType
- debitAmount
- creditAmount
- referenceType
- referenceId
- description
- createdByUserId
- createdAt

### Expense

- id
- expenseDate
- category
- amount
- paymentMethod
- description
- createdByUserId
- createdAt

### Payment

- id
- paymentDirection: IN, OUT
- partyType
- partyId
- amount
- paymentMethod
- referenceNumber
- createdAt

## Note

Final accounting schema depends on whether full double-entry accounting is confirmed.
