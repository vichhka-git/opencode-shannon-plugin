import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_BROWSER_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

export function createShannonBrowser(): ToolDefinition {
  return tool({
    description: SHANNON_BROWSER_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target URL to test (e.g., https://example.com)"),
      script: tool.schema
        .string()
        .describe(
          "Python/Playwright script to execute. Has access to 'page' (Playwright Page), 'context' (BrowserContext), and 'browser' objects. Use print() for output."
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 60000 = 1 minute)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      const wrappedScript = buildPlaywrightScript(args.script)

      // Use heredoc to pass Python code — no escaping needed.
      // The base64-encoding in docker.exec() handles shell transport safely.
      const command = `python3 << 'SHANNON_PYEOF'\n${wrappedScript}\nSHANNON_PYEOF`
      const result = await docker.exec(command, args.timeout ?? 60000)

      const output = [
        `## Browser Testing Output`,
        `**Target**: ${args.target}`,
        `**Exit Code**: ${result.exitCode}`,
        `**Duration**: ${result.duration}ms`,
        "",
      ]

      if (result.stdout) {
        output.push("### stdout", "```", result.stdout.trim(), "```", "")
      }

      if (result.stderr) {
        const filteredStderr = filterPlaywrightNoise(result.stderr)
        if (filteredStderr) {
          output.push("### stderr", "```", filteredStderr, "```", "")
        }
      }

      return output.join("\n")
    },
  })
}

function buildPlaywrightScript(userScript: string): string {
  return `import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        try:
${indentScript(userScript, 12)}
        except Exception as e:
            print(f"ERROR: {e}")
        finally:
            await browser.close()

asyncio.run(run())`
}

/**
 * Indent a user script while preserving its relative indentation.
 * Finds the minimum leading whitespace across non-empty lines,
 * strips that common prefix, then re-indents to the target level.
 */
function indentScript(script: string, spaces: number): string {
  const indent = " ".repeat(spaces)
  const lines = script.split("\n")

  // Find minimum indentation of non-empty lines
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  if (nonEmptyLines.length === 0) return ""

  const minIndent = nonEmptyLines.reduce((min, line) => {
    const match = line.match(/^(\s*)/)
    const leading = match?.[1]?.length ?? 0
    return Math.min(min, leading)
  }, Infinity)

  const strip = minIndent === Infinity ? 0 : minIndent

  return lines
    .map((line) => {
      if (!line.trim()) return ""
      // Preserve relative indentation: strip common prefix, add target indent
      return indent + line.slice(strip)
    })
    .join("\n")
}

function filterPlaywrightNoise(stderr: string): string {
  return stderr
    .split("\n")
    .filter(
      (line) =>
        !line.includes("Gtk-WARNING") &&
        !line.includes("dbus") &&
        !line.includes("Fontconfig") &&
        line.trim() !== ""
    )
    .join("\n")
    .trim()
}
