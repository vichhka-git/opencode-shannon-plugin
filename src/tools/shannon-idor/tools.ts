import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_IDOR_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const IDOR_SCRIPT_PATH = "/workspace/.shannon-idor-auto.py"

export function createShannonIdorTest(): ToolDefinition {
  return tool({
    description: SHANNON_IDOR_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Base URL of the target (e.g., https://example.com)"),
      command: tool.schema
        .string()
        .describe(
          "IDOR test command — typically a curl command or Python script that tests cross-user resource access. " +
            "Example: curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer TOKEN_A' https://target/api/Users/2"
        ),
      mode: tool.schema
        .enum(["manual", "auto"])
        .optional()
        .describe(
          "Test mode: manual (run a specific command) or auto (auto-discover and test endpoints). Default: manual"
        ),
      auth_token: tool.schema
        .string()
        .optional()
        .describe(
          "Auth token for auto mode (e.g., 'Bearer eyJ...'). Used to test authenticated cross-user access."
        ),
      endpoints: tool.schema
        .string()
        .optional()
        .describe(
          'JSON array of endpoints to test in auto mode. Format: [{"method":"GET","path":"/api/Users/{id}","ids":[1,2,3]}]. ' +
            "If omitted, common REST patterns are tested automatically."
        ),
      own_user_id: tool.schema
        .number()
        .optional()
        .describe(
          "Your authenticated user's ID (auto mode). IDs different from this are tested as cross-user access."
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 300000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      const mode = args.mode ?? "manual"

      if (mode === "manual") {
        const result = await docker.exec(args.command, args.timeout)

        const output = [
          `## IDOR Test Output`,
          `**Target**: ${args.target}`,
          `**Command**: \`${args.command}\``,
          `**Exit Code**: ${result.exitCode}`,
          `**Duration**: ${result.duration}ms`,
          "",
        ]

        if (result.stdout) {
          output.push("### stdout", "```", result.stdout.trim(), "```", "")
        }

        if (result.stderr) {
          output.push("### stderr", "```", result.stderr.trim(), "```", "")
        }

        return output.join("\n")
      }

      await ensureIdorScriptInstalled(docker)

      const params: Record<string, unknown> = {
        target: args.target,
        auth_token: args.auth_token ?? "",
        own_user_id: args.own_user_id ?? 1,
      }

      if (args.endpoints) {
        try {
          params.endpoints = JSON.parse(args.endpoints)
        } catch {
          return "ERROR: Invalid JSON for endpoints parameter"
        }
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${IDOR_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 300000)

      if (result.exitCode !== 0) {
        return [
          `## IDOR Auto-Discovery Failed`,
          `**Target**: ${args.target}`,
          `**Exit Code**: ${result.exitCode}`,
          "",
          "### stderr",
          "```",
          result.stderr?.trim() || "No error output",
          "```",
        ].join("\n")
      }

      try {
        const parsed = JSON.parse(result.stdout)
        return formatAutoResults(args.target, parsed)
      } catch {
        return [
          `## IDOR Auto-Discovery: ${args.target}`,
          "",
          "### Raw Output",
          "```",
          result.stdout?.trim() || "No output",
          "```",
        ].join("\n")
      }
    },
  })
}

function formatAutoResults(
  target: string,
  data: Record<string, unknown>
): string {
  const output: string[] = []
  output.push(`## IDOR Auto-Discovery Results`)
  output.push(`**Target**: ${target}`)
  output.push("")

  const results = data.results as Array<Record<string, unknown>> | undefined
  const summary = data.summary as Record<string, unknown> | undefined

  if (summary) {
    output.push(`### Summary`)
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Endpoints Tested | ${summary.endpoints_tested} |`)
    output.push(`| Total Requests | ${summary.total_requests} |`)
    output.push(`| Accessible (potential IDOR) | ${summary.accessible} |`)
    output.push(`| Blocked (proper auth) | ${summary.blocked} |`)
    output.push(`| Errors | ${summary.errors} |`)
    output.push("")
  }

  if (results && results.length > 0) {
    const vulnerable = results.filter((r) => r.accessible)
    const blocked = results.filter((r) => !r.accessible)

    if (vulnerable.length > 0) {
      output.push(`### \u274c Potentially Vulnerable Endpoints (${vulnerable.length})`)
      output.push("")
      for (const r of vulnerable) {
        output.push(
          `- **${r.method} ${r.endpoint}** (ID: ${r.id_tested}) \u2192 Status: ${r.status_code}, Size: ${r.response_size} bytes`
        )
        if (r.body_snippet) {
          output.push(`  \`\`\``)
          output.push(`  ${String(r.body_snippet).slice(0, 200)}`)
          output.push(`  \`\`\``)
        }
      }
      output.push("")
    }

    if (blocked.length > 0) {
      output.push(`### \u2705 Properly Protected Endpoints (${blocked.length})`)
      for (const r of blocked.slice(0, 20)) {
        output.push(
          `- ${r.method} ${r.endpoint} (ID: ${r.id_tested}) \u2192 Status: ${r.status_code}`
        )
      }
      if (blocked.length > 20) {
        output.push(`- *... and ${blocked.length - 20} more*`)
      }
      output.push("")
    }
  }

  return output.join("\n")
}

async function ensureIdorScriptInstalled(
  docker: DockerManager
): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${IDOR_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getIdorAutoScript()
  await docker.exec(
    `cat > ${IDOR_SCRIPT_PATH} << 'IDOR_EOF'\n${script}\nIDOR_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${IDOR_SCRIPT_PATH}`, 5000)
}

function getIdorAutoScript(): string {
  return `#!/usr/bin/env python3
"""Shannon IDOR Auto-Discovery"""
import sys, json
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DEFAULT_ENDPOINTS = [
    {"method": "GET", "path": "/api/Users/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/users/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/Baskets/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/baskets/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/Orders/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/orders/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/Feedbacks/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/feedbacks/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/Products/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/products/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/api/Cards/{id}", "ids": list(range(1, 6))},
    {"method": "GET", "path": "/api/Addresses/{id}", "ids": list(range(1, 6))},
    {"method": "GET", "path": "/api/BasketItems/{id}", "ids": list(range(1, 11))},
    {"method": "GET", "path": "/rest/user/{id}", "ids": list(range(1, 6))},
    {"method": "GET", "path": "/api/Complaints/{id}", "ids": list(range(1, 6))},
    {"method": "GET", "path": "/api/Recycles/{id}", "ids": list(range(1, 6))},
    {"method": "GET", "path": "/api/memories/{id}", "ids": list(range(1, 6))},
]

def test_endpoint(base_url, method, path, eid, headers):
    url = base_url.rstrip("/") + path.replace("{id}", str(eid))
    try:
        r = requests.request(method, url, headers=headers, timeout=15, verify=False)
        body = r.text[:200] if r.text else ""
        accessible = 200 <= r.status_code < 300
        return {
            "endpoint": path,
            "method": method,
            "id_tested": eid,
            "status_code": r.status_code,
            "response_size": len(r.text) if r.text else 0,
            "accessible": accessible,
            "body_snippet": body,
        }
    except Exception as e:
        return {
            "endpoint": path,
            "method": method,
            "id_tested": eid,
            "status_code": 0,
            "response_size": 0,
            "accessible": False,
            "body_snippet": str(e)[:100],
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: script.py '<json_params>'"}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    target = params["target"]
    auth_token = params.get("auth_token", "")
    own_id = params.get("own_user_id", 1)
    endpoints = params.get("endpoints", DEFAULT_ENDPOINTS)
    headers = {"Content-Type": "application/json"}
    if auth_token:
        if not auth_token.startswith("Bearer "):
            auth_token = "Bearer " + auth_token
        headers["Authorization"] = auth_token
    results = []
    for ep in endpoints:
        method = ep.get("method", "GET")
        path = ep["path"]
        ids = ep.get("ids", list(range(1, 6)))
        test_ids = [i for i in ids if i != own_id]
        for eid in test_ids:
            r = test_endpoint(target, method, path, eid, headers)
            results.append(r)
    accessible = sum(1 for r in results if r["accessible"])
    blocked = sum(1 for r in results if not r["accessible"] and r["status_code"] != 0)
    errors = sum(1 for r in results if r["status_code"] == 0)
    print(json.dumps({
        "results": results,
        "summary": {
            "endpoints_tested": len(endpoints),
            "total_requests": len(results),
            "accessible": accessible,
            "blocked": blocked,
            "errors": errors,
        }
    }, indent=2))

if __name__ == "__main__":
    main()
`
}
