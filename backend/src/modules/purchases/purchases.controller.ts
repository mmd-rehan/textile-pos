import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchaseDto } from './dto/query-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

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
}
