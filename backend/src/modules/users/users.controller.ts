import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() body: { email: string; name: string; roleId?: string }) {
    const user = await this.usersService.create(body);
    return {
      data: user,
    };
  }

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      data: users,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      data: user,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; roleId?: string; isActive?: boolean }) {
    const user = await this.usersService.update(id, body);
    return {
      data: user,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    return {
      data: result,
    };
  }
}
