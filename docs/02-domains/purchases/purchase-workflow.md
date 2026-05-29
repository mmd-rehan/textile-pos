# Purchase Workflow

## Flow

1. User selects supplier.
2. User selects or creates product.
3. User selects or creates batch/dye lot.
4. User enters purchase line details.
5. User enters individual roll lengths.
6. System generates roll IDs and barcodes.
7. System creates purchase record.
8. System creates roll records.
9. System creates inventory movement records.
10. System updates supplier payable if purchase is unpaid/credit.

## Rules

- Purchase completion should be transactional.
- Individual roll lengths must be stored.
- Purchase records should not be silently deleted.
