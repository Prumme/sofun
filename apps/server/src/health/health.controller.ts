import { Controller, Get } from '@nestjs/common';
import { healthSchema } from '@party/contracts';
@Controller('api/health')
export class HealthController {
  @Get() get() { return healthSchema.parse({ status: 'ok' }); }
}
