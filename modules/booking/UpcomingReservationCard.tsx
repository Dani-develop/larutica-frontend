'use client';

import Link from 'next/link';
import { useState } from 'react';
import { JourneyView } from '@/modules/journeys/JourneyView';
import { usePreferences } from '@/lib/preferences/Preferences';
import { CurrencyNotice } from '@/components/preferences/PreferenceControls';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { ReservationPayment } from '@/modules/payments/components/ReservationPayment';
import { canTravelerCancel, paymentNotice, paymentStatusText, reservationCanBePaid, reservationNotice, reservationStatusText } from './reservationState';
import { useNow } from './useNow';

/** Booking information stays visible after leaving the confirmation screen. */
export function UpcomingReservationCard({ reservation: r, onCancel, onPaid, busy }: {
  reservation: Reservation; onCancel: () => void; onPaid: () => void; busy: boolean;
}) {
  const { t, money, dateLabel } = usePreferences();
  const [showJourney, setShowJourney] = useState(false);
  const now = useNow();
  const notice = reservationNotice(r, now);
  const payment = paymentStatusText(r, now);
  const payNotice = paymentNotice(r, now);
  const [paying, setPaying] = useState(false);
  return <article className="booking-reservation" id={`reserva-${r.id}`}>
    <div className="booking-reservation-header">
      <div><small>{t('Reserva')} {r.id.slice(0, 8)} · {t('Reservada el')} {dateLabel(r.createdAt)}</small>
        <h3>{r.publicationTitle}</h3><p>{r.destination}</p></div>
      <span className="booking-status" data-status={r.status}>{t(reservationStatusText(r, now))}</span>
    </div>
    <dl>
      <div><dt>{t('Salida · hora de Costa Rica')}</dt><dd>{dateLabel(r.departureStartAt)}</dd></div>
      <div><dt>{t('Personas')}</dt><dd>{r.numberOfPeople}</dd></div>
      <div><dt>{t('Total')}</dt><dd>{money(r.total)}</dd></div>
      {payment ? <div><dt>{t('Pago')}</dt><dd>{t(payment)}</dd></div> : null}
    </dl>
    <CurrencyNotice usd={r.total} />
    {r.journey ? <details className="mt-4" onToggle={event => setShowJourney(event.currentTarget.open)}><summary className="cursor-pointer font-semibold">{t('Trayecto de tu reserva')}</summary>{showJourney && <div className="mt-3"><JourneyView journey={r.journey} meetingPoint={r.meetingPoint}/></div>}</details>
      : r.meetingPoint && <p><strong>{t('Punto de encuentro:')}</strong> {r.meetingPoint}</p>}
    {r.agencyName && <p><strong>{t('Proveedor:')}</strong> {r.agencyName}{r.agencyPhone ? ` · ${r.agencyPhone}` : ''}{r.agencyEmail ? ` · ${r.agencyEmail}` : ''}</p>}
    {notice ? <p className="booking-notice">{t(notice)}</p> : null}
    {payNotice ? <p className="booking-notice">{t(payNotice)}</p> : null}
    {paying && reservationCanBePaid(r, now) ? <ReservationPayment reservationId={r.id} onPaid={() => { setPaying(false); onPaid(); }} onCancel={() => setPaying(false)} /> : null}
    <div className="booking-actions">
      {reservationCanBePaid(r, now) && !paying ? <button type="button" className="button" disabled={busy} onClick={() => setPaying(true)}>{t('Pagar ahora')}</button> : null}
      {r.publicationId ? <Link className="button button-outline" href={`/experiencias/${r.publicationId}`}>{t('Ver experiencia')}</Link> : null}
      {canTravelerCancel(r, now) ? <button type="button" className="button button-danger" disabled={busy} onClick={onCancel}>{t(busy ? 'Cancelando...' : 'Cancelar viaje')}</button> : null}
    </div>
  </article>;
}
