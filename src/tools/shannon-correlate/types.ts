export interface RawFinding {
  title: string
  description: string
  evidence: string
  severity_hint: string
  endpoint?: string
}

export interface CorrelatedFinding {
  title: string
  description: string
  evidence: string
  endpoint: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  owasp_category: string
  owasp_id: string
  cwe_id: string
  cwe_name: string
  cvss_score: number
  cvss_vector: string
  remediation: string
}
