'use client';

import { Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences/Preferences';
import { money as usd } from '@/modules/booking/types';
import type { StartedPayment } from '../services/payment.service';
import { loadOnvoSdk, type OnvoPaySdkInstance } from '../utils/onvoSdk';
import { onvoFormMessages, onvoPaymentMessage } from '../utils/onvoErrors';
import { preparePaymentSuccessSound, type PaymentSuccessSound } from '../utils/paymentFeedback';
import './onvo-pay.css';

type OnvoPaymentFormProps = {
  startKey: string;
  start: () => Promise<StartedPayment>;
  confirm: (paymentIntentId: string) => Promise<void | boolean>;
  onPaid: () => void;
  onCancel?: () => void;
  onSubmitting?: (busy: boolean) => void;
};

/** Formulario de tarjeta de OnvoPAY. El monto lo fija quien crea la intención, nunca este componente. */
export function OnvoPaymentForm({ startKey, start, confirm, onPaid, onCancel, onSubmitting }: OnvoPaymentFormProps) {
  const { t, language } = usePreferences();
  const titleRef = useRef(t('Formulario de pago seguro'));
  const startRef = useRef(start);
  const confirmRef = useRef(confirm);
  useEffect(() => { titleRef.current = t('Formulario de pago seguro'); }, [t]);
  useEffect(() => { startRef.current = start; confirmRef.current = confirm; });
  const containerId = useId().replace(/:/g, '');
  const [payment, setPayment] = useState<StartedPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error, fieldErrors]);
  const [retry, setRetry] = useState(0);
  const [prepareFailed, setPrepareFailed] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const instance = useRef<OnvoPaySdkInstance | null>(null);
  const busy = useRef(false);
  const successSound = useRef<PaymentSuccessSound | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);
  const submittingRef = useRef(onSubmitting);
  useEffect(() => { submittingRef.current = onSubmitting; }, [onSubmitting]);

  useEffect(() => {
    let cancelled = false;
    const container = () => document.getElementById(`onvo-pay-${containerId}`);
    async function mount() {
      busy.current = false;
      setLoading(true);setReady(false);setError('');setFieldErrors([]);setPrepareFailed(false);setSubmitting(false);setConfirmPending(false);
      try {
        const started = await startRef.current();
        if (cancelled) return;
        setPayment(started);
        const onvo = await loadOnvoSdk();
        if (cancelled) return;
        const target = container();
        if (target) target.innerHTML = '';
        instance.current = onvo.pay({
          publicKey: started.publishableKey,
          paymentIntentId: started.paymentIntentId,
          paymentType: 'one_time',
          locale: language === 'en' ? 'en' : 'es',
          manualSubmit: true,
          branding: true,
          onSuccess: () => {
            if (cancelled) return;
            busy.current = true;
            confirmRef.current(started.paymentIntentId)
              .then((successful) => { if (!cancelled) {busy.current=false;setSubmitting(false);submittingRef.current?.(false);if(successful!==false)successSound.current?.play();onPaidRef.current();} })
              .catch((cause) => {
                if (cancelled) return;
                busy.current = false;
                setSubmitting(false);
                submittingRef.current?.(false);
                setConfirmPending(true);
                setError(cause instanceof Error ? cause.message : 'No pudimos confirmar el pago.');
              });
          },
          onError: (data) => {
            if (cancelled) return;
            busy.current = false;
            setSubmitting(false);
            submittingRef.current?.(false);
            setFieldErrors([]);
            setError(onvoPaymentMessage(data));
          },
          onFormErrors: (data) => {
            if (cancelled) return;
            busy.current = false;
            setSubmitting(false);
            submittingRef.current?.(false);
            setError('Corrige los datos de la tarjeta para continuar.');
            setFieldErrors(onvoFormMessages(data));
          },
        });
        await instance.current.render(`#onvo-pay-${containerId}`);
        if (cancelled) return;
        const markReady = () => {
          const iframe = container()?.querySelector('iframe');
          if (iframe) {
            iframe.setAttribute('title', titleRef.current);
            setReady(true);
          }
        };
        const observer = new MutationObserver(markReady);
        if (target) observer.observe(target, { childList: true, subtree: true });
        markReady(); // The SDK may have inserted its iframe synchronously.
        cleanup = () => observer.disconnect();
      } catch (cause) {
        if (!cancelled) {setPrepareFailed(true);setError(cause instanceof Error ? cause.message : 'No pudimos preparar el pago.');}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    let cleanup = () => {};
    void mount();
    return () => {
      cancelled = true;
      cleanup();
      instance.current = null;
      busy.current = false;
      successSound.current?.dispose();
      successSound.current = null;
      submittingRef.current?.(false);
      const target = container();
      if (target) target.innerHTML = '';
    };
  }, [startKey, containerId, language, retry]);

  function submit() {
    if (busy.current) return;
    successSound.current ??= preparePaymentSuccessSound();
    if (confirmPending && payment) {
      busy.current = true;
      setSubmitting(true);submittingRef.current?.(true);setError('');
      confirmRef.current(payment.paymentIntentId).then((successful)=>{if(successful!==false)successSound.current?.play();onPaidRef.current();}).catch(cause=>setError(cause instanceof Error?cause.message:'No pudimos confirmar el pago.'))
        .finally(()=>{busy.current=false;setSubmitting(false);submittingRef.current?.(false);});
      return;
    }
    if (!instance.current?.submitPayment) {
      setError('El formulario de pago todavía no está listo.');
      return;
    }
    setError('');
    setFieldErrors([]);
    busy.current = true;
    setSubmitting(true);
    submittingRef.current?.(true);
    const failed = () => {
      busy.current = false;
      setSubmitting(false);
      submittingRef.current?.(false);
      setError('No pudimos enviar el pago. Revisa tu conexión e intenta de nuevo.');
    };
    try { void Promise.resolve(instance.current.submitPayment()).catch(failed); } catch { failed(); }
  }

  return <div className="onvo-pay" aria-busy={loading}>
    {loading && <div className="onvo-pay-loading" role="status"><span className="onvo-pay-spinner" aria-hidden="true" />{t('Preparando el pago…')}</div>}
    <div className="onvo-pay-form" hidden={loading}><div id={`onvo-pay-${containerId}`} /></div>
    {error && <div ref={errorRef} className="booking-error" role="alert" tabIndex={-1}><p>{t(error)}</p>{fieldErrors.length > 0 && <ul>{fieldErrors.map(message => <li key={message}>{t(message)}</li>)}</ul>}</div>}
    <div className="booking-actions">
      {prepareFailed ? <Button type="button" onClick={()=>setRetry(n=>n+1)}>{t('Volver a preparar el pago')}</Button> : <Button type="button" disabled={!ready || submitting || loading} onClick={submit}>
        {submitting && <span className="onvo-pay-spinner onvo-pay-button-spinner" aria-hidden="true" />}
        {submitting ? t('Procesando pago…') : confirmPending ? t('Comprobar pago') : `${t('Pagar')} ${payment ? usd(payment.amount) : ''}`.trim()}
      </Button>}
      {onCancel && <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>{t('Volver')}</Button>}
    </div>
    {submitting && <p className="onvo-pay-progress" role="status">{t('Estamos procesando tu pago. Espera un momento…')}</p>}
    <p className="onvo-pay-secure"><Lock size={14} aria-hidden="true" />{t('Pago seguro con OnvoPAY. LaRutica no guarda los datos de tu tarjeta.')}</p>
  </div>;
}
