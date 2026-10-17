import { tool, type ShannonToolDef as ToolDefinition } from "../../compat"

export function createShannonCloudRecon(): ToolDefinition {
  return tool({
    description:
      "Scan for cloud-native misconfigurations, CI/CD secrets, and environment metadata leaks.",
    args: {
      _placeholder: tool.schema
        .boolean()
        .describe("Placeholder. Always pass true."),
    },
    async execute(_args) {
      return [
        "## Shannon Cloud Recon",
        "",
        "Cloud recon tool is ready.",
        "Use shannon_exec to run cloud-specific scanning commands manually.",
        "",
        "### Suggested Scans",
        "- IMDS metadata: curl http://169.254.169.254/latest/meta-data/",
        "- CI/CD secrets: search .github/workflows, .gitlab-ci.yml for hardcoded tokens",
        "- Environment leaks: check /.env, /config, /actuator/env endpoints",
        "- If CI/CD secrets are found, consult Librarian for platform-specific remediation.",
      ].join("\n")
    },
  })
}
