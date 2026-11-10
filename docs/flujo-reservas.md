# Flujo de reservas

La reserva se realiza al completar el pago. No existe la modalidad de pagar después.

1. El viajero elige una salida futura de una publicación y agencia aprobadas, indica personas y revisa el importe. La búsqueda conserva salida y personas al abrir la experiencia; iniciar sesión también conserva la selección.
2. Todos los roles pueden comprar a su nombre. El pasajero sale de la sesión y el servidor copia el precio.
3. Continuar crea un registro en `reservation_checkouts`, sin insertar una reserva. Retiene cupos durante un máximo de 15 minutos, o hasta el inicio de la salida si ocurre antes. La interfaz muestra el plazo.
4. El checkout tiene cantidad, precio, salida y trayecto inmutables. Volver a la experiencia permite retomar el mismo pago con esos datos. Cambiar selección cancela el intento anterior antes de crear otro.
5. Los intentos vencidos dejan de contar en disponibilidad aunque nadie abra la aplicación; no necesitan un cron. Crear otra compra marca el intento anterior vencido bajo el bloqueo de la salida.
6. El inicio de pago se serializa en la base. Un intento abierto en Onvo se reutiliza. Un fallo de preparación ofrece reintentar; tras una confirmación incierta se comprueba el mismo pago, sin volver a cobrar.
7. El servidor consulta Onvo y comprueba estado, importe y moneda. Una función SQL guarda el pago y crea la reserva CONFIRMED en una sola transacción. Un fallo intermedio revierte ambos cambios; repetir el evento puede completar la operación.
8. Un cobro sobre un intento cancelado, vencido, una salida no disponible o un importe incompatible no crea reserva: solicita la devolución y conserva su estado real.
9. El precio debe ser mayor que cero. No se permite crear una reserva gratuita ni confirmar sin un cobro verificado.
10. Mis reservas y el panel del proveedor/administrador muestran reservas realizadas. No muestran intentos de compra abandonados ni ofrecen confirmar manualmente o filtrar pendientes de pago. La vista inicial muestra todas las reservas vigentes.
11. Mis reservas es una consulta personal para todos los roles que pueden comprar. El panel del proveedor conserva su ámbito de agencia y Admin conserva acceso global. Actualizar y el refresco automático consultan datos nuevos.
12. Cancelar antes de la salida libera cupos y solicita la devolución. La cancelación se conserva si el proveedor de pagos falla. Reembolso pendiente, completado y fallido son estados distintos; un fallo requiere revisión del pago en Onvo.
13. Desactivar una publicación o cambiar/cancelar una salida invalida los checkouts afectados. Las reservas realizadas se cancelan mediante las funciones existentes y se solicitan sus devoluciones y avisos.
14. El historial conserva la fecha originalmente reservada, el precio, el punto de encuentro y el trayecto copiado. Los cambios de publicación no reescriben esos datos. Las fechas antiguas ya modificadas antes de la migración no pueden reconstruirse automáticamente.

## Migración y despliegue

Aplicar `supabase/migrations/20261110105917_reservation_checkout_payment_flow.sql` antes de activar esta versión. Requiere las migraciones anteriores, incluidas pagos, liquidaciones, cambios de salida y trayectos.

La migración agrega checkouts privados, funciones solo para service_role, el vínculo de pagos a checkout y las copias de fecha. Archiva como canceladas las reservas PENDING sin cobro, preserva sus referencias de pago en un checkout vencido y repara PENDING con cobro registrado. No elimina el historial ni solicita cobros o reembolsos al aplicar SQL. Un cobro posterior de una intención archivada se procesa por el webhook y se devuelve.

Las rutas locales de checkout/pago usan el mismo backend compartido cuando está configurado LARUTICA_REMOTE_API_ORIGIN. Para pruebas aisladas se usa el harness descrito debajo; no ejecutar pruebas de escritura contra producción.

## Verificación

- `npm test`: contratos, pagos, correo y regresiones del checkout con PostgreSQL embebido y Onvo simulado.
- `node --import ./tests/mail/register.mjs tests/qa/checkout-server.mjs`: API aislada en 127.0.0.1:4188.
- `npm run build:vercel` y `node tests/qa/production-server.mjs`: sirve el artefacto Vercel en 127.0.0.1:4190 con credenciales ficticias. Ejecutar `node tests/qa/checkout.browser.mjs`; permite configurar CHROME_PATH. Capturas y resultados: test-results/checkout.
- Ejecutar diseño, TypeScript y build:vercel antes de subir a main.

Las pruebas de Onvo del repositorio son simuladas. La certificación bancaria/3DS, entrega de webhooks y devolución real requieren credenciales de sandbox y un entorno separado.

## Promociones y liquidaciones

La agencia puede promocionar una publicación completa, con todas sus salidas,
por 12 USD durante 7 días. `POST /api/publications/[id]/promotion/payment`
crea la intención; el navegador no envía el monto. Al terminar el formulario,
`POST /api/publications/[id]/promotion/payment/confirm` consulta a Onvo y solo
entonces escribe `publications.promoted_until`. Si nadie paga, o Onvo no acepta
el cobro, la publicación no queda promocionada. El mismo webhook de Onvo liquida
ese intento cuando no pertenece a una reserva. Mientras la ventana sigue abierta
no se cobra otro periodo; un cobro duplicado se reembolsa.

Ejecutar supabase/migrations/202610290001_publication_promotions.sql **antes** de
publicar este código: el catálogo y el cobro leen `promoted_until` y la tabla
`publication_promotion_payments`, y fallan si no existen.

Variables (solo servidor): `ONVO_TEST_API_KEY`, `ONVO_PUBLISHABLE_KEY`,
`ONVO_WEBHOOK_SECRET`. Están en `.env.local` para desarrollo; en el alojamiento
hay que configurarlas como secretos. Las claves actuales son de prueba.

## Aplicación pendiente en Supabase (pagos)

Ejecutar supabase/migrations/202610210001_reservation_payments.sql **antes** de
publicar este código: las consultas de reservas incluyen la tabla
reservation_payments y fallan si no existe.

## Pagos y liquidaciones a agencias (administrador)

Pantalla: Dashboard → Administración → **Pagos** (`/dashboard/payments`, solo Admin).

- **Saldo por agencia.** Corresponde = Σ (cobrado − reembolsado) × (1 − comisión).
  Saldo = corresponde + ajustes − pagos entregados. Solo cuentan cobros `paid` o
  `refunded`; los intentos pendientes o fallidos no mueven dinero.
- **Comisión.** Porcentaje por agencia (`agencies.commission_rate`, 0 por defecto).
  Se congela en cada pago al crearlo (`reservation_payments.commission_rate`):
  cambiar la tasa solo afecta cobros futuros.
- **Detalle de pagos.** Viajero, experiencia, agencia, monto y reembolso, con
  filtros por agencia, estado y fechas (hora de Costa Rica) y exportación CSV.
- **Libro de liquidaciones** (`agency_settlements`, solo se agregan filas):
  *Pago* (dinero entregado a la agencia, no puede superar el saldo) y *Ajuste*
  (positivo o negativo, con motivo obligatorio). Un error se corrige con un
  ajuste; no hay borrado.
- Los pagos a la agencia se hacen fuera de la app (SINPE, transferencia…); la
  pantalla solo los registra.

API (todas exigen rol Admin): `GET /api/admin/payments`,
`GET /api/admin/payments/balances`, `GET|POST /api/admin/settlements`,
`PATCH /api/admin/agencies/[id]/commission`.

### Aplicación pendiente en Supabase (liquidaciones)

Ejecutar supabase/migrations/202610210002_agency_settlements.sql después de
202610210001_reservation_payments.sql.
