#!/usr/bin/env bash
set -euo pipefail
base="${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}"
mkdir -p "$base/bin"
download="$base/osv-scanner.download"
curl --fail --silent --show-error --location https://github.com/google/osv-scanner/releases/download/v2.7.1/osv-scanner_linux_amd64 -o "$download"
echo "fb7dab19a8bd9bbe5c3189f09d4b7ee1820c9553a23bac202648a56efd2f6ee8  $download" | sha256sum --check
mv "$download" "$base/bin/osv-scanner"
chmod +x "$base/bin/osv-scanner"
"$base/bin/osv-scanner" --version
