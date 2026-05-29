# Modal Patterns

## Status

Draft v1.

This document defines when to use modals, drawers, confirmation dialogs, and wizards.

---

## Modal Principles

Use modals only when the user needs to complete a focused task without leaving the current page.

Do not use modals for long workflows unless the workflow is intentionally step-based.

---

## Modal Types

### Confirmation dialog

Use for actions that need a clear decision.

Examples:

- complete sale with credit balance
- confirm refund
- confirm invoice void
- confirm roll retirement
- approve negative stock override

### Quick create modal

Use when creating a related record during another workflow.

Examples:

- create category during product creation
- create supplier during purchase entry
- create customer during POS credit sale
- create batch during roll entry

### Detail drawer

Use when viewing details without leaving a list.

Examples:

- roll detail
- invoice detail
- customer ledger preview
- supplier purchase history

### Wizard modal

Use for multi-step risky workflows.

Examples:

- roll reconciliation
- return and refund
- purchase receiving

---

## Confirmation Dialog Rules

A confirmation dialog must include:

- clear title
- explanation of impact
- affected record
- primary action
- cancel action
- reason field for sensitive actions

Example:

```text
Mark Roll as Finished?

Roll R-1001 will be closed after reconciliation.
Expected remaining: 0.80 yd
Actual remaining: 0.00 yd
Recorded loss: 0.80 yd

Reason: [required]
[Cancel] [Mark as Finished]
```

---

## Destructive Action Pattern

For destructive actions:

- title must clearly state the action
- explain that records may be audited
- require permission
- require reason
- do not use vague button labels

Good button labels:

- Void Invoice
- Delete Draft
- Approve Refund
- Retire Roll

Avoid:

- OK
- Yes
- Continue

---

## Roll Reconciliation Wizard

Roll reconciliation is a high-risk inventory workflow.

Recommended steps:

1. Select or confirm roll
2. Show expected remaining length
3. Enter actual physical remaining length
4. Show difference as shortage, excess, or exact match
5. Require reason if difference exists
6. Confirm responsible user
7. Finish and write audit record

The modal should clearly show:

- expected remaining
- actual remaining
- shrinkage/loss
- remnant result where applicable
- timestamp
- user

---

## POS Payment Modal

Use a payment modal or checkout panel for payment completion.

It should show:

- invoice total
- discount
- paid amount
- due amount
- payment method
- customer credit impact
- print option

Credit sale should make outstanding amount very clear.

---

## Print Modal

Print flows can use a modal or drawer.

Use for:

- invoice print preview
- barcode label preview
- receipt printer instructions
- retry after print failure

Browser print limitations should be explained in user-friendly language.

---

## Drawer Rules

Use drawers for secondary information.

Examples:

- roll movement history
- customer ledger summary
- invoice detail
- product stock breakdown

Drawers should not hide unsaved form changes.

---

## Pending Confirmation

The following modal behaviors need confirmation:

- exact manager approval flow
- whether typed confirmation is required for destructive actions
- whether invoice void is allowed after daily closing
- whether roll retirement can be reversed
- exact print preview layout
