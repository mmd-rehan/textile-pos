---
name: run-textile-pos
description: Build, run, and drive TextilePOS. Use when asked to start the app, run it, take a screenshot, test a UI flow, interact with the running frontend or backend, or verify a change works in the browser.
---

TextilePOS is a Vite+React frontend (`:5173`) proxied to a NestJS backend (`:5001`) backed by MySQL (`:3307`). Drive it via `.claude/skills/run-textile-pos/driver.mjs` — a Playwright Chromium REPL that pipes commands to a headless browser. The backend REST API is also reachable directly with `curl`.

All paths below are relative to the repo root (`/Users/muhammadrehan/Public/textile-pos/`).

## Prerequisites

- Node.js ≥ 18 (v25 confirmed working)
- Docker Desktop running (for MySQL)
- Playwright Chromium installed in the skill dir (one-time, see Setup)

## Setup

```bash
# 1. Install root + workspace deps
npm install

# 2. Start MySQL
docker compose -f docker/docker-compose.yml up -d

# 3. Run DB migrations (first time / after schema changes)
cd backend && npx prisma migrate dev && cd ..

# 4. Seed the database (first time)
cd backend && npm run prisma:migrate && npx ts-node prisma/seed.ts && cd ..

# 5. Install Playwright Chromium for the driver (one-time)
cd .claude/skills/run-textile-pos && npm install && npx playwright install chromium && cd ../../..
```

Backend env (already committed at `backend/.env`):
- `PORT=5001`
- `DATABASE_URL="mysql://root:password@localhost:3306/textile_pos"` — note: Docker maps `3307→3306` inside the container; the backend connects via the internal port `3306` if running inside Docker, or the mapped `3307` if connecting from the host. The seeded `.env` uses `3306` (direct Docker network). This works as long as Docker is up.

## Run (agent path)

Start both services in the background, then pipe commands to the driver:

```bash
# Start services (skip if already running)
npm run dev &
# Wait for both to be ready
timeout 30 bash -c 'until curl -sf http://localhost:5001/api/v1/health >/dev/null 2>&1 || curl -sf http://localhost:5001/api/v1/auth/login -X POST -H "Content-Type:application/json" -d "{}" 2>/dev/null | grep -q VALIDATION; do sleep 1; done'
timeout 20 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

Then drive via the REPL — pipe commands to stdin, one per line:

```bash
printf 'launch\nlogin\nscreenshot dashboard\nquit\n' | node .claude/skills/run-textile-pos/driver.mjs
```

Screenshots land in `/tmp/textile-shots/`. Use the `Read` tool on any `.png` there to view it.

### Driver commands

| command | what it does |
|---|---|
| `launch` | Open browser to `http://localhost:5173` |
| `login [user] [pass]` | Fill and submit login form. Defaults: `admin` / `Admin@123` |
| `nav <path>` | Navigate to a route, e.g. `nav /pos/retail` |
| `screenshot [name]` | Save screenshot; prints path |
| `click <selector>` | Click an element (CSS selector) |
| `fill <selector> <text>` | Fill an input |
| `wait <selector>` | Wait up to 10 s for element to appear |
| `text <selector>` | Print innerText of element |
| `eval <js>` | Evaluate JS in page context |
| `api <METHOD> <path> [json]` | Hit the backend REST API with stored auth token |
| `quit` | Close browser and exit 0 |

### Example: full smoke test

```bash
printf '
launch
login admin Admin@123
screenshot login-done
nav /pos/retail
wait h1
screenshot retail-pos
nav /catalog/products
wait td
screenshot catalog
nav /inventory/rolls
wait h1
screenshot rolls
api GET /products?limit=5
quit
' | node .claude/skills/run-textile-pos/driver.mjs
```

### Example: API-only smoke (no browser needed)

```bash
TOKEN=$(curl -s http://localhost:5001/api/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/v1/products?limit=5"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/v1/inventory/rolls?limit=5"
```

## Run (human path)

```bash
docker compose -f docker/docker-compose.yml up -d
npm run dev   # → frontend :5173, backend :5001. Ctrl-C to stop.
# Open http://localhost:5173 — login: admin / Admin@123
```

## Key routes

| path | page |
|---|---|
| `/` | Dashboard |
| `/pos/retail` | Retail POS (barcode scan + cart) |
| `/pos/wholesale` | Wholesale POS |
| `/inventory/rolls` | Fabric roll inventory |
| `/inventory/remnants` | Remnant management |
| `/inventory/wastage` | Wastage records |
| `/catalog/products` | Product catalog |
| `/purchases` | Purchase orders |
| `/customers` | Customer list + credit ledger |
| `/reports/sales` | Sales reports |

## Seed credentials

| username | password | role |
|---|---|---|
| `admin` | `Admin@123` | Admin (all permissions) |
| `cashier` | `Cashier@123` | Cashier |
| `sales` | `Sales@123` | Sales (POS only) |

## Gotchas

- **`login` log shows `/login` URL** — the driver captures the URL immediately after `keyboard.press('Enter')`, before the React Router redirect completes. The screenshot will be on the correct page; the logged URL is a race artifact.
- **`DATABASE_URL` port mismatch** — `backend/.env` has `localhost:3306` but Docker maps `3307:3306`. This works because the backend connects to the Docker container's internal port through Docker networking. If you run MySQL outside Docker, change the port to match.
- **Vite proxy** — the frontend sends all `/api/*` requests to `:5001` via the Vite dev proxy. Don't hit `:5173/api` with `curl` — use `:5001` directly.
- **React controlled inputs** — `eval el.value = '...'` does not fire React's `onChange`. Always use `fill` in the driver, not `eval`.
- **First nav after login is slow** — Vite compiles routes on demand; the first `nav` to a heavy page can take 5–8 s. `wait h1` handles it; a raw `sleep` does not.
- **Data pages show "Loading..." if you `screenshot` too early** — `wait h1` resolves as soon as the page skeleton renders, before async data fetches complete. For pages with tables, use `wait td` to ensure rows have loaded before screenshotting.
- **`inventory/rolls` API returns `success: false` for empty DB** — this is an API bug, not a launch issue. The page still renders correctly.

## Troubleshooting

- **`ECONNREFUSED :5173`**: frontend isn't up yet. Poll with `until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done`.
- **`Invalid credentials` from API**: run `cd backend && npx ts-node prisma/seed.ts` to re-seed the admin user.
- **`Can't connect to MySQL server`**: `docker compose -f docker/docker-compose.yml up -d` and wait ~5 s for it to initialize.
- **Playwright `browserType.launch: Failed to launch`**: run `npx playwright install chromium` from inside `.claude/skills/run-textile-pos/`.
- **Driver exits immediately with only `READY QUIT`**: commands are being lost to a readline race. Fixed in driver v2 (sequential queue). Make sure you're on the current `driver.mjs`.
