import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { createTransport } from 'nodemailer';
import { deliverMail, readMailConfig } from '../../lib/mail/send.ts';
import { notifyPublicationDecision } from '../../lib/mail/notify.ts';
import { createSmtp } from './smtp.mjs';

const env = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'sender@example.com', SMTP_PASS: 'password', MAIL_FROM: 'LaRutica <sender@example.com>' };
const message = { to: 'recipient@example.invalid', subject: 'Prueba LaRutica', text: 'Mensaje de prueba: español y ₡.' };
for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) {
  test(`configuración sin ${key} no abre conexión`, async () => {
    const incomplete = { ...env, [key]: '  ' };
    let called = false;
    const result = await deliverMail(message, { env: incomplete, createTransport() { called = true; } });
    assert.equal(result.status, 'failed'); assert.equal(result.code, 'SMTP_CONFIG_INVALID'); assert.equal(called, false);
  });
}
for (const port of ['', '0', '-1', '1.5', '65536', 'abc']) {
  test(`puerto inválido ${JSON.stringify(port)} se rechaza antes de conectar`, () => {
    assert.equal(readMailConfig({ ...env, SMTP_PORT: port }), null);
  });
}
test('puertos 587 y 465 seleccionan STARTTLS y TLS directo respectivamente', () => {
  const starttls = readMailConfig(env), tls = readMailConfig({ ...env, SMTP_PORT: '465' });
  assert.equal(starttls.secure, false); assert.equal(starttls.requireTLS, true);
  assert.equal(tls.secure, true);
  assert.equal(readMailConfig({ ...env, SMTP_SECURE: ' FALSE ' }).secure, false);
  assert.equal(readMailConfig({ ...env, SMTP_SECURE: 'TRUE', SMTP_PORT: '465' }).secure, true);
  assert.equal(readMailConfig({ ...env, SMTP_PORT: '465', SMTP_SECURE: 'false' }), null);
  assert.equal(readMailConfig({ ...env, SMTP_SECURE: 'typo' }), null);
  assert.equal(readMailConfig({ ...env, SMTP_REQUIRE_TLS: 'typo' }), null);
});
test('resolverse sin destinatario aceptado nunca se considera éxito', async () => {
  for (const info of [undefined, { accepted: [], rejected: [] }, { accepted: ['one@example.invalid'], rejected: ['other@example.invalid'] }]) {
    const result = await deliverMail(message, { env, createTransport: () => ({ sendMail: async () => info }) });
    assert.equal(result.status, 'failed'); assert.equal(result.code, 'SMTP_RECIPIENT_REJECTED');
  }
});
test('los diagnósticos conservan código SMTP y fase, sin claves ni respuestas crudas', async () => {
  const logs = [], original = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const result = await deliverMail(message, { env, createTransport: () => ({ sendMail: async () => {
      throw Object.assign(new Error('password must never appear'), {
        code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN', response: 'password raw server response', originalCode: 'ECONNRESET',
      });
    } }) });
    assert.equal(result.code, 'EAUTH'); assert.equal(result.responseCode, 535); assert.equal(result.command, 'AUTH PLAIN');
    assert.equal(result.originalCode, 'ECONNRESET'); assert.doesNotMatch(JSON.stringify(logs), /password/);
  } finally { console.error = original; }
});
test('publicación: un sender que rechaza no convierte una decisión guardada en error', async () => {
  await assert.doesNotReject(() => notifyPublicationDecision({ previousStatus: 'PENDING', status: 'APPROVED', title: 'Prueba', agencyEmail: 'agency@example.invalid' },
    async () => { throw Object.assign(new Error('Injected SMTP failure'), { code: 'ECONNECTION' }); }));
});
for (const mode of ['STARTTLS', 'TLS']) {
  test(`Nodemailer real autentica y envía usando ${mode} y un certificado verificado`, async () => {
    const key = await readFile(new URL('./fixtures/localhost-key.pem', import.meta.url));
    const cert = await readFile(new URL('./fixtures/localhost-cert.pem', import.meta.url));
    const smtp = await createSmtp({ secure: mode === 'TLS', key, cert, disabledCommands: [], allowInsecureAuth: false });
    try {
      const result = await deliverMail(message, {
        env: { ...smtp.env, SMTP_SECURE: String(mode === 'TLS'), SMTP_REQUIRE_TLS: 'true' },
        createTransport: options => createTransport({ ...options, tls: { ca: cert, servername: 'localhost' } }),
      });
      assert.equal(result.status, 'sent', JSON.stringify(result));
      assert.equal(smtp.received.length, 1); assert.match(smtp.received[0].text, /español y ₡/);
    } finally { await smtp.close(); }
  });
}
test('certificado no confiable produce un fallo, sin desactivar validación TLS', async () => {
  const key = await readFile(new URL('./fixtures/localhost-key.pem', import.meta.url));
  const cert = await readFile(new URL('./fixtures/localhost-cert.pem', import.meta.url));
  const smtp = await createSmtp({ secure: true, key, cert });
  try {
    const result = await deliverMail(message, { env: { ...smtp.env, SMTP_SECURE: 'true' } });
    assert.equal(result.status, 'failed'); assert.match(result.code, /TLS|SOCKET|SELF_SIGNED/);
    assert.equal(smtp.received.length, 0);
  } finally { await smtp.close(); }
});
test('un servidor sin saludo SMTP agota el tiempo y devuelve la fase de fallo', async () => {
  const sockets = new Set();
  const server = createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const started = Date.now();
    const result = await deliverMail(message, { env: { ...env, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.address().port),
      SMTP_CONNECTION_TIMEOUT: '500', SMTP_GREETING_TIMEOUT: '300', SMTP_SOCKET_TIMEOUT: '500' } });
    assert.equal(result.code, 'ETIMEDOUT'); assert.equal(result.timeoutType, 'GREETING_TIMEOUT');
    assert.ok(Date.now() - started < 3000);
  } finally { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); }
});
