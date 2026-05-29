# Inventory API Contracts

## API Style

NestJS REST endpoints using JSON. Backend responses should follow the global API response and error format from `docs/04-api`.

## Candidate Endpoints

### Categories

- `GET /inventory/categories`
- `POST /inventory/categories`
- `PATCH /inventory/categories/:id`

### Products

- `GET /inventory/products`
- `POST /inventory/products`
- `GET /inventory/products/:id`
- `PATCH /inventory/products/:id`

### Batches

- `GET /inventory/batches?productId=`
- `POST /inventory/batches`
- `PATCH /inventory/batches/:id`

### Rolls

- `GET /inventory/rolls`
- `GET /inventory/rolls/:id`
- `GET /inventory/rolls/by-barcode/:barcode`
- `POST /inventory/rolls`
- `PATCH /inventory/rolls/:id`
- `POST /inventory/rolls/:id/reconcile`
- `POST /inventory/rolls/:id/adjust`

### Movements

- `GET /inventory/movements?rollId=&productId=&dateFrom=&dateTo=`

## Required Backend Behavior

- Validate permissions for every write endpoint.
- Use transactions for stock-changing operations.
- Return clear validation errors for insufficient stock, duplicate barcode, invalid unit, and inactive roll.
- Never allow frontend-only stock deduction.
