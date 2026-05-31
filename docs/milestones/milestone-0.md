Milestone 0: Project Setup

Using the project rules above, create the initial monorepo structure for the Textile ERP & POS System.

Required structure:

project-root/
  frontend/
  backend/
  shared/
  docs/
  scripts/
  docker/
  README.md
  package.json

Backend:
- Initialize a NestJS TypeScript app inside backend.
- Add Prisma setup for MySQL.
- Add basic config structure.
- Add health check endpoint: GET /api/v1/health.
- Add common response envelope structure:
  {
    success: true,
    data: {},
    meta: {}
  }
  and error response:
  {
    success: false,
    error: {
      code,
      message,
      details
    }
  }

Frontend:
- Initialize Vite + React + TypeScript app inside frontend.
- Add Tailwind CSS.
- Add basic routing structure.
- Add basic layout shell.
- Add API client placeholder.
- Add TanStack Query setup.
- Add Zustand setup.

Docker:
- Add docker-compose for MySQL.
- Add example environment files:
  backend/.env.example
  frontend/.env.example

Rules:
- Do not implement business modules yet.
- Do not create POS, inventory, or sales logic yet.
- Keep the setup clean and production-friendly.

Acceptance criteria:
- Frontend runs locally.
- Backend runs locally.
- MySQL runs through Docker Compose.
- Backend can connect to MySQL.
- GET /api/v1/health returns a valid response.
- README explains how to start the project.