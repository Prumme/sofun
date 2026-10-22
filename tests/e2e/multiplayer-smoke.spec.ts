import { test, expect } from './fixtures/actors.js';

test('loads the application for a host and two independent participants', async ({ createActors }) => {
  const { host, players } = await createActors();
  const actors = [host, ...players];
  expect(new Set(actors.map(actor => actor.context)).size).toBe(3);

  for (const actor of actors) {
    await test.step(`${actor.name}: application and live server connection`, async () => {
      await actor.page.goto('/design');
      await expect(actor.page.getByRole('heading', { level: 1 })).toHaveText('Le jeu commenceavec vous.');
      await expect(actor.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
      await actor.page.getByLabel('Votre pseudo').fill(actor.name);
      await actor.page.getByRole('button', { name: 'Valider le pseudo' }).click();
      await expect(actor.page.getByText(`Parfait, ${actor.name}.`)).toBeVisible();
    });
  }
  // Each actor keeps its own visible form state, rather than sharing one browser page.
  for (const actor of actors) {
    await expect(actor.page.getByLabel('Votre pseudo')).toHaveValue(actor.name);
  }
});

test('starts each actor group without inherited browser storage or session credentials', async ({ createActors, baseURL }) => {
  const first = await createActors(0);
  await first.host.page.goto('/design');
  await first.host.page.evaluate(() => {
    localStorage.setItem('e2e-isolation', 'first-host');
    sessionStorage.setItem('e2e-isolation', 'first-host');
  });
  await first.host.context.addCookies([{ name: 'e2e-isolation', value: 'first-host', url: baseURL! }]);

  const { host, players } = await createActors(1);
  for (const actor of [host, ...players]) {
    await actor.page.goto('/design');
    await expect(actor.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
    expect(await actor.context.cookies()).toEqual([]);
    expect(await actor.page.evaluate(() => ({
      local: localStorage.getItem('e2e-isolation'),
      session: sessionStorage.getItem('e2e-isolation'),
      credentials: sessionStorage.getItem('party-games.session'),
    }))).toEqual({ local: null, session: null, credentials: null });
  }
});
