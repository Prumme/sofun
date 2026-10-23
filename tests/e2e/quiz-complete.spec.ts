import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, expectPlayers, joinRoom } from './fixtures/rooms.js';

const choices = ['B Jupiter', 'C Six', 'A Tokyo', 'D H2O', 'B Sept'];

test('plays five questions, keeps final ties, returns to the same lobby and replays from zero', async ({ createActors }, testInfo) => {
  test.setTimeout(60_000);
  const { host, players } = await createActors(3);
  const names = ['Alice', 'Benoît', 'Camille'];
  const code = await createRoom(host.page);
  for (const [index, player] of players.entries()) await joinRoom(player.page, code, names[index]!);
  const actors = [host, ...players];
  const identities = await Promise.all(actors.map(actor => actor.page.evaluate(() => sessionStorage.getItem('party-games.session'))));
  for (let game = 0; game < 2; game++) {
    await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
    for (const [index, choice] of choices.entries()) {
      for (const actor of actors) {
        await expect(actor.page.getByText(`QUIZ · QUESTION ${index + 1} / 5`, { exact: true })).toBeVisible();
        await expect(actor.page.getByText('0 / 3 réponses reçues', { exact: true })).toBeVisible();
        await expect(actor.page.getByText('Bonne réponse', { exact: true })).toHaveCount(0);
        await expect(actor.page.getByRole('list', { name: 'Résultats de la question' })).toHaveCount(0);
      }
      // First game: Alice and Benoît score four; second: only Benoît answers, scoring five.
      const respondents = game === 0 && index < 4 ? [players[0]!, players[1]!] : game === 1 ? [players[1]!] : [];
      await Promise.all(respondents.map(player => player.page.getByRole('button', { name: choice, exact: true }).click()));
      for (const player of respondents) await expect(player.page.getByText('Réponse enregistrée. Attendez la révélation de l’hôte.')).toBeVisible();
      await expect(host.page.getByText(`${respondents.length} / 3 réponses reçues`, { exact: true })).toBeVisible();
      await expect(host.page.getByRole('button', { name: 'Question suivante', exact: true })).toHaveCount(0);
      await host.page.getByRole('button', { name: 'Révéler la réponse', exact: true }).click();
      for (const actor of actors) {
        const results = actor.page.getByRole('list', { name: 'Résultats de la question' });
        await expect(results.getByRole('listitem')).toHaveCount(3);
        await expect(results.getByRole('listitem').nth(0).locator('.quiz-total')).toHaveText(`Total : ${game === 0 ? Math.min(index + 1, 4) : 0}`);
        await expect(results.getByRole('listitem').nth(1).locator('.quiz-total')).toHaveText(`Total : ${game === 0 ? Math.min(index + 1, 4) : index + 1}`);
        await expect(results.getByRole('listitem').nth(2).locator('.quiz-total')).toHaveText('Total : 0');
      }
      await host.page.getByRole('button', { name: index === 4 ? 'Voir le classement final' : 'Question suivante', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    }
    for (const actor of actors) {
      await expect(actor.page.getByRole('heading', { name: 'Classement final', exact: true })).toBeVisible();
      const ranking = actor.page.getByRole('list', { name: 'Classement final' });
      await expect(ranking.getByRole('listitem')).toHaveCount(3);
      await expect(ranking.locator('strong')).toHaveText(game === 0 ? ['4 / 5', '4 / 5', '0 / 5'] : ['5 / 5', '0 / 5', '0 / 5']);
      await expect(ranking.locator('.quiz-rank')).toHaveText(game === 0 ? ['1', '1', '3'] : ['1', '2', '2']);
      await expect(ranking.getByText('Ex æquo', { exact: true })).toHaveCount(2);
      const orderedNames = await ranking.getByRole('listitem').allTextContents();
      expect(orderedNames[0]).toContain(game === 0 ? 'Alice' : 'Benoît');
      expect(orderedNames[1]).toContain(game === 0 ? 'Benoît' : 'Alice');
      expect(await actor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const player of players) await expect(player.page.getByRole('button', { name: 'Retour au lobby', exact: true })).toHaveCount(0);
    if (game === 0) {
      await host.page.screenshot({ path: testInfo.outputPath('quiz-final-host.png'), fullPage: true });
      await players[0]!.page.screenshot({ path: testInfo.outputPath('quiz-final-player.png'), fullPage: true });
      await host.page.reload();
      await expect(host.page.getByRole('heading', { name: 'Classement final', exact: true })).toBeVisible();
      await expect(host.page.getByRole('list', { name: 'Classement final' }).locator('strong')).toHaveText(['4 / 5', '4 / 5', '0 / 5']);
    }
    await host.page.getByRole('button', { name: 'Retour au lobby', exact: true }).click();
    for (const [index, actor] of actors.entries()) {
      await expectPlayers(actor.page, names);
      await expect(actor.page.getByTestId('room-code')).toHaveText(code);
      expect(await actor.page.evaluate(() => sessionStorage.getItem('party-games.session'))).toBe(identities[index]);
      await expect(actor.page.getByRole('list', { name: 'Classement final' })).toHaveCount(0);
    }
  }
  await closeRoom(host.page);
});
