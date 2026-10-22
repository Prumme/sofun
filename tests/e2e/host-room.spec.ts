import type { Page, WebSocketRoute } from '@playwright/test';
import { test, expect } from './fixtures/actors.js';

// Gate the real request, not a mocked server response, to observe loading and double clicks.
async function gateRoomCreation(page: Page) {
  let markReady!: () => void, markRequested!: () => void, captureCode!: (code: string) => void;
  const ready = new Promise<void>(resolve => { markReady = resolve; });
  const requested = new Promise<void>(resolve => { markRequested = resolve; });
  const code = new Promise<string>(resolve => { captureCode = resolve; });
  let release = () => {};
  let socket: WebSocketRoute | undefined;
  let requests = 0;
  await page.routeWebSocket('**/socket.io/**', route => {
    socket = route;
    const server = route.connectToServer();
    route.onMessage(message => {
      if (typeof message === 'string' && /^42\d+\["room:create",/.test(message)) {
        requests++;
        release = () => server.send(message);
        markRequested();
        return;
      }
      server.send(message);
      // Socket.IO has completed its upgrade from polling to WebSocket.
      if (message === '5') markReady();
    });
    server.onMessage(message => {
      if (typeof message === 'string' && message.startsWith('42["room:snapshot",')) {
        const payload: unknown = JSON.parse(message.slice(2));
        if (Array.isArray(payload) && typeof payload[1]?.code === 'string') captureCode(payload[1].code);
      }
      route.send(message);
    });
  });
  return { ready, requested, code, release: () => release(), requests: () => requests, disconnect: () => socket?.close() };
}

test('creates a real room once and displays its server code in an empty lobby', async ({ page }, testInfo) => {
  const gate = await gateRoomCreation(page);
  await page.goto('/');
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await gate.ready;
  await page.screenshot({ path: testInfo.outputPath('host-welcome.png'), fullPage: true });
  const create = page.getByRole('button', { name: 'Créer une room' });
  await create.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await gate.requested;
  await expect(page.getByRole('button', { name: 'Création en cours…' })).toBeDisabled();
  await expect(page.getByTestId('room-code')).toHaveCount(0);
  expect(gate.requests()).toBe(1);
  gate.release();
  const code = await gate.code;
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre room est prête.');
  await expect(page.getByTestId('room-code')).toHaveText(code);
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  await expect(page.getByRole('heading', { name: 'Aucun joueur pour le moment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer une room' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('host-lobby.png'), fullPage: true });
});

test('shows an actionable error when connection is lost during creation', async ({ page }) => {
  const gate = await gateRoomCreation(page);
  await page.goto('/');
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await gate.ready;
  await page.getByRole('button', { name: 'Créer une room' }).click();
  await gate.requested;
  await gate.disconnect();
  await expect(page.getByRole('alert')).toContainText('La création n’a pas pu être confirmée');
  await expect(page.getByTestId('room-code')).toHaveCount(0);
  // A user may explicitly retry once the transport reconnects; no intent is automatically replayed.
  await expect(page.getByRole('button', { name: 'Créer une room' })).toBeEnabled();
  expect(gate.requests()).toBe(1);
});

test('creates independent rooms in separate host contexts', async ({ createActors }) => {
  const first = await createActors(0), second = await createActors(0);
  const codes: string[] = [];
  for (const { host } of [first, second]) {
    await host.page.goto('/');
    await expect(host.page.getByRole('button', { name: 'Créer une room' })).toBeEnabled();
    await host.page.getByRole('button', { name: 'Créer une room' }).click();
    await expect(host.page.getByTestId('room-code')).toHaveText(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    codes.push((await host.page.getByTestId('room-code').textContent())!);
  }
  expect(codes[0]).not.toBe(codes[1]);
  await expect(first.host.page.getByTestId('room-code')).toHaveText(codes[0]!);
});

test('disables creation while the server is unavailable and allows reconnecting', async ({ page }) => {
  await page.route('**/socket.io/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur indisponible');
  await expect(page.getByRole('button', { name: 'Créer une room' })).toBeDisabled();
  await expect(page.getByText('Vérifiez que le serveur local est démarré et que cet appareil est connecté au bon réseau.')).toBeVisible();
  await page.unroute('**/socket.io/**');
  await page.getByRole('button', { name: 'Réessayer la connexion' }).click();
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await expect(page.getByRole('button', { name: 'Créer une room' })).toBeEnabled();
});
