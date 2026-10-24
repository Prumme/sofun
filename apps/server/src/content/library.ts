import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Unzip, UnzipInflate, zipSync, strToU8 } from 'fflate';
import { manifestSchema } from './schemas.js';
import type { Manifest } from './schemas.js';
import { whoPack, liarPack, drawingPack } from './builtins.js';
export interface Pack { id: string; manifest: Manifest; builtIn: boolean; bytes: number; assets: Map<string, { data: Buffer; mime: string }> }
const MIB = 1024 * 1024;
export class ContentLibrary {
  private readonly packs = new Map<string, Pack>();
  constructor(private readonly maxImportedBytes = 200 * MIB) { for (const manifest of [whoPack, liarPack, drawingPack]) this.addBuiltin(manifest);
    const artDir = new URL('../../src/content/art/', import.meta.url);
    const illustrations = z.array(z.object({ file: z.string().regex(/^scene-\d{2}\.png$/), answer: z.string(), category: z.string() })).parse(JSON.parse(readFileSync(new URL('index.json', artDir), 'utf8')));
    const assets: Pack['assets'] = new Map();
    const items = illustrations.map(art => {
      const id = randomUUID(); assets.set(id, { data: readFileSync(fileURLToPath(new URL(art.file, artDir))), mime: 'image/png' });
      const others = illustrations.filter(other => other.category === art.category && other.answer !== art.answer).slice(0, 3).map(other => other.answer);
      return { question: art.category === 'pays' ? 'Quel pays est évoqué par cette illustration ?' : art.category === 'games' ? 'Quel jeu est évoqué par cette illustration ?' : 'Quel film est évoqué par cette illustration ?', image: id, choices: [art.answer, ...others] as [string, string, string, string], correctIndex: 0 };
    });
    this.addBuiltin({ version: 1, game: 'images', title: 'Trente indices illustrés', items }, assets);
  }
  addBuiltin(manifest: Manifest, assets = new Map<string, { data: Buffer; mime: string }>()) {
    this.packs.set(`builtin-${manifest.game}`, { id: `builtin-${manifest.game}`, manifest, builtIn: true, bytes: 0, assets });
  }
  list() { return [...this.packs.values()].map(pack => ({ id: pack.id, game: pack.manifest.game, title: pack.manifest.title, count: pack.manifest.items.length, builtIn: pack.builtIn })); }
  get(id: string) { const pack = this.packs.get(id); if (!pack) throw new Error('Pack introuvable.'); return pack; }
  remove(id: string) { const pack = this.get(id); if (pack.builtIn) throw new Error('Un pack intégré ne peut pas être supprimé.'); this.packs.delete(id); }
  asset(id: string) { for (const pack of this.packs.values()) { const asset = pack.assets.get(id); if (asset) return asset; } return undefined; }
  importArchive(data: Buffer) {
    if (data.length > 20 * MIB) throw new Error('Le ZIP dépasse 20 Mio.');
    const files = new Map<string, Buffer>(); const seen = new Set<string>(); let size = 0; let failure: Error | null = null; let entries = 0;
    const unzip = new Unzip(file => {
      if (file.name === 'images/' && file.originalSize === 0) { file.terminate(); return; }
      if (file.name.split('').some(character => character.charCodeAt(0) < 32) || failure || ++entries > 512 || seen.has(file.name) || !/^(manifest\.json|images\/[^/\\]+\.(png|jpg|jpeg|webp))$/iu.test(file.name)) { failure = new Error('Chemin, format ou nombre de fichiers invalide.'); file.terminate(); return; }
      seen.add(file.name);
      if (file.originalSize !== undefined && file.originalSize > 50 * MIB) { failure = new Error('Contenu décompressé trop volumineux.'); file.terminate(); return; }
      const chunks: Buffer[] = [];
      file.ondata = (error, chunk, final) => {
        if (failure) return;
        if (error) { failure = new Error('Archive illisible.'); file.terminate(); return; }
        size += chunk.length;
        if (size > 50 * MIB) { failure = new Error('Le contenu décompressé dépasse 50 Mio.'); file.terminate(); return; }
        chunks.push(Buffer.from(chunk));
        if (final) files.set(file.name, Buffer.concat(chunks));
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try { for (let offset = 0; offset < data.length && !failure; offset += 4096) unzip.push(data.subarray(offset, offset + 4096), offset + 4096 >= data.length); } catch { throw new Error('Archive ZIP invalide ou trop volumineuse.'); }
    if (failure) throw failure;
    const raw = files.get('manifest.json');
    if (!raw || raw.length > MIB) throw new Error('manifest.json absent ou supérieur à 1 Mio.');
    let json: unknown;
    try { json = JSON.parse(raw.toString('utf8')); } catch { throw new Error('manifest.json contient un JSON invalide.'); }
    const parsed = manifestSchema.safeParse(json);
    if (!parsed.success) throw new Error(`Manifeste invalide : ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
    const manifest = parsed.data;
    const assets: Pack['assets'] = new Map(); const usedFiles = new Set(['manifest.json']);
    if (manifest.game === 'images') for (const item of manifest.items) {
      const bytes = files.get(item.image);
      if (!bytes) throw new Error(`Image absente pour l’entrée ${manifest.items.indexOf(item) + 1}.`);
      const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
      if (!mime || !(mime === 'image/png' ? /\.png$/i : mime === 'image/jpeg' ? /\.jpe?g$/i : /\.webp$/i).test(item.image)) throw new Error('Signature ou extension d’image invalide.');
      usedFiles.add(item.image); const id = randomUUID(); assets.set(id, { data: bytes, mime }); item.image = id;
    }
    if ([...files.keys()].some(name => !usedFiles.has(name))) throw new Error('Archive contenant des fichiers non référencés.');
    const currentSize = [...this.packs.values()].reduce((sum, pack) => sum + pack.bytes, 0);
    if (currentSize + size > this.maxImportedBytes) throw new Error('Bibliothèque pleine (200 Mio). Supprimez un pack inutilisé.');
    const id = randomUUID(); this.packs.set(id, { id, manifest, assets, bytes: size, builtIn: false });
    return id;
  }
  template(game: Manifest['game']) {
    const manifest: Manifest = game === 'who' ? { version: 1, game, title: 'Mon pack', items: [{ question: 'Qui organiserait une expédition ?' }] }
      : game === 'liar' ? { version: 1, game, title: 'Mon pack', items: [{ question: 'Combien font deux plus deux ?', truth: 'Quatre', aliases: ['4'] }] }
      : game === 'drawing' ? { version: 1, game, title: 'Mes mots', items: ['chat', 'maison', 'soleil', 'chien', 'bateau'].map(word => ({ word, aliases: [] })) }
      : { version: 1, game, title: 'Mes images', items: [{ question: 'Quel pays est évoqué ?', image: 'images/exemple.png', choices: ['France', 'Italie', 'Japon', 'Canada'], correctIndex: 0 }] };
    const files: Record<string, Uint8Array> = { 'manifest.json': strToU8(JSON.stringify(manifest, null, 2)) };
    if (game === 'images' && manifest.game === 'images') { const first = this.get('builtin-images'); if (first.manifest.game === 'images') { const item = first.manifest.items[0]!; manifest.items = [{ ...item, image: 'images/exemple.png' }]; files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2)); files['images/exemple.png'] = first.assets.get(item.image)!.data; } }
    return Buffer.from(zipSync(files));
  }
}
