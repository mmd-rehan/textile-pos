import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { createSuccessResponse } from '../../common/utils/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll(@Query('search') search?: string) {
    const data = await this.categoriesService.findAll(search);
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.categoriesService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @RequirePermissions('write:products')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const data = await this.categoriesService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:products')
  async remove(@Param('id') id: string) {
    const data = await this.categoriesService.remove(id);
    return createSuccessResponse(data);
  }
}
