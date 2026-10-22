import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createSmtp } from './smtp.mjs';

async function check(env, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', 'scripts/mail-check.mjs', ...args], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)), env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', chunk => output += chunk);
    child.stderr.on('data', chunk => output += chunk);
    child.on('error', reject);
    child.on('exit', code => resolve({ code, output }));
  });
}
test('mail:check verifica SMTP sin enviar correos', async () => {
  const smtp = await createSmtp();
  try {
    const result = await check(smtp.env);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /SMTP_VERIFY_OK/);
    assert.equal(smtp.received.length, 0);
  } finally { await smtp.close(); }
});
test('mail:check --send-flows entrega las siete plantillas al buzón indicado', async () => {
  const smtp = await createSmtp();
  try {
    const result = await check(smtp.env, ['--send-flows', '--to', 'cli@example.invalid']);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /SMTP_ACCEPTED: 7\/7/);
    assert.equal(smtp.received.length, 7);
    assert.ok(smtp.received.every(message => message.to[0] === 'cli@example.invalid'));
    assert.ok(smtp.received.every(message => message.subject.startsWith('[PRUEBA')));
  } finally { await smtp.close(); }
});
test('mail:check falla ante autenticación rechazada sin enviar plantillas ni imprimir la clave', async () => {
  const smtp = await createSmtp(); smtp.state.failAuth = true;
  try {
    const result = await check(smtp.env, ['--send-flows', '--to', 'cli@example.invalid']);
    assert.equal(result.code, 1);
    assert.match(result.output, /EAUTH/);
    assert.doesNotMatch(result.output, /test-password/);
    assert.equal(smtp.received.length, 0);
  } finally { await smtp.close(); }
});
