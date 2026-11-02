# LaRutica en Vercel

La prueba parte de `origin/main` `7ab31b32f324ac9988cba08e252e5c42af5f66b7`.
Proyecto: `larutica-preview`. URL de revisión: https://larutica-cr.vercel.app.
Esta URL está vinculada a Production del fork; Sites se conserva sin modificaciones.

## Compilación

- `npm ci`
- `npm run build:vercel`

La configuración independiente `vite.vercel.config.ts` usa Vinext con Nitro y
genera `.vercel/output`. `vite.config.ts` y los comandos habituales de Sites no
cambian. El servidor de Vercel usa Node 24. Compilar en Vercel/Linux: el paquete
precompilado en Windows pasó la compilación, pero falló al renderizar las páginas
en Vercel. La compilación remota sí respondió correctamente.

## Variables

Configurar en Vercel, nunca en Git:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- `GEOAPIFY_API_KEY` (también se admite el nombre existente `GEOAPIFY`).
- `DEEPSEEK_API_KEY`.
- `ONVO_TEST_API_KEY`, `ONVO_PUBLISHABLE_KEY`, `ONVO_WEBHOOK_SECRET`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- `LARUTICA_REMOTE_API_ORIGIN` vacío para ejecutar todas las API en Vercel.

Las quince variables de la aplicación están habilitadas en Production y Preview.
Gmail rechaza las credenciales SMTP actuales con 535/EAUTH: se necesita una
contraseña de aplicación válida para el usuario SMTP configurado.
Los secretos no se pueden exportar desde Sites.

Preview actualmente consulta la misma base de Supabase que el proyecto local:
no es una base de datos aislada. Las pruebas que crean o cancelan reservas,
envían correos o cobran deben usar cuentas y datos de prueba identificados.

## Conexión futura con GitHub

El proyecto está conectado al fork `Dani-develop/larutica-frontend`.
Los cambios se publican desde `main` de ese fork. Sincronizarlo explícitamente
cuando se incorporen cambios del repositorio original.

1. Mantener conectado `Dani-develop/larutica-frontend` al proyecto de Vercel.
2. Seleccionar `main` como rama de producción y la raíz del repositorio.
3. Mantener `npm ci` y `npm run build:vercel`, definidos en `vercel.json`.
4. Asignar el dominio limpio al proyecto y al destino de producción.
5. Revisar las URL de retorno de Supabase y la URL/secret del webhook de Onvo.
   Usar claves de Onvo de prueba hasta completar la validación del pago.

Los cambios en otras ramas podrán generar Preview; los de `main`, producción.

## Navegación del build de producción

El build del navegador conserva `preserveEntrySignatures: 'strict'` y los
nombres de exports internos. Sin esto, Rolldown fusionaba `navigation.js` con
la entrada y eliminaba exports que `next/link` carga dinámicamente. La página
se renderizaba, pero los clics fallaban con `is not a function` y errores de
precarga RSC. La opción solo afecta al destino Vercel.

Después de compilar/publicar, ejecutar `npm run test:vercel` con
`LARUTICA_TEST_URL` apuntando al despliegue accesible. La prueba recorre enlaces,
detalle, recarga, login, registro y atrás; falla ante errores del router. No
crea reservas ni cuentas. No sustituye la prueba autenticada de pagos/webhook.

## Verificación realizada

- Compilación remota Linux de Vercel: correcta.
- 22 pruebas de contratos de autenticación, retorno de reservas y pagos: correctas.
- 23 pruebas aisladas SMTP/diagnóstico: correctas.
- TypeScript y build Vercel: correctos.
- Landing, login, catálogo, tipos de cambio y mosaicos de mapas: HTTP 200.
- Sesión y administración sin autenticar: HTTP 401, como corresponde.
- Navegador compilado y Vercel: enlaces, detalle, mapa, login, registro, Atrás
  y cambio de idioma funcionan sin el error del router original.
- Integración contra Vercel: login, perfil, permisos Admin/Viajero, CRUD de
  usuarios temporales y cierre de sesión correctos.
- Integración contra Vercel: reserva confirmada automáticamente, reintento
  idempotente, control de cupo/permisos, cancelación y recuperación de cupo correctos.
- Onvo: preparación de checkout correcta desde Vercel. No se introdujo tarjeta
  ni se realizó cobro. Los datos temporales de las pruebas fueron eliminados.
- Correo real desde Vercel: Gmail responde 535/EAUTH en 587 y 465; cero mensajes
  aceptados. Las pruebas SMTP locales no prueban la validez de las credenciales.
- Pendientes: recepción real de correo con credenciales válidas y transacción
  completa con tarjeta de prueba/webhook de Onvo. La preparación del checkout
  no equivale a un pago completado.

Vercel conserva su configuración de protección. Las correcciones se publicaron
únicamente en `Dani-develop/larutica-frontend`; no en el main original de FranderCT.
