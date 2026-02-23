export const SHANNON_CRAWLER_DESCRIPTION = `Unified web crawler for black-box penetration testing attack surface mapping.

Crawls web applications to discover all reachable endpoints, forms, parameters, and API routes before vulnerability testing. Supports both static HTML apps and JavaScript-heavy SPAs.

**Crawling modes:**
- **passive** — Extract links, forms, and endpoints from HTML source only (fast, no JS rendering)
- **active** — Full recursive crawl following links up to specified depth (moderate)
- **authenticated** — Crawl behind a login session using a provided auth token (thorough)
- **js** — Use a headless browser to intercept all network requests made by JavaScript (best for SPAs/React/Angular/Vue)

**What it discovers:**
- All reachable URLs and endpoints
- HTML forms with input fields (injection candidates)
- API endpoints called by JavaScript
- Hidden parameters in URL query strings
- File upload endpoints
- Links to admin/debug panels
- Historical URLs via Wayback Machine (passive mode)

**Example usage:**
- Passive: mode="passive", target="https://example.com"
- Active recursive: mode="active", target="https://example.com", depth=3
- Authenticated: mode="authenticated", target="https://example.com", auth_token="Bearer eyJ..."
- SPA JS intercept: mode="js", target="https://example.com"

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
