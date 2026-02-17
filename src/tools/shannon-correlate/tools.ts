import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_CORRELATE_DESCRIPTION } from "./constants"
import type { RawFinding, CorrelatedFinding } from "./types"

interface VulnMapping {
  owasp_id: string
  owasp_category: string
  cwe_id: string
  cwe_name: string
  cvss_base: number
  cvss_vector: string
  remediation: string
}

const VULN_DB: Record<string, VulnMapping> = {
  sqli: {
    owasp_id: "A03:2021",
    owasp_category: "Injection",
    cwe_id: "CWE-89",
    cwe_name: "SQL Injection",
    cvss_base: 9.8,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    remediation:
      "Use parameterized queries/prepared statements. Implement input validation. Apply least-privilege database access.",
  },
  nosqli: {
    owasp_id: "A03:2021",
    owasp_category: "Injection",
    cwe_id: "CWE-943",
    cwe_name: "Improper Neutralization of Special Elements in Data Query Logic",
    cvss_base: 8.6,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L",
    remediation:
      "Sanitize NoSQL operators ($ne, $gt, $regex). Use allowlists for query operators. Validate input types.",
  },
  xss_reflected: {
    owasp_id: "A03:2021",
    owasp_category: "Injection",
    cwe_id: "CWE-79",
    cwe_name: "Cross-site Scripting (Reflected)",
    cvss_base: 6.1,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
    remediation:
      "Encode output in HTML context. Implement Content-Security-Policy. Use framework auto-escaping.",
  },
  xss_stored: {
    owasp_id: "A03:2021",
    owasp_category: "Injection",
    cwe_id: "CWE-79",
    cwe_name: "Cross-site Scripting (Stored)",
    cvss_base: 7.6,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:H/A:N",
    remediation:
      "Sanitize and encode all user input on storage and rendering. Implement CSP. Use DOMPurify or equivalent.",
  },
  xss_dom: {
    owasp_id: "A03:2021",
    owasp_category: "Injection",
    cwe_id: "CWE-79",
    cwe_name: "Cross-site Scripting (DOM-based)",
    cvss_base: 6.1,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
    remediation:
      "Avoid using innerHTML, document.write, eval with user input. Use textContent instead. Sanitize URL fragments.",
  },
  xxe: {
    owasp_id: "A05:2021",
    owasp_category: "Security Misconfiguration",
    cwe_id: "CWE-611",
    cwe_name: "Improper Restriction of XML External Entity Reference",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Disable DTD processing. Disable external entity resolution. Use JSON instead of XML where possible.",
  },
  ssrf: {
    owasp_id: "A10:2021",
    owasp_category: "Server-Side Request Forgery",
    cwe_id: "CWE-918",
    cwe_name: "Server-Side Request Forgery",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Validate and sanitize user-supplied URLs. Use allowlists for permitted domains. Block requests to internal networks.",
  },
  idor: {
    owasp_id: "A01:2021",
    owasp_category: "Broken Access Control",
    cwe_id: "CWE-639",
    cwe_name: "Authorization Bypass Through User-Controlled Key",
    cvss_base: 6.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Implement server-side authorization checks. Use indirect object references. Verify resource ownership.",
  },
  broken_auth: {
    owasp_id: "A07:2021",
    owasp_category: "Identification and Authentication Failures",
    cwe_id: "CWE-287",
    cwe_name: "Improper Authentication",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Implement multi-factor authentication. Use strong password policies. Implement account lockout.",
  },
  rate_limit: {
    owasp_id: "A07:2021",
    owasp_category: "Identification and Authentication Failures",
    cwe_id: "CWE-307",
    cwe_name: "Improper Restriction of Excessive Authentication Attempts",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Implement rate limiting. Use account lockout. Add CAPTCHA after failed attempts.",
  },
  priv_escalation: {
    owasp_id: "A01:2021",
    owasp_category: "Broken Access Control",
    cwe_id: "CWE-269",
    cwe_name: "Improper Privilege Management",
    cvss_base: 8.8,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
    remediation:
      "Enforce role-based access control server-side. Never trust client-supplied role values. Validate all privilege changes.",
  },
  info_disclosure: {
    owasp_id: "A05:2021",
    owasp_category: "Security Misconfiguration",
    cwe_id: "CWE-200",
    cwe_name: "Exposure of Sensitive Information",
    cvss_base: 5.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    remediation:
      "Remove debug endpoints. Suppress stack traces in production. Remove server version headers.",
  },
  security_headers: {
    owasp_id: "A05:2021",
    owasp_category: "Security Misconfiguration",
    cwe_id: "CWE-693",
    cwe_name: "Protection Mechanism Failure",
    cvss_base: 4.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N",
    remediation:
      "Add CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy headers.",
  },
  sensitive_data: {
    owasp_id: "A02:2021",
    owasp_category: "Cryptographic Failures",
    cwe_id: "CWE-312",
    cwe_name: "Cleartext Storage of Sensitive Information",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Encrypt sensitive data at rest. Use bcrypt/scrypt for passwords. Implement proper key management.",
  },
  jwt_weakness: {
    owasp_id: "A02:2021",
    owasp_category: "Cryptographic Failures",
    cwe_id: "CWE-347",
    cwe_name: "Improper Verification of Cryptographic Signature",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Use strong JWT signing algorithms (RS256/ES256). Validate all JWT claims. Set appropriate expiration.",
  },
  file_upload: {
    owasp_id: "A04:2021",
    owasp_category: "Insecure Design",
    cwe_id: "CWE-434",
    cwe_name: "Unrestricted Upload of File with Dangerous Type",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
    remediation:
      "Validate file types server-side. Use allowlists for extensions. Scan uploads for malware. Store outside webroot.",
  },
  race_condition: {
    owasp_id: "A04:2021",
    owasp_category: "Insecure Design",
    cwe_id: "CWE-362",
    cwe_name: "Race Condition",
    cvss_base: 5.9,
    cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N",
    remediation:
      "Implement idempotency keys. Use database-level locking. Apply atomic operations for state changes.",
  },
  timing_attack: {
    owasp_id: "A07:2021",
    owasp_category: "Identification and Authentication Failures",
    cwe_id: "CWE-208",
    cwe_name: "Observable Timing Discrepancy",
    cvss_base: 5.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    remediation:
      "Use constant-time comparison for secrets. Normalize response times regardless of input validity.",
  },
  cors: {
    owasp_id: "A05:2021",
    owasp_category: "Security Misconfiguration",
    cwe_id: "CWE-942",
    cwe_name: "Overly Permissive Cross-domain Whitelist",
    cvss_base: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    remediation:
      "Restrict CORS to specific trusted origins. Never use wildcard (*) with credentials. Validate Origin header.",
  },
  outdated_component: {
    owasp_id: "A06:2021",
    owasp_category: "Vulnerable and Outdated Components",
    cwe_id: "CWE-1104",
    cwe_name: "Use of Unmaintained Third-Party Components",
    cvss_base: 5.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    remediation:
      "Update all dependencies to latest stable versions. Enable automated dependency scanning. Subscribe to CVE alerts.",
  },
}

const KEYWORD_MAP: Array<[string[], string]> = [
  [["sql injection", "sqli", "sqlmap", "union select", "sql inject"], "sqli"],
  [["nosql", "mongodb", "$ne", "$gt", "$regex"], "nosqli"],
  [["reflected xss", "xss reflected"], "xss_reflected"],
  [["stored xss", "xss stored", "persistent xss"], "xss_stored"],
  [["dom xss", "dom-based", "innerhtml", "document.write"], "xss_dom"],
  [["xxe", "xml external", "external entity", "dtd"], "xxe"],
  [["ssrf", "server-side request", "internal url"], "ssrf"],
  [["idor", "insecure direct object", "cross-user access", "unauthorized access to.*resource"], "idor"],
  [["broken auth", "authentication failure", "weak password", "default credential"], "broken_auth"],
  [["rate limit", "brute force", "no lockout", "excessive attempt"], "rate_limit"],
  [["privilege escalation", "admin access", "role injection", "unauthorized admin"], "priv_escalation"],
  [["information disclosure", "stack trace", "debug endpoint", "version disclosure", "server header"], "info_disclosure"],
  [["security header", "missing csp", "x-frame", "hsts", "x-content-type"], "security_headers"],
  [["sensitive data", "cleartext", "plaintext password", "unencrypted"], "sensitive_data"],
  [["jwt", "json web token", "none algorithm", "weak secret"], "jwt_weakness"],
  [["file upload", "unrestricted upload", "extension bypass", "dangerous file"], "file_upload"],
  [["race condition", "concurrent", "double spend", "toctou"], "race_condition"],
  [["timing", "response time", "enumeration via timing"], "timing_attack"],
  [["cors", "cross-origin", "access-control-allow-origin"], "cors"],
  [["outdated", "vulnerable component", "old version", "deprecated"], "outdated_component"],
]

function classifyFinding(finding: RawFinding): string {
  const text = `${finding.title} ${finding.description} ${finding.evidence}`.toLowerCase()
  for (const [keywords, category] of KEYWORD_MAP) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category
    }
  }
  return "info_disclosure"
}

function normalizeSeverity(
  hint: string,
  cvssScore: number
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  const hintLower = hint.toLowerCase()
  if (hintLower === "critical" || cvssScore >= 9.0) return "CRITICAL"
  if (hintLower === "high" || cvssScore >= 7.0) return "HIGH"
  if (hintLower === "medium" || cvssScore >= 4.0) return "MEDIUM"
  if (hintLower === "low" || cvssScore >= 0.1) return "LOW"
  return "INFO"
}

export function createShannonCorrelateFindings(): ToolDefinition {
  return tool({
    description: SHANNON_CORRELATE_DESCRIPTION,
    args: {
      findings: tool.schema.string().describe(
        "JSON array of findings. Each finding: {title, description, evidence, severity_hint, endpoint?}"
      ),
    },
    async execute(args) {
      let rawFindings: RawFinding[]
      try {
        rawFindings = JSON.parse(args.findings)
      } catch {
        return "ERROR: Invalid JSON. Provide a JSON array of findings."
      }

      if (!Array.isArray(rawFindings) || rawFindings.length === 0) {
        return "ERROR: Provide a non-empty JSON array of findings."
      }

      const correlated: CorrelatedFinding[] = rawFindings.map((f) => {
        const category = classifyFinding(f)
        const fallback: VulnMapping = {
          owasp_id: "A05:2021",
          owasp_category: "Security Misconfiguration",
          cwe_id: "CWE-200",
          cwe_name: "Exposure of Sensitive Information",
          cvss_base: 5.3,
          cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
          remediation: "Review and address the identified security issue.",
        }
        const mapping: VulnMapping = VULN_DB[category] ?? fallback
        const severity = normalizeSeverity(
          f.severity_hint,
          mapping.cvss_base
        )

        return {
          title: f.title,
          description: f.description,
          evidence: f.evidence,
          endpoint: f.endpoint ?? "N/A",
          severity,
          owasp_category: mapping.owasp_category,
          owasp_id: mapping.owasp_id,
          cwe_id: mapping.cwe_id,
          cwe_name: mapping.cwe_name,
          cvss_score: mapping.cvss_base,
          cvss_vector: mapping.cvss_vector,
          remediation: mapping.remediation,
        }
      })

      return formatCorrelatedFindings(correlated)
    },
  })
}

function formatCorrelatedFindings(findings: CorrelatedFinding[]): string {
  const output: string[] = []
  output.push("## Correlated Pentest Findings")
  output.push(`**Total Findings**: ${findings.length}`)
  output.push("")

  const severityCounts: Record<string, number> = {}
  const owaspCounts: Record<string, number> = {}
  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1
    owaspCounts[f.owasp_id] = (owaspCounts[f.owasp_id] ?? 0) + 1
  }

  output.push("### Severity Distribution")
  output.push("| Severity | Count |")
  output.push("|----------|-------|")
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]) {
    if (severityCounts[sev]) {
      output.push(`| ${sev} | ${severityCounts[sev]} |`)
    }
  }
  output.push("")

  output.push("### OWASP Top 10 Coverage")
  output.push("| OWASP ID | Category | Findings |")
  output.push("|----------|----------|----------|")
  const seenOwasp = new Set<string>()
  for (const f of findings) {
    if (!seenOwasp.has(f.owasp_id)) {
      seenOwasp.add(f.owasp_id)
      output.push(
        `| ${f.owasp_id} | ${f.owasp_category} | ${owaspCounts[f.owasp_id]} |`
      )
    }
  }
  output.push("")

  const sevOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  }
  findings.sort(
    (a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4)
  )

  output.push("---")
  output.push("")
  for (const [i, f] of findings.entries()) {
    output.push(`### ${i + 1}. [${f.severity}] ${f.title}`)
    output.push("")
    output.push(`| Field | Value |`)
    output.push(`|-------|-------|`)
    output.push(`| Endpoint | \`${f.endpoint}\` |`)
    output.push(`| OWASP | ${f.owasp_id} - ${f.owasp_category} |`)
    output.push(`| CWE | ${f.cwe_id} - ${f.cwe_name} |`)
    output.push(`| CVSS | ${f.cvss_score} |`)
    output.push(`| Vector | \`${f.cvss_vector}\` |`)
    output.push("")
    output.push(`**Description**: ${f.description}`)
    output.push("")
    output.push("**Evidence**:")
    output.push("```")
    output.push(f.evidence)
    output.push("```")
    output.push("")
    output.push(`**Remediation**: ${f.remediation}`)
    output.push("")
    output.push("---")
    output.push("")
  }

  return output.join("\n")
}
