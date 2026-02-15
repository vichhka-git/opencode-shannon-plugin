export interface ProgressState {
  sessionID: string
  tool: string
  phase?: string
  startTime: number
  lastUpdate: number
}

export interface ToolExecuteInput {
  tool: string
  sessionID: string
  callID: string
}

export interface ToolExecuteOutput {
  args: Record<string, unknown>
  title?: string
  output: string
  metadata?: unknown
}
