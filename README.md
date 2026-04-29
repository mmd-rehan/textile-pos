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

## Getting Started

### Prerequisites

- **Node.js** `v20+`
- **MySQL** `8.0+` running locally or via Docker
- **npm** `v10+`

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/textile-pos.git
cd textile-pos
```

### 2. Install Dependencies

This is a monorepo. Running `install` from the root will install dependencies for both `client/` and `server/`:

```bash
npm install
```

### 3. Configure Environment Variables

The server reads its configuration from a `.env` file in the `server/` directory:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in your local MySQL credentials:

```env
# MySQL connection string for Prisma
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/textile_pos"

# Backend server port
PORT=5000
```

### 4. Run Database Migrations

This will create all tables and seed reference data (units, roles, etc.):

```bash
npm run prisma:migrate --workspace=server
```

To generate the Prisma client after any schema change:

```bash
npm run prisma:generate --workspace=server
```

To explore the database schema visually:

```bash
npx prisma studio --schema=server/prisma/schema.prisma
```

### 5. Start the Development Servers

A single command from the root starts both the Express backend and the Vite frontend concurrently:

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite + React) | `http://localhost:5173` |
| Backend (Express API) | `http://localhost:5000` |

---

## Project Roadmap

TextilePOS is being built in structured phases. Each phase ships a complete, usable vertical slice before the next begins.

### Phase 1 — Inventory Engine *(In Progress)*

Core data model: Articles, Rolls, DyeLots, Units, and the fractional Inventory Ledger. Barcode generation per roll. Stock intake and manual adjustment flows. Reconciliation and shrinkage write-off.

### Phase 2 — POS Register

The sales transaction interface. Barcode scanning at the register, live roll-balance deduction on sale, Yards/Meters unit switching mid-transaction, and multi-roll allocation for a single line item.

### Phase 3 — Hardware Output

Thermal receipt printing (CSS print layouts), roll barcode label printing, and end-of-day Z-reports. Optional offline-first mode for local network resilience.

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
