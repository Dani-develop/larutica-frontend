import { canPayReservation } from '../../lib/payments/status.ts';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';

export function departureHasStarted(startAt: string, now: number) {
  const start = Date.parse(startAt);
  return Number.isNaN(start) || start <= now;
}

export function isUpcomingReservation(reservation: Reservation, now: number) {
  const open = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
  const active = !reservation.departureStatus || reservation.departureStatus === 'ACTIVE';
  return open && active && !departureHasStarted(reservation.departureStartAt, now);
}

export function canTravelerCancel(reservation: Reservation, now: number) {
  return (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED')
    && !departureHasStarted(reservation.departureStartAt, now);
}

export function reservationStatusText(reservation: Reservation, now: number) {
  if (reservation.departureStatus === 'CANCELLED') return 'Salida cancelada';
  if (reservation.status === 'PENDING' && departureHasStarted(reservation.departureStartAt, now)) return 'Vencida sin confirmación';
  if (reservation.status === 'CONFIRMED') return 'Confirmada';
  if (reservation.status === 'PENDING') return 'Pendiente de pago';
  if (reservation.status === 'CANCELLED') return 'Cancelada';
  return 'Finalizada';
}

export function reservationNotice(reservation: Reservation, now: number) {
  if (reservation.departureStatus === 'CANCELLED' && reservation.status === 'CANCELLED') {
    return 'El organizador canceló esta fecha y hora. Tu reserva ya está cancelada y sigue en tu historial.';
  }
  if (reservation.departureStatus === 'CANCELLED') {
    return 'El organizador canceló esta salida. Consulta con él otras fechas o cancela tu reserva antes de la fecha prevista.';
  }
  if (reservation.status === 'PENDING' && departureHasStarted(reservation.departureStartAt, now)) {
    return 'Esta salida ya pasó sin confirmación. La solicitud no fue confirmada para viajar.';
  }
  if (isUpcomingReservation(reservation, now) && reservation.status === 'CONFIRMED') {
    return 'Tu reserva está confirmada. Revisa el punto de encuentro y coordina con el proveedor cualquier detalle del viaje.';
  }
  if (isUpcomingReservation(reservation, now) && reservation.status === 'PENDING') {
    return 'Completa el pago seguro con OnvoPAY para confirmar tu reserva.';
  }
  if (reservation.status === 'PAST') return 'Este viaje ya se realizó. Puedes dejar tu calificación.';
  if (reservation.status === 'CANCELLED') return 'Esta reserva está cancelada y sigue en tu historial.';
  return '';
}

export function reservationCanBePaid(reservation: Reservation, now: number) {
  return canPayReservation({ ...reservation, paymentStatus: reservation.paymentStatus ?? 'UNPAID' }, now);
}

/** Etiqueta corta del cobro; null cuando no hay nada que decir (por ejemplo, reserva gratuita o vencida). */
export function paymentStatusText(reservation: Reservation, now: number) {
  if (reservation.paymentStatus === 'PAID') return reservation.status === 'CANCELLED' ? 'Reembolso en proceso' : 'Pagada';
  if (reservation.paymentStatus === 'REFUNDED') return 'Reembolsada';
  return reservationCanBePaid(reservation, now) ? 'Pago pendiente' : null;
}

export function paymentNotice(reservation: Reservation, now: number) {
  if (reservation.paymentStatus === 'PAID' && reservation.status === 'CANCELLED') {
    return 'Esta reserva pagada se canceló. Estamos devolviendo tu dinero; si no lo ves en tu tarjeta en unos días, escríbenos.';
  }
  if (reservation.paymentStatus === 'REFUNDED') return 'El pago de esta reserva fue devuelto a tu tarjeta.';
  if (reservation.paymentStatus === 'PAID') return 'Pago recibido. Gracias.';
  if (reservationCanBePaid(reservation, now)) return 'Tu reserva está pendiente de pago.';
  return '';
}
