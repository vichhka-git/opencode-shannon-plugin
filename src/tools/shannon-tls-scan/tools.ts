import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { SHANNON_TLS_SCAN_DESCRIPTION } from "./constants"
import { DockerManager } from "../../docker"

const TLS_SCRIPT_PATH = "/workspace/.shannon-tls-scan.py"

export function createShannonTlsScan(): ToolDefinition {
  return tool({
    description: SHANNON_TLS_SCAN_DESCRIPTION,
    args: {
      target: tool.schema
        .string()
        .describe(
          "Target to scan — hostname or URL (e.g., 'example.com' or 'https://example.com'). Port is extracted from URL or use the port arg."
        ),
      port: tool.schema
        .number()
        .optional()
        .describe("Port to scan (default: 443). Use for non-standard HTTPS ports like 8443."),
      quick: tool.schema
        .boolean()
        .optional()
        .describe(
          "Quick mode — only check protocol versions and certificate validity, skip cipher suite enumeration (default: false)"
        ),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 60000)"),
    },
    async execute(args) {
      const docker = DockerManager.getInstance()
      await docker.ensureRunning()

      await ensureTlsScriptInstalled(docker)

      const stripped = args.target.replace(/^https?:\/\//, "").split("/")[0] ?? args.target
      const colonIdx = stripped.lastIndexOf(":")
      const hostname = colonIdx > 0 ? stripped.slice(0, colonIdx) : stripped
      const portStr = colonIdx > 0 ? stripped.slice(colonIdx + 1) : undefined
      const port = args.port ?? (portStr ? parseInt(portStr, 10) : 443)

      const params: Record<string, unknown> = {
        target: hostname,
        port,
        quick: args.quick ?? false,
      }

      const paramsJson = JSON.stringify(params).replace(/'/g, "'\\''")
      const cmd = `python3 ${TLS_SCRIPT_PATH} '${paramsJson}'`
      const result = await docker.exec(cmd, args.timeout ?? 60000)

      if (result.exitCode !== 0) {
        return [
          `## TLS Scan Failed`,
          `**Target**: ${hostname}:${port}`,
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
        return formatTlsResults(hostname, port, parsed)
      } catch {
        return [
          `## TLS Scan: ${hostname}:${port}`,
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

function severityEmoji(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "🔴"
    case "HIGH": return "🟠"
    case "MEDIUM": return "🟡"
    case "LOW": return "🔵"
    default: return "ℹ️"
  }
}

function formatTlsResults(target: string, port: number, data: Record<string, unknown>): string {
  const output: string[] = []
  output.push(`## TLS/SSL Security Scan Results`)
  output.push(`**Target**: ${target}:${port}`)
  output.push("")

  const cert = data.certificate as Record<string, unknown> | undefined
  if (cert) {
    output.push("### 📜 Certificate")
    output.push(`| Field | Value |`)
    output.push(`|-------|-------|`)
    output.push(`| Subject | ${cert.subject} |`)
    output.push(`| Issuer | ${cert.issuer} |`)
    output.push(`| Valid From | ${cert.not_before} |`)
    output.push(`| Valid Until | ${cert.not_after} |`)
    output.push(`| Days Remaining | ${cert.days_remaining} |`)
    output.push(`| Self-Signed | ${cert.self_signed} |`)
    output.push(`| Hostname Match | ${cert.hostname_match} |`)
    output.push("")
  }

  const protocols = data.protocols as Record<string, boolean> | undefined
  if (protocols) {
    output.push("### 🔐 Protocol Support")
    output.push(`| Protocol | Supported | Status |`)
    output.push(`|----------|-----------|--------|`)
    const protoOrder = ["SSLv2", "SSLv3", "TLSv1.0", "TLSv1.1", "TLSv1.2", "TLSv1.3"]
    const dangerousProtos = ["SSLv2", "SSLv3", "TLSv1.0", "TLSv1.1"]
    for (const proto of protoOrder) {
      if (proto in protocols) {
        const supported = protocols[proto]
        const isDangerous = dangerousProtos.includes(proto)
        const status = supported && isDangerous ? "⚠️ INSECURE" : supported ? "✅ OK" : "✅ Disabled"
        output.push(`| ${proto} | ${supported ? "Yes" : "No"} | ${status} |`)
      }
    }
    output.push("")
  }

  const vulns = data.vulnerabilities as Array<Record<string, unknown>> | undefined
  if (vulns && vulns.length > 0) {
    const critical = vulns.filter((v) => String(v.severity).toUpperCase() === "CRITICAL")
    const high = vulns.filter((v) => String(v.severity).toUpperCase() === "HIGH")
    const medium = vulns.filter((v) => String(v.severity).toUpperCase() === "MEDIUM")
    const low = vulns.filter((v) => String(v.severity).toUpperCase() === "LOW")

    output.push(`### 🚨 Vulnerabilities Found (${vulns.length})`)
    output.push("")

    for (const group of [
      { label: "CRITICAL", items: critical },
      { label: "HIGH", items: high },
      { label: "MEDIUM", items: medium },
      { label: "LOW", items: low },
    ]) {
      if (group.items.length > 0) {
        output.push(`#### ${severityEmoji(group.label)} ${group.label} (${group.items.length})`)
        for (const v of group.items) {
          output.push(`- **${v.name}**: ${v.description}`)
        }
        output.push("")
      }
    }
  } else {
    output.push("### ✅ No Known Vulnerabilities Found")
    output.push("")
  }

  const ciphers = data.weak_ciphers as string[] | undefined
  if (ciphers && ciphers.length > 0) {
    output.push(`### ⚠️ Weak Cipher Suites (${ciphers.length})`)
    for (const c of ciphers) {
      output.push(`- \`${c}\``)
    }
    output.push("")
  }

  return output.join("\n")
}

async function ensureTlsScriptInstalled(docker: DockerManager): Promise<void> {
  const checkResult = await docker.exec(
    `test -f ${TLS_SCRIPT_PATH} && echo "exists"`,
    5000
  )
  if (checkResult.stdout?.trim() === "exists") return

  const script = getTlsScript()
  await docker.exec(
    `cat > ${TLS_SCRIPT_PATH} << 'TLS_EOF'\n${script}\nTLS_EOF`,
    10000
  )
  await docker.exec(`chmod +x ${TLS_SCRIPT_PATH}`, 5000)
}

function getTlsScript(): string {
  return `#!/usr/bin/env python3
import sys, json, ssl, socket
from datetime import datetime

WEAK_CIPHERS = [
    'RC4', 'DES', '3DES', 'EXPORT', 'NULL', 'ANON', 'ADH', 'AECDH',
    'MD5', 'RC2', 'IDEA', 'SEED',
]

def check_protocol(host, port, protocol_version):
    try:
        ctx = ssl.SSLContext(protocol_version)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((host, port), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                ssock.do_handshake()
                return True
    except Exception:
        return False

def get_certificate_info(host, port):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    return None
                subject_dict = dict(x[0] for x in cert.get('subject', []))
                issuer_dict = dict(x[0] for x in cert.get('issuer', []))
                not_before = cert.get('notBefore', '')
                not_after = cert.get('notAfter', '')
                days_remaining = 'N/A'
                try:
                    exp = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                    days_remaining = (exp - datetime.utcnow()).days
                except Exception:
                    pass
                subject_cn = subject_dict.get('commonName', 'N/A')
                issuer_cn = issuer_dict.get('commonName', 'N/A')
                self_signed = subject_cn == issuer_cn
                san = cert.get('subjectAltName', [])
                hostname_match = any(
                    (t == 'DNS' and (v == host or v.startswith('*.')))
                    for t, v in san
                ) or subject_cn == host
                return {
                    'subject': subject_cn,
                    'issuer': issuer_cn,
                    'not_before': not_before,
                    'not_after': not_after,
                    'days_remaining': days_remaining,
                    'self_signed': self_signed,
                    'hostname_match': hostname_match,
                }
    except Exception as e:
        return {'error': str(e)}

def get_cipher_suites(host, port):
    weak = []
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cipher = ssock.cipher()
                if cipher:
                    cipher_name = cipher[0]
                    for weak_pattern in WEAK_CIPHERS:
                        if weak_pattern in cipher_name.upper():
                            weak.append(cipher_name)
    except Exception:
        pass
    return weak

def check_vulnerabilities(host, port, protocols, cert):
    vulns = []

    if protocols.get('TLSv1.0') or protocols.get('TLSv1.1'):
        vulns.append({
            'name': 'Legacy TLS Protocol',
            'severity': 'HIGH',
            'description': 'TLS 1.0/1.1 is enabled. These protocols have known weaknesses (POODLE, BEAST). Disable and use TLS 1.2+ only.',
        })

    if protocols.get('SSLv3'):
        vulns.append({
            'name': 'POODLE (SSLv3)',
            'severity': 'CRITICAL',
            'description': 'SSLv3 is enabled. Vulnerable to POODLE attack (CVE-2014-3566). Disable SSLv3 immediately.',
        })

    if protocols.get('SSLv2'):
        vulns.append({
            'name': 'SSLv2 Enabled',
            'severity': 'CRITICAL',
            'description': 'SSLv2 is enabled. This protocol is completely broken and must be disabled.',
        })

    if cert:
        days = cert.get('days_remaining', 999)
        if isinstance(days, int):
            if days < 0:
                vulns.append({
                    'name': 'Expired Certificate',
                    'severity': 'HIGH',
                    'description': f'Certificate expired {abs(days)} days ago. Browsers will show security warnings.',
                })
            elif days < 30:
                vulns.append({
                    'name': 'Certificate Expiring Soon',
                    'severity': 'MEDIUM',
                    'description': f'Certificate expires in {days} days. Renew before expiry.',
                })

        if cert.get('self_signed'):
            vulns.append({
                'name': 'Self-Signed Certificate',
                'severity': 'HIGH',
                'description': 'Certificate is self-signed. Browsers will display security warnings and users may be vulnerable to MITM attacks.',
            })

        if cert.get('hostname_match') is False:
            vulns.append({
                'name': 'Hostname Mismatch',
                'severity': 'HIGH',
                'description': 'Certificate hostname does not match the target hostname. Vulnerable to MITM attacks.',
            })

    if not protocols.get('TLSv1.3'):
        vulns.append({
            'name': 'TLS 1.3 Not Supported',
            'severity': 'LOW',
            'description': 'TLS 1.3 is not supported. Consider enabling it for improved security and performance.',
        })

    return vulns

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: script.py \\'<json_params>\\''}))
        sys.exit(1)

    params = json.loads(sys.argv[1])
    host = params['target']
    port = int(params.get('port', 443))
    quick = params.get('quick', False)

    cert_info = get_certificate_info(host, port)

    protocols = {}
    try:
        protocols['TLSv1.2'] = check_protocol(host, port, ssl.PROTOCOL_TLSv1_2) if hasattr(ssl, 'PROTOCOL_TLSv1_2') else None
    except Exception:
        pass
    try:
        protocols['TLSv1.3'] = check_protocol(host, port, ssl.PROTOCOL_TLS_CLIENT)
    except Exception:
        pass
    for proto_name, proto_const in [
        ('TLSv1.0', 'PROTOCOL_TLSv1'),
        ('TLSv1.1', 'PROTOCOL_TLSv1_1'),
        ('SSLv3', 'PROTOCOL_SSLv3'),
        ('SSLv2', 'PROTOCOL_SSLv2'),
    ]:
        if hasattr(ssl, proto_const):
            try:
                protocols[proto_name] = check_protocol(host, port, getattr(ssl, proto_const))
            except Exception:
                protocols[proto_name] = False
        else:
            protocols[proto_name] = False

    protocols = {k: v for k, v in protocols.items() if v is not None}

    weak_ciphers = [] if quick else get_cipher_suites(host, port)
    vulnerabilities = check_vulnerabilities(host, port, protocols, cert_info)

    print(json.dumps({
        'certificate': cert_info,
        'protocols': protocols,
        'weak_ciphers': weak_ciphers,
        'vulnerabilities': vulnerabilities,
    }, indent=2, default=str))

if __name__ == '__main__':
    main()
`
}
