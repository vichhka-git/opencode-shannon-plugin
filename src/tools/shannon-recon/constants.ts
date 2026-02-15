export const SHANNON_RECON_DESCRIPTION = `Execute a reconnaissance command inside the Shannon Docker container.

Runs real security tools (nmap, subfinder, whatweb, dig, whois, curl, etc.) against a target and returns actual output.

Example commands:
- nmap -sV -sC -p- target
- subfinder -d target -silent
- whatweb target
- dig target ANY
- whois target
- curl -sI target

**IMPORTANT**: Only use on systems you own or have explicit written permission to test.`
