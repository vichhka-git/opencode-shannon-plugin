import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_CRAWLER_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const CRAWLER_SCRIPT_PATH = "/workspace/.shannon-crawler.py"

export function createShannonCrawler(): ToolDefinition {
  return tool({
    description: SHANNON_CRAWLER_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe("Target URL to crawl (e.g., https://example.com)"),
      mode: tool.schema
        .enum(["passive", "active", "authenticated", "js"])
        .optional()
        .describe(
          "Crawling mode: passive (HTML only), active (recursive follow links), authenticated (with auth token), js (headless browser intercept network). Default: active"
        ),
      depth: tool.schema
        .number()
        .optional()
        .describe("Maximum crawl depth for active/authenticated mode (default: 3)"),
      auth_token: tool.schema
        .string()
        .optional()
        .describe(
          "Auth token for authenticated mode (e.g., 'Bearer eyJ...'). Injected into every request."
        ),
      cookies: tool.schema
        .string()
        .optional()
        .describe("Cookie string for session-based auth (e.g., 'session=abc123; token=xyz')"),
      scope: tool.schema
        .string()
        .optional()
        .describe(
          "Limit crawl to URLs matching this pattern (e.g., 'example.com/api'). Prevents crawling off-site."
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 120000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureCrawlerScriptInstalled(docker)

      const params: Record<string, unknown> = {
        target: args.target,
        mode: args.mode ?? "active",
        depth: args.depth ?? 3,
        auth_token: args.auth_token ?? "",
        cookies: args.cookies ?? "",
        scope: args.scope ?? "",
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${CRAWLER_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 120000)

      if (result.exitCode !== 0) {
        return [
          `## Web Crawler Failed`,
          `**Target**: ${args.target}`,
          `**Mode**: ${params.mode}`,
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
        return formatCrawlerResults(args.target, String(params.mode), parsed)
      } catch {
        return [
          `## Web Crawler: ${args.target}`,
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

function formatCrawlerResults(
  target: string,
  mode: string,
  data: Record<string, unknown>
): string {
  const output: string[] = []
  output.push(`## Web Crawler Results`)
  output.push(`**Target**: ${target}`)
  output.push(`**Mode**: ${mode}`)
  output.push("")

  const summary = data.summary as Record<string, unknown> | undefined
  if (summary) {
    output.push("### Summary")
    output.push(`| Metric | Value |`)
    output.push(`|--------|-------|`)
    output.push(`| URLs Discovered | ${summary.total_urls} |`)
    output.push(`| Unique Endpoints | ${summary.unique_endpoints} |`)
    output.push(`| Forms Found | ${summary.forms_found} |`)
    output.push(`| API Endpoints | ${summary.api_endpoints} |`)
    output.push(`| Interesting Paths | ${summary.interesting_paths} |`)
    output.push("")
  }

  const interesting = data.interesting as string[] | undefined
  if (interesting && interesting.length > 0) {
    output.push(`### ⚠️ Interesting / High-Value Endpoints (${interesting.length})`)
    for (const url of interesting) {
      output.push(`- \`${url}\``)
    }
    output.push("")
  }

  const apis = data.api_endpoints as string[] | undefined
  if (apis && apis.length > 0) {
    output.push(`### 🔌 API Endpoints Discovered (${apis.length})`)
    for (const url of apis.slice(0, 50)) {
      output.push(`- \`${url}\``)
    }
    if (apis.length > 50) {
      output.push(`- *... and ${apis.length - 50} more*`)
    }
    output.push("")
  }

  const forms = data.forms as Array<Record<string, unknown>> | undefined
  if (forms && forms.length > 0) {
    output.push(`### 📝 Forms Found (${forms.length}) — Injection Candidates`)
    for (const form of forms) {
      output.push(`- **${form.method ?? "GET"}** \`${form.action}\` — Fields: ${form.fields}`)
    }
    output.push("")
  }

  const allUrls = data.all_urls as string[] | undefined
  if (allUrls && allUrls.length > 0) {
    output.push(`### 🌐 All Discovered URLs (${allUrls.length})`)
    for (const url of allUrls.slice(0, 100)) {
      output.push(`- \`${url}\``)
    }
    if (allUrls.length > 100) {
      output.push(`- *... and ${allUrls.length - 100} more*`)
    }
    output.push("")
  }

  return output.join("\n")
}

async function ensureCrawlerScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${CRAWLER_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getCrawlerScript()
  await docker.exec(
    `cat > ${CRAWLER_SCRIPT_PATH} << 'CRAWLER_EOF'\n${script}\nCRAWLER_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${CRAWLER_SCRIPT_PATH}`, 5000)
}

function getCrawlerScript(): string {
  return `#!/usr/bin/env python3
"""Shannon Web Crawler — attack surface discovery"""
import sys, json, re
from urllib.parse import urljoin, urlparse, parse_qs
from collections import deque
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

INTERESTING_PATTERNS = [
    r'/admin', r'/administrator', r'/dashboard', r'/console',
    r'/debug', r'/test', r'/dev', r'/staging', r'/backup',
    r'/config', r'/setup', r'/install', r'/.env', r'/.git',
    r'/api/admin', r'/api/debug', r'/api/internal',
    r'/actuator', r'/metrics', r'/health', r'/status',
    r'/swagger', r'/openapi', r'/graphql', r'/api-docs',
    r'/upload', r'/file', r'/download', r'/export', r'/import',
    r'/login', r'/register', r'/signup', r'/reset', r'/forgot',
    r'/phpmyadmin', r'/wp-admin', r'/wp-login',
]

API_PATTERNS = [
    r'/api/', r'/rest/', r'/v[0-9]+/', r'/graphql',
    r'/service/', r'/services/', r'/endpoint',
]

def get_headers(auth_token, cookies):
    h = {
        'User-Agent': 'Mozilla/5.0 (Shannon Security Scanner)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    if auth_token:
        if not auth_token.startswith('Bearer ') and not auth_token.startswith('Basic '):
            auth_token = 'Bearer ' + auth_token
        h['Authorization'] = auth_token
    if cookies:
        h['Cookie'] = cookies
    return h

def extract_links(html, base_url):
    links = set()
    for pattern in [
        r'href=["\\'](https?://[^"\\'>]+)',
        r'href=["\\'](/[^"\\'>]+)',
        r'action=["\\'](https?://[^"\\'>]+)',
        r'action=["\\'](/[^"\\'>]+)',
        r'src=["\\'](https?://[^"\\'>]+)',
        r'src=["\\'](/[^"\\'>]+)',
    ]:
        for match in re.findall(pattern, html, re.IGNORECASE):
            url = urljoin(base_url, match)
            links.add(url.split('#')[0])
    return links

def extract_forms(html, base_url):
    forms = []
    form_pattern = re.finditer(
        r'<form[^>]*action=["\\'](.*?)["\\'"][^>]*method=["\\'](.*?)["\\'"]|'
        r'<form[^>]*method=["\\'](.*?)["\\'"][^>]*action=["\\'](.*?)["\\'"]|'
        r'<form[^>]*action=["\\'](.*?)["\\'"]',
        html, re.IGNORECASE | re.DOTALL
    )
    for m in form_pattern:
        groups = [g for g in m.groups() if g]
        action = urljoin(base_url, groups[0]) if groups else base_url
        method = groups[1].upper() if len(groups) > 1 else 'GET'
        field_names = re.findall(r'<input[^>]*name=["\\'](.*?)["\\'"]', html, re.IGNORECASE)
        forms.append({
            'action': action,
            'method': method,
            'fields': ', '.join(field_names[:10]) if field_names else 'none',
        })
    return forms[:20]

def extract_js_endpoints(html, base_url):
    endpoints = set()
    for pattern in [
        r'["\\'](/api/[a-zA-Z0-9/_-]+)["\\'"]',
        r'["\\'](/rest/[a-zA-Z0-9/_-]+)["\\'"]',
        r'fetch\\(["\\'](https?://[^"\\'>]+)["\\'"]',
        r'axios\\.[a-z]+\\(["\\'](https?://[^"\\'>]+)["\\'"]',
        r'\\$\\.ajax.*url.*["\\'](/[a-zA-Z0-9/_-]+)["\\'"]',
    ]:
        for match in re.findall(pattern, html, re.IGNORECASE):
            url = urljoin(base_url, match)
            endpoints.add(url)
    return endpoints

def is_in_scope(url, target, scope):
    parsed_target = urlparse(target)
    parsed_url = urlparse(url)
    if parsed_url.netloc != parsed_target.netloc:
        return False
    if scope and scope not in url:
        return False
    return True

def is_interesting(url):
    path = urlparse(url).path.lower()
    return any(re.search(p, path) for p in INTERESTING_PATTERNS)

def is_api_endpoint(url):
    path = urlparse(url).path.lower()
    return any(re.search(p, path) for p in API_PATTERNS)

def crawl(target, mode, depth, auth_token, cookies, scope):
    headers = get_headers(auth_token, cookies)
    visited = set()
    queue = deque([(target, 0)])
    all_urls = set()
    forms = []
    api_endpoints = set()
    interesting = set()
    js_endpoints = set()

    while queue:
        url, current_depth = queue.popleft()
        if url in visited or current_depth > depth:
            continue
        visited.add(url)

        try:
            r = requests.get(url, headers=headers, timeout=10, verify=False,
                             allow_redirects=True, stream=False)
            html = r.text or ''
            all_urls.add(url)

            if is_interesting(url):
                interesting.add(url)
            if is_api_endpoint(url):
                api_endpoints.add(url)

            if current_depth < depth:
                links = extract_links(html, url)
                js_eps = extract_js_endpoints(html, url)
                js_endpoints.update(js_eps)
                api_endpoints.update(e for e in js_eps if is_api_endpoint(e))

                for link in links:
                    if is_in_scope(link, target, scope) and link not in visited:
                        queue.append((link, current_depth + 1))
                        if is_interesting(link):
                            interesting.add(link)
                        if is_api_endpoint(link):
                            api_endpoints.add(link)

            if mode in ('active', 'authenticated'):
                page_forms = extract_forms(html, url)
                forms.extend(page_forms)

        except Exception:
            pass

    all_urls.update(js_endpoints)
    api_list = sorted(api_endpoints)
    interesting_list = sorted(interesting)
    all_list = sorted(all_urls)

    return {
        'all_urls': all_list,
        'api_endpoints': api_list,
        'interesting': interesting_list,
        'forms': forms[:30],
        'summary': {
            'total_urls': len(all_list),
            'unique_endpoints': len(set(urlparse(u).path for u in all_list)),
            'forms_found': len(forms),
            'api_endpoints': len(api_list),
            'interesting_paths': len(interesting_list),
        }
    }

def passive_crawl(target, auth_token, cookies):
    headers = get_headers(auth_token, cookies)
    try:
        r = requests.get(target, headers=headers, timeout=15, verify=False)
        html = r.text or ''
        links = extract_links(html, target)
        js_eps = extract_js_endpoints(html, target)
        forms = extract_forms(html, target)
        all_urls = sorted(links | js_eps | {target})
        api_endpoints = sorted(e for e in all_urls if is_api_endpoint(e))
        interesting = sorted(u for u in all_urls if is_interesting(u))
        return {
            'all_urls': all_urls,
            'api_endpoints': api_endpoints,
            'interesting': interesting,
            'forms': forms,
            'summary': {
                'total_urls': len(all_urls),
                'unique_endpoints': len(set(urlparse(u).path for u in all_urls)),
                'forms_found': len(forms),
                'api_endpoints': len(api_endpoints),
                'interesting_paths': len(interesting),
            }
        }
    except Exception as e:
        return {'error': str(e), 'all_urls': [], 'api_endpoints': [],
                'interesting': [], 'forms': [],
                'summary': {'total_urls': 0, 'unique_endpoints': 0,
                            'forms_found': 0, 'api_endpoints': 0, 'interesting_paths': 0}}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: script.py \\'<json_params>\\''}))
        sys.exit(1)
    params = json.loads(sys.argv[1])
    target = params['target']
    mode = params.get('mode', 'active')
    depth = int(params.get('depth', 3))
    auth_token = params.get('auth_token', '')
    cookies = params.get('cookies', '')
    scope = params.get('scope', '')

    if mode == 'passive':
        result = passive_crawl(target, auth_token, cookies)
    else:
        result = crawl(target, mode, depth, auth_token, cookies, scope)

    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
`
}
