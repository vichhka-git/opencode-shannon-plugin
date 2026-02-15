export const SHANNON_VULN_DISCOVERY_DESCRIPTION = `Execute a vulnerability discovery command inside the Shannon Docker container.

Runs real vulnerability scanning tools (nikto, sqlmap, gobuster, etc.) against a target and returns actual output.

Example commands:
- nikto -h target
- sqlmap -u "target/page?id=1" --batch --level=3
- gobuster dir -u target -w /usr/share/wordlists/dirb/common.txt
- wpscan --url target
- nuclei -u target

**IMPORTANT**: Only use on authorized systems. Discovery does not equal exploitation.`
