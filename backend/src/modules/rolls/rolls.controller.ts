import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { QueryRollMovementsDto } from './dto/query-roll-movements.dto';
import { QueryRollDto } from './dto/query-roll.dto';
import { RollsService } from './rolls.service';

@Controller('rolls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RollsController {
  constructor(private readonly rollsService: RollsService) { }

  @Get()
  @RequirePermissions('read:inventory')
  async findAll(@Query() query: QueryRollDto) {
    return this.rollsService.findAll(query);
  }

  @Get('barcode/:barcode')
  @RequirePermissions('read:inventory')
  async findByBarcode(@Param('barcode') barcode: string) {
    const data = await this.rollsService.findByBarcode(barcode);
    return { data };
  }

  @Get(':id/movements')
  @RequirePermissions('read:inventory')
  async findMovements(@Param('id') id: string, @Query() query: QueryRollMovementsDto) {
    return this.rollsService.findMovements(id, query);
  }

  @Get(':id')
  @RequirePermissions('read:inventory')
  async findOne(@Param('id') id: string) {
    const data = await this.rollsService.findOne(id);
    return { data };
  }
}
