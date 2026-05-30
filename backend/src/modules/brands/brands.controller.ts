import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { createSuccessResponse } from '../../common/utils/response';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.brandsService.findAll(search);
    return createSuccessResponse(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.brandsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  async create(@Body() dto: CreateBrandDto) {
    const data = await this.brandsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const data = await this.brandsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.brandsService.remove(id);
    return createSuccessResponse(data);
  }
}
