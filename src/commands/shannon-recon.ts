export const SHANNON_RECON_COMMAND_TEMPLATE = `# Shannon Reconnaissance Command

## Usage
\`\`\`
/shannon-recon <target> [--config=<path>]

Arguments:
  target: Target URL or IP address to reconnaissance
    - URL: https://example.com
    - IP: 192.168.1.1
    - Domain: example.com

Options:
  --config: Path to custom Shannon config file (default: .shannon/config.yaml)
\`\`\`

## What This Command Does

Executes the reconnaissance phase only - information gathering without intrusive testing:

**Reconnaissance Activities:**
- DNS enumeration (A, AAAA, MX, TXT, NS records)
- Subdomain discovery (passive and active)
- Technology stack fingerprinting (web servers, frameworks, languages)
- Port scanning (common and custom ports)
- Service identification and version detection
- WHOIS lookups
- Certificate transparency log searches
- Public exposure assessment

**Safe and Non-Intrusive**: Reconnaissance is primarily passive and observational, making it safe for initial target assessment.

---

# WORKFLOW

## Step 1: Scope Verification

Confirm reconnaissance scope:
- [ ] Target is correctly specified
- [ ] Reconnaissance objectives are clear
- [ ] Output format preferences (if any)

## Step 2: Execute Reconnaissance

Use the \`shannon_recon\` tool:

\`\`\`
Use shannon_recon tool with:
- target: "<user-provided-target>"
- config_path: "<user-provided-config-path if --config specified>"
\`\`\`

## Step 3: Analyze Results

The reconnaissance output includes:

### Discovered Assets
- Primary domain and subdomains
- IP addresses (IPv4/IPv6)
- Open ports and services
- Email servers and contact info

### Technologies Detected
- Web server (Apache, Nginx, IIS, etc.)
- Programming languages (PHP, Python, Node.js, etc.)
- Frameworks (React, Django, Laravel, etc.)
- CMS platforms (WordPress, Drupal, etc.)
- CDN providers (Cloudflare, Akamai, etc.)

### Entry Points
- Login pages
- API endpoints
- File upload forms
- Search functionality
- Admin panels

### Interesting Findings
- Exposed debug endpoints
- Directory listings
- Default credentials indicators
- Outdated software versions
- Public cloud storage buckets

## Step 4: Next Steps Recommendation

Based on reconnaissance findings, suggest:
1. High-priority targets for vulnerability discovery
2. Technologies requiring special attention
3. Potential attack vectors worth exploring
4. Areas needing deeper investigation

---

# EXAMPLES

## Basic Reconnaissance
\`\`\`
/shannon-recon https://example.com
\`\`\`

## IP Address Target
\`\`\`
/shannon-recon 192.168.1.100
\`\`\`

## Custom Config
\`\`\`
/shannon-recon https://test-target.com --config=.shannon/stealth-recon.yaml
\`\`\`

---

# USE CASES

## Pre-Assessment Scoping
Use reconnaissance before full pentest to:
- Understand target attack surface
- Estimate testing time required
- Identify scope boundaries
- Plan testing approach

## Bug Bounty Programs
Start with reconnaissance to:
- Discover in-scope assets
- Identify high-value targets
- Find overlooked subdomains
- Map organization's digital footprint

## Continuous Monitoring
Schedule regular reconnaissance to:
- Detect new exposed services
- Monitor infrastructure changes
- Identify shadow IT
- Track security posture over time

---

# CONFIGURATION

Configure the shannon-recon agent in \`.opencode/opencode.json\`:

\`\`\`jsonc
{
  "shannon": {
    "agents": {
      "shannon-recon": {
        "model": "xai/grok-code-fast-1",  // Fast model recommended
        "temperature": 0.1
      }
    }
  }
}
\`\`\`

**Model Recommendations:**
- Fast models work best (Grok, Gemini Flash, GPT-4o-mini)
- Reconnaissance doesn't require deep reasoning
- Prioritize speed and cost-effectiveness

---

# NOTES

- **Execution Time**: Typically 5-15 minutes depending on target size
- **Legal Compliance**: Reconnaissance is generally legal on public-facing assets, but confirm local laws
- **Rate Limiting**: Configured in .shannon/config.yaml to respect target infrastructure
- **Output Format**: Results returned as structured markdown ready for next phases
- **Session Continuity**: Recon data can be passed to shannon_vuln_discovery tool
`
