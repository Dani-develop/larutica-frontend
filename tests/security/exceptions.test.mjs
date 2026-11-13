import test from 'node:test';
import assert from 'node:assert/strict';
import { inventory } from '../../scripts/security/check-exceptions.mjs';

const issue = (number, title = 'Hallazgo') => ({ number, title, state: 'open', labels: [] });

test('un inventario vacío no afirma aprobación ni registro confirmado', async () => {
  const result = await inventory(async () => []);
  assert.equal(result.issuesVisible, 0);
  assert.equal(result.registryConfirmedByOwner, false);
  assert.equal(result.approvalsVerified, false);
});
test('separa PR de Issues y detecta solicitudes sin aprobarlas', async () => {
  const result = await inventory(async () => [
    { ...issue(1, 'E-01'), pull_request: {} }, issue(2), issue(3, '[E-02] Solicitud'), issue(4, '[E-pendiente] Solicitud'),
  ]);
  assert.equal(result.issuesVisible, 3);
  assert.deepEqual(result.exceptionCandidates.map(entry => entry.id), ['E-02', null]);
  assert.equal(result.approvalsVerified, false);
});
test('recorre páginas y conserva estados sin publicar cuerpos', async () => {
  const requested = [];
  const result = await inventory(async page => {
    requested.push(page);
    return page === 1 ? Array.from({ length: 100 }, (_, index) => issue(index + 1)) : [
      { ...issue(101, 'E-03'), state: 'closed', body: 'NO_PUBLICAR', labels: ['exception'] },
    ];
  });
  assert.deepEqual(requested, [1, 2]);
  assert.equal(result.issuesVisible, 101);
  assert.equal(result.exceptionCandidates[0].state, 'closed');
  assert.doesNotMatch(JSON.stringify(result), /NO_PUBLICAR|body/);
});
test('errores de API y respuestas incompletas nunca equivalen a inventario vacío', async () => {
  await assert.rejects(inventory(async () => { throw new Error('HTTP 403'); }));
  await assert.rejects(inventory(async () => ({ message: 'fallo' })));
  await assert.rejects(inventory(async () => [{ number: 1 }]));
});
test('detecta candidatos por etiqueta sin inventar un ID E-NN', async () => {
  const result = await inventory(async () => [{ ...issue(1), labels: [{ name: 'excepción' }] }]);
  assert.equal(result.exceptionCandidates.length, 1);
  assert.equal(result.exceptionCandidates[0].id, null);
});
