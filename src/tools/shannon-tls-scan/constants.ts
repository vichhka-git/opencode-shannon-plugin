export const SHANNON_TLS_SCAN_DESCRIPTION = `Comprehensive SSL/TLS security analysis for production web applications.

TLS misconfigurations are extremely common post-deployment. Apps frequently ship with TLS 1.0/1.1 still enabled, weak cipher suites, expired certificates, or missing HSTS. This tool performs a deep TLS audit to find all such issues.

**What it checks:**
- Protocol versions: SSLv2, SSLv3 (POODLE), TLS 1.0, 1.1, 1.2, 1.3 support
- Known vulnerabilities: HEARTBLEED, POODLE, BEAST, CRIME, BREACH, ROBOT, LUCKY13, SWEET32
- Cipher suites: weak/export/null/anonymous ciphers, forward secrecy support
- Certificate: expiry, chain validity, hostname mismatch, self-signed
- Security headers delivered via TLS: HSTS, HPKP
- Session resumption and renegotiation behavior

**Severity classifications:**
- CRITICAL: Heartbleed, SSLv2/SSLv3 enabled, null ciphers
- HIGH: TLS 1.0/1.1 enabled, POODLE, expired certificate
- MEDIUM: Weak cipher suites, missing forward secrecy, BEAST
- LOW: Missing HSTS, certificate chain issues, session renegotiation

**Example usage:**
- Full scan: target="https://example.com"
- Custom port: target="example.com", port=8443
- Fast check only: target="https://example.com", quick=true

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
