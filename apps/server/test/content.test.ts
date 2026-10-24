import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { ContentLibrary } from '../src/content/library.js';
import { createApplication } from '../src/bootstrap.js';
import { Rooms } from '../src/rooms/rooms.js';
const archive = (manifest: unknown, files: Record<string, Uint8Array> = {}) => Buffer.from(zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)), ...files }));
const manifest = { version:1, game:'who', title:'Mon pack', items:[{question:'Qui ?'}] };
describe('content library',()=>{
  it('loads complete built-in banks, imports atomically and refuses invalid manifests and files',()=>{
    const lib=new ContentLibrary(); expect(lib.list().map(p=>p.count)).toEqual([20,20,40,30]);
    const id=lib.importArchive(archive(manifest)); expect(lib.get(id).manifest.title).toBe('Mon pack');
    const before=lib.list().length;
    for(const data of [archive({...manifest,items:[]}),archive({...manifest,version:2}),archive(manifest,{'../escape':strToU8('x')}),archive(manifest,{'nested.zip':new Uint8Array()}),Buffer.from('not a zip')]) expect(()=>lib.importArchive(data)).toThrow();
    expect(lib.list()).toHaveLength(before); lib.remove(id); expect(()=>lib.get(id)).toThrow(); expect(()=>lib.remove('builtin-who')).toThrow();
  });
  it('validates image references and signatures and exposes only opaque asset identifiers',()=>{
    const lib=new ContentLibrary(); const png=readFileSync(new URL('../src/content/art/scene-01.png',import.meta.url));
    const m={version:1,game:'images',title:'Images',items:[{question:'Image ?',image:'images/source.png',choices:['A','B','C','D'],correctIndex:0}]};
    expect(()=>lib.importArchive(archive(m))).toThrow(); expect(()=>lib.importArchive(archive(m,{'images/source.png':strToU8('<script>bad</script>')}))).toThrow();
    const id=lib.importArchive(archive(m,{'images/source.png':png})); const pack=lib.get(id);
    expect(pack.manifest.game).toBe('images'); if(pack.manifest.game==='images'){const asset=pack.manifest.items[0]!.image;expect(asset).not.toContain('source');expect(lib.asset(asset)?.data.equals(png)).toBe(true);}
    const metadata=JSON.stringify(lib.list()); expect(metadata).not.toContain('correctIndex');expect(metadata).not.toContain('source.png');
  });
  it('bounds compressed and decompressed archives before committing a pack',()=>{
    const lib=new ContentLibrary();const count=lib.list().length;
    expect(()=>lib.importArchive(Buffer.alloc(20*1024*1024+1))).toThrow('20 Mio');
    const huge=Buffer.from(zipSync({'manifest.json':new Uint8Array(51*1024*1024)}));
    expect(()=>lib.importArchive(huge)).toThrow();expect(lib.list()).toHaveLength(count);
  });
});
it('authenticates HTTP imports, preserves immutable running content and rejects deletion while used',async()=>{
  const app=await createApplication(undefined,false);
  try {
    await app.listen(0,'127.0.0.1'); const port=(app.getHttpServer().address() as AddressInfo).port;const origin=`http://127.0.0.1:${port}`;const rooms=app.get(Rooms);
    const host=await rooms.command('host','room:create',{requestId:randomUUID()});if(!host.ok||!host.credentials)throw new Error('Host missing');
    const {roomId,sessionId,token}=host.credentials; const headers={'Authorization':`Bearer ${token}`,'X-Room-Id':roomId,'X-Session-Id':sessionId,'Content-Type':'application/zip'};
    expect((await fetch(`${origin}/api/packs`,{method:'POST',body:new Uint8Array(archive(manifest))})).status).toBe(401);
    const imported=await fetch(`${origin}/api/packs`,{method:'POST',headers,body:new Uint8Array(archive(manifest))});expect(imported.status).toBe(201);const body=await imported.json() as {id:string};
    const room=rooms.store.get(roomId)!;for(const i of [1,2]) await rooms.command(`p${i}`,'room:join',{requestId:randomUUID(),code:room.code,name:`P${i}`});
    expect((await rooms.command('host','game:start',{requestId:randomUUID(),gameId:'who',config:{packId:body.id,rounds:1,resultsSeconds:5,voteSeconds:10}})).ok).toBe(true);
    expect((await fetch(`${origin}/api/packs/${body.id}`,{method:'DELETE',headers})).status).toBe(409);
    expect((await rooms.command('host','room:close',{requestId:randomUUID()})).ok).toBe(true);
    // A different host can reuse the temporary library, but an expired session cannot mutate it.
    expect((await fetch(`${origin}/api/packs/${body.id}`,{method:'DELETE',headers})).status).toBe(401);
    const second=await rooms.command('host2','room:create',{requestId:randomUUID()});if(!second.ok||!second.credentials)throw new Error('Host missing');
    const credentials=second.credentials;const secondHeaders={'Authorization':`Bearer ${credentials.token}`,'X-Room-Id':credentials.roomId,'X-Session-Id':credentials.sessionId};
    const listed=await (await fetch(`${origin}/api/packs`,{headers:secondHeaders})).json();expect(JSON.stringify(listed)).toContain(body.id);
    expect((await fetch(`${origin}/api/packs/${body.id}`,{method:'DELETE',headers:secondHeaders})).status).toBe(200);
  }finally{await app.close();}
});

it('enforces the cumulative library budget atomically and frees it after deletion',()=>{
  const bytes=Buffer.byteLength(JSON.stringify(manifest)); const lib=new ContentLibrary(bytes*2-1);
  const first=lib.importArchive(archive(manifest));const count=lib.list().length;
  expect(()=>lib.importArchive(archive(manifest))).toThrow('Bibliothèque pleine');expect(lib.list()).toHaveLength(count);
  lib.remove(first);expect(()=>lib.importArchive(archive(manifest))).not.toThrow();
});
