export interface ShannonIdorArgs {
  target: string
  command: string
  timeout?: number
}

export interface IdorAutoResult {
  endpoint: string
  method: string
  id_tested: number
  status_code: number
  response_size: number
  accessible: boolean
  body_snippet: string
}
