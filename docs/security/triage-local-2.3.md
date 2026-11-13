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
| `lib/supabase/passkey-device-name.ts`, líneas 6, 13, 16 | generic-api-key / 3 | Son AAGUID públicos de proveedores WebAuthn usados como claves de un mapa de nombres; no autentican usuarios. Referencia pública: https://github.com/passkeydeveloper/passkey-authenticator-aaguids | Propuesta: falsos positivos, pendiente de revisión. No se ha añadido allowlist. |
| `supabase/functions/mail-relay/relay-config.mjs`, línea 1 | generic-api-key / 1 | El valor es un hash de verificación, no el token en claro. `handler.mjs` calcula SHA-256 del Bearer recibido antes de comparar. No demuestra que la preimagen sea fuerte ni que el token jamás se haya expuesto. | Pendiente de investigación/revisión del responsable del relay. Sin probar tokens contra servicios reales, sin rotación automática y sin exclusión. |
| `tests/mail/fixtures/localhost-key.pem`, línea 1 | private-key / 1 | Clave privada publicada como fixture de TLS localhost. Referenciada por `tests/mail/transport.test.mjs` y `relay.test.mjs`; `.gitignore` documenta el uso exclusivo de pruebas. | Propuesta: material público de pruebas, pendiente de confirmar que no se reutiliza fuera de tests. No se ha añadido allowlist. |

## Qué no se afirma

- No se afirma que haya cinco credenciales de producción comprometidas.
- No se afirma que el repositorio esté libre de secretos: el comando no cubre historial ni archivos ignorados.
- No se aprueba ninguna excepción ni se desactiva el bloqueo por estas coincidencias.
- Las clasificaciones propuestas no sustituyen la revisión de Frander ni el registro de Axel.

Si una credencial resultara real, notificar al propietario, revocar/rotar y
comprobar el cierre sin publicar valores. Cualquier supresión futura debe ser
puntual (regla + ubicación/valor o fingerprint), justificada, revisada y probada
con `security:demo` para no desactivar la detección general.
