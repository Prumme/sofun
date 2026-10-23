import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, joinRoom } from './fixtures/rooms.js';

test('server expires a question after twenty seconds despite an advanced player clock', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const alice = players[0]!.page, bob = players[1]!.page;
  // Set clock skew before opening a connection so Socket.IO's heartbeat sees no clock jump.
  await alice.clock.setFixedTime(Date.now() + 60_000);
  const code = await createRoom(host.page);
  await joinRoom(alice, code, 'Alice');
  await joinRoom(bob, code, 'Benoît');
  await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
  const timer = host.page.getByRole('timer', { name: 'Temps restant' });
  await expect(timer).toHaveText(/^(1\d|20) s$/);
  const initialSeconds = Number.parseInt((await timer.textContent())!);
  await expect.poll(async () => Number.parseInt((await timer.textContent())!)).toBeLessThan(initialSeconds);
  await host.page.screenshot({ path: testInfo.outputPath('quiz-timer-host.png'), fullPage: true });
  // Only this browser has clock skew: the real backend still owns the deadline.
  await expect(alice.getByRole('timer', { name: 'Temps restant' })).toHaveText('0 s');
  await expect(host.page.getByText('Bonne réponse', { exact: true })).toHaveCount(0);
  await alice.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  await expect(alice.getByText('Réponse enregistrée. En attente de la révélation.')).toBeVisible();
  await expect(host.page.getByText('1 / 2 réponses reçues', { exact: true })).toBeVisible();
  for (const page of [host.page, alice, bob]) {
    await expect(page.getByRole('list', { name: 'Résultats de la question' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('list', { name: 'Résultats de la question' }).getByRole('listitem')).toHaveText(['AliceJupiter1 pointTotal : 1', 'BenoîtSans réponse0 pointTotal : 0']);
    await expect(page.getByRole('timer', { name: 'Temps restant' })).toHaveCount(0);
    await expect(page.locator('.quiz-choices button')).toHaveCount(0);
  }
  await bob.screenshot({ path: testInfo.outputPath('quiz-expired-player.png'), fullPage: true });
  await host.page.getByRole('button', { name: 'Question suivante', exact: true }).click();
  await expect(timer).toHaveText(/^(1\d|20) s$/);
  await Promise.all([alice.getByRole('button', { name: 'C Six', exact: true }).click(), bob.getByRole('button', { name: 'C Six', exact: true }).click()]);
  for (const page of [host.page, alice, bob]) {
    await expect(page.getByRole('list', { name: 'Résultats de la question' }).getByRole('listitem')).toHaveText(['AliceSix1 pointTotal : 2', 'BenoîtSix1 pointTotal : 1']);
  }
  await closeRoom(host.page);
});
