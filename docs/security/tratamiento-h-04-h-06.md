# Tratamiento de H-04, H-05 y H-06

Fecha: 2026-11-13. Rama: `fix/hallazgos-seguridad` (base `development`, ya con
PR #41 integrado). Alcance: completar la corrección técnica de H-05 y aportar
la de H-06. Esta rama **no cierra los Issues ni aprueba excepciones**: la
clasificación y el cierre siguen requiriendo decisión humana (7.5 con Axel,
5.6 con Pablo).

## Estado de partida

`development` ya integró el PR #41 (`fix/hallazgos-h01-h07`), que resolvió
H-02, H-03, H-04 y la mayor parte de H-05. Por eso esta rama no repite esas
correcciones: se apoya en ellas y solo añade lo que faltaba.

## H-04 — clave TLS de `tests/mail/fixtures` (ya corregido en `development`)

- Los PEM `localhost-key.pem` y `localhost-cert.pem` ya no están versionados.
- `tests/mail/fixtures/localhost-tls.mjs` genera en memoria una identidad TLS
  efímera (ECDSA P-256, `CN=localhost`, SAN `DNS:localhost` e `IP:127.0.0.1`)
  con `@peculiar/x509`.
- Gitleaks deja de encontrar la clave en escaneos nuevos.
- Riesgo residual: el historial de Git conserva los PEM anteriores. Cualquier
  decisión sobre el historial y la reutilización pasada sigue siendo humana
  ([H-04 #30](https://github.com/Dani-develop/larutica-frontend/issues/30)).

## H-05 — avisos `react-hooks/*`

El PR #41 corrigió 66 de los 72 avisos y dejó 6 documentados como aceptados
temporalmente. Esta rama corrige esos 6 restantes:

| Archivo | Corrección |
|---|---|
| `modules/journeys/PlaceSearch.tsx` | El texto del campo se deriva de `value`/`typing`; se elimina el efecto que copiaba el prop al estado y la limpieza síncrona de opciones. |
| `modules/publications/components/EditPublicationPage.tsx` | La pestaña inicial se resuelve en el inicializador de `useState` desde `?tab=`, sin efecto que provoque un render adicional. |
| `modules/publications/components/PublicationDepartures.tsx` | La carga inicial usa promesas con cancelación, sin `setState` síncrono en el efecto. |
| `app/forgot-password/code/ResetCodeForm.tsx` y `new/NewPasswordForm.tsx` | Se conserva una lectura única de `sessionStorage` en el efecto (no disponible antes de hidratar) con una excepción local justificada. |

Con los avisos en cero se retiran las excepciones `react-hooks/refs`,
`set-state-in-effect` y `purity` de `eslint.config.mjs`; vuelven a la severidad
`error`. Evidencia: `npm run lint` termina con **0 errores y 0 avisos
`react-hooks`** (quedan 17 avisos previos `@next/next/no-img-element`).

## H-06 — dependencias y avisos OSV

El PR #41 solo había aplicado el parche urgente de React 19.2.9 y zod. Esta
rama completa la actualización (lockfile regenerado y validado):

| Paquete | Antes | Después | Motivo |
|---|---|---|---|
| `react-server-dom-webpack` | 19.2.9 | 19.3.1 | Crítica: RCE no autenticado en Server Components |
| `react` / `react-dom` | 19.2.9 | 19.3.1 | Coherencia con el runtime RSC |
| `vite` | 8.0.13 | 8.3.8 | High: ejecución de scripts / fuga NTLM |
| `@cloudflare/vite-plugin` | 1.37.1 | 1.69.1 | High: `undici`, `ws`, `sharp`, `miniflare` |
| `wrangler` | 4.92.0 | 4.162.0 | Requerido por el plugin de Cloudflare |
| `image-size` (override) | 2.0.2 | 2.1.0 | High: bucles infinitos en parsers JXL/HEIF/ICNS |
| `@vercel/og` (override) | 0.8.x | 1.0.3 | Moderate: `satori` con escape incorrecto |

Resultado de `npm audit` sobre el árbol fusionado:

- Antes de la actualización completa: 34 avisos (1 crítica, 15 altas).
- Después: **0 críticas y 0 altas**; quedan 15 moderadas, todas en
  herramientas de desarrollo (`typescript-eslint`, `drizzle-kit` y
  transitivas de `vinext`).
- `npm audit --omit=dev`: **0 vulnerabilidades**.
- Las moderadas restantes no tienen versión corregida publicada
  (`typescript-eslint` 8.72.2 es la última estable y sigue dentro del rango
  afectado) o solo se corrigen con un salto mayor de `vinext`.
- Se mantiene `vinext` 1.0.0-beta.2: la actualización a 1.4.5 cambia el
  contrato de render SSR (importa `cloudflare:workers` y exige límites
  `Suspense` en `useSearchParams`), lo que rompía pruebas existentes. Se
  pospone a un cambio dedicado con revisión de ese framework.

## Validación

Ejecutado en la rama fusionada con `development`:

```bash
npm install
npm run build        # correcto
npm test             # 214/214 pruebas correctas (92 + 6 + 40 + 68 + 8)
npm run lint         # 0 errores, 0 avisos react-hooks
npx tsc --noEmit     # sin errores
npm audit            # 0 críticas, 0 altas (15 moderadas de desarrollo)
npm audit --omit=dev # 0 vulnerabilidades
```

No se publican valores de secretos, tokens ni reportes crudos. Las solicitudes
`[E-pendiente]` (#38, #39, #40) siguen sin aprobarse: este documento solo
aporta evidencia para su evaluación.
