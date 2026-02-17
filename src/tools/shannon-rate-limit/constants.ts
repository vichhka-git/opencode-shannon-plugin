export const SHANNON_RATE_LIMIT_DESCRIPTION = `Execute automated rate limiting and timing attack tests inside the Shannon Docker container.

Tests whether endpoints enforce rate limiting, account lockout, CAPTCHA triggers, and timing-based information leakage.

Testing modes:
1. **burst** — Send N requests rapidly to a single endpoint, measure response codes and timing
2. **timing** — Compare response times for valid vs invalid inputs to detect timing-based enumeration
3. **race** — Send concurrent requests to test for race conditions (e.g., simultaneous coupon redemption)

What it detects:
- Missing rate limiting on authentication endpoints
- Missing account lockout after failed login attempts
- Timing differences that reveal valid usernames/emails
- Race conditions on state-changing operations (checkout, coupon apply, balance transfer)
- IP-based vs session-based rate limiting gaps

Example usage:
- Burst test: action="burst", target="https://example.com/api/login", requests=50, body='{"email":"test@test.com","password":"wrong"}'
- Timing test: action="timing", target="https://example.com/api/login", valid_input='{"email":"admin@admin.com","password":"wrong"}', invalid_input='{"email":"nonexistent@fake.com","password":"wrong"}'
- Race test: action="race", target="https://example.com/api/apply-coupon", concurrent=10, body='{"coupon":"SAVE50"}'

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
