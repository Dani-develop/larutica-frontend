#!/usr/bin/env bash
# Linux/WSL, sin sudo ni cambios en Python del sistema.
set -euo pipefail
base="${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}"
mkdir -p "$base/bin"
python3 -m venv --without-pip "$base/venv"
curl --fail --silent --show-error --location https://bootstrap.pypa.io/pip/pip.pyz -o "$base/pip.pyz"
python3 "$base/pip.pyz" --python "$base/venv/bin/python" install 'semgrep==1.185.0'
archive="$base/gitleaks.tar.gz"
curl --fail --silent --show-error --location https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz -o "$archive"
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  $archive" | sha256sum --check
tar -xzf "$archive" -C "$base/bin" gitleaks
"$base/venv/bin/semgrep" --version
"$base/bin/gitleaks" version
