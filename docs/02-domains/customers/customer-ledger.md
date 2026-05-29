# Customer Ledger

## Purpose

The customer ledger records credit sales, payments, refunds, adjustments, and opening balances.

## Ledger Entry Types

- OPENING_BALANCE
- SALE_CREDIT
- PAYMENT_RECEIVED
- REFUND
- ADJUSTMENT_DEBIT
- ADJUSTMENT_CREDIT

## Rules

- Ledger entries should not be silently edited.
- Corrections require adjustment entries.
- Every ledger entry should reference source document where applicable.
- Ledger balance should be reproducible from entries.

## Statement View

Customer statement should show:

- Date
- Reference number
- Description
- Debit
- Credit
- Running balance
- Created by

## Pending Confirmation

- Whether opening balances are required during initial setup.
- Whether ledger statements need PDF/export in version 1.
