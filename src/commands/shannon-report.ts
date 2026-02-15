export const SHANNON_REPORT_COMMAND_TEMPLATE = `# Shannon Report Generation Command

## Usage
\`\`\`
/shannon-report <target> [--format=<markdown|json|html>] [--findings=<data>] [--output=<path>]

Arguments:
  target: Target that was tested (for report header)

Options:
  --format: Report output format (default: markdown)
    - markdown: Clean, readable markdown format
    - json: Structured JSON for programmatic processing
    - html: Professional HTML report with styling

  --findings: Findings data from previous phases (optional)
    If omitted, agent will request findings from user

  --output: Custom output path (default: .shannon/reports/<target>_<timestamp>.<format>)
\`\`\`

## What This Command Does

Generates a comprehensive, professional penetration test report from Shannon's findings:

**Report Contents:**

### 1. Executive Summary
- Non-technical overview for stakeholders
- Overall security posture assessment
- Critical findings highlight
- Business impact analysis
- Priority recommendations

### 2. Methodology
- Testing approach and phases
- Scope and limitations
- Tools and techniques used
- Testing timeline

### 3. Detailed Findings
Organized by severity (Critical → High → Medium → Low → Info):
- Finding title and description
- Affected systems/endpoints
- Technical details
- Proof-of-concept code
- CVSS score and severity justification
- Business impact
- Step-by-step remediation
- References (CVE, CWE, OWASP)

### 4. Remediation Roadmap
- Prioritized action items
- Quick wins vs long-term improvements
- Cost-benefit analysis
- Timeline recommendations

### 5. Conclusion
- Security maturity assessment
- Re-testing recommendations
- Continuous improvement suggestions

---

# WORKFLOW

## Step 1: Gather Findings Data

If findings data not provided via --findings:

1. Ask user to provide findings from previous phases:
   - Reconnaissance data
   - Vulnerability discovery results
   - Exploitation outcomes
   - Any manual testing results

2. OR suggest running phases first:
   \`\`\`
   Suggestion: Run full scan first to gather findings:
   /shannon-scan <target>
   
   Then generate report from those findings.
   \`\`\`

## Step 2: Generate Report

Use the \`shannon_report\` tool:

\`\`\`
Use shannon_report tool with:
- target: "<user-provided-target>"
- findings_data: "<findings from previous phases or user input>"
- format: "<user-specified format or 'markdown'>"
- output_path: "<user-specified path if --output provided>"
\`\`\`

## Step 3: Save and Deliver

1. Extract the generated report from tool output
2. Save to specified path (or default .shannon/reports/ location)
3. Inform user of report location
4. Suggest next steps:
   - Share with stakeholders
   - Begin remediation tracking
   - Schedule re-test

---

# EXAMPLES

## Basic Report Generation
\`\`\`
/shannon-report https://example.com
\`\`\`
(Agent will request findings data)

## With Findings Data
\`\`\`
/shannon-report https://example.com --findings="<paste findings>"
\`\`\`

## JSON Format for Automation
\`\`\`
/shannon-report https://example.com --format=json
\`\`\`

## HTML Report for Clients
\`\`\`
/shannon-report https://example.com --format=html --output=./client-report.html
\`\`\`

## Custom Output Path
\`\`\`
/shannon-report https://example.com --output=./reports/Q1-2025/example-pentest.md
\`\`\`

---

# REPORT QUALITY GUIDELINES

The generated report should:

### Professional Tone
- Clear, concise language
- Balance technical depth with business context
- Actionable recommendations
- No jargon without explanation

### Complete Documentation
- Every finding fully documented
- Reproducible steps provided
- Evidence included (screenshots, logs, PoC)
- Remediation guidance specific and testable

### Accurate Severity Ratings
- CVSS scores justified
- Business impact aligned with technical severity
- Consider exploitability and asset criticality

### Actionable Recommendations
- Specific, not generic
- Prioritized by risk reduction
- Realistic timeline and resource estimates
- Verification criteria provided

---

# USE CASES

## Client Deliverable
Professional report for pentest clients:
\`\`\`
/shannon-report https://client-site.com --format=html
\`\`\`

## Internal Security Assessment
Markdown report for internal teams:
\`\`\`
/shannon-report https://internal-app.company.com --format=markdown
\`\`\`

## Automated Scanning Pipeline
JSON report for CI/CD integration:
\`\`\`
/shannon-report https://staging.example.com --format=json
\`\`\`

## Bug Bounty Submission
Detailed markdown for submission:
\`\`\`
/shannon-report https://bugbounty-target.com --format=markdown
\`\`\`

---

# CONFIGURATION

Configure the shannon-report agent in \`.opencode/opencode.json\`:

\`\`\`jsonc
{
  "shannon": {
    "agents": {
      "shannon-report": {
        "model": "anthropic/claude-sonnet-4-5",  // Good at writing
        "temperature": 0.2  // Slightly higher for creativity
      }
    },
    "shannon": {
      "report_format": "markdown"  // Default format
    }
  }
}
\`\`\`

**Model Recommendations:**
- Writing-optimized models (Claude, GPT-4, Gemini Pro)
- Higher temperature (0.2-0.3) for natural language
- Longer context windows for comprehensive reports

---

# NOTES

- **Execution Time**: 5-10 minutes for typical report
- **Report Length**: Varies by findings (typically 10-50 pages equivalent)
- **Customization**: Edit report after generation for client-specific requirements
- **Compliance**: Reports include all standard pentest documentation elements
- **Archival**: Save reports to .shannon/reports/ for future reference
`
