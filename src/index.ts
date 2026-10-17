import { Plugin } from "@opencode/plugin"
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

const KNOWN_SERVICE_PATTERN =
  /(?:Apache|Nginx|PHP|MySQL|MariaDB|OpenSSH|jQuery|Node\.js|Python|Ruby|Tomcat|IIS|WordPress|Drupal|Joomla|phpMyAdmin|GitLab|Jenkins|Grafana|Redis|MongoDB|PostgreSQL|Elasticsearch|RabbitMQ|Consul|Vault|MinIO|Keycloak|Strapi|Moodle|Express|Flask|Django|Spring|Rails|Laravel|Angular|React|Vue|Mailman|OJS|pgAdmin|CloudPanel|Portainer|Traefik|HAProxy)\/\d+\.\d+(\.\d+)?/gi

const HIGH_SEVERITY_PATTERN =
  /\b(critical|high)\b[^.]{0,80}\b(vulnerab|exploit|inject|bypass|compromise|unauthori|escalat|expos)/i

export default Plugin.define({
  id: "shannon",
  async setup(ctx) {
    console.log(pc.cyan("[ShannonPlugin] Loading Shannon pentest plugin..."))

    const workDir = (ctx.location as any)?.path ?? process.cwd()
    const config = loadPluginConfig(workDir)
    console.log(pc.green("[ShannonPlugin] Config loaded successfully"))

    console.log(pc.cyan("[ShannonPlugin] Registering tools..."))
    const toolsMap: Record<string, any> = {
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
      toolsMap.shannon_browser = createShannonBrowser()
    }

    if (config.shannon.idor_testing !== false) {
      toolsMap.shannon_idor_test = createShannonIdorTest()
    }

    if (config.shannon.upload_testing !== false) {
      toolsMap.shannon_upload_test = createShannonUploadTest()
    }

    ctx.tool.transform((editor) => {
      for (const [name, def] of Object.entries(toolsMap)) {
        editor.add({
          name,
          description: def.description,
          input: def.input,
          execute: def.execute,
        })
      }
    })

    console.log(pc.cyan("[ShannonPlugin] Registering hooks..."))
    const authorizationValidator = createShannonAuthorizationValidatorHook(ctx, config)
    const progressTracker = createShannonProgressTrackerHook(ctx)
    const sessionManager = createShannonSessionManagerHook(ctx)

    ctx.tool.hook("execute.before", async (event: any) => {
      const legacyInput = { tool: event.tool, name: event.tool, args: event.input, sessionID: event.sessionID, callID: event.id }
      await (authorizationValidator as any)["tool.execute.before"]?.(legacyInput)
      await (progressTracker as any)["tool.execute.before"]?.(legacyInput)
    })

    ctx.tool.hook("execute.after", async (event: any) => {
      if (event.status !== "completed") return
      const legacyInput = { tool: event.tool, name: event.tool, args: event.input, sessionID: event.sessionID, callID: event.id }
      const outputVal = event.result?.content || event.result?.output || ""
      const legacyOutput = { result: outputVal }
      await (progressTracker as any)["tool.execute.after"]?.(legacyInput, legacyOutput)

      if (event.tool === "shannon_vuln_discovery" || event.tool === "shannon_js_analyze") {
        const outputText = typeof outputVal === "string" ? outputVal : JSON.stringify(outputVal)

        if (HIGH_SEVERITY_PATTERN.test(outputText)) {
          console.log(pc.yellow(`[ShannonPlugin] High-severity finding detected in ${event.tool}. Escalating...`))
        }
      }

      if (event.tool === "shannon_recon") {
        const outputText = typeof outputVal === "string" ? outputVal : JSON.stringify(outputVal)
        const versionMatch = outputText.match(KNOWN_SERVICE_PATTERN)

        if (versionMatch && versionMatch.length > 0) {
          const targets = [...new Set(versionMatch)].join(", ")
          console.log(pc.yellow(`[ShannonPlugin] Service versions detected: ${targets}. Suggesting Librarian research...`))
        }
      }
    })

    if (typeof (ctx.event as any)?.subscribe === "function") {
      (ctx.event as any).subscribe(async (event: any) => {
        await progressTracker.event?.({ event })
        await sessionManager.event?.({ event })
      })
    }

    console.log(pc.green("[ShannonPlugin] Shannon plugin loaded successfully"))
    console.log(pc.dim(`  - Authorization required: ${config.shannon.require_authorization}`))
    console.log(pc.dim(`  - Docker image: ${config.shannon.docker_image}`))
    console.log(pc.dim(`  - Tools registered: ${Object.keys(toolsMap).length}`))
    console.log(pc.dim(`  - Hooks registered: authorization, progress, session`))
  },
})

export type { ShannonConfig } from "./config/schema"
