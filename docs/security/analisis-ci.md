# Análisis de seguridad en CI — 3.2 (Daniel)

Workflow: `.github/workflows/security.yml`. No modifica el workflow 3.1 de
Frander. Se activa en PR a `main`/`development`, push a esas ramas o manualmente.
Las acciones están fijadas a commits de sus releases v7, con `contents: read`,
sin credenciales persistentes, sin `pull_request_target` ni secretos.

## Política de bloqueo

| Control | Configuración / alcance | Bloqueo |
|---|---|---|
| SAST | Semgrep CE 1.185.0 y reglas **del 2.3**, sobre archivos versionados | Cualquier coincidencia; se usa `--error --strict`. Errores, cero archivos o reporte inválido: incompleto. |
| Secretos | Gitleaks 8.30.1, reglas por defecto del 2.3, instantánea versionada, `--redact=100` | Cualquier coincidencia (`1`), sin supresiones automáticas. No incluye historial ni archivos ignorados. |
| SCA | OSV-Scanner 2.7.1, `package-lock.json`, `--all-packages` | **Cualquier vulnerabilidad reportada**, también en dependencias de desarrollo y sin umbral que oculte severidad desconocida. `1` bloquea; otros errores o cero paquetes: incompleto. |

OSV consulta bases públicas enviando nombres/versiones de paquetes; no necesita
el código de aplicación, token ni `npm ci`. Requiere red. Un fallo de consulta
no se interpreta como ausencia de vulnerabilidades. `npm run security:verify`
permanece complementario: no reemplaza OSV. No se ejecuta `osv-scanner fix`,
`npm audit fix`, actualizaciones ni cambios de dependencias automáticamente.

El trabajo falla si falla **cualquier paso**. Los tres análisis se intentan
aunque otro haya fallado (si terminó la instalación). No hay `continue-on-error`,
`|| true` ni política de solo advertencias. Una instalación fallida deja el
trabajo fallido; el gate reporta los análisis ausentes como incompletos.

`security:gate` comprueba estructura de reportes, código de salida, SHA-256 del
archivo y coincidencia con el commit actual. Rechaza ejecuciones con cambios
versionados sin commit. No acepta reportes antiguos como sustituto de ejecutar.
Los runners borran únicamente su reporte/recibo anterior antes de empezar.
Las pruebas de esta política están en `tests/security/gate.test.mjs`.

## Artefactos y privacidad

El gate crea `outputs/security/ci/{semgrep,gitleaks,osv}.json` con estado,
conteos, ubicaciones/reglas o paquetes/advisories, commit, fechas y hash del
reporte original. **No** copia snippets, claves, Match, Secret, metavariables ni
diagnósticos que podrían contener datos sensibles. Los tres reportes sanitizados
se conservan como `seguridad-<sha>-<intento>` durante 14 días, incluso con
hallazgos o análisis incompletos. Ausencia de artefactos es un error, no aprobado.
Los originales quedan solo en el runner/local; no se incluyen en el artefacto.

## Reproducir localmente

Primero instalar 2.3; después:

```powershell
wsl -d Ubuntu -- bash scripts/security/install-osv.sh
npm run test:security
# Ejecutar por separado para que un fallo no impida obtener los otros reportes.
npm run security:code
npm run security:secrets
npm run security:deps
npm run security:gate
```

En Linux: `bash scripts/security/install-osv.sh`. Para evidencia asociada al
commit, hacer commits de los cambios y ejecutar desde un árbol limpio. Los
reportes quedan ignorados por Git; no subirlos manualmente sin revisión.

## Qué falta fuera del trabajo local

- Ejecutar GitHub Actions después del push y enlazar ejecución/artefactos reales.
- Revisar coincidencias de Gitleaks con Frander y resultados SCA con Axel.
- Configurar este check como obligatorio en protección de ramas (responsabilidad
  del ítem 3.5 de Pablo): un workflow fallido por sí solo no impide un merge si
  GitHub no exige ese check.
- No hay bypass de excepciones automático. Una excepción aprobada debe ser
  concreta, vigente y revisada antes de cualquier cambio de política. Una
  ejecución ausente, fallida operativamente o sin evidencia no puede exceptuarse.
