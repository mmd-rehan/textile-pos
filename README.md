# TextilePOS

> A specialized, open-source Point-of-Sale system built exclusively for fabric and textile retailers — solving the variable-unit inventory problem that breaks every standard retail POS.

[![License: Apache License 2.0](https://img.shields.io/badge/license-Apache%202-blue)](https://www.apache.org/licenses/LICENSE-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

---

## The Core Problem

Standard retail POS systems are designed around a simple model: discrete, countable units. Selling 1 shirt, 3 mugs, or 12 bottles maps cleanly onto quantity-based inventory. **Fabric retail does not work this way.**

In a textile shop, inventory arrives as rolls — a single roll might hold 30 yards of fabric. It is then sold in variable, fractional cuts driven entirely by the customer's need: 3.2 yards for a suit, 5 meters for curtains, 0.75 yards for a patch. This introduces a cascade of problems that no general-purpose POS is built to handle:

| Problem | Why Standard POS Fails |
|---|---|
| **Fractional Deductions** | Most systems only support whole-number quantities. Selling "3.2 yards" from a roll requires custom logic to subtract from a continuous inventory ledger. |
| **Measurement Unit Duality** | A single roll may be purchased in yards but sold in meters — or vice versa. On-the-fly conversion must be exact and auditable. |
| **Shrinkage & Roll Reconciliation** | Manual cutting errors, fabric stretch, and "salesman rounding" accumulate. A roll that *mathematically* has 0.8 yards remaining is often physically empty. The system must support reconciliation and shrinkage write-offs at the roll level. |
| **Batch & Dye-Lot Tracking** | The same fabric article from two different production dye-lots will have a visible color mismatch. Inventory must be tracked at the dye-lot level, not just the SKU level. |
| **Remnant Management** | Short end-of-roll pieces have different pricing, display, and clearance logic than full-roll stock. |

TextilePOS is built from the ground up to solve exactly these problems.

---

## Key Features

- **Fractional Inventory Ledger** — Deduct precise fractional quantities (e.g., `3.25 yards`) from a roll's running balance with a full audit trail per transaction.
- **Live Yards ↔ Meters Conversion** — Define the base unit per roll at intake; all subsequent sales convert automatically and log both values.
- **Roll-Level Barcode Generation** — Every physical roll receives a unique barcode tied to its lot, article, and current balance, enabling accurate per-roll scanning at the register.
- **End-of-Roll Reconciliation** — When a roll is physically exhausted, trigger a reconciliation flow that records the actual vs. system balance and writes off the variance as measured shrinkage.
- **Dye-Lot / Batch Tracking** — Stock is tracked at the `(Article, DyeLot)` grain. The system warns on cross-lot sales to prevent mismatched-color orders.
- **Remnant Flagging** — Rolls below a configurable threshold are automatically flagged as remnants and routed to a separate clearance workflow.
- **Thermal Receipt Printing** — Browser-native CSS `@media print` layouts, tuned for thermal receipt printers (tested on TEP-300), with no driver dependencies.
- **HID Barcode Scanner Support** — Plug-and-play integration with standard USB HID barcode scanners via the browser's keyboard event stream.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Language** | TypeScript (strict mode, monorepo) | End-to-end type safety across shared domain models |
| **Backend Runtime** | Node.js + Express.js | Lightweight, familiar, excellent ecosystem |
| **Database** | MySQL | ACID compliance required for fractional inventory ledgers |
| **ORM** | Prisma | Type-safe query builder; handles complex nested ledger writes cleanly |
| **Frontend** | React + Vite | Fast HMR; component model suits complex POS register state |
| **Styling** | Tailwind CSS | Utility-first; easy to build dense, data-heavy POS layouts |
| **Server State** | React Query (TanStack Query) | Stale-while-revalidate caching for real-time inventory reads |
| **Hardware** | Browser HID + CSS Print | No native app required; runs in any Chromium-based browser |

---

## Quick Start Guide

To run the application locally, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone & Install Dependencies
Run `npm install` in the root directory to install all dependencies for both the frontend and backend:
```bash
npm install
```

### 2. Start MySQL via Docker
Run the following command to spin up the preconfigured MySQL 8.0 instance:
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 3. Initialize Database and Run Prisma Migrations

#### Local Development
Run migrations and seed the database using the following commands from the `backend/` directory:

```bash
# Generate the Prisma client (required after any schema change)
npx prisma generate

# Apply all pending migrations and update the database schema
npx prisma migrate dev

# Seed the database with default roles, currencies, units, and sample data
npx prisma db seed
```

Or from the repo root using npm workspaces:
```bash
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend   # runs prisma migrate dev
npx prisma db seed --schema=backend/prisma/schema.prisma
```

#### Production / Staging
Use `migrate deploy` — it applies only committed migration files and **never prompts or resets**:
```bash
# Inside the backend/ directory (or set --schema flag from root)
npx prisma migrate deploy
npx prisma generate
```

> **Important:** `prisma db push` is only for temporary local schema experiments. **Never use `db push` on a shared, staging, or production database.** It bypasses the migration history and can silently destroy data. Always create a proper migration with `prisma migrate dev` and commit the generated SQL file before deploying.

### 4. Start the Application
Launch both the frontend client and NestJS backend concurrently in development mode:
```bash
npm run dev
```

The system will be active at:
- **Frontend client**: [http://localhost:5173](http://localhost:5173) (Proxies `/api` to backend)
- **Backend service**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check Endpoint**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health) (or proxied: [http://localhost:5173/api/v1/health](http://localhost:5173/api/v1/health))

---

# Complete Project Description — Textile Trading POS & Inventory ERP

## Project Overview

This project is a specialized **Textile Trading POS + Inventory ERP System** designed for textile shops that deal with:

* Fabric rolls (Thaan)
* Variable-length fabric sales (yards/meters)
* Unstitched suit pieces
* Ready products (shawls, scarves, blankets, etc.)
* Retail customers
* Wholesale customers
* Credit-based customers
* Multiple fabric batches/lots

Unlike normal POS systems, this system must solve the **dynamic inventory deduction problem**, where inventory is not sold in fixed quantities but in continuously varying measurements like:

* 2.75 yards
* 3.20 meters
* 5.5 yards
* Remaining roll pieces
* Fabric wastage/shrinkage

The system should provide accurate real-time inventory tracking, wastage calculation, barcode support, wholesale & retail workflows, and business analytics tailored specifically for textile trading businesses.

---

# Core Business Problem

Traditional POS systems fail because textile businesses do not sell products in fixed quantities.

Example:

A fabric roll may contain:

* 30 yards initially

Sales may happen like:

* Customer A buys 3 yards
* Customer B buys 3.25 yards
* Customer C buys 5.5 yards

Remaining inventory becomes dynamic and difficult to track manually.

Additionally:

* Salesmen may cut extra fabric accidentally
* Actual used fabric may differ from billed fabric
* Rolls may finish with unexpected shortages
* Different dye lots/batches may vary in color
* Small remaining pieces become remnants/chants

This system aims to solve these real-world textile inventory problems.

---

# System Modules

The system will contain the following major modules:

1. Authentication & Roles
2. Dashboard & Analytics
3. Inventory Management
4. Product & Catalog Management
5. Retail POS
6. Wholesale POS
7. Roll (Thaan) Management
8. Barcode & Label System
9. Customer Management
10. Credit/Udhaar Ledger
11. Purchase Management
12. Supplier Management
13. Remnant/Chant Management
14. Wastage & Shrinkage Tracking
15. Reports & Accounting
16. Multi-Unit Measurement System
17. Expense Management
18. User Activity & Audit Logs
19. Settings & Configuration

---

# Business Types Supported

## 1. Retail Business

Retail customers usually buy:

* Custom yard/meter lengths
* Single suits
* Ready products

Features:

* Fast POS
* Quick measurement input
* Barcode scanning
* Mixed payment support
* Discount support

---

## 2. Wholesale Business

Wholesale customers usually buy:

* Full rolls
* Multiple rolls
* Large quantities
* Credit-based orders

Features:

* Bulk invoicing
* Customer-specific pricing
* Credit ledger
* Delivery challan
* Batch selection
* GST/VAT support if needed

---

# Inventory Architecture

## Inventory Hierarchy

The inventory structure should follow this hierarchy:

```text
Category
   ↓
Product
   ↓
Batch / Dye Lot
   ↓
Roll (Thaan)
   ↓
Sales Transactions
```

---

# Product Types

The system should support multiple product types.

## 1. Variable-Length Fabric Products

Examples:

* Wash & Wear
* Cotton
* Lawn
* Silk
* Palachi

Properties:

* Sold in yards/meters
* Managed by roll length
* Deducted dynamically

---

## 2. Suit Pieces / Cut Pieces

Examples:

* 3-piece suits
* Kids suits
* Ready-cut suits

Properties:

* Fixed units
* Can optionally deduct from master roll
* Quantity-based sales

---

## 3. Absolute Products

Examples:

* Kashmiri shawls
* Scarves
* Blankets
* Accessories

Properties:

* Standard quantity inventory
* Simple stock deduction

---

# Product Management

## Product Creation

Admin should be able to create:

* Categories
* Brands
* Products
* Colors
* Designs
* Units
* Batches

while entering stock without leaving the current workflow.

Example:

```text
Category: Palachi
Product: P-001
Color: Navy Blue
Batch: BATCH-24
```

---

# Roll (Thaan) Management

This is the heart of the system.

Each fabric roll must be tracked individually.

## Roll Properties

Each roll should contain:

* Roll ID
* Barcode
* Product
* Batch/Dye Lot
* Original Length
* Current Remaining Length
* Purchase Price
* Sale Price
* Supplier
* Purchase Date
* Status

---

## Example

```text
Roll ID: R-1001
Product: Palachi P-001
Original Length: 30 yards
Remaining Length: 18.4 yards
Batch: B-24
```

---

# Inventory Measurement System

The system must support:

* Yards
* Meters

with automatic conversion.

## Example

```text
1 meter = 1.09361 yards
```

Salesman may sell in:

* yards
  OR
* meters

while backend inventory remains consistent.

---

# Sales Flow (Retail POS)

## Retail Sale Workflow

### Step 1

Search or scan product barcode

### Step 2

Select roll

### Step 3

Enter:

* Sold measurement
* Unit (yard/meter)

### Step 4

Enter:

* Price per yard
  OR
* Total amount

### Step 5

System auto-calculates:

* Remaining inventory
* Total amount
* Profit margin

### Step 6

Generate invoice

---

# Smart Fabric Deduction Logic

The system must support:

## Scenario 1 — Exact Sale

```text
Sold: 3 yards
Deducted: 3 yards
```

---

## Scenario 2 — Actual Cut More Than Sale

```text
Billed: 3 yards
Actual Cut: 3.2 yards
Wastage: 0.2 yards
```

System should:

* Record wastage automatically
* Deduct actual cut from inventory
* Store salesperson accountability

---

# Roll Reconciliation / Roll Retirement

When a roll finishes:

Salesman clicks:

```text
Mark Roll as Finished
```

System compares:

* Expected remaining inventory
  VS
* Actual physical remaining inventory

Example:

```text
Expected Remaining: 0.8 yards
Actual Remaining: 0 yards
Loss: 0.8 yards
```

System records:

* Shrinkage
* Loss
* Wastage
* User responsible
* Timestamp

---

# Remnant / Chant Management

Small leftover fabric pieces should not disappear.

If remaining fabric becomes:

```text
< 2 yards
```

System may:

* Auto-mark as remnant
* Move to remnant inventory
* Apply discounted pricing

---

# Barcode System

Each roll and product should support barcode generation.

## Barcode Usage

Barcodes should help in:

* Quick POS scanning
* Roll identification
* Batch tracking
* Inventory audits

System should allow:

* Generate barcode
* Print barcode
* Download barcode

Barcode may contain:

* Roll ID
* Product code
* Batch number

---

# Batch / Dye Lot Tracking

Critical textile requirement.

Different batches may have slight color variations.

System must track:

* Batch number
* Supplier batch
* Dye lot

POS should warn if:

* Customer requests matching fabric
* Batch mismatch occurs

---

# Customer Management

The system should support:

## Customer Data

* Name
* Phone
* Address
* Customer type
* Credit limit
* Ledger history

---

# Credit / Udhaar System

Very important for textile business.

Customers may:

* Buy now
* Pay later

Features:

* Outstanding balance
* Payment history
* Ledger statement
* Due reminders
* Partial payments

---

# Wholesale Module

Wholesale should be separated from retail.

## Wholesale Features

* Bulk sales
* Roll-wise sales
* Customer-specific pricing
* GST/VAT invoices
* Delivery challan
* Credit orders
* Bulk discounts

---

# Purchase Module

Admin should record purchases from suppliers.

## Purchase Entry

Should support:

* Supplier
* Product
* Batch
* Multiple rolls
* Individual roll lengths
* Purchase prices

Example:

```text
10 rolls purchased

Roll lengths:
29.5
30
30.2
28.9
```

---

# Supplier Management

Store:

* Supplier details
* Purchase history
* Outstanding payable balance

---

# Dashboard & Analytics

## Dashboard Should Show

### Inventory Analytics

* Total stock
* Low stock rolls
* Dead stock
* Remnants
* Fast-moving products

### Financial Analytics

* Daily sales
* Monthly sales
* Profit margins
* Expenses
* Credit outstanding

### Fabric Loss Analytics

* Wastage reports
* Shrinkage reports
* Salesman performance

### Wholesale Analytics

* Top wholesale customers
* Bulk order trends

---

# Reports

System should generate:

## Sales Reports

* Daily
* Weekly
* Monthly

## Inventory Reports

* Current stock
* Roll aging
* Dead inventory

## Wastage Reports

* Shrinkage
* Roll losses
* User-wise wastage

## Financial Reports

* Profit/Loss
* Expense summary
* Credit outstanding

---

# Roles & Permissions

## Suggested Roles

### Admin

Full access

### Manager

Operational access

### Cashier / Salesman

POS operations only

### Inventory Staff

Stock management only

---

# Audit Logs

System should log:

* Inventory edits
* Price changes
* Deleted invoices
* Wastage entries
* Roll reconciliation

---

# Future Expansion Possibilities

Future modules may include:

* Tailoring integration
* Online store
* WhatsApp invoice sending
* SMS alerts
* Mobile app
* Multi-branch support
* RFID integration
* AI demand forecasting
* Fabric image recognition
* Customer loyalty system

---

# Suggested Technical Architecture

## Frontend

* React / Next.js

## Backend

* Node.js / NestJS
  OR
* Laravel

## Database

* PostgreSQL (recommended)

## Barcode

* Code128 / QR

## Hosting

* AWS / DigitalOcean / Azure

---

# Important Technical Concepts

## Core Inventory Principle

Inventory should NEVER be managed only at product level.

The true inventory unit is:

```text
ROLL (THAAN)
```

because every roll has:

* Different remaining length
* Different batch
* Different purchase cost

---

# Key Challenges This System Solves

1. Variable-length inventory deduction
2. Fabric wastage tracking
3. Real-time remaining roll calculation
4. Wholesale + retail workflows
5. Batch consistency management
6. Remnant handling
7. Measurement conversion
8. Textile-specific business reporting

---

# Primary Goal

To build a highly specialized textile ERP/POS system that gives textile shop owners:

* Accurate inventory visibility
* Real-time roll tracking
* Loss prevention
* Better profit control
* Faster billing
* Wholesale + retail management
* Textile-specific operational intelligence


---

## Contributing

Contributions are welcome. TextilePOS exists to solve a real, under-served problem, and outside perspectives — especially from developers with textile retail domain knowledge — are highly valuable.

**Before opening a pull request, please read the following:**

- **Strict TypeScript is non-negotiable.** All code must pass `tsc --noEmit` with `strict: true`. No `any` types without an explicit justification in a code comment.
- **Architecture boundaries must be respected.** Domain logic lives in the backend service layer, not in controllers or React components. Keep the layers clean.
- **Database mutations go through Prisma transactions.** Any write that touches more than one table must be wrapped in `prisma.$transaction(...)` to preserve ledger integrity.
- **Write for the domain.** Variable names, function names, and comments should use textile industry terminology (`roll`, `dyeLot`, `remnant`, `shrinkage`) — not generic terms (`item`, `record`, `thing`).
- **Open an issue first** for any significant feature or architectural change so the approach can be discussed before implementation work begins.

To get started, fork the repository, create a feature branch off `main`, and open a PR with a clear description of the problem being solved.

---

## License

Distributed under the **Apache 2.0 License**. See [LICENSE](LICENSE) for full text.

---

*Built for the shop owners who have been running inventory on paper because software has never understood their trade.*
