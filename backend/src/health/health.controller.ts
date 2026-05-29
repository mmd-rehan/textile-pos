import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let dbStatus = 'CONNECTED';
    let errorMessage: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error: any) {
      dbStatus = 'DISCONNECTED';
      errorMessage = error.message || String(error);
    }

    return {
      status: dbStatus === 'CONNECTED' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          message: errorMessage,
        },
      },
    };
  }
}
