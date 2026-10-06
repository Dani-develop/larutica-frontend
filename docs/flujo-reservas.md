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
   queda PENDING; no se cobra automáticamente.
6. Mis reservas muestra únicamente las reservas personales de cualquier rol.
   El trabajador ve sus solicitudes; Admin puede ver todas. La vista inicial
   del panel muestra pendientes vigentes de más antiguas a más recientes.
7. El trabajador confirma o rechaza antes de la salida. El pasajero consulta
   el resultado y puede cancelar antes de la salida. Cancelar libera cupos.
8. Salidas pasadas y cancelaciones se conservan en Historial. Las pendientes
   cuya salida pasó se muestran como Vencida sin confirmación, sin acciones
   para confirmar ni cancelar. Una experiencia sin próximas salidas no sale
   en el catálogo principal, aunque se puede abrir desde una reserva antigua.

## Aplicación pendiente en Supabase

Ejecutar supabase/migrations/202610050001_reservation_retries.sql en SQL Editor
antes de publicar. Esta migración actualiza create_reservation para devolver
la reserva activa existente del mismo pasajero bajo el bloqueo de la salida.
Así dos envíos simultáneos no duplican cupos. No borra reservas ni las modifica.
La comprobación de API y formulario cubre reintentos normales; la protección
atómica contra envíos simultáneos requiere aplicar esta migración.

Pruebas aisladas realizadas: ver qa-reservas-2026-10-05.md. Sin publicación.
