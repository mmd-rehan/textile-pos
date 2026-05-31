import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) { }

  @Get('movements')
  @RequirePermissions('read:inventory')
  async findMovements(@Query() query: QueryMovementsDto) {
    return this.inventoryService.findMovements(query);
  }

  @Get('stock-summary')
  @RequirePermissions('read:inventory')
  async getStockSummary() {
    return this.inventoryService.getStockSummary();
  }
}
