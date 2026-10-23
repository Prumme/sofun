import { BadRequestException, ConflictException, Controller, Delete, Get, Header, Inject, NotFoundException, Param, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { catalogueSchema, packListSchema, partyGameIdSchema } from '@party/contracts';
import { ContentLibrary } from './library.js';
import { catalogue } from './catalogue.js';
import { Rooms } from '../rooms/rooms.js';
@Controller('api')
export class ContentController {
  constructor(@Inject(ContentLibrary) private readonly library: ContentLibrary, @Inject(Rooms) private readonly rooms: Rooms) {}
  private host(req: Request) {
    try { return this.rooms.authenticateHost({ roomId: req.headers['x-room-id'], sessionId: req.headers['x-session-id'], token: req.headers.authorization?.replace(/^Bearer /, '') }); }
    catch { throw new UnauthorizedException('Session hôte requise.'); }
  }
  @Get('games') games() { return catalogueSchema.parse(catalogue.filter(game => { try { this.rooms.engine.definition(game.id); return true; } catch { return false; } })); }
  @Get('packs') @Header('Cache-Control', 'no-store') packs(@Req() req: Request) { this.host(req); return packListSchema.parse(this.library.list()); }
  @Post('packs') import(@Req() req: Request) {
    this.host(req);
    if (!Buffer.isBuffer(req.body)) throw new BadRequestException('Envoyez un fichier ZIP.');
    try { return { id: this.library.importArchive(req.body) }; } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Import invalide.'); }
  }
  @Delete('packs/:id') remove(@Req() req: Request, @Param('id') id: string) {
    this.host(req);
    if ([...this.rooms.store.values()].some(room => room.game?.sourcePackId === id)) throw new ConflictException('Pack utilisé par une partie active.');
    try { this.library.remove(id); return { ok: true }; } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Suppression refusée.'); }
  }
  @Get('templates/:game') template(@Req() req: Request, @Param('game') game: string, @Res() res: Response) {
    this.host(req); const parsed = partyGameIdSchema.safeParse(game); if (!parsed.success) throw new NotFoundException();
    res.type('application/zip').attachment(`modele-${game}.zip`).send(this.library.template(parsed.data));
  }
  @Get('assets/:id') @Header('X-Content-Type-Options', 'nosniff') asset(@Param('id') id: string, @Res() res: Response) {
    const asset = this.library.asset(id); if (!asset) throw new NotFoundException();
    res.set('Cache-Control', 'no-store').type(asset.mime).send(asset.data);
  }
}
