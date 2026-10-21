export type OnvoPaySdkConfig = {
  publicKey: string;
  paymentIntentId: string;
  paymentType: 'one_time' | 'subscription';
  locale?: 'es' | 'en';
  manualSubmit?: boolean;
  branding?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (data: unknown) => void;
};

export type OnvoPaySdkInstance = {
  render: (selector: string) => void;
  submitPayment?: () => void;
};

export type OnvoPaySdk = {
  pay: (config: OnvoPaySdkConfig) => OnvoPaySdkInstance;
};

declare global {
  interface Window {
    onvo?: OnvoPaySdk;
  }
}

export const ONVO_SDK_URL = 'https://sdk.onvopay.com/sdk.js';

export function loadOnvoSdk(): Promise<OnvoPaySdk> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('El formulario de pago solo está disponible en el navegador.'));
  }
  if (window.onvo) return Promise.resolve(window.onvo);

  return new Promise((resolve, reject) => {
    const ready = () => (window.onvo ? resolve(window.onvo) : reject(new Error('El formulario de pago no está disponible.')));
    const failed = () => reject(new Error('No pudimos cargar el formulario de pago. Revisa tu conexión e intenta de nuevo.'));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ONVO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', ready);
      existing.addEventListener('error', failed);
      return;
    }
    const script = document.createElement('script');
    script.src = ONVO_SDK_URL;
    script.async = true;
    script.onload = ready;
    script.onerror = failed;
    document.body.appendChild(script);
  });
}
