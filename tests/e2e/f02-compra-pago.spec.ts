import { test, expect, openPayment, chooseTrip, DEPARTURE } from './fixtures';

// F-02 Compra y pago de una reserva. Criterios en
// docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md.
// UI real (build de Vercel) -> rutas reales de la API -> PostgreSQL embebido; Onvo simulado.

test.describe('F-02 compra y pago', () => {
  test('F02-C1 la reserva se crea solo después del cobro', async ({ page, qa }) => {
    await openPayment(page);
    expect((await qa.state()).reservations).toHaveLength(0);

    await page.getByRole('button', { name: /^Pagar USD/ }).click();
    await expect(page.getByRole('heading', { name: 'Reserva realizada', exact: true })).toBeVisible();

    const { reservations } = await qa.state();
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({ status: 'CONFIRMED', number_of_people: 2 });
  });

  test('F02-E1 tarjeta rechazada: sin reserva y se puede reintentar sin duplicar reservas ni cobros', async ({ page, qa }) => {
    await openPayment(page);
    await page.evaluate(() => { (window as unknown as { qaDecline: boolean }).qaDecline = true; });
    await page.getByRole('button', { name: /^Pagar USD/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect((await qa.state()).reservations).toHaveLength(0);

    await page.getByRole('button', { name: /^Pagar USD/ }).click();
    await expect(page.getByRole('heading', { name: 'Reserva realizada', exact: true })).toBeVisible();
    const state = await qa.state();
    expect(state.reservations).toHaveLength(1);
    expect(state.intents).toHaveLength(1);
  });

  test('F02-E2 intento vencido: no hay reserva y se puede consultar de nuevo', async ({ page, qa }) => {
    await openPayment(page);
    await qa.expire();
    await page.getByRole('button', { name: 'Comprobar estado del pago', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Este intento de pago terminó', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Consultar disponibilidad de nuevo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Revisar reserva', exact: true })).toBeVisible();
    expect((await qa.state()).reservations).toHaveLength(0);
  });

  test('F02-A1 la API rechaza pasajero ajeno, cantidades inválidas y campos extra', async ({ qa }) => {
    const attempts: unknown[] = [
      { departureId: DEPARTURE, numberOfPeople: 2, passengerId: '22222222-2222-4222-8222-222222222222' },
      { departureId: DEPARTURE, numberOfPeople: 0 },
      { departureId: DEPARTURE, numberOfPeople: -3 },
      { departureId: DEPARTURE, numberOfPeople: 2, unitPrice: 0.01 },
      { departureId: 'no-es-un-uuid', numberOfPeople: 2 },
    ];
    for (const body of attempts) {
      const response = await qa.api('traveler', 'POST', '/api/checkouts', body);
      expect(response.status(), JSON.stringify(body)).toBe(400);
    }
    const state = await qa.state();
    expect(state.checkouts).toHaveLength(0);
    expect(state.reservations).toHaveLength(0);
  });

  test('F02-A2 cancelar durante el pago nunca muestra una reserva exitosa', async ({ page, qa }) => {
    await openPayment(page);
    const { checkouts } = await qa.state();
    const cancel = await qa.api('traveler', 'DELETE', `/api/checkouts/${checkouts[0].id}`);
    expect(cancel.ok()).toBe(true);

    await page.getByRole('button', { name: /^Pagar USD/ }).click();
    await expect(page.getByRole('heading', { name: 'Este intento de pago terminó', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reserva realizada', exact: true })).toHaveCount(0);
    await expect(page.getByText('Devolución en proceso.', { exact: false })).toBeVisible();
    expect((await qa.state()).reservations).toHaveLength(0);
  });

  test.describe('sin sesión', () => {
    test.use({ actor: 'anonymous' });

    test('F02-A3 crear un intento de compra sin sesión devuelve 401 y no guarda nada', async ({ qa }) => {
      const response = await qa.api('anonymous', 'POST', '/api/checkouts', { departureId: DEPARTURE, numberOfPeople: 2 });
      expect(response.status()).toBe(401);
      expect((await qa.state()).checkouts).toHaveLength(0);
    });

    test('F02-A3 la interfaz no permite continuar al pago sin sesión', async ({ page, qa }) => {
      await chooseTrip(page);
      await expect(page.getByRole('button', { name: 'Continuar al pago', exact: true })).toHaveCount(0);
      expect((await qa.state()).checkouts).toHaveLength(0);
    });
  });
});
