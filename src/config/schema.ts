import { z } from "zod"

export const ShannonConfigSchema = z.object({
  shannon: z
    .object({
      default_config: z.string().default(".shannon/config.yaml").describe("Path to Shannon pentest config YAML"),
      audit_log_dir: z.string().default(".shannon/audit-logs/").describe("Directory for Shannon audit logs"),
      report_format: z.enum(["markdown", "pdf", "json"]).default("markdown").describe("Pentest report output format"),
      max_parallel_phases: z.number().min(1).max(5).default(3).describe("Max parallel phases to run"),
      timeout_per_phase_minutes: z.number().min(5).max(120).default(30).describe("Timeout per phase in minutes"),
      require_authorization: z.boolean().default(false).describe("Require explicit authorization before running exploits (disable for bug bounty/internal teams)"),
      docker_enabled: z.boolean().default(true).describe("Enable Docker-based security tool execution (Kali Linux)"),
      docker_image: z.string().default("shannon-tools").describe("Docker image for security tools"),
      real_time_notifications: z.boolean().default(true).describe("Send notifications as vulnerabilities are discovered"),
      stealth_mode: z.boolean().default(false).describe("Enable stealth scanning (slower, harder to detect)"),
      continuous_scan: z.boolean().default(false).describe("Enable continuous scanning mode for bug bounty hunters"),
      browser_testing: z.boolean().default(true).describe("Enable Playwright browser-based testing for SPAs"),
      idor_testing: z.boolean().default(true).describe("Enable systematic IDOR testing across endpoints"),
      upload_testing: z.boolean().default(true).describe("Enable file upload vulnerability testing (XXE, YAML, polyglot)"),
    })
    .optional()
    .default({
      default_config: ".shannon/config.yaml",
      audit_log_dir: ".shannon/audit-logs/",
      report_format: "markdown",
      max_parallel_phases: 3,
      timeout_per_phase_minutes: 30,
      require_authorization: false,
      docker_enabled: true,
      docker_image: "shannon-tools",
      real_time_notifications: true,
      stealth_mode: false,
      continuous_scan: false,
      browser_testing: true,
      idor_testing: true,
      upload_testing: true,
    }),

  agents: z
    .object({
      shannon: z
        .object({
          model: z.string().default("anthropic/claude-sonnet-4-5"),
          temperature: z.number().min(0).max(1).default(0.1),
          max_output_tokens: z.number().default(64000),
        })
        .optional()
        .default({
          model: "anthropic/claude-sonnet-4-5",
          temperature: 0.1,
          max_output_tokens: 64000,
        }),
      "shannon-recon": z
        .object({
          model: z.string().default("xai/grok-code-fast-1"),
          temperature: z.number().min(0).max(1).default(0.1),
        })
        .optional()
        .default({
          model: "xai/grok-code-fast-1",
          temperature: 0.1,
        }),
      "shannon-exploit": z
        .object({
          model: z.string().default("openai/gpt-5.2-codex"),
          temperature: z.number().min(0).max(1).default(0.1),
        })
        .optional()
        .default({
          model: "openai/gpt-5.2-codex",
          temperature: 0.1,
        }),
      "shannon-report": z
        .object({
          model: z.string().default("anthropic/claude-sonnet-4-5"),
          temperature: z.number().min(0).max(1).default(0.2),
        })
        .optional()
        .default({
          model: "anthropic/claude-sonnet-4-5",
          temperature: 0.2,
        }),
    })
    .optional()
    .default({
      shannon: {
        model: "anthropic/claude-sonnet-4-5",
        temperature: 0.1,
        max_output_tokens: 64000,
      },
      "shannon-recon": {
        model: "xai/grok-code-fast-1",
        temperature: 0.1,
      },
      "shannon-exploit": {
        model: "openai/gpt-5.2-codex",
        temperature: 0.1,
      },
      "shannon-report": {
        model: "anthropic/claude-sonnet-4-5",
        temperature: 0.2,
      },
    }),

  disabled_hooks: z.array(z.string()).optional().default([]).describe("List of hook names to disable"),
})

export type ShannonConfig = z.infer<typeof ShannonConfigSchema>
