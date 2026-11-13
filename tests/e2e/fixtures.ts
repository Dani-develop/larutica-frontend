import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

// Datos ficticios del harness aislado (tests/mail/database.mjs y tests/qa/checkout-server.mjs).
export const API = 'http://127.0.0.1:4188';
export const PUBLICATION = '77777777-7777-4777-8777-777777777777';
export const DEPARTURE = '88888888-8888-4888-8888-888888888888';

export type Actor = 'traveler' | 'second' | 'owner' | 'admin' | 'anonymous';

type QaState = {
  reservations: { id: string; status: string; number_of_people: number }[];
  checkouts: { id: string; status: string; number_of_people: number }[];
  intents: { id: string; status: string }[];
};

type Fixtures = {
  /** Quién es la persona autenticada en el harness (cabecera x-qa-actor). */
  actor: Actor;
  qa: {
    state: () => Promise<QaState>;
    seedPaid: () => Promise<{ id: string }>;
    expire: () => Promise<void>;
    /** Llama directamente a la API del harness, sin pasar por la interfaz. */
    api: (actor: Actor, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) => ReturnType<APIRequestContext['fetch']>;
  };
};

// Reemplaza el SDK de Onvo: ningún dato de tarjeta real ni red externa.
function installOnvoStub() {
  type Config = {
    paymentIntentId: string;
    onSuccess: (value: unknown) => void;
    onError: (value: { message: string }) => void;
  };
  const w = window as unknown as Record<string, unknown>;
  w.onvo = {
    pay: (config: Config) => ({
      render: (selector: string) => {
        const frame = document.createElement('iframe');
        frame.srcdoc = '<html lang="es"><body>Formulario de pago simulado</body></html>';
        const host = document.querySelector(selector) as unknown as HTMLElement | null;
        host?.appendChild(frame);
      },
      submitPayment: () => {
        if (w.qaDecline) {
          w.qaDecline = false;
          config.onError({ message: 'Tarjeta rechazada en simulación' });
          return;
        }
        fetch('/__qa/succeed', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: config.paymentIntentId }),
        }).then(() => config.onSuccess({}));
      },
    }),
  };
  // El sonido de confirmación no se necesita en las pruebas.
  w.AudioContext = class {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  };
}

export const test = base.extend<Fixtures>({
  actor: ['traveler', { option: true }],

  qa: async ({ request }, use) => {
    await request.get(`${API}/__qa/reset`);
    const api: Fixtures['qa']['api'] = (actor, method, path, body) =>
      request.fetch(`${API}${path}`, {
        method,
        headers: { 'x-qa-actor': actor, 'content-type': 'application/json' },
        data: body === undefined ? undefined : JSON.stringify(body),
        failOnStatusCode: false,
      });
    await use({
      state: async () => (await request.get(`${API}/__qa/state`)).json(),
      // Crea un checkout pagado del viajero y devuelve el id de la RESERVA (no del checkout).
      seedPaid: async () => {
        const seeded = await (await request.get(`${API}/__qa/seed-paid`)).json();
        return { id: seeded.reservation.id as string };
      },
      expire: async () => { await request.get(`${API}/__qa/expire`); },
      api,
    });
  },

  page: async ({ page, context, actor }, use) => {
    await context.addInitScript(installOnvoStub);
    // Todo /api y /__qa va al harness aislado con la identidad del test; cualquier host externo se bloquea.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__qa/')) {
        const response = await route.fetch({
          url: API + url.pathname + url.search,
          headers: { 'content-type': 'application/json', 'x-qa-actor': actor },
        });
        return route.fulfill({ response });
      }
      return route.continue();
    });
    await use(page);
  },
});

export { expect };

export async function chooseTrip(page: Page, people = 2) {
  await page.goto(`/experiencias/${PUBLICATION}`);
  await page.getByRole('spinbutton').fill(String(people));
  await page.getByRole('button', { name: 'Revisar reserva', exact: true }).click();
}

export async function openPayment(page: Page, people = 2) {
  await chooseTrip(page, people);
  await page.getByRole('button', { name: 'Continuar al pago', exact: true }).click();
  await page.getByRole('heading', { name: 'Completa el pago', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Pagar USD/ }).waitFor();
}
