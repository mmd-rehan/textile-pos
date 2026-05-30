import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    const logs = await this.auditService.getLogs(userId, action);
    return {
      data: logs,
      meta: {
        count: logs.length,
      },
    };
  }
}
