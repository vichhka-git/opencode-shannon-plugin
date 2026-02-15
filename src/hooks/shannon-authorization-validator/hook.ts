import type { PluginInput } from "@opencode-ai/plugin"
import { EXPLOIT_TOOLS, AUTHORIZATION_WARNING, AUTHORIZATION_KEY } from "./constants"
import type { ToolExecuteInput, ToolExecuteOutput } from "./types"
import type { ShannonConfig } from "../../config/schema"

export function createShannonAuthorizationValidatorHook(_ctx: PluginInput, config: ShannonConfig) {
  const toolExecuteBefore = async (
    input: ToolExecuteInput,
    output: ToolExecuteOutput,
  ): Promise<void> => {
    // Check if authorization is required
    const requireAuth = config.shannon?.require_authorization ?? true

    // If authorization is disabled, allow all tools
    if (!requireAuth) {
      return
    }

    const toolName = input.tool

    if (!EXPLOIT_TOOLS.has(toolName)) {
      return
    }

    const authorization = output.args[AUTHORIZATION_KEY]

    if (!authorization || typeof authorization !== "string" || authorization.trim() === "") {
      throw new Error(AUTHORIZATION_WARNING)
    }
  }

  return {
    "tool.execute.before": toolExecuteBefore,
  }
}
