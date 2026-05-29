# Inventory Domain Overview

## Purpose

The inventory domain is the core of the Textile ERP & POS system. It controls product catalog structure, batch/dye lot tracking, fabric roll/thaan tracking, stock movement, wastage, shrinkage, remnant handling, and reconciliation.

## Confirmed Principles

- Inventory for variable-length fabric is tracked per roll, not only by product.
- Each roll must have a unique identity and barcode.
- Each roll belongs to one product and one batch/dye lot.
- Roll length must support fractional values.
- The backend must store inventory in one base measurement unit for consistency.
- Sales may be entered in yards or meters.
- Actual cut length overrides billed quantity for inventory deduction.
- Inventory cannot become negative unless an authorized override is explicitly implemented.
- Every inventory movement must be traceable.

## Core Entities

- Category
- Brand, optional
- Product
- Product variant attributes such as color/design, if needed
- Batch / Dye Lot
- Roll / Thaan
- Inventory Movement
- Wastage Entry
- Shrinkage Entry
- Remnant / Chant
- Stock Adjustment

## Out of Scope for Version 1 Unless Confirmed

- Multi-branch transfers
- RFID
- Offline synchronization
- Automated AI demand forecasting
- Online store stock synchronization

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
