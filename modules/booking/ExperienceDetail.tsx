
'use client';
import { usePreferences } from "@/lib/preferences/Preferences";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useNow } from './useNow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { createReservation, listReservations, type Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { PublicShell } from './PublicShell';
import { SiteHeader } from '@/modules/landing/components/SiteHeader';
import { type Experience } from './types';
import './experience-detail.css';
import { JourneyView } from '@/modules/journeys/JourneyView';
import { reservationPath } from '@/modules/landing/lib/travelerRoutes';
import { ReservationPayment } from '@/modules/payments/components/ReservationPayment';

function EmbeddedShell({ children }: { children: ReactNode }) {
  return <div className="booking-site booking-embedded booking-detail-page">{children}</div>;
}

function DetailShell({ children }: { children: ReactNode }) {
  return <PublicShell className="booking-detail-page" header={<SiteHeader />}>{children}</PublicShell>;
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}

function ExperienceDetailSkeleton() {
  const { t } = usePreferences();
  return <div className="detail-skeleton" aria-busy="true">
    <p role="status" className="sr-only">{t("Consultando disponibilidad…")}</p>
    <div aria-hidden="true">
      <span className="skeleton-block" style={{ width: '70%', height: 44 }} />
      <span className="skeleton-block" style={{ width: '45%', height: 18, marginTop: 14 }} />
      <div className="booking-detail-grid">
        <div>
          <span className="skeleton-block skeleton-photo" />
          <span className="skeleton-block" style={{ width: 220, height: 24, marginTop: 32 }} />
          {['100%', '96%', '88%', '64%'].map((width, index) => <span key={index} className="skeleton-block" style={{ width, height: 14, marginTop: 12 }} />)}
          <span className="skeleton-block" style={{ width: 180, height: 24, marginTop: 32 }} />
          {['92%', '70%'].map((width, index) => <span key={index} className="skeleton-block" style={{ width, height: 14, marginTop: 12 }} />)}
        </div>
        <div className="booking-panel">
          <span className="skeleton-block" style={{ width: 90, height: 14 }} />
          <span className="skeleton-block" style={{ width: 140, height: 32, marginTop: 8 }} />
          <span className="skeleton-block" style={{ width: 120, height: 14, marginTop: 24 }} />
          <span className="skeleton-block skeleton-field" />
          <span className="skeleton-block" style={{ width: 80, height: 14, marginTop: 20 }} />
          <span className="skeleton-block skeleton-field" />
          <span className="skeleton-block skeleton-button" />
        </div>
      </div>
    </div>
  </div>;
}

export function ExperienceDetail({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { t, money, dateLabel } = usePreferences();
  const now = useNow();
  const {user, loading: authLoading} = useAuth();
  const [item,setItem] = useState<Experience|null>(null), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [departureId,setDepartureId] = useState(''), [people,setPeople] = useState(1), [step,setStep] = useState<'choose'|'review'>('choose');
  const [busy,setBusy] = useState(false), [created,setCreated] = useState<Reservation|null>(null), [reload,setReload] = useState(0);
  const [paymentState,setPaymentState] = useState<'pending'|'paid'|'deferred'>('pending');
  const submitting = useRef(false);
  const panelRef = useRef<HTMLElement|null>(null);
  useEffect(() => {if (panelRef.current) panelRef.current.scrollTop = 0;},[step]);
  const restoredParams = useRef('');
  useEffect(() => {
    const refresh = () => {if (!document.hidden) setReload(n => n+1);};
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  },[]);
  const [personalCheck, setPersonalCheck] = useState<{ key: string; reservation: Reservation | null; error: string }>({key:'',reservation:null,error:''});
  const checkKey = user && departureId ? `${user.id}:${departureId}` : '';
  useEffect(() => {
    if (!user || !departureId) return;
    let current = true;
    const key = `${user.id}:${departureId}`;
    listReservations({mine:true,departureId}).then(rows => {
      if (current) setPersonalCheck({key,reservation:rows.find(r => r.passengerId === user.id && ['PENDING','CONFIRMED'].includes(r.status)) ?? null,error:''});
    }).catch(() => {
      if (current) setPersonalCheck({key,reservation:null,error:'No pudimos consultar tus reservas. Intenta de nuevo para continuar.'});
    });
    return () => {current = false;};
  },[user,departureId,reload]);
  const existingReservation = personalCheck.key === checkKey ? personalCheck.reservation : null;
  const checkError = personalCheck.key === checkKey ? personalCheck.error : '';
  const checkingReservation = !!checkKey && personalCheck.key !== checkKey;
  useEffect(() => { const controller = new AbortController(); queueMicrotask(() => {if (!controller.signal.aborted) {setLoading(true); setError('');}});
    fetch(`/api/catalog?id=${encodeURIComponent(id)}`, {signal:controller.signal}).then(async r => {
      const body = await r.json() as {data:Experience[];error?:string}; if (!r.ok) throw new Error(body.error || 'No pudimos consultar esta experiencia.');
      const p = body.data[0] as Experience|undefined; if (!p) throw new Error('Esta experiencia ya no está disponible.');
      setItem(p);
      const params = new URLSearchParams(window.location.search), chosen = params.get('salida');
      setDepartureId(old => p.departures.some(d => d.id === old) ? old : p.departures.find(d => d.id === chosen)?.id ?? p.departures.find(d => d.available > 0)?.id ?? p.departures[0]?.id ?? '');
      if (restoredParams.current !== id) {
        const party = Number(params.get('personas')); if (Number.isSafeInteger(party) && party > 0) setPeople(party);
        restoredParams.current = id;
      }
    }).catch(e => {if (e.name !== 'AbortError') setError(e.message);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  },[id,reload]);
  const departure = item?.departures.find(d => d.id === departureId);
  const valid = !!departure && Number.isSafeInteger(people) && people > 0 && people <= departure.available && Date.parse(departure.startAt) > now;
  const blockedReason = existingReservation ? 'Ya tienes una reserva activa para esta salida. Puedes consultar su estado en Mis reservas.'
    : !item?.departures.length ? 'Por ahora no hay nuevas fechas disponibles para esta experiencia. Puedes explorar otros planes o volver más adelante.'
    : !departure ? 'Selecciona una fecha de salida para continuar.'
    : Date.parse(departure.startAt) <= now ? 'Esta salida ya comenzó. Selecciona otra fecha.'
    : departure.available < 1 ? 'Esta salida está completa. Selecciona otra fecha o explora otras experiencias.'
    : !Number.isSafeInteger(people) || people < 1 ? 'Indica un número entero de personas, mayor que cero.'
    : people > departure.available ? `${t("Cupos disponibles:")} ${departure.available}. ${t("Reduce el número de personas o elige otra fecha.")}`
    : checkingReservation ? 'Buscando tus reservas para esta fecha…' : checkError;
  const canContinue = valid && !existingReservation && !checkingReservation && !checkError;
  const returnTo = `/experiencias/${id}?salida=${encodeURIComponent(departureId)}&personas=${people}`;
  async function send() {
    if (submitting.current || !canContinue || !user) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      // Recover a successful request whose response was lost before offering another submission.
      const existing = (await listReservations({mine:true,departureId})).find(r => r.passengerId === user.id && r.departureId === departureId && ['PENDING','CONFIRMED'].includes(r.status));
      if (existing) { window.location.assign(reservationPath(existing.id, true)); return; }
      const reservation = await createReservation({departureId, numberOfPeople: people});
      setPaymentState('pending'); setCreated(reservation); window.scrollTo({top:0,behavior:'smooth'});
    } catch(e) { setError(e instanceof Error ? e.message : 'No pudimos enviar la solicitud. Revisa Mis reservas antes de volver a intentarlo.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  const Shell = embedded ? EmbeddedShell : DetailShell;
  const Content = embedded ? 'section' : 'main';
  return <Shell><Content id="contenido" tabIndex={-1} className={embedded ? "booking-container booking-embedded" : "booking-container"}>
    {created ? <section className="booking-success" role="status"><CheckCircle2 size={42} color="var(--primary)" aria-hidden="true"/><h1>{t("Reserva realizada")}</h1><span className="booking-status">{t("Reservada")}</span><CurrencyNotice usd={created.total}/><p className="mt-5">{t("Tu reserva está lista. Revisa los datos de tu viaje en Mis reservas.")}</p><dl className="booking-summary"><div><dt>{t("Experiencia")}</dt><dd>{created.publicationTitle}</dd></div><div><dt>{t("Salida")}</dt><dd>{dateLabel(created.departureStartAt)}</dd></div><div><dt>{t("Personas")}</dt><dd>{created.numberOfPeople}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(created.total)}</dd></div></dl>{created.total > 0 && paymentState === 'pending' && <section aria-labelledby="booking-pay-title"><h2 id="booking-pay-title">{t("Paga tu reserva")}</h2><p>{t("Tus cupos ya están reservados. Completa el pago con tarjeta para dejarla pagada.")}</p><ReservationPayment reservationId={created.id} onPaid={() => setPaymentState('paid')} onCancel={() => setPaymentState('deferred')}/></section>}<p>{created.total <= 0 ? t("No se realizó ningún cobro. Guarda el número de reserva: ") : paymentState === 'paid' ? t("Pago recibido. Guarda el número de reserva: ") : paymentState === 'deferred' ? t("Todavía no has pagado; puedes hacerlo desde Mis reservas. Guarda el número de reserva: ") : t("Guarda el número de reserva: ")}<strong>{created.id.slice(0,8).toUpperCase()}</strong>.</p><Button asChild><Link href={reservationPath(created.id)}>{t("Ver mi reserva")}</Link></Button></section>
    : loading && !item ? <ExperienceDetailSkeleton /> : !item ? <div className="booking-empty" role="alert"><h1>{t("No pudimos abrir esta experiencia")}</h1><p>{t(error)}</p><Button onClick={() => setReload(n => n+1)}>{t("Volver a intentar")}</Button></div> : <>
    <div className="booking-detail-heading">
      <nav className="booking-detail-breadcrumb" aria-label={t("Ruta de navegación")}>
        <Link href="/#experiencias">{t("Explorar")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{item.title}</span>
      </nav>
      <h1>{item.title}</h1>
      <ul className="booking-detail-meta">
        <li><MapPin size={16} aria-hidden="true" />{item.destination}</li>
        {item.duration ? <li><Clock size={16} aria-hidden="true" />{durationLabel(item.duration)}</li> : null}
        <li><Building2 size={16} aria-hidden="true" />{t("Organizado por ")}<strong>{item.agency}</strong></li>
      </ul>
    </div>
    <div className="booking-detail-grid">
      <div className="booking-prose">
        <img className="booking-detail-photo" src={item.image || '/playa.jpg'} alt={item.title} />
        <section className="booking-detail-section booking-detail-about">
          <h2>{t("Sobre esta experiencia")}</h2>
          <p>{item.description}</p>
        </section>
        <section className="booking-detail-section booking-detail-inclusions">
          <h2>{t("Qué incluye")}</h2>
          <p>{item.included || t("Consulta los detalles con el proveedor.")}</p>
          <div className="booking-detail-exclusions">
            <h3>{t("Qué no incluye")}</h3>
            <p>{item.notIncluded || t("El proveedor no ha indicado exclusiones.")}</p>
          </div>
        </section>
        <section className="booking-detail-section booking-detail-journey">
          <h2>{t("Trayecto")}</h2>
          <JourneyView journey={item.journey} meetingPoint={item.meetingPoint} />
          <p className="booking-detail-timezone">{t("Las horas se muestran en la zona horaria de Costa Rica.")}</p>
        </section>
        <section className="booking-detail-section booking-detail-before">
          <h2>{t("Antes de reservar")}</h2>
          <p>{t("Tu reserva queda confirmada al completar este paso. Puedes consultar sus detalles y cancelar desde Mis reservas antes de la salida. Al reservar podrás pagar con tarjeta, de forma segura, con OnvoPAY.")}</p>
        </section>
      </div>
    <aside ref={panelRef} className="booking-panel" aria-label={t("Solicitar reserva")}><p className="booking-price-from"><span>{t("Desde")}</span><strong>{money(item.price)}</strong><span>{t("por persona")}</span></p><CurrencyNotice usd={item.price*(people || 0)}/><ol className="booking-steps"><li aria-current={step === 'choose' ? 'step' : undefined}>{t("1. Elige tu salida")}</li><li aria-current={step === 'review' ? 'step' : undefined}>{t("2. Revisa y envía")}</li></ol><h2>{step === 'choose' ? t("Haz espacio para tu próximo viaje") : t("Revisa tu solicitud")}</h2>
    <p id="booking-block-reason" className={blockedReason ? 'booking-notice' : 'sr-only'} role="status">{t(blockedReason) || t("Puedes continuar con tu solicitud.")}</p>
    {existingReservation && <Button asChild variant="outline" className="w-full mb-4"><Link href={reservationPath(existingReservation.id)}>{t("Ver mi reserva")}</Link></Button>}
    {!item.departures.length && <div className="booking-actions mb-4"><Button asChild variant="outline"><Link href={embedded ? "/" : "/#experiencias"}>{t("Explorar otras experiencias")}</Link></Button><Button variant="outline" onClick={() => setReload(n => n+1)}>{t("Consultar fechas de nuevo")}</Button></div>}
    {checkError && <Button variant="outline" className="mb-4" onClick={() => {setPersonalCheck({key:'',reservation:null,error:''}); setReload(n => n+1);}}>{t("Volver a comprobar")}</Button>}
    {!item.departures.length ? null : step === 'choose' ? <form onSubmit={e => {e.preventDefault(); setError(''); if (canContinue) setStep('review');}}><label>{t("Fecha y hora de salida")}<select value={departureId} onChange={e => setDepartureId(e.target.value)} required disabled={!item.departures.length}><option value="" disabled>{t("Selecciona una salida")}</option>{item.departures.map(d => <option key={d.id} value={d.id} disabled={d.available < 1 && d.id !== existingReservation?.departureId}>{dateLabel(d.startAt)} · {d.available ? `${d.available} ${t("cupos")}` : t("Sin cupo")}</option>)}</select></label><label>{t("Personas")}<input type="number" min="1" max={departure?.available || 1} step="1" value={people || ''} onChange={e => setPeople(Number(e.target.value))} required aria-describedby="booking-availability"/></label><p id="booking-availability" className="text-sm">{departure ? `${departure.available} ${t("cupos disponibles. Se vuelven a comprobar al enviar.")}` : t("No hay salidas disponibles para reservar.")}</p><dl className="booking-summary"><div><dt>{money(item.price)} × {people || 0}{t(" personas")}</dt><dd>{money(item.price*(people || 0))}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(item.price*(people || 0))}</dd></div></dl><Button className="w-full" disabled={!canContinue} aria-describedby="booking-block-reason">{existingReservation ? t("Ya tienes una reserva") : t("Revisar reserva")}</Button></form> : <><dl className="booking-summary"><div><dt>{t("Salida")}</dt><dd>{departure && dateLabel(departure.startAt)}</dd></div><div><dt>{t("Personas")}</dt><dd>{people}</dd></div><div><dt>{t("A nombre de")}</dt><dd>{user?.name || t("Inicia sesión para continuar")}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(item.price*people)}</dd></div></dl><p className="booking-notice">{t("Al confirmar, reservas estos cupos para la salida elegida. El pago con tarjeta es el siguiente paso.")}</p>{authLoading ? <p role="status">{t("Validando tu sesión…")}</p> : !user ? <Button className="w-full" asChild><Link href={`/login?next=${encodeURIComponent(returnTo)}`}>{t("Iniciar sesión para reservar")}</Link></Button> : <Button className="w-full" onClick={send} disabled={busy || !canContinue} aria-describedby="booking-block-reason">{busy ? t("Reservando…") : t("Confirmar reserva")}</Button>}<Button variant="outline" className="w-full mt-3" disabled={busy} onClick={() => setStep('choose')}>{t("Modificar fecha o personas")}</Button></>}
    {error && <div role="alert" className="booking-error">{t(error)}<p><Link href={reservationPath()}>{t("Consultar mis reservas")}</Link></p><Button variant="outline" disabled={busy} onClick={() => {setStep('choose'); setReload(n => n+1);}}>{t("Consultar fechas de nuevo")}</Button></div>}
    </aside></div></>}
  </Content></Shell>;
}
