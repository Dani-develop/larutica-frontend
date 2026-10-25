'use client';

import Link from 'next/link';
import { usePreferences } from '@/lib/preferences/Preferences';
import { reservationPath } from '@/modules/landing/lib/travelerRoutes';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { paymentStatusText, reservationStatusText } from './reservationState';
import { useNow } from './useNow';

/** Summary of an upcoming trip. The full reservation opens on its own screen. */
export function UpcomingReservationCard({ reservation: r, image }: {
  reservation: Reservation;
  image?: string;
}) {
  const { t, money, dateLabel } = usePreferences();
  const now = useNow();
  const payment = paymentStatusText(r, now);
  const place = r.destination ?? t('Sin destino');
  const people = r.numberOfPeople === 1 ? t('1 persona') : `${r.numberOfPeople} ${t('personas')}`;
  return <article className="experience-card">
    <div className="card-image-wrap">
      {image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={image} alt="" loading="lazy" decoding="async" />
      ) : (
        <p className="empty-state">{t('Sin imagen')}</p>
      )}
      <span className="badge">{t(reservationStatusText(r, now))}</span>
    </div>
    <div className="card-body">
      <p className="card-place">{place}</p>
      <h3>{r.publicationTitle}</h3>
      <p className="reservation-summary">{dateLabel(r.departureStartAt)}</p>
      <p className="reservation-summary">{people} · {money(r.total)}</p>
      {payment ? <p className="reservation-summary">{t(payment)}</p> : null}
      <div className="card-footer">
        <div className="trip-actions">
          <Link className="button button-primary" href={reservationPath(r.id)}>{t('Ver detalles')}</Link>
        </div>
      </div>
    </div>
  </article>;
}
