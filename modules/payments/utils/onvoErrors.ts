const formMessages: Record<string, string> = {
  cardholderName: 'Ingresa el nombre que aparece en la tarjeta.',
  cardNumber: 'Ingresa un número de tarjeta válido.',
  expDate: 'Revisa la fecha de vencimiento de la tarjeta (MM/AA).',
  code: 'Ingresa un código de seguridad (CVV) válido.',
  paymentMethod: 'Selecciona un método de pago.',
};

// ONVO reports client-side validation separately from payment errors.
// Only display field hints; never copy card data from callback payloads.
export function onvoFormMessages(data: unknown): string[] {
  const errors = Array.isArray(data) ? data : [];
  const messages = errors.flatMap(error => {
    if (!error || typeof error !== 'object' || typeof error.field !== 'string') return [];
    const message = formMessages[error.field];
    return message ? [message] : [];
  });
  return messages.length ? [...new Set(messages)] : ['Revisa los campos del formulario antes de pagar.'];
}

export function onvoPaymentMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const details = 'details' in data ? data.details : null;
    const card = details && typeof details === 'object' && 'card' in details ? details.card : null;
    if (card && typeof card === 'object' && 'reason' in card) {
      if (card.reason === 'issuer_declined') return 'El banco rechazó la tarjeta. Consulta al emisor o utiliza otra tarjeta.';
      if (card.reason === 'gateway_declined') return 'No se pudo aceptar la tarjeta. Revisa sus datos o utiliza otra tarjeta.';
    }
  }
  return 'No pudimos procesar el pago. Revisa los datos de tu tarjeta e intenta de nuevo.';
}
