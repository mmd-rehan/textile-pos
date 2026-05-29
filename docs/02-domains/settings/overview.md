# Settings Domain Overview

## Purpose

The settings domain controls company profile, invoice settings, inventory behavior, pricing configuration, taxation settings, barcode settings, measurement settings, notification preferences, backup settings, localization, integrations, and feature flags.

## Confirmed Principles

- Settings should be controlled by Admin or authorized Manager roles.
- Settings changes must be audited when they affect billing, inventory, tax, permissions, or financial behavior.
- Default measurement behavior must support yards and meters.
- Version 1 is single-shop first.

## Main Setting Groups

- Company settings
- Invoice settings
- Inventory settings
- Pricing settings
- Taxation settings
- Barcode settings
- Measurement settings
- Notification settings
- Backup settings
- Localization settings
- Integrations
- Feature flags

## Out of Scope Unless Confirmed

- Multi-branch settings implementation
- Cloud backup automation
- Third-party accounting integrations
- WhatsApp/SMS integrations

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
