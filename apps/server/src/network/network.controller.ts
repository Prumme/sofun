import { Controller, Get, Header } from '@nestjs/common';
import { networkInterfaces } from 'node:os';
import { networkSchema } from '@party/contracts';
import { getLanAddresses } from './lan-addresses.js';

@Controller('api/network')
export class NetworkController {
  @Get()
  @Header('Cache-Control', 'no-store')
  get() {
    return networkSchema.parse({ addresses: getLanAddresses(networkInterfaces()) });
  }
}
