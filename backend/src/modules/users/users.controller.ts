import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('write:users')
  async create(@Body() body: { username: string; email: string; password: string; roleIds?: string[] }) {
    return this.usersService.create(body);
  }

  @Get()
  @RequirePermissions('read:users')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read:users')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('write:users')
  async update(@Param('id') id: string, @Body() body: { email?: string; status?: UserStatus }) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('write:users')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
