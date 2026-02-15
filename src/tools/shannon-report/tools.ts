import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_REPORT_DESCRIPTION } from "./constants"

export function createShannonReport(): ToolDefinition {
  return tool({
    description: SHANNON_REPORT_DESCRIPTION,
    args: {
      target: tool.schema.string().describe("Target that was tested"),
      findings: tool.schema
        .string()
        .describe("Complete findings text to include in the report"),
      format: tool.schema
        .enum(["markdown", "json", "html"])
        .optional()
        .describe("Report format (default: markdown)"),
    },
    async execute(args) {
      const format = args.format ?? "markdown"
      const timestamp = new Date().toISOString()

      if (format === "json") {
        return JSON.stringify(
          {
            target: args.target,
            generated_at: timestamp,
            format: "json",
            findings: args.findings,
          },
          null,
          2
        )
      }

      return [
        `# Penetration Test Report`,
        "",
        `**Target**: ${args.target}`,
        `**Generated**: ${timestamp}`,
        `**Format**: ${format}`,
        "",
        "---",
        "",
        args.findings,
      ].join("\n")
    },
  })
}
