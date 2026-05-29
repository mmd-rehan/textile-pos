# Form Standards

## Status

Draft v1.

This document defines how forms should behave across the Textile ERP & POS System.

---

## Form Principles

Forms must be:

- fast to complete
- clear for non-technical users
- strict where money or inventory is affected
- forgiving for search and lookup fields
- explicit for sensitive operations

---

## General Form Layout

Use a consistent structure:

```text
Page title
Short description
Form section 1
Form section 2
Form actions
```

For long forms, use grouped sections.

Examples:

- Product Details
- Roll Details
- Pricing
- Supplier Information
- Payment Details
- Audit Reason

---

## Required Fields

Required fields must be clearly marked.

Do not rely only on a red border.

Example:

```text
Product Name *
```

Validation error:

```text
Product name is required.
```

---

## Textile Measurement Inputs

Measurement inputs are critical.

Every measurement input must include:

- numeric value
- unit selection where needed
- decimal support
- validation for zero or negative values
- conversion display where helpful

Example:

```text
Billed Quantity: 3.00 yd
Actual Cut: 3.20 yd
Wastage: 0.20 yd
Remaining After Sale: 18.40 yd
```

---

## Money Inputs

Money inputs must:

- prevent invalid characters
- support decimals
- show currency where configured
- right-align values in dense forms
- avoid floating point display confusion

Examples:

```text
Sale Price Per Yard
Total Discount
Paid Amount
Outstanding Balance
```

Currency is Pending Confirmation.

---

## Product and Roll Entry Forms

### Product form

Recommended fields:

- product name
- product code
- category
- brand
- product type
- default unit
- default sale price
- active status

### Batch form

Recommended fields:

- batch number
- supplier batch number
- dye lot
- product
- purchase reference
- notes

### Roll form

Recommended fields:

- roll code
- barcode
- product
- batch
- original length
- current remaining length
- purchase price
- sale price
- supplier
- status

---

## POS Forms

POS forms should avoid standard long-form behavior.

Rules:

- barcode/search input should be primary focus
- measurement input should be quick
- cart update should be immediate after valid input
- payment input should show total, paid, due, and change clearly
- sale completion must show final confirmation only when risk exists

Risk examples:

- credit sale
- discount beyond allowed limit
- actual cut greater than billed quantity
- negative stock override request

---

## Inline Create

The system should support creating related records without leaving the workflow where confirmed by the vision.

Examples:

- create category while creating product
- create brand while creating product
- create supplier during purchase entry
- create batch during purchase entry
- create customer during POS credit sale

Inline create should open in a modal or drawer, then return the user to the original form.

---

## Validation Rules

### Validate immediately for simple rules

Examples:

- required field
- invalid number
- invalid phone format
- negative quantity

### Validate on submit for business rules

Examples:

- credit limit exceeded
- duplicate barcode
- roll already finished
- insufficient remaining length
- unauthorized action

---

## Sensitive Forms

Sensitive actions must require a reason.

Examples:

- inventory adjustment
- invoice deletion
- refund
- roll retirement
- wastage correction
- negative stock override

Recommended fields:

- reason
- optional note
- manager/admin approval where required

---

## Error Display

Errors should appear:

- near the field when field-specific
- at the top of the form when general
- in a modal only for blocking critical errors

Good examples:

```text
Remaining roll length is only 2.40 yd. Actual cut cannot be 3.00 yd.
```

```text
This barcode already belongs to Roll R-1001.
```

---

## Pending Confirmation

The following form rules need confirmation later:

- phone number format and uniqueness
- invoice numbering format
- currency
- tax fields
- exact approval flow for manager override
- exact remnant threshold setting
- mandatory customer fields for wholesale
