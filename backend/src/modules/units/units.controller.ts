import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { createSuccessResponse } from '../../common/utils/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermissions('read:products')
  async findAll() {
    const data = await this.unitsService.findAll();
    return createSuccessResponse(data);
  }

  @Get('conversions')
  @RequirePermissions('read:products')
  async findConversions() {
    const data = await this.unitsService.findConversions();
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:products')
  async findOne(@Param('id') id: string) {
    const data = await this.unitsService.findOne(id);
    return createSuccessResponse(data);
  }

  @Post()
  @RequirePermissions('write:settings')
  async create(@Body() dto: CreateUnitDto) {
    const data = await this.unitsService.create(dto);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @RequirePermissions('write:settings')
  async update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    const data = await this.unitsService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Delete(':id')
  @RequirePermissions('write:settings')
  async remove(@Param('id') id: string) {
    const data = await this.unitsService.remove(id);
    return createSuccessResponse(data);
  }
}
