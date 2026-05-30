import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  async findAll(@Query() query: PaginationDto) {
    return this.batchesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.batchesService.findOne(id);
    return { data };
  }

  @Post()
  async create(@Body() dto: CreateBatchDto) {
    const data = await this.batchesService.create(dto);
    return { data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    const data = await this.batchesService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.batchesService.remove(id);
    return { data };
  }
}
