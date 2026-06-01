import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { QueryPurchaseDto } from './dto/query-purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) { }

  @Get()
  @RequirePermissions('read:purchases')
  async findAll(@Query() query: QueryPurchaseDto) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('read:purchases')
  async findOne(@Param('id') id: string) {
    const data = await this.purchasesService.findOne(id);
    return { data };
  }

  @Post()
  @RequirePermissions('write:purchases')
  async create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: { id: string }) {
    const data = await this.purchasesService.create(dto, user.id);
    return { data };
  }

  @Get(':id/payments')
  @RequirePermissions('read:purchases')
  async getPayments(@Param('id') id: string) {
    const data = await this.purchasesService.getPayments(id);
    return { data };
  }

  @Post(':id/payments')
  @RequirePermissions('write:purchases')
  async createPayment(
    @Param('id') id: string,
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.purchasesService.createPayment(id, dto, user.id);
    return { data };
  }
}
