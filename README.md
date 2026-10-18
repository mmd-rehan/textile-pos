<div align="center">
  <img src="textile-pos-banner.png" alt="TextilePOS Banner" width="100%" style="border-radius: 8px;" />
</div>

<div align="center">

# TextilePOS

### *The Open-Source Textile ERP & POS system designed exclusively for fabric stores, resolving the continuous, variable-measurement inventory problem that breaks generic retail software.*

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

[**Explore Docs**](file:///docs) • [**Report a Bug**](https://github.com/mmd-rehan/textile-pos/issues) • [**Request Feature**](https://github.com/mmd-rehan/textile-pos/issues) • [**Contribute**](#-contributing)

</div>

---

## 🧵 The Core Problem

Standard retail POS and ERP systems are built around a simple assumption: **discrete, countable units**. Selling 1 shirt, 3 mugs, or 12 bottles maps cleanly onto integer-based inventory counts. 

**Fabric and textile retail does not work this way.**

In a textile shop, inventory arrives in rolls (*Thaan*) of varying lengths (e.g., 30 yards). Fabric is cut and sold in variable, fractional lengths driven entirely by the customer's need: 3.2 yards for a suit, 5.5 meters for curtains, or 0.75 yards for a patch. This introduce a cascade of unique operational problems:

| Problem | Why Standard POS Fails | How TextilePOS Solves It |
| :--- | :--- | :--- |
| **Fractional Deductions** | Only supports whole-number quantities; floats introduce rounding errors. | Employs decimal-safe tracking to deduct exact fractional lengths (e.g., `3.25` yards) from a roll's running balance. |
| **Measurement Duality** | Rigid base units make conversions inaccurate and slow. | Supports dual-unit entry with automatic conversion (e.g., Yards ↔ Meters) per roll, maintaining exact balances. |
| **Dye-Lot & Batch Tracking** | Assumes same SKU means identical items. | Tracks stock at the `(Product, DyeLot, Roll)` grain to prevent selling mismatched color variants to the same customer. |
| **Roll Reconciliation** | Minor cutting errors build up, leaving ghost inventory. | Includes a structured reconciliation flow to retire exhausted rolls and log physical vs. system variances as shrinkage. |
| **Remnant Management** | Leftover scraps are either lost or sold at full price. | Automatically flags leftover scraps (e.g., under 2 yards) as remnants, applying separate discount and clearance workflows. |

---

## ✨ Features

- ⚡ **Continuous Fractional Ledger** — Accurate, append-only tracking of fabric lengths up to 4 decimal places with strict type validation.
- 🔄 **Real-time Unit Conversion** — Seamlessly intake rolls in meters and sell in yards, or vice-versa, with exact math.
- 🏷️ **Roll-level Barcode Generation** — Generate and print unique barcodes for each physical roll, linking it to its specific dye-lot, wholesale cost, and remaining length.
- 💱 **Multi-Currency Purchase Orders** — Document purchases from global suppliers in multiple currencies (USD, AED, EUR, PKR, etc.) while storing base-currency snapshots for inventory valuation.
- 📑 **Dual Sales POS (Retail vs. Wholesale)** — Separate interfaces and workflows optimized for fast retail scanning (with cash/discount modes) and bulk wholesale transactions (with customer ledger credit accounts).
- 📉 **Wastage & Shrinkage Tracking** — Track salesman cutting errors and roll end-of-life discrepancies, identifying where losses occur.
- 💳 **Udhaar (Credit) & Supplier Ledger** — Simple, append-only double-entry bookkeeping ledger to track credit customers and outstanding supplier balances.
- 🖨️ **Zero-Driver Thermal Printing** — Print standard 80mm thermal receipts directly from the browser using pure CSS `@media print` rules, optimized for fast checkout.
- 🔌 **HID Barcode Scanner Support** — Seamlessly handles USB/Bluetooth HID scanners without configuration by listening to browser keyboard streams.

---

## 🏛️ Architecture & Core Concepts

### 1. The Roll (Thaan) is the Atom of Inventory
In TextilePOS, inventory is **never** tracked solely at the product level. The **Roll (Thaan)** is the source of truth because every roll represents a physically distinct piece of fabric with its own batch number, dye lot, purchase cost, and remaining length.

```
Category (e.g., Fabric)
   └── Product (e.g., Lawn Summer Print)
         └── Batch / Dye Lot (e.g., Lot-24B)
               ├── Roll #1 (Thaan) -> 24.5 Yards Left
               └── Roll #2 (Thaan) -> 12.2 Yards Left
```

### 2. Product Types Supported
The system adapts its POS and purchase screens dynamically based on the product type:
- 🧵 **Variable-Length Fabric (`FABRIC_ROLL`)**: Sold in yards/meters from a specific roll barcode.
- ✂️ **Cut Pieces (`CUT_PIECE`)**: Pre-cut suits or fabrics sold by the piece/unit.
- 📦 **Fixed Products (`FIXED_PRODUCT`)**: Countable inventory (e.g., buttons, zippers, shawls) sold by the piece.

---

## 📊 Database Schema (Prisma ERD)

Below is the database relationship model. All transactions, stock movements, and ledgers are append-only to ensure complete auditing safety.

```mermaid
erDiagram
    User ||--o{ AuditLog : "creates"
    User ||--o{ InventoryMovement : "records"
    User ||--o{ RollReconciliation : "performs"
    User ||--o{ SaleInvoice : "cashiers"
    User ||--o{ SalePayment : "collects"
    User ||--o{ CustomerPayment : "receives"
    User ||--o{ WastageEntry : "logs"

    Product ||--o{ Roll : "contains"
    Product ||--o{ ProductStockItem : "tracks"
    Product ||--o{ InventoryMovement : "moves"
    Product ||--o{ SaleInvoiceItem : "sold_in"
    Product ||--o{ PurchaseItem : "ordered_in"

    Roll ||--o{ InventoryMovement : "moves"
    Roll ||--o{ RollReconciliation : "reconciles"
    Roll ||--o{ Remnant : "creates"
    Roll ||--o{ PurchaseRoll : "bought_in"
    Roll ||--o{ WastageEntry : "wastes"

    ProductStockItem ||--o{ InventoryMovement : "moves"
    ProductStockItem ||--o{ PurchaseItem : "bought_in"

    Customer ||--o{ SaleInvoice : "buys"
    Customer ||--o{ CustomerLedgerEntry : "has"
    Customer ||--o{ CustomerPayment : "makes"

    Supplier ||--o{ PurchaseOrder : "supplies"
    Supplier ||--o{ SupplierLedgerEntry : "has"
    Supplier ||--o{ SupplierPayment : "receives"

    PurchaseOrder ||--|{ PurchaseItem : "details"
    PurchaseOrder ||--o{ PurchaseRoll : "rolls"
    PurchaseOrder ||--o{ SupplierPayment : "pays"

    SaleInvoice ||--|{ SaleInvoiceItem : "details"
    SaleInvoice ||--o{ SalePayment : "pays"
    SaleInvoice ||--o{ WastageEntry : "wastes"

    SaleInvoiceItem }o--o| Roll : "deducts"
    SaleInvoiceItem }o--o| ProductStockItem : "deducts"

    PurchaseItem }o--o| ProductStockItem : "deducts"

    RollReconciliation ||--o| Remnant : "creates"
    RollReconciliation ||--o{ WastageEntry : "wastes"

    Currency ||--o{ CurrencyExchangeRate : "has_rates"
```

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Node.js](https://nodejs.org/) + [NestJS](https://nestjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MySQL 9.7 LTS](https://www.mysql.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Client UI state) & [TanStack Query](https://tanstack.com/query/latest) (Server state)

---

## 🚀 Quick Start Guide

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer, with `npm`
- A **MySQL 9.7** database. Any one of these works:
  - **Docker** — the repo ships a MySQL container (`npm run db:up`), or
  - **MySQL installed on your PC** (`localhost:3306`), or
  - **A hosted MySQL server**, e.g. **SkySQL**.

### How configuration works

The whole project uses **one `.env` file in the repo root**. The backend (NestJS + Prisma), the frontend dev server (Vite) and `docker-compose.yml` all read it. There are no `backend/.env` or `frontend/.env` files.

```bash
cp .env.example .env
```

The one value that must be right is `DATABASE_URL`:

```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

If your password contains special characters, URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

### 1. Install

```bash
git clone https://github.com/mmd-rehan/textile-pos.git
cd textile-pos
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` and `SEED_ADMIN_PASSWORD` (the admin login), then pick **one** database option below.

### 2. Point the app at a database

#### Option A — MySQL in Docker (easiest)

Leave the `MYSQL_*` values in `.env` as they are (or change the passwords), and make `DATABASE_URL` use the same user, password and port:

```dotenv
MYSQL_USER=textile_pos
MYSQL_PASSWORD=change_me
MYSQL_PORT=3306
DATABASE_URL="mysql://textile_pos:change_me@localhost:3306/textile_pos"
```

```bash
npm run db:up        # starts MySQL 9.7 and creates the textile_pos database
```

If port 3306 is already taken on your machine, set `MYSQL_PORT=3307` and use `:3307` in `DATABASE_URL`.

#### Option B — MySQL already installed on your PC

Create the database once:

```bash
mysql -u root -p -e "CREATE DATABASE textile_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Then put its connection string in `.env`:

```dotenv
DATABASE_URL="mysql://root:your_password@localhost:3306/textile_pos"
```

#### Option C — Hosted database (e.g. SkySQL)

1. In the SkySQL console (or your provider's), create a database named `textile_pos`:
   ```sql
   CREATE DATABASE textile_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Copy the host, port, user and password from the provider's **Connect** page into `.env`. Hosted servers require TLS, so add `?sslaccept=strict`:
   ```dotenv
   DATABASE_URL="mysql://your_user:your_password@your-host.skysql.com:4000/textile_pos?sslaccept=strict"
   ```

### 3. Create the tables and the admin user (first run only)

```bash
npm run db:setup
```

This runs `prisma migrate deploy` (creates or updates every table) followed by the standard seed (roles, permissions, currencies, units, settings, and the admin user from `SEED_ADMIN_*`). It is safe to run again: migrations that already ran are skipped, and the seed never duplicates data.

Run it again **after every `git pull` that adds new migrations** (files under `backend/prisma/migrations/`). `npm run db:status` shows whether any are pending.

Want sample products, suppliers and sales to click around with? Also run `npm run db:seed:dev`.

### 4. Start the app

```bash
npm run dev
```

- **Frontend** → `http://localhost:5173` (`FRONTEND_PORT`). It proxies `/api` to the backend.
- **Backend API** → `http://localhost:5001/api/v1` (`BACKEND_PORT`), health check at `/api/v1/health`.

Log in with `SEED_ADMIN_USERNAME` (default `admin`) and `SEED_ADMIN_PASSWORD` from your `.env`.

### Everyday commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start backend and frontend with hot reload. |
| `npm run db:up` / `npm run db:down` | Start / stop the Docker MySQL container (Option A). Data is kept. |
| `npm run db:setup` | Apply pending migrations, then run the standard seed. |
| `npm run db:status` | Show which migrations have run and which are pending. |
| `npm run db:deploy` | Apply pending migrations only. |
| `npm run db:seed` | Run the standard seed only. |
| `npm run db:seed:dev` | Add demo data (products, suppliers, sales…). |
| `npm run db:migrate` | **Developers changing the schema:** create a new migration from `schema.prisma` and apply it locally. Needs a user that can create databases (Prisma's shadow database), e.g. `root`. |
| `npm run db:generate` | Regenerate the Prisma client (`npm run dev` already does this). |

> ⚠️  **Never** run `prisma db push` against a shared, staging, or production database. It changes the schema without a migration and can drop tables or columns. The flow is always: `npm run db:migrate` locally → commit the migration → `npm run db:setup` (or `db:deploy`) everywhere else.

To reset the admin password, set a new `SEED_ADMIN_PASSWORD` and `SEED_RESET_ADMIN_PASSWORD=true` in `.env`, run `npm run db:seed`, then set it back to `false`.

### What gets seeded

The seeder (`backend/prisma/seed.ts`) is **production-safe** and idempotent. It only seeds standard system data — no demo products, customers, suppliers, sales, purchases, or rolls:

- **Permissions** — `auth.me`, `users.manage`, `roles.manage`, `settings.manage`, `audit.view`, `products.manage`, `categories.manage`, `brands.manage`, `colors.manage`, `designs.manage`, `batches.manage`, `suppliers.manage`, `purchases.create/view/pay/attach_invoice/view_attachment/download_attachment`, `suppliers.view_statement`, `inventory.view/create_roll/adjust_stock/reconcile_roll`, `barcode.lookup/generate`, `sales.create_retail/create_wholesale/view/view_all`, `customers.manage/create_basic`, `ledger.view_customer/record_payment`, `wastage.view/create_manual/view_reports`, `remnants.view/manage`, `reports.view_sales/view_inventory/view_financial` (plus legacy `read:*` / `write:*` permissions still consumed by current auth guards).
- **Roles** — `Admin`, `Manager`, `Cashier`, `Inventory Staff`, `Accountant` (existing custom roles are not removed).
- **Currencies** — AED, PKR, USD, GBP, EUR, SAR, INR, CNY, TRY (with 1:1 self exchange rates only — no hard-coded cross rates).
- **Units** — Yard, Meter, Piece, Pack, Roll (+ Yard ↔ Meter conversions).
- **Company settings** — name, phone, email, address, base currency, timezone.
- **App settings** — invoice / PO / payment / barcode prefixes (`INV`, `WINV`, `PO`, `SPAY`, `CPAY`, `SRET`, `PRET`, `ROLL`, `TPOS`), tax defaults (`enabled=false`, `rate=0`, `label=VAT`), barcode format (`CODE128`), measurement defaults (base unit `YARD`, remnant threshold `2`, decimal precision `4`), and the allowed payment methods (`CASH`, `CARD`, `BANK_TRANSFER`, `CHEQUE`, `CREDIT`).
- **Feature flags** — `wholesalePos`, `barcodeGeneration`, `wastageTracking`, `remnantManagement`, `creditSales` (defaults applied only on first install — re-runs never overwrite an admin's choice).
- **Admin user** — created **only if no user with the Admin role exists**, from the `SEED_ADMIN_*` values in `.env`.

### Running the tests

**Backend.** Unit tests need nothing else. Integration tests boot the real API against a disposable database and **wipe it on every run**, so they only run when `TEST_DATABASE_URL` points to a database whose name ends in `_test` (they never touch `DATABASE_URL`).

```bash
# once: create the empty test database
mysql -u root -p -h 127.0.0.1 -P 3306 -e "CREATE DATABASE textile_pos_test;"
# (Docker MySQL: docker exec -it textile_pos_mysql mysql -uroot -p -e "CREATE DATABASE textile_pos_test;")

export TEST_DATABASE_URL="mysql://root:<root password>@127.0.0.1:3306/textile_pos_test"
npm test --workspace=backend                       # unit + integration
npm run test:unit --workspace=backend              # unit only, no database needed
```

**Frontend.** Vitest + Testing Library in jsdom; the API is mocked, so no backend or database is needed.

```bash
npm test --workspace=frontend
```

CI runs both suites on every pull request (`.github/workflows/tests.yml`).

### Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `Can't reach database server` / `P1001` | The database isn't running or `DATABASE_URL` has the wrong host/port. Option A: `npm run db:up` and check `MYSQL_PORT` matches the port in `DATABASE_URL`. |
| `Authentication failed` / `P1000` | Wrong user or password in `DATABASE_URL`. URL-encode special characters in the password. |
| `Database ... does not exist` / `P1003` | Create it first (`CREATE DATABASE textile_pos;`) — see Options B and C. |
| `port is already allocated` on `npm run db:up` | Another MySQL already uses that port. Set `MYSQL_PORT=3307` (and `:3307` in `DATABASE_URL`). |
| Hosted DB: `TLS connection required` / handshake errors | Add `?sslaccept=strict` to the end of `DATABASE_URL`. |
| `Port 5001 / 5173 is in use` | Change `BACKEND_PORT` / `FRONTEND_PORT` in `.env`. |
| Login fails right after install | Run `npm run db:setup` — the admin user is created by the seed. |
| API errors about missing tables or columns after `git pull` | New migrations arrived: `npm run db:setup`. |

---

## 🐳 Docker Deployment (full stack)

To run the **entire stack in containers** — MySQL, the backend API, and the Nginx-served frontend — use `docker compose`. It reads the same root `.env`.

### 1. Local Docker deployment

```bash
cp .env.example .env     # then edit .env — set strong secrets and an admin password
docker compose up --build
```

This single command:

1. Starts **MySQL 9.7** with a persistent `mysql_data` volume and a healthcheck.
2. Builds and starts the **backend**, which waits for MySQL, runs `prisma migrate deploy`, runs the **standard seed**, then starts the API. Migrations and seed run automatically on every start — no manual step.
3. Builds and starts the **frontend** (Nginx serving the built React SPA).

When it's up:

- **Frontend** → `http://localhost:5173` (or your `FRONTEND_PORT`)
- **Backend API** → `http://localhost:5001/api/v1` (or your `BACKEND_PORT`)
- **Health check** → `http://localhost:5001/api/v1/health`

Log in with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from your `.env`.

Inside Docker the backend talks to the `mysql` service, not to `DATABASE_URL` (which points at `localhost` for `npm run dev`). To run the containers against a hosted database such as SkySQL instead, set `DOCKER_DATABASE_URL` in `.env`.

> The frontend's API URL is baked in at **build time** from `VITE_API_BASE_URL` (default `http://localhost:5001/api/v1`). It must be a URL the **browser** can reach — never the Docker service name `backend`. If you change `BACKEND_PORT` or deploy to a domain, set `VITE_API_BASE_URL` accordingly and rebuild (`docker compose up --build`).

### 2. Important before production

- **Change every secret** in `.env` (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`).
- Use a **strong admin password** (`SEED_ADMIN_PASSWORD`).
- **Do not expose MySQL publicly** — remove the `mysql` `ports:` mapping, bind it to `127.0.0.1`, or block it at the firewall.
- Put the app behind an **HTTPS reverse proxy** (Nginx / Caddy / Traefik) and point `VITE_API_BASE_URL` at your domain.

### 3. Useful commands

```bash
docker compose ps                  # service status
docker compose logs -f backend     # backend logs (migrations, seed, API)
docker compose logs -f frontend    # nginx logs
docker compose logs -f mysql       # database logs
docker compose down                # stop containers — KEEPS the database volume
docker compose down -v             # stop AND DELETE the database volume (data loss!)
```

npm shortcuts are also available: `npm run docker:up`, `docker:down`, `docker:logs`, `docker:restart`, `docker:seed`, `docker:migrate`.

### 4. Data persistence

- `docker compose down` stops the containers but **keeps** the `mysql_data` and `purchase_attachments` volumes — your data and uploaded supplier invoices survive.
- `docker compose down -v` **deletes** those volumes. **Never run `down -v` on production** unless you intentionally want to wipe the database.

### 5. Demo data

Demo data is off by default. To include sample products/suppliers/sales, set `SEED_DEV_DATA=true` in `.env` and rebuild.

### 6. Deploying on a VPS

```bash
git clone https://github.com/mmd-rehan/textile-pos.git
cd textile-pos
cp .env.example .env
# edit .env: strong secrets, admin password, and set VITE_API_BASE_URL
# to your public API URL (e.g. https://api.example.com/api/v1)

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` sets `restart: always` so the stack survives reboots. In production you should additionally:

- Front the services with an HTTPS reverse proxy (Nginx / Caddy / Traefik).
- Keep MySQL off the public internet (firewall / `127.0.0.1` binding).
- Schedule **backups** of the `mysql_data` and `purchase_attachments` volumes.
- Keep `.env` out of version control (it's gitignored).

---

## 📜 Strict Project Rules & Design Decisions

To contribute to this project, you **MUST** align with the architectural guardrails established for Version 1. Any pull request violating these principles will be automatically rejected.

1. **v1 Single-Shop Scope** — Do not implement multi-branch routing, offline synchronization, mobile apps, RFID integrations, or native custom printer drivers. Keep it web-standard and localized to a single shop.
2. **Decimal-Safe Calculations** — **Floating-point math is strictly forbidden** for currencies and fabric measurements. Use `@prisma/client` Decimal types in the backend and precise decimal handling packages in the frontend to prevent rounding errors.
3. **Roll/Thaan Level Granularity** — Fabric inventory is roll-centric. Do not aggregate fabric stock only at the product level. Every cut must trace back to a specific `Roll` record.
4. **Backend as Source of Truth** — All inventory, financial ledger, and audit log writes must execute on the backend. The frontend is merely a presentation and math preview layer.
5. **Database Transaction Safety** — Any operation writing to multiple tables (e.g., saving a sale, checking out, paying a supplier, reconciling a roll) **must** run within a Prisma transaction (`$transaction`) to preserve ledger consistency.
6. **Append-Only Ledgers & Logs** — Confirmations of invoices, ledgers, stock movements, and audit logs are final. They must **never** be edited or deleted silently. Any adjustments must be done via correction records.
7. **Multi-Currency Purchases, Base-Currency Sales** — Purchases support multi-currency input (USD, EUR, AED, PKR, etc.) with manually input exchange rates. All retail and wholesale sales are logged in the global base currency (default: `PKR`).
8. **Thin Controllers, Rich Services** — NestJS controllers must stay thin. All validation, mathematical calculations, business rules, and transactional blocks belong inside NestJS service classes.

---

## 🤝 Contributing

We welcome contributions from developers, designers, testers, and textile business operators! 

To get started:
1. **Explore open issues** or open a new one to propose a feature or report a bug.
2. **Fork the repository** and create a descriptive branch: `git checkout -b feature/your-feature-name` or `bugfix/issue-id`.
3. **Align with the Domain Vocabulary** — Always name variables, databases, and comments using actual textile terminology (`roll`, `dyeLot`, `remnant`, `shrinkage`) rather than generic words (`item`, `lot`, `scraps`).
4. **Strict TypeScript compilation** — Ensure your code compiles without warnings and passes the linting tools.
5. **Submit a Pull Request** with a detailed explanation of your changes, referencing the relevant issues.

---

## 📄 License

This project is licensed under the **Apache 2.0 License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for fabric and textile shop owners who have been running inventory on paper because software never understood their trade.</sub>
</div>
