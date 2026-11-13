import { test, expect, PUBLICATION } from './fixtures';
import type { Page } from '@playwright/test';

// F-01 Inicio de sesión y acceso por rol. Criterios en
// docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md.
//
// Límite conocido: el inicio de sesión real depende de Supabase Auth y no existe en el
// ambiente aislado. Aquí se simula la API /api/auth/login y /api/auth/session; se prueba
// la interfaz (formulario, mensajes y redirección segura), no la verificación de contraseña.
// La protección de la API sin sesión se comprueba en F02-A3 y en el ítem 4.5.

type Role = 'Admin' | 'Viajero' | 'Agencia' | 'Transporte';
const USER_ID = '11111111-1111-4111-8111-111111111111';

async function mockAuth(page: Page, options: { role: Role; failLogin?: boolean }) {
  let signedIn = false;
  await page.route('**/api/auth/login', route => {
    if (options.failLogin) return route.fulfill({ status: 401, json: { error: 'Correo o contraseña incorrectos.' } });
    signedIn = true;
    return route.fulfill({ json: session(options.role) });
  });
  await page.route('**/api/auth/session', route =>
    signedIn ? route.fulfill({ json: session(options.role) }) : route.fulfill({ status: 401, json: { error: 'Sin sesión' } }));
}

function session(role: Role) {
  return {
    data: {
      user: { id: USER_ID, role, status: 'Activo', name: 'Usuario QA', email: 'qa@example.invalid', phone: '88888888' },
      session: {
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        idleExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    },
  };
}

async function signIn(page: Page, next?: string) {
  await page.goto('/login' + (next ? `?next=${encodeURIComponent(next)}` : ''));
  await page.locator('input[name=email]').fill('qa@example.invalid');
  await page.locator('input[name=password]').fill('ClaveFicticia123!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
}

const pathOf = (url: URL) => url.pathname + url.search;
const EXPERIENCE = `/experiencias/${PUBLICATION}?personas=2`;

test.describe('F-01 inicio de sesión', () => {
  test('F01-C1 una cuenta Admin llega a /dashboard', async ({ page }) => {
    await mockAuth(page, { role: 'Admin' });
    await signIn(page);
    await page.waitForURL(url => pathOf(url) === '/dashboard');
  });

  test('F01-C2 un viajero vuelve a la experiencia desde la que inició sesión', async ({ page }) => {
    await mockAuth(page, { role: 'Viajero' });
    await signIn(page, EXPERIENCE);
    await page.waitForURL(url => pathOf(url) === EXPERIENCE);
  });

  test('F01-E1 contraseña incorrecta: mensaje de error, sigue en /login', async ({ page }) => {
    await mockAuth(page, { role: 'Admin', failLogin: true });
    await signIn(page);
    await expect(page.getByRole('alert')).toContainText('incorrectos');
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('F01-A1 un destino externo en next se ignora (sin redirección abierta)', async ({ page }) => {
    await mockAuth(page, { role: 'Transporte' });
    await signIn(page, 'https://evil.invalid/');
    await page.waitForURL(url => pathOf(url) === '/dashboard');
    expect(new URL(page.url()).hostname).toBe('127.0.0.1');
  });

  test('F01-C3 una Agencia que quiere comprar también vuelve a la experiencia', async ({ page }) => {
    // Regla de docs/flujo-reservas.md: todos los roles pueden comprar a su nombre.
    await mockAuth(page, { role: 'Agencia' });
    await signIn(page, EXPERIENCE);
    await page.waitForURL(url => pathOf(url) === EXPERIENCE);
  });

  test('F01-A2 un destino con doble barra (//host) se ignora', async ({ page }) => {
    await mockAuth(page, { role: 'Agencia' });
    await signIn(page, '//evil.invalid/ruta');
    await page.waitForURL(url => pathOf(url) === '/dashboard');
    expect(new URL(page.url()).hostname).toBe('127.0.0.1');
  });
});
