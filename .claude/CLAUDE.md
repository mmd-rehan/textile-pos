You are working on a Textile ERP & POS System for fabric shops.

Important project rules:
1. This is a v1 single-shop system.
2. Do not implement multi-branch, offline sync, mobile app, RFID, AI forecasting, or native printer drivers yet.
3. Frontend stack: Vite + React + TypeScript + Tailwind CSS.
4. Backend stack: Node.js + NestJS + TypeScript.
5. Database: MySQL.
6. ORM: Prisma.
7. API style: REST.
8. Authentication: email/username + password, JWT/session-based login, role-based permissions.
9. Inventory must be roll-based, not product-level only.
10. A roll/thaan is the true inventory unit for fabric.
11. All inventory and financial writes must happen on the backend.
12. Frontend can preview values, but backend is the source of truth.
13. Do not use floating-point math for money or fabric length.
14. Use Decimal-safe handling for money and measurements.
15. Every stock-changing operation must create a stock movement.
16. Actual cut quantity must be used for inventory deduction.
17. If actual cut is greater than billed quantity, create a wastage record.
18. Ledger records should be append-only.
19. Critical actions must create audit logs.
20. Controllers must stay thin. Business rules belong in services.
21. Use transactions for sales, purchases, customer payments, roll reconciliation, inventory adjustments, and invoice voiding.
22. Do not silently edit confirmed invoices, ledgers, stock movements, or audit logs.
23. Implement only the current milestone. Do not jump ahead.
24. At the end, provide:
   - Files created or changed
   - What works now
   - What remains pending
   - How to test this milestone
   - Any assumptions made