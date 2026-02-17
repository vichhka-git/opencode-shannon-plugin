import type { AuthSession, SessionCredentials } from "./types"

class SessionManager {
  private static instance: SessionManager
  private sessions: Map<string, AuthSession> = new Map()

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  createSession(
    target: string,
    type: "jwt" | "cookie" | "header",
    credentials: SessionCredentials,
    metadata?: Record<string, any>
  ): AuthSession {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: AuthSession = {
      id,
      target,
      type,
      credentials,
      created_at: Date.now(),
      last_used: Date.now(),
      metadata,
    }
    this.sessions.set(id, session)
    return session
  }

  getSession(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.last_used = Date.now()
    }
    return session
  }

  getAllSessions(): AuthSession[] {
    return Array.from(this.sessions.values())
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  clearAll(): void {
    this.sessions.clear()
  }

  buildAuthHeaders(sessionId: string): Record<string, string> {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const headers: Record<string, string> = {}

    if (session.type === "jwt" && session.credentials.jwt) {
      headers["Authorization"] = `Bearer ${session.credentials.jwt}`
    }

    if (session.type === "cookie" && session.credentials.cookies) {
      headers["Cookie"] = Object.entries(session.credentials.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
    }

    if (session.type === "header" && session.credentials.headers) {
      Object.assign(headers, session.credentials.headers)
    }

    return headers
  }
}

export const sessionManager = SessionManager.getInstance()
