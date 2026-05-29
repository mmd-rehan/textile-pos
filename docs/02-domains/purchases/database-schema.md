# Purchase Database Schema

## Candidate Models

### Supplier

- id
- name
- phone
- address
- isActive
- createdAt
- updatedAt

### Purchase

- id
- supplierId
- purchaseNumber
- purchaseDate
- subtotal
- additionalCostTotal
- grandTotal
- paidAmount
- balanceAmount
- status
- createdByUserId
- createdAt

### PurchaseLine

- id
- purchaseId
- productId
- batchId
- quantitySummary
- unitCost
- lineTotal

### PurchaseRoll

- id
- purchaseLineId
- rollId
- originalLengthBase
- purchaseCost

### SupplierLedgerEntry

- id
- supplierId
- entryType
- debitAmount
- creditAmount
- referenceType
- referenceId
- createdAt
