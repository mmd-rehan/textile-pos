import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('read:sales')
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('read:sales')
  async findOne(@Param('id') id: string) {
    const data = await this.customersService.findOne(id);
    return { data };
  }

  @Post()
  @RequirePermissions('write:sales')
  async create(@Body() dto: CreateCustomerDto) {
    const data = await this.customersService.create(dto);
    return { data };
  }
}
