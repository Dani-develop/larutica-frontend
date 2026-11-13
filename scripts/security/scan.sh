#!/usr/bin/env bash
set -euo pipefail
export PATH="${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/venv/bin:${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/bin:$PATH"
export SEMGREP_SEND_METRICS=off
tool="${1:-}"
mkdir -p outputs/security
root="$PWD"
snapshot_tracked() {
  snapshot="$(mktemp -d)"
  trap 'rm -rf -- "$snapshot"' EXIT
  git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$snapshot"
}
case "$tool" in
  demo)
    bash scripts/security/demo.sh
    ;;
  semgrep)
    snapshot_tracked
    cd "$snapshot"
    semgrep scan --config "$root/.semgrep.yml" --metrics=off --disable-version-check --strict --error --json --output "$root/outputs/security/semgrep.json" .
    ;;
  gitleaks)
    # Solo archivos versionados: nunca copiar .env.local, .dev.vars ni node_modules.
    snapshot_tracked
    cd "$snapshot"
    gitleaks dir . --config "$root/.gitleaks.toml" --redact=100 --exit-code=1 --report-format=json --report-path="$root/outputs/security/gitleaks.json" --no-banner
    ;;
  osv)
    osv-scanner scan source --lockfile=package-lock.json --all-packages --format=json --output-file=outputs/security/osv.json
    ;;
  *) echo 'Uso: node scripts/security/run.mjs semgrep|gitleaks|osv|demo' >&2; exit 2 ;;
esac
