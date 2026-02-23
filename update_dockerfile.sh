sed -i '' '/# Install gowitness/i\
# Install grpcurl (latest release)\
RUN curl -sL https://github.com/fullstorydev/grpcurl/releases/latest/download/grpcurl_$(curl -sL https://api.github.com/repos/fullstorydev/grpcurl/releases/latest | jq -r ".tag_name" | sed "s/v//")_linux_x86_64.tar.gz -o /tmp/grpcurl.tar.gz \&\& \\\
    tar -xvf /tmp/grpcurl.tar.gz -C /usr/local/bin grpcurl \&\& \\\
    rm /tmp/grpcurl.tar.gz || true\
\
' Dockerfile

sed -i '' '/RUN mkdir -p \/usr\/share\/wordlists\/dirb/a\
    [ -f \/usr\/share\/wordlists\/rockyou.txt ] || \\\
    (curl -sL https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt -o \/usr/share/wordlists/rockyou.txt 2>/dev/null || true) \&\& \\\
' Dockerfile
