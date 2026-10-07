'use client';
import { usePreferences } from "@/lib/preferences/Preferences";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNow } from './useNow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { createReservation, listReservations, type Reservation } from '@/modules/transport/reservations/services/reservation.service';
import { PublicShell } from './PublicShell';
import { type Experience } from './types';

function EmbeddedShell({ children }: { children: ReactNode }) {
  return <div className="booking-site booking-embedded">{children}</div>;
}

export function ExperienceDetail({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { t, money, dateLabel } = usePreferences();
  const now = useNow();
  const {user, loading: authLoading} = useAuth();
  const [item,setItem] = useState<Experience|null>(null), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [departureId,setDepartureId] = useState(''), [people,setPeople] = useState(1), [step,setStep] = useState<'choose'|'review'>('choose');
  const [busy,setBusy] = useState(false), [created,setCreated] = useState<Reservation|null>(null), [reload,setReload] = useState(0);
  const submitting = useRef(false);
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
      if (existing) { window.location.assign(`/mis-reservas?reserva=${existing.id}&existente=1`); return; }
      const reservation = await createReservation({departureId, numberOfPeople: people});
      setCreated(reservation); window.scrollTo({top:0,behavior:'smooth'});
    } catch(e) { setError(e instanceof Error ? e.message : 'No pudimos enviar la solicitud. Revisa Mis reservas antes de volver a intentarlo.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  const Shell = embedded ? EmbeddedShell : PublicShell;
  const Content = embedded ? 'section' : 'main';
  return <Shell><Content id="contenido" tabIndex={-1} className={embedded ? "booking-container booking-embedded" : "booking-container"}>
    <Link className="booking-back" href={embedded ? "/" : "/#experiencias"}>{t("Volver a explorar")}</Link>
    {created ? <section className="booking-success" role="status"><CheckCircle2 size={42} color="#0d684e" aria-hidden="true"/><h1>{t("Solicitud enviada")}</h1><span className="booking-status">{t("Pendiente de confirmación")}</span><CurrencyNotice usd={created.total}/><p className="mt-5">{item?.agency}{t(" revisará tu solicitud. Te confirmará si hay lugar para tu viaje. Puedes consultar su respuesta en Mis reservas.")}</p><dl className="booking-summary"><div><dt>{t("Experiencia")}</dt><dd>{created.publicationTitle}</dd></div><div><dt>{t("Salida")}</dt><dd>{dateLabel(created.departureStartAt)}</dd></div><div><dt>{t("Personas")}</dt><dd>{created.numberOfPeople}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(created.total)}</dd></div></dl><p>{t("No se realizó ningún cobro. Guarda el número de reserva: ")}<strong>{created.id.slice(0,8).toUpperCase()}</strong>.</p><Button asChild><Link href={`/mis-reservas?reserva=${created.id}`}>{t("Ver mi reserva")}</Link></Button></section>
    : loading ? <p role="status" className="booking-empty">{t("Consultando disponibilidad…")}</p> : !item ? <div className="booking-empty" role="alert"><h1>{t("No pudimos abrir esta experiencia")}</h1><p>{t(error)}</p><Button onClick={() => setReload(n => n+1)}>{t("Volver a intentar")}</Button></div> : <>
    <div className="booking-detail-heading"><p className="booking-eyebrow">{item.serviceType === 'TRANSPORT' ? 'TRANSPORTE' : t("EXCURSIÓN")} · {item.destination}</p><h1>{item.title}</h1><p>{t("Organizado por ")}<strong>{item.agency}</strong>{item.duration ? ` · ${Math.floor(item.duration/60) ? `${Math.floor(item.duration/60)} h ` : ''}${item.duration%60 ? `${item.duration%60} min` : ''}` : ''}</p></div>
    <div className="booking-detail-grid"><div className="booking-prose"><img className="booking-detail-photo" src={item.image || '/playa.jpg'} alt={item.title}/><section><h2>{t("Sobre esta experiencia")}</h2><p>{item.description}</p></section><section><h2>{t("Qué incluye")}</h2><p>{item.included || t("Consulta los detalles con el proveedor.")}</p><h2>{t("Qué no incluye")}</h2><p>{item.notIncluded || t("El proveedor no ha indicado exclusiones.")}</p></section><section><h2>{t("Punto de encuentro")}</h2><p>{item.meetingPoint}</p><p>{t("Las horas se muestran en la zona horaria de Costa Rica.")}</p></section><section><h2>{t("Antes de reservar")}</h2><p>{t("Tu solicitud queda pendiente hasta que el proveedor la confirme. Consulta el estado en Mis reservas. Puedes cancelar desde ahí antes de la salida. LaRutica no procesa pagos en este formulario.")}</p></section></div>
    <aside className="booking-panel" aria-label={t("Solicitar reserva")}><CurrencyNotice usd={item.price*(people || 0)}/><ol className="booking-steps"><li aria-current={step === 'choose' ? 'step' : undefined}>{t("1. Elige tu salida")}</li><li aria-current={step === 'review' ? 'step' : undefined}>{t("2. Revisa y envía")}</li></ol><h2>{step === 'choose' ? t("Haz espacio para tu próximo viaje") : t("Revisa tu solicitud")}</h2>
    <p id="booking-block-reason" className={blockedReason ? 'booking-notice' : 'sr-only'} role="status">{t(blockedReason) || t("Puedes continuar con tu solicitud.")}</p>
    {existingReservation && <Button asChild variant="outline" className="w-full mb-4"><Link href={`/mis-reservas?reserva=${existingReservation.id}#reserva-${existingReservation.id}`}>{t("Ver mi reserva")}</Link></Button>}
    {!item.departures.length && <div className="booking-actions mb-4"><Button asChild variant="outline"><Link href={embedded ? "/" : "/#experiencias"}>{t("Explorar otras experiencias")}</Link></Button><Button variant="outline" onClick={() => setReload(n => n+1)}>{t("Consultar fechas de nuevo")}</Button></div>}
    {checkError && <Button variant="outline" className="mb-4" onClick={() => {setPersonalCheck({key:'',reservation:null,error:''}); setReload(n => n+1);}}>{t("Volver a comprobar")}</Button>}
    {!item.departures.length ? null : step === 'choose' ? <form onSubmit={e => {e.preventDefault(); setError(''); if (canContinue) setStep('review');}}><label>{t("Fecha y hora de salida")}<select value={departureId} onChange={e => setDepartureId(e.target.value)} required disabled={!item.departures.length}><option value="" disabled>{t("Selecciona una salida")}</option>{item.departures.map(d => <option key={d.id} value={d.id} disabled={d.available < 1 && d.id !== existingReservation?.departureId}>{dateLabel(d.startAt)} · {d.available ? `${d.available} ${t("cupos")}` : t("Sin cupo")}</option>)}</select></label><label>{t("Personas")}<input type="number" min="1" max={departure?.available || 1} step="1" value={people || ''} onChange={e => setPeople(Number(e.target.value))} required aria-describedby="booking-availability"/></label><p id="booking-availability" className="text-sm">{departure ? `${departure.available} ${t("cupos disponibles. Se vuelven a comprobar al enviar.")}` : t("No hay salidas disponibles para reservar.")}</p><dl className="booking-summary"><div><dt>{money(item.price)} × {people || 0}{t(" personas")}</dt><dd>{money(item.price*(people || 0))}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(item.price*(people || 0))}</dd></div></dl><Button className="w-full" disabled={!canContinue} aria-describedby="booking-block-reason">{existingReservation ? t("Ya tienes una reserva") : t("Revisar solicitud")}</Button></form> : <><dl className="booking-summary"><div><dt>{t("Salida")}</dt><dd>{departure && dateLabel(departure.startAt)}</dd></div><div><dt>{t("Personas")}</dt><dd>{people}</dd></div><div><dt>{t("A nombre de")}</dt><dd>{user?.name || t("Inicia sesión para continuar")}</dd></div><div className="booking-total"><dt>{t("Total")}</dt><dd>{money(item.price*people)}</dd></div></dl><p className="booking-notice">{t("Al enviar, solicitas estos cupos al proveedor. Aún no es una reserva confirmada y no se te cobrará en este paso.")}</p>{authLoading ? <p role="status">{t("Validando tu sesión…")}</p> : !user ? <Button className="w-full" asChild><Link href={`/login?next=${encodeURIComponent(returnTo)}`}>{t("Iniciar sesión para reservar")}</Link></Button> : <Button className="w-full" onClick={send} disabled={busy || !canContinue} aria-describedby="booking-block-reason">{busy ? t("Enviando solicitud…") : t("Enviar solicitud de reserva")}</Button>}<Button variant="outline" className="w-full mt-3" disabled={busy} onClick={() => setStep('choose')}>{t("Modificar fecha o personas")}</Button></>}
    {error && <div role="alert" className="booking-error">{t(error)}<p><Link href="/mis-reservas">{t("Consultar mis reservas")}</Link></p><Button variant="outline" disabled={busy} onClick={() => {setStep('choose'); setReload(n => n+1);}}>{t("Consultar fechas de nuevo")}</Button></div>}
    </aside></div></>}
  </Content></Shell>;
}
