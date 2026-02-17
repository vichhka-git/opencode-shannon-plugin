export const SHANNON_CORRELATE_DESCRIPTION = `Automatically correlate penetration test findings with OWASP Top 10 categories, CWE IDs, and CVSS v3.1 scores.

Takes raw finding descriptions and maps them to industry-standard vulnerability classifications. Generates a structured report ready for professional delivery.

Input: A JSON array of findings, each with:
- title: Short vulnerability name
- description: What was found
- evidence: Command/response that proves the finding
- severity_hint: Your estimated severity (critical/high/medium/low/info)
- endpoint: Affected URL or endpoint (optional)

Output: Enriched findings with:
- OWASP Top 10 (2021) category mapping
- CWE ID and name
- CVSS v3.1 base score and vector string
- Standardized severity rating
- Remediation recommendations

Example input:
[
  {
    "title": "SQL Injection in login",
    "description": "Login endpoint vulnerable to SQL injection via email parameter",
    "evidence": "sqlmap confirmed injection: --technique=U --dump",
    "severity_hint": "critical",
    "endpoint": "/api/login"
  }
]

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
