import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_AUTH_SESSION_DESCRIPTION, SESSION_TYPES } from "./constants"
import { DockerManager } from "../../docker"
import { sessionManager } from "./session-manager"
import type {
  CreateSessionArgs,
  GetSessionArgs,
  RefreshSessionArgs,
} from "./types"

export function createShannonAuthSession(): ToolDefinition {
  return tool({
    description: SHANNON_AUTH_SESSION_DESCRIPTION,
    args: {
      action: tool.schema
        .enum(["create", "get", "list", "delete", "build_headers"])
        .describe(
          "Action to perform: create (new session), get (retrieve session), list (all sessions), delete (remove session), build_headers (generate auth headers)"
        ),
      target: tool.schema
        .string()
        .optional()
        .describe("Target URL (required for 'create' action)"),
      login_endpoint: tool.schema
        .string()
        .optional()
        .describe(
          "Login endpoint path (e.g., /api/login) - only for automated login"
        ),
      credentials: tool.schema
        .object({
          email: tool.schema.string().optional(),
          username: tool.schema.string().optional(),
          password: tool.schema.string().optional(),
        })
        .optional()
        .describe(
          "Login credentials for automated authentication (email/username + password)"
        ),
      session_type: tool.schema
        .enum(SESSION_TYPES)
        .optional()
        .describe(
          "Type of session: jwt (Bearer token), cookie (session cookies), header (custom headers)"
        ),
      session_id: tool.schema
        .string()
        .optional()
        .describe(
          "Session ID (required for get, delete, build_headers actions)"
        ),
      manual_credentials: tool.schema
        .object({
          jwt: tool.schema.string().optional(),
          cookies: tool.schema
            .record(tool.schema.string(), tool.schema.string())
            .optional(),
          headers: tool.schema
            .record(tool.schema.string(), tool.schema.string())
            .optional(),
        })
        .optional()
        .describe(
          "Manually provide auth credentials (alternative to automated login)"
        ),
      verify_ssl: tool.schema
        .boolean()
        .optional()
        .describe("Verify SSL certificates (default: true)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()

      switch (args.action) {
        case "create": {
          if (!args.target) {
            return "ERROR: 'target' is required for create action"
          }
          if (!args.session_type) {
            return "ERROR: 'session_type' is required for create action"
          }

          // If manual credentials provided, use them directly
          if (args.manual_credentials) {
            const session = sessionManager.createSession(
              args.target,
              args.session_type,
              args.manual_credentials,
              { manual: true }
            )
            return formatSessionResponse(session, "Session created (manual)")
          }

          // Otherwise, perform automated login
          if (!args.login_endpoint || !args.credentials) {
            return "ERROR: Either 'manual_credentials' OR ('login_endpoint' + 'credentials') required"
          }

          await docker.ensureRunning()

          const loginUrl = new URL(args.login_endpoint, args.target).href
          const loginData = JSON.stringify(args.credentials)
          const verifySsl = args.verify_ssl === false ? "-k" : ""

          const curlCmd = `curl -s -X POST ${verifySsl} "${loginUrl}" \\
            -H "Content-Type: application/json" \\
            -d '${loginData}' \\
            -i`

          const result = await docker.exec(curlCmd, 30000)

          if (result.exitCode !== 0) {
            return `ERROR: Login failed\\nstderr: ${result.stderr}\\nstdout: ${result.stdout}`
          }

          // Parse response for JWT or cookies
          const credentials = parseLoginResponse(
            result.stdout,
            args.session_type
          )

          if (!credentials) {
            return `ERROR: Could not extract ${args.session_type} credentials from response\\n\\nResponse:\\n${result.stdout}`
          }

          const session = sessionManager.createSession(
            args.target,
            args.session_type,
            credentials,
            {
              automated: true,
              login_endpoint: args.login_endpoint,
              user: args.credentials.email || args.credentials.username,
            }
          )

          return formatSessionResponse(
            session,
            "Session created (automated login)"
          )
        }

        case "get": {
          if (!args.session_id) {
            return "ERROR: 'session_id' is required for get action"
          }
          const session = sessionManager.getSession(args.session_id)
          if (!session) {
            return `ERROR: Session ${args.session_id} not found`
          }
          return formatSessionResponse(session, "Session retrieved")
        }

        case "list": {
          const sessions = sessionManager.getAllSessions()
          if (sessions.length === 0) {
            return "No active sessions"
          }
          return (
            "## Active Sessions\\n\\n" +
            sessions
              .map(
                (s) =>
                  `- **${s.id}**\\n  - Target: ${s.target}\\n  - Type: ${s.type}\\n  - Created: ${new Date(s.created_at).toISOString()}\\n  - Last used: ${new Date(s.last_used).toISOString()}`
              )
              .join("\\n\\n")
          )
        }

        case "delete": {
          if (!args.session_id) {
            return "ERROR: 'session_id' is required for delete action"
          }
          const deleted = sessionManager.deleteSession(args.session_id)
          return deleted
            ? `Session ${args.session_id} deleted`
            : `ERROR: Session ${args.session_id} not found`
        }

        case "build_headers": {
          if (!args.session_id) {
            return "ERROR: 'session_id' is required for build_headers action"
          }
          try {
            const headers = sessionManager.buildAuthHeaders(args.session_id)
            return (
              `## Auth Headers for ${args.session_id}\\n\\n` +
              "```json\\n" +
              JSON.stringify(headers, null, 2) +
              "\\n```\\n\\n" +
              "**Usage**: Include these headers in curl/sqlmap/nuclei commands"
            )
          } catch (error) {
            return `ERROR: ${error instanceof Error ? error.message : String(error)}`
          }
        }

        default:
          return `ERROR: Unknown action: ${args.action}`
      }
    },
  })
}

function parseLoginResponse(
  response: string,
  sessionType: "jwt" | "cookie" | "header"
): { jwt?: string; cookies?: Record<string, string> } | null {
  const lines = response.split("\\n")

  if (sessionType === "jwt") {
    // Look for JWT in response body (JSON)
    const bodyStartIndex = lines.findIndex((l) => l.trim() === "")
    if (bodyStartIndex === -1) return null

    const body = lines.slice(bodyStartIndex + 1).join("\\n")
    try {
      const json = JSON.parse(body)
      // Common JWT response fields
      const token =
        json.token || json.access_token || json.accessToken || json.jwt
      if (token) {
        return { jwt: token }
      }
    } catch {
      // Not JSON or no token field
    }
  }

  if (sessionType === "cookie") {
    // Extract Set-Cookie headers
    const cookies: Record<string, string> = {}
    for (const line of lines) {
      if (line.toLowerCase().startsWith("set-cookie:")) {
        const cookieStr = line.substring("set-cookie:".length).trim()
        const [nameValue] = cookieStr.split(";")
        if (!nameValue) continue
        const [name, value] = nameValue.split("=")
        if (name && value) {
          cookies[name.trim()] = value.trim()
        }
      }
    }
    if (Object.keys(cookies).length > 0) {
      return { cookies }
    }
  }

  return null
}

function formatSessionResponse(session: any, title: string): string {
  return `## ${title}

**Session ID**: ${session.id}
**Target**: ${session.target}
**Type**: ${session.type}
**Created**: ${new Date(session.created_at).toISOString()}

### Credentials
\`\`\`json
${JSON.stringify(session.credentials, null, 2)}
\`\`\`

### Usage
Use this session ID with other Shannon tools:
- IDOR testing: Pass session_id to shannon_idor_test
- Manual injection: Use build_headers action to get auth headers for curl/sqlmap`
}
