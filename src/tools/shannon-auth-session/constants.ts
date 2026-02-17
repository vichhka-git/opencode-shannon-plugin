export const SHANNON_AUTH_SESSION_DESCRIPTION = `Manage authenticated sessions for penetration testing.

Creates and persists authentication sessions that can be reused across multiple test phases (IDOR, injection, privilege escalation, etc.).

Supports:
- JWT token-based authentication (Bearer tokens)
- Cookie-based session management
- Custom header authentication
- Multi-user session management for IDOR testing

Session persistence:
- Sessions are stored in-memory during the pentest
- Automatically injects auth credentials into subsequent tool calls
- Supports session refresh/renewal

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`

export const SESSION_TYPES = ["jwt", "cookie", "header"] as const
export type SessionType = (typeof SESSION_TYPES)[number]
