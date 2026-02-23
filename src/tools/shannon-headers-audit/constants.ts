export const SHANNON_HEADERS_AUDIT_DESCRIPTION = `Comprehensive security headers and CORS misconfiguration audit.

Security headers are the first line of defense against XSS, clickjacking, MIME sniffing, and data injection. CORS misconfigurations allow malicious websites to make authenticated cross-origin requests on behalf of victims. This tool systematically checks both.

**Security headers checked:**
- Content-Security-Policy (CSP) — presence and strength analysis
- Strict-Transport-Security (HSTS) — includeSubDomains, preload, max-age
- X-Content-Type-Options — nosniff enforcement
- X-Frame-Options — clickjacking protection
- Referrer-Policy — information leakage via Referer header
- Permissions-Policy — feature policy enforcement
- X-XSS-Protection — legacy XSS filter (deprecated but informational)
- Cache-Control — sensitive page caching
- Server / X-Powered-By — version disclosure

**CORS tests performed:**
- Reflected Origin attack (Access-Control-Allow-Origin mirrors attacker's origin)
- Null origin attack (ACAO: null)
- Wildcard with credentials (ACAO: * + ACAC: true — invalid but misconfigured servers may allow)
- Subdomain origin bypass (evil.target.com accepted?)
- HTTP origin bypass (http:// accepted on HTTPS endpoint?)
- Pre-flight OPTIONS analysis

**Severity:**
- CRITICAL: CORS reflects arbitrary origin + credentials allowed
- HIGH: Missing CSP, CORS null origin, clickjacking possible
- MEDIUM: Missing HSTS, missing X-Content-Type-Options
- LOW: Version disclosure headers, missing Referrer-Policy
- INFO: CSP weaknesses (unsafe-inline, unsafe-eval)

**Example usage:**
- Full audit: target="https://example.com"
- With auth: target="https://example.com/api/profile", auth_token="Bearer eyJ..."
- Specific endpoint: target="https://example.com/api/users"

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
