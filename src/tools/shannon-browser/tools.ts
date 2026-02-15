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

      const escaped = wrappedScript
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "'\"'\"'")

      const command = `python3 -c '${escaped}'`
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
  return `
import asyncio
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

asyncio.run(run())
`
}

function indentScript(script: string, spaces: number): string {
  const indent = " ".repeat(spaces)
  return script
    .split("\n")
    .map((line) => (line.trim() ? indent + line : ""))
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
