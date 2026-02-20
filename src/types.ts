export interface ShannonToolInput {
  target: string
  command?: string
  timeout?: number
}

export interface ShannonToolOutput {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  duration: number
  metadata?: ShannonSecurityMetadata
}

export interface ShannonSecurityMetadata {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cwe_id?: string;
  owasp_category?: string;
  escalation_required: boolean;
  research_target?: string; // e.g. 'Nginx 1.18.0'
}
