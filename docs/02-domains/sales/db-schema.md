# Sales Database Schema

## Candidate Models

### SaleInvoice

- id
- invoiceNumber
- saleType: RETAIL, WHOLESALE
- customerId, optional
- subtotal
- discountTotal
- taxTotal, pending confirmation
- grandTotal
- paidAmount
- balanceAmount
- status
- createdByUserId
- createdAt

### SaleLine

- id
- invoiceId
- productId
- batchId, optional
- rollId, optional
- productType
- billedQuantityBase
- actualCutQuantityBase, optional
- displayUnit
- unitPrice
- discountAmount
- lineTotal

### SalePayment

- id
- invoiceId
- paymentMethod
- amount
- referenceNumber, optional
- receivedByUserId
- createdAt

### SaleReturn

- id
- invoiceId
- returnNumber
- refundAmount
- reason
- status
- createdByUserId
- createdAt

## Notes

Final schema must be normalized with inventory movements and ledger entries. Do not rely on invoice line rows alone for stock history.
