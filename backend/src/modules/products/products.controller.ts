import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { AddProductColorDto, CreateColorDto } from './dto/manage-product-color.dto';
import { AddProductDesignDto, CreateDesignDto } from './dto/manage-product-design.dto';
import { createSuccessResponse } from '../../common/utils/response';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const data = await this.productsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.productsService.remove(id);
    return createSuccessResponse(data);
  }

  // ── Product Colors ────────────────────────────────────────────────

  @Get(':id/colors')
  async getColors(@Param('id') id: string) {
    const data = await this.productsService.getColors(id);
    return createSuccessResponse(data);
  }

  @Post(':id/colors')
  async addColor(@Param('id') id: string, @Body() dto: AddProductColorDto) {
    const data = await this.productsService.addColor(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id/colors/:colorId')
  async removeColor(@Param('id') id: string, @Param('colorId') colorId: string) {
    const data = await this.productsService.removeColor(id, colorId);
    return createSuccessResponse(data);
  }

  // ── Product Designs ───────────────────────────────────────────────

  @Get(':id/designs')
  async getDesigns(@Param('id') id: string) {
    const data = await this.productsService.getDesigns(id);
    return createSuccessResponse(data);
  }

  @Post(':id/designs')
  async addDesign(@Param('id') id: string, @Body() dto: AddProductDesignDto) {
    const data = await this.productsService.addDesign(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id/designs/:designId')
  async removeDesign(@Param('id') id: string, @Param('designId') designId: string) {
    const data = await this.productsService.removeDesign(id, designId);
    return createSuccessResponse(data);
  }
}

// ── Colors Catalog (separate controller on /colors) ───────────────

@Controller('colors')
export class ColorsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.productsService.findAllColors(search);
    return createSuccessResponse(data);
  }

  @Post()
  async create(@Body() dto: CreateColorDto) {
    const data = await this.productsService.createColor(dto);
    return createSuccessResponse(data);
  }
}

// ── Designs Catalog (separate controller on /designs) ─────────────

@Controller('designs')
export class DesignsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.productsService.findAllDesigns(search);
    return createSuccessResponse(data);
  }

  @Post()
  async create(@Body() dto: CreateDesignDto) {
    const data = await this.productsService.createDesign(dto);
    return createSuccessResponse(data);
  }
}
