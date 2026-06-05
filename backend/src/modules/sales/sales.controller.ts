import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateRetailSaleDto } from './dto/create-retail-sale.dto';
import { CreateWholesaleSaleDto } from './dto/create-wholesale-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('retail')
  @RequirePermissions('write:sales')
  async createRetailSale(
    @Body() dto: CreateRetailSaleDto,
    @CurrentUser() user: { id: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.salesService.createRetailSale(dto, user.id, idempotencyKey);
    return { data };
  }

  @Post('wholesale')
  @RequirePermissions('write:sales')
  async createWholesaleSale(
    @Body() dto: CreateWholesaleSaleDto,
    @CurrentUser() user: { id: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.salesService.createWholesaleSale(dto, user.id, idempotencyKey);
    return { data };
  }

  @Get()
  @RequirePermissions('read:sales')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('saleType') saleType?: string,
  ) {
    return this.salesService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      saleType,
    });
  }

  @Get(':id')
  @RequirePermissions('read:sales')
  async findOne(@Param('id') id: string) {
    const data = await this.salesService.findOne(id);
    return { data };
  }

  @Get(':id/receipt')
  @RequirePermissions('read:sales')
  async getReceipt(@Param('id') id: string) {
    const data = await this.salesService.getReceipt(id);
    return { data };
  }
}
