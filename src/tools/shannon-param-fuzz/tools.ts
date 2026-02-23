import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_PARAM_FUZZ_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const PARAM_FUZZ_SCRIPT_PATH = "/workspace/.shannon-param-fuzz.py"

export function createShannonParamFuzz(): ToolDefinition {
  return tool({
    description: SHANNON_PARAM_FUZZ_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target endpoint URL to fuzz parameters on (e.g., https://example.com/api/user)"),
      method: tool.schema
        .enum(["GET", "POST", "PUT", "PATCH"])
        .optional()
        .describe("HTTP method to use for fuzzing (default: GET)"),
      auth_token: tool.schema
        .string()
        .optional()
        .describe("Auth token to include in requests (e.g., 'Bearer eyJ...')"),
      cookies: tool.schema
        .string()
        .optional()
        .describe("Cookie string for session-based auth (e.g., 'session=abc123')"),
      wordlist: tool.schema
        .string()
        .optional()
        .describe(
          "Comma-separated list of parameter names to test. If omitted, uses built-in wordlist of 100+ common params."
        ),
      headers: tool.schema
        .string()
        .optional()
        .describe(
          "JSON object of additional headers to include (e.g., '{\"X-Custom\": \"value\"}')"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 120000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureParamFuzzScriptInstalled(docker)

      let extraHeaders: Record<string, string> = {}
      if (args.headers) {
        try {
          extraHeaders = JSON.parse(args.headers)
        } catch {
          return "ERROR: Invalid JSON for headers parameter"
        }
      }

      const params: Record<string, unknown> = {
        target: args.target,
        method: args.method ?? "GET",
        auth_token: args.auth_token ?? "",
        cookies: args.cookies ?? "",
        wordlist: args.wordlist ?? "",
        extra_headers: extraHeaders,
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${PARAM_FUZZ_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 120000)

      if (result.exitCode !== 0) {
        return [
          `## Parameter Fuzzer Failed`,
          `**Target**: ${args.target}`,
          `**Exit Code**: ${result.exitCode}`,
          "",
          "### Error",
          "```",
          result.stderr?.trim() || "No error output",
          "```",
        ].join("\n")
      }

      try {
        const parsed = JSON.parse(result.stdout)
        return formatParamFuzzResults(args.target, String(params.method), parsed)
      } catch {
        return [
          `## Parameter Fuzzer: ${args.target}`,
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

function formatParamFuzzResults(
  target: string,
  method: string,
  data: Record<string, unknown>
): string {
  const output: string[] = []
  output.push(`## Parameter Fuzzer Results`)
  output.push(`**Target**: ${target}`)
  output.push(`**Method**: ${method}`)
  output.push("")

  const summary = data.summary as Record<string, unknown> | undefined
  if (summary) {
    output.push("### Summary")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Parameters Tested | ${summary.params_tested} |`)
    output.push(`| Parameters Found | ${summary.params_found} |`)
    output.push(`| Baseline Status | ${summary.baseline_status} |`)
    output.push(`| Baseline Size | ${summary.baseline_size} bytes |`)
    output.push("")
  }

  const found = data.found as Array<Record<string, unknown>> | undefined
  if (found && found.length > 0) {
    output.push(`### ✅ Hidden Parameters Discovered (${found.length})`)
    output.push("")
    output.push(`| Parameter | Status | Size Delta | Evidence |`)
    output.push(`|-----------|--------|------------|----------|`)
    for (const p of found) {
      output.push(
        `| \`${p.param}\` | ${p.status} | ${p.size_delta} bytes | ${p.evidence} |`
      )
    }
    output.push("")
    output.push("**Next steps**: Test each discovered parameter for injection, authorization bypass, and mass assignment vulnerabilities.")
  } else {
    output.push("### No Hidden Parameters Found")
    output.push("No parameters produced significantly different responses from the baseline.")
  }

  return output.join("\n")
}

async function ensureParamFuzzScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${PARAM_FUZZ_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getParamFuzzScript()
  await docker.exec(
    `cat > ${PARAM_FUZZ_SCRIPT_PATH} << 'PFUZZ_EOF'\n${script}\nPFUZZ_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${PARAM_FUZZ_SCRIPT_PATH}`, 5000)
}

function getParamFuzzScript(): string {
  return `#!/usr/bin/env python3
"""Shannon Parameter Fuzzer — hidden parameter discovery"""
import sys, json
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COMMON_PARAMS = [
    'id', 'user', 'userid', 'user_id', 'uid', 'account', 'account_id',
    'admin', 'administrator', 'root', 'superuser', 'su',
    'debug', 'test', 'dev', 'development', 'mode', 'verbose',
    'token', 'key', 'api_key', 'apikey', 'secret', 'password', 'pass', 'pwd',
    'role', 'roles', 'permission', 'permissions', 'privilege', 'access',
    'email', 'username', 'login', 'name', 'fullname',
    'redirect', 'url', 'return', 'returnUrl', 'return_url', 'next', 'goto',
    'callback', 'cb', 'ref', 'referer', 'referrer',
    'page', 'limit', 'offset', 'count', 'size', 'per_page',
    'sort', 'order', 'orderby', 'order_by', 'dir', 'direction',
    'filter', 'search', 'q', 'query', 'keyword', 'term',
    'format', 'type', 'output', 'export', 'download',
    'file', 'filename', 'path', 'dir', 'folder',
    'action', 'op', 'operation', 'cmd', 'command',
    'lang', 'locale', 'language', 'country', 'region',
    'version', 'v', 'api', 'api_version',
    'source', 'src', 'from', 'to', 'dest', 'destination',
    'status', 'state', 'active', 'enabled', 'disabled',
    'show', 'hide', 'display', 'visible',
    'include', 'exclude', 'fields', 'columns', 'select',
    'expand', 'embed', 'related', 'populate',
    'force', 'override', 'bypass', 'skip', 'ignore',
    'internal', 'private', 'hidden', 'preview',
    'beta', 'alpha', 'experimental', 'feature', 'flag',
    'timestamp', 'time', 'date', 'created', 'updated',
    'depth', 'level', 'tier', 'plan', 'subscription',
    'org', 'organization', 'company', 'tenant', 'team', 'group',
    'session', 'sid', 'csrf', 'nonce', '_token',
    'data', 'payload', 'body', 'content', 'value',
    'code', 'otp', 'pin', 'captcha',
    'image', 'avatar', 'photo', 'thumbnail',
    'tag', 'tags', 'category', 'label',
    'priority', 'weight', 'score', 'rank',
    'public', 'shared', 'owner', 'author',
    'notify', 'notification', 'alert', 'email_notify',
    'pretty', 'indent', 'minify',
    '_method', '_format', '_locale',
    'jsonp', 'json', 'xml', 'csv',
    'start', 'end', 'begin', 'stop',
    'max', 'min', 'threshold',
    'raw', 'plain', 'text',
    'parent', 'child', 'ancestor', 'sibling',
    'old', 'new', 'prev', 'next', 'current',
]

SIGNIFICANT_DELTA = 50
SIGNIFICANT_STATUS_CHANGE = True

def get_headers(auth_token, cookies, extra_headers):
    h = {
        'User-Agent': 'Mozilla/5.0 (Shannon Security Scanner)',
        'Accept': 'application/json, text/html, */*',
        'Content-Type': 'application/json',
    }
    if auth_token:
        if not auth_token.startswith('Bearer ') and not auth_token.startswith('Basic '):
            auth_token = 'Bearer ' + auth_token
        h['Authorization'] = auth_token
    if cookies:
        h['Cookie'] = cookies
    h.update(extra_headers)
    return h

def make_request(url, method, params, headers, timeout=10):
    try:
        if method in ('GET',):
            r = requests.request(method, url, params=params, headers=headers,
                                 timeout=timeout, verify=False)
        else:
            r = requests.request(method, url, json=params, headers=headers,
                                 timeout=timeout, verify=False)
        return r.status_code, len(r.text or '')
    except Exception as e:
        return 0, 0

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: script.py \\'<json_params>\\''}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    target = params['target']
    method = params.get('method', 'GET').upper()
    auth_token = params.get('auth_token', '')
    cookies = params.get('cookies', '')
    wordlist_str = params.get('wordlist', '')
    extra_headers = params.get('extra_headers', {})

    wordlist = [w.strip() for w in wordlist_str.split(',') if w.strip()] if wordlist_str else COMMON_PARAMS
    headers = get_headers(auth_token, cookies, extra_headers)

    # Baseline request
    baseline_status, baseline_size = make_request(target, method, {}, headers)

    found = []
    for param in wordlist:
        test_params = {param: 'true'}
        status, size = make_request(target, method, test_params, headers)

        size_delta = abs(size - baseline_size)
        status_changed = status != baseline_status and status != 0

        if size_delta >= SIGNIFICANT_DELTA or status_changed:
            evidence = []
            if status_changed:
                evidence.append(f'status {baseline_status}→{status}')
            if size_delta >= SIGNIFICANT_DELTA:
                evidence.append(f'size +{size_delta}B')
            found.append({
                'param': param,
                'status': status,
                'size_delta': size_delta,
                'evidence': ', '.join(evidence),
            })

    print(json.dumps({
        'found': found,
        'summary': {
            'params_tested': len(wordlist),
            'params_found': len(found),
            'baseline_status': baseline_status,
            'baseline_size': baseline_size,
        }
    }, indent=2))

if __name__ == '__main__':
    main()
`
}
