export const SHANNON_IDOR_DESCRIPTION = `Execute systematic IDOR (Insecure Direct Object Reference) testing inside the Shannon Docker container.

Tests access control by comparing responses when accessing resources with different user credentials. Automatically detects when User A can access User B's resources.

Testing methodology:
1. Authenticate as two different users (or one user + unauthenticated)
2. Access resource endpoints with User A's credentials using User B's resource IDs
3. Compare HTTP status codes and response bodies
4. Flag any case where cross-user access succeeds

Supports testing patterns:
- GET /api/resource/{id} — Read other users' data
- PUT /api/resource/{id} — Modify other users' data
- DELETE /api/resource/{id} — Delete other users' data
- POST /api/resource — Create resources assigned to other users
- Nested resources: /api/users/{userId}/orders/{orderId}

Example test specification (JSON):
{
  "endpoints": [
    {"method": "GET", "path": "/api/Users/{id}", "ids": [1, 2, 3]},
    {"method": "GET", "path": "/api/BasketItems/{id}", "ids": [1, 2, 3, 4, 5]}
  ],
  "auth_token": "Bearer eyJ...",
  "victim_ids": [2, 3]
}

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
