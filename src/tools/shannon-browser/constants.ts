export const SHANNON_BROWSER_DESCRIPTION = `Execute browser-based security testing using Playwright inside the Shannon Docker container.

Essential for testing JavaScript-heavy Single Page Applications (SPAs) like Angular, React, Vue that render content client-side. curl/wget cannot test these — they only see the initial HTML shell.

Capabilities:
- Navigate SPA routes and test JavaScript-rendered content
- Execute XSS payloads in a real browser context (reflected, stored, DOM-based)
- Test OAuth/SSO flows that require browser redirects
- Extract routes and API endpoints from JavaScript bundles
- Screenshot pages for evidence collection
- Intercept and modify network requests
- Test CAPTCHA-protected forms
- Analyze client-side storage (localStorage, sessionStorage, cookies)

Example scripts (passed as Python/Playwright code):
- Navigate to SPA route and extract rendered HTML
- Test reflected XSS with DOM execution verification
- Extract API endpoints from bundled JavaScript
- Test JSONP callback injection
- Capture authentication flow screenshots

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
