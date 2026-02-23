import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_SUBDOMAIN_TAKEOVER_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const TAKEOVER_SCRIPT_PATH = "/workspace/.shannon-subdomain-takeover.py"

export function createShannonSubdomainTakeover(): ToolDefinition {
  return tool({
    description: SHANNON_SUBDOMAIN_TAKEOVER_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe(
          "Target to test. For mode='single', provide a specific subdomain (e.g., 'staging.example.com'). For mode='discover', provide the root domain (e.g., 'example.com')."
        ),
      mode: tool.schema
        .enum(["single", "discover", "list"])
        .optional()
        .describe(
          "Testing mode: single (test one subdomain), discover (enumerate + test all subdomains), list (test newline-separated list from 'subdomains' arg). Default: single"
        ),
      subdomains: tool.schema
        .string()
        .optional()
        .describe(
          "Newline-separated list of subdomains to test (required for mode='list'). E.g., 'dev.example.com\\nstaging.example.com'"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 60000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureTakeoverScriptInstalled(docker)

      const subdomainList =
        args.mode === "list" && args.subdomains
          ? args.subdomains.split("\n").map((s) => s.trim()).filter(Boolean)
          : []

      const params: Record<string, unknown> = {
        target: args.target,
        mode: args.mode ?? "single",
        subdomains: subdomainList,
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${TAKEOVER_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 60000)

      if (result.exitCode !== 0) {
        return [
          `## Subdomain Takeover Check Failed`,
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
        return formatTakeoverResults(args.target, String(params.mode), parsed)
      } catch {
        return [
          `## Subdomain Takeover: ${args.target}`,
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

function formatTakeoverResults(
  target: string,
  mode: string,
  data: Record<string, unknown>
): string {
  const output: string[] = []
  output.push(`## Subdomain Takeover Analysis`)
  output.push(`**Target**: ${target}`)
  output.push(`**Mode**: ${mode}`)
  output.push("")

  const summary = data.summary as Record<string, unknown> | undefined
  if (summary) {
    output.push("### Summary")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| Subdomains Tested | ${summary.tested} |`)
    output.push(`| Vulnerable | ${summary.vulnerable} |`)
    output.push(`| Potentially Vulnerable | ${summary.potential} |`)
    output.push(`| Safe | ${summary.safe} |`)
    output.push("")
  }

  const vulnerable = data.vulnerable as Array<Record<string, unknown>> | undefined
  if (vulnerable && vulnerable.length > 0) {
    output.push(`### 🔴 CRITICAL: Vulnerable Subdomains (${vulnerable.length})`)
    output.push("")
    for (const v of vulnerable) {
      output.push(`#### \`${v.subdomain}\``)
      output.push(`- **Service**: ${v.service}`)
      output.push(`- **CNAME**: \`${v.cname}\``)
      output.push(`- **Reason**: ${v.reason}`)
      output.push(`- **Impact**: Attacker can register the unclaimed service and serve malicious content from \`${v.subdomain}\``)
      output.push("")
    }
  }

  const potential = data.potential as Array<Record<string, unknown>> | undefined
  if (potential && potential.length > 0) {
    output.push(`### 🟡 Potentially Vulnerable (${potential.length})`)
    for (const p of potential) {
      output.push(`- \`${p.subdomain}\` → CNAME: \`${p.cname}\` (${p.reason})`)
    }
    output.push("")
  }

  const safe = data.safe as string[] | undefined
  if (safe && safe.length > 0) {
    output.push(`### ✅ Safe Subdomains (${safe.length})`)
    for (const s of safe) {
      output.push(`- \`${s}\``)
    }
  }

  return output.join("\n")
}

async function ensureTakeoverScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${TAKEOVER_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getTakeoverScript()
  await docker.exec(
    `cat > ${TAKEOVER_SCRIPT_PATH} << 'TAKEOVER_EOF'\n${script}\nTAKEOVER_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${TAKEOVER_SCRIPT_PATH}`, 5000)
}

function getTakeoverScript(): string {
  return `#!/usr/bin/env python3
import sys, json, subprocess
import dns.resolver
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TAKEOVER_FINGERPRINTS = [
    {'service': 'GitHub Pages', 'cname_patterns': ['github.io', 'github.com'], 'error_strings': ["There isn't a GitHub Pages site here"]},
    {'service': 'Heroku', 'cname_patterns': ['herokuapp.com', 'heroku.com'], 'error_strings': ['No such app', 'herokucdn.com/error-pages/no-such-app']},
    {'service': 'AWS S3', 'cname_patterns': ['s3.amazonaws.com', 's3-website'], 'error_strings': ['NoSuchBucket', 'The specified bucket does not exist']},
    {'service': 'AWS CloudFront', 'cname_patterns': ['cloudfront.net'], 'error_strings': ['Bad request. We cannot connect to the server for this app or website at this time.', "ERROR: The request could not be satisfied"]},
    {'service': 'Azure', 'cname_patterns': ['azurewebsites.net', 'azure.com', 'cloudapp.net'], 'error_strings': ['404 Web Site not found', 'does not exist in Azure']},
    {'service': 'Netlify', 'cname_patterns': ['netlify.com', 'netlify.app'], 'error_strings': ["Not Found - Request ID", "netlify.com/error-page"]},
    {'service': 'Vercel', 'cname_patterns': ['vercel.app', 'now.sh'], 'error_strings': ['The deployment could not be found', 'This page could not be found']},
    {'service': 'Fastly', 'cname_patterns': ['fastly.net'], 'error_strings': ['Fastly error: unknown domain', 'Please check that this domain has been added to a service']},
    {'service': 'Shopify', 'cname_patterns': ['myshopify.com'], 'error_strings': ["Sorry, this shop is currently unavailable", "Only one step away"]},
    {'service': 'Tumblr', 'cname_patterns': ['tumblr.com'], 'error_strings': ["Whatever you were looking for doesn't currently exist"]},
    {'service': 'WordPress.com', 'cname_patterns': ['wordpress.com'], 'error_strings': ["Do you want to register"]},
    {'service': 'Ghost', 'cname_patterns': ['ghost.io'], 'error_strings': ['The thing you were looking for is no longer here']},
    {'service': 'Surge.sh', 'cname_patterns': ['surge.sh'], 'error_strings': ["project not found"]},
    {'service': 'Pantheon', 'cname_patterns': ['pantheon.io', 'pantheonsite.io'], 'error_strings': ['The gods are wise, but do not know of the site which you seek.']},
    {'service': 'Sendgrid', 'cname_patterns': ['sendgrid.net'], 'error_strings': ["The provided host name is not valid for this server."]},
    {'service': 'Cargo', 'cname_patterns': ['cargocollective.com'], 'error_strings': ['404 Not Found']},
    {'service': 'HubSpot', 'cname_patterns': ['hubspot.com', 'hubspotpagebuilder.com'], 'error_strings': ["Domain not found"]},
    {'service': 'Zendesk', 'cname_patterns': ['zendesk.com'], 'error_strings': ["Help Center Closed"]},
    {'service': 'Readme.io', 'cname_patterns': ['readme.io'], 'error_strings': ["Project doesnt exist... yet"]},
    {'service': 'Intercom', 'cname_patterns': ['intercom.io'], 'error_strings': ["This page is reserved for artistic dogs."]},
]

def get_cname(subdomain):
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 5
        resolver.lifetime = 5
        answers = resolver.resolve(subdomain, 'CNAME')
        return str(answers[0].target).rstrip('.')
    except Exception:
        return None

def check_http_response(subdomain):
    for scheme in ('https', 'http'):
        try:
            r = requests.get(f'{scheme}://{subdomain}', timeout=8, verify=False, allow_redirects=True)
            return r.status_code, r.text or ''
        except Exception:
            continue
    return 0, ''

def check_takeover(subdomain):
    cname = get_cname(subdomain)
    if not cname:
        return {'subdomain': subdomain, 'status': 'safe', 'reason': 'No CNAME record found'}

    status_code, body = check_http_response(subdomain)

    for fp in TAKEOVER_FINGERPRINTS:
        cname_match = any(p.lower() in cname.lower() for p in fp['cname_patterns'])
        if not cname_match:
            continue
        error_match = any(e.lower() in body.lower() for e in fp['error_strings'])
        if error_match:
            return {
                'subdomain': subdomain,
                'service': fp['service'],
                'cname': cname,
                'status': 'vulnerable',
                'reason': f'CNAME points to {fp["service"]} ({cname}) but returns unclaimed service error',
            }
        if status_code in (404, 0):
            return {
                'subdomain': subdomain,
                'service': fp['service'],
                'cname': cname,
                'status': 'potential',
                'reason': f'CNAME points to {fp["service"]} ({cname}) and returns HTTP {status_code} — verify manually',
            }

    return {'subdomain': subdomain, 'cname': cname, 'status': 'safe', 'reason': f'CNAME to {cname} — no takeover fingerprint matched'}

def enumerate_subdomains(domain):
    try:
        result = subprocess.run(
            ['subfinder', '-d', domain, '-silent'],
            capture_output=True, text=True, timeout=60
        )
        subs = [s.strip() for s in result.stdout.splitlines() if s.strip()]
        return subs if subs else [domain]
    except Exception:
        return [domain]

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: script.py \\'<json_params>\\''}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    target = params['target']
    mode = params.get('mode', 'single')
    subdomains_list = params.get('subdomains', [])

    if mode == 'single':
        subdomains = [target]
    elif mode == 'list':
        subdomains = subdomains_list if subdomains_list else [target]
    else:
        subdomains = enumerate_subdomains(target)

    results = [check_takeover(s) for s in subdomains]

    vulnerable = [r for r in results if r.get('status') == 'vulnerable']
    potential = [r for r in results if r.get('status') == 'potential']
    safe = [r['subdomain'] for r in results if r.get('status') == 'safe']

    print(json.dumps({
        'vulnerable': vulnerable,
        'potential': potential,
        'safe': safe,
        'summary': {
            'tested': len(results),
            'vulnerable': len(vulnerable),
            'potential': len(potential),
            'safe': len(safe),
        }
    }, indent=2))

if __name__ == '__main__':
    main()
`
}
