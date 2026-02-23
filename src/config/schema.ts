import { z } from "zod"

export const ShannonConfigSchema = z.object({
  shannon: z
    .object({
      default_config: z.string().default(".shannon/config.yaml").describe("Path to Shannon pentest config YAML"),
      audit_log_dir: z.string().default(".shannon/audit-logs/").describe("Directory for Shannon audit logs"),
      report_format: z.enum(["markdown", "pdf", "json", "html"]).default("markdown").describe("Pentest report output format"),
      require_authorization: z.boolean().default(false).describe("Require explicit authorization before running exploits (disable for bug bounty/internal teams)"),
      docker_enabled: z.boolean().default(true).describe("Enable Docker-based security tool execution (Kali Linux)"),
      docker_image: z.string().default("shannon-tools").describe("Docker image for security tools"),
      browser_testing: z.boolean().default(true).describe("Enable Playwright browser-based testing for SPAs"),
      idor_testing: z.boolean().default(true).describe("Enable systematic IDOR testing across endpoints"),
      upload_testing: z.boolean().default(true).describe("Enable file upload vulnerability testing (XXE, YAML, polyglot)"),
    })
    .optional()
    .default({
      default_config: ".shannon/config.yaml",
      audit_log_dir: ".shannon/audit-logs/",
      report_format: "markdown",
      require_authorization: false,
      docker_enabled: true,
      docker_image: "shannon-tools",
      browser_testing: true,
      idor_testing: true,
      upload_testing: true,
    }),

  disabled_hooks: z.array(z.string()).optional().default([]).describe("List of hook names to disable"),
})

export type ShannonConfig = z.infer<typeof ShannonConfigSchema>
