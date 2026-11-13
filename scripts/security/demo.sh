#!/usr/bin/env bash
# La demostración vive en un repositorio temporal y una rama que jamás se fusiona.
set -euo pipefail
export PATH="${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/venv/bin:${LARUTICA_SECURITY_HOME:-$HOME/.local/share/larutica-security}/bin:$PATH"
root="$PWD"
mkdir -p outputs/security
demo="$(mktemp -d)"
trap 'rm -rf -- "$demo"' EXIT
git -C "$demo" init -q
git -C "$demo" switch -c demo/2.3-deteccion-controlada >/dev/null
# SHA de una etiqueta pública: NO es una credencial ni corresponde a ningún servicio.
fictitious="$(printf 'LARUTICA_SOLO_DEMO_NO_ES_CREDENCIAL' | sha256sum | cut -d ' ' -f 1)"
printf 'const api_key = "%s";\neval("1 + 1");\n' "$fictitious" > "$demo/controlled.js"
git -C "$demo" add controlled.js
set +e
semgrep scan --config "$root/.semgrep.yml" --metrics=off --disable-version-check --strict --error --json --output "$root/outputs/security/demo-semgrep.json" "$demo"
sast_bad=$?
gitleaks dir "$demo" --config "$root/.gitleaks.toml" --redact=100 --exit-code=1 --report-format=json --report-path="$root/outputs/security/demo-gitleaks.json" --no-banner
secrets_bad=$?
set -e
[[ "$sast_bad" == 1 && "$secrets_bad" == 1 ]] || { echo 'DEMO_INCOMPLETA: no se detectaron ambos controles' >&2; exit 2; }
# Control negativo: corregir el defecto y eliminar el dato ficticio, sin allowlists.
printf 'const result = JSON.parse("1");\n' > "$demo/controlled.js"
semgrep scan --config "$root/.semgrep.yml" --metrics=off --disable-version-check --strict --error --json --output "$root/outputs/security/demo-semgrep-clean.json" "$demo"
gitleaks dir "$demo" --config "$root/.gitleaks.toml" --redact=100 --exit-code=1 --report-format=json --report-path="$root/outputs/security/demo-gitleaks-clean.json" --no-banner
printf 'DEMO_OK: defecto=1, secreto_ficticio=1; corregidos=0/0. Rama temporal: demo/2.3-deteccion-controlada\n'
