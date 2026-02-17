import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_RATE_LIMIT_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const RATE_LIMIT_SCRIPT_PATH = "/workspace/.shannon-rate-limit.py"

export function createShannonRateLimitTest(): ToolDefinition {
  return tool({
    description: SHANNON_RATE_LIMIT_DESCRIPTION,
    args: {
      action: tool.schema
        .enum(["burst", "timing", "race"])
        .describe(
          "Test mode: burst (rapid requests), timing (response time comparison), race (concurrent requests)"
        ),
      target: tool.schema
        .string()
        .describe("Target endpoint URL (e.g., https://example.com/api/login)"),
      method: tool.schema
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
        .optional()
        .describe("HTTP method (default: POST)"),
      headers: tool.schema
        .string()
        .optional()
        .describe(
          'JSON string of headers (e.g., \'{"Authorization":"Bearer token","Content-Type":"application/json"}\')'
        ),
      body: tool.schema
        .string()
        .optional()
        .describe(
          "Request body (JSON string for POST/PUT/PATCH requests)"
        ),
      requests: tool.schema
        .number()
        .optional()
        .describe(
          "Number of requests to send for burst mode (default: 30)"
        ),
      concurrent: tool.schema
        .number()
        .optional()
        .describe(
          "Number of concurrent requests for race mode (default: 10)"
        ),
      valid_input: tool.schema
        .string()
        .optional()
        .describe(
          "Valid input body for timing comparison (e.g., existing username)"
        ),
      invalid_input: tool.schema
        .string()
        .optional()
        .describe(
          "Invalid input body for timing comparison (e.g., non-existent username)"
        ),
      delay_ms: tool.schema
        .number()
        .optional()
        .describe(
          "Delay between requests in ms for burst mode (default: 0 = no delay)"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 120000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureScriptInstalled(docker)

      const timeout = args.timeout ?? 120000
      const params: Record<string, string | number | boolean> = {
        action: args.action,
        target: args.target,
      }

      if (args.method) params.method = args.method
      if (args.body) params.body = args.body
      if (args.headers) params.headers = args.headers
      if (args.requests) params.requests = args.requests
      if (args.concurrent) params.concurrent = args.concurrent
      if (args.valid_input) params.valid_input = args.valid_input
      if (args.invalid_input) params.invalid_input = args.invalid_input
      if (args.delay_ms) params.delay_ms = args.delay_ms

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${RATE_LIMIT_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, timeout)

      if (result.exitCode !== 0) {
        return [
          `## Rate Limit Test Failed`,
          `**Target**: ${args.target}`,
          `**Action**: ${args.action}`,
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
        return formatResults(args.action, args.target, parsed)
      } catch {
        return [
          `## Rate Limit Test: ${args.target}`,
          `**Action**: ${args.action}`,
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

function formatResults(
  action: string,
  target: string,
  data: Record<string, unknown>
): string {
  const output: string[] = []
  output.push(`## Rate Limit Test Results`)
  output.push(`**Target**: ${target}`)
  output.push(`**Mode**: ${action}`)
  output.push("")

  if (action === "burst") {
    const d = data as Record<string, unknown>
    const rateLimited = d.rate_limited as boolean
    const lockout = d.lockout_detected as boolean
    const statusIcon = rateLimited ? "\u2705" : "\u274c"
    const lockoutIcon = lockout ? "\u2705" : "\u26a0\ufe0f"

    output.push(`### Rate Limiting: ${statusIcon} ${rateLimited ? "Detected" : "NOT DETECTED"}`)
    output.push(`### Account Lockout: ${lockoutIcon} ${lockout ? "Detected" : "Not detected"}`)
    output.push("")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Total Requests | ${d.total_requests} |`)
    output.push(`| Successful (2xx) | ${d.successful} |`)
    output.push(`| Blocked (4xx/5xx) | ${d.blocked} |`)
    output.push(`| Errors | ${d.errors} |`)
    output.push(`| Avg Response | ${d.avg_response_ms}ms |`)
    output.push(`| Min Response | ${d.min_response_ms}ms |`)
    output.push(`| Max Response | ${d.max_response_ms}ms |`)
    output.push("")

    if (d.status_codes) {
      output.push("### Status Code Distribution")
      const codes = d.status_codes as Record<string, number>
      for (const [code, count] of Object.entries(codes)) {
        output.push(`- **${code}**: ${count} responses`)
      }
      output.push("")
    }

    if (!rateLimited) {
      output.push("### \u26a0\ufe0f Finding: Missing Rate Limiting")
      output.push(`- **Severity**: HIGH`)
      output.push(`- **CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)`)
      output.push(`- **Impact**: Brute force attacks possible`)
      output.push(`- **Remediation**: Implement rate limiting (e.g., 5 attempts per minute)`)
    }
  }

  if (action === "timing") {
    const d = data as Record<string, unknown>
    const timingLeak = d.timing_leak as boolean
    const icon = timingLeak ? "\u274c" : "\u2705"

    output.push(`### Timing Attack: ${icon} ${timingLeak ? "VULNERABLE" : "Not vulnerable"}`)
    output.push("")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Valid Input Avg | ${d.valid_avg_ms}ms |`)
    output.push(`| Invalid Input Avg | ${d.invalid_avg_ms}ms |`)
    output.push(`| Difference | ${d.diff_ms}ms |`)
    output.push(`| Samples | ${d.samples} |`)
    output.push("")

    if (timingLeak) {
      output.push("### \u26a0\ufe0f Finding: Timing Information Leakage")
      output.push(`- **Severity**: MEDIUM`)
      output.push(`- **CWE**: CWE-208 (Observable Timing Discrepancy)`)
      output.push(`- **Impact**: Username/email enumeration via response timing`)
      output.push(`- **Remediation**: Normalize response times for valid and invalid inputs`)
    }
  }

  if (action === "race") {
    const d = data as Record<string, unknown>
    const dupes = d.duplicates_detected as boolean
    const icon = dupes ? "\u274c" : "\u2705"

    output.push(`### Race Condition: ${icon} ${dupes ? "VULNERABLE" : "Not vulnerable"}`)
    output.push("")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Concurrent Requests | ${d.total_sent} |`)
    output.push(`| Successful | ${d.successful} |`)
    output.push(`| Duplicates Detected | ${dupes ? "Yes" : "No"} |`)
    output.push("")

    if (d.responses && Array.isArray(d.responses)) {
      output.push("### Response Details")
      for (const r of (d.responses as Array<Record<string, unknown>>).slice(0, 10)) {
        output.push(`- Status **${r.status}** (${r.time_ms}ms): \`${String(r.body_snippet).slice(0, 100)}\``)
      }
    }

    if (dupes) {
      output.push("")
      output.push("### \u26a0\ufe0f Finding: Race Condition")
      output.push(`- **Severity**: HIGH`)
      output.push(`- **CWE**: CWE-362 (Race Condition)`)
      output.push(`- **Impact**: Double-spending, duplicate coupon application, concurrent state corruption`)
      output.push(`- **Remediation**: Implement idempotency keys, database-level locking, or atomic operations`)
    }
  }

  return output.join("\n")
}

async function ensureScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${RATE_LIMIT_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getRateLimitScript()
  await docker.exec(
    `cat > ${RATE_LIMIT_SCRIPT_PATH} << 'RATELIMIT_EOF'\n${script}\nRATELIMIT_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${RATE_LIMIT_SCRIPT_PATH}`, 5000)
}

function getRateLimitScript(): string {
  return `#!/usr/bin/env python3
"""Shannon Rate Limit & Timing Attack Tester"""
import sys, json, time, statistics
import requests
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def send_request(url, method="POST", headers=None, body=None):
    h = headers or {"Content-Type": "application/json"}
    start = time.time()
    try:
        r = requests.request(method, url, headers=h, data=body, timeout=30, verify=False)
        elapsed = (time.time() - start) * 1000
        return {"status": r.status_code, "time_ms": round(elapsed, 2), "body": r.text[:200], "error": None}
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return {"status": 0, "time_ms": round(elapsed, 2), "body": "", "error": str(e)}

def burst_test(params):
    url = params["target"]
    method = params.get("method", "POST")
    body = params.get("body", None)
    headers = json.loads(params["headers"]) if params.get("headers") else None
    count = int(params.get("requests", 30))
    delay = float(params.get("delay_ms", 0)) / 1000.0
    results = []
    for i in range(count):
        r = send_request(url, method, headers, body)
        results.append(r)
        if delay > 0:
            time.sleep(delay)
    status_codes = {}
    times = []
    successful = 0
    blocked = 0
    errors = 0
    for r in results:
        if r["error"]:
            errors += 1
            continue
        code = str(r["status"])
        status_codes[code] = status_codes.get(code, 0) + 1
        times.append(r["time_ms"])
        if 200 <= r["status"] < 300:
            successful += 1
        elif r["status"] in (429, 403, 503):
            blocked += 1
    rate_limited = blocked > 0 or any(int(c) == 429 for c in status_codes)
    lockout = "423" in status_codes or blocked > count * 0.5
    return {
        "total_requests": count,
        "successful": successful,
        "blocked": blocked,
        "errors": errors,
        "status_codes": status_codes,
        "avg_response_ms": round(statistics.mean(times), 2) if times else 0,
        "min_response_ms": round(min(times), 2) if times else 0,
        "max_response_ms": round(max(times), 2) if times else 0,
        "rate_limited": rate_limited,
        "lockout_detected": lockout,
    }

def timing_test(params):
    url = params["target"]
    method = params.get("method", "POST")
    headers = json.loads(params["headers"]) if params.get("headers") else None
    valid = params.get("valid_input", "{}")
    invalid = params.get("invalid_input", "{}")
    samples = 10
    valid_times = []
    invalid_times = []
    for i in range(samples):
        vr = send_request(url, method, headers, valid)
        valid_times.append(vr["time_ms"])
        ir = send_request(url, method, headers, invalid)
        invalid_times.append(ir["time_ms"])
        time.sleep(0.1)
    valid_avg = statistics.mean(valid_times)
    invalid_avg = statistics.mean(invalid_times)
    diff = abs(valid_avg - invalid_avg)
    threshold = max(valid_avg, invalid_avg) * 0.15
    timing_leak = diff > max(threshold, 50)
    return {
        "valid_avg_ms": round(valid_avg, 2),
        "invalid_avg_ms": round(invalid_avg, 2),
        "diff_ms": round(diff, 2),
        "timing_leak": timing_leak,
        "samples": samples,
    }

def race_test(params):
    url = params["target"]
    method = params.get("method", "POST")
    body = params.get("body", None)
    headers = json.loads(params["headers"]) if params.get("headers") else None
    concurrent = int(params.get("concurrent", 10))
    results = []
    with ThreadPoolExecutor(max_workers=concurrent) as executor:
        futures = [executor.submit(send_request, url, method, headers, body) for _ in range(concurrent)]
        for f in as_completed(futures):
            results.append(f.result())
    successful = sum(1 for r in results if 200 <= r["status"] < 300)
    bodies = [r["body"] for r in results if 200 <= r["status"] < 300]
    unique_bodies = set(bodies)
    dupes = successful > 1 and len(unique_bodies) < successful
    return {
        "total_sent": concurrent,
        "successful": successful,
        "duplicates_detected": dupes,
        "responses": [{"status": r["status"], "body_snippet": r["body"][:100], "time_ms": r["time_ms"]} for r in results],
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: script.py '<json_params>'"}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    action = params.get("action", "burst")
    if action == "burst":
        result = burst_test(params)
    elif action == "timing":
        result = timing_test(params)
    elif action == "race":
        result = race_test(params)
    else:
        result = {"error": f"Unknown action: {action}"}
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
`
}
