'use client';

import { usePreferences } from '@/lib/preferences/Preferences';
import { CurrencyNotice } from '@/components/preferences/PreferenceControls';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';

/** Booking information stays visible after leaving the confirmation screen. */
export function UpcomingReservationCard({ reservation: r, onCancel, busy }: {
  reservation: Reservation; onCancel: () => void; busy: boolean;
}) {
  const { t, money, dateLabel } = usePreferences();
  const cancelledDeparture = r.departureStatus === 'CANCELLED';
  return <article className="booking-reservation" id={`reserva-${r.id}`}>
    <div className="booking-reservation-header">
      <div><small>{t('Reserva')} {r.id.slice(0, 8)} · {t('Reservada el')} {dateLabel(r.createdAt)}</small>
        <h3>{r.publicationTitle}</h3><p>{r.destination}</p></div>
      <span className="booking-status" data-status={r.status}>{t(cancelledDeparture ? 'Salida cancelada' : r.status === 'CONFIRMED' ? 'Reservada' : 'Reserva anterior pendiente')}</span>
    </div>
    <dl>
      <div><dt>{t('Salida · hora de Costa Rica')}</dt><dd>{dateLabel(r.departureStartAt)}</dd></div>
      <div><dt>{t('Personas')}</dt><dd>{r.numberOfPeople}</dd></div>
      <div><dt>{t('Total')}</dt><dd>{money(r.total)}</dd></div>
    </dl>
    <CurrencyNotice usd={r.total} />
    {r.meetingPoint && <p><strong>{t('Punto de encuentro:')}</strong> {r.meetingPoint}</p>}
    {r.agencyName && <p><strong>{t('Proveedor:')}</strong> {r.agencyName}{r.agencyPhone ? ` · ${r.agencyPhone}` : ''}{r.agencyEmail ? ` · ${r.agencyEmail}` : ''}</p>}
    {cancelledDeparture && <p className="booking-notice">{t('Esta salida fue cancelada por el proveedor.')}</p>}
    <div className="booking-actions">
      <button type="button" className="button button-danger" disabled={busy} onClick={onCancel}>{t(busy ? 'Cancelando...' : 'Cancelar viaje')}</button>
    </div>
  </article>;
}
