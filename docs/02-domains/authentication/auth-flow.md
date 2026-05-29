# Authentication Flow

## Login Flow

1. User enters username/email and password.
2. Backend validates credentials.
3. Backend checks user active status.
4. Backend creates JWT/session.
5. Frontend loads current user and permissions.
6. User is routed to allowed dashboard/POS screen.

## Logout Flow

1. User clicks logout.
2. Frontend clears client state.
3. Backend invalidates session if server-side sessions are used.

## Rules

- Do not reveal whether username or password was incorrect.
- Inactive users cannot login.
- Backend must enforce permissions.
