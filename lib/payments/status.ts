export type ReservationPaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

type PaymentSummaryRow = { status: string };

/** Resume los intentos de pago de una reserva en un único estado para el cliente. */
export function derivePaymentStatus(payments: PaymentSummaryRow[] | null | undefined): ReservationPaymentStatus {
  const rows = payments ?? [];
  if (rows.some((payment) => payment.status === "paid")) return "PAID";
  if (rows.some((payment) => payment.status === "refunded")) return "REFUNDED";
  return "UNPAID";
}

/** Una reserva solo se cobra mientras está viva, la salida es futura y el total es positivo. */
export function canPayReservation(reservation: {
  status: string;
  total: number;
  paymentStatus: ReservationPaymentStatus;
  departureStatus?: string;
  departureStartAt: string;
}, now = Date.now()): boolean {
  const start = Date.parse(reservation.departureStartAt);
  return (reservation.status === "PENDING" || reservation.status === "CONFIRMED")
    && reservation.paymentStatus === "UNPAID"
    && reservation.total > 0
    && (!reservation.departureStatus || reservation.departureStatus === "ACTIVE")
    && !Number.isNaN(start)
    && start > now;
}
