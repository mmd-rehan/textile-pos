Milestone 14: Deployment Preparation

Prepare the project for local and production deployment.

Required:
1. Docker Compose for development:
   - frontend
   - backend
   - mysql
2. Production Dockerfiles:
   - frontend
   - backend
3. Environment files:
   - backend/.env.example
   - frontend/.env.example
4. Prisma migration deployment command.
5. Seed command.
6. README deployment section.
7. Basic backup instructions for MySQL.
8. Basic logging setup.
9. Health check endpoint documentation.
10. Production checklist.

Backend production checklist:
- NODE_ENV=production
- Secure JWT/session secret
- Database URL configured
- Prisma migrate deploy documented
- Seed command documented
- CORS configured
- No stack traces exposed
- No password/token logging

Frontend production checklist:
- API base URL configured
- Build command works
- Static assets build correctly
- Auth redirects work

Rules:
- Do not add Kubernetes yet.
- Do not add Redis unless required.
- Do not add complex background job system yet.
- Keep deployment simple for v1.

Acceptance criteria:
- Fresh developer can run the project locally from README.
- Production build succeeds.
- Migration deploy command is documented.
- Backup and restore basics are documented.