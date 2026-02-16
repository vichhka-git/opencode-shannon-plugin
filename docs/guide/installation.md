# Installation Guide — OpenCode Shannon Plugin

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [OpenCode](https://github.com/sst/opencode) >= 1.0.150
- [Bun](https://bun.sh) >= 1.3.9

## Step 1: Install the Plugin

```bash
git clone https://github.com/vichhka-git/opencode-shannon-plugin
cd opencode-shannon-plugin
bun install
bun run build
```

## Step 2: Build the Docker Image

The plugin uses a Docker container with 600+ Kali Linux security tools pre-installed.

```bash
cd opencode-shannon-plugin
docker build -t shannon-tools .
```

## Step 3: Register the Plugin

Add the plugin to your OpenCode configuration.

Edit `.opencode/opencode.json` (or `opencode.jsonc`) and add the plugin path:

```json
{
  "plugins": [
    "./path/to/opencode-shannon-plugin"
  ]
}
```

Replace `./path/to/opencode-shannon-plugin` with the actual path where you cloned the repo.

## Step 4: Configure (Optional)

Create a config file at `~/.config/opencode/shannon-plugin.json` (user-level) or `.opencode/shannon-plugin.json` (project-level):

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

### Custom Models (Optional)

Override the default AI models used for each pentest phase:

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

### Bug Bounty Mode (Optional)

For authorized bug bounty or internal team testing, disable the authorization prompt:

```json
{
  "shannon": {
    "require_authorization": false
  }
}
```

> **Warning**: Only disable authorization for legally authorized targets.

## Step 5: Verify

Start OpenCode and verify the plugin is loaded:

```bash
opencode
```

You should see the Shannon tools available. Try running:

```
/shannon-recon
```

## You're Done!

The plugin provides these commands:

| Command | Description |
|---------|-------------|
| `/shannon-scan` | Full penetration test |
| `/shannon-recon` | Reconnaissance only (safe) |
| `/shannon-report` | Generate report from findings |

Or just ask naturally: `Scan example.com for vulnerabilities`

## Supported Providers

| Provider | Model Prefix | Example |
|----------|-------------|---------|
| Anthropic | `anthropic/` | `claude-sonnet-4-5` |
| OpenAI | `openai/` | `gpt-4o` |
| Google | `google/` | `gemini-2.0-flash-thinking-exp` |
| GitHub Copilot | `github/` | `gpt-4o` |
| Azure | `azure/` | `gpt-4o` |
| Groq | `groq/` | `llama-3.3-70b-versatile` |
| DeepSeek | `deepseek/` | `deepseek-chat` |
| xAI | `xai/` | `grok-2-latest` |

## Troubleshooting

### Plugin not loading?
- Check OpenCode version: `opencode --version` (needs >= 1.0.150)
- Verify plugin path in `.opencode/opencode.json`

### Docker issues?
- Ensure Docker is running: `docker ps`
- Verify image exists: `docker images | grep shannon-tools`
- Rebuild if needed: `docker build -t shannon-tools .`

### Model not found?
- Check your provider API keys are configured in OpenCode
- Verify model name matches the provider's naming convention
