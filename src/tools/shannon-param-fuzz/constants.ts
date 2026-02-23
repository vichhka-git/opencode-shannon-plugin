export const SHANNON_PARAM_FUZZ_DESCRIPTION = `Discover hidden HTTP parameters on known endpoints using intelligent fuzzing.

Threat actors don't just fuzz paths — they fuzz **parameters** on existing endpoints. Hidden params like \`?debug=true\`, \`?admin=1\`, \`?role=admin\`, \`?export=csv\` are common in production apps and completely invisible without parameter fuzzing.

**What it detects:**
- Hidden GET/POST parameters that change application behavior
- Debug/admin parameters left in production
- Mass assignment vectors (extra fields accepted by the server)
- Parameter pollution opportunities
- Undocumented API parameters not in Swagger/OpenAPI

**Fuzzing methods:**
- **wordlist** — Fuzz with a built-in common parameter wordlist (default, fast)
- **smart** — Use response behavior analysis to detect parameter existence (slower, fewer false positives)
- **headers** — Also fuzz HTTP headers for hidden behavior toggles

**Example usage:**
- Basic: target="https://example.com/api/user", method="GET"
- POST body: target="https://example.com/api/login", method="POST"
- With auth: target="https://example.com/api/profile", method="GET", auth_token="Bearer eyJ..."
- Custom wordlist: target="https://example.com/api/search", wordlist="id,admin,debug,token,key,secret,role"

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
