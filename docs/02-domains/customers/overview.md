# Customers Domain Overview

## Purpose

The customers domain manages retail customers, wholesale customers, credit customers, purchase history, outstanding balances, and ledger statements.

## Confirmed Principles

- Customers may buy on cash or credit.
- Wholesale and repeat customers may have outstanding balances.
- The system must show real-time outstanding balance.
- Partial payments must be supported.
- Ledger history must be traceable.
- Customer-specific pricing is expected for wholesale workflows.

## Main Entities

- Customer
- Customer Type
- Customer Ledger Entry
- Customer Payment
- Credit Limit
- Customer Pricing Tier, pending confirmation

## Out of Scope Unless Confirmed

- SMS reminders
- WhatsApp invoices
- Loyalty points
- Customer portal

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
