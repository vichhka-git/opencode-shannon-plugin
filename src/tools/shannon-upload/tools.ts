import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_UPLOAD_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

export function createShannonUploadTest(): ToolDefinition {
  return tool({
    description: SHANNON_UPLOAD_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target URL with upload endpoint (e.g., https://example.com/file-upload)"),
      command: tool.schema
        .string()
        .describe(
          "File upload test command — typically a curl multipart upload or Python script. " +
            "Example: curl -X POST -F 'file=@payload.xml;type=text/xml' https://target/file-upload"
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
        `## File Upload Test Output`,
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
