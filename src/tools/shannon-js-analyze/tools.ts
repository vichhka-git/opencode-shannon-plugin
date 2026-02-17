import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_JS_ANALYZE_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"
import type { JsAnalyzeResult } from "./types"

const ANALYZER_SCRIPT_PATH = "/workspace/.shannon-js-analyzer.py"

export function createShannonJsAnalyze(): ToolDefinition {
  return tool({
    description: SHANNON_JS_ANALYZE_DESCRIPTION,
    args: {
      url: tool.schema
        .string()
        .describe(
          "URL of JavaScript file to analyze (e.g., https://example.com/assets/main.js)"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 60000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureAnalyzerInstalled(docker)

      const timeout = args.timeout ?? 60000
      const cmd = `python3 ${ANALYZER_SCRIPT_PATH} "${args.url}" --json`
      const result = await docker.exec(cmd, timeout)

      if (result.exitCode !== 0) {
        return [
          `## JS Analysis Failed`,
          `**URL**: ${args.url}`,
          `**Exit Code**: ${result.exitCode}`,
          "",
          "### stderr",
          "```",
          result.stderr?.trim() || "No error output",
          "```",
        ].join("\n")
      }

      try {
        const parsed: JsAnalyzeResult[] = JSON.parse(result.stdout)
        return formatResults(parsed)
      } catch {
        return [
          `## JS Analysis: ${args.url}`,
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

async function ensureAnalyzerInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${ANALYZER_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getAnalyzerScript()
  await docker.exec(
    `cat > ${ANALYZER_SCRIPT_PATH} << 'ANALYZER_EOF'\n${script}\nANALYZER_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${ANALYZER_SCRIPT_PATH}`, 5000)
}

function formatResults(results: JsAnalyzeResult[]): string {
  const output: string[] = []

  for (const r of results) {
    output.push(`## JS Analysis: ${r.url}`)
    output.push(`**File Size**: ${(r.file_size / 1024).toFixed(1)} KB`)
    output.push(`**Analyzed**: ${r.analysis_timestamp}`)
    output.push("")

    if (r.errors.length > 0) {
      output.push("### Errors")
      for (const err of r.errors) output.push(`- ${err}`)
      output.push("")
    }

    if (r.api_keys.length > 0) {
      output.push(`### API Keys & Tokens (${r.api_keys.length})`)
      for (const k of r.api_keys.slice(0, 15)) {
        output.push(`- **${k.type}** (line ${k.line}): \`${k.match}\``)
      }
      if (r.api_keys.length > 15)
        output.push(`- *... and ${r.api_keys.length - 15} more*`)
      output.push("")
    }

    if (r.credentials.length > 0) {
      output.push(`### Credentials (${r.credentials.length})`)
      for (const c of r.credentials.slice(0, 10)) {
        output.push(`- **${c.type}** (line ${c.line}): \`${c.match}\``)
      }
      if (r.credentials.length > 10)
        output.push(`- *... and ${r.credentials.length - 10} more*`)
      output.push("")
    }

    if (r.emails.length > 0) {
      output.push(`### Emails (${r.emails.length})`)
      for (const e of r.emails.slice(0, 10)) {
        output.push(`- \`${e.match}\` (line ${e.line})`)
      }
      output.push("")
    }

    if (r.xss_vulnerabilities.length > 0) {
      output.push(`### XSS Vulnerabilities (${r.xss_vulnerabilities.length})`)
      for (const x of r.xss_vulnerabilities) {
        const sev = x.severity?.toUpperCase() || "UNKNOWN"
        output.push(`- **[${sev}]** ${x.type} (line ${x.line}): \`${x.match}\``)
      }
      output.push("")
    }

    if (r.xss_functions.length > 0) {
      output.push(`### XSS-Prone Functions (${r.xss_functions.length})`)
      for (const f of r.xss_functions) {
        const sev = f.severity?.toUpperCase() || "UNKNOWN"
        output.push(`- **[${sev}]** ${f.type} (line ${f.line}): \`${f.match}\``)
      }
      output.push("")
    }

    if (r.api_endpoints.length > 0) {
      output.push(`### API Endpoints (${r.api_endpoints.length})`)
      for (const ep of r.api_endpoints.slice(0, 30)) {
        output.push(`- **${ep.method}**: \`${ep.path}\` (line ${ep.line})`)
      }
      if (r.api_endpoints.length > 30)
        output.push(`- *... and ${r.api_endpoints.length - 30} more*`)
      output.push("")
    }

    if (r.interesting_comments.length > 0) {
      output.push(
        `### Interesting Comments (${r.interesting_comments.length})`
      )
      for (const c of r.interesting_comments.slice(0, 10)) {
        output.push(`- **${c.type}** (line ${c.line}): \`${c.match}\``)
      }
      output.push("")
    }

    if (r.paths_directories.length > 0) {
      output.push(`### Paths & Directories (${r.paths_directories.length})`)
      const uniquePaths = [
        ...new Set(r.paths_directories.map((p) => p.path)),
      ].slice(0, 20)
      for (const p of uniquePaths) output.push(`- \`${p}\``)
      if (r.paths_directories.length > 20)
        output.push(`- *... and ${r.paths_directories.length - 20} more*`)
      output.push("")
    }

    const totalFindings =
      r.api_keys.length +
      r.credentials.length +
      r.xss_vulnerabilities.length +
      r.xss_functions.length
    output.push("### Summary")
    output.push(`| Category | Count |`)
    output.push(`|----------|-------|`)
    output.push(`| API Keys/Tokens | ${r.api_keys.length} |`)
    output.push(`| Credentials | ${r.credentials.length} |`)
    output.push(`| Emails | ${r.emails.length} |`)
    output.push(`| XSS Vulnerabilities | ${r.xss_vulnerabilities.length} |`)
    output.push(`| XSS Functions | ${r.xss_functions.length} |`)
    output.push(`| API Endpoints | ${r.api_endpoints.length} |`)
    output.push(`| Comments | ${r.interesting_comments.length} |`)
    output.push(`| Paths | ${r.paths_directories.length} |`)
    output.push(`| **Total Security Findings** | **${totalFindings}** |`)
    output.push("")
  }

  return output.join("\n")
}

function getAnalyzerScript(): string {
  return `#!/usr/bin/env python3
"""Shannon JS Analyzer - based on JS-Analyser by zack0x01"""
import re, sys, json, argparse
import requests
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Any, Optional
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@dataclass
class AnalysisResult:
    url: str
    api_keys: List[Dict[str, Any]]
    credentials: List[Dict[str, Any]]
    emails: List[Dict[str, Any]]
    interesting_comments: List[Dict[str, Any]]
    xss_vulnerabilities: List[Dict[str, Any]]
    xss_functions: List[Dict[str, Any]]
    api_endpoints: List[Dict[str, Any]]
    parameters: List[Dict[str, Any]]
    paths_directories: List[Dict[str, Any]]
    errors: List[str]
    file_size: int
    analysis_timestamp: str

class JavaScriptAnalyzer:
    def __init__(self):
        self.api_key_patterns = [
            (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID', True),
            (r'(?i)(aws[_-]?secret[_-]?access[_-]?key|aws[_-]?secret)\\s*[:=]\\s*["\\'"]([a-zA-Z0-9/+=]{40})["\\'"]', 'AWS Secret Key', True),
            (r'AIza[0-9A-Za-z\\-]{35}', 'Google API Key', True),
            (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Personal Access Token', True),
            (r'github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}', 'GitHub Fine-grained Token', True),
            (r'sk_live_[a-zA-Z0-9]{24,}', 'Stripe Live Secret Key', True),
            (r'sk_test_[a-zA-Z0-9]{24,}', 'Stripe Test Secret Key', True),
            (r'pk_live_[a-zA-Z0-9]{24,}', 'Stripe Live Publishable Key', True),
            (r'pk_test_[a-zA-Z0-9]{24,}', 'Stripe Test Publishable Key', True),
            (r'access_token\\$production\\$[a-zA-Z0-9]{22}\\$[a-zA-Z0-9]{86}', 'PayPal Access Token', True),
            (r'xox[baprs]-[0-9a-zA-Z\\-]{10,48}', 'Slack Token', True),
            (r'AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}', 'Firebase Cloud Messaging Token', True),
            (r'\\beyJ[A-Za-z0-9-_=]+\\.eyJ[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]{10,}\\b', 'JWT Token', False),
            (r'(?i)(api[_-]?key|apikey)\\s*[:=]\\s*["\\'"]([a-zA-Z0-9_\\-]{32,})["\\'"]', 'Generic API Key', False),
            (r'(?i)(secret[_-]?key|secret)\\s*[:=]\\s*["\\'"]([a-zA-Z0-9_\\-/+=]{32,})["\\'"]', 'Secret Key', False),
        ]
        self.credential_patterns = [
            (r'(?i)(password|passwd|pwd)\\s*[:=]\\s*["\\'"]([^"\\']{6,})["\\'"]', 'Password', False),
            (r'(?i)(db[_-]?password|database[_-]?password)\\s*[:=]\\s*["\\'"]([^"\\']{6,})["\\'"]', 'Database Password', False),
            (r'(?i)(username|user[_-]?name|login)\\s*[:=]\\s*["\\'"]([^"\\']{3,})["\\'"]', 'Username', False),
        ]
        self.email_patterns = [
            (r'\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b', 'Email Address', True),
        ]
        self.comment_patterns = [
            (r'//\\s*(TODO|FIXME|XXX|HACK|BUG|NOTE|SECURITY|DEPRECATED|WARNING|TEMP)', 'Interesting Comment', True),
            (r'/\\*[\\s\\S]{0,500}?(TODO|FIXME|XXX|HACK|BUG|NOTE|SECURITY|DEPRECATED|WARNING)[\\s\\S]{0,500}?\\*/', 'Multi-line Comment', True),
            (r'//\\s*(password|secret|key|token|admin|backdoor|debug|test|hardcoded)', 'Suspicious Comment', False),
        ]
        self.xss_patterns = [
            (r'\\.innerHTML\\s*=\\s*([^;]+)', 'innerHTML Assignment', 'high'),
            (r'\\.outerHTML\\s*=\\s*([^;]+)', 'outerHTML Assignment', 'high'),
            (r'document\\.write\\s*\\(([^)]+)\\)', 'document.write()', 'high'),
            (r'document\\.writeln\\s*\\(([^)]+)\\)', 'document.writeln()', 'high'),
            (r'eval\\s*\\([^)]*( \\$|location|window\\.|document\\.|user|input|param|query|search)', 'eval() with User Input', 'critical'),
            (r'dangerouslySetInnerHTML\\s*=\\s*\\{[^}]*\\}', 'React dangerouslySetInnerHTML', 'high'),
            (r'\\$\\([^)]+\\)\\.html\\s*\\(([^)]+)\\)', 'jQuery .html()', 'medium'),
            (r'\\$\\([^)]+\\)\\.append\\s*\\(([^)]+)\\)', 'jQuery .append()', 'medium'),
            (r'location\\.(href|hash|search)\\s*=\\s*([^;]+)', 'Location Manipulation', 'medium'),
            (r'innerHTML\\s*[+=]\\s*["\\'"]', 'innerHTML Concatenation', 'high'),
        ]
        self.xss_function_patterns = [
            (r'function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*\\.(innerHTML|outerHTML|write)', 'Function with innerHTML/write', 'high'),
            (r'function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*eval\\s*\\(', 'Function with eval()', 'critical'),
            (r'\\.(onclick|onerror|onload|onmouseover)\\s*=\\s*function', 'Event handler assignment', 'medium'),
        ]
        self.api_patterns = [
            (r'fetch\\s*\\(\\s*["\\'"]([^"\\']+)["\\'"]', 'fetch()'),
            (r'fetch\\s*\\(\\s*\`([^\`]+)\`', 'fetch() (template)'),
            (r'\\.open\\s*\\(\\s*["\\'](GET|POST|PUT|DELETE|PATCH)["\\'"]\\s*,\\s*["\\'"]([^"\\']+)["\\'"]', 'XMLHttpRequest'),
            (r'axios\\.(get|post|put|delete|patch)\\s*\\(\\s*["\\'"]([^"\\']+)["\\'"]', 'axios'),
            (r'["\\'"]( /api/[^"\\']+)["\\'"]', 'API Path'),
            (r'["\\'"]( /v\\d+/[^"\\']+)["\\'"]', 'API Versioned Path'),
            (r'baseURL\\s*[:=]\\s*["\\'"]([^"\\']+)["\\'"]', 'Base URL'),
            (r'api[_-]?url\\s*[:=]\\s*["\\'"]([^"\\']+)["\\'"]', 'API URL Variable'),
        ]
        self.path_patterns = [
            (r'["\\'"]( /[a-zA-Z0-9_\\-/]+)["\\'"]', 'Path'),
            (r'["\\'"](\\.\\.?/[a-zA-Z0-9_\\-/]+)["\\'"]', 'Relative Path'),
            (r'["\\'"]([a-zA-Z0-9_\\-/]+\\.(js|json|html|css|png|jpg|svg))["\\'"]', 'File Path'),
        ]

    def fetch_js_file(self, url):
        try:
            if '0.0.0.0' in url:
                url = url.replace('0.0.0.0', 'localhost')
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=60, verify=False, allow_redirects=True)
            response.raise_for_status()
            response.encoding = response.apparent_encoding or 'utf-8'
            content = response.text
            if len(content) > 10 * 1024 * 1024:
                content = content[:10 * 1024 * 1024]
            return content
        except Exception:
            return None

    def is_false_positive(self, match, pattern_type):
        match_lower = match.lower()
        fps = ['example.com', 'example.org', 'localhost', '127.0.0.1',
               'test', 'demo', 'sample', 'placeholder', 'your_api_key',
               'your_secret', 'api_key_here', 'secret_here', 'password: false',
               'password: true', 'password: null', 'password: undefined']
        for fp in fps:
            if fp in match_lower:
                return True
        if pattern_type == 'JWT Token':
            parts = match.split('.')
            if len(parts) < 3 or len(match) < 50:
                return True
        return False

    def find_patterns(self, content, patterns, context_lines=5):
        findings = []
        if not content:
            return findings
        lines = content.split('\\n')
        if len(lines) == 1 and len(content) > 10000:
            context_lines = 0
        for pattern_info in patterns:
            try:
                if len(pattern_info) == 3:
                    pattern, label, extra = pattern_info
                else:
                    pattern, label = pattern_info[:2]
                    extra = False
                is_strict = extra if isinstance(extra, bool) else False
                severity = extra if isinstance(extra, str) else None
                for match in re.finditer(pattern, content, re.MULTILINE | re.IGNORECASE):
                    try:
                        match_text = match.group(0)
                        if not is_strict and self.is_false_positive(match_text, label):
                            continue
                        start_pos = match.start()
                        line_num = content[:start_pos].count('\\n') + 1
                        start_line = max(0, line_num - context_lines - 1)
                        end_line = min(len(lines), line_num + context_lines)
                        context = '\\n'.join(lines[start_line:end_line])
                        if len(context) > 1000:
                            context = context[:1000]
                        line_content = lines[line_num - 1] if line_num <= len(lines) else ""
                        if len(line_content) > 500:
                            line_content = line_content[:200] + "..." + line_content[-200:]
                        finding = {
                            'type': str(label), 'match': str(match_text[:200]),
                            'line': int(line_num), 'line_content': str(line_content.strip()),
                            'context': str(context),
                            'context_start_line': int(start_line + 1),
                            'context_end_line': int(end_line),
                        }
                        if severity:
                            finding['severity'] = str(severity)
                        findings.append(finding)
                    except Exception:
                        continue
            except Exception:
                continue
        return findings

    def extract_api_endpoints(self, content):
        endpoints = []
        lines = content.split('\\n')
        for pattern, method in self.api_patterns:
            for match in re.finditer(pattern, content, re.MULTILINE | re.IGNORECASE):
                start_pos = match.start()
                line_num = content[:start_pos].count('\\n') + 1
                url_path = match.group(1) if match.lastindex and match.lastindex >= 1 else match.group(0)
                if match.lastindex and match.lastindex >= 2:
                    url_path = match.group(2)
                if any(fp in url_path.lower() for fp in ['example.com', 'localhost', 'placeholder']):
                    continue
                endpoints.append({
                    'method': method, 'path': url_path[:200],
                    'line': line_num, 'full_match': match.group(0)[:150],
                    'line_content': lines[line_num - 1].strip() if line_num <= len(lines) else "",
                })
        seen = set()
        unique = []
        for ep in endpoints:
            key = (ep['path'], ep['line'])
            if key not in seen:
                seen.add(key)
                unique.append(ep)
        return unique

    def extract_paths(self, content):
        paths = []
        lines = content.split('\\n')
        for pattern, label in self.path_patterns:
            for match in re.finditer(pattern, content, re.MULTILINE):
                start_pos = match.start()
                line_num = content[:start_pos].count('\\n') + 1
                path_text = match.group(1) if match.lastindex and match.lastindex >= 1 else match.group(0)
                if any(fp in path_text.lower() for fp in ['http://', 'https://', 'www.', 'example.com']):
                    continue
                paths.append({
                    'type': label, 'path': path_text[:200],
                    'line': line_num, 'full_match': match.group(0)[:150],
                    'line_content': lines[line_num - 1].strip() if line_num <= len(lines) else "",
                })
        seen = set()
        unique = []
        for p in paths:
            key = (p['path'], p['line'])
            if key not in seen:
                seen.add(key)
                unique.append(p)
        return unique

    def analyze(self, url):
        errors = []
        content = self.fetch_js_file(url)
        if content is None:
            errors.append(f"Failed to fetch {url}")
            return AnalysisResult(url=url, api_keys=[], credentials=[], emails=[],
                interesting_comments=[], xss_vulnerabilities=[], xss_functions=[],
                api_endpoints=[], parameters=[], paths_directories=[], errors=errors,
                file_size=0, analysis_timestamp=datetime.now().isoformat())
        file_size = len(content)
        try: api_keys = self.find_patterns(content, self.api_key_patterns)
        except: api_keys = []
        try: credentials = self.find_patterns(content, self.credential_patterns)
        except: credentials = []
        try: emails = self.find_patterns(content, self.email_patterns)
        except: emails = []
        try: comments = self.find_patterns(content, self.comment_patterns)
        except: comments = []
        try: xss_vulns = self.find_patterns(content, self.xss_patterns)
        except: xss_vulns = []
        try: xss_funcs = self.find_patterns(content, self.xss_function_patterns)
        except: xss_funcs = []
        try: api_endpoints = self.extract_api_endpoints(content)
        except: api_endpoints = []
        try: paths = self.extract_paths(content)
        except: paths = []
        return AnalysisResult(url=url, api_keys=api_keys, credentials=credentials,
            emails=emails, interesting_comments=comments, xss_vulnerabilities=xss_vulns,
            xss_functions=xss_funcs, api_endpoints=api_endpoints, parameters=[],
            paths_directories=paths, errors=errors, file_size=file_size,
            analysis_timestamp=datetime.now().isoformat())

def main():
    parser = argparse.ArgumentParser(description='Shannon JS Analyzer')
    parser.add_argument('urls', nargs='*')
    parser.add_argument('-f', '--file')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    urls = list(args.urls) if args.urls else []
    if args.file:
        try:
            with open(args.file) as f:
                urls.extend([l.strip() for l in f if l.strip()])
        except FileNotFoundError:
            print(json.dumps([{"errors": [f"File not found: {args.file}"]}]))
            sys.exit(1)
    if not urls:
        parser.print_help()
        sys.exit(1)
    analyzer = JavaScriptAnalyzer()
    results = [analyzer.analyze(url) for url in urls]
    if args.json:
        print(json.dumps([asdict(r) for r in results], indent=2))
    else:
        for r in results:
            print(f"URL: {r.url}  Size: {r.file_size:,} bytes")
            if r.api_keys: print(f"  API Keys: {len(r.api_keys)}")
            if r.credentials: print(f"  Credentials: {len(r.credentials)}")
            if r.xss_vulnerabilities: print(f"  XSS: {len(r.xss_vulnerabilities)}")
            if r.api_endpoints: print(f"  Endpoints: {len(r.api_endpoints)}")
            if r.errors:
                for e in r.errors: print(f"  ERROR: {e}")

if __name__ == '__main__':
    main()
`
}
