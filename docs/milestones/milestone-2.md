Milestone 2: Database Schema Foundation

Create the first Prisma schema for the Textile ERP & POS System.

Use MySQL and Prisma.

Create models for:

Access:
- User
- Role
- Permission
- UserRole
- RolePermission
- Session or RefreshSession
- ActivityLog

Settings:
- CompanySetting
- AppSetting
- FeatureFlag

Audit:
- AuditLog

Catalog:
- Category
- Brand
- Product
- ProductColor
- ProductDesign
- Unit
- UnitConversion

Inventory:
- Batch
- Roll
- InventoryMovement
- StockAdjustment
- WastageEntry
- RollReconciliation
- Remnant

Sales:
- Customer
- SaleInvoice
- SaleInvoiceItem
- SalePayment

Purchases:
- Supplier
- PurchaseOrder
- PurchaseItem
- PurchaseRoll

Ledger:
- CustomerLedgerEntry
- SupplierLedgerEntry

Important database rules:
1. Use Prisma model names in PascalCase.
2. Map database tables to snake_case plural names.
3. Use Decimal for money and fabric lengths.
4. Do not use Float for money or fabric measurements.
5. Roll must store originalLengthYard and remainingLengthYard.
6. SaleInvoiceItem must store billed quantity and actual cut quantity.
7. InventoryMovement must track before and after quantity where relevant.
8. Ledger entries must support debit, credit, balanceAfter, referenceType, referenceId.
9. Add enums for ProductType, RollStatus, SaleType, InvoiceStatus, PaymentStatus, MovementType, MovementDirection, CustomerType, UserStatus.
10. Add indexes for barcode lookup, roll lookup, invoice lookup, customer ledger lookup.

Also create seed data for:
- Admin role
- Manager role
- Cashier role
- Inventory Staff role
- Accountant role
- Basic permissions
- Yard, meter, piece units
- Yard to meter and meter to yard conversion
- Default company settings
- Default admin user

Acceptance criteria:
- Prisma schema validates.
- Migration can be generated.
- Seed script runs idempotently.
- Database contains initial roles, permissions, units, and admin user.