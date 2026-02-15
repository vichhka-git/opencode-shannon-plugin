import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_RECON_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

export function createShannonRecon(): ToolDefinition {
  return tool({
    description: SHANNON_RECON_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target URL, domain, or IP address (e.g., https://example.com or 192.168.1.1)"),
      command: tool.schema
        .string()
        .describe(
          "Recon command to run inside Docker (e.g., 'nmap -sV -sC target', 'subfinder -d target', 'whatweb target')"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 300000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      const result = await docker.exec(args.command, args.timeout)

      const output = [
        `## Recon Command Output`,
        `**Target**: ${args.target}`,
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

      return output.join("\n")
    },
  })
}
