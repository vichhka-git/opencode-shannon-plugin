import type { Plugin, PluginInput } from "@opencode-ai/plugin"
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
import { createShannonCorrelateFindings } from "./tools/shannon-correlate"
import {
  createShannonExec,
  createShannonDockerInit,
  createShannonDockerCleanup,
} from "./tools/shannon-docker"
import {
  createShannonAuthorizationValidatorHook,
  createShannonProgressTrackerHook,
  createShannonSessionManagerHook,
} from "./hooks"
import { SHANNON_SYSTEM_PROMPT } from "./system-prompt"

const ShannonPlugin: Plugin = async (ctx: PluginInput) => {
  console.log(pc.cyan("[ShannonPlugin] Loading Shannon pentest plugin..."))

  const config = loadPluginConfig(ctx.directory)
  console.log(pc.green("[ShannonPlugin] Config loaded successfully"))

  console.log(pc.cyan("[ShannonPlugin] Registering tools..."))
  const tools: Record<string, ReturnType<typeof createShannonExec>> = {
    shannon_exec: createShannonExec(),
    shannon_docker_init: createShannonDockerInit(),
    shannon_docker_cleanup: createShannonDockerCleanup(),
    shannon_recon: createShannonRecon(),
    shannon_vuln_discovery: createShannonVulnDiscovery(),
    shannon_exploit: createShannonExploit(),
    shannon_report: createShannonReport(),
    shannon_auth_session: createShannonAuthSession(),
    shannon_js_analyze: createShannonJsAnalyze(),
    shannon_rate_limit_test: createShannonRateLimitTest(),
    shannon_correlate_findings: createShannonCorrelateFindings(),
  }

  if (config.shannon.browser_testing) {
    tools.shannon_browser = createShannonBrowser()
  }

  if (config.shannon.idor_testing) {
    tools.shannon_idor_test = createShannonIdorTest()
  }

  if (config.shannon.upload_testing) {
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
