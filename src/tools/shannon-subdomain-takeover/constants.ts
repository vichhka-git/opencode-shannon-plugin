export const SHANNON_SUBDOMAIN_TAKEOVER_DESCRIPTION = `Detect dangling DNS records and subdomain takeover vulnerabilities.

Subdomain takeover occurs when a subdomain points to an external service (GitHub Pages, Heroku, AWS S3, Azure, Netlify, etc.) that has been deleted or unclaimed. An attacker can register the unclaimed resource and take full control of the subdomain — enabling cookie theft, phishing, CSP bypass, and more.

**What it detects:**
- CNAME records pointing to unclaimed services
- Dangling A/AAAA records pointing to released IPs
- Subdomain pointing to: GitHub Pages, Heroku, AWS S3/CloudFront, Azure, Netlify, Vercel, Fastly, Shopify, Tumblr, WordPress.com, and 30+ other services
- NS delegation to non-existent nameservers (NS takeover)

**Modes:**
- **single** — Test a specific subdomain or domain (default)
- **list** — Test a list of subdomains from a file or newline-separated string
- **discover** — First enumerate subdomains via subfinder, then test all for takeover

**Impact of subdomain takeover:**
- Steal cookies scoped to *.target.com
- Host phishing pages on trusted domain
- Bypass Content Security Policy
- OAuth redirect URI hijacking

**Example usage:**
- Single: target="staging.example.com", mode="single"
- Discover + test: target="example.com", mode="discover"
- List: target="example.com", mode="list", subdomains="dev.example.com\\nstaging.example.com\\napi.example.com"

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
