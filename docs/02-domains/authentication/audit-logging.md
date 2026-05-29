# Authentication Audit Logging

## Events To Log

- Login success
- Login failure, without storing password
- Logout
- Password change
- User created
- User disabled/enabled
- Role changed
- Permission-sensitive action performed

## Rules

- Never log passwords or tokens.
- Store actor, target user, action, timestamp, and metadata.
