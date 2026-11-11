'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft,ArrowRight,CalendarDays,RefreshCw,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PageHeading} from '@/components/ui/page-heading';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiFetch} from '@/lib/api/browser-fetch';
import {usePreferences} from '@/lib/preferences/Preferences';
import {useAuth} from '@/modules/auth/context/AuthContext';
import {updateReservation,type Reservation} from '@/modules/transport/reservations/services/reservation.service';
import {useNow} from './useNow';
import {paymentStatusText,reservationStatusText} from './reservationState';
import './reservation-management.css';

type Publication={id:string;title:string;destination:string|null;imageUrl?:string|null;agencyName:string|null;status:string;totalReservations:number;upcomingReservations:number};
type Page<T>={data:T[];page:number;pageSize:number;total:number};
type Result=Page<Publication>|(Page<Reservation>&{publication:Publication});

function Pagination({page,total,size,onPage,disabled,label}:{page:number;total:number;size:number;onPage:(page:number)=>void;disabled:boolean;label:string}) {
  const {t}=usePreferences();const pages=Math.max(1,Math.ceil(total/size));
  return <nav className="manage-pagination" aria-label={label}>
    <p>{total ? `${(page-1)*size+1}–${Math.min(page*size,total)}` : '0'} {t('de')} {total}</p>
    {pages>1&&<div><Button variant="outline" size="sm" disabled={disabled||page===1} onClick={()=>onPage(1)} aria-label={t('Primera página')}>«</Button><Button variant="outline" size="sm" disabled={disabled||page===1} onClick={()=>onPage(page-1)}>{t('Anterior')}</Button><span>{t('Página')} {page} {t('de')} {pages}</span><Button variant="outline" size="sm" disabled={disabled||page===pages} onClick={()=>onPage(page+1)}>{t('Siguiente')}</Button><Button variant="outline" size="sm" disabled={disabled||page===pages} onClick={()=>onPage(pages)} aria-label={t('Última página')}>»</Button></div>}
  </nav>;
}

export function ReservationManagement() {
  const {t,money,dateLabel}=usePreferences();const now=useNow();const {user,loading:authLoading}=useAuth();
  const router=useRouter(),pathname=usePathname(),params=useSearchParams();
  const publicationId=params.get('publicacion');
  const search=params.get(publicationId?'buscar':'buscarPublicacion')??'';
  const page=Number(params.get(publicationId?'pagina':'paginaPublicaciones')??1);
  const period=params.get('periodo')??'upcoming',status=params.get('estado')??'',archived=params.get('archivo')==='1';
  const query=new URLSearchParams({page:String(page),search});
  if(publicationId){query.set('publicationId',publicationId);query.set('period',period);query.set('status',status);}else if(archived)query.set('archived','1');
  const key=query.toString();
  const [result,setResult]=useState<{key:string;value:Result}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [selected,setSelected]=useState<Reservation|null>(null),[confirmCancel,setConfirmCancel]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  function href(changes:Record<string,string|null>){const next=new URLSearchParams(params.toString());Object.entries(changes).forEach(([key,value])=>{if(value===null||value==='')next.delete(key);else next.set(key,value);});return `${pathname}?${next}`;}
  function navigate(changes:Record<string,string|null>){router.push(href(changes),{scroll:false});setNotice('');}
  const indexHref=href({publicacion:null,pagina:null,buscar:null,periodo:null,estado:null});
  useEffect(()=>{
    if(authLoading||!user)return;
    const controller=new AbortController();queueMicrotask(()=>{if(!controller.signal.aborted){setLoading(true);setError('');}});
    void apiFetch(`/api/reservations/manage?${key}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const body=await response.json() as Result & {error?:string};if(!response.ok)throw new Error(body.error??'No pudimos consultar las reservas.');
      if(!controller.signal.aborted)setResult({key,value:body});
    }).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'No pudimos consultar las reservas.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[key,revision,authLoading,user]);
  useEffect(()=>{const refresh=()=>{if(!document.hidden)setRevision(n=>n+1);};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
  useEffect(()=>{document.getElementById('management-title')?.focus();},[publicationId,page]);
  const current=result?.key===key?result.value:null;
  const detail=current&&'publication' in current?current:null;
  const publications=current&&!('publication' in current)?current as Page<Publication>:null;
  async function cancel(){if(!selected||busy)return;setBusy(true);setError('');try{await updateReservation(selected.id,{status:'CANCELLED'});setSelected(null);setConfirmCancel(false);setNotice('Reserva cancelada. Puedes consultar el estado de la devolución en su detalle.');setRevision(n=>n+1);}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cancelar la reserva.');}finally{setBusy(false);}}
  if(authLoading)return <p role="status">{t('Validando tu sesión…')}</p>;
  if(!user||!['Admin','Agencia','Transporte'].includes(user.role))return <p role="alert">{t('No tienes acceso a la administración de reservas.')}</p>;
  return <section className="reservation-management" aria-busy={loading}>
    {publicationId&&<Button asChild variant="outline" className="manage-back"><Link href={indexHref}><ArrowLeft size={18}/>{t('Volver a publicaciones')}</Link></Button>}
    <PageHeading id="management-title" focusable title={publicationId?(detail?.publication.title??t('Reservas de la publicación')):t('Reservas')}
      description={publicationId?(detail?`${detail.publication.agencyName??''}${detail.publication.destination?' · '+detail.publication.destination:''}`:undefined):t('Elige una publicación para consultar sus viajeros y gestionar sus reservas.')}
      actions={<Button variant="outline" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16} className={loading?'manage-spinning':''}/>{t('Actualizar')}</Button>}/>
    {!publicationId&&<div className="manage-tabs" aria-label={t('Publicaciones')}><Button variant={archived?'outline':'default'} onClick={()=>navigate({archivo:null,paginaPublicaciones:null})} aria-pressed={!archived}>{t('Publicadas')}</Button><Button variant={archived?'default':'outline'} onClick={()=>navigate({archivo:'1',paginaPublicaciones:null})} aria-pressed={archived}>{t('Archivadas con reservas')}</Button></div>}
    <form className="manage-filters" key={`${publicationId??'index'}:${search}`} onSubmit={event=>{event.preventDefault();const value=String(new FormData(event.currentTarget).get('search')??'').trim();navigate(publicationId?{buscar:value,pagina:null}:{buscarPublicacion:value,paginaPublicaciones:null});}}>
      <label className="manage-search"><span>{t(publicationId?'Buscar viajero o reserva':'Buscar publicación')}</span><Input name="search" type="search" maxLength={100} defaultValue={search} placeholder={t(publicationId?'Nombre, correo o número de reserva':'Nombre, destino o agencia')}/></label>
      {publicationId&&<><label><span id="manage-period-label">{t('Vista')}</span><select aria-labelledby="manage-period-label" value={period} onChange={event=>navigate({periodo:event.target.value,pagina:null,estado:null})}><option value="upcoming">{t('Próximas reservas')}</option><option value="history">{t('Historial')}</option><option value="all">{t('Todas las reservas')}</option></select></label><label><span id="manage-status-label">{t('Estado')}</span><select aria-labelledby="manage-status-label" value={status} onChange={event=>navigate({estado:event.target.value,pagina:null})}><option value="">{t('Todos los estados')}</option>{period!=='history'&&<option value="CONFIRMED">{t('Confirmada')}</option>}{period!=='upcoming'&&<><option value="PAST">{t('Finalizada')}</option><option value="CANCELLED">{t('Cancelada')}</option></>}</select></label></>}
      <Button type="submit" variant="outline"><Search size={16}/>{t('Buscar')}</Button>
      {search&&<Button type="button" variant="ghost" onClick={()=>navigate(publicationId?{buscar:null,pagina:null}:{buscarPublicacion:null,paginaPublicaciones:null})}>{t('Limpiar búsqueda')}</Button>}
    </form>
    {error&&<p className="manage-error" role="alert">{t(error)}</p>}{notice&&<p className="manage-notice" role="status">{t(notice)}</p>}
    {!current&&loading?<p className="manage-empty" role="status">{t('Cargando…')}</p>:current&&<>
      <p className="manage-count" role="status">{current.total} {t(publicationId?(current.total===1?'reserva encontrada':'reservas encontradas'):(current.total===1?'publicación encontrada':'publicaciones encontradas'))}</p>
      {publications&&<div className="manage-publications">{publications.data.map(publication=><Link className="manage-publication" key={publication.id} href={href({publicacion:publication.id,pagina:null,buscar:null,periodo:null,estado:null})}>
        {publication.imageUrl?<img src={publication.imageUrl} alt="" loading="lazy"/>:<div className="manage-photo-placeholder"><CalendarDays size={28}/></div>}
        <div className="manage-publication-body"><p className="manage-agency">{publication.agencyName??publication.destination}</p><h2>{publication.title}</h2><p>{publication.destination}</p><dl><div><dt>{t('Próximas')}</dt><dd>{publication.upcomingReservations}</dd></div><div><dt>{t('Total de reservas')}</dt><dd>{publication.totalReservations}</dd></div></dl><span className="manage-open">{t('Ver reservas')}<ArrowRight size={18}/></span></div>
      </Link>)}</div>}
      {detail&&detail.data.length>0&&<div className="manage-table-wrap"><table className="manage-table"><caption className="sr-only">{t('Reservas de la publicación')} {detail.publication.title}</caption><thead><tr>{['Viajero y reserva','Salida','Personas','Total','Estado','Acciones'].map(label=><th scope="col" key={label}>{t(label)}</th>)}</tr></thead><tbody>{detail.data.map(reservation=><tr key={reservation.id}>
        <td data-label={t('Viajero y reserva')}><strong>{reservation.passengerName||t('Viajero')}</strong><span className="manage-secondary">{reservation.id.slice(0,8).toUpperCase()}</span></td>
        <td data-label={t('Salida')}>{dateLabel(reservation.departureStartAt)}</td><td data-label={t('Personas')}>{reservation.numberOfPeople}</td><td data-label={t('Total')}>{money(reservation.total)}</td>
        <td data-label={t('Estado')}><span className="manage-badge" data-status={reservation.status}>{t(reservationStatusText(reservation,now))}</span></td><td><Button variant="outline" size="sm" onClick={()=>{setSelected(reservation);setConfirmCancel(false);}}>{t('Ver detalle')}</Button></td>
      </tr>)}</tbody></table></div>}
      {current.data.length===0&&<div className="manage-empty"><CalendarDays size={28} aria-hidden="true"/><h2>{t(publicationId?'No hay reservas en esta vista':'No hay publicaciones en esta vista')}</h2><p>{t(search?'Prueba con otra búsqueda o limpia los filtros.':publicationId?'Las reservas realizadas aparecerán aquí. Puedes consultar otras fechas en Historial.':archived?'Aquí encontrarás las publicaciones retiradas del catálogo que conservan reservas.':'Las publicaciones aprobadas aparecerán aquí, aunque todavía no tengan reservas.')}</p></div>}
      <Pagination page={current.page} total={current.total} size={current.pageSize} disabled={loading} label={t(publicationId?'Paginación de reservas':'Paginación de publicaciones')} onPage={next=>navigate(publicationId?{pagina:String(next)}:{paginaPublicaciones:String(next)})}/>
    </>}
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!busy){setSelected(null);setConfirmCancel(false);}}}><DialogContent className="manage-dialog"><div className="manage-dialog-heading"><DialogTitle>{t('Reserva')} {selected?.id.slice(0,8).toUpperCase()}</DialogTitle><DialogDescription>{detail?.publication.title}</DialogDescription></div>{selected&&<>
      <dl className="manage-details"><div><dt>{t('Viajero')}</dt><dd>{selected.passengerName}</dd></div><div><dt>{t('Correo')}</dt><dd>{selected.passengerEmail||'—'}</dd></div><div><dt>{t('Teléfono')}</dt><dd>{selected.passengerPhone||'—'}</dd></div><div><dt>{t('Salida · hora de Costa Rica')}</dt><dd>{dateLabel(selected.departureStartAt)}</dd></div><div><dt>{t('Personas')}</dt><dd>{selected.numberOfPeople}</dd></div><div><dt>{t('Total')}</dt><dd>{money(selected.total)}</dd></div><div><dt>{t('Estado')}</dt><dd>{t(reservationStatusText(selected,now))}</dd></div><div><dt>{t('Pago')}</dt><dd>{t(paymentStatusText(selected,now)??'Pagada')}</dd></div></dl>
      {confirmCancel&&<p className="manage-notice">{t('Esta acción libera los cupos y solicita la devolución. La reserva permanecerá en el historial.')}</p>}
      {error&&<p className="manage-error" role="alert">{t(error)}</p>}<div className="manage-dialog-actions"><Button variant="outline" disabled={busy} onClick={()=>{setSelected(null);setConfirmCancel(false);}}>{t('Cerrar')}</Button>{selected.status==='CONFIRMED'&&Date.parse(selected.departureStartAt)>now&&selected.departureStatus!=='CANCELLED'&&<Button variant="destructive" disabled={busy} onClick={()=>confirmCancel?void cancel():setConfirmCancel(true)}>{t(busy?'Cancelando...':confirmCancel?'Sí, cancelar reserva':'Cancelar reserva')}</Button>}</div>
    </>}</DialogContent></Dialog>
  </section>;
}
