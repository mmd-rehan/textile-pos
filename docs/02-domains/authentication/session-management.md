# Session Management

## Strategy

Use JWT/session-based authentication as confirmed.

## Recommended Approach

- Short-lived access token.
- Refresh token or server session depending implementation decision.
- Store token securely.
- Clear POS/client state on logout.

## Pending Confirmation

- Exact token storage mechanism.
- Session timeout duration.
- Whether one user can login from multiple devices.
