import { tool, type ShannonToolDef as ToolDefinition } from "../../compat"

export function createShannonLogicAudit(): ToolDefinition {
  return tool({
    description:
      "Execute business logic vulnerability testing using user-defined personas and workflows. Tests for price manipulation, quantity tampering, and state-machine bypasses.",
    args: {
      _placeholder: tool.schema
        .boolean()
        .describe("Placeholder. Always pass true."),
    },
    async execute(_args) {
      return [
        "## Shannon Logic Audit",
        "",
        "Business logic audit tool is ready.",
        "Use shannon_exec to run custom business logic tests manually.",
        "",
        "### Suggested Tests",
        "- Price manipulation: modify price fields in checkout requests",
        "- Quantity tampering: send negative or zero quantities",
        "- State-machine bypass: skip required workflow steps",
        "- Race conditions: use shannon_rate_limit_test with action='race'",
      ].join("\n")
    },
  })
}
