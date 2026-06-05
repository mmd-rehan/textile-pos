import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateRemnantDto } from './dto/create-remnant.dto';
import { QueryRemnantsDto } from './dto/query-remnants.dto';
import { RemnantsService } from './remnants.service';

@Controller('remnants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RemnantsController {
  constructor(private readonly remnantsService: RemnantsService) {}

  @Get()
  @RequirePermissions('read:inventory')
  async findAll(@Query() query: QueryRemnantsDto) {
    return this.remnantsService.findAll(query);
  }

  @Post()
  @RequirePermissions('write:inventory')
  async create(@Body() dto: CreateRemnantDto, @CurrentUser() user: { id: string }) {
    const data = await this.remnantsService.create(dto, user.id);
    return { data };
  }
}
