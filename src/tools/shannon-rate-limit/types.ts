export interface RateLimitResult {
  total_requests: number
  successful: number
  blocked: number
  errors: number
  status_codes: Record<string, number>
  avg_response_ms: number
  min_response_ms: number
  max_response_ms: number
  rate_limited: boolean
  lockout_detected: boolean
  timing_diff_ms?: number
}

export interface TimingResult {
  valid_avg_ms: number
  invalid_avg_ms: number
  diff_ms: number
  timing_leak: boolean
  samples: number
}

export interface RaceResult {
  total_sent: number
  successful: number
  duplicates_detected: boolean
  responses: Array<{
    status: number
    body_snippet: string
    time_ms: number
  }>
}
