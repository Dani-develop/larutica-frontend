'use client';

import { Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences/Preferences';
import { money as usd } from '@/modules/booking/types';
import { confirmReservationPayment, startReservationPayment, type StartedPayment } from '../services/payment.service';
import { loadOnvoSdk, type OnvoPaySdkInstance } from '../utils/onvoSdk';
import './onvo-pay.css';

type ReservationPaymentProps = {
  reservationId: string;
  onPaid: () => void;
  onCancel?: () => void;
};

/** Cobra una reserva con el formulario de OnvoPAY. El monto lo fija el servidor, nunca este componente. */
export function ReservationPayment({ reservationId, onPaid, onCancel }: ReservationPaymentProps) {
  const { t, language } = usePreferences();
  const titleRef = useRef(t('Formulario de pago seguro'));
  useEffect(() => { titleRef.current = t('Formulario de pago seguro'); }, [t]);
  const containerId = useId().replace(/:/g, '');
  const [payment, setPayment] = useState<StartedPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const instance = useRef<OnvoPaySdkInstance | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  useEffect(() => {
    let cancelled = false;
    const container = () => document.getElementById(`onvo-pay-${containerId}`);
    async function mount() {
      try {
        const started = await startReservationPayment(reservationId);
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
            // El navegador solo avisa; el servidor consulta a Onvo antes de marcar el cobro.
            confirmReservationPayment(reservationId, started.paymentIntentId)
              .then(() => { if (!cancelled) onPaidRef.current(); })
              .catch((cause) => {
                if (cancelled) return;
                setSubmitting(false);
                setError(cause instanceof Error ? cause.message : 'No pudimos confirmar el pago.');
              });
          },
          onError: (data) => {
            if (cancelled) return;
            setSubmitting(false);
            const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : '';
            setError(message || 'No pudimos procesar el pago. Revisa los datos de tu tarjeta e intenta de nuevo.');
          },
        });
        instance.current.render(`#onvo-pay-${containerId}`);
        const observer = new MutationObserver(() => {
          const iframe = container()?.querySelector('iframe');
          if (iframe) {
            iframe.setAttribute('title', titleRef.current);
            setReady(true);
          }
        });
        if (target) observer.observe(target, { childList: true, subtree: true });
        cleanup = () => observer.disconnect();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No pudimos preparar el pago.');
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
      const target = container();
      if (target) target.innerHTML = '';
    };
  }, [reservationId, containerId, language]);

  function submit() {
    if (!instance.current?.submitPayment) {
      setError('El formulario de pago todavía no está listo.');
      return;
    }
    setError('');
    setSubmitting(true);
    instance.current.submitPayment();
  }

  return <div className="onvo-pay" aria-busy={loading}>
    {loading && <div className="onvo-pay-loading" role="status"><span className="onvo-pay-spinner" aria-hidden="true" />{t('Preparando el pago…')}</div>}
    <div className="onvo-pay-form" hidden={loading}><div id={`onvo-pay-${containerId}`} /></div>
    {error && <p className="booking-error" role="alert">{t(error)}</p>}
    <div className="booking-actions">
      <Button type="button" disabled={!ready || submitting || loading} onClick={submit}>
        {submitting ? t('Procesando pago…') : `${t('Pagar')} ${payment ? usd(payment.amount) : ''}`.trim()}
      </Button>
      {onCancel && <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>{t('Pagar después')}</Button>}
    </div>
    <p className="onvo-pay-secure"><Lock size={14} aria-hidden="true" />{t('Pago seguro con OnvoPAY. LaRutica no guarda los datos de tu tarjeta.')}</p>
  </div>;
}
