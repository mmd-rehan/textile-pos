# Sales Domain Overview

## Purpose

The sales domain covers retail POS, wholesale POS, invoicing, discounts, payments, returns, refunds, sale-level inventory deduction, and customer ledger impact.

## Confirmed Principles

- Retail and wholesale flows must remain separate because their behavior is different.
- Retail flow should be optimized for speed and barcode scanning.
- Wholesale flow should support bulk/roll-wise billing, customer-specific pricing, and credit orders.
- The POS must support yards and meters.
- Billed quantity and actual cut quantity must both be recorded for fabric line items.
- Inventory deduction uses actual cut quantity.
- Invoice and payment records must be audit-friendly.

## Main Entities

- Sale / Invoice
- Sale Line Item
- Sale Payment
- Return / Refund
- Customer Ledger Entry
- Inventory Movement
- Wastage Entry, when actual cut exceeds billed quantity

## Out of Scope Unless Confirmed

- E-commerce checkout
- Online payment gateway
- Loyalty points
- Advanced tax automation

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
