# Análisis local — ítem 2.3 (Daniel)

## Preparación reproducible

Requisitos: Linux x86_64 o Windows con WSL Ubuntu, Python 3, Git, curl y tar.
No se necesita Docker, cuenta Semgrep, token ni permisos de administrador.

```bash
# Linux
bash scripts/security/install.sh
# Windows / PowerShell
wsl -d Ubuntu -- bash scripts/security/install.sh
```

Instala Semgrep CE **1.185.0** en un entorno virtual aislado y Gitleaks
**8.30.1** en `~/.local/share/larutica-security`. Verifica el SHA-256 publicado
del binario de Gitleaks. Semgrep se instala desde PyPI con versión fija;
sus dependencias transitivas no tienen un lockfile con hashes (limitación).
Se requiere red para instalar; no se envía código a una plataforma de análisis.
Para actualizar versiones hay que revisar configuración, demo y documentación.

Desde la raíz del repositorio, en Linux o PowerShell:

```bash
npm run security:code
npm run security:secrets
npm run security:local
npm run security:demo
```

El runner de Windows utiliza Ubuntu en WSL; no busca Docker ni ejecuta
comandos PowerShell interpolados. Los reportes quedan en `outputs/security/`
(ignorado por Git). No subir los reportes crudos sin revisar su contenido.

## Alcance y tratamiento

| Analizador | Alcance | Qué exige corrección |
|---|---|---|
| Semgrep CE | JS/TS/JSX/TSX versionados, reglas locales de `.semgrep.yml`: eval, constructor Function, ciertos imports de exec de child_process en aplicación y desactivación explícita de validación TLS | Todos los resultados de estas reglas bloquean (ERROR); investigar y corregir o tramitar una excepción humana concreta. |
| Gitleaks | Reglas oficiales por defecto; instantánea de TODOS los archivos versionados, incluyendo cambios locales en ellos | Cualquier coincidencia requiere investigación. Si es real: revocar/rotar primero; no basta borrar. Un falso positivo necesita evidencia y revisión antes de permitirlo. |

Semgrep CE no es auditoría completa: análisis local de patrones, no flujo
interarchivo ni cobertura de todas las clases OWASP. La regla de shell no
cubre todos los alias, require o variantes de exec. Los tests y scripts no
se excluyen globalmente de SAST. Gitleaks no analiza archivos no versionados
ni el historial Git en este comando; un secreto borrado en commits anteriores
puede seguir expuesto. Un análisis de historial separado es necesario antes
de afirmar ausencia histórica de secretos. No se configura una allowlist global.

Ambos analizadores usan una instantánea temporal de `git ls-files`, con el
contenido actual de los archivos. Antes de analizar archivos nuevos, añadirlos
con `git add <ruta>`. No recorren `node_modules` en el montaje Windows/WSL;
la instantánea también evita que los secretos locales entren accidentalmente.

`.env.local` y `.dev.vars` están ignorados; el runner de Gitleaks no los copia.
Si alguien los fuerza con `git add -f`, pasan a estar en alcance: no se deben
excluir por nombre para ocultar una exposición. Semgrep excluye esos archivos
locales y las salidas generadas mediante `.semgrepignore`.

## Códigos de salida y prueba controlada

- `0`: ejecución correcta sin coincidencias dentro del alcance.
- Semgrep `1`: coincidencias (`--error`); otros errores/parsing inválido fallan con `--strict`.
- Gitleaks `1`: detecciones; fallos operativos también pueden ser no cero.
  Ante error o reporte ausente, el resultado es **incompleto**, nunca aprobado.
- `security:local` se detiene ante el primer fallo. Ejecutar ambos comandos
  individualmente para obtener los dos resultados cuando el primero falla.

`security:demo` crea un repositorio temporal con la rama
`demo/2.3-deteccion-controlada`. Genera un dato ficticio derivado de una etiqueta
pública y un uso de eval, sin ejecutar ese código. Comprueba los códigos `1/1`,
los corrige y exige `0/0`. El dato ficticio nunca entra en las ramas del proyecto
ni en `main`; el repositorio temporal se elimina al finalizar. Los reportes de
Gitleaks se producen con `--redact=100`. No compartir valores originales.

## Revisión

Frander debe reproducir instalación, análisis y demo. No marcar el ítem Listo
solo porque existe configuración o porque se ejecutó la demo: el análisis real,
los hallazgos y la revisión se documentan por separado.
