# OpenCode Shannon Plugin

**Enterprise-Grade AI Penetration Testing - Rival to Burp Suite Enterprise & Acunetix**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE.md)

## Overview

Native OpenCode plugin that brings Shannon's autonomous penetration testing capabilities to any AI provider supported by OpenCode. Based on [Shannon](https://github.com/KeygraphHQ/shannon) by KeygraphHQ (96.15% success on XBOW benchmark).

**Shannon is designed to operate like a senior human penetration tester** - intelligent, adaptive, and capable of executing complex multi-stage attack chains using 600+ security tools from Kali Linux.

### Key Features

#### 🚀 Enterprise-Grade Capabilities
- **Docker-Powered Tool Arsenal**: 600+ Kali Linux security tools (nmap, sqlmap, nikto, gobuster, hydra, john, hashcat, nuclei, ffuf, httpx, subfinder, and more)
- **Playwright Browser Automation**: Test JavaScript SPAs (Angular, React, Vue) with real browser rendering — detects XSS, DOM-based vulnerabilities, OAuth flows
- **Intelligent Tool Selection**: AI automatically chooses the right tools based on target reconnaissance
- **Multi-Stage Attack Chains**: Constructs sophisticated exploitation sequences like a human pentester
- **Real-Time Vulnerability Notifications**: Get alerted as vulnerabilities are discovered, not just at the end
- **Stealth Mode**: Slower, harder-to-detect scanning for sensitive engagements

#### 🔓 Authorization Flexibility
- **Bug Bounty Mode**: Disable authorization requirements (`require_authorization: false`) for bug bounty hunters
- **Internal Team Mode**: Skip bureaucracy for internal penetration testing teams
- **Continuous Scanning**: Monitor targets continuously for new vulnerabilities

#### 🤖 AI-Powered Intelligence
- **Provider Agnostic**: Works with Anthropic, OpenAI, Google Gemini, GitHub Copilot, Azure, Groq, DeepSeek, xAI
- **6 Pentest Phases**: Reconnaissance → Vulnerability Discovery → Browser Testing → IDOR/Upload Testing → Exploitation → Reporting
- **10 Specialized Tools**: Docker management, recon, vuln discovery, exploitation, reporting, browser automation, IDOR testing, file upload testing
- **Configurable Models**: Choose different models per agent or phase
- **Native OpenCode Integration**: Uses OpenCode SDK for all AI operations

#### 🛡️ Professional Features
- **Adaptive Scanning**: Automatically adjusts tools and techniques based on target profile
- **Multi-Tool Orchestration**: Combines findings from multiple tools for comprehensive assessment
- **Enterprise Reporting**: Professional penetration test reports with CVE references, CVSS scores, and remediation guidance

---

## Installation

### Via OpenCode Plugin Manager (Recommended)

```bash
opencode plugin install opencode-shannon-plugin
```

### Manual Installation

```bash
git clone https://github.com/vichhka-git/opencode-shannon-plugin
cd opencode-shannon-plugin
bun install
bun run build
```

Then add to your `.opencode/opencode.json`:

```json
{
  "plugins": [
    "./path/to/opencode-shannon-plugin"
  ]
}
```

---

## Configuration

### Configuration Files

The Shannon plugin uses a separate configuration file (not the main OpenCode config):

- **User-level**: `~/.config/opencode/shannon-plugin.json` or `shannon-plugin.jsonc`
- **Project-level**: `<project>/.opencode/shannon-plugin.json` or `shannon-plugin.jsonc`

Project-level config overrides user-level config.

### Basic Configuration

Create `~/.config/opencode/shannon-plugin.json`:

```json
{
  "shannon": {
    "default_config": ".shannon/config.yaml",
    "audit_log_dir": ".shannon/audit-logs/",
    "report_format": "markdown",
    "max_parallel_phases": 3,
    "timeout_per_phase_minutes": 30,
    "require_authorization": true,
    "docker_enabled": true,
    "docker_image": "shannon-tools",
    "real_time_notifications": true,
    "stealth_mode": false,
    "continuous_scan": false,
    "browser_testing": true,
    "idor_testing": true,
    "upload_testing": true
  },
  "agents": {
    "shannon": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.1,
      "max_output_tokens": 64000
    },
    "shannon-recon": {
      "model": "google/gemini-2.0-flash-thinking-exp",
      "temperature": 0.1
    },
    "shannon-exploit": {
      "model": "openai/gpt-5.2-codex",
      "temperature": 0.1
    },
    "shannon-report": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.2
    }
  },
  "disabled_hooks": []
}
```

### Bug Bounty / Internal Team Configuration

For bug bounty hunters or internal penetration testing teams that don't need authorization delays:

```json
{
  "shannon": {
    "require_authorization": false,
    "docker_enabled": true,
    "real_time_notifications": true,
    "max_parallel_phases": 5,
    "timeout_per_phase_minutes": 60
  }
}
```

**Why disable authorization?**
- **Bug Bounty Hunters**: Programs pre-authorize testing; asking for permission per scan wastes time
- **Internal Teams**: Top management wants results, not bureaucracy
- **Trusted Environments**: When testing your own infrastructure
- **Continuous Monitoring**: Automated scanning requires no-friction workflows

⚠️ **Warning**: Only disable authorization for legally authorized targets. You are responsible for compliance.

### Provider Examples

**Anthropic Claude**:
```json
{
  "agents": {
    "shannon": { 
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.1
    }
  }
}
```

**OpenAI GPT**:
```json
{
  "agents": {
    "shannon": { 
      "model": "openai/gpt-4o",
      "temperature": 0.1
    }
  }
}
```

**Google Gemini**:
```json
{
  "agents": {
    "shannon": { 
      "model": "google/gemini-2.0-flash-thinking-exp",
      "temperature": 0.1
    }
  }
}
```

**GitHub Copilot**:
```json
{
  "agents": {
    "shannon": { 
      "model": "github/gpt-4o",
      "temperature": 0.1
    }
  }
}
```

**xAI Grok**:
```json
{
  "agents": {
    "shannon-recon": { 
      "model": "xai/grok-2-latest",
      "temperature": 0.1
    }
  }
}
```

### Configuration Schema

#### Shannon Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default_config` | string | `.shannon/config.yaml` | Path to Shannon pentest config YAML |
| `audit_log_dir` | string | `.shannon/audit-logs/` | Directory for audit logs |
| `report_format` | enum | `markdown` | Report format: `markdown`, `pdf`, `json` |
| `max_parallel_phases` | number | `3` | Max parallel phases (1-5) |
| `timeout_per_phase_minutes` | number | `30` | Timeout per phase (5-120 minutes) |
| `require_authorization` | boolean | `true` | Require explicit authorization before exploits |
| `docker_enabled` | boolean | `true` | Enable Docker-based Kali Linux tools |
| `docker_image` | string | `shannon-tools` | Docker image for security tools |
| `real_time_notifications` | boolean | `true` | Send notifications as vulnerabilities are discovered |
| `stealth_mode` | boolean | `false` | Enable stealth scanning (slower, harder to detect) |
| `continuous_scan` | boolean | `false` | Enable continuous scanning mode |
| `browser_testing` | boolean | `true` | Enable Playwright browser-based testing for SPAs |
| `idor_testing` | boolean | `true` | Enable systematic IDOR testing across endpoints |
| `upload_testing` | boolean | `true` | Enable file upload vulnerability testing (XXE, YAML, polyglot) |

### Agent Configuration

| Agent | Default Model | Purpose |
|-------|---------------|---------|
| `shannon` | `anthropic/claude-sonnet-4-5` | Main orchestrator, vulnerability discovery |
| `shannon-recon` | `xai/grok-code-fast-1` | Reconnaissance phase |
| `shannon-exploit` | `openai/gpt-5.2-codex` | Exploitation phase |
| `shannon-report` | `anthropic/claude-sonnet-4-5` | Report generation |

---

## Usage

### Tools

The plugin provides up to 10 tools accessible from OpenCode. Core tools are always registered; specialized tools (`shannon_browser`, `shannon_idor_test`, `shannon_upload_test`) are conditionally registered based on config flags.

#### Core Tools

##### `shannon_docker_init` - Start Docker Container

Initialize the Shannon Docker container. **Call this first** before any security testing.

```typescript
// No arguments required
```

##### `shannon_docker_cleanup` - Stop Docker Container

Stop and remove the Shannon Docker container when done.

##### `shannon_exec` - Execute Command

Execute any shell command inside the Docker container. The primary tool for running security commands directly.

```typescript
{
  "command": "nmap -sV -sC -p 80,443 target.com",
  "timeout": 120000  // optional, default 120s
}
```

##### `shannon_recon` - Reconnaissance

Information gathering and target enumeration:

```typescript
{
  "target": "example.com",
  "command": "nmap -sV -sC -p- example.com"
}
```

**Uses**: nmap, subfinder, whatweb, dig, whois, curl

##### `shannon_vuln_discovery` - Vulnerability Discovery

Identify potential vulnerabilities:

```typescript
{
  "target": "example.com",
  "command": "nikto -h example.com"
}
```

**Uses**: nikto, sqlmap, gobuster, nuclei, ffuf

##### `shannon_exploit` - Exploitation

**⚠️ REQUIRES AUTHORIZATION**

```typescript
{
  "target": "example.com",
  "command": "sqlmap -u 'example.com/page?id=1' --os-shell --batch"
}
```

**Uses**: sqlmap, hydra, curl-based exploitation

##### `shannon_report` - Generate Report

Compile findings into a structured penetration test report:

```typescript
{
  "target": "example.com",
  "findings": "Summary of all findings...",
  "format": "markdown"  // markdown | json | html
}
```

#### Specialized Tools (Conditionally Registered)

These tools are enabled by default and can be toggled via config flags.

##### `shannon_browser` - Browser-Based Testing

Execute Playwright browser automation for testing JavaScript-heavy SPAs (Angular, React, Vue). Essential for vulnerabilities that curl/wget cannot detect.

**Config**: `shannon.browser_testing: true` (default)

```typescript
{
  "target": "https://example.com",
  "script": "await page.goto('https://example.com/#/search?q=<img src=x onerror=alert(1)>')\ncontent = await page.content()\nprint(content)",
  "timeout": 60000  // optional
}
```

**Capabilities**:
- Navigate SPA routes and test JavaScript-rendered content
- Execute XSS payloads in a real browser context (reflected, stored, DOM-based)
- Test OAuth/SSO flows requiring browser redirects
- Extract routes and API endpoints from JavaScript bundles
- Screenshot pages for evidence collection
- Analyze client-side storage (localStorage, sessionStorage, cookies)

**Note**: The `script` parameter accepts Python/Playwright code with access to `page`, `context`, and `browser` objects. Use `print()` for output.

##### `shannon_idor_test` - IDOR Testing

Systematic Insecure Direct Object Reference testing for cross-user resource access.

**Config**: `shannon.idor_testing: true` (default)

```typescript
{
  "target": "https://example.com",
  "command": "curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer TOKEN_A' https://example.com/api/Users/2",
  "timeout": 300000  // optional
}
```

**Testing patterns**:
- `GET /api/resource/{id}` — Read other users' data
- `PUT /api/resource/{id}` — Modify other users' data
- `DELETE /api/resource/{id}` — Delete other users' data
- Nested resources: `/api/users/{userId}/orders/{orderId}`

##### `shannon_upload_test` - File Upload Testing

Test file upload endpoints for XXE injection, YAML deserialization, polyglot files, and path traversal.

**Config**: `shannon.upload_testing: true` (default)

```typescript
{
  "target": "https://example.com/file-upload",
  "command": "curl -X POST -F 'file=@payload.xml;type=text/xml' https://example.com/file-upload",
  "timeout": 300000  // optional
}
```

**Testing methodology**:
- Dangerous file types: .php, .jsp, .exe, .sh, .py, .svg (XSS)
- XXE via XML/SVG/DOCX uploads with external entity declarations
- YAML bomb/deserialization via .yml/.yaml uploads
- Path traversal via filename manipulation (`../../etc/passwd`)
- Null byte injection (`file.php%00.jpg`)
- Content-type bypass (upload .php with image/jpeg content-type)

### Slash Commands

#### `/shannon-scan`

Start a full penetration test:

```
/shannon-scan
```

Prompts for:
- Target URL or IP
- Scope definition
- Authorization confirmation

#### `/shannon-recon`

Start reconnaissance only:

```
/shannon-recon
```

Safe for unauthorized testing (information gathering only).

#### `/shannon-report`

Generate report from findings:

```
/shannon-report
```

Prompts for findings file and output format.

### Skills

The plugin includes the `shannon-pentest` skill that provides:
- Comprehensive OWASP methodology covering 14 vulnerability categories
- Playwright browser automation examples for SPA testing
- IDOR, XXE, YAML injection, and file upload testing patterns
- Tool documentation with real-world usage examples
- Vulnerability coverage matrix and testing checklists

To use the skill in delegated tasks:

```typescript
task({
  category: "security",
  load_skills: ["shannon-pentest"],
  prompt: "Perform reconnaissance on example.com"
})
```

---

## Supported Providers

| Provider | Prefix | Example Model |
|----------|--------|---------------|
| Anthropic | `anthropic/` | `claude-sonnet-4-5` |
| OpenAI | `openai/` | `gpt-5.2-codex` |
| Google | `google/` | `gemini-2.0-flash-thinking-exp` |
| GitHub Copilot | `github/` | `gpt-4o` |
| Azure | `azure/` | `gpt-4o` |
| Groq | `groq/` | `llama-3.3-70b-versatile` |
| DeepSeek | `deepseek/` | `deepseek-chat` |
| xAI | `xai/` | `grok-2-latest` |

**Note**: Model availability depends on your OpenCode configuration and API keys.

---

## Ethical Guidelines

### ⚠️ CRITICAL: Authorization Requirements

**NEVER** run penetration tests without proper authorization:

1. **Written Authorization**: Obtain explicit written permission from system owner
2. **Scope Definition**: Clearly define what systems and techniques are allowed
3. **Legal Compliance**: Ensure compliance with local laws and regulations
4. **Responsible Disclosure**: Follow responsible disclosure practices for findings

### Unauthorized Testing is Illegal

Running penetration tests without authorization may violate:
- Computer Fraud and Abuse Act (CFAA) in the US
- Computer Misuse Act in the UK
- Similar laws in other jurisdictions

**Penalties include**: Fines, imprisonment, civil liability

### Safe Usage

- **Reconnaissance**: Information gathering is generally legal for public information
- **Vulnerability Scanning**: May trigger IDS/IPS; get authorization first
- **Exploitation**: **ALWAYS** requires explicit authorization
- **Report Findings**: Follow responsible disclosure timelines

---

## Architecture

### Provider-Agnostic Design

```typescript
interface ShannonExecutor {
  executePrompt(messages: ShannonMessage[]): Promise<ShannonExecutorResponse>
}

class OpenCodeShannonExecutor implements ShannonExecutor {
  constructor(config: {
    agent: string
    model: string
  })
}
```

### How It Works

1. **Tool Call**: User requests pentest via tool or command
2. **Agent Selection**: Plugin selects appropriate Shannon agent
3. **Model Resolution**: Parses `provider/model` string
4. **OpenCode Session**: Creates OpenCode session with specified model
5. **Prompt Execution**: Converts Shannon messages to OpenCode format
6. **Response Extraction**: Extracts text from OpenCode response
7. **Shannon Processing**: Shannon processes response and continues workflow

### Message Conversion

Shannon messages are converted to OpenCode format:

```typescript
{ role: "user", content: "Scan example.com" }

{
  parts: [
    { type: "text", text: "Scan example.com" }
  ]
}
```

System prompts are extracted and passed via OpenCode's `system` field.

---

## Development

### Requirements

- Bun >= 1.3.9
- OpenCode >= 1.0.150
- Node.js >= 18 (for compatibility)

### Build Commands

```bash
bun run typecheck
bun test
bun run build
bun run build --watch
```

### Project Structure

```
opencode-shannon-plugin/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── system-prompt.ts
│   ├── config/
│   │   ├── schema.ts
│   │   ├── loader.ts
│   │   └── index.ts
│   ├── docker/
│   │   ├── manager.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── shannon-authorization-validator/
│   │   ├── shannon-progress-tracker/
│   │   └── shannon-session-manager/
│   ├── tools/
│   │   ├── shannon-docker/
│   │   ├── shannon-recon/
│   │   ├── shannon-vuln-discovery/
│   │   ├── shannon-exploit/
│   │   ├── shannon-report/
│   │   ├── shannon-browser/
│   │   ├── shannon-idor/
│   │   └── shannon-upload/
│   ├── skills/
│   │   └── shannon-pentest.md
│   └── commands/
│       ├── shannon-scan.ts
│       ├── shannon-recon.ts
│       └── shannon-report.ts
├── sample-reports/
│   ├── pentest-report-juice-shop.md
│   └── pentest-report-juice-shop-v2.md
├── examples/
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Running Tests

```bash
bun test
bun test src/shared/message-adapter.test.ts
bun test --watch
```

**Test Status**: No test files currently

---

## Configuration Examples

See the `examples/` directory for complete configuration examples:

- **[shannon-plugin.json](examples/shannon-plugin.json)** - Full configuration with all agents
- **[shannon-plugin-minimal.json](examples/shannon-plugin-minimal.json)** - Minimal configuration
- **[shannon-plugin-google.json](examples/shannon-plugin-google.json)** - Google Gemini models
- **[shannon-plugin-copilot.json](examples/shannon-plugin-copilot.json)** - GitHub Copilot models

Copy any example to `~/.config/opencode/shannon-plugin.json` and customize as needed.

---

## Troubleshooting

### Plugin Not Loading

**Check OpenCode version**:
```bash
opencode --version
```

Requires >= 1.0.150

**Check plugin registration** in `.opencode/opencode.json`:
```json
{
  "plugins": ["opencode-shannon-plugin"]
}
```

### Model Not Found

**Error**: `Model "provider/model" not found`

**Solution**: Ensure provider is configured in OpenCode:

1. Check available providers: `opencode config list-providers`
2. Add API key if needed: `opencode config set-provider anthropic --api-key sk-...`
3. Verify model name matches provider's naming

### Authorization Error

**Error**: `Unauthorized to run exploitation`

**Solution**: Exploitation requires explicit authorization confirmation. Ensure you have:
1. Written authorization from system owner
2. Proper scope definition
3. Legal compliance verified

### Session Timeout

**Error**: `Session timeout after 5 minutes`

**Solution**: Long-running scans may timeout. Use:
- Smaller scope
- Individual phase tools instead of full scan
- Increase timeout in configuration

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas for Contribution

- Additional provider support
- Enhanced reporting formats
- Improved vulnerability detection
- Test coverage expansion
- Documentation improvements

---

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

This plugin embeds and extends [Shannon](https://github.com/KeygraphHQ/shannon) by KeygraphHQ, which is licensed under AGPL-3.0. Therefore, this plugin is also distributed under AGPL-3.0.

### Key Requirements

- **Source Code**: You must provide source code when distributing
- **Network Use**: If you run this as a service, you must provide source to users
- **Attribution**: Maintain all copyright and license notices
- **Same License**: Derivative works must use AGPL-3.0

See [LICENSE.md](LICENSE.md) for full terms.

### Attribution

This plugin is based on:
- **Shannon** by KeygraphHQ - https://github.com/KeygraphHQ/shannon
- Licensed under AGPL-3.0

---

## Acknowledgments

- **Shannon**: KeygraphHQ for the original autonomous pentesting framework
- **OpenCode**: SST team for the extensible AI coding platform
- **Community**: All contributors and testers

---

## Disclaimer

This tool is for **authorized security testing only**. The authors are not responsible for misuse or illegal activities. Always obtain proper authorization before testing any system you do not own.

**Use at your own risk. Test responsibly. 🔒**
