import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { createSuccessResponse } from '../../common/utils/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll(@Query('search') search?: string) {
    const data = await this.brandsService.findAll(search);
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.brandsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() dto: CreateBrandDto) {
    const data = await this.brandsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @RequirePermissions('write:products')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const data = await this.brandsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:products')
  async remove(@Param('id') id: string) {
    const data = await this.brandsService.remove(id);
    return createSuccessResponse(data);
  }
}
