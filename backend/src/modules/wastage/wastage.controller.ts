import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WastageSourceType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ManualWastageDto } from './dto/manual-wastage.dto';
import { QueryWastageDto } from './dto/query-wastage.dto';
import { WastageService } from './wastage.service';

@Controller('wastage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Get()
  @RequirePermissions('read:inventory')
  async findAll(@Query() query: QueryWastageDto) {
    return this.wastageService.findAll(query);
  }

  @Get('summary')
  @RequirePermissions('read:inventory')
  async getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sourceType') sourceType?: WastageSourceType,
  ) {
    return this.wastageService.getSummary(dateFrom, dateTo, sourceType);
  }

  @Get('report/by-user')
  @RequirePermissions('read:inventory')
  async getUserWastageSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sourceType') sourceType?: WastageSourceType,
  ) {
    return this.wastageService.getUserWastageSummary(dateFrom, dateTo, sourceType);
  }

  @Post('manual')
  @RequirePermissions('write:inventory')
  async createManual(
    @Body() dto: ManualWastageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.wastageService.createManual(dto, user.id);
  }
}
