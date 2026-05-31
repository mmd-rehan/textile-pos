Milestone 1: Backend Foundation

Implement the backend foundation for the Textile ERP & POS System.

Create this backend structure:

backend/src/
  main.ts
  app.module.ts
  config/
  common/
    decorators/
    dto/
    errors/
    filters/
    guards/
    interceptors/
    pipes/
    utils/
  database/
    prisma.service.ts
    transaction.ts
  modules/
    auth/
    users/
    roles/
    permissions/
    settings/
    audit/

Implement:
1. Global API prefix: /api/v1
2. Global validation pipe.
3. Global error filter.
4. AppError class with:
   - code
   - message
   - statusCode
   - details
5. Standard success response helper.
6. Request ID middleware or interceptor.
7. PrismaService.
8. Transaction helper for Prisma.
9. Basic AuditModule placeholder with AuditService.
10. Basic SettingsModule placeholder.

Important:
- Do not implement sales or inventory yet.
- Do not write business logic in controllers.
- Use clean module boundaries.
- Use TypeScript strict-friendly code.
- Keep all responses consistent.

Acceptance criteria:
- Backend compiles.
- Health endpoint works.
- Errors return standard format.
- Prisma service is injectable.
- AuditService exists but only has placeholder methods.