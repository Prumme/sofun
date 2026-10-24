// Local manual-testing companion. It joins real player sessions; it never changes game rules.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
const serverRequire = createRequire(new URL('../apps/server/package.json', import.meta.url));
const { io } = serverRequire('socket.io-client');
const { roomCodeSchema, snapshotSchema, responseSchema, quizViewSchema, whoViewSchema, liarViewSchema, imagesViewSchema, drawingViewSchema } = await import('../packages/contracts/dist/index.js');
const code = process.argv[2]?.trim().toUpperCase();
if (!roomCodeSchema.safeParse(code).success || process.argv.includes('--help')) {
  console.log('Usage : pnpm dev:players ABC234\nCréez la room, rejoignez avec votre téléphone, puis lancez cette commande dans un second terminal.\nDeux joueurs [DEV] rejoignent la room. En dessin : « mot vélo » leur fait proposer vélo. Ctrl+C les retire.');
  process.exit(process.argv.includes('--help') ? 0 : 1);
}
if (process.env.NODE_ENV === 'production') { console.error('Cet outil est réservé au développement local.'); process.exit(1); }
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('PORT invalide.'); process.exit(1); }
const names = ['[DEV] Alice', '[DEV] Benoît'];
const commonWords = ['chat','chien','maison','soleil','vélo','avion','bateau','arbre','fleur','montagne','pizza','guitare','parapluie','lunettes','horloge','éléphant','girafe','papillon','robot','fusée','château','dragon','couronne','fantôme','bonhomme de neige','volcan','ballon','clé','échelle','escargot','serpent','poisson','tortue','champignon','cerise','ananas','cactus','téléphone','ordinateur','appareil photo'];
const input = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
let forcedWord = ''; let closing = false; let joined = 0;
const bots = names.map((name, index) => {
  const socket = io(`http://127.0.0.1:${port}`, { autoConnect: false, reconnection: true, timeout: 5000 });
  return { socket, name, index, credentials: null, ready: false, snapshot: null, busy: false, completed: new Set(), scope: '', guessIndex: index, forcedUsed: '', drawIndex: 0, version: 0 };
});
async function shutdown(status) {
  if (closing) return; closing = true; clearInterval(tick); input.close();
  await Promise.all(bots.map(async bot => {
    if (bot.socket.connected && bot.credentials) {
      try { await bot.socket.timeout(1500).emitWithAck('room:leave', { requestId: randomUUID() }); } catch { /* Disconnect still preserves normal server semantics. */ }
    }
    bot.socket.disconnect();
  }));
  console.log('[DEV] Joueurs automatiques arrêtés.'); process.exitCode = status;
}
async function command(bot, event, data) {
  const version = bot.version;
  const response = responseSchema.parse(await bot.socket.timeout(5000).emitWithAck(event, { requestId: randomUUID(), ...data }));
  if (version !== bot.version) throw new Error('Connexion remplacée.');
  return response;
}
async function act(bot, action, key) {
  const snapshot = bot.snapshot;
  if (!snapshot?.game || bot.busy || !bot.ready || closing || (key && bot.completed.has(key))) return false;
  bot.busy = true;
  try {
    const response = await command(bot, 'game:action', { gameId: snapshot.game.id, revision: snapshot.revision, action });
    if (response.ok && key) bot.completed.add(key);
    if (!response.ok) console.log(`[DEV] ${bot.name} : ${response.error.message}`);
    return response.ok;
  } catch { return false; } finally { bot.busy = false; }
}
// Generic sketches are deliberate placeholders for flow testing, not a player AI.
function sketch(word) {
  const base = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (base.includes('soleil')) return [Array.from({ length: 25 }, (_, i) => [Math.round(512 + Math.cos(i * Math.PI / 12) * 170), Math.round(512 + Math.sin(i * Math.PI / 12) * 170)]), [[512,180],[512,100]], [[512,844],[512,924]], [[180,512],[100,512]], [[844,512],[924,512]]];
  if (base.includes('maison')) return [[[180,480],[512,180],[844,480]], [[250,420],[250,850],[774,850],[774,420]], [[450,850],[450,620],[574,620],[574,850]]];
  return [[[200,200],[824,200],[824,824],[200,824],[200,200]], [[200,200],[824,824]], [[824,200],[200,824]]];
}
async function play(bot) {
  const snapshot = bot.snapshot; const game = snapshot?.game;
  if (!bot.ready || bot.busy || !game || snapshot.viewer.role !== 'player') return;
  const schema = game.type === 'quiz' ? quizViewSchema : game.type === 'who' ? whoViewSchema : game.type === 'liar' ? liarViewSchema : game.type === 'images' ? imagesViewSchema : game.type === 'drawing' ? drawingViewSchema : null;
  const parsed = schema?.safeParse(game.view); if (!parsed?.success) return;
  const view = parsed.data;
  const roundId = game.type === 'quiz' ? view.questionId : view.roundId;
  const scope = `${game.id}:${roundId}:${view.phase}`;
  if (bot.scope !== scope) {
    bot.scope = scope; bot.forcedUsed = ''; bot.drawIndex = 0; bot.guessIndex = bot.index;
    // Bound bookkeeping across a long development session.
    if (bot.completed.size > 100) bot.completed.clear();
  }
  const once = action => act(bot, action, scope);
  if (game.type === 'quiz' && view.phase === 'question' && view.ownAnswer === null) return once({ type: 'answer', questionId: roundId, choice: bot.index % 4 });
  if (game.type === 'who' && view.phase === 'voting' && !view.ownVote) {
    const target = view.participants.find(player => !player.name.startsWith('[DEV]')) ?? view.participants[0];
    if (target) return once({ type: 'vote', roundId, targetId: target.id });
  }
  if (game.type === 'liar') {
    if (view.phase === 'writing' && !view.ownSubmission) return once({ type: 'submit', roundId, text: `Une hypothèse de ${bot.name} pour la manche ${view.roundNumber}` });
    if (view.phase === 'voting' && !view.ownVote) {
      const choices = view.choices.filter(choice => !choice.disabled && !choice.label.startsWith('Une hypothèse de [DEV]'));
      const choice = choices[bot.index % choices.length] ?? view.choices.find(choice => !choice.disabled);
      if (choice) return once({ type: 'vote', roundId, choiceId: choice.id });
    }
  }
  if (game.type === 'images' && view.phase === 'question' && view.ownAnswer === null) return once({ type: 'answer', roundId, choice: bot.index % 4 });
  if (game.type !== 'drawing') return;
  const self = view.drawerId === snapshot.viewer.sessionId;
  if (self && view.phase === 'choosing' && view.wordOptions.length) {
    console.log(`[DEV] MOT ${bot.name} : ${view.wordOptions[0]}`);
    return once({ type: 'choose', roundId, index: 0 });
  }
  if (view.phase !== 'drawing') return;
  if (self) {
    const lines = sketch(view.word ?? ''); const points = lines[bot.drawIndex];
    if (points) { const success = await act(bot, { type: 'draw', roundId, epoch: view.epoch, sequence: view.nextSequence, stroke: bot.drawIndex, points }); if (success) bot.drawIndex++; }
  } else if (!view.ownFound) {
    const text = forcedWord && bot.forcedUsed !== `${scope}:${forcedWord}` ? forcedWord : commonWords[bot.guessIndex++ % commonWords.length];
    if (text === forcedWord) bot.forcedUsed = `${scope}:${forcedWord}`;
    await act(bot, { type: 'guess', roundId, text });
  }
}
for (const bot of bots) {
  bot.socket.on('connect', () => {
    bot.version++; const established = Boolean(bot.credentials);
    void command(bot, established ? 'session:resume' : 'room:join', established ? bot.credentials : { code, name: bot.name }).then(response => {
      if (!response.ok) throw new Error(response.error.message);
      if (response.credentials) bot.credentials = response.credentials;
      bot.ready = true;
      if (!established && ++joined === bots.length) console.log('[DEV] PRÊTS : deux joueurs automatiques connectés. Lancez un jeu depuis l’hôte.');
    }).catch(error => { console.error(`[DEV] Admission impossible : ${error.message}`); void shutdown(1); });
  });
  bot.socket.on('disconnect', () => { bot.ready = false; bot.version++; });
  bot.socket.on('connect_error', () => { console.error('[DEV] Serveur inaccessible : lancez pnpm dev et vérifiez PORT.'); void shutdown(1); });
  bot.socket.on('room:snapshot', raw => {
    const parsed = snapshotSchema.safeParse(raw); if (!parsed.success) return;
    bot.snapshot = parsed.data;
    if (bot.snapshot.phase === 'closed') void shutdown(0);
  });
  bot.socket.connect();
}
input.on('line', line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('mot ') && trimmed.slice(4).trim()) { forcedWord = trimmed.slice(4).trim().slice(0,80); for (const bot of bots) bot.forcedUsed = ''; console.log(`[DEV] Proposition demandée : ${forcedWord}`); }
  else if (trimmed === 'quitter') void shutdown(0);
  else console.log('[DEV] Commandes : mot <proposition>, quitter.');
});
input.on('SIGINT', () => { void shutdown(0); });
process.on('SIGINT', () => { void shutdown(0); });
process.on('SIGTERM', () => { void shutdown(0); });
const tick = setInterval(() => { for (const bot of bots) void play(bot).catch(() => {}); }, 600);
console.log(`[DEV] Connexion de deux joueurs à ${code}, sur le serveur local :${port}.`);
console.log('[DEV] Dessin : les mots des dessinateurs automatiques sont indiqués ici ; leurs croquis sont génériques. « mot vélo » fait deviner vélo aux robots.');
