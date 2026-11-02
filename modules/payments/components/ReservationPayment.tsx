'use client';

import { useCallback } from 'react';
import { confirmReservationPayment, startReservationPayment } from '../services/payment.service';
import { OnvoPaymentForm } from './OnvoPaymentForm';

type ReservationPaymentProps = {
  reservationId: string;
  onPaid: () => void;
};

/** Cobra una reserva con el formulario de OnvoPAY. El monto lo fija el servidor, nunca este componente. */
export function ReservationPayment({ reservationId, onPaid }: ReservationPaymentProps) {
  const start = useCallback(() => startReservationPayment(reservationId), [reservationId]);
  const confirm = useCallback(
    (paymentIntentId: string) => confirmReservationPayment(reservationId, paymentIntentId),
    [reservationId],
  );
  return <OnvoPaymentForm startKey={reservationId} start={start} confirm={confirm} onPaid={onPaid} />;
}
