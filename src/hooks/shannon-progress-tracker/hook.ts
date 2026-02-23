import type { PluginInput } from "@opencode-ai/plugin"
import { SHANNON_TOOLS, TOOL_PHASES, PROGRESS_PREFIX } from "./constants"
import type { ToolExecuteInput, ToolExecuteOutput, ProgressState } from "./types"

export function createShannonProgressTrackerHook(_ctx: PluginInput) {
  const sessionProgress = new Map<string, ProgressState>()

  function progressKey(sessionID: string, tool: string): string {
    return `${sessionID}:${tool}`
  }

  const toolExecuteBefore = async (
    input: ToolExecuteInput,
    _output: ToolExecuteOutput,
  ): Promise<void> => {
    const { tool, sessionID } = input

    if (!SHANNON_TOOLS.has(tool)) {
      return
    }

    const phase = TOOL_PHASES[tool] || "Unknown Phase"
    const state: ProgressState = {
      sessionID,
      tool,
      phase,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    }

    sessionProgress.set(progressKey(sessionID, tool), state)
  }

  const toolExecuteAfter = async (
    input: ToolExecuteInput,
    output: ToolExecuteOutput,
  ) => {
    const { tool, sessionID } = input

    if (!SHANNON_TOOLS.has(tool)) {
      return
    }

    const key = progressKey(sessionID, tool)
    const state = sessionProgress.get(key)
    if (!state) {
      return
    }

    const duration = Date.now() - state.startTime
    const durationSec = Math.floor(duration / 1000)

    output.output += `\n${PROGRESS_PREFIX}Phase "${state.phase}" completed in ${durationSec}s`

    output.instructions = output.instructions || []
    output.instructions.push(
      `TASK UPDATE: The security phase "${state.phase}" has completed. Update your todo list to reflect this progress.`
    )

    sessionProgress.delete(key)
  }

  const event = async (input: { event: { type: string; properties?: { sessionID?: string } } }) => {
    const { type, properties } = input.event

    if (type === "session.deleted" && properties?.sessionID) {
      for (const key of sessionProgress.keys()) {
        if (key.startsWith(`${properties.sessionID}:`)) {
          sessionProgress.delete(key)
        }
      }
    }
  }

  return {
    "tool.execute.before": toolExecuteBefore,
    "tool.execute.after": toolExecuteAfter,
    event,
  }
}
