# Tratamiento de hallazgos H-01 a H-07

Fecha: 2026-11-13 · Base: `development` (`e5719da`) · Registro oficial: GitHub Issues #25, #29–#34.

Este documento conserva la evidencia técnica de cada tratamiento. No reproduce secretos,
tokens, contraseñas, cookies ni datos personales. La decisión de cierre sigue siendo humana:
el merge del PR que lo introduce es la aprobación de las correcciones; los hallazgos que
dependen de otra persona o de otra ejecución quedan abiertos y se indica qué falta.

## Resumen

| ID | Issue | Tratamiento en este cambio | Estado propuesto |
|---|---|---|---|
| H-01 | #25 | Sin cambio: depende de una ejecución exitosa de ZAP en el PR #24 | Pendiente |
| H-02 | #31 | Excepción Gitleaks acotada (regla + archivo + forma UUID) | Falso positivo, verificado |
| H-03 | #29 | Excepción Gitleaks acotada (regla + archivo + línea exacta); historial completo revisado | Falso positivo, verificado; rotación a criterio del propietario |
| H-04 | #30 | **Corregido**: clave privada eliminada del repositorio; TLS de pruebas efímero | Corregido |
| H-05 | #34 | **Corregido** 66 de 72 avisos; 6 aceptados temporalmente con justificación | Corregido parcialmente / aceptado |
| H-06 | #33 | SCA local con `npm audit`; parche del RCE crítico de React (19.2.9) y de zod | Pendiente del artefacto CI (PR #20) |
| H-07 | #32 | Investigación técnica de AI-02 aportada; AI-01 y AI-03 requieren a Pablo | Pendiente de decisión humana |

## Gitleaks (H-02, H-03, H-04)

Comando reproducible (misma versión y configuración que `scripts/security/install.sh`):

```bash
npm run security:secrets   # gitleaks 8.30.1, archivos versionados, --redact=100
```

- Antes (`development`, `e5719da`): 5 coincidencias — 3 `generic-api-key` en
  `lib/supabase/passkey-device-name.ts`, 1 `generic-api-key` en
  `supabase/functions/mail-relay/relay-config.mjs`, 1 `private-key` en
  `tests/mail/fixtures/localhost-key.pem`.
- Después: `no leaks found`.
- Historial: `gitleaks git` sobre un espejo con **todas** las ramas (290 commits) devuelve
  exactamente las mismas 5 coincidencias y ninguna otra. Ningún commit contiene el token del
  relay en claro.

### Precisión de las excepciones

`.gitleaks.toml` no tiene allowlist global. Cada excepción exige a la vez la regla
`generic-api-key`, la ruta exacta y la forma exacta del valor (`condition = "AND"`). Prueba
negativa ejecutada sobre una copia: añadir una clave genérica no UUID en
`passkey-device-name.ts` y copiar la misma huella SHA-256 a otro archivo produce **2
coincidencias** — ambas siguen bloqueando.

### H-02 — AAGUID de passkeys

Los valores son AAGUID (identificadores públicos del *modelo* de autenticador, publicados en
<https://github.com/passkeydeveloper/passkey-authenticator-aaguids>). La regla genérica se
activa porque el nombre del proveedor contiene palabras clave (`Password`, `Keychain`). No dan
acceso a nada. Clasificación: **falso positivo**.

### H-03 — Huella del token del relay

`relay-config.mjs` contiene `tokenHash`, el SHA-256 del token, no el token. Evidencia:

1. `tests/security/local-context.test.mjs` demuestra que usar la huella como `Bearer` contra el
   handler real devuelve 401 sin abrir SMTP.
2. Ningún valor de `MAIL_RELAY_TOKEN` presente en archivos versionados produce esa huella
   (comprobación por hash; no se imprimió ningún valor).
3. El historial completo no contiene el token en claro (ver arriba).

Clasificación: **falso positivo**. Una huella SHA-256 sólo es atacable por fuerza bruta si el
token tiene poca entropía; el propietario (Axel) debe confirmar que se generó aleatoriamente
(p. ej. `openssl rand -hex 32`). Si no puede confirmarlo, rotar según
`docs/qa-correo-2026-10-20.md` (actualizar `MAIL_RELAY_TOKEN` y la huella, redesplegar).

### H-04 — Clave privada de pruebas localhost

**Corregido.** Se eliminaron `tests/mail/fixtures/localhost-key.pem` y `localhost-cert.pem`.
`tests/mail/fixtures/localhost-tls.mjs` genera en memoria, una vez por proceso, una clave
ECDSA P-256 y un certificado autofirmado `CN=localhost`, SAN `DNS:localhost, IP:127.0.0.1`,
válido 24 h. Nunca se escribe en disco. Se usa `@peculiar/x509` (ya presente en el árbol vía
`@simplewebauthn/server`; ahora fijado como dependencia de desarrollo `2.1.0`), por lo que
funciona igual en Linux y Windows sin depender de `openssl`.

La clave anterior permanece en el historial de Git, pero sólo era material de pruebas y ya no
la usa ningún test ni configuración; confiar en ella exigiría añadirla como CA. Falta sólo que
Axel confirme que no se reutilizó en ningún despliegue.

Pruebas: `npm run security:context` (3/3) y `npm run test:mail` (TLS, STARTTLS, certificado no
confiable y relay HTTPS→SMTP TLS) pasan con el material efímero.

## H-05 — Avisos `react-hooks`

`npx eslint .` antes: 72 avisos `react-hooks/*` (63 `refs`, 7 `set-state-in-effect`,
2 `purity`). Después: **6**.

| Archivo | Corrección |
|---|---|
| `modules/journeys/JourneyEditor.tsx` (62) | El recorrido vacío inicial pasa de `useRef().current` leído en render a `useState(emptyJourney)`. Las refs "último valor" (`current`, `change`) se actualizan en `useLayoutEffect`, que corre tras el commit y antes de los efectos pasivos y de cualquier evento, así que los callbacks asíncronos siguen leyendo el valor más reciente. |
| `modules/journeys/JourneyMap.tsx` (2) | Mismo patrón para `latest`; el reinicio de `ready`/`error` se mueve del efecto al botón "Reintentar mapa" (el estado inicial ya es el de reinicio). |
| `AgencyPromotionsPage.tsx`, `PromotionPaymentPage.tsx` (2) | `Date.now()` en render pasa a `useState(() => Date.now())`: instante de referencia fijado al montar. |

Aceptados temporalmente (revisión: 2026-12-11, responsable: Axel). Son sincronizaciones
legítimas con sistemas externos; corregirlos exige rediseñar el componente, no silenciarlo:

| Archivo | Motivo |
|---|---|
| `app/forgot-password/code/ResetCodeForm.tsx`, `app/forgot-password/new/NewPasswordForm.tsx` | Leen `sessionStorage` tras la hidratación; leerlo en render provoca discrepancia SSR/cliente. Alternativa futura: `useSyncExternalStore`. |
| `modules/journeys/PlaceSearch.tsx` (2) | Sincroniza el texto con el `value` controlado y reinicia la búsqueda; requiere separar estado controlado/no controlado. |
| `modules/publications/components/EditPublicationPage.tsx` | Sincroniza la pestaña activa con `?tab=` de la URL. |
| `modules/publications/components/PublicationDepartures.tsx` | Carga de datos en efecto (`loading=true` síncrono). |

No se añadió ningún `eslint-disable`. Los 17 avisos `@next/next/no-img-element` no son de
`react-hooks` y quedan fuera de H-05.

## H-06 — SCA

- OSV-Scanner 2.7.1 no pudo consultarse desde el entorno local de esta revisión (API
  bloqueada por la red); el artefacto CI sólo existirá cuando el workflow del PR #20
  (`seguridad-<sha>`) corra sobre `development`.
- `npm audit` (registro npm, 2026-11-13) sobre `development`: 34 avisos con dependencias de
  desarrollo (1 crítico, 15 altos), 1 alto en producción (`zod <4.6.6`).
- El crítico es `react-server-dom-webpack 19.2.6` (GHSA-xqc2-xf4c-x3h3, RCE no autenticado
  en React Server Components). Aunque está declarado como dependencia de desarrollo, el
  runtime RSC se empaqueta en el servidor desplegado, por lo que **sí afecta producción**.
  Este cambio actualiza `react`, `react-dom` y `react-server-dom-webpack` a `19.2.9` (parche
  corregido de la misma línea 19.2) y `zod` a `4.6.7`.
- Después: `npm audit --omit=dev` = 0; total 32 (0 críticos, 14 altos, 17 moderados, 1 bajo).
- Los avisos restantes requieren saltos mayores (`vinext` beta → 1.4, `@cloudflare/vite-plugin`,
  `wrangler`, `vite`) y se dejan para Renovate/PRs dedicados.

H-06 no se cierra hasta adjuntar el run CI de OSV y clasificar lo que reporte.

## H-07 — Observaciones de la revisión IA (2.6)

AI-01 y AI-03 requieren la decisión de Pablo (validación de controles contra evidencia y
revisión visual en Threat Dragon). Sobre AI-02 ("registrar quién inició cancelaciones"): en este
repositorio las cancelaciones (`modules/booking/Reservations.tsx`,
`ReservationManagement.tsx`, `checkout.service.ts`, `publication.service.ts`) sólo envían la
petición al API remoto (`/api/...`); el frontend no persiste actor, operación ni resultado.
La traza, si existe, debe verificarse en el backend. Hasta entonces AI-02 es una limitación
del alcance de este repositorio, no un control verificado.

## H-01 — DAST autenticado

Sin cambios aquí: el plan y el workflow viven en el PR #24 (rama de Axel, base `main`), cuyo
job falla en `spiderAjax`. Se cierra con un run exitoso y su reporte HTML.
