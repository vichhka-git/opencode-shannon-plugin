export const SHANNON_TOOLS = new Set([
  "shannon_exec",
  "shannon_docker_init",
  "shannon_docker_cleanup",
  "shannon_recon",
  "shannon_vuln_discovery",
  "shannon_exploit",
  "shannon_report",
])

export const TOOL_PHASES: Record<string, string> = {
  shannon_exec: "Command Execution",
  shannon_docker_init: "Docker Init",
  shannon_docker_cleanup: "Docker Cleanup",
  shannon_recon: "Reconnaissance",
  shannon_vuln_discovery: "Vulnerability Discovery",
  shannon_exploit: "Exploitation",
  shannon_report: "Report Generation",
}

export const PROGRESS_PREFIX = "\n[Shannon Progress] "
