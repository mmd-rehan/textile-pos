Milestone 3: Authentication and Role-Based Access

Implement authentication and role-based authorization.

Backend requirements:
1. Login with username or email plus password.
2. Password hashing using bcrypt or argon2.
3. JWT or secure session-based auth.
4. GET /api/v1/auth/me endpoint.
5. Logout endpoint.
6. Auth guard.
7. Permission guard.
8. CurrentUser decorator.
9. Seeded permissions should be returned with current user.
10. Users with INACTIVE or SUSPENDED status cannot login.

Frontend requirements:
1. Login page.
2. Auth API client.
3. Store current user and permissions.
4. Protected routes.
5. Redirect unauthorized users.
6. Sidebar items should respect permissions.
7. Basic dashboard shell after login.

Roles to support:
- Admin
- Manager
- Cashier
- Inventory Staff
- Accountant

Rules:
- Frontend permissions are only for UX.
- Backend must enforce permissions.
- Do not implement inventory or sales screens yet.

Acceptance criteria:
- Admin can login.
- Cashier can login.
- Invalid login shows proper error.
- Unauthorized route returns 401.
- Forbidden action returns 403.
- Current user endpoint returns user, roles, and permissions.