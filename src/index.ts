import type { Plugin, PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import pc from "picocolors"

import { loadPluginConfig } from "./config"
import { createShannonRecon } from "./tools/shannon-recon"
import { createShannonVulnDiscovery } from "./tools/shannon-vuln-discovery"
import { createShannonExploit } from "./tools/shannon-exploit"
import { createShannonReport } from "./tools/shannon-report"
import { createShannonBrowser } from "./tools/shannon-browser"
import { createShannonIdorTest } from "./tools/shannon-idor"
import { createShannonUploadTest } from "./tools/shannon-upload"
import { createShannonAuthSession } from "./tools/shannon-auth-session"
import { createShannonJsAnalyze } from "./tools/shannon-js-analyze"
import { createShannonRateLimitTest } from "./tools/shannon-rate-limit"
import { createShannonCrawler } from "./tools/shannon-crawler"
import { createShannonParamFuzz } from "./tools/shannon-param-fuzz"
import { createShannonTlsScan } from "./tools/shannon-tls-scan"
import { createShannonSubdomainTakeover } from "./tools/shannon-subdomain-takeover"
import { createShannonHeadersAudit } from "./tools/shannon-headers-audit"
import { createShannonApiFuzzer } from "./tools/shannon-api-fuzzer"
import {
  createShannonExec,
  createShannonDockerInit,
  createShannonDockerCleanup,
  createShannonFileExtract,
} from "./tools/shannon-docker"
import {
  createShannonAuthorizationValidatorHook,
  createShannonProgressTrackerHook,
  createShannonSessionManagerHook,
} from "./hooks"
import { SHANNON_SYSTEM_PROMPT } from "./system-prompt"

const KNOWN_SERVICE_PATTERN =
  /(?:Apache|Nginx|PHP|MySQL|MariaDB|OpenSSH|jQuery|Node\.js|Python|Ruby|Tomcat|IIS|WordPress|Drupal|Joomla|phpMyAdmin|GitLab|Jenkins|Grafana|Redis|MongoDB|PostgreSQL|Elasticsearch|RabbitMQ|Consul|Vault|MinIO|Keycloak|Strapi|Moodle|Express|Flask|Django|Spring|Rails|Laravel|Angular|React|Vue|Mailman|OJS|pgAdmin|CloudPanel|Portainer|Traefik|HAProxy)\/\d+\.\d+(\.\d+)?/gi

const HIGH_SEVERITY_PATTERN =
  /\b(critical|high)\b[^.]{0,80}\b(vulnerab|exploit|inject|bypass|compromise|unauthori|escalat|expos)/i

const ShannonPlugin: Plugin = async (ctx: PluginInput) => {
  console.log(pc.cyan("[ShannonPlugin] Loading Shannon pentest plugin..."))

  const config = loadPluginConfig(ctx.directory)
  console.log(pc.green("[ShannonPlugin] Config loaded successfully"))

  console.log(pc.cyan("[ShannonPlugin] Registering tools..."))
  const tools: Record<string, ToolDefinition> = {
    shannon_exec: createShannonExec(),
    shannon_docker_init: createShannonDockerInit(),
    shannon_docker_cleanup: createShannonDockerCleanup(),
    shannon_file_extract: createShannonFileExtract(),
    shannon_recon: createShannonRecon(),
    shannon_vuln_discovery: createShannonVulnDiscovery(),
    shannon_exploit: createShannonExploit(),
    shannon_report: createShannonReport(),
    shannon_auth_session: createShannonAuthSession(),
    shannon_js_analyze: createShannonJsAnalyze(),
    shannon_rate_limit_test: createShannonRateLimitTest(),
    shannon_crawler: createShannonCrawler(),
    shannon_param_fuzz: createShannonParamFuzz(),
    shannon_tls_scan: createShannonTlsScan(),
    shannon_subdomain_takeover: createShannonSubdomainTakeover(),
    shannon_headers_audit: createShannonHeadersAudit(),
    shannon_api_fuzzer: createShannonApiFuzzer(),
  }

  if (config.shannon.browser_testing !== false) {
    tools.shannon_browser = createShannonBrowser()
  }

  if (config.shannon.idor_testing !== false) {
    tools.shannon_idor_test = createShannonIdorTest()
  }

  if (config.shannon.upload_testing !== false) {
    tools.shannon_upload_test = createShannonUploadTest()
  }

  console.log(pc.cyan("[ShannonPlugin] Registering hooks..."))
  const authorizationValidator = createShannonAuthorizationValidatorHook(ctx, config)
  const progressTracker = createShannonProgressTrackerHook(ctx)
  const sessionManager = createShannonSessionManagerHook(ctx)

  console.log(pc.green("[ShannonPlugin] Shannon plugin loaded successfully"))
  console.log(pc.dim(`  - Authorization required: ${config.shannon.require_authorization}`))
  console.log(pc.dim(`  - Docker image: ${config.shannon.docker_image}`))
  console.log(pc.dim(`  - Tools registered: ${Object.keys(tools).length}`))
  console.log(pc.dim(`  - Hooks registered: 4 (authorization, progress, session, system-prompt)`))

  return {
    tool: tools,
    "tool.execute.before": async (input: any, output: any) => {
      await authorizationValidator["tool.execute.before"]?.(input, output)
      await progressTracker["tool.execute.before"]?.(input, output)
    },
    "tool.execute.after": async (input: any, output: any) => {
      await progressTracker["tool.execute.after"]?.(input, output)

      if (input.name === "shannon_vuln_discovery" || input.name === "shannon_js_analyze") {
        const outputText = typeof output.result === "string" ? output.result : JSON.stringify(output.result)

        if (HIGH_SEVERITY_PATTERN.test(outputText)) {
          console.log(pc.yellow(`[ShannonPlugin] High-severity finding detected in ${input.name}. Escalating...`))
          output.instructions = output.instructions || []
          output.instructions.push(
            "CRITICAL: A high-severity vulnerability has been detected. You should now consult the Oracle agent for a deep white-box architectural review and an exploitation strategy before proceeding."
          )
        }
      }

      if (input.name === "shannon_recon") {
        const outputText = typeof output.result === "string" ? output.result : JSON.stringify(output.result)
        const versionMatch = outputText.match(KNOWN_SERVICE_PATTERN)

        if (versionMatch && versionMatch.length > 0) {
          const targets = [...new Set(versionMatch)].join(", ")
          console.log(pc.yellow(`[ShannonPlugin] Service versions detected: ${targets}. Suggesting Librarian research...`))
          output.instructions = output.instructions || []
          output.instructions.push(
            `RECON COMPLETE: Specific service versions were detected: ${targets}. You should now delegate to the Librarian agent to search for known CVEs and exploit payloads for these versions.`
          )
        }
      }
    },
    event: async (input: any) => {
      await progressTracker.event?.(input)
      await sessionManager.event?.(input)
    },
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(SHANNON_SYSTEM_PROMPT)
    },
  }
}

export default ShannonPlugin

export type { ShannonConfig } from "./config/schema"
