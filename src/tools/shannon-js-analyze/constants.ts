export const SHANNON_JS_ANALYZE_DESCRIPTION = `Analyze JavaScript bundles for security-sensitive information using a comprehensive Python-based analyzer.

Performs deep static analysis on JavaScript files to extract:
- API keys (AWS, Google, GitHub, Stripe, Slack, Firebase, PayPal, JWT, generic)
- Hardcoded credentials (passwords, usernames, emails, database passwords)
- XSS vulnerabilities (innerHTML, eval, document.write, dangerouslySetInnerHTML, jQuery injection)
- API endpoints (fetch, axios, jQuery AJAX, XMLHttpRequest, REST paths)
- URL parameters and function parameters
- Interesting comments (TODO, FIXME, SECURITY, HACK, backdoor mentions)
- File paths and directories
- Client-side storage usage

Features:
- False positive filtering for common placeholders (example.com, localhost, test values)
- Handles minified/uglified code (large single-line files)
- Context extraction around each finding (surrounding lines)
- Severity classification for XSS vulnerabilities (critical, high, medium)
- Supports both URL fetching and local file analysis

Based on JS-Analyser (https://github.com/zack0x01/JS-Analyser).

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
