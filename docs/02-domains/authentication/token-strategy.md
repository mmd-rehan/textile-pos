# Token Strategy

## Current Decision

JWT/session login is confirmed, but exact token details are pending implementation.

## Recommended Rules

- Access token should include user ID and role identifier only.
- Permissions should be resolved by backend or cached carefully.
- Do not place sensitive business data in token.
- Token expiry should be configured.

## Pending Confirmation

- Access token expiry.
- Refresh token usage.
- Cookie-based vs header-based token transport.
