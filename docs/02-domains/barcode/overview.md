# Barcode Domain Overview

## Purpose

The barcode domain defines roll barcode generation, product barcode generation, label design, browser scanning behavior, and simple printing support.

## Confirmed Principles

- Barcode scanning is part of version 1.
- Hardware integration should work through the browser.
- A typical barcode scanner should behave like keyboard input.
- Receipt printing should support a simple receipt printer such as TEP-300 through browser printing.
- Each roll and product should support barcode generation.
- Barcodes help identify rolls, products, batches, and support inventory audits.

## Main Entities

- Barcode
- Barcode Print Job
- Label Template
- Roll Barcode
- Product Barcode

## Out of Scope Unless Confirmed

- Native printer drivers
- RFID
- Mobile scanner app
- Advanced label designer

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
