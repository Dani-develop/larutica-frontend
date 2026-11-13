# Clasificación inicial de coincidencias — 2.3

Fecha: 2026-11-13. Responsable del análisis: Daniel. Revisión: **pendiente de Frander**.
Base de aplicación: `cf6f1d104a00de0f17e3724ffbf6aa0d9f6cf82b`.
Configuración inicial: `2f4d50c`. Reproducción: `npm run security:secrets`.
Esta es evidencia técnica local para transferir al registro único 7.5 de Axel;
no crea un segundo registro oficial ni asigna IDs H/E antes de coordinarlo.

Gitleaks 8.30.1 devolvió `1` con **5 coincidencias**; el reporte se conserva
localmente en `outputs/security/gitleaks.json`, con redacción del 100 %.
No se incluyen aquí valores detectados ni contenido de claves.

Semgrep CE 1.185.0, tras usar la instantánea: **434 archivos JS/TS**, 4 reglas,
0 coincidencias, 0 errores y código 0. Configuración SAST SHA-256:
`2c29f7713db417d66a5c4a668b55625c17cba2094811190fc9b1ff75cad80dce`.
La demo detectó 1 defecto y 1 secreto ficticio (`1/1`), y después de corregirlos
ambos comandos devolvieron `0/0`. Ninguno de esos resultados aprueba los cinco
casos de Gitleaks ni demuestra cobertura de todos los defectos posibles.

| Ubicación | Regla / cantidad | Evidencia y clasificación propuesta | Tratamiento actual |
|---|---|---|---|
| `lib/supabase/passkey-device-name.ts`, líneas 6, 13, 16 | generic-api-key / 3 | Los tres IDs se contrastaron con `aaguid.json` del registro público de passkeydeveloper el 2026-11-13: Google Password Manager, Apple Passwords (nombre local iCloud Keychain) y 1Password. Son claves de un mapa de nombres, no credenciales de usuario. | Falsos positivos por contexto técnico, pendientes de validación de Frander antes de cualquier supresión. Sin allowlist. |
| `supabase/functions/mail-relay/relay-config.mjs`, línea 1 | generic-api-key / 1 | El valor es un verificador SHA-256, no el token en claro. Una prueba del handler real en memoria confirma que usar ese hash como Bearer devuelve 401 sin abrir SMTP. | No se demuestra filtración del token; falta confirmación del propietario sobre generación segura y exposición previa. Sin conexión al relay real, sin rotación automática y sin exclusión. |
| `tests/mail/fixtures/localhost-key.pem`, línea 1 | private-key / 1 | La clave coincide criptográficamente con el certificado `CN=localhost`, SAN `DNS:localhost, IP Address:127.0.0.1`. Los tests de transporte la usan en TLS/STARTTLS local con certificado verificado. | Material público de pruebas en el repositorio; pendiente de confirmación humana de que no se reutilizó en despliegues. Sin allowlist. |

## Remediación H-04 (clave localhost)

La coincidencia `tests/mail/fixtures/localhost-key.pem` ya no existe en el
árbol de trabajo: los dos PEM se retiraron del repositorio y las pruebas generan
una identidad TLS efímera en tiempo de ejecución con
`tests/mail/fixtures/localhost-tls.mjs`. El material ya no se versiona, por lo
que Gitleaks deja de reportarlo en escaneos nuevos. El historial anterior
permanece y cualquier decisión sobre él sigue siendo humana (ver #29).

## Comprobaciones adicionales reproducibles

```bash
npm run security:context
node --experimental-strip-types --test tests/mail/relay.test.mjs tests/mail/transport.test.mjs
```

El primer comando ejecuta tres pruebas sin red: correspondencia clave/certificado,
rechazo de reutilización del verificador como Bearer y rechazo de peticiones sin
token antes de crear SMTP. No imprime claves ni el hash de verificación.
El segundo ejecutó **24/24 pruebas correctas** usando servicios locales de prueba.
Con Node 22.14 es necesario `--experimental-strip-types`: el intento inicial sin
ese flag no pudo cargar los imports `.ts` y no cuenta como una ejecución aprobada.

Certificado de la fixture original, huella pública SHA-256 (histórica; la
identidad actual se genera por ejecución y su huella cambia):
`88:81:96:1E:71:21:F0:31:50:93:43:7F:8F:59:28:E5:63:05:A9:61:E0:11:27:B4:DB:C9:37:A2:3B:5D:76:34`.
Las referencias encontradas a estos archivos de fixture están en
`tests/mail/transport.test.mjs` y `tests/mail/relay.test.mjs`; esto no prueba
ausencia de reutilización fuera del repositorio.

Fuente pública consultada para los tres AAGUID:
https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/aaguid.json

Frander debe verificar esta clasificación. El propietario del relay debe confirmar,
sin compartir el token, que fue generado con entropía adecuada y no se expuso;
el responsable del entorno debe confirmar que la clave localhost es solo de tests.
Las pruebas locales no pueden acreditar hechos sobre producción o su historial.

## Qué no se afirma

- No se afirma que haya cinco credenciales de producción comprometidas.
- No se afirma que el repositorio esté libre de secretos: el comando no cubre historial ni archivos ignorados.
- No se aprueba ninguna excepción ni se desactiva el bloqueo por estas coincidencias.
- Las clasificaciones propuestas no sustituyen la revisión de Frander ni el registro de Axel.

Si una credencial resultara real, notificar al propietario, revocar/rotar y
comprobar el cierre sin publicar valores. Cualquier supresión futura debe ser
puntual (regla + ubicación/valor o fingerprint), justificada, revisada y probada
con `security:demo` para no desactivar la detección general.
