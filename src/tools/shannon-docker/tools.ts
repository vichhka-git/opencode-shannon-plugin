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

export function createShannonFileExtract(): ToolDefinition {
  return tool({
    description: `Copy files from the Shannon Docker container to the host filesystem.

Use this to extract screenshots, generated reports, scan results, or any other files
created inside the Docker container during pentesting.

The container's /workspace directory is bind-mounted to the host project root,
so files written there are already accessible. Use this tool for files created
elsewhere in the container (e.g., /tmp, /root, tool output directories).

Examples:
- Extract a screenshot: container_path="/workspace/screenshot.png", host_path="./evidence/screenshot.png"
- Extract nuclei results: container_path="/tmp/nuclei-output.json", host_path="./results/nuclei.json"`,
    args: {
      container_path: tool.schema
        .string()
        .describe("Absolute path to the file or directory inside the Docker container"),
      host_path: tool.schema
        .string()
        .describe("Path on the host filesystem where the file should be saved"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()

      if (!docker.isRunning()) {
        return "Error: Shannon container is not running. Start it first with shannon_docker_init."
      }

      const result = await docker.copyFromContainer(args.container_path, args.host_path)

      if (result.success) {
        return [
          `File extracted successfully.`,
          `**From (container)**: ${args.container_path}`,
          `**To (host)**: ${args.host_path}`,
        ].join("\n")
      }

      return `Failed to extract file: ${result.error}`
    },
  })
}
