import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RolesService } from './roles.service';
import { createSuccessResponse } from '../../common/utils/response';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('read:users')
  async findAll() {
    const data = await this.rolesService.findAll();
    return createSuccessResponse(data);
  }

  @Get('permissions')
  @RequirePermissions('read:users')
  async findAllPermissions() {
    const data = await this.rolesService.findAllPermissions();
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:users')
  async findOne(@Param('id') id: string) {
    const data = await this.rolesService.findOne(id);
    return createSuccessResponse(data);
  }
}
