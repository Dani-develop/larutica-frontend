import { test, expect, openPayment } from './fixtures';

// F-03 Consulta y cancelación de reservas. Criterios en
// docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md.
// UI real -> rutas reales de la API -> PostgreSQL embebido; Onvo simulado.

test.describe('F-03 reservas', () => {
  test.describe('agencia', () => {
    test.use({ actor: 'owner' });

    test('F03-C1 la agencia ve reservas pagadas sin confirmación manual', async ({ page, qa }) => {
      await qa.seedPaid();
      await page.goto('/dashboard/reservations');
      await page.locator('.manage-publication').first().click();
      await expect(page.locator('.manage-table tbody tr')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Confirmar reserva', exact: true })).toHaveCount(0);
      await expect(page.locator('option[value=PENDING]')).toHaveCount(0);
    });
  });

  test('F03-C2 el viajero cancela su reserva antes de la salida', async ({ page, qa }) => {
    await openPayment(page);
    await page.getByRole('button', { name: /^Pagar USD/ }).click();
    await page.getByRole('link', { name: 'Ver mi reserva', exact: true }).click();

    await page.getByRole('button', { name: 'Cancelar viaje', exact: true }).click();
    // Diálogo de confirmación propio de la app (no es un confirm() nativo).
    await page.getByRole('button', { name: 'Sí, cancelar viaje', exact: true }).click();

    await expect.poll(async () => (await qa.state()).reservations[0]?.status).toBe('CANCELLED');
  });

  test('F03-E1 una reserva ya cancelada no se puede cancelar otra vez', async ({ qa }) => {
    const { id } = await qa.seedPaid();
    const first = await qa.api('traveler', 'PATCH', `/api/reservations/${id}`, { status: 'CANCELLED' });
    expect(first.ok()).toBe(true);

    const again = await qa.api('traveler', 'PATCH', `/api/reservations/${id}`, { status: 'CANCELLED' });
    expect(again.status()).toBe(400);
    expect((await qa.state()).reservations[0].status).toBe('CANCELLED');
  });

  test('F03-A1 otro viajero no puede ver ni cancelar una reserva ajena', async ({ qa }) => {
    const { id } = await qa.seedPaid();
    // Control: la persona dueña sí ve su reserva; así el rechazo de abajo no es un falso positivo.
    expect((await qa.api('traveler', 'GET', `/api/reservations/${id}`)).status()).toBe(200);

    const read = await qa.api('second', 'GET', `/api/reservations/${id}`);
    expect([403, 404]).toContain(read.status());
    expect(JSON.stringify(await read.json())).not.toContain(id);

    const cancel = await qa.api('second', 'PATCH', `/api/reservations/${id}`, { status: 'CANCELLED' });
    expect([403, 404]).toContain(cancel.status());
    expect((await qa.state()).reservations[0].status).toBe('CONFIRMED');
  });

  test.describe('sin sesión', () => {
    test.use({ actor: 'anonymous' });

    test('F03-A3 la API responde 401 y no filtra la reserva', async ({ qa }) => {
      const { id } = await qa.seedPaid();
      expect((await qa.api('traveler', 'GET', `/api/reservations/${id}`)).status()).toBe(200);
      const read = await qa.api('anonymous', 'GET', `/api/reservations/${id}`);
      expect(read.status()).toBe(401);
      const cancel = await qa.api('anonymous', 'PATCH', `/api/reservations/${id}`, { status: 'CANCELLED' });
      expect(cancel.status()).toBe(401);
      expect((await qa.state()).reservations[0].status).toBe('CONFIRMED');
    });

    test('F03-A3 la interfaz no muestra reservas sin sesión', async ({ page, qa }) => {
      await qa.seedPaid();
      await page.goto('/?viaje=reservas');
      await expect(page.getByRole('button', { name: 'Cancelar viaje', exact: true })).toHaveCount(0);
      await expect(page.getByText('Mis reservas', { exact: true })).not.toBeVisible();
    });
  });
});
