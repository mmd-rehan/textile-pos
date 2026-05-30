import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { createSuccessResponse } from '../../common/utils/response';

// TODO: Protect write endpoints with admin-only guard once auth is implemented
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAll() {
    const data = await this.unitsService.findAll();
    return createSuccessResponse(data);
  }

  @Get('conversions')
  async findConversions() {
    const data = await this.unitsService.findConversions();
    return createSuccessResponse(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.unitsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  async create(@Body() dto: CreateUnitDto) {
    const data = await this.unitsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    const data = await this.unitsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.unitsService.remove(id);
    return createSuccessResponse(data);
  }
}
