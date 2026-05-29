# Feature Prompt Template

Use this template when asking AI to build a full feature.

```text
Feature name:

Business goal:

Relevant docs to read first:
- docs/00-overview/project-vision.md
- docs/00-overview/business-rules-global.md
- docs/07-decisions/
- docs/01-architecture/
- docs/02-domains/<domain>/
- docs/03-database/
- docs/04-api/
- docs/05-ui-ux/
- docs/06-ai/

Confirmed requirements:
- 

Business rules that must be enforced:
- 

User roles allowed:
- 

Backend requirements:
- NestJS module/service/controller/DTOs
- Prisma transaction where needed
- permission checks
- audit logging

Frontend requirements:
- React + TypeScript
- Tailwind UI
- TanStack Query for server state
- Zustand only for local workflow state
- React Hook Form for forms

Database requirements:
- Prisma models or migration notes
- indexes
- decimal fields
- audit/history records

API requirements:
- endpoints
- request/response contracts
- error codes

Testing requirements:
- unit tests
- integration tests
- permission tests
- edge-case tests

Do not assume:
- 

Pending confirmations:
- 

Expected output:
1. Files to create or change
2. Backend implementation
3. Frontend implementation
4. Database changes
5. Tests
6. Documentation updates
7. Pending confirmations
```
