import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, joinRoom } from './fixtures/rooms.js';
import type { Page } from '@playwright/test';

const key = 'party-games.session';
async function identity(page: Page) { return page.evaluate(key => sessionStorage.getItem(key), key); }
async function start(host: Page) { await host.getByRole('button', { name: 'Lancer le quiz', exact: true }).click(); }

test('player returns to the current question with the same choice and accumulated score', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const alice = players[0]!, bob = players[1]!;
  const code = await createRoom(host.page);
  await joinRoom(alice.page, code, 'Alice'); await joinRoom(bob.page, code, 'Benoît');
  const original = await identity(alice.page);
  await start(host.page);
  await alice.page.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  await expect(host.page.getByText('1 / 2 réponses reçues', { exact: true })).toBeVisible();
  await alice.context.setOffline(true);
  await expect(alice.page.getByTestId('connection-status')).toHaveText('Serveur indisponible');
  await expect(alice.page.getByRole('button', { name: 'B Jupiter', exact: true })).toBeDisabled();
  await alice.context.setOffline(false);
  await expect(alice.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  expect(await identity(alice.page)).toBe(original);
  await expect(alice.page.getByRole('button', { name: 'B Jupiter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await bob.page.getByRole('button', { name: 'C Mars', exact: true }).click();
  await expect(alice.page.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 1', 'Total : 0']);
  await alice.context.setOffline(true);
  await expect(alice.page.getByTestId('connection-status')).toHaveText('Serveur indisponible');
  await host.page.getByRole('button', { name: 'Question suivante', exact: true }).click();
  await alice.context.setOffline(false);
  await alice.page.reload();
  await expect(alice.page.getByText('QUIZ · QUESTION 2 / 5', { exact: true })).toBeVisible();
  await expect(alice.page.getByRole('button', { name: 'C Six', exact: true })).toBeEnabled();
  await Promise.all([alice.page.getByRole('button', { name: 'C Six', exact: true }).click(), bob.page.getByRole('button', { name: 'C Six', exact: true }).click()]);
  await expect(alice.page.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 2', 'Total : 1']);
  await alice.page.screenshot({ path: testInfo.outputPath('player-resumed-results.png'), fullPage: true });
  expect(await identity(alice.page)).toBe(original);
  await closeRoom(host.page);
});

test('host interruption does not reset the deadline and returns to revealed results', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  await joinRoom(players[0]!.page, code, 'Alice'); await joinRoom(players[1]!.page, code, 'Benoît');
  const original = await identity(host.page);
  await start(host.page);
  await players[0]!.page.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  await host.context.setOffline(true);
  await expect(host.page.getByTestId('connection-status')).toHaveText('Serveur indisponible');
  await expect(host.page.getByRole('button', { name: 'Révéler la réponse', exact: true })).toBeDisabled();
  await expect(players[1]!.page.getByRole('list', { name: 'Résultats de la question' })).toBeVisible({ timeout: 25_000 });
  await host.context.setOffline(false);
  await host.page.reload();
  await expect(host.page.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 1', 'Total : 0']);
  expect(await identity(host.page)).toBe(original);
  await host.page.getByRole('button', { name: 'Question suivante', exact: true }).click();
  await expect(host.page.getByText('QUIZ · QUESTION 2 / 5', { exact: true })).toBeVisible();
  await closeRoom(host.page);
});

test('a replacement connection resumes the same player and disables the superseded screen', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  await joinRoom(players[0]!.page, code, 'Alice'); await joinRoom(players[1]!.page, code, 'Benoît');
  await start(host.page);
  await players[0]!.page.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  const original = await identity(players[0]!.page);
  const replacement = (await createActors(1)).players[0]!;
  // Explicitly model a second connection claiming the same session; all contexts remain independent.
  await replacement.page.goto('/join');
  await replacement.page.evaluate(({ key, value }) => sessionStorage.setItem(key, value!), { key, value: original });
  await replacement.page.reload();
  await expect(replacement.page.getByRole('button', { name: 'B Jupiter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(players[0]!.page.getByTestId('connection-status')).toHaveText('Connexion à vérifier');
  await expect(players[0]!.page.getByRole('alert')).toContainText('Une autre connexion');
  await expect(players[0]!.page.getByRole('button', { name: 'Révéler la réponse', exact: true })).toHaveCount(0);
  await expect(players[0]!.page.getByRole('button', { name: 'A La Terre', exact: true })).toBeDisabled();
  await players[1]!.page.getByRole('button', { name: 'C Mars', exact: true }).click();
  await expect(replacement.page.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 1', 'Total : 0']);
  await players[0]!.page.getByRole('button', { name: 'Réessayer la connexion', exact: true }).click();
  await expect(players[0]!.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await expect(players[0]!.page.getByRole('alert')).toHaveCount(0);
  await expect(replacement.page.getByTestId('connection-status')).toHaveText('Connexion à vérifier');
  await expect(players[0]!.page.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 1', 'Total : 0']);
  expect(await identity(players[0]!.page)).toBe(original);
  await closeRoom(host.page);
});

test('an old pending answer and its delayed acknowledgement cannot block the next question', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const alice = players[0]!.page;
  let upgraded!: () => void, captured!: () => void, release = () => {};
  const ready = new Promise<void>(resolve => { upgraded = resolve; });
  const held = new Promise<void>(resolve => { captured = resolve; });
  await alice.routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer();
    let first = true;
    route.onMessage(message => {
      if (first && typeof message === 'string' && /^42\d+\["game:action",/.test(message)) {
        first = false; release = () => server.send(message); captured(); return;
      }
      server.send(message);
      if (message === '5') upgraded();
    });
    server.onMessage(message => route.send(message));
  });
  const code = await createRoom(host.page);
  await joinRoom(alice, code, 'Alice'); await joinRoom(players[1]!.page, code, 'Benoît');
  await ready; await start(host.page);
  await alice.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  await held;
  await expect(alice.getByRole('button', { name: 'A La Terre', exact: true })).toBeDisabled();
  await host.page.getByRole('button', { name: 'Révéler la réponse', exact: true }).click();
  await host.page.getByRole('button', { name: 'Question suivante', exact: true }).click();
  await expect(alice.getByRole('button', { name: 'C Six', exact: true })).toBeEnabled();
  release();
  await Promise.all([alice.getByRole('button', { name: 'C Six', exact: true }).click(), players[1]!.page.getByRole('button', { name: 'C Six', exact: true }).click()]);
  await expect(alice.getByRole('list', { name: 'Résultats de la question' }).locator('.quiz-total')).toHaveText(['Total : 1', 'Total : 1']);
  await expect(alice.getByRole('alert')).toHaveCount(0);
  await closeRoom(host.page);
});
