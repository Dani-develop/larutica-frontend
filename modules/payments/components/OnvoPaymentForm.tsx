'use client';

import { Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences/Preferences';
import { money as usd } from '@/modules/booking/types';
import type { StartedPayment } from '../services/payment.service';
import { loadOnvoSdk, type OnvoPaySdkInstance } from '../utils/onvoSdk';
import './onvo-pay.css';

type OnvoPaymentFormProps = {
  startKey: string;
  start: () => Promise<StartedPayment>;
  confirm: (paymentIntentId: string) => Promise<void>;
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
  const [retry, setRetry] = useState(0);
  const [prepareFailed, setPrepareFailed] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const instance = useRef<OnvoPaySdkInstance | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);
  const submittingRef = useRef(onSubmitting);
  useEffect(() => { submittingRef.current = onSubmitting; }, [onSubmitting]);

  useEffect(() => {
    let cancelled = false;
    const container = () => document.getElementById(`onvo-pay-${containerId}`);
    async function mount() {
      setLoading(true);setReady(false);setError('');setPrepareFailed(false);setSubmitting(false);setConfirmPending(false);
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
            confirmRef.current(started.paymentIntentId)
              .then(() => { if (!cancelled) {setSubmitting(false);submittingRef.current?.(false);onPaidRef.current();} })
              .catch((cause) => {
                if (cancelled) return;
                setSubmitting(false);
                submittingRef.current?.(false);
                setConfirmPending(true);
                setError(cause instanceof Error ? cause.message : 'No pudimos confirmar el pago.');
              });
          },
          onError: (data) => {
            if (cancelled) return;
            setSubmitting(false);
            submittingRef.current?.(false);
            const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : '';
            setError(message || 'No pudimos procesar el pago. Revisa los datos de tu tarjeta e intenta de nuevo.');
          },
        });
        instance.current.render(`#onvo-pay-${containerId}`);
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
      submittingRef.current?.(false);
      const target = container();
      if (target) target.innerHTML = '';
    };
  }, [startKey, containerId, language, retry]);

  function submit() {
    if (submitting) return;
    if (confirmPending && payment) {
      setSubmitting(true);submittingRef.current?.(true);setError('');
      confirmRef.current(payment.paymentIntentId).then(()=>onPaidRef.current()).catch(cause=>setError(cause instanceof Error?cause.message:'No pudimos confirmar el pago.'))
        .finally(()=>{setSubmitting(false);submittingRef.current?.(false);});
      return;
    }
    if (!instance.current?.submitPayment) {
      setError('El formulario de pago todavía no está listo.');
      return;
    }
    setError('');
    setSubmitting(true);
    submittingRef.current?.(true);
    try {instance.current.submitPayment();} catch(cause) {setSubmitting(false);submittingRef.current?.(false);setError(cause instanceof Error?cause.message:'No pudimos enviar el pago.');}
  }

  return <div className="onvo-pay" aria-busy={loading}>
    {loading && <div className="onvo-pay-loading" role="status"><span className="onvo-pay-spinner" aria-hidden="true" />{t('Preparando el pago…')}</div>}
    <div className="onvo-pay-form" hidden={loading}><div id={`onvo-pay-${containerId}`} /></div>
    {error && <p className="booking-error" role="alert">{t(error)}</p>}
    <div className="booking-actions">
      {prepareFailed ? <Button type="button" onClick={()=>setRetry(n=>n+1)}>{t('Volver a preparar el pago')}</Button> : <Button type="button" disabled={!ready || submitting || loading} onClick={submit}>
        {submitting ? t('Procesando pago…') : confirmPending ? t('Comprobar pago') : `${t('Pagar')} ${payment ? usd(payment.amount) : ''}`.trim()}
      </Button>}
      {onCancel && <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>{t('Volver')}</Button>}
    </div>
    <p className="onvo-pay-secure"><Lock size={14} aria-hidden="true" />{t('Pago seguro con OnvoPAY. LaRutica no guarda los datos de tu tarjeta.')}</p>
  </div>;
}
