import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runMailDiagnostic } from '../../lib/mail/diagnostic.ts';
import { createSmtp } from './smtp.mjs';
const token = 'diagnostic-token-exclusive-to-local-tests';
const config = () => ({ MAIL_DIAGNOSTIC_TOKEN: token, MAIL_DIAGNOSTIC_TO: 'diagnostic@example.invalid',
  MAIL_DIAGNOSTIC_EXPIRES_AT: new Date(Date.now() + 60000).toISOString() });
const request = (body = {}, authorization = `Bearer ${token}`, origin = 'http://localhost') => new Request('http://localhost/api/admin/mail/diagnostic', {
  method: 'POST', headers: { origin, authorization, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
test('el diagnóstico está deshabilitado sin capacidad, con token incorrecto o caducado', async () => {
  assert.equal((await runMailDiagnostic(request(), {})).status, 404);
  assert.equal((await runMailDiagnostic(request({}, 'Bearer incorrect'), config())).status, 404);
  assert.equal((await runMailDiagnostic(request(), { ...config(), MAIL_DIAGNOSTIC_EXPIRES_AT: new Date(Date.now() - 1).toISOString() })).status, 404);
  assert.equal((await runMailDiagnostic(request(), { ...config(), MAIL_DIAGNOSTIC_EXPIRES_AT: new Date(Date.now() + 7200000).toISOString() })).status, 404);
});
test('el diagnóstico no permite origen ajeno ni cambiar el destinatario', async () => {
  assert.equal((await runMailDiagnostic(request({}, `Bearer ${token}`, 'https://other.invalid'), config())).status, 403);
  assert.equal((await runMailDiagnostic(request({ to: 'other@example.invalid' }), config())).status, 400);
});
test('el diagnóstico autenticado verifica SMTP sin enviar si no se solicita', async () => {
  const smtp = await createSmtp();
  try {
    const response = await runMailDiagnostic(request(), { ...smtp.env, ...config() });
    assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.data.verified, true);
    assert.equal(result.data.accepted, 0); assert.equal(smtp.received.length, 0);
    assert.doesNotMatch(JSON.stringify(result), /test-password|test-user|diagnostic-token/);
  } finally { await smtp.close(); }
});
test('el diagnóstico recorre los tres notificadores reales y envía cinco pruebas al único buzón configurado', async () => {
  const smtp = await createSmtp();
  try {
    const response = await runMailDiagnostic(request({ send: true }), { ...smtp.env, ...config() });
    assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.data.accepted, 5);
    assert.equal(smtp.received.length, 5);
    assert.ok(smtp.received.every(message => message.to[0] === 'diagnostic@example.invalid'));
    assert.deepEqual(result.data.messages.map(x => x.flow), ['reserva_viajero', 'reserva_agencia', 'cancelacion_salida', 'publicacion_aprobada', 'publicacion_rechazada']);
  } finally { await smtp.close(); }
});
