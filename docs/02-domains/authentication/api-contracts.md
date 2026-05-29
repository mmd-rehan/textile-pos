# Authentication API Contracts

## Candidate Endpoints

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh`, if refresh tokens are used
- `POST /auth/change-password`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `PATCH /users/:id/role`

## Required Behavior

- Return generic invalid login errors.
- Do not return password hash.
- Require Admin for user management.
