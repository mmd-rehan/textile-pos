import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    const roles = await this.rolesService.findAll();
    return {
      data: roles,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return {
      data: role,
    };
  }

  @Post()
  async create(@Body() body: { name: string; description: string; permissions: string[] }) {
    const role = await this.rolesService.create(body);
    return {
      data: role,
    };
  }
}
