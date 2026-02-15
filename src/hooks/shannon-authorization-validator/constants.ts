export const EXPLOIT_TOOLS = new Set([
  "shannon_exploit",
])

export const AUTHORIZATION_WARNING = `

⚠️  AUTHORIZATION REQUIRED ⚠️

This tool performs exploitation which requires explicit authorization.

LEGAL REQUIREMENTS:
- Written authorization from system owner
- Clear scope definition
- Legal compliance verification

Running penetration tests without authorization may violate:
- Computer Fraud and Abuse Act (CFAA) - US
- Computer Misuse Act - UK
- Similar laws in other jurisdictions

Penalties: Fines, imprisonment, civil liability

REQUIRED: Pass authorization="Written authorization on file" parameter

`

export const AUTHORIZATION_KEY = "authorization"
