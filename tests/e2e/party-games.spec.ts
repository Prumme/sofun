import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/actors.js';
import { createRoom, joinRoom, closeRoom, expectPlayers } from './fixtures/rooms.js';
const zip = createRequire(new URL('../../apps/server/package.json', import.meta.url))('fflate') as { zipSync: (files: Record<string, Uint8Array>) => Uint8Array; strToU8: (value: string) => Uint8Array; unzipSync: (data: Uint8Array) => Record<string, Uint8Array> };
function archive(manifest: unknown, files: Record<string, Uint8Array> = {}) { return Buffer.from(zip.zipSync({ 'manifest.json':zip.strToU8(JSON.stringify(manifest)),...files })); }
async function importPack(page: Page, title: string, game: string, items: unknown[], files: Record<string, Uint8Array> = {}) {
  await page.getByText('Bibliothèque de contenus',{exact:true}).click();
  await page.getByLabel('Importer un pack ZIP').setInputFiles({name:'pack.zip',mimeType:'application/zip',buffer:archive({version:1,game,title,items},files)});
  await expect(page.getByRole('option',{name:new RegExp(title)})).toHaveCount(1);
  await page.getByLabel('Pack',{exact:true}).selectOption({label:`${title} · ${items.length} entrées`});
}
async function settings(page:Page,title:string,packTitle:string,count:number) {
  await page.getByRole('button',{name:title,exact:true}).click();
  await expect(page.getByLabel('Pack',{exact:true})).toBeVisible();
  await page.getByLabel('Pack',{exact:true}).selectOption({label:`${packTitle} · ${count} entrées`});
  await page.getByLabel('Durée des résultats (s)').fill('5');
}
async function finalAndReturn(host:Page, others:Page[]) {
  for(const page of [host,...others]) await expect(page.getByRole('heading',{name:'Classement final',exact:true})).toBeVisible({timeout:10_000});
  await host.getByRole('button',{name:'Retour au lobby',exact:true}).click();
  for(const page of [host,...others]) await expectPlayers(page,others.map((_,i)=>['Alice','Benoît','Camille'][i]!));
}

test('social pack import, visible individual votes, automatic rounds and complete replay',async({createActors})=>{
  test.setTimeout(120_000);const {host,players}=await createActors(2);const code=await createRoom(host.page);
  for(const [i,p] of players.entries())await joinRoom(p.page,code,['Alice','Benoît'][i]!);
  const title=`Social-${randomUUID()}`;await host.page.getByRole('button',{name:'Qui de nous ?',exact:true}).click();
  await importPack(host.page,title,'who',[{question:'Première question sociale'},{question:'Seconde question sociale'}]);
  for(let game=0;game<2;game++) {
    await settings(host.page,'Qui de nous ?',title,2);await host.page.getByLabel('Nombre de manches').fill('2');await host.page.getByLabel('Durée du vote (s)').fill('10');
    await host.page.getByRole('button',{name:'Lancer Qui de nous ?',exact:true}).click();
    for(let round=0;round<2;round++) {
      for(const page of [host.page,...players.map(p=>p.page)]) await expect(page.getByText(`Qui de nous ? · MANCHE ${round+1} / 2`,{exact:true})).toBeVisible({timeout:10_000});
      await players[0]!.page.getByRole('button',{name:'Alice (vous)',exact:true}).click();
      await expect(host.page.getByRole('list',{name:'Détail des votes'})).toHaveCount(0);
      if(game===0&&round===0){await players[0]!.page.reload();await expect(players[0]!.page.getByRole('button',{name:'Alice (vous)',exact:true})).toHaveAttribute('aria-pressed','true');}
      await players[1]!.page.getByRole('button',{name:'Benoît (vous)',exact:true}).click();
      await expect(host.page.getByRole('list',{name:'Détail des votes'}).getByRole('listitem')).toHaveText(['Alice → Alice','Benoît → Benoît']);
      for(const page of [host.page,...players.map(p=>p.page)]) await expect(page.getByRole('list',{name:'Scores de la manche'}).locator('strong')).toHaveText([`${round+1} points`,`${round+1} points`]);
    }
    await finalAndReturn(host.page,players.map(p=>p.page));
  }
  await host.page.getByText('Bibliothèque de contenus',{exact:true}).click();await host.page.getByRole('button',{name:`Supprimer ${title}`,exact:true}).click();await expect(host.page.getByRole('button',{name:`Supprimer ${title}`,exact:true})).toHaveCount(0);
  await closeRoom(host.page);
});

test('liar keeps inventions anonymous, refuses duplicates and own votes, scores and replays automatically',async({createActors})=>{
  test.setTimeout(90_000);const {host,players}=await createActors(3);const code=await createRoom(host.page);for(const [i,p]of players.entries())await joinRoom(p.page,code,['Alice','Benoît','Camille'][i]!);
  const title=`Bluff-${randomUUID()}`;await host.page.getByRole('button',{name:'Le menteur',exact:true}).click();await importPack(host.page,title,'liar',[{question:'La question secrète',truth:'La lune',aliases:['lune']}]);
  for(let game=0;game<2;game++) {
    await settings(host.page,'Le menteur',title,1);await host.page.getByLabel('Nombre de manches').fill('1');await host.page.getByLabel('Durée des inventions (s)').fill('15');await host.page.getByLabel('Durée du vote (s)').fill('10');await host.page.getByRole('button',{name:'Lancer Le menteur',exact:true}).click();
    for(const [i,p] of players.entries()) {
      await p.page.getByLabel('Votre invention').fill(['Un ballon','Une planète carrée','Un fromage'][i]!);await p.page.getByRole('button',{name:'Envoyer l’invention',exact:true}).click();
      if(i<2)await expect(host.page.getByText('Un ballon',{exact:true})).toHaveCount(0);
    }
    await expect(players[0]!.page.getByRole('button',{name:'Un ballon (votre invention)',exact:true})).toBeDisabled();
    await players[0]!.page.getByRole('button',{name:'La lune',exact:true}).click();await players[1]!.page.getByRole('button',{name:'Un ballon',exact:true}).click();await players[2]!.page.getByRole('button',{name:'Un ballon',exact:true}).click();
    await expect(host.page.getByRole('heading',{name:'La vérité : La lune',exact:true})).toBeVisible();await expect(host.page.getByRole('list',{name:'Scores de la manche'}).locator('strong')).toHaveText(['4 points','0 points','0 points']);
    await finalAndReturn(host.page,players.map(p=>p.page));
  }await closeRoom(host.page);
});

test('image ZIP renders local assets, ranks correct answers and plays two complete automatic games',async({createActors},testInfo)=>{
  test.setTimeout(120_000);const {host,players}=await createActors(2);await players[0]!.page.setViewportSize({width:320,height:740});const code=await createRoom(host.page);for(const[i,p]of players.entries())await joinRoom(p.page,code,['Alice','Benoît'][i]!);
  const title=`Visuel-${randomUUID()}`;await host.page.getByRole('button',{name:'D’où provient cette image ?',exact:true}).click();const png=readFileSync(new URL('../../apps/server/src/content/art/scene-01.png',import.meta.url));
  await importPack(host.page,title,'images',[0,1].map(i=>({question:`Image ${i}`,image:'images/illustration.png',choices:[`Vrai ${i}`,'Faux A','Faux B','Faux C'],correctIndex:0})),{'images/illustration.png':png});
  for(let game=0;game<2;game++){
    await settings(host.page,'D’où provient cette image ?',title,2);await host.page.getByLabel('Nombre de manches').fill('2');await host.page.getByLabel('Durée des réponses (s)').fill('5');await host.page.getByRole('button',{name:'Lancer D’où provient cette image ?',exact:true}).click();
    for(let round=0;round<2;round++){
      await expect(host.page.getByText(`D’où provient cette image ? · MANCHE ${round+1} / 2`,{exact:true})).toBeVisible({timeout:10_000});const prompt=await host.page.getByRole('heading',{name:/Image [01]/}).textContent();const index=prompt!.slice(-1);
      await expect.poll(()=>host.page.getByRole('img',{name:'Illustration à identifier'}).evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
      for(const player of players){const button=player.page.getByRole('button',{name:new RegExp(`^[A-D] Vrai ${index}$`)});await expect(button).not.toContainText('Vrai');await button.click();await expect(button).toBeDisabled();}
      await expect(host.page.getByRole('list',{name:'Scores de la manche'}).locator('strong')).toHaveText([`${1000*(round+1)} points`,`${500*(round+1)} points`]);
      for(const page of [host.page,...players.map(player=>player.page)]) {
        await expect(page.getByRole('timer',{name:'Temps restant'})).toBeVisible();
        await expect(page.getByText(round===1?'Classement final dans':'Prochaine manche dans',{exact:true})).toBeVisible();
        const gainLines = await page.locator('.party-score-gain').evaluateAll(elements=>elements.map(element=>{const range=document.createRange();range.selectNodeContents(element);const rects=Array.from(range.getClientRects()).filter(rect=>rect.width>0&&rect.height>0);return {text:element.textContent, tops:rects.map(rect=>rect.top), fontSize:parseFloat(getComputedStyle(element).fontSize)};}));
        expect(gainLines.every(gain=>gain.tops.length>0&&Math.max(...gain.tops)-Math.min(...gain.tops)<gain.fontSize/2),JSON.stringify(gainLines)).toBe(true);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect(await page.getByRole('timer',{name:'Temps restant'}).evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(36);
      }
      if(game===0&&round===0){await host.page.screenshot({path:testInfo.outputPath('results-host.png'),fullPage:true});await players[0]!.page.screenshot({path:testInfo.outputPath('results-player-320.png'),fullPage:true});}
    }await finalAndReturn(host.page,players.map(p=>p.page));
  }await closeRoom(host.page);
});

test('drawing privately selects words, shares visible strokes, clears and completes every turn twice',async({createActors})=>{
  test.setTimeout(180_000);const{host,players}=await createActors(3);const code=await createRoom(host.page);for(const[i,p]of players.entries())await joinRoom(p.page,code,['Alice','Benoît','Camille'][i]!);
  const title=`Crayons-${randomUUID()}`;await host.page.getByRole('button',{name:'À vos crayons',exact:true}).click();await importPack(host.page,title,'drawing',['chat','maison','soleil','vélo','éléphant'].map(word=>({word,aliases:[]})));
  for(let game=0;game<2;game++){
    await settings(host.page,'À vos crayons',title,5);await host.page.getByLabel('Tours de table').fill('1');await host.page.getByLabel('Durée du dessin (s)').fill('30');await host.page.getByRole('button',{name:'Lancer À vos crayons',exact:true}).click();
    for(let round=0;round<3;round++){
      await expect(host.page.getByText(`À vos crayons · MANCHE ${round+1} / 3`,{exact:true})).toBeVisible({timeout:10_000});
      const heading=await host.page.getByRole('heading',{name:/ dessine$/}).textContent();const drawerIndex=['Alice','Benoît','Camille'].findIndex(name=>heading===`${name} dessine`);expect(drawerIndex).toBeGreaterThanOrEqual(0);
      const drawer=players[drawerIndex]!;const options=drawer.page.getByRole('region',{name:'À vos crayons',exact:true}).getByRole('button');await expect(options).toHaveCount(3);const word=(await options.first().textContent())!;
      await options.first().click();await expect(host.page.getByText(`À dessiner : ${word}`,{exact:true})).toHaveCount(0);
      const board=drawer.page.getByRole('img',{name:'Zone de dessin tactile',exact:true});const rect=await board.boundingBox();if(!rect)throw new Error('Missing canvas');
      await drawer.page.mouse.move(rect.x+rect.width*.1,rect.y+rect.height*.1);await drawer.page.mouse.down();await drawer.page.mouse.move(rect.x+rect.width*.9,rect.y+rect.height*.9);await drawer.page.mouse.up();
      const shared=host.page.getByRole('img',{name:'Dessin partagé',exact:true});await expect.poll(()=>shared.evaluate((canvas:HTMLCanvasElement)=>canvas.getContext('2d')!.getImageData(512,512,1,1).data[0])).toBe(0);
      await drawer.page.getByRole('button',{name:'Tout effacer',exact:true}).click();await expect.poll(()=>shared.evaluate((canvas:HTMLCanvasElement)=>canvas.getContext('2d')!.getImageData(512,512,1,1).data[0])).toBe(255);
      for(const guesser of players.filter((_,i)=>i!==drawerIndex)){await guesser.page.getByLabel('Votre proposition').fill(word.toUpperCase());await guesser.page.getByRole('button',{name:'Proposer',exact:true}).click();}
      await expect(host.page.getByRole('heading',{name:`Le mot était : ${word}`,exact:true})).toBeVisible();
    }await finalAndReturn(host.page,players.map(p=>p.page));
  }await closeRoom(host.page);
});


test('host downloads working ZIP templates and recovers from an invalid import without losing the room',async({page})=>{
  await createRoom(page);await page.getByText('Bibliothèque de contenus',{exact:true}).click();
  for(const[title,kind]of [['Qui de nous ?','who'],['Le menteur','liar'],['D’où provient cette image ?','images'],['À vos crayons','drawing']]){
    await page.getByRole('button',{name:title!,exact:true}).click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger un modèle ZIP',exact:true}).click();const download=await waiting;const path=await download.path();if(!path)throw new Error('Template missing');const files=zip.unzipSync(readFileSync(path));const manifest=JSON.parse(Buffer.from(files['manifest.json']!).toString('utf8')) as {game:string};expect(manifest.game).toBe(kind);if(kind==='images')expect(files['images/exemple.png']!.length).toBeGreaterThan(0);
  }
  await page.getByLabel('Importer un pack ZIP').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('not a zip')});await expect(page.getByRole('alert')).toContainText(/ZIP|manifest/);
  await expect(page.getByTestId('room-code')).toHaveText(/^[A-Z2-9]{6}$/);await closeRoom(page);
});

test('twelve participants receive the same live drawing and a reloaded phone restores its pixels',async({createActors})=>{
  test.setTimeout(90_000);const{host,players}=await createActors(12);const code=await createRoom(host.page);for(const[i,p]of players.entries())await joinRoom(p.page,code,`Joueur ${i+1}`);
  await host.page.getByRole('button',{name:'À vos crayons',exact:true}).click();await host.page.getByLabel('Durée du dessin (s)').fill('30');await host.page.getByRole('button',{name:'Lancer À vos crayons',exact:true}).click();
  const heading=await host.page.getByRole('heading',{name:/ dessine$/}).textContent();const drawerIndex=players.findIndex((_,i)=>heading===`Joueur ${i+1} dessine`);const drawer=players[drawerIndex]!;
  await drawer.page.getByRole('region',{name:'À vos crayons',exact:true}).getByRole('button').first().click();
  const canvas=drawer.page.getByRole('img',{name:'Zone de dessin tactile',exact:true});const rect=await canvas.boundingBox();if(!rect)throw new Error('Missing canvas');
  await drawer.page.mouse.move(rect.x+rect.width*.1,rect.y+rect.height*.1);await drawer.page.mouse.down();await drawer.page.mouse.move(rect.x+rect.width*.9,rect.y+rect.height*.9);await drawer.page.mouse.up();
  const others=players.filter((_,i)=>i!==drawerIndex);for(const p of others){await expect.poll(()=>p.page.getByRole('img',{name:'Dessin partagé',exact:true}).evaluate((element:HTMLCanvasElement)=>element.getContext('2d')!.getImageData(512,512,1,1).data[0])).toBe(0);}
  await others[0]!.page.reload();await expect.poll(()=>others[0]!.page.getByRole('img',{name:'Dessin partagé',exact:true}).evaluate((element:HTMLCanvasElement)=>element.getContext('2d')!.getImageData(512,512,1,1).data[0])).toBe(0);
  await closeRoom(host.page);
});
