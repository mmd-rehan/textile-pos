import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('batches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @RequirePermissions('read:inventory')
  async findAll(@Query() query: PaginationDto) {
    return this.batchesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('read:inventory')
  async findOne(@Param('id') id: string) {
    const data = await this.batchesService.findOne(id);
    return { data };
  }

  @Post()
  @RequirePermissions('write:inventory')
  async create(@Body() dto: CreateBatchDto) {
    const data = await this.batchesService.create(dto);
    return { data };
  }

  @Put(':id')
  @RequirePermissions('write:inventory')
  async update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    const data = await this.batchesService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @RequirePermissions('write:inventory')
  async remove(@Param('id') id: string) {
    const data = await this.batchesService.remove(id);
    return { data };
  }
}
