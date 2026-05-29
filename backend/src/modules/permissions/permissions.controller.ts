import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async findAll() {
    const permissions = await this.permissionsService.findAll();
    return {
      data: permissions,
    };
  }
}
