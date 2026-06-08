import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { WastageService } from '../wastage/wastage.service';
import { MarkFinishedDto } from './dto/mark-finished.dto';
import { QueryReconciliationsDto } from './dto/query-reconciliations.dto';
import { QueryRollMovementsDto } from './dto/query-roll-movements.dto';
import { QueryRollDto } from './dto/query-roll.dto';
import { ReconcileRollDto } from './dto/reconcile-roll.dto';
import { RollsService } from './rolls.service';

@Controller('rolls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RollsController {
  constructor(
    private readonly rollsService: RollsService,
    private readonly wastageService: WastageService,
  ) {}

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

  @Get(':id/reconciliations')
  @RequirePermissions('read:inventory')
  async findReconciliations(@Param('id') id: string, @Query() query: QueryReconciliationsDto) {
    return this.rollsService.findReconciliations(id, query);
  }

  @Get(':id/wastage')
  @RequirePermissions('read:inventory')
  async findWastage(@Param('id') id: string) {
    return this.wastageService.findByRoll(id);
  }

  @Post(':id/reconcile')
  @RequirePermissions('write:inventory')
  async reconcile(
    @Param('id') id: string,
    @Body() dto: ReconcileRollDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.rollsService.reconcile(id, user.id, dto);
    return { data };
  }

  @Post(':id/mark-finished')
  @RequirePermissions('write:inventory')
  async markFinished(
    @Param('id') id: string,
    @Body() dto: MarkFinishedDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.rollsService.markFinished(id, user.id, dto);
    return { data };
  }

  @Get(':id')
  @RequirePermissions('read:inventory')
  async findOne(@Param('id') id: string) {
    const data = await this.rollsService.findOne(id);
    return { data };
  }
}
