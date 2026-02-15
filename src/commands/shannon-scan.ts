export const SHANNON_SCAN_COMMAND_TEMPLATE = `# Shannon Scan Command

## Usage
\`\`\`
/shannon-scan <target> [--phases=<phase1,phase2,...>] [--config=<path>]

Arguments:
  target: Target URL or IP address to test
    - URL: https://example.com
    - IP: 192.168.1.1
    - Domain: example.com

Options:
  --phases: Specific phases to run (default: all)
    Available: reconnaissance, vulnerability_discovery, exploitation, post_exploitation, reporting
    Example: --phases=reconnaissance,vulnerability_discovery

  --config: Path to custom Shannon config file (default: .shannon/config.yaml)
\`\`\`

## What This Command Does

Executes a comprehensive penetration test on the specified target using Shannon's autonomous multi-phase approach:

1. **Reconnaissance** (15 min timeout)
   - DNS enumeration and subdomain discovery
   - Technology stack fingerprinting
   - Port scanning and service identification
   - Attack surface mapping

2. **Vulnerability Discovery** (30 min timeout)
   - SQL injection testing
   - XSS detection
   - Authentication/authorization flaws
   - Configuration weaknesses
   - Known CVE identification

3. **Exploitation** (45 min timeout, AUTHORIZED ONLY)
   - Validate discovered vulnerabilities
   - Demonstrate proof-of-concept exploits
   - Assess actual impact

4. **Post-Exploitation** (30 min timeout)
   - Privilege escalation testing
   - Persistence mechanisms
   - Data exfiltration paths

5. **Reporting** (10 min timeout)
   - Executive summary
   - Detailed findings with CVSS scores
   - Remediation recommendations

**Provider Agnostic**: Uses whatever models are configured for each agent. Mix and match:
- Fast models for reconnaissance (e.g., xai/grok-code-fast-1)
- High-IQ models for exploitation (e.g., openai/gpt-5.2-codex)
- Writing-optimized models for reports (e.g., anthropic/claude-sonnet-4-5)

---

# WORKFLOW

## Step 1: Authorization Check

**CRITICAL**: Before ANY testing, verify authorization:

- [ ] Do you own this system?
- [ ] Do you have explicit written permission to test?
- [ ] Is this an authorized bug bounty program?

**IF NO TO ALL**: STOP. Unauthorized testing is illegal.

## Step 2: Execute Scan

Use the \`shannon_scan\` tool:

\`\`\`
Use shannon_scan tool with:
- target: "<user-provided-target>"
- phases: [array of phase names if --phases specified, otherwise omit for all phases]
- config_path: "<user-provided-config-path if --config specified>"
\`\`\`

## Step 3: Monitor Progress

Shannon will:
1. Initialize each phase with configured model
2. Execute phase objectives systematically
3. Document findings in real-time
4. Log all activities to .shannon/audit-logs/
5. Return comprehensive results

## Step 4: Review Results

The scan output includes:
- Per-phase findings
- Severity ratings (Critical → Info)
- CVSS scores where applicable
- Proof-of-concept code
- Remediation recommendations

## Step 5: Save Artifacts

After scan completion:
1. Review the comprehensive report in the output
2. Suggest saving to: \`.shannon/reports/<target>_<timestamp>.md\`
3. Archive audit logs for compliance
4. Document any manual follow-up needed

---

# EXAMPLES

## Basic Full Scan
\`\`\`
/shannon-scan https://test-target.com
\`\`\`

## Reconnaissance Only
\`\`\`
/shannon-scan https://test-target.com --phases=reconnaissance
\`\`\`

## Specific Phases
\`\`\`
/shannon-scan https://test-target.com --phases=reconnaissance,vulnerability_discovery
\`\`\`

## Custom Config
\`\`\`
/shannon-scan 192.168.1.100 --config=.shannon/custom-rules.yaml
\`\`\`

---

# SAFETY GUARDRAILS

1. **Authorization Verification**: Always confirm authorization before exploitation phases
2. **Audit Logging**: All actions logged to .shannon/audit-logs/ with timestamps
3. **Rate Limiting**: Respect target rate limits (configurable in .shannon/config.yaml)
4. **Graceful Failures**: Phase failures don't block subsequent phases
5. **Clean Artifacts**: Option to clean up test artifacts after scan

---

# CONFIGURATION

Configure Shannon agents in \`.opencode/opencode.json\`:

\`\`\`jsonc
{
  "shannon": {
    "agents": {
      "shannon-recon": {
        "model": "xai/grok-code-fast-1",  // Fast for recon
        "temperature": 0.1
      },
      "shannon": {
        "model": "anthropic/claude-sonnet-4-5",  // Main orchestrator
        "temperature": 0.1
      },
      "shannon-exploit": {
        "model": "openai/gpt-5.2-codex",  // High-IQ for exploitation
        "temperature": 0.1
      },
      "shannon-report": {
        "model": "google/gemini-2.0-flash-thinking-exp",  // Good at writing
        "temperature": 0.2
      }
    }
  }
}
\`\`\`

---

# NOTES

- **Execution Time**: Full scan typically takes 90-120 minutes depending on target complexity
- **Background Execution**: Consider using background agents for long-running scans
- **Session Continuity**: If scan is interrupted, logs in .shannon/audit-logs/ allow resumption
- **Legal Compliance**: Maintain documentation of authorization for all scans
`
