import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, createPublicKey, X509Certificate } from 'node:crypto';
import { createMailRelay } from '../../supabase/functions/mail-relay/handler.mjs';
import { tokenHash } from '../../supabase/functions/mail-relay/relay-config.mjs';
import { localhostTlsFixture } from '../mail/fixtures/localhost-tls.mjs';

test('la identidad TLS generada corresponde al certificado de localhost', async () => {
  const { key, cert: certPem } = await localhostTlsFixture();
  const cert = new X509Certificate(certPem);
  const keyObject = createPrivateKey(key);
  assert.equal(cert.subject, 'CN=localhost');
  assert.equal(cert.subjectAltName, 'DNS:localhost, IP Address:127.0.0.1');
  assert.ok(cert.publicKey.export({ type: 'spki', format: 'der' }).equals(
    createPublicKey(keyObject).export({ type: 'spki', format: 'der' }),
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
