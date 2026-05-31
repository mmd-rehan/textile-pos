import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { AddProductColorDto, CreateColorDto, UpdateColorDto } from './dto/manage-product-color.dto';
import { AddProductDesignDto, CreateDesignDto, UpdateDesignDto } from './dto/manage-product-design.dto';
import { createSuccessResponse } from '../../common/utils/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @RequirePermissions('write:products')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const data = await this.productsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:products')
  async remove(@Param('id') id: string) {
    const data = await this.productsService.remove(id);
    return createSuccessResponse(data);
  }

  @Get(':id/colors')
  @RequirePermissions('read:products')
  async getColors(@Param('id') id: string) {
    const data = await this.productsService.getColors(id);
    return createSuccessResponse(data);
  }

  @Post(':id/colors')
  @RequirePermissions('write:products')
  async addColor(@Param('id') id: string, @Body() dto: AddProductColorDto) {
    const data = await this.productsService.addColor(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id/colors/:colorId')
  @RequirePermissions('write:products')
  async removeColor(@Param('id') id: string, @Param('colorId') colorId: string) {
    const data = await this.productsService.removeColor(id, colorId);
    return createSuccessResponse(data);
  }

  @Get(':id/designs')
  @RequirePermissions('read:products')
  async getDesigns(@Param('id') id: string) {
    const data = await this.productsService.getDesigns(id);
    return createSuccessResponse(data);
  }

  @Post(':id/designs')
  @RequirePermissions('write:products')
  async addDesign(@Param('id') id: string, @Body() dto: AddProductDesignDto) {
    const data = await this.productsService.addDesign(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id/designs/:designId')
  @RequirePermissions('write:products')
  async removeDesign(@Param('id') id: string, @Param('designId') designId: string) {
    const data = await this.productsService.removeDesign(id, designId);
    return createSuccessResponse(data);
  }
}

@Controller('colors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ColorsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll(@Query('search') search?: string, @Query('activeOnly') activeOnly?: string) {
    const data = await this.productsService.findAllColors(search, activeOnly === 'true');
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findColorById(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() dto: CreateColorDto) {
    const data = await this.productsService.createColor(dto);
    return createSuccessResponse(data);
  }

  @Patch(':id')
  @RequirePermissions('write:products')
  async update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    const data = await this.productsService.updateColor(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:products')
  async remove(@Param('id') id: string) {
    const data = await this.productsService.deleteColor(id);
    return createSuccessResponse(data);
  }
}

@Controller('designs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DesignsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll(@Query('search') search?: string, @Query('activeOnly') activeOnly?: string) {
    const data = await this.productsService.findAllDesigns(search, activeOnly === 'true');
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findDesignById(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() dto: CreateDesignDto) {
    const data = await this.productsService.createDesign(dto);
    return createSuccessResponse(data);
  }

  @Patch(':id')
  @RequirePermissions('write:products')
  async update(@Param('id') id: string, @Body() dto: UpdateDesignDto) {
    const data = await this.productsService.updateDesign(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:products')
  async remove(@Param('id') id: string) {
    const data = await this.productsService.deleteDesign(id);
    return createSuccessResponse(data);
  }
}
