#!/usr/bin/env bash
set -euo pipefail
export PATH="${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/venv/bin:${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/bin:$PATH"
export SEMGREP_SEND_METRICS=off
tool="${1:-}"
mkdir -p outputs/security
case "$tool" in
  demo)
    bash scripts/security/demo.sh
    ;;
  semgrep)
    semgrep scan --config .semgrep.yml --metrics=off --disable-version-check --strict --error --json --output outputs/security/semgrep.json .
    ;;
  gitleaks)
    # Solo archivos versionados: nunca copiar .env.local, .dev.vars ni node_modules.
    snapshot="$(mktemp -d)"
    trap 'rm -rf -- "$snapshot"' EXIT
    git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$snapshot"
    gitleaks dir "$snapshot" --config "$PWD/.gitleaks.toml" --redact=100 --exit-code=1 --report-format=json --report-path="$PWD/outputs/security/gitleaks.json" --no-banner
    ;;
  *) echo 'Uso: node scripts/security/run.mjs semgrep|gitleaks|demo' >&2; exit 2 ;;
esac
