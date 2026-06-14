import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierStatementQueryDto } from './dto/supplier-statement-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Get()
  @RequirePermissions('read:purchases')
  async findAll(@Query() query: PaginationDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('read:purchases')
  async findOne(@Param('id') id: string) {
    const data = await this.suppliersService.findOne(id);
    return { data };
  }

  @Post()
  @RequirePermissions('write:purchases')
  async create(@Body() dto: CreateSupplierDto) {
    const data = await this.suppliersService.create(dto);
    return { data };
  }

  @Put(':id')
  @RequirePermissions('write:purchases')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    const data = await this.suppliersService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @RequirePermissions('write:purchases')
  async remove(@Param('id') id: string) {
    const data = await this.suppliersService.remove(id);
    return { data };
  }

  @Get(':id/ledger')
  @RequirePermissions('read:purchases')
  async getLedger(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.suppliersService.getLedger(id, query);
  }

  @Get(':id/statement')
  @RequirePermissions('suppliers.view_statement')
  async getStatement(@Param('id') id: string, @Query() query: SupplierStatementQueryDto) {
    const data = await this.suppliersService.getStatement(id, query);
    return { data };
  }
}
