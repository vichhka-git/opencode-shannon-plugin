export interface ShannonToolInput {
  target: string
  command?: string
  timeout?: number
}

export interface ShannonToolOutput {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}
