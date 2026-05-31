import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { createSuccessResponse } from '../../common/utils/response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  @RequirePermissions('read:settings')
  async getCompanySettings() {
    const data = await this.settingsService.getCompanySettings();
    return createSuccessResponse(data);
  }

  @Put('company')
  @RequirePermissions('write:settings')
  async updateCompanySettings(@Body() body: Record<string, string>) {
    const data = await this.settingsService.updateCompanySettings(body);
    return createSuccessResponse(data);
  }

  @Get('app')
  @RequirePermissions('read:settings')
  async getAppSettings() {
    const data = await this.settingsService.getAppSettings();
    return createSuccessResponse(data);
  }

  @Put('app')
  @RequirePermissions('write:settings')
  async updateAppSettings(@Body() body: Record<string, string>) {
    const data = await this.settingsService.updateAppSettings(body);
    return createSuccessResponse(data);
  }
}
