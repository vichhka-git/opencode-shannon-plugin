# OpenCode Shannon Plugin

**AI-powered autonomous penetration testing for [OpenCode](https://github.com/sst/opencode).**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/vichhka-git/opencode-shannon-plugin?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/vichhka-git/opencode-shannon-plugin/releases)

> Based on [Shannon](https://github.com/KeygraphHQ/shannon) by KeygraphHQ (96.15% success on XBOW benchmark).
> Shannon operates like a senior human penetration tester — intelligent, adaptive, and capable of executing complex multi-stage attack chains.

---

## What It Does

- **600+ Kali Linux tools** running in Docker (nmap, sqlmap, nikto, gobuster, hydra, nuclei, and more)
- **Browser automation** via Playwright for testing JavaScript SPAs (React, Angular, Vue)
- **6 pentest phases**: Recon → Vuln Discovery → Browser Testing → IDOR/Upload Testing → Exploitation → Reporting
- **Provider agnostic**: Works with Anthropic, OpenAI, Google Gemini, GitHub Copilot, Azure, Groq, DeepSeek, xAI
- **Professional reports** with CVE references, CVSS scores, and remediation guidance

---

## Installation

### For Humans

Copy and paste this prompt to your LLM agent (Claude Code, AmpCode, Cursor, etc.):

```
Install and configure opencode-shannon-plugin by following the instructions here:
https://raw.githubusercontent.com/vichhka-git/opencode-shannon-plugin/refs/heads/main/docs/guide/installation.md
```

Or install manually — but **we recommend letting an agent handle it.**

### For LLM Agents

Fetch the installation guide and follow it:

```bash
curl -s https://raw.githubusercontent.com/vichhka-git/opencode-shannon-plugin/refs/heads/main/docs/guide/installation.md
```

### Manual Install

```bash
git clone https://github.com/vichhka-git/opencode-shannon-plugin
cd opencode-shannon-plugin
bun install && bun run build
docker build -t shannon-tools .
```

Register the plugin at the user-level (recommended) so it is available across projects.

Recommended (one-step): run the bundled installer which safely merges this plugin into your user OpenCode config and creates a default plugin config:

```bash
./scripts/install-global.sh
```

What the installer does:
- Backs up any existing `~/.config/opencode/opencode.json` to `opencode.json.bak.<timestamp>`
- Adds this plugin path to the `"plugin"` array (idempotent)
- Creates a default `~/.config/opencode/shannon-plugin.json` with recommended defaults (does not overwrite existing)

Manual alternative: create `~/.config/opencode/opencode.json` with the plugin path:

```json
{
  "plugin": ["/absolute/path/to/opencode-shannon-plugin"]
}
```

Replace `/absolute/path/to/opencode-shannon-plugin` with the absolute path where you cloned this repository. For a project-scoped install put the same entry in `.opencode/opencode.json` inside your repo.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [OpenCode](https://github.com/sst/opencode) >= 1.0.150
- [Bun](https://bun.sh) >= 1.3.9
- (Optional) [Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode) for agent orchestration

---

## Usage

### Quick Start

1. Start OpenCode in your project
2. Run `/shannon-scan` and follow the prompts
3. Or just ask naturally:

```
> Scan example.com for vulnerabilities
```

The AI agent will automatically initialize Docker, run reconnaissance, discover vulnerabilities, test with a real browser, and generate a professional report.

### With Oh-My-OpenCode (Recommended)

```
> ulw: Full OWASP Top 10 pentest on example.com, generate PDF report
```

This triggers the full agent orchestration:
- Parallel background agents for reconnaissance
- Automatic escalation to Oracle for complex findings
- Librarian searches for CVEs and exploit patterns
- Continuous execution until 100% complete

### Commands

| Command | Description |
|---------|-------------|
| `/shannon-scan` | Full penetration test |
| `/shannon-recon` | Reconnaissance only (safe) |
| `/shannon-report` | Generate report from findings |

### Tools

| Tool | Description |
|------|-------------|
| `shannon_docker_init` | Start the Docker container (call first) |
| `shannon_docker_cleanup` | Stop and remove the container |
| `shannon_exec` | Run any command in the container |
| `shannon_recon` | Reconnaissance (nmap, subfinder, whatweb, etc.) |
| `shannon_vuln_discovery` | Vulnerability scanning (nikto, sqlmap, nuclei, etc.) |
| `shannon_exploit` | Exploitation (requires authorization) |
| `shannon_report` | Generate pentest report |
| `shannon_browser` | Playwright browser testing for SPAs |
| `shannon_idor_test` | IDOR testing |
| `shannon_upload_test` | File upload vulnerability testing |

---

## Configuration

Create `~/.config/opencode/shannon-plugin.json` (user-level) or `.opencode/shannon-plugin.json` (project-level):

```json
{
  "shannon": {
    "require_authorization": true,
    "docker_image": "shannon-tools",
    "browser_testing": true,
    "idor_testing": true,
    "upload_testing": true
  }
}
```

### Bug Bounty Mode

For authorized bug bounty or internal team testing:

```json
{
  "shannon": {
    "require_authorization": false
  }
}
```

### Frontier Model Configuration (Maximum Findings)

For the most comprehensive security testing, use the latest frontier models:

```json
{
  "agents": {
    "shannon": { 
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.2
    },
    "shannon-recon": { 
      "model": "openai/gpt-4.5-preview",
      "temperature": 0.3
    },
    "shannon-exploit": { 
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.1
    },
    "shannon-report": { 
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.4
    }
  }
}
```

### Budget-Friendly Configuration

For cost-effective testing with good results:

```json
{
  "agents": {
    "shannon": { "model": "anthropic/claude-sonnet-4-5" },
    "shannon-recon": { "model": "google/gemini-2.0-flash-thinking-exp" },
    "shannon-exploit": { "model": "openai/gpt-4o" },
    "shannon-report": { "model": "anthropic/claude-sonnet-4-5" }
  }
}
```

See [examples/](examples/) for more configuration templates.

---

## Model Selection Guide

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| **Complex Attack Chains** | Claude Opus 4.5 | Best multi-step reasoning |
| **JavaScript/SPA Analysis** | Gemini 2.0 Pro | Native browser context understanding |
| **Fast Reconnaissance** | GPT-4o / Grok | Speed + accuracy balance |
| **Report Generation** | Claude Opus 4.5 | Professional writing quality |
| **Budget Testing** | Claude Sonnet 4.5 | 80% capability at 20% cost |

---

## Why Use Latest Models?

**Security testing quality scales directly with model capability.** Using frontier models dramatically improves:

| Capability | Improvement with Latest Models |
|------------|-------------------------------|
| **Vulnerability Detection** | Better pattern recognition, identifies subtle attack vectors |
| **Attack Chain Reasoning** | Multi-step exploitation logic, understands complex dependencies |
| **False Positive Reduction** | Smarter validation of findings, fewer noise |
| **Report Quality** | Professional-grade documentation with accurate CVSS scoring |
| **SPA Testing** | Better JavaScript analysis, DOM-based vulnerability detection |

### Recommended Model Configuration

For **maximum security findings**, use the most capable models available:

```json
{
  "agents": {
    "shannon": { "model": "anthropic/claude-opus-4-5" },
    "shannon-recon": { "model": "openai/gpt-4.5-preview" },
    "shannon-exploit": { "model": "anthropic/claude-opus-4-5" },
    "shannon-report": { "model": "anthropic/claude-opus-4-5" }
  }
}
```

**Why these models?**
- **Claude Opus 4.5**: Superior reasoning for complex attack chains, excellent at identifying business logic flaws
- **GPT-4.5**: Strong at pattern matching across large codebases, good at recon synthesis
- **Gemini 2.0 Pro**: Excellent for JavaScript/SPA analysis with deep browser context understanding

---

## Supercharge with Oh-My-OpenCode

**[Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode)** is the ultimate agent orchestration layer for OpenCode. Combined with Shannon, you get:

### Multi-Agent Penetration Testing

```
Shannon + Oh-My-OpenCode = AI Penetration Testing Team
```

| Oh-My-OpenCode Agent | Security Role |
|---------------------|---------------|
| **Sisyphus** (Main) | Orchestrates the entire pentest, delegates to specialists |
| **Oracle** (GPT 5.2) | Strategic debugging, analyzes complex vulnerabilities |
| **Librarian** | Researches CVEs, finds exploit patterns in public repos |
| **Explore** | Fast codebase grep for finding injection points |
| **Hephaestus** | Deep autonomous exploitation workflows |

### How It Works Together

1. **Parallel Reconnaissance**: Oh-My-OpenCode spawns multiple background agents to scan different attack surfaces simultaneously
2. **Intelligent Delegation**: Complex findings automatically escalate to Oracle for deeper analysis
3. **Context Preservation**: Session continuity means the AI remembers all previous findings
4. **Relentless Execution**: Todo continuation ensures the pentest completes 100%

### Installation with Oh-My-OpenCode

```bash
# Install Oh-My-OpenCode first
bun add -g oh-my-opencode

# Then install Shannon plugin
git clone https://github.com/vichhka-git/opencode-shannon-plugin
cd opencode-shannon-plugin
bun install && bun run build
docker build -t shannon-tools .
./scripts/install-global.sh
```

### Combined Configuration

Create `~/.config/opencode/oh-my-opencode.jsonc`:

```jsonc
{
  // Use frontier models for security testing
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.3  // Lower temperature for precise security analysis
    },
    "oracle": {
      "model": "openai/gpt-4.5-preview"
    }
  },
  
  // Enable all Shannon capabilities
  "shannon": {
    "require_authorization": true,
    "browser_testing": true,
    "idor_testing": true,
    "upload_testing": true
  }
}
```

### The Magic Keyword

Just include `ultrawork` (or `ulw`) in your prompt:

```
ulw: Conduct a comprehensive OWASP Top 10 penetration test on example.com and generate a PDF report
```

The agent will:
1. Fire parallel recon agents across all attack surfaces
2. Analyze JavaScript bundles for hidden endpoints
3. Test authentication, injection, XSS, IDOR, upload vulnerabilities
4. Generate a professional report with CVSS scores and remediation

---

## Ethics & Legal

**Only test systems you own or have explicit written authorization to test.**

Unauthorized penetration testing is illegal and may violate the Computer Fraud and Abuse Act (CFAA), Computer Misuse Act, and similar laws worldwide.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AGPL-3.0](LICENSE) — Based on [Shannon](https://github.com/KeygraphHQ/shannon) by KeygraphHQ.

## Acknowledgments

- **[Shannon](https://github.com/KeygraphHQ/shannon)** by KeygraphHQ — the original autonomous pentesting framework
- **[OpenCode](https://github.com/sst/opencode)** by SST — the extensible AI coding platform
- **[Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode)** by code-yeongyu — the ultimate agent orchestration layer
