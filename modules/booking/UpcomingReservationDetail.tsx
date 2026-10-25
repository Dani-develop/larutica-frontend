'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeading } from '@/components/ui/page-heading';
import { CurrencyNotice } from '@/components/preferences/PreferenceControls';
import { usePreferences } from '@/lib/preferences/Preferences';
import { JourneyView } from '@/modules/journeys/JourneyView';
import { tripPath } from '@/modules/landing/lib/travelerRoutes';
import { ReservationPayment } from '@/modules/payments/components/ReservationPayment';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { canTravelerCancel, paymentNotice, paymentStatusText, reservationCanBePaid, reservationNotice, reservationStatusText } from './reservationState';
import { useNow } from './useNow';

export function UpcomingReservationDetail({ reservation: r, image, onCancel, onPaid, busy, cancelling = false, existing = false }: {
  reservation: Reservation;
  image?: string;
  onCancel: () => void;
  onPaid: () => void;
  busy: boolean;
  cancelling?: boolean;
  existing?: boolean;
}) {
  const { t, money, dateLabel } = usePreferences();
  const [showJourney, setShowJourney] = useState(false);
  const [paying, setPaying] = useState(false);
  const now = useNow();
  const notice = reservationNotice(r, now);
  const payment = paymentStatusText(r, now);
  const payNotice = paymentNotice(r, now);
  const place = r.destination ?? t('Sin destino');

  return <section className="page-shell trip-page-shell">
    <Link className="back-link" href={tripPath('reservas')}>{t('Volver a reservas por venir')}</Link>
    {existing ? <p className="notice" role="status">{t('Ya tienes una reserva para esta salida. No creamos una segunda reserva.')}</p> : null}
    <PageHeading
      className="trip-page-heading"
      eyebrow={<p className="eyebrow">{t('Por venir')}</p>}
      title={r.publicationTitle}
      description={place}
    />
    <article className="reservation-detail" id={`reserva-${r.id}`} tabIndex={-1}>
      <div className="card-image-wrap reservation-detail-hero">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt="" />
        ) : (
          <p className="empty-state">{t('Sin imagen')}</p>
        )}
        <span className="badge">{t(reservationStatusText(r, now))}</span>
      </div>
      <div className="reservation-detail-panel">
        <dl className="reservation-facts">
          <div><dt>{t('Salida · hora de Costa Rica')}</dt><dd>{dateLabel(r.departureStartAt)}</dd></div>
          <div><dt>{t('Personas')}</dt><dd>{r.numberOfPeople}</dd></div>
          <div><dt>{t('Total de la reserva')}</dt><dd>{money(r.total)}</dd></div>
          <div><dt>{t('Reservada el')}</dt><dd>{dateLabel(r.createdAt)}</dd></div>
          {payment ? <div><dt>{t('Pago')}</dt><dd>{t(payment)}</dd></div> : null}
          <div><dt>{t('Reserva')}</dt><dd>{r.id.slice(0, 8).toUpperCase()}</dd></div>
        </dl>
        <CurrencyNotice usd={r.total} />
        {r.journey ? (
          <details className="reservation-journey" onToggle={event => setShowJourney(event.currentTarget.open)}>
            <summary>{t('Trayecto de tu reserva')}</summary>
            {showJourney ? <div className="reservation-journey-map"><JourneyView journey={r.journey} meetingPoint={r.meetingPoint} /></div> : null}
          </details>
        ) : r.meetingPoint ? <p><strong>{t('Punto de encuentro:')}</strong> {r.meetingPoint}</p> : null}
        {r.agencyName ? <p><strong>{t('Proveedor:')}</strong> {r.agencyName}{r.agencyPhone ? ` · ${r.agencyPhone}` : ''}{r.agencyEmail ? ` · ${r.agencyEmail}` : ''}</p> : null}
        {notice ? <p className="notice">{t(notice)}</p> : null}
        {payNotice ? <p className="notice">{t(payNotice)}</p> : null}
        {paying && reservationCanBePaid(r, now) ? <ReservationPayment reservationId={r.id} onPaid={() => { setPaying(false); onPaid(); }} onCancel={() => setPaying(false)} /> : null}
        <div className="trip-actions reservation-detail-actions">
          {reservationCanBePaid(r, now) && !paying ? <button type="button" className="button button-primary" disabled={busy} onClick={() => setPaying(true)}>{t('Pagar ahora')}</button> : null}
          {r.publicationId ? <Link className="button button-outline" href={`/experiencias/${r.publicationId}`}>{t('Ver experiencia')}</Link> : null}
          {canTravelerCancel(r, now) ? (
            <button type="button" className="button button-danger" disabled={busy} aria-busy={cancelling} onClick={onCancel}>
              {t(cancelling ? 'Cancelando...' : 'Cancelar viaje')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  </section>;
}
