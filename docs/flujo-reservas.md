# Flujo de reservas

1. El proveedor publica una salida ACTIVE con fecha futura, cupo y publicación
   aprobada; también debe tener su agencia aprobada.
2. El visitante elige salida y personas, revisa precio y total e inicia sesión
   si todavía no tiene una cuenta. La selección se conserva al regresar.
3. Los roles Viajero, Agencia, Transporte y Admin pueden reservar a su nombre.
   El pasajero siempre sale de la sesión; no se puede suplantar otro usuario.
4. La consulta personal compara pasajero y salida. Una reserva PENDING o
   CONFIRMED impide una segunda solicitud del mismo usuario para esa salida.
   Otros usuarios pueden reservar mientras queden cupos. Una cancelación
   permite volver a reservar.
5. El servidor vuelve a validar proveedor y la función SQL bloquea la salida,
   comprueba fecha/cupo y copia el precio desde la publicación. La solicitud
   queda PENDING; el cobro es un paso aparte (ver Pagos con OnvoPAY).
6. Mis reservas muestra únicamente las reservas personales de cualquier rol.
   El trabajador ve sus solicitudes; Admin puede ver todas. La vista inicial
   del panel muestra pendientes vigentes de más antiguas a más recientes.
7. El trabajador confirma o rechaza antes de la salida. El pasajero consulta
   el resultado y puede cancelar antes de la salida. Cancelar libera cupos.
8. Salidas pasadas y cancelaciones se conservan en Historial. Las pendientes
   cuya salida pasó se muestran como Vencida sin confirmación, sin acciones
   para confirmar ni cancelar. Una experiencia sin próximas salidas no sale
   en el catálogo principal, aunque se puede abrir desde una reserva antigua.
9. Si la agencia desactiva una publicación o cambia la fecha de una salida,
   las reservas PENDING y CONFIRMED afectadas se cancelan, se intenta el
   reembolso completo de los pagos y se envía un correo por viajero. El correo
   de cambio de fecha incluye la fecha nueva; para asistir, el viajero debe
   realizar una nueva reserva.

## Aplicación pendiente en Supabase (avisos de cambios)

La migración nueva depende de las tablas `profiles`, `agencies`, `publications`,
`publication_departures` y `reservations`. En un proyecto que no tenga esas
tablas, primero deben aplicarse las migraciones base en orden:

1. `supabase/migrations/202608270001_auth_profiles.sql`
2. `supabase/migrations/202609210001_agencies.sql`
3. `supabase/migrations/202609220001_publications.sql`
4. `supabase/migrations/202609220002_reservations.sql`

Después, aplica las migraciones posteriores pendientes en orden cronológico,
incluida
`supabase/migrations/202610210003_cancel_reservations_on_trip_changes.sql`.
La forma recomendada de mantener ese orden es ejecutar `npx supabase db push`
con el proyecto vinculado, como se explica en `supabase/README.md`. Si se usa
SQL Editor, hay que ejecutar cada migración pendiente en ese mismo orden y no
repetir migraciones que ya fueron aplicadas.

El error PostgreSQL `42P01: relation "public.publication_departures" does not
exist` significa que falta la migración base
`202609220001_publications.sql` (o que se aplicó fuera de orden). Las funciones
nuevas solo pueden ejecutarse con `service_role`; la desactivación y la
reprogramación cancelan las reservas en la misma transacción que actualiza la
publicación o la salida.

## Aplicación pendiente en Supabase

Ejecutar supabase/migrations/202610050001_reservation_retries.sql en SQL Editor
antes de publicar. Esta migración actualiza create_reservation para devolver
la reserva activa existente del mismo pasajero bajo el bloqueo de la salida.
Así dos envíos simultáneos no duplican cupos. No borra reservas ni las modifica.
La comprobación de API y formulario cubre reintentos normales; la protección
atómica contra envíos simultáneos requiere aplicar esta migración.

Pruebas aisladas realizadas: ver qa-reservas-2026-10-05.md. Sin publicación.

## Pagos con OnvoPAY

1. Tras crear la reserva, el viajero ve el formulario de OnvoPAY (también desde
   Mis reservas con "Pagar ahora"). Si elige "Pagar después", la reserva sigue
   viva con "Pago pendiente".
2. `POST /api/reservations/[id]/payment` crea la intención de pago. El monto se
   calcula en el servidor (precio copiado × personas, USD); el navegador no lo
   envía. Un intento abierto con el mismo monto se reutiliza.
3. Al terminar el formulario, el navegador llama a
   `POST /api/reservations/[id]/payment/confirm`; el servidor consulta a Onvo y
   solo entonces marca el cobro. El webhook
   `POST /api/payments/onvopay/webhook` (encabezado `x-webhook-secret`) hace lo
   mismo de forma asíncrona y también verifica el cobro en Onvo.
4. Cancelar una reserva pagada (viajero, proveedor, administrador, cancelación
   de la salida, desactivación de publicación o cambio de fecha) pide a Onvo el
   reembolso completo. Si el reembolso falla, la cancelación se mantiene, el
   cobro sigue "paid" y la reserva muestra "Reembolso en proceso"; se resuelve
   a mano en el panel de Onvo. Un cobro que llega después de cancelar se
   devuelve de inmediato.
5. Una reserva pagada no admite cambiar el número de personas.

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
