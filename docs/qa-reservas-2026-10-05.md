# QA aislado de reservas — 5 de octubre de 2026

Resultado final: 61 comprobaciones aprobadas, 0 fallos, 0 omitidas.
47 pruebas de API/reglas/SQL y contratos existentes; 14 escenarios en Chrome
sin interfaz, sobre los componentes reales ExperienceDetail y Reservations.

## Método y fuentes

Se ejecutaron las rutas reales de reservas y catálogo, las reglas de permisos
y las funciones SQL de las migraciones 202609220002 y 202610050001. PGlite
(PostgreSQL en memoria) alojó exclusivamente datos ficticios. Un adaptador de
prueba sustituyó Supabase/PostgREST; la sesión y el proxy se sustituyeron por
actores ficticios. La red queda prohibida en la suite de API. Las pantallas
reciben respuestas simuladas e interceptadas; no cargan credenciales reales.

Criterios de referencia:
- OWASP, pruebas de lógica de negocio: validación, integridad, reintentos,
  permisos y pasos omitidos/reordenados.
  https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/
- OWASP, Business Logic Security: proteger las transiciones del flujo.
  https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html
- PostgreSQL, bloqueos explícitos y SELECT FOR UPDATE.
  https://www.postgresql.org/docs/18/explicit-locking.html

## Cobertura

- Reservar a nombre propio con Viajero, Agencia, Transporte y Admin.
- Visitante sin sesión, redirección al login conservando su selección y rechazo
  de redirecciones externas; el login real no forma parte de esta suite.
- Cupos compartidos, último cupo, exceso de personas, cero, negativos,
  decimales, texto y valores fuera del rango de PostgreSQL.
- Reserva propia activa, reserva ajena, cambio de cuenta, reintento, doble clic,
  respuesta fallida y recuperación sin perder la selección.
- Ejecuciones simultáneas: dos reintentos del mismo pasajero y dos pasajeros
  solicitando el último cupo. PGlite serializa la ejecución SQL; esto verifica
  el resultado bajo esa ejecución, no carreras entre conexiones independientes.
- Manipulación de pasajero, precio, publicación y estado; origen ajeno y JSON
  incorrecto; lectura y modificaciones de reservas ajenas.
- Solicitar, confirmar por el organizador, rechazar/cancelar, liberar cupos,
  volver a reservar, repetir confirmación/cancelación y modificar personas.
- No confirmar una reserva personal en otro proveedor desde una cuenta Agencia.
- Salidas pasadas, instante de inicio, canceladas/completadas y proveedores o
  publicaciones sin aprobación. Historial separado, pendientes vigentes y
  solicitudes antiguas primero en el panel.
- Catálogo sin eventos pasados; detalle histórico accesible; mensajes simples
  y recuperación cuando no hay fechas, cupos o falla una consulta.

## Correcciones realizadas

1. Cantidades enormes provocaban error interno: ahora se rechazan antes de SQL.
2. JSON mal formado provocaba error interno: ahora recibe respuesta 400 útil.
3. Se podía confirmar una solicitud de una salida cancelada: se impide en API
   y pantalla; las reservas de esa salida se muestran en Historial.
4. La función SQL dependía de una comprobación previa de agencia en la API:
   ahora verifica también la aprobación al momento de crear.
5. Cambiar personas y estado en la misma petición se rechaza explícitamente,
   para evitar cambios parciales si una segunda operación falla. Las acciones
   de la pantalla ya envían un cambio a la vez.
6. Se actualizaron dos contratos antiguos que todavía suponían reservas solo
   para Viajero y la consulta anterior por listas de IDs.

## Límites y pendientes

No se utilizó ni modificó Supabase real ni se publicó a Sites. No se certifica
que todos los casos posibles estén cubiertos. No se probaron login real,
expiración real de cookies, entrega de correos, móviles/navegadores diferentes,
accesibilidad completa, rendimiento, PostgREST real ni carreras distribuidas
con múltiples conexiones PostgreSQL. El adaptador de consulta no sustituye
una prueba de integración contra Supabase.

La migración 202610050001_reservation_retries.sql continúa pendiente de
aplicación en Supabase. Debe aplicarse antes de desplegar esta versión. Luego
conviene una prueba de integración en una base de staging para confirmar
permisos, relaciones PostgREST y concurrencia real sin datos de producción.

## Repetición

Desde la carpeta del proyecto, con Node 24:

    node --import ./tests/qa/loader.mjs --test --test-reporter=spec ./tests/qa/reservations.isolated.test.mjs ./tests/reservations-contract.test.mjs ./tests/booking-return.test.mjs

La suite usa PGlite instalado exclusivamente en la carpeta temporal
C:/Users/josed/Documents/Codex/2026-09-22/pue/tmp/booking-qa, sin modificar
package.json ni package-lock.json del proyecto.

En otra terminal, para las pantallas:

    node node_modules/vite/bin/vite.js --config tests/qa/vite.config.mjs
    node tests/qa/reservations.browser.mjs

La suite de navegador usa el Playwright del runtime de Codex y el Chrome
instalado en este equipo. El arnés de QA no forma parte de la aplicación.
