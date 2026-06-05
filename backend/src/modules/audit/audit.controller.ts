import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  @RequirePermissions('read:settings')
  async getLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('tableName') tableName?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 30);
    const skip = (p - 1) * l;

    const where: Prisma.AuditLogWhereInput = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };
    if (tableName) where.tableName = tableName;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return createPaginatedResponse(data, total, p, l);
  }
}
