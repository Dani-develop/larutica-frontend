'use client';
import { CurrencyNotice } from '@/components/preferences/PreferenceControls';
import { usePreferences } from "@/lib/preferences/Preferences";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useNow } from './useNow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { listReservations, updateReservation, type Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { statusLabel } from './types';

export function Reservations({worker = false}: {worker?: boolean}) {
  const { t, money, dateLabel } = usePreferences();
  const now = useNow();
  const {user,loading:authLoading} = useAuth();
  const [rows,setRows] = useState<Reservation[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [filter,setFilter] = useState(worker ? 'PENDING' : ''), [search,setSearch] = useState(''), [busy,setBusy] = useState('');
  const [period,setPeriod] = useState('upcoming');
  const [confirm,setConfirm] = useState<{id:string;status:'CONFIRMED'|'CANCELLED'}|null>(null), [notice,setNotice] = useState('');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('existente') === '1') {
      queueMicrotask(() => setNotice('Ya tienes una reserva activa para esa salida. Puedes consultarla aquí; no creamos una segunda solicitud.'));
    }
  }, []);
  const isWorker = worker && user && ['Agencia','Transporte','Admin'].includes(user.role);
  const load = useCallback(async () => {
    if (!user) {setLoading(false); return;}
    try {setRows(await listReservations({mine: !worker})); setError('');}
    catch(e) {setError(e instanceof Error ? e.message : 'No pudimos consultar tus reservas.');}
    finally {setLoading(false);}
  },[user,worker]);
  useEffect(() => {queueMicrotask(() => {void load();}); const refresh = () => {if (!document.hidden) void load();}; const interval = window.setInterval(refresh,30000); window.addEventListener('focus',refresh); return () => {clearInterval(interval); window.removeEventListener('focus',refresh);};},[load]);
  async function change() {
    if (!confirm || busy) return;
    setBusy(confirm.id); setError(''); setNotice('');
    try {await updateReservation(confirm.id,{status:confirm.status}); setNotice(confirm.status === 'CONFIRMED' ? 'Reserva confirmada. El viajero ya puede consultar la confirmación.' : 'Reserva cancelada. Los cupos vuelven a estar disponibles.'); setConfirm(null); await load();}
    catch(e) {setError(e instanceof Error ? e.message : 'No se pudo actualizar la reserva.');}
    finally {setBusy('');}
  }
  const visible = rows.filter(r => {
    const upcoming = Date.parse(r.departureStartAt) > now && ['PENDING','CONFIRMED'].includes(r.status) && (!r.departureStatus || r.departureStatus === 'ACTIVE');
    return (period === 'all' || (period === 'upcoming' ? upcoming : !upcoming))
      && (!filter || r.status === filter)
      && `${r.publicationTitle} ${r.destination} ${r.id} ${r.passengerName ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  }).sort((a,b) => worker ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (authLoading) return <p role="status" className="booking-empty">{t("Validando tu sesión…")}</p>;
  if (!user) return <section className="booking-empty booking-access" aria-labelledby="reservations-access-title"><p className="booking-eyebrow">{t("MIS RESERVAS")}</p><h1 id="reservations-access-title">{t("Consulta tus reservas")}</h1><p>{t("Inicia sesión para ver tus solicitudes y la respuesta del proveedor.")}</p><div className="booking-actions"><Button asChild><Link href="/login?next=%2Fmis-reservas">{t("Iniciar sesión")}</Link></Button><Button asChild variant="outline"><Link href="/#experiencias">{t("Seguir explorando")}</Link></Button></div></section>;
  return <section className={worker ? 'booking-site booking-worker' : ''}>
    <div className="booking-section-heading"><div><p className="booking-eyebrow">{isWorker ? t("SOLICITUDES DE VIAJEROS") : t("TU PRÓXIMA ESCAPADA")}</p><h1 className="text-3xl">{isWorker ? t("Reservas") : t("Mis reservas")}</h1></div>{!isWorker && <Button asChild variant="outline"><Link href="/#experiencias">{t("Explorar experiencias")}</Link></Button>}</div>
    <p>{isWorker ? t("Atiende primero las solicitudes más antiguas. Revisa fecha, personas y datos del viajero antes de confirmar; el cambio quedará visible en su cuenta.") : t("Una solicitud pendiente todavía necesita la confirmación del proveedor. Revisa el estado antes de viajar.")}</p>
    <div className="booking-toolbar"><label>{t("Vista")}<select value={period} onChange={e => {setPeriod(e.target.value); setFilter(e.target.value === 'upcoming' && worker ? 'PENDING' : '');}}><option value="upcoming">{worker ? t("Solicitudes y reservas vigentes") : t("Próximos viajes")}</option><option value="history">{t("Historial: salidas pasadas y cancelaciones")}</option><option value="all">{t("Todas las reservas")}</option></select></label><label>{t("Buscar reserva")}<input type="search" placeholder={isWorker ? t("Experiencia, viajero o número") : t("Experiencia o número")} value={search} onChange={e => setSearch(e.target.value)}/></label><label>{t("Estado")}<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">{t("Todos los estados")}</option>{Object.entries(statusLabel).map(([v,label]) => <option value={v} key={v}>{t(label)}</option>)}</select></label><Button variant="outline" onClick={() => {setLoading(true); void load();}} disabled={loading}>{t("Actualizar")}</Button></div>
    {error && <p className="booking-error" role="alert">{t(error)}</p>}{notice && <p className="booking-notice mt-4" role="status">{t(notice)}</p>}
    {loading ? <p role="status" className="booking-empty">{t("Cargando reservas…")}</p> : <><p className="booking-results" role="status">{visible.length}{t(" reservas")}{worker ? t(" · Solicitudes más antiguas primero") : ''}{t(" · Los estados se actualizan cada 30 segundos.")}</p><div className="booking-list">{visible.map(r => {
      const future = Date.parse(r.departureStartAt) > now, active = ['PENDING','CONFIRMED'].includes(r.status);
      return <article className="booking-reservation" key={r.id} id={`reserva-${r.id}`}><div className="booking-reservation-header"><div><small>{t("Reserva ")}{r.id.slice(0,8).toUpperCase()}{t(" · Solicitada el ")}{dateLabel(r.createdAt)}</small><h2>{r.publicationTitle}</h2><p>{r.destination}</p></div><span className="booking-status" data-status={r.status}>{r.departureStatus === 'CANCELLED' ? t("Salida cancelada") : !future && r.status === 'PENDING' ? t("Vencida sin confirmación") : t(statusLabel[r.status])}</span></div>
      <dl><div><dt>{t("Salida · hora de Costa Rica")}</dt><dd>{dateLabel(r.departureStartAt)}</dd></div><div><dt>{t("Personas")}</dt><dd>{r.numberOfPeople}</dd></div><div><dt>{t("Total de la reserva")}</dt><dd>{money(r.total)}</dd></div></dl><CurrencyNotice usd={r.total}/>
      {isWorker && <div className="booking-notice"><strong>{r.passengerName || t("Viajero")}</strong><p>{r.passengerEmail}{r.passengerPhone ? ` · ${r.passengerPhone}` : ''}</p></div>}
      {!isWorker && r.meetingPoint && <p><strong>{t("Punto de encuentro:")}</strong> {r.meetingPoint}</p>}
      {!isWorker && r.agencyName && <p><strong>{t("Proveedor:")}</strong> {r.agencyName}{r.agencyPhone ? ` · ${r.agencyPhone}` : ''}{r.agencyEmail ? ` · ${r.agencyEmail}` : ''}</p>}
      {r.departureStatus === 'CANCELLED' && <p className="booking-notice">{t("El organizador canceló esta salida. Consulta con él otras fechas o cancela tu reserva antes de la fecha prevista.")}</p>}
      {!future && r.status === 'PENDING' && <p className="booking-notice">{t("Esta salida ya pasó sin confirmación. La solicitud no fue confirmada para viajar.")}</p>}
      {r.status === 'CONFIRMED' && future && (!r.departureStatus || r.departureStatus === 'ACTIVE') && <p className="booking-notice">{isWorker ? t("El viajero tiene su reserva confirmada.") : t("Tu reserva está confirmada. Revisa el punto de encuentro y coordina con el proveedor cualquier detalle del viaje.")}</p>}
      {r.status === 'PENDING' && future && !isWorker && (!r.departureStatus || r.departureStatus === 'ACTIVE') && <p className="booking-notice">{t("El proveedor está por revisar tu solicitud. Todavía no está confirmada.")}</p>}
      <div className="booking-actions">{isWorker && future && (!r.departureStatus || r.departureStatus === 'ACTIVE') && r.status === 'PENDING' && <Button disabled={!!busy} onClick={() => setConfirm({id:r.id,status:'CONFIRMED'})}>{t("Confirmar reserva")}</Button>}{future && active && <Button variant="outline" disabled={!!busy} onClick={() => setConfirm({id:r.id,status:'CANCELLED'})}>{isWorker && r.status === 'PENDING' ? t("Rechazar solicitud") : t("Cancelar reserva")}</Button>}{!isWorker && <Link href={`/experiencias/${r.publicationId}`} className="self-center underline">{t("Ver experiencia")}</Link>}</div>
      {confirm?.id === r.id && <div className="booking-inline-confirm" role="region" aria-label={t("Confirmar cambio")}><p><strong>{confirm.status === 'CONFIRMED' ? `¿Confirmar ${r.numberOfPeople} cupos para esta salida?` : t("¿Cancelar esta reserva?")}</strong></p><p>{confirm.status === 'CONFIRMED' ? t("El viajero verá su reserva como confirmada.") : t("Esta acción libera los cupos y no se puede deshacer. La reserva permanecerá en el historial.")}</p><div className="booking-actions"><Button disabled={!!busy} onClick={change}>{busy ? 'Guardando…' : confirm.status === 'CONFIRMED' ? t("Sí, confirmar") : t("Sí, cancelar")}</Button><Button variant="outline" disabled={!!busy} onClick={() => setConfirm(null)}>{t("Volver")}</Button></div></div>}
      </article>;
    })}</div>{!visible.length && !error && <div className="booking-empty"><h2>{rows.length ? t("No hay reservas en esta vista") : isWorker ? t("Aún no hay solicitudes") : t("Tu próximo viaje empieza aquí")}</h2><p>{rows.length ? t("Cambia la vista, el estado o la búsqueda. Las salidas pasadas y las cancelaciones están en Historial.") : isWorker ? t("Las solicitudes de tus salidas aparecerán aquí para que puedas revisarlas.") : t("Cuando solicites una reserva, encontrarás aquí todos sus detalles.")}</p></div>}</>}
  </section>;
}
