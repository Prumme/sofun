import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, expectPlayers, joinRoom } from './fixtures/rooms.js';

const sessionKey = 'party-games.session';

test('reloads host and players with the same identity and no duplicate participants', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  await joinRoom(players[0]!.page, code, 'Alice');
  await joinRoom(players[1]!.page, code, 'Benoît');
  const actors = [host, ...players];
  const identities = await Promise.all(actors.map(actor => actor.page.evaluate(key => sessionStorage.getItem(key), sessionKey)));
  await Promise.all(actors.map(actor => actor.page.reload()));
  for (const [index, actor] of actors.entries()) {
    await expectPlayers(actor.page, ['Alice', 'Benoît']);
    await expect(actor.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
    expect(await actor.page.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBe(identities[index]);
    await expect(actor.page.getByTestId('room-code')).toHaveText(code);
  }
  await closeRoom(host.page);
  for (const player of players) await expect(player.page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
});

test('voluntary departure removes the player and permits joining again with a new identity', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const alice = players[0]!.page, bob = players[1]!.page;
  const code = await createRoom(host.page);
  await joinRoom(alice, code, 'Alice');
  await joinRoom(bob, code, 'Benoît');
  const oldSession = await alice.evaluate(key => sessionStorage.getItem(key), sessionKey);
  await alice.getByRole('button', { name: 'Quitter la room', exact: true }).click();
  await expect(alice.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  expect(await alice.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBeNull();
  for (const page of [host.page, bob]) await expectPlayers(page, ['Benoît']);
  await alice.reload();
  await expect(alice.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  await joinRoom(alice, code, 'Alice');
  expect(await alice.evaluate(key => sessionStorage.getItem(key), sessionKey)).not.toBe(oldSession);
  for (const page of [host.page, alice, bob]) await expectPlayers(page, ['Alice', 'Benoît']);
  await closeRoom(host.page);
});

test('confirms closure, informs all players and lets the host create a fresh room', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  for (const [index, player] of players.entries()) await joinRoom(player.page, code, `Joueur ${index}`);
  await host.page.getByRole('button', { name: 'Fermer la room', exact: true }).click();
  await host.page.screenshot({ path: testInfo.outputPath('confirm-closure.png'), fullPage: true });
  await host.page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expectPlayers(host.page, ['Joueur 0', 'Joueur 1']);
  await closeRoom(host.page);
  for (const actor of [host, ...players]) {
    await expect(actor.page.getByTestId('room-code')).toHaveCount(0);
    expect(await actor.page.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBeNull();
  }
  for (const player of players) {
    await expect(player.page.getByRole('alert')).toHaveText('Cette room a été fermée.');
    await expect(player.page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  }
  const newCode = await createRoom(host.page);
  await joinRoom(players[0]!.page, newCode, 'Alice');
  await expectPlayers(host.page, ['Alice']);
  await closeRoom(host.page);
});

test('disconnected participant sees an expired session after the host closes the room', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const player = players[0]!;
  const code = await createRoom(host.page);
  await joinRoom(player.page, code, 'Alice');
  await player.context.setOffline(true);
  await expect(player.page.getByTestId('connection-status')).toHaveText('Serveur indisponible');
  await expect(host.page.getByText('Hors ligne', { exact: true })).toBeVisible();
  await closeRoom(host.page);
  await player.context.setOffline(false);
  await player.page.reload();
  await expect(player.page.getByRole('alert')).toHaveText('Cette session n’est plus disponible. Vous pouvez recommencer.');
  await expect(player.page.getByTestId('room-code')).toHaveCount(0);
  await expect(player.page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  expect(await player.page.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBeNull();
});

test('invalid host credentials return to creation instead of retaining the old lobby', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const code = await createRoom(host.page);
  await joinRoom(players[0]!.page, code, 'Alice');
  await host.page.evaluate(key => {
    const credentials = JSON.parse(sessionStorage.getItem(key)!);
    credentials.token = '0'.repeat(64);
    sessionStorage.setItem(key, JSON.stringify(credentials));
  }, sessionKey);
  await host.page.reload();
  await expect(host.page.getByRole('alert')).toHaveText('Cette session n’est plus disponible. Vous pouvez recommencer.');
  await expect(host.page.getByTestId('room-code')).toHaveCount(0);
  await createRoom(host.page);
  await closeRoom(host.page);
});

test('reconnects a participant in place after a network interruption', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const player = players[0]!;
  const code = await createRoom(host.page);
  await joinRoom(player.page, code, 'Alice');
  const identity = await player.page.evaluate(key => sessionStorage.getItem(key), sessionKey);
  await player.context.setOffline(true);
  await expect(host.page.getByText('Hors ligne', { exact: true })).toBeVisible();
  await expect(player.page.getByRole('button', { name: 'Quitter la room', exact: true })).toBeDisabled();
  await player.context.setOffline(false);
  await expect(player.page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await expect(host.page.getByText('En ligne', { exact: true })).toBeVisible();
  for (const page of [host.page, player.page]) await expectPlayers(page, ['Alice']);
  expect(await player.page.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBe(identity);
  await closeRoom(host.page);
});

test('recovers from a lost departure acknowledgement by checking the real session', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const player = players[0]!.page;
  let upgraded!: () => void;
  const ready = new Promise<void>(resolve => { upgraded = resolve; });
  await player.routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer();
    let departureAck: string | null = null;
    route.onMessage(message => {
      if (typeof message === 'string') {
        const match = /^42(\d+)\["room:leave",/.exec(message);
        if (match) departureAck = `43${match[1]}[`;
      }
      server.send(message);
      if (message === '5') upgraded();
    });
    server.onMessage(message => {
      // Drop only the acknowledgement; the server executes the genuine departure.
      if (typeof message === 'string' && departureAck && message.startsWith(departureAck)) return;
      route.send(message);
    });
  });
  const code = await createRoom(host.page);
  await joinRoom(player, code, 'Alice');
  await ready;
  await player.getByRole('button', { name: 'Quitter la room', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(host.page.getByRole('heading', { name: 'Aucun joueur pour le moment' })).toBeVisible();
  await expect(player.getByRole('button', { name: 'Vérifier la session' })).toBeVisible({ timeout: 10_000 });
  await player.getByRole('button', { name: 'Vérifier la session' }).click();
  await expect(player.getByRole('alert')).toHaveText('Cette session n’est plus disponible. Vous pouvez recommencer.');
  await expect(player.getByTestId('room-code')).toHaveCount(0);
  await expect(player.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  expect(await player.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBeNull();
  await closeRoom(host.page);
});
