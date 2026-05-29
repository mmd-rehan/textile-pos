# Purchases Domain Overview

## Purpose

The purchases domain manages supplier purchases, batch creation, roll entry, purchase costs, landed costs, supplier balances, and purchase returns.

## Confirmed Principles

- Purchase entry should allow multiple rolls under one purchase.
- Each roll may have a different length.
- Purchases should create or link supplier, product, batch, and rolls.
- Individual roll purchase price and sale price should be captured where needed.
- Supplier purchase history and outstanding payable balance must be stored.

## Main Entities

- Supplier
- Purchase
- Purchase Line
- Purchase Roll Entry
- Batch / Dye Lot
- Roll / Thaan
- Landed Cost Component
- Supplier Ledger Entry
- Purchase Return

## Out of Scope Unless Confirmed

- Import/export customs workflow
- Purchase order approval chains beyond basic manager approval
- Automated supplier portal

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
