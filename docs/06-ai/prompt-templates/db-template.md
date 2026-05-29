# Database Prompt Template

Use this template when asking AI to generate database or Prisma changes.

```text
Database task:

Domain:

Read these docs first:
- docs/00-overview/project-vision.md
- docs/00-overview/business-rules-global.md
- docs/02-domains/<domain>/database-schema.md
- docs/03-database/
- docs/06-ai/database-generation-rules.md

Stack:
- MySQL
- Prisma

Business entities involved:
- 

Required data fields:
- 

Relationships:
- 

Decimal fields:
- 

Enums/statuses:
- 

Indexes required:
- 

Unique constraints:
- 

Audit/history requirements:
- 

Migration concerns:
- 

Data backfill needed:
- 

Do not assume:
- 

Pending confirmations:
- 

Output format:
1. Prisma model changes
2. Migration notes
3. Indexes
4. Constraints
5. Transaction considerations
6. Data correction/backfill if needed
7. Tests or seed data updates
8. Pending confirmations
```
