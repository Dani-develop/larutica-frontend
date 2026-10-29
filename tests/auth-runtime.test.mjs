import assert from 'node:assert/strict';
import test from 'node:test';
import { responseErrorMessage } from '../lib/api/response-error.ts';
import { loadWebAuthn } from '../lib/supabase/webauthn-runtime.ts';

test('un error booleano del host nunca se muestra como true', () => {
  for (const body of [{error:true}, {error:false}, {error:500}, null, {}, {error:''}]) {
    assert.equal(responseErrorMessage(body), 'No se pudo completar la solicitud.');
  }
  assert.equal(responseErrorMessage({error:'El correo o la contraseña no son correctos.'}), 'El correo o la contraseña no son correctos.');
});

test('WebAuthn se inicializa y genera opciones con verificación de usuario', async () => {
  const first = loadWebAuthn();
  assert.equal(loadWebAuthn(), first);
  const { generateAuthenticationOptions, generateRegistrationOptions } = await first;
  const options = await generateAuthenticationOptions({rpID:'larutica-cr.vercel.app',userVerification:'required'});
  assert.equal(options.rpId,'larutica-cr.vercel.app');
  assert.equal(options.userVerification,'required');
  assert.ok(options.challenge.length > 20);
  const registration = await generateRegistrationOptions({rpName:'LaRutica',rpID:'larutica-cr.vercel.app',userName:'qa@example.invalid',authenticatorSelection:{userVerification:'required'}});
  assert.equal(registration.rp.id,'larutica-cr.vercel.app');
});
