import assert from 'node:assert/strict';
import test from 'node:test';
import { safeBookingReturn } from '../modules/auth/utils/returnTo.ts';
test('login conserva una selección local y rechaza redirecciones externas', () => {
  const path = '/experiencias/00000000-0000-4000-8000-000000000001?salida=abc&personas=2';
  assert.equal(safeBookingReturn(path),path);
  assert.equal(safeBookingReturn('/mis-reservas'),'/mis-reservas');
  for (const bad of ['https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)','/api/admin/users',null]) {
    assert.equal(safeBookingReturn(bad),'/dashboard');
  }
});
