export const SHANNON_IDOR_DESCRIPTION = `Execute systematic IDOR (Insecure Direct Object Reference) testing inside the Shannon Docker container.

Tests access control by comparing responses when accessing resources with different user credentials. Automatically detects when User A can access User B's resources.

Modes:
1. **manual** (default) — Run a specific curl command for IDOR testing
2. **auto** — Automatically discover and test API endpoints for IDOR vulnerabilities

Manual mode:
- Provide a curl command that tests cross-user resource access
- Example: curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer TOKEN_A' https://target/api/Users/2

Auto-discovery mode:
- Provide a base URL, auth token, and optionally a list of endpoints to test
- The tool will crawl common REST API patterns, enumerate IDs 1-10, and compare responses
- Detects: cross-user data access, missing auth checks, horizontal privilege escalation

Supports testing patterns:
- GET /api/resource/{id} -- Read other users' data
- PUT /api/resource/{id} -- Modify other users' data
- DELETE /api/resource/{id} -- Delete other users' data
- POST /api/resource -- Create resources assigned to other users
- Nested resources: /api/users/{userId}/orders/{orderId}

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
