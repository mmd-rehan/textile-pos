# Global Business Rules

## 1. Inventory Is Roll-Based

Inventory must always be tracked per roll.

Products alone are insufficient for accurate inventory tracking.

---

## 2. Rolls Are Unique

Each roll must have:
- unique ID
- barcode
- batch
- original length
- remaining length

---

## 3. Inventory Cannot Become Negative

System must prevent:
- negative remaining roll length
- overselling

unless explicitly authorized.

---

## 4. Actual Cut Overrides Billed Quantity

Inventory deduction should prioritize actual cut length.

Example:
- billed = 3 yards
- actual cut = 3.2 yards

Inventory deducted:
- 3.2 yards

---

## 5. Wastage Must Be Logged

All wastage must store:
- user
- timestamp
- roll
- reason

---

## 6. Batch Consistency Matters

Sales should prefer same batch matching whenever possible.

---

## 7. Roll Retirement Is Mandatory

Finished rolls must be formally closed through reconciliation workflow.

---

## 8. Every Inventory Movement Must Be Traceable

The system must log:
- purchases
- sales
- returns
- wastage
- adjustments
- transfers

---

## 9. Accounting Entries Must Be Immutable

Financial records should never be silently modified.

Corrections must create adjustment entries.

---

## 10. Permissions Must Be Strict

Critical actions require authorization:
- inventory adjustments
- invoice deletion
- refund approval
- negative stock override

---

## 11. Reports Must Use Real-Time Data

Analytics should reflect current inventory and financial state.

---

## 12. Retail & Wholesale Flows Are Separate

The system should not force identical workflows for:
- retail
- wholesale

because business behavior differs significantly.