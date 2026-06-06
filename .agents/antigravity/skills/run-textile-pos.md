---
name: run-textile-pos
description: >
  Build, run, and test TextilePOS.
---

# Run TextilePOS (Antigravity Edition)

TextilePOS is a Vite+React frontend (`:5173`) proxied to a NestJS backend (`:5001`) backed by MySQL (`:3307`).

## Managing Background Tasks
Unlike standard chatbots, you can run and manage these servers autonomously in the background.

1. **Start MySQL**:
   ```bash
   run_command: docker compose -f docker/docker-compose.yml up -d
   ```
2. **Start Backend**:
   Use `WaitMsBeforeAsync: 3000` to let it start, then move to background.
   ```bash
   run_command: cd backend && npm run dev
   ```
3. **Start Frontend**:
   ```bash
   run_command: cd frontend && npm run dev
   ```
4. **Use `manage_task`** to list running tasks, check their status, or kill them when testing is complete.

## API Testing
Once the backend task is running in the background, you can use `run_command` to test REST endpoints directly:
```bash
TOKEN=$(curl -s http://localhost:5001/api/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('accessToken', ''))")

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/v1/products?limit=5"
```
Use this to autonomously verify that your backend changes work as expected.

## Browser Testing
If visual testing is required, instruct the user to open `http://localhost:5173` and test the UI. Provide them with the seed credentials:
- `admin` / `Admin@123`
- `cashier` / `Cashier@123`
- `sales` / `Sales@123`
