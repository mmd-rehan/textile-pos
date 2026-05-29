# Authentication Database Schema

## Candidate Models

### User

- id
- name
- username
- email, optional
- passwordHash
- role
- isActive
- lastLoginAt
- createdAt
- updatedAt

### RolePermission, optional

- id
- role
- permission

### AuditLog

- id
- actorUserId
- action
- entityType
- entityId
- oldValueJson
- newValueJson
- reason
- createdAt

## Pending Confirmation

- Static role enum vs database-managed permissions.
- Exact password reset flow.
