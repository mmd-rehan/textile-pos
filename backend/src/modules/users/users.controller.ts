import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { createSuccessResponse } from '../../common/utils/response';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('write:users')
  async create(
    @Body() body: { username: string; email: string; password: string; roleIds?: string[] },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.usersService.create(body, user.id);
    return createSuccessResponse(data);
  }

  @Get()
  @RequirePermissions('read:users')
  async findAll() {
    const data = await this.usersService.findAll();
    return createSuccessResponse(data);
  }

  @Get(':id')
  @RequirePermissions('read:users')
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findOne(id);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @RequirePermissions('write:users')
  async update(
    @Param('id') id: string,
    @Body() body: { email?: string; status?: UserStatus },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.usersService.update(id, body, user.id);
    return createSuccessResponse(data);
  }

  @Put(':id/roles')
  @RequirePermissions('write:users')
  async assignRoles(
    @Param('id') id: string,
    @Body() body: { roleIds: string[] },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.usersService.assignRoles(id, body.roleIds ?? [], user.id);
    return createSuccessResponse(data);
  }

  @Put(':id/password')
  @RequirePermissions('write:users')
  async changePassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @CurrentUser() user: { id: string },
  ) {
    if (!body.password || body.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    await this.usersService.changePassword(id, body.password, user.id);
    return createSuccessResponse({ changed: true });
  }

  @Delete(':id')
  @RequirePermissions('write:users')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const data = await this.usersService.remove(id, user.id);
    return createSuccessResponse(data);
  }
}
