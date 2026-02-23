import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_HEADERS_AUDIT_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const HEADERS_SCRIPT_PATH = "/workspace/.shannon-headers-audit.py"

export function createShannonHeadersAudit(): ToolDefinition {
  return tool({
    description: SHANNON_HEADERS_AUDIT_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target URL to audit security headers and CORS (e.g., https://example.com)"),
      auth_token: tool.schema
        .string()
        .optional()
        .describe("Auth token for authenticated endpoints (e.g., 'Bearer eyJ...')"),
      cookies: tool.schema
        .string()
        .optional()
        .describe("Cookie string for session auth (e.g., 'session=abc123')"),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 30000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureHeadersScriptInstalled(docker)

      const params: Record<string, unknown> = {
        target: args.target,
        auth_token: args.auth_token ?? "",
        cookies: args.cookies ?? "",
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${HEADERS_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 30000)

      if (result.exitCode !== 0) {
        return [
          `## Security Headers Audit Failed`,
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
        return formatHeadersResults(args.target, parsed)
      } catch {
        return [
          `## Security Headers Audit: ${args.target}`,
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

function severityBadge(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "🔴 CRITICAL"
    case "HIGH": return "🟠 HIGH"
    case "MEDIUM": return "🟡 MEDIUM"
    case "LOW": return "🔵 LOW"
    default: return "ℹ️ INFO"
  }
}

function formatHeadersResults(target: string, data: Record<string, unknown>): string {
  const output: string[] = []
  output.push(`## Security Headers & CORS Audit`)
  output.push(`**Target**: ${target}`)
  output.push("")

  const summary = data.summary as Record<string, unknown> | undefined
  if (summary) {
    output.push("### Summary")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Security Score | ${summary.score}/100 |`)
    output.push(`| Critical Issues | ${summary.critical} |`)
    output.push(`| High Issues | ${summary.high} |`)
    output.push(`| Medium Issues | ${summary.medium} |`)
    output.push(`| Low Issues | ${summary.low} |`)
    output.push("")
  }

  const cors = data.cors as Record<string, unknown> | undefined
  if (cors) {
    output.push("### 🌐 CORS Configuration")
    const findings = cors.findings as Array<Record<string, unknown>> | undefined
    if (findings && findings.length > 0) {
      for (const f of findings) {
        output.push(`- ${severityBadge(String(f.severity))}: **${f.name}**`)
        output.push(`  - ${f.description}`)
        if (f.evidence) {
          output.push(`  - Evidence: \`${f.evidence}\``)
        }
      }
    } else {
      output.push("- ✅ CORS configuration appears secure")
    }
    output.push("")
  }

  const headers = data.headers as Array<Record<string, unknown>> | undefined
  if (headers && headers.length > 0) {
    output.push("### 🛡️ Security Headers")
    output.push("")
    output.push(`| Header | Status | Severity | Notes |`)
    output.push(`|--------|--------|----------|-------|`)
    for (const h of headers) {
      const status = h.present ? "✅ Present" : "❌ Missing"
      const severity = h.present ? "—" : severityBadge(String(h.severity))
      output.push(`| \`${h.header}\` | ${status} | ${severity} | ${h.notes} |`)
    }
    output.push("")
  }

  const disclosure = data.disclosure as Array<Record<string, unknown>> | undefined
  if (disclosure && disclosure.length > 0) {
    output.push("### ⚠️ Information Disclosure Headers")
    for (const d of disclosure) {
      output.push(`- \`${d.header}: ${d.value}\` — ${d.risk}`)
    }
    output.push("")
  }

  const raw = data.raw_headers as Record<string, string> | undefined
  if (raw) {
    output.push("### 📋 Raw Response Headers")
    output.push("```")
    for (const [k, v] of Object.entries(raw)) {
      output.push(`${k}: ${v}`)
    }
    output.push("```")
  }

  return output.join("\n")
}

async function ensureHeadersScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${HEADERS_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getHeadersScript()
  await docker.exec(
    `cat > ${HEADERS_SCRIPT_PATH} << 'HEADERS_EOF'\n${script}\nHEADERS_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${HEADERS_SCRIPT_PATH}`, 5000)
}

function getHeadersScript(): string {
  return `#!/usr/bin/env python3
"""Shannon Security Headers & CORS Auditor"""
import sys, json
from urllib.parse import urlparse
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SECURITY_HEADERS = [
    {
        'header': 'Content-Security-Policy',
        'severity': 'HIGH',
        'notes': 'Prevents XSS and data injection attacks',
        'check_weak': ['unsafe-inline', 'unsafe-eval', '*'],
    },
    {
        'header': 'Strict-Transport-Security',
        'severity': 'MEDIUM',
        'notes': 'Enforces HTTPS connections — missing enables downgrade attacks',
        'check_weak': [],
    },
    {
        'header': 'X-Content-Type-Options',
        'severity': 'MEDIUM',
        'notes': 'Prevents MIME type sniffing — value should be "nosniff"',
        'check_weak': [],
    },
    {
        'header': 'X-Frame-Options',
        'severity': 'HIGH',
        'notes': 'Prevents clickjacking — missing means page can be embedded in iframes',
        'check_weak': [],
    },
    {
        'header': 'Referrer-Policy',
        'severity': 'LOW',
        'notes': 'Controls Referer header information leakage',
        'check_weak': ['unsafe-url'],
    },
    {
        'header': 'Permissions-Policy',
        'severity': 'LOW',
        'notes': 'Controls browser feature access (camera, microphone, geolocation)',
        'check_weak': [],
    },
    {
        'header': 'X-XSS-Protection',
        'severity': 'LOW',
        'notes': 'Legacy XSS filter (deprecated in modern browsers — informational)',
        'check_weak': [],
    },
    {
        'header': 'Cache-Control',
        'severity': 'LOW',
        'notes': 'Prevents sensitive data caching — should include no-store for auth pages',
        'check_weak': [],
    },
]

DISCLOSURE_HEADERS = ['Server', 'X-Powered-By', 'X-AspNet-Version', 'X-Generator', 'Via']

CORS_TEST_ORIGINS = [
    ('evil_reflect', 'https://evil-attacker.com'),
    ('null_origin', 'null'),
    ('http_downgrade', 'http://{netloc}'),
    ('subdomain', 'https://evil.{netloc}'),
    ('prefix', 'https://{netloc}.evil.com'),
]

def get_headers(auth_token, cookies):
    h = {'User-Agent': 'Mozilla/5.0 (Shannon Security Scanner)'}
    if auth_token:
        if not auth_token.startswith('Bearer ') and not auth_token.startswith('Basic '):
            auth_token = 'Bearer ' + auth_token
        h['Authorization'] = auth_token
    if cookies:
        h['Cookie'] = cookies
    return h

def check_cors(target, netloc, base_headers):
    findings = []
    for test_name, origin_template in CORS_TEST_ORIGINS:
        origin = origin_template.format(netloc=netloc)
        h = {**base_headers, 'Origin': origin}
        try:
            r = requests.options(target, headers=h, timeout=8, verify=False)
            acao = r.headers.get('Access-Control-Allow-Origin', '')
            acac = r.headers.get('Access-Control-Allow-Credentials', '').lower()
            acam = r.headers.get('Access-Control-Allow-Methods', '')

            if acao == origin or acao == '*':
                severity = 'CRITICAL' if (acao == origin and acac == 'true') else 'HIGH'
                findings.append({
                    'name': f'CORS Misconfiguration ({test_name})',
                    'severity': severity,
                    'description': f'Origin "{origin}" is reflected in Access-Control-Allow-Origin' +
                                   (' with credentials=true' if acac == 'true' else ''),
                    'evidence': f'ACAO: {acao}, ACAC: {acac or "not set"}',
                })
        except Exception:
            continue
    return findings

def audit_headers(target, auth_token, cookies):
    netloc = urlparse(target).netloc
    base_headers = get_headers(auth_token, cookies)

    try:
        r = requests.get(target, headers=base_headers, timeout=10, verify=False)
    except Exception as e:
        return {'error': str(e)}

    resp_headers = dict(r.headers)
    raw_headers = {k: v for k, v in resp_headers.items()}

    # Security headers audit
    header_results = []
    score = 100
    summary = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

    for h_def in SECURITY_HEADERS:
        header_name = h_def['header']
        present = header_name in resp_headers or header_name.lower() in {k.lower() for k in resp_headers}
        value = resp_headers.get(header_name, resp_headers.get(header_name.lower(), ''))

        notes = h_def['notes']
        severity = h_def['severity']

        if not present:
            sev_lower = severity.lower()
            if sev_lower in summary:
                summary[sev_lower] += 1
            deduction = {'HIGH': 15, 'MEDIUM': 10, 'LOW': 5, 'CRITICAL': 25}.get(severity, 5)
            score -= deduction
        else:
            # Check for weak values
            weak = h_def.get('check_weak', [])
            weak_found = [w for w in weak if w.lower() in value.lower()]
            if weak_found:
                notes = f'⚠️ Weak config: {", ".join(weak_found)} — {notes}'
                severity = 'INFO'

        header_results.append({
            'header': header_name,
            'present': present,
            'value': value if present else None,
            'severity': severity if not present else 'OK',
            'notes': notes,
        })

    # Disclosure headers
    disclosure = []
    for dh in DISCLOSURE_HEADERS:
        val = resp_headers.get(dh)
        if val:
            disclosure.append({
                'header': dh,
                'value': val,
                'risk': f'Version/technology disclosure enables targeted attacks',
            })
            summary['low'] += 1
            score -= 3

    # CORS testing
    cors_findings = check_cors(target, netloc, base_headers)
    for cf in cors_findings:
        sev = cf['severity'].lower()
        if sev in summary:
            summary[sev] += 1
        deduction = {'critical': 30, 'high': 20, 'medium': 10}.get(sev, 5)
        score -= deduction

    score = max(0, score)

    return {
        'summary': {
            'score': score,
            'critical': summary['critical'],
            'high': summary['high'],
            'medium': summary['medium'],
            'low': summary['low'],
        },
        'cors': {'findings': cors_findings},
        'headers': header_results,
        'disclosure': disclosure,
        'raw_headers': raw_headers,
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: script.py \\'<json_params>\\''}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    result = audit_headers(
        params['target'],
        params.get('auth_token', ''),
        params.get('cookies', ''),
    )
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
`
}
