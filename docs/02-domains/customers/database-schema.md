# Customer Database Schema

## Candidate Models

### Customer

- id
- name
- phone
- address
- customerType
- creditEnabled
- creditLimit, optional
- currentBalance, derived or cached carefully
- isActive
- createdAt
- updatedAt

### CustomerLedgerEntry

- id
- customerId
- entryType
- debitAmount
- creditAmount
- balanceAfter, optional cached snapshot
- referenceType
- referenceId
- description
- createdByUserId
- createdAt

### CustomerPayment

- id
- customerId
- amount
- paymentMethod
- referenceNumber
- receivedByUserId
- createdAt

## Notes

Balance may be computed from ledger entries or cached with strict transaction rules. Final decision belongs in database docs.
