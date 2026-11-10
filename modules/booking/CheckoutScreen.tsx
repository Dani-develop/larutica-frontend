'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {CurrencyNotice} from '@/components/preferences/PreferenceControls';
import {usePreferences} from '@/lib/preferences/Preferences';
import {CheckoutPayment} from '@/modules/payments/components/CheckoutPayment';
import {cancelCheckout,getCheckout,reconcileCheckout,type Checkout} from './checkout.service';
import {reservationPath} from '@/modules/landing/lib/travelerRoutes';
import {useNow} from './useNow';

export function CheckoutScreen({checkout:initial,onBack}:{checkout:Checkout;onBack:()=>void}) {
  const {t,money,dateLabel}=usePreferences();
  const [checkout,setCheckout]=useState(initial),[paymentBusy,setPaymentBusy]=useState(false),[changing,setChanging]=useState(false),[error,setError]=useState('');
  const heading=useRef<HTMLHeadingElement>(null);
  const now=useNow(1000);
  const refresh=useCallback(async()=>{try{setCheckout(await getCheckout(initial.id));setError('');}catch(e){setError(e instanceof Error?e.message:'No pudimos comprobar el pago.');}},[initial.id]);
  useEffect(()=>{heading.current?.focus();const timer=setInterval(()=>{if(!document.hidden)void refresh();},5000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[refresh]);
  const reservation=checkout.reservation;
  const confirmed=!!reservation&&['CONFIRMED','PAST'].includes(reservation.status)&&reservation.paymentStatus==='PAID';
  const active=checkout.status==='ACTIVE'&&Date.parse(checkout.expiresAt)>now;
  const seconds=Math.max(0,Math.ceil((Date.parse(checkout.expiresAt)-now)/1000));
  async function changeSelection(){if(paymentBusy||changing)return;setChanging(true);try{const current=await cancelCheckout(checkout.id);if(current.reservation){setCheckout(current);return;}onBack();}catch(e){setError(e instanceof Error?e.message:'No pudimos cerrar este intento.');}finally{setChanging(false);}}
  return <section className="booking-success" aria-busy={changing}>
    <h1 className="lr-page-title" ref={heading} tabIndex={-1}>{t(confirmed?'Reserva realizada':active||paymentBusy?'Completa el pago':'Este intento de pago terminó')}</h1>
    <p>{t(confirmed?'Tu reserva está confirmada. Puedes consultar los detalles de tu viaje.':active?'La reserva se realiza únicamente al completar el pago. Termina este paso antes de que venza el tiempo disponible.':'No tienes una reserva confirmada por este intento. Si se recibió un cobro, su devolución se procesa automáticamente.')}</p>
    <dl className="booking-summary">
      <div><dt>{t('Experiencia')}</dt><dd>{checkout.publicationTitle}</dd></div>
      <div><dt>{t('Salida')}</dt><dd>{dateLabel(checkout.departureStartAt)}</dd></div>
      <div><dt>{t('Personas')}</dt><dd>{checkout.numberOfPeople}</dd></div>
      <div className="booking-total"><dt>{t('Total')}</dt><dd>{money(checkout.total)}</dd></div>
    </dl>
    <CurrencyNotice usd={checkout.total}/>
    {!confirmed&&checkout.refundStatus==='failed'?<p className="booking-error" role="alert">{t('No se pudo completar la devolución. Contacta a LaRutica para revisar el pago con el número de intento:')} {checkout.id.slice(0,8).toUpperCase()}</p>:null}
    {!confirmed&&checkout.refundStatus==='pending'?<p className="booking-notice">{t('Devolución en proceso. La reserva no se confirmó y no debes volver a pagar este intento.')}</p>:null}
    {!confirmed&&checkout.paymentStatus==='REFUNDED'?<p className="booking-notice">{t('El pago fue devuelto a tu tarjeta.')}</p>:null}
    {confirmed?<><p>{t('Pago verificado.')} {t('Reserva')} <strong>{reservation.id.slice(0,8).toUpperCase()}</strong></p><Button asChild><Link href={reservationPath(reservation.id)}>{t('Ver mi reserva')}</Link></Button></>:<>
      {active?<p className="booking-notice">{t('Tiempo disponible para completar el pago:')} <strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong>. {t('Al vencer, se liberan los cupos.')}</p>:null}
      {(active||paymentBusy)&&checkout.total>0?<CheckoutPayment checkoutId={checkout.id} onResolved={setCheckout} onSubmitting={setPaymentBusy}/>:null}
      <div className="booking-actions">
        <Button variant="outline" disabled={paymentBusy||changing} onClick={()=>void changeSelection()}>{t(active?'Cambiar selección':'Consultar disponibilidad de nuevo')}</Button>
        <Button variant="outline" disabled={changing} onClick={()=>{void reconcileCheckout(checkout.id).then(setCheckout).catch(e=>setError(e instanceof Error?e.message:'No pudimos comprobar el pago.'));}}>{t('Comprobar estado del pago')}</Button>
      </div>
    </>}
    {error?<p role="alert" className="booking-error">{t(error)}</p>:null}
  </section>;
}
