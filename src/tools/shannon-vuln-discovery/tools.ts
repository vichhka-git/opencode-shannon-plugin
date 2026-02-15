import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_VULN_DISCOVERY_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

export function createShannonVulnDiscovery(): ToolDefinition {
  return tool({
    description: SHANNON_VULN_DISCOVERY_DESCRIPTION,
    args: {
      target: tool.schema.string().describe("Target URL or IP address"),
      command: tool.schema
        .string()
        .describe(
          "Vuln discovery command to run inside Docker (e.g., 'nikto -h target', 'sqlmap -u target --batch', 'gobuster dir -u target -w /usr/share/wordlists/dirb/common.txt')"
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
        `## Vulnerability Discovery Output`,
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
