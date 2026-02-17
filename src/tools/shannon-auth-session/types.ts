import type { SessionType } from "./constants"

export interface AuthSession {
  id: string
  target: string
  type: SessionType
  credentials: SessionCredentials
  created_at: number
  last_used: number
  metadata?: Record<string, any>
}

export interface SessionCredentials {
  jwt?: string
  cookies?: Record<string, string>
  headers?: Record<string, string>
}

export interface CreateSessionArgs {
  target: string
  login_endpoint?: string
  credentials?: {
    email?: string
    username?: string
    password?: string
  }
  session_type: SessionType
  custom_headers?: Record<string, string>
  verify_ssl?: boolean
}

export interface GetSessionArgs {
  session_id: string
}

export interface RefreshSessionArgs {
  session_id: string
  refresh_endpoint?: string
}
