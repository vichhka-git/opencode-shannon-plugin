import * as fs from "fs"
import * as path from "path"
import { parse as parseJsonc } from "jsonc-parser"
import type { ShannonConfig } from "./schema"
import { ShannonConfigSchema } from "./schema"

function getOpenCodeConfigDir(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || "~", ".config", "opencode")
}

function parseJsoncFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return parseJsonc(content) as Record<string, unknown>
  } catch {
    return null
  }
}

function detectConfigFile(basePath: string): { path: string; format: "json" | "jsonc" | "none" } {
  if (fs.existsSync(`${basePath}.jsonc`)) {
    return { path: `${basePath}.jsonc`, format: "jsonc" }
  }
  if (fs.existsSync(`${basePath}.json`)) {
    return { path: `${basePath}.json`, format: "json" }
  }
  return { path: basePath, format: "none" }
}

function deepMerge<T extends Record<string, any>>(base: T | undefined, override: T | undefined): T {
  if (!base) return (override || {}) as T
  if (!override) return base

  const result = { ...base }

  for (const key in override) {
    const baseValue = base[key]
    const overrideValue = override[key]

    if (
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = deepMerge(baseValue, overrideValue)
    } else {
      result[key] = overrideValue
    }
  }

  return result as T
}

function loadConfigFromPath(configPath: string): ShannonConfig | null {
  if (!fs.existsSync(configPath)) {
    return null
  }

  const rawConfig = parseJsoncFile(configPath)
  if (!rawConfig) {
    return null
  }

  const result = ShannonConfigSchema.safeParse(rawConfig)

  if (result.success) {
    return result.data
  }

  console.warn(`[Shannon] Config validation error in ${configPath}:`, result.error.issues)
  return null
}

export function loadPluginConfig(directory: string): ShannonConfig {
  const configDir = getOpenCodeConfigDir()

  const userBasePath = path.join(configDir, "shannon-plugin")
  const userDetected = detectConfigFile(userBasePath)
  const userConfigPath = userDetected.format !== "none" ? userDetected.path : null

  const projectBasePath = path.join(directory, ".opencode", "shannon-plugin")
  const projectDetected = detectConfigFile(projectBasePath)
  const projectConfigPath = projectDetected.format !== "none" ? projectDetected.path : null

  let config: ShannonConfig | null = userConfigPath ? loadConfigFromPath(userConfigPath) : null

  const projectConfig = projectConfigPath ? loadConfigFromPath(projectConfigPath) : null
  if (projectConfig) {
    if (config) {
      config = {
        shannon: deepMerge(config.shannon, projectConfig.shannon),
        agents: deepMerge(config.agents, projectConfig.agents),
        disabled_hooks: [
          ...(config.disabled_hooks || []),
          ...(projectConfig.disabled_hooks || []),
        ],
      }
    } else {
      config = projectConfig
    }
  }

  return config || ShannonConfigSchema.parse({})
}
