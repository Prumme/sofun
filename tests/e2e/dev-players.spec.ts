import { spawn } from 'node:child_process';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/actors.js';
import { createRoom, joinRoom, closeRoom, expectPlayers } from './fixtures/rooms.js';

async function configure(host: Page, title: string) {
  await host.getByRole('button', { name: title, exact: true }).click();
  await host.getByLabel('Durée des résultats (s)').fill('5');
  if (title !== 'À vos crayons') await host.getByLabel('Nombre de manches').fill('1');
  await host.getByRole('button', { name: `Lancer ${title}`, exact: true }).click();
}

test('one human phone completes all games with the local development companion', async ({ createActors }) => {
  test.setTimeout(150_000);
  const { host, players } = await createActors(1);
  const phone = players[0]!.page;
  const code = await createRoom(host.page);
  await joinRoom(phone, code, 'Alice');
  await expect(host.page.getByRole('button', { name: 'Lancer le quiz', exact: true })).toBeDisabled();
  const helper = spawn(process.execPath, ['scripts/dev-players.mjs', code], { cwd: process.cwd(), env: { ...process.env, PORT: '3100', NODE_ENV: 'test' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let logs = ''; let errors = ''; let exited = false;
  helper.stdout.on('data', data => { logs += data.toString(); });
  helper.stderr.on('data', data => { errors += data.toString(); });
  const ended = new Promise<number | null>((resolve, reject) => { helper.once('exit', code => { exited = true; resolve(code); }); helper.once('error', reject); });
  try {
    await expect.poll(() => logs, { message: 'Development players should join the real room' }).toContain('PRÊTS');
    await expectPlayers(host.page, ['Alice', '[DEV] Alice', '[DEV] Benoît']);
    expect(errors).not.toContain('[DEV]');
    const finish = async () => {
      await expect(host.page.getByRole('heading', { name: 'Classement final', exact: true })).toBeVisible({ timeout: 10_000 });
      await host.page.getByRole('button', { name: 'Retour au lobby', exact: true }).click();
      await expectPlayers(host.page, ['Alice', '[DEV] Alice', '[DEV] Benoît']);
    };
    await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
    for (let question = 1; question <= 5; question++) {
      await expect(phone.getByText(`QUIZ · QUESTION ${question} / 5`, { exact: true })).toBeVisible();
      await phone.locator('.symbol-choices button').first().click();
      await host.page.getByRole('button', { name: question === 5 ? 'Voir le classement final' : 'Question suivante', exact: true }).click();
    }
    await finish();
    await configure(host.page, 'Qui de nous ?');
    await phone.getByRole('button', { name: 'Alice (vous)', exact: true }).click();
    await finish();
    await configure(host.page, 'Le menteur');
    await phone.getByLabel('Votre invention').fill('Une invention de test unique');
    await phone.getByRole('button', { name: 'Envoyer l’invention', exact: true }).click();
    const eligible = phone.locator('.party-options button:enabled');
    await expect(eligible.first()).toBeVisible();
    await eligible.first().click();
    await finish();
    await configure(host.page, 'D’où provient cette image ?');
    await phone.locator('.symbol-choices button').first().click();
    await finish();
    await host.page.getByRole('button', { name: 'À vos crayons', exact: true }).click();
    await host.page.getByLabel('Durée du dessin (s)').fill('30');
    await host.page.getByLabel('Durée des résultats (s)').fill('5');
    await host.page.getByRole('button', { name: 'Lancer À vos crayons', exact: true }).click();
    for (let round = 0; round < 3; round++) {
      await expect(host.page.getByText(`À vos crayons · MANCHE ${round + 1} / 3`, { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(host.page.getByRole('heading', { name: / dessine$/ })).toBeVisible();
      const drawer = await host.page.getByRole('heading', { name: / dessine$/ }).textContent();
      if (drawer === 'Alice dessine') {
        const word = phone.getByRole('region', { name: 'À vos crayons', exact: true }).getByRole('button').first();
        const text = await word.textContent();
        await word.click();
        await expect(phone.getByRole('img', { name: 'Zone de dessin tactile', exact: true })).toBeVisible();
        helper.stdin.write(`mot ${text}\n`);
      } else {
        const botName = drawer!.replace(/ dessine$/, '');
        await expect.poll(() => logs.includes(`[DEV] MOT ${botName} : `)).toBe(true);
        const word = logs.split(`[DEV] MOT ${botName} : `).at(-1)!.split('\n')[0]!.trim();
        helper.stdin.write(`mot ${word}\n`);
        await phone.getByLabel('Votre proposition').fill(word);
        await phone.getByRole('button', { name: 'Proposer', exact: true }).click();
      }
      await expect(host.page.getByRole('heading', { name: /^Le mot était :/ })).toBeVisible({ timeout: 10_000 });
    }
    await finish();
    await closeRoom(host.page);
    expect(await ended).toBe(0);
  } finally {
    if (!exited) { helper.kill('SIGTERM'); await ended; }
  }
});

test('development companion refuses production mode before joining any room', async () => {
  const helper = spawn(process.execPath, ['scripts/dev-players.mjs', 'ABC234'], { env: { ...process.env, NODE_ENV: 'production' }, stdio: 'pipe' });
  let error = ''; helper.stderr.on('data', data => { error += data.toString(); });
  const exitCode = await new Promise(resolve => helper.once('exit', resolve));
  expect(exitCode).toBe(1);
  expect(error).toContain('réservé au développement local');
});
