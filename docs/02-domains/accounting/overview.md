# Accounting Domain Overview

## Purpose

The accounting domain records financial impact from sales, purchases, payments, expenses, supplier balances, customer balances, cash, bank, and profit/loss reporting.

## Confirmed Principles

- Accounting entries should be immutable.
- Corrections must be represented by adjustment entries, not silent edits.
- Customer credit and supplier payable balances must be traceable.
- Sales, purchases, expenses, payments, and returns should have financial records.
- Detailed accounting implementation should stay simple for version 1 unless formal double-entry accounting is confirmed.

## Main Entities

- Account
- Ledger Entry
- Journal Entry
- Customer Ledger Entry
- Supplier Ledger Entry
- Expense
- Cash Movement
- Bank Movement, pending confirmation
- Payment
- Reconciliation Record

## Important Constraint

The exact accounting depth is pending confirmation. The first version can support practical business ledgers without forcing a complex accounting package unless approved.

## Source Alignment

This document is aligned with the confirmed product direction:

- Single-shop first implementation
- Roll/thaan is the primary inventory unit for variable-length fabric
- Yards and meters must be supported
- Retail and wholesale flows remain separate
- Actual cut length controls inventory deduction
- Wastage, shrinkage, adjustments, and reconciliation must be traceable
- Barcode scanning and simple browser printing are part of version 1
- MySQL with Prisma is the selected database layer
- Node.js with NestJS is the selected backend stack
- Vite, React, TypeScript, and Tailwind CSS are the selected frontend stack
