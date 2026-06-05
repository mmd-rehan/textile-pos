import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
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

  @Get('report/by-user')
  @RequirePermissions('read:inventory')
  async getUserWastageSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.wastageService.getUserWastageSummary(dateFrom, dateTo);
  }
}
