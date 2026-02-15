import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_IDOR_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

export function createShannonIdorTest(): ToolDefinition {
  return tool({
    description: SHANNON_IDOR_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Base URL of the target (e.g., https://example.com)"),
      command: tool.schema
        .string()
        .describe(
          "IDOR test command — typically a curl command or Python script that tests cross-user resource access. " +
            "Example: curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer TOKEN_A' https://target/api/Users/2"
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
        `## IDOR Test Output`,
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
