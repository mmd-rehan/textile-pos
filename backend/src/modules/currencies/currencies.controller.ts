import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { createSuccessResponse } from '../../common/utils/response';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @RequirePermissions('read:settings')
  async findAll() {
    const data = await this.currenciesService.findAll();
    return createSuccessResponse(data);
  }

  @Get('active')
  @RequirePermissions('read:settings')
  async findActive() {
    const data = await this.currenciesService.findActive();
    return createSuccessResponse(data);
  }

  @Get('exchange-rates')
  @RequirePermissions('read:settings')
  async getExchangeRates(@Query('to') to?: string) {
    const data = await this.currenciesService.getExchangeRates(to);
    return createSuccessResponse(data);
  }

  @Put(':code/status')
  @RequirePermissions('write:settings')
  async toggleStatus(
    @Param('code') code: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.currenciesService.toggleActive(code, body.isActive, user.id);
    return createSuccessResponse(data);
  }

  @Post('exchange-rates')
  @RequirePermissions('write:settings')
  async upsertExchangeRate(
    @Body() body: { fromCurrencyCode: string; toCurrencyCode: string; rate: string; notes?: string },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.currenciesService.upsertExchangeRate({ ...body, userId: user.id });
    return createSuccessResponse(data);
  }
}
