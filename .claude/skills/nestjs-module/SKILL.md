---
name: nestjs-module
description: >
  Scaffold a new NestJS module for the textile-pos backend following all project conventions.
  Use this skill whenever a developer asks to: add a new module, create a new feature backend,
  scaffold a controller/service/DTO, or add a new domain to the API. Even if the request just
  says "add X to the backend" or "build the backend for Y", use this skill to ensure the
  generated code follows project rules correctly.
---

# NestJS Module Scaffold

You are generating a new NestJS module for the **textile-pos** backend. The project lives at the
repo root; the backend is at `backend/src/modules/<module-name>/`.

## Project conventions to follow

Before writing any code, re-read `CLAUDE.md` at the repo root. The rules that matter most here:

- **Thin controllers** — HTTP wiring only. No business logic, no Prisma calls.
- **Services own everything** — validation, Prisma transactions, stock movements, audit logs.
- **Transactions** — any write that touches more than one table must use `prisma.$transaction(...)`.
- **Decimal-safe math** — never use JS `number` for money or fabric lengths. Use Prisma's `Decimal`
  type (from `@prisma/client`) and pass strings or `Decimal` instances, never floats.
- **Audit logs** — every critical write must call `AuditService.log(...)`. Reads do not need logs.
- **Stock movements** — any operation that changes inventory must create an `InventoryMovement`
  record via `InventoryService`, not a raw Prisma insert.
- **Append-only ledgers** — never update or delete ledger rows. Always insert new rows.
- **Active-only dropdowns** — queries for master data (colors, brands, categories, etc.) must
  filter `{ isActive: true }` unless the admin explicitly requests inactive records.

---

## File layout to create

```
backend/src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
└── dto/
    ├── create-<module-name>.dto.ts
    ├── update-<module-name>.dto.ts
    └── query-<module-name>.dto.ts   (if the module supports list/search)
```

Only create files that are needed. A read-only reporting module may not need create/update DTOs.

---

## Step-by-step

### 1. Clarify scope

Ask (or infer from context) before writing:
- What Prisma models does this module touch?
- What HTTP endpoints are needed (CRUD? custom actions?)?
- Does it write inventory? Does it write a ledger? Does it need transactions?
- What permissions guard each endpoint? (follow the `read:X` / `write:X` pattern used elsewhere)

### 2. Write the DTOs first

Use `class-validator` decorators. Every nullable field must be `@IsOptional()`. Money/length fields
must be typed as `string` in the DTO (so Prisma can convert to `Decimal` without float loss).

```ts
// Example money field in a DTO
@IsString()
@IsNotEmpty()
unitPrice: string;   // ← string, not number
```

### 3. Write the service

- Inject `PrismaService` and any domain services needed (`AuditService`, `InventoryService`, etc.).
- Wrap multi-table writes in `prisma.$transaction(async (tx) => { ... })`.
- Throw `NotFoundException` / `BadRequestException` from `@nestjs/common` — never raw `Error`.
- Call `this.auditService.log(...)` at the end of any critical write (after the transaction
  commits) with the entity name, action, actor userId, and the record id.

### 4. Write the controller

Keep it thin:

```ts
@Controller('module-name')
@UseGuards(JwtAuthGuard)
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  @RequirePermission('read:module-name')
  findAll(@Query() query: QueryDto) {
    return this.moduleService.findAll(query);
  }

  @Post()
  @RequirePermission('write:module-name')
  create(@Body() dto: CreateDto, @CurrentUser() user: User) {
    return this.moduleService.create(dto, user.id);
  }
}
```

No `try/catch` in controllers — NestJS exception filters handle that.

### 5. Write the module file

Register the service and controller. Import `PrismaModule` (and any other modules whose services
you injected). Export the service if other modules will use it.

### 6. Register in AppModule

Open `backend/src/app.module.ts` and add the new module to the `imports` array.

### 7. Add permissions seed (if needed)

If new `read:X` / `write:X` permission strings were introduced, add them to the permissions seed
script so they exist in the database. Check `backend/prisma/seed.ts` or equivalent seed file.

---

## Output checklist

Before finishing, verify:
- [ ] Controller has zero Prisma imports
- [ ] All money/length fields in DTOs are `string` type
- [ ] Multi-table writes use `prisma.$transaction`
- [ ] Critical writes call `AuditService.log`
- [ ] Any inventory change calls `InventoryService` (not raw Prisma)
- [ ] Module is imported in `AppModule`
- [ ] No floating-point arithmetic anywhere

---

## Delivery format (per CLAUDE.md rule 24)

End your response with:

```
## Files created / changed
- ...

## What works now
- ...

## What remains pending
- ...

## How to test this milestone
- ...

## Assumptions made
- ...
```
