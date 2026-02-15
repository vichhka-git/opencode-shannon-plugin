export interface AuthorizationState {
  sessionID: string
  hasAuthorization: boolean
  target?: string
  scope?: string
  timestamp: number
}

export interface ToolExecuteInput {
  tool: string
  sessionID: string
  callID: string
}

export interface ToolExecuteOutput {
  args: Record<string, unknown>
  title?: string
  output?: string
  metadata?: unknown
}
