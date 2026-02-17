# Shannon Tools - Security Testing Docker Image
# Build: docker build -t shannon-tools .
# This container runs as a dumb tool executor. OpenCode's AI reasons about results.

FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive

# Use direct Kali mirror (bypass CDN redirector that routes to dead regional mirrors)
RUN echo "deb http://kali.download/kali kali-rolling main non-free non-free-firmware contrib" > /etc/apt/sources.list

# Core system packages + Security tools
RUN apt-get update -o Acquire::Retries=3 && \
    apt-get install -y --no-install-recommends \
    bash curl wget git ca-certificates gnupg unzip jq \
    python3 python3-pip python3-venv \
    nmap dnsutils whois whatweb \
    nikto sqlmap gobuster dirb \
    hydra netcat-openbsd \
    hashcat john \
    ffuf testssl.sh \
    && rm -rf /var/lib/apt/lists/*

# Install nuclei (latest release)
RUN curl -sL https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_$(curl -sL https://api.github.com/repos/projectdiscovery/nuclei/releases/latest | jq -r '.tag_name' | sed 's/v//')_linux_amd64.zip -o /tmp/nuclei.zip && \
    unzip /tmp/nuclei.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/nuclei && \
    rm /tmp/nuclei.zip || true

# Install httpx (latest release)
RUN curl -sL https://github.com/projectdiscovery/httpx/releases/latest/download/httpx_$(curl -sL https://api.github.com/repos/projectdiscovery/httpx/releases/latest | jq -r '.tag_name' | sed 's/v//')_linux_amd64.zip -o /tmp/httpx.zip && \
    unzip /tmp/httpx.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/httpx && \
    rm /tmp/httpx.zip || true

# Install subfinder (latest release)
RUN curl -sL https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_$(curl -sL https://api.github.com/repos/projectdiscovery/subfinder/releases/latest | jq -r '.tag_name' | sed 's/v//')_linux_amd64.zip -o /tmp/subfinder.zip && \
    unzip /tmp/subfinder.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/subfinder && \
    rm /tmp/subfinder.zip || true

# Install gowitness - web screenshot utility with gallery UI
# https://github.com/sensepost/gowitness
RUN GOWITNESS_VERSION=$(curl -sL https://api.github.com/repos/sensepost/gowitness/releases/latest | jq -r '.tag_name') && \
    curl -sL "https://github.com/sensepost/gowitness/releases/download/${GOWITNESS_VERSION}/gowitness-${GOWITNESS_VERSION}-linux-amd64" -o /usr/local/bin/gowitness && \
    chmod +x /usr/local/bin/gowitness || true

# Chromium + Playwright for browser-based testing (SPA/dynamic pages)
# Let apt resolve Chromium's dependencies automatically instead of listing
# individual libs (which get renamed across Kali Rolling releases, e.g. libasound2 → libasound2t64)
RUN apt-get update -o Acquire::Retries=3 && \
    apt-get install -y \
    chromium chromium-driver \
    fonts-liberation xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Python security libraries + Playwright + BrowserBruter dependencies
RUN pip3 install --break-system-packages --no-cache-dir \
    requests beautifulsoup4 lxml \
    playwright pyyaml \
    selenium selenium-wire 2>/dev/null || true

# Install Playwright browsers (Chromium only to save space)
RUN python3 -m playwright install chromium 2>/dev/null || true

# Install BrowserBruter - browser-based form fuzzing (bypasses encryption)
# https://github.com/netsquare/BrowserBruter
RUN git clone --depth 1 https://github.com/netsquare/BrowserBruter.git /opt/BrowserBruter && \
    cd /opt/BrowserBruter && \
    pip3 install --break-system-packages --no-cache-dir -r requirements.txt 2>/dev/null || true && \
    ln -sf /opt/BrowserBruter/BrowserBruter.py /usr/local/bin/browserbruter

# Create workspace and wordlists directory
WORKDIR /workspace

# Download common wordlists if not present
RUN mkdir -p /usr/share/wordlists/dirb && \
    [ -f /usr/share/wordlists/dirb/common.txt ] || \
    curl -sL https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt \
    -o /usr/share/wordlists/dirb/common.txt 2>/dev/null || true

# Container stays alive for `docker exec` commands
CMD ["tail", "-f", "/dev/null"]
