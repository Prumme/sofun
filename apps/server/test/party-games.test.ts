import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Json } from '@party/contracts';
import type { ActionContext, GameSetupContext } from '@party/game-sdk';
import { whoDefinition } from '../src/games/who/who.js';
import { liarDefinition } from '../src/games/liar/liar.js';
import { imagesDefinition } from '../src/games/images/images.js';
import { drawingDefinition } from '../src/games/drawing/drawing.js';
const players = ['Alice','Benoît','Camille'].map(name => ({ id: randomUUID(), name }));
const host = { role: 'host' as const, sessionId: randomUUID() };
function setup(content: Json): GameSetupContext { return { now: 1000, random: () => .99, players, content }; }
function actor(index: number, now = 1001): ActionContext { return { now, random: () => .99, players, actor: { role: 'player', sessionId: players[index]!.id } }; }
const config = { packId: 'test', rounds: 1, resultsSeconds: 5, voteSeconds: 10 };
describe('Qui de nous', () => {
  it('keeps votes private, accepts self votes and awards all majority ties exactly once', () => {
    let state = whoDefinition.setup(setup([{question:'Qui ?'}]), config).state;
    const initial = state;
    for (const index of [0,1,2]) {
      const next = whoDefinition.handleAction(state, { type:'vote', roundId:'who-0', targetId:players[index]!.id }, actor(index));
      expect(next.accepted).toBe(true); if (next.accepted) state = next.transition.state;
      if (index < 2) expect(whoDefinition.project(state, host).votes).toEqual([]);
    }
    expect(initial.votes).toEqual({});
    expect(whoDefinition.project(state, host).results.map(p => p.score)).toEqual([1,1,1]);
    expect(whoDefinition.handleAction(state, { type:'vote', roundId:'who-0', targetId:players[0]!.id }, actor(0)).accepted).toBe(false);
    const results = whoDefinition.handleTimer(state, {roundId:'who-0',phase:'revealed'}, { ...setup([]), now:state.deadline }).state;
    expect(results.phase).toBe('results');
    expect(whoDefinition.handleAction(results, {type:'return-lobby',roundId:'who-0'}, actor(0)).accepted).toBe(false);
    const ended = whoDefinition.handleAction(results, {type:'return-lobby',roundId:'who-0'}, {...actor(0),actor:host});
    expect(ended.accepted && ended.transition.finished).toBe(true);
  });
  it('rejects late, duplicate and obsolete votes, handles abstentions and ignores old timers', () => {
    const s = whoDefinition.setup(setup([{question:'Qui ?'}]), config).state;
    expect(whoDefinition.handleAction(s,{type:'vote',roundId:'who-0',targetId:players[0]!.id},actor(0,s.deadline)).accepted).toBe(false);
    expect(whoDefinition.handleTimer(s,{roundId:'old',phase:'voting'},setup([])).state.phase).toBe('voting');
    const r = whoDefinition.handleTimer(s,{roundId:'who-0',phase:'voting'},{...setup([]),now:s.deadline}).state;
    expect(whoDefinition.project(r,host).results.every(p=>p.score===0)).toBe(true);
  });
});
describe('Menteur', () => {
  it('protects truth and authors, rejects aliases and duplicate inventions, forbids self votes and scores bluff', () => {
    let s = liarDefinition.setup(setup([{question:'La vérité ?',truth:'Éléphant',aliases:['elephants']}]),{...config,writingSeconds:15}).state;
    expect(JSON.stringify(liarDefinition.project(s,host))).not.toContain('Éléphant');
    expect(liarDefinition.handleAction(s,{type:'submit',roundId:'liar-0',text:'  elephant '},actor(0)).accepted).toBe(false);
    for (const index of [0,1,2]) {
      const action = liarDefinition.handleAction(s,{type:'submit',roundId:'liar-0',text:['Lion','Chat','Chien'][index]!},actor(index));
      expect(action.accepted).toBe(true); if(action.accepted) s=action.transition.state;
      if(index===0) expect(liarDefinition.handleAction(s,{type:'submit',roundId:'liar-0',text:'LION'},actor(1)).accepted).toBe(false);
    }
    expect(s.phase).toBe('voting'); const view=liarDefinition.project(s,host); expect(view.truth).toBeNull(); expect(view.authors).toEqual([]);
    const own=s.choices.find(c=>c.author===players[0]!.id)!; const truth=s.choices.find(c=>c.author===null)!;
    expect(liarDefinition.handleAction(s,{type:'vote',roundId:'liar-0',choiceId:own.id},actor(0)).accepted).toBe(false);
    for(const index of [0,1,2]) { const action=liarDefinition.handleAction(s,{type:'vote',roundId:'liar-0',choiceId:index===0?truth.id:own.id},actor(index)); if(action.accepted)s=action.transition.state; }
    expect(s.scores[players[0]!.id]).toBe(4);
    expect(liarDefinition.project(s,host).truth).toBe('Éléphant');
  });
  it('ends an unanswered writing phase without assigning points or exposing empty votes',()=>{
    const s=liarDefinition.setup(setup([{question:'Question',truth:'Vérité',aliases:[]}]),{...config,writingSeconds:15}).state;
    const r=liarDefinition.handleTimer(s,{roundId:'liar-0',phase:'writing'},{...setup([]),now:s.deadline}).state;
    expect(r.phase).toBe('revealed'); expect(Object.values(r.scores)).toEqual([0,0,0]);
  });
});
describe('Images',()=>{
  it('uses server arrival order, hides the solution and never credits wrong or repeated answers',()=>{
    let s=imagesDefinition.setup(setup([{question:'Image ?',image:'opaque',choices:['A','B','C','D'],correctIndex:0}]),{packId:'test',rounds:1,resultsSeconds:5,answerSeconds:5}).state;
    expect(imagesDefinition.project(s,host).correctChoice).toBeNull();
    for(const index of [0,1,2]) { const r=imagesDefinition.handleAction(s,{type:'answer',roundId:'images-0',choice:index===2?1:0},actor(index)); if(r.accepted)s=r.transition.state; }
    expect([s.scores[players[0]!.id],s.scores[players[1]!.id],s.scores[players[2]!.id]]).toEqual([1000,500,0]);
    expect(imagesDefinition.handleAction(s,{type:'answer',roundId:'images-0',choice:0},actor(2)).accepted).toBe(false);
  });
});
describe('Dessin',()=>{
  it('protects words, rejects wrong drawers and stale strokes, recognizes aliases and credits every player once',()=>{
    const words=['Éléphant','Chat','Soleil','Maison','Bateau'].map(word=>({word,aliases:[]}));
    let s=drawingDefinition.setup(setup(words),{packId:'test',tours:1,drawingSeconds:30,resultsSeconds:5}).state;
    const drawerIndex=players.findIndex(p=>p.id===s.order[0]);
    expect(drawingDefinition.project(s,host).wordOptions).toEqual([]);
    expect(drawingDefinition.handleAction(s,{type:'choose',roundId:'drawing-0',index:0},actor((drawerIndex+1)%3)).accepted).toBe(false);
    const chosen=drawingDefinition.handleAction(s,{type:'choose',roundId:'drawing-0',index:0},actor(drawerIndex)); if(chosen.accepted)s=chosen.transition.state;
    expect(drawingDefinition.project(s,host).word).toBeNull();
    const draw={type:'draw' as const,roundId:'drawing-0',epoch:0,sequence:0,stroke:0,points:[[1,1],[100,100]] as [number,number][]};
    const r=drawingDefinition.handleAction(s,draw,actor(drawerIndex)); if(r.accepted)s=r.transition.state;
    expect(s.strokes).toHaveLength(1);
    expect(drawingDefinition.handleAction(s,draw,actor(drawerIndex,1500)).accepted).toBe(false);
    const cleared=drawingDefinition.handleAction(s,{type:'clear',roundId:'drawing-0',epoch:0},actor(drawerIndex,1500)); if(cleared.accepted)s=cleared.transition.state;
    expect(s.strokes).toEqual([]); expect(drawingDefinition.handleAction(s,{...draw,sequence:1},actor(drawerIndex,2000)).accepted).toBe(false);
    const guessers=[0,1,2].filter(i=>i!==drawerIndex);
    for(const index of guessers) { const answer=drawingDefinition.handleAction(s,{type:'guess',roundId:'drawing-0',text:'  ELEPHANT '},actor(index)); expect(answer.accepted).toBe(true); if(answer.accepted)s=answer.transition.state; }
    expect(s.phase).toBe('revealed'); expect(s.scores[players[drawerIndex]!.id]).toBe(200);
    expect(guessers.map(i=>s.scores[players[i]!.id])).toEqual([1000,500]);
  });
  it('limits wrong guesses and skips word selection at its authoritative deadline',()=>{
    let s=drawingDefinition.setup(setup(['chat','chien','oiseau','soleil','lune'].map(word=>({word,aliases:[]}))),{packId:'test',tours:1,drawingSeconds:30,resultsSeconds:5}).state;
    const skipped=drawingDefinition.handleTimer(s,{roundId:'drawing-0',phase:'choosing'},{...setup([]),now:s.deadline}).state;
    expect(skipped.phase).toBe('revealed'); expect(skipped.chosen).toBeNull();
    const index=players.findIndex(p=>p.id===s.order[0]);const choose=drawingDefinition.handleAction(s,{type:'choose',roundId:'drawing-0',index:0},actor(index)); if(choose.accepted)s=choose.transition.state;
    const other=(index+1)%3;
    for(let i=0;i<3;i++){const r=drawingDefinition.handleAction(s,{type:'guess',roundId:'drawing-0',text:'faux'},actor(other));expect(r.accepted).toBe(true);if(r.accepted)s=r.transition.state;}
    expect(drawingDefinition.handleAction(s,{type:'guess',roundId:'drawing-0',text:'encore'},actor(other)).accepted).toBe(false);
  });
});

import { Engine } from '../src/engine/engine.js';
import { games } from '../src/games/registry.js';
import { ContentLibrary } from '../src/content/library.js';
for(const type of ['who','liar','images','drawing'] as const) it(`${type} automatically finishes every configured round without an input and starts a fresh replay`,()=>{
  const library=new ContentLibrary();const engine=new Engine(games);const pack=library.get(`builtin-${type}`);
  const gameConfig=type==='drawing'?{packId:pack.id,tours:3,drawingSeconds:30,resultsSeconds:5}:type==='liar'?{...config,rounds:5,writingSeconds:15}:type==='images'?{packId:pack.id,rounds:5,answerSeconds:5,resultsSeconds:5}:{...config,rounds:5};
  for(let replay=0;replay<2;replay++){
    let now=1000;const started=engine.start(type,gameConfig,{...setup(pack.manifest.items),now});let state=started.game.state;let transition=started.transition;let phases=0;
    while((state as {phase:string}).phase!=='results'&&phases++<50){const effect=transition.effects.find(effect=>effect.type==='schedule');if(!effect||effect.type!=='schedule')throw new Error('Missing timer');now+=effect.delayMs;transition=engine.definition(type).tick(state,effect.timer,{...setup([]),now});state=transition.state;}
    const view=engine.definition(type).project(state,host) as {phase:string;roundId:string;results:{score:number}[]};expect(view.phase).toBe('results');expect(view.results.every(p=>p.score===0)).toBe(true);
    expect(engine.definition(type).act(state,{type:'return-lobby',roundId:view.roundId},{...actor(0,now),actor:host}).finished).toBe(true);
  }
});

it('bounds a full drawing and projects it consistently to twelve viewers',()=>{
  const many=Array.from({length:12},(_,i)=>({id:randomUUID(),name:`Joueur ${i+1}`}));const context={...setup(new ContentLibrary().get('builtin-drawing').manifest.items),players:many};
  let state=drawingDefinition.setup(context,{packId:'builtin-drawing',tours:1,drawingSeconds:30,resultsSeconds:5}).state;
  const drawingActor={...actor(0),players:many,actor:{role:'player' as const,sessionId:state.order[0]!}};
  const chosen=drawingDefinition.handleAction(state,{type:'choose',roundId:'drawing-0',index:0},drawingActor);if(chosen.accepted)state=chosen.transition.state;
  for(let i=0;i<40;i++){const result=drawingDefinition.handleAction(state,{type:'draw',roundId:'drawing-0',epoch:0,sequence:i,stroke:0,points:Array.from({length:50},(_,p)=>[p*10,p*10] as [number,number])},{...drawingActor,now:1201+i*200});expect(result.accepted).toBe(true);if(result.accepted)state=result.transition.state;}
  expect(state.strokes[0]!.points).toHaveLength(2000);
  expect(drawingDefinition.handleAction(state,{type:'draw',roundId:'drawing-0',epoch:0,sequence:40,stroke:0,points:[[1,1]]},{...drawingActor,now:9500}).accepted).toBe(false);
  for(const player of many){const view=drawingDefinition.project(state,{role:'player',sessionId:player.id});expect(view.strokes[0]!.points).toHaveLength(2000);expect(Buffer.byteLength(JSON.stringify(view))).toBeLessThan(64*1024);if(player.id!==state.order[0])expect(view.word).toBeNull();}
});
