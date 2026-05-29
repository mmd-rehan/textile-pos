# Reports Domain Overview

## Purpose

The reports domain provides operational, inventory, sales, wholesale, customer, accounting, wastage, remnant, and profitability visibility.

## Confirmed Principles

- Reports must use real-time data.
- Inventory reports should reflect roll-level stock.
- Wastage and shrinkage must be reportable by roll, product, batch, user, and time range.
- Customer credit outstanding must be visible.
- Dashboard should load quickly and show business-critical metrics.

## Report Categories

- Inventory reports
- Sales reports
- Wholesale reports
- Customer reports
- Accounting reports
- Wastage reports
- Remnant reports
- Profitability reports
- Dashboard metrics

## Out of Scope Unless Confirmed

- Scheduled email reports
- BI warehouse
- Predictive analytics
- Multi-branch consolidated reporting

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
