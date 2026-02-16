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

### Custom Models

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
