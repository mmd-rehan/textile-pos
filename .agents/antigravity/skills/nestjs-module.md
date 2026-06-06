---
name: nestjs-module
description: >
  Scaffold a new NestJS module for the textile-pos backend following project conventions.
---

# NestJS Module Scaffold (Antigravity Edition)

You are generating a new NestJS module for the **textile-pos** backend at `backend/src/modules/<module-name>/`.

## Automated Scaffold Execution

Since you can execute commands, you can automate parts of this process:
1. Run `cd backend && npx nest g module modules/<module-name>` to generate the module file.
2. Run `npx nest g controller modules/<module-name>` and `npx nest g service modules/<module-name>`.

## Applying Business Rules

After generating the basic files, use `replace_file_content` or `multi_replace_file_content` to enforce the project rules:

### DTOs
- Create a `dto/` folder.
- Use `class-validator`. Money and length fields **MUST** be typed as `string` to avoid floating-point loss.

### Services
- Inject `PrismaService`, `AuditService`, `InventoryService`.
- Wrap writes touching multiple tables in `this.prisma.$transaction(async (tx) => { ... })`.
- Call `this.auditService.log(...)` after critical writes.
- **Stock changes** must go through `InventoryService.createMovement(...)`.

### Controllers
- Keep controllers thin. They should only handle HTTP routing and permissions.
- Apply `@UseGuards(JwtAuthGuard)` and `@RequirePermission('read:<module>')`.
- Pass `@CurrentUser() user: User` to the service for audit logs.

## Verification
- Run `cd backend && npm run lint` to ensure your generated files conform to the project's formatting and linting rules.
- Run `cd backend && npm run build` to verify that the module compiles without TypeScript errors.
- Ensure the new module is correctly imported in `AppModule`.
