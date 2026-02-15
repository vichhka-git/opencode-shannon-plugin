import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { DockerManager } from "../../docker"

export function createShannonExec(): ToolDefinition {
  return tool({
    description: `Execute any command inside the Shannon Docker container and return the real output.

This is the core tool for running security commands. The container has pre-installed tools:
nmap, sqlmap, nikto, subfinder, whatweb, gobuster, hydra, curl, wget, dig, whois,
nuclei, ffuf, httpx, Chromium + Playwright, and more.

Examples:
- nmap -sV -sC -p 80,443 target.com
- curl -sI https://target.com
- echo "SELECT 1" | sqlmap --stdin
- python3 -c "import requests; print(requests.get('http://target.com').headers)"
- playwright screenshot https://target.com

Returns stdout, stderr, exit code, and duration.`,
    args: {
      command: tool.schema
        .string()
        .describe("Shell command to execute inside the Docker container"),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 300000 = 5 minutes)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      const result = await docker.exec(args.command, args.timeout)

      const output = [
        `**Command**: \`${args.command}\``,
        `**Exit Code**: ${result.exitCode}`,
        `**Duration**: ${result.duration}ms`,
        "",
      ]

      if (result.stdout) {
        output.push("### stdout", "```", result.stdout.trim(), "```", "")
      }

      if (result.stderr) {
        output.push("### stderr", "```", result.stderr.trim(), "```", "")
      }

      if (!result.stdout && !result.stderr) {
        output.push("*(no output)*")
      }

      return output.join("\n")
    },
  })
}

export function createShannonDockerInit(): ToolDefinition {
  return tool({
    description: `Start the Shannon Docker container. Call this before running any security tools.

Ensures the shannon-tools Docker container is running. If already running, this is a no-op.
The container uses --network host for direct access to target networks.

Prerequisites:
- Docker must be installed
- The "shannon-tools" image must be built (docker build -t shannon-tools .)`,
    args: {},
    async execute() {
      const docker = DockerManager.getInstance()

      try {
        await docker.ensureRunning()
        return [
          `Shannon container is running.`,
          `**Container**: ${docker.getContainerName()}`,
          `**Image**: ${docker.getImageName()}`,
          `**Network**: host`,
          "",
          "Ready to execute security tools. Use `shannon_exec` to run commands.",
        ].join("\n")
      } catch (error) {
        return `Failed to start container: ${error instanceof Error ? error.message : String(error)}`
      }
    },
  })
}

export function createShannonDockerCleanup(): ToolDefinition {
  return tool({
    description: `Stop and remove the Shannon Docker container. Call this when done with pentesting.

Removes the running container and frees resources. Safe to call even if container is not running.`,
    args: {},
    async execute() {
      const docker = DockerManager.getInstance()

      try {
        await docker.cleanup()
        return "Shannon container stopped and removed."
      } catch (error) {
        return `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      }
    },
  })
}
