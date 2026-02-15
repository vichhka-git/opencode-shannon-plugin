export interface ExecutorState {
  sessionID: string
  cleanup?: () => Promise<void>
  createdAt: number
}
