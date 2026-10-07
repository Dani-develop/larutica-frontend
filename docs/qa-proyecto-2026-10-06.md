# QA general de LaRutica — 6 de octubre de 2026

## Resultado local

Compilación de producción, TypeScript y comprobación del diff correctos. ESLint: 0 errores y 14 avisos sobre imágenes sin optimización.

| Comprobación | Resultado |
| --- | --- |
| Suite general: render de las 30 rutas, contratos de autenticación, proxy, reservas, guardados/calificaciones y caché | 58 pasan |
| Reservas: API real y SQL en PostgreSQL aislado (PGlite) | 41 pasan |
| Flujo de reservas en navegador con respuestas simuladas | 14 pasan |
| Apertura e hidratación de pantallas con visitante y cuatro roles | 49 pasan |
| Login: roles, retorno a la reserva, destino externo rechazado y credenciales incorrectas | 5 pasan |
| Clics de navegación, sesión persistente, cuenta y logout para cuatro roles | 4 pasan |
| Distribución de footer/contenido en escritorio y móvil; errores de Guardados y de logout | 12 pasan |
| **Total** | **183 comprobaciones pasan** |

Los casos de apertura verifican hidratación, ausencia de excepciones, HTTP 500 y pantalla vacía. No equivalen a probar todos los formularios con todos los datos posibles. Los navegadores usan perfiles temporales y respuestas simuladas. No se crearon registros ni cuentas en Supabase real.

## Correcciones

- Exportación Home e imports duplicados del login; router/searchParams sin declarar e iconos ausentes.
- Login y registro esperan la inicialización de la sesión; formularios usan POST, evitando enviar contraseñas en la URL antes de hidratarse.
- Retorno tras login compatible con reservas públicas y las pantallas de Mi viaje.
- Landing muestra Mi cuenta y Cerrar sesión al autenticarse. Si el logout falla, conserva la cuenta y permite reintentar.
- Menú administrativo de escritorio y móvil, catálogo y enlaces de reservas usan navegación interna.
- Calificaciones se incluyen en el DTO de reservas; controles estáticos, efectos y tipos de servicios corregidos.
- Tipos del entorno Worker generados con Wrangler; se excluye de lint únicamente código generado.
- Footer al fondo de páginas cortas, después del contenido largo; ayuda dentro del footer sin tapar enlaces. Controles de reservas alineados y menú móvil sin desbordamiento.
- Guardados no afirma que el listado está vacío cuando la carga falla; mensajes comprensibles para el viajero.

## Peticiones y rendimiento

En el recorrido administrativo medido antes del arreglo, se recargó el documento y se consultó la sesión cinco veces. Después: una carga inicial de documento y una consulta de sesión para todo el recorrido. La segunda visita a Usuarios reutiliza el resultado; Guardados y Publicaciones también evitan consultas repetidas en las navegaciones ensayadas.

La caché vive solo en memoria de la pestaña durante 10 segundos. Comparte peticiones GET simultáneas, entrega respuestas independientes y se invalida antes/después de cambios y al aplicar una sesión. No guarda errores ni respuestas de autenticación; no comparte solicitudes con señal de cancelación. Ocho pruebas cubren estas condiciones, incluida una consulta antigua que termina después de una mutación.

Las mediciones del navegador usaron respuestas simuladas con 100 ms de demora. No miden la latencia real de Sites o Supabase; la mejora comprobada es la reducción de recargas y peticiones. Los cambios de disponibilidad se validan nuevamente en el servidor al reservar.

## Pendiente del backend configurado

Una lectura sin sesión a `http://localhost:3000/api/traveler/saved` devolvió **404 y HTML**, no la respuesta JSON de autenticación que debe devolver la ruta implementada. La función Guardados no está disponible en el backend configurado. Hay que comprobar/publicar su versión de Sites y verificar las migraciones de guardados/calificaciones y reintentos de reservas en Supabase. Esta tarea no publicó Sites ni ejecutó migraciones en producción. El usuario autorizó publicar al final, pero `write_stdin` fue rechazado por la política de aprobación de la sesión (`Granular.sandbox_approval=false`) al enviar el JSON al publicador oficial. Se concedieron permisos de red y carpeta mediante request_permissions; la restricción de write_stdin continuó. La versión publicada confirmada por get_site sigue siendo la 10.

Además, la landing conserva vistas del prototipo con datos de ejemplo y la reserva antigua de transporte usa un almacén del navegador. Las pruebas del flujo persistente de reservas corresponden a las experiencias publicadas y sus APIs; no demuestran persistencia de esas vistas del prototipo.

## Repetir los controles

Desde la carpeta larutica-frontend:

- `npm.cmd test`
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- Con Node 24: `node --import ./tests/qa/loader.mjs --test tests/qa/reservations.isolated.test.mjs` (PGlite usa la ruta local indicada en ese archivo).
- Para reservas en navegador: iniciar Vite con `node node_modules/vite/bin/vite.js --config tests/qa/vite.config.mjs`, ejecutar `node tests/qa/reservations.browser.mjs` y detener ese Vite.
- Con el proyecto en localhost:3000: ejecutar los scripts `project.browser.mjs`, `auth.browser.mjs`, `navigation.browser.mjs` y `layout.browser.mjs` de `tests/qa`. Requieren Chrome y Playwright en las rutas locales indicadas.

No usar los scripts de integración cloud para repetir esta QA aislada: pueden acceder a Supabase real.

La alineación de los botones Por venir/Historial se verifica contra la coordenada izquierda del título en anchos de 390, 1440 y 1751 píxeles; se mantiene el mismo máximo de 1320 píxeles y los márgenes automáticos del contenido.
