import type { PluginInput } from "@opencode-ai/plugin"
import type { ExecutorState } from "./types"

export function createShannonSessionManagerHook(_ctx: PluginInput) {
  const executorStates = new Map<string, ExecutorState>()

  const event = async (input: { event: { type: string; properties?: { sessionID?: string } } }) => {
    const { type, properties } = input.event

    if (type === "session.deleted" && properties?.sessionID) {
      const sessionID = properties.sessionID
      const state = executorStates.get(sessionID)

      if (state?.cleanup) {
        try {
          await state.cleanup()
        } catch (error) {
          console.error("[Shannon] Cleanup error:", error)
        }
      }

      executorStates.delete(sessionID)
    }

    if (type === "session.created" && properties?.sessionID) {
      const sessionID = properties.sessionID
      executorStates.set(sessionID, {
        sessionID,
        createdAt: Date.now(),
      })
    }
  }

  return {
    event,
  }
}
