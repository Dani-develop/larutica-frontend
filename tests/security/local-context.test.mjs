import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createPrivateKey, createPublicKey, X509Certificate } from 'node:crypto';
import { localhostTls } from '../mail/fixtures/localhost-tls.mjs';
import { createMailRelay } from '../../supabase/functions/mail-relay/handler.mjs';
import { tokenHash } from '../../supabase/functions/mail-relay/relay-config.mjs';

test('H-04: no hay clave privada versionada; el material TLS de pruebas es efímero', async () => {
  assert.equal(existsSync(new URL('../mail/fixtures/localhost-key.pem', import.meta.url)), false);
  const material = await localhostTls();
  const cert = new X509Certificate(material.cert);
  const key = createPrivateKey(material.key);
  assert.ok(Date.parse(cert.validTo) - Date.now() <= 24 * 60 * 60 * 1000, 'vigencia máxima de un día');
  assert.equal(cert.subject, 'CN=localhost');
  assert.equal(cert.subjectAltName, 'DNS:localhost, IP Address:127.0.0.1');
  assert.ok(cert.publicKey.export({ type: 'spki', format: 'der' }).equals(
    createPublicKey(key).export({ type: 'spki', format: 'der' }),
  ));
});

test('el hash publicado no puede reproducirse como Bearer contra el handler local', async () => {
  let smtpCalls = 0;
  const handler = createMailRelay({ tokenHash, createTransport() { smtpCalls++; throw new Error('No debe abrir SMTP'); } });
  // Request en memoria: no fetch, servicios externos, credenciales reales ni SMTP.
  const result = await handler(new Request('https://relay.invalid', {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenHash}` },
    body: '{}',
  }));
  assert.equal(result.status, 401);
  assert.equal(smtpCalls, 0);
});

test('una petición sin token se rechaza antes de crear transporte', async () => {
  let smtpCalls = 0;
  const handler = createMailRelay({ tokenHash, createTransport() { smtpCalls++; throw new Error('No debe abrir SMTP'); } });
  const result = await handler(new Request('https://relay.invalid', { method: 'POST', body: '{}' }));
  assert.equal(result.status, 401);
  assert.equal(smtpCalls, 0);
});
