'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { listReservations, updateReservation, type Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { dateLabel, money, statusLabel } from './types';

export function Reservations({worker = false}: {worker?: boolean}) {
  const {user,loading:authLoading} = useAuth();
  const [rows,setRows] = useState<Reservation[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [filter,setFilter] = useState(''), [search,setSearch] = useState(''), [busy,setBusy] = useState('');
  const [confirm,setConfirm] = useState<{id:string;status:'CONFIRMED'|'CANCELLED'}|null>(null), [notice,setNotice] = useState('');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('existente') === '1') {
      setNotice('Ya tienes una reserva activa para esa salida. Puedes consultarla aquí; no creamos una segunda solicitud.');
    }
  }, []);
  const isWorker = worker && user && ['Agencia','Transporte','Admin'].includes(user.role);
  const load = useCallback(async () => {
    if (!user) {setLoading(false); return;}
    try {setRows(await listReservations()); setError('');}
    catch(e) {setError(e instanceof Error ? e.message : 'No pudimos consultar tus reservas.');}
    finally {setLoading(false);}
  },[user]);
  useEffect(() => {void load(); const refresh = () => {if (!document.hidden) void load();}; const interval = window.setInterval(refresh,30000); window.addEventListener('focus',refresh); return () => {clearInterval(interval); window.removeEventListener('focus',refresh);};},[load]);
  async function change() {
    if (!confirm || busy) return;
    setBusy(confirm.id); setError(''); setNotice('');
    try {await updateReservation(confirm.id,{status:confirm.status}); setNotice(confirm.status === 'CONFIRMED' ? 'Reserva confirmada. El viajero ya puede consultar la confirmación.' : 'Reserva cancelada. Los cupos vuelven a estar disponibles.'); setConfirm(null); await load();}
    catch(e) {setError(e instanceof Error ? e.message : 'No se pudo actualizar la reserva.');}
    finally {setBusy('');}
  }
  const visible = rows.filter(r => (!filter || r.status === filter) && `${r.publicationTitle} ${r.destination} ${r.id} ${r.passengerName ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  if (authLoading) return <p role="status" className="booking-empty">Validando tu sesión…</p>;
  if (!user) return <div className="booking-empty"><h1>Consulta tus reservas</h1><p>Inicia sesión para ver tus solicitudes y la respuesta del proveedor.</p><Button asChild><a href="/login?next=%2Fmis-reservas">Iniciar sesión</a></Button></div>;
  if (!worker && user.role !== 'Viajero') return <div className="booking-empty"><h1>Gestiona las reservas de tus viajeros</h1><p>Tu cuenta tiene acceso al panel de trabajo.</p><Button asChild><a href="/dashboard/reservations">Abrir reservas del panel</a></Button></div>;
  return <section className={worker ? 'booking-site booking-worker' : ''}>
    <div className="booking-section-heading"><div><p className="booking-eyebrow">{isWorker ? 'SOLICITUDES DE VIAJEROS' : 'TU PRÓXIMA ESCAPADA'}</p><h1 className="text-3xl">{isWorker ? 'Reservas' : 'Mis reservas'}</h1></div>{!isWorker && <Button asChild variant="outline"><a href="/#experiencias">Explorar experiencias</a></Button>}</div>
    <p>{isWorker ? 'Revisa la salida y las personas antes de confirmar. Cada cambio queda visible para el viajero.' : 'Una solicitud pendiente todavía necesita la confirmación del proveedor. Revisa el estado antes de viajar.'}</p>
    <div className="booking-toolbar"><label>Buscar reserva<input type="search" placeholder={isWorker ? 'Experiencia, viajero o número' : 'Experiencia o número'} value={search} onChange={e => setSearch(e.target.value)}/></label><label>Estado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabel).map(([v,label]) => <option value={v} key={v}>{label}</option>)}</select></label><Button variant="outline" onClick={() => {setLoading(true); void load();}} disabled={loading}>Actualizar</Button></div>
    {error && <p className="booking-error" role="alert">{error}</p>}{notice && <p className="booking-notice mt-4" role="status">{notice}</p>}
    {loading ? <p role="status" className="booking-empty">Cargando reservas…</p> : <><p className="booking-results" role="status">{visible.length} reservas · Los estados se actualizan cada 30 segundos.</p><div className="booking-list">{visible.map(r => {
      const future = Date.parse(r.departureStartAt) > Date.now(), active = ['PENDING','CONFIRMED'].includes(r.status);
      return <article className="booking-reservation" key={r.id} id={`reserva-${r.id}`}><div className="booking-reservation-header"><div><small>Reserva {r.id.slice(0,8).toUpperCase()}</small><h2>{r.publicationTitle}</h2><p>{r.destination}</p></div><span className="booking-status" data-status={r.status}>{statusLabel[r.status]}</span></div>
      <dl><div><dt>Salida · hora de Costa Rica</dt><dd>{dateLabel(r.departureStartAt)}</dd></div><div><dt>Personas</dt><dd>{r.numberOfPeople}</dd></div><div><dt>Total de la reserva</dt><dd>{money(r.total)}</dd></div></dl>
      {isWorker && <div className="booking-notice"><strong>{r.passengerName || 'Viajero'}</strong><p>{r.passengerEmail}{r.passengerPhone ? ` · ${r.passengerPhone}` : ''}</p></div>}
      {!isWorker && r.meetingPoint && <p><strong>Punto de encuentro:</strong> {r.meetingPoint}</p>}
      {!isWorker && r.agencyName && <p><strong>Proveedor:</strong> {r.agencyName}{r.agencyPhone ? ` · ${r.agencyPhone}` : ''}{r.agencyEmail ? ` · ${r.agencyEmail}` : ''}</p>}
      {!future && r.status === 'PENDING' && <p className="booking-notice">Esta salida ya pasó sin confirmación. La solicitud no fue confirmada para viajar.</p>}
      {r.status === 'CONFIRMED' && future && <p className="booking-notice">{isWorker ? 'El viajero tiene su reserva confirmada.' : 'Tu reserva está confirmada. Revisa el punto de encuentro y coordina con el proveedor cualquier detalle del viaje.'}</p>}
      {r.status === 'PENDING' && future && !isWorker && <p className="booking-notice">El proveedor está por revisar tu solicitud. Todavía no está confirmada.</p>}
      <div className="booking-actions">{isWorker && future && r.status === 'PENDING' && <Button disabled={!!busy} onClick={() => setConfirm({id:r.id,status:'CONFIRMED'})}>Confirmar reserva</Button>}{future && active && <Button variant="outline" disabled={!!busy} onClick={() => setConfirm({id:r.id,status:'CANCELLED'})}>{isWorker && r.status === 'PENDING' ? 'Rechazar solicitud' : 'Cancelar reserva'}</Button>}{!isWorker && <a href={`/experiencias/${r.publicationId}`} className="self-center underline">Ver experiencia</a>}</div>
      {confirm?.id === r.id && <div className="booking-inline-confirm" role="region" aria-label="Confirmar cambio"><p><strong>{confirm.status === 'CONFIRMED' ? `¿Confirmar ${r.numberOfPeople} cupos para esta salida?` : '¿Cancelar esta reserva?'}</strong></p><p>{confirm.status === 'CONFIRMED' ? 'El viajero verá su reserva como confirmada.' : 'Esta acción libera los cupos y no se puede deshacer. La reserva permanecerá en el historial.'}</p><div className="booking-actions"><Button disabled={!!busy} onClick={change}>{busy ? 'Guardando…' : confirm.status === 'CONFIRMED' ? 'Sí, confirmar' : 'Sí, cancelar'}</Button><Button variant="outline" disabled={!!busy} onClick={() => setConfirm(null)}>Volver</Button></div></div>}
      </article>;
    })}</div>{!visible.length && !error && <div className="booking-empty"><h2>{rows.length ? 'No hay reservas con estos filtros' : isWorker ? 'Aún no hay solicitudes' : 'Tu próximo viaje empieza aquí'}</h2><p>{rows.length ? 'Cambia el estado o el texto de búsqueda.' : isWorker ? 'Las solicitudes de tus salidas aparecerán aquí para que puedas revisarlas.' : 'Cuando solicites una reserva, encontrarás aquí todos sus detalles.'}</p></div>}</>}
  </section>;
}
