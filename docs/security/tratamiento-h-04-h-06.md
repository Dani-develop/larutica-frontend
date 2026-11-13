# Tratamiento de H-04, H-05 y H-06

Fecha: 2026-11-13. Rama: `fix/hallazgos-seguridad` (base `development`).
Alcance: correcciones técnicas de los hallazgos abiertos; no cierra los
Issues ni aprueba excepciones. La clasificación y el cierre siguen requiriendo
decisión humana (Axel para 7.5, Pablo para 5.6).

## H-04 — clave TLS de `tests/mail/fixtures`

- Se eliminaron `tests/mail/fixtures/localhost-key.pem` y
  `localhost-cert.pem` del repositorio.
- Las pruebas generan ahora una identidad TLS efímera en tiempo de ejecución
  con `tests/mail/fixtures/localhost-tls.mjs` (dependencia de desarrollo
  `selfsigned`): CN `localhost`, SAN `DNS:localhost, IP Address:127.0.0.1`.
- `tests/mail/transport.test.mjs`, `tests/mail/relay.test.mjs` y
  `tests/security/local-context.test.mjs` usan el fixture generado.
- Resultado: `node --experimental-strip-types --test` sobre esas tres suites,
  **27/27 pruebas correctas**. Gitleaks deja de encontrar la clave en escaneos
  nuevos.
- Riesgo residual: el historial de Git conserva los PEM anteriores. Cualquier
  decisión sobre el historial y sobre la reutilización pasada sigue siendo
  humana ([H-04 #30](https://github.com/Dani-develop/larutica-frontend/issues/30)).

## H-05 — avisos `react-hooks/*`

Se corrigieron los 72 avisos sin desactivar las reglas:

| Archivo | Corrección |
|---|---|
| `modules/journeys/JourneyEditor.tsx` | `emptyJourney()` en `useState`; los espejos `current`/`change` se sincronizan en `useEffect`, no durante el render. |
| `modules/journeys/JourneyMap.tsx` | `latest.current` se actualiza en `useEffect`; el reinicio de `ready`/`error` se mueve al botón de reintento. |
| `modules/journeys/PlaceSearch.tsx` | El texto del campo se deriva de `value`/`typing`; se elimina el efecto que copiaba el prop al estado y la limpieza síncrona de opciones. |
| `modules/promotions/components/AgencyPromotionsPage.tsx` | `Date.now()` se captura una vez con un inicializador de estado. |
| `modules/promotions/components/PromotionPaymentPage.tsx` | Igual: `Date.now()` estable por montaje. |
| `modules/publications/components/EditPublicationPage.tsx` | La pestaña inicial se resuelve en el inicializador de `useState` desde `?tab=`. |
| `modules/publications/components/PublicationDepartures.tsx` | La carga inicial usa promesas con cancelación, sin `setState` síncrono en el efecto. |
| `app/forgot-password/code/ResetCodeForm.tsx` y `new/NewPasswordForm.tsx` | Se conserva una lectura única de `sessionStorage` en el efecto (no disponible antes de hidratar) con una excepción local justificada. |

Se retiraron las excepciones `react-hooks/refs`, `set-state-in-effect` y
`purity` de `eslint.config.mjs`; vuelven a la severidad `error`.
Evidencia: `npm run lint` termina con **0 errores y 0 avisos `react-hooks`**
(quedan 17 avisos previos `@next/next/no-img-element`).

## H-06 — dependencias y avisos OSV

Actualizaciones aplicadas (lockfile regenerado y validado):

| Paquete | Antes | Después | Motivo |
|---|---|---|---|
| `react-server-dom-webpack` | 19.2.6 | 19.3.1 | Crítica: RCE no autenticado en Server Components |
| `react` / `react-dom` | 19.2.6 | 19.3.1 | Coherencia con el runtime RSC |
| `vite` | 8.0.13 | 8.3.8 | High: ejecución de scripts / fuga NTLM |
| `@cloudflare/vite-plugin` | 1.37.1 | 1.69.1 | High: `undici`, `ws`, `sharp`, `miniflare` |
| `wrangler` | 4.92.0 | 4.162.0 | Requerido por el plugin de Cloudflare |
| `image-size` (override) | 2.0.2 | 2.1.0 | High: bucles infinitos en parsers JXL/HEIF/ICNS |
| `@vercel/og` (override) | 0.8.x | 1.0.3 | Moderate: `satori` con escape incorrecto |

Resultado de `npm audit`:

- Antes: 34 avisos (1 crítica, 15 altas, 17 moderadas, 1 baja).
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

Ejecutado en la rama:

```bash
npm ci
npm run build        # correcto
npm test             # 214/214 pruebas correctas (92 + 6 + 40 + 68 + 8)
npm run lint         # 0 errores
npx tsc --noEmit     # sin errores
npm audit --omit=dev # 0 vulnerabilidades
```

No se publican valores de secretos, tokens ni reportes crudos. Las solicitudes
`[E-pendiente]` (#38, #39, #40) siguen sin aprobarse: este documento solo
aporta evidencia para su evaluación.
