import { createTransport } from 'nodemailer';
import { callMailRelay, deliverMail, mailFailure, readMailConfig, smtpTransportOptions } from '../lib/mail/send.ts';
import { departureCancellationMessage, publicationDecisionMessage, reservationConfirmationMessages } from '../lib/mail/messages.ts';

// No secrets in arguments, output or reports. Node loads the ignored .env.local.
const args = process.argv.slice(2);
const send = args.includes('--send-flows');
const index = args.indexOf('--to');
const to = index >= 0 ? args[index + 1] : null;
const allowed = index < 0 ? args : args.filter((_, i) => i !== index && i !== index + 1);
if (args.includes('--help')) {
  console.log('npm run mail:check -- [--send-flows --to destinatario@example.com]');
  console.log('Sin --send-flows solo verifica DNS, conexión, TLS y autenticación. No envía correos.');
  process.exit(0);
}
if (allowed.some(arg => arg !== '--send-flows') || (send && (!to || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)))) {
  console.error('Uso: npm run mail:check -- [--send-flows --to destinatario@example.com]');
  process.exit(1);
}
const config = readMailConfig();
if (!config) {
  console.error('SMTP_CONFIG_INVALID: revisa las variables SMTP en el backend o en el archivo ignorado .env.local.');
  process.exit(1);
}
const transport = process.env.MAIL_RELAY_URL || process.env.MAIL_RELAY_TOKEN ? null : createTransport(smtpTransportOptions(config));
try {
  if (transport) await transport.verify();
  else {
    const result = await callMailRelay('verify', config, process.env);
    if (!('verified' in result)) throw result;
  }
  console.log('SMTP_VERIFY_OK: conexión, TLS y autenticación correctos. Todavía no se ha verificado la entrega a un buzón.');
} catch (error) {
  mailFailure(error); process.exitCode = 1;
} finally { transport?.close(); }
if (!process.exitCode && send) {
  const facts = { id: '00000001-0000-4000-8000-000000000000', publicationTitle: '[PRUEBA] LaRutica — correo',
    departureStartAt: '2099-06-15T15:00:00.000Z', numberOfPeople: 2, total: 80,
    passengerName: 'Prueba de correo', passengerEmail: to, agencyEmail: to };
  const messages = [
    ...reservationConfirmationMessages(facts, true),
    departureCancellationMessage(facts),
    ...['APPROVED', 'REJECTED'].map(status => publicationDecisionMessage({ previousStatus: 'PENDING', status,
      title: facts.publicationTitle, agencyEmail: to })),
  ];
  let sent = 0;
  for (const [i, message] of messages.entries()) {
    const result = await deliverMail({ ...message, subject: `[PRUEBA ${i + 1}/5] ${message.subject}` });
    if (result.status === 'sent') sent++;
  }
  console.log(`SMTP_ACCEPTED: ${sent}/5. Estos mensajes prueban transporte y plantillas; no crean reservas ni publicaciones.`);
  if (sent !== 5) process.exitCode = 1;
}
