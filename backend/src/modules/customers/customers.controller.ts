import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { createSuccessResponse } from '../../common/utils/response';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('read:sales')
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Post()
  @RequirePermissions('write:sales')
  async create(@Body() dto: CreateCustomerDto) {
    return createSuccessResponse(await this.customersService.create(dto));
  }

  @Get(':id')
  @RequirePermissions('read:sales')
  async findOne(@Param('id') id: string) {
    return createSuccessResponse(await this.customersService.findOne(id));
  }

  @Put(':id')
  @RequirePermissions('write:sales')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: { id: string },
  ) {
    return createSuccessResponse(await this.customersService.update(id, dto, user.id));
  }

  @Get(':id/ledger')
  @RequirePermissions('read:sales')
  getLedger(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getLedger(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/payments')
  @RequirePermissions('write:sales')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: CreateCustomerPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return createSuccessResponse(await this.customersService.recordPayment(id, dto, user.id));
  }

  @Get(':id/outstanding')
  @RequirePermissions('read:sales')
  getOutstanding(@Param('id') id: string) {
    return this.customersService.getOutstanding(id);
  }
}
