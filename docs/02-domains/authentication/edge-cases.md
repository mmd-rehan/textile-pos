# Authentication Edge Cases

## Edge Cases

- Disabled user tries to login.
- User role changes while logged in.
- Token expires during POS sale.
- User loses connection while authenticated.
- User tries endpoint without permission.
- Duplicate username/email.

## Rules

Role changes should take effect on next permission check or token refresh depending implementation.
