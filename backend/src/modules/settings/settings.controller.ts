import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { createSuccessResponse } from '../../common/utils/response';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Readable by every signed-in user: the POS needs the shop's base currency and
  // receipt details. Only the PUT requires write:settings.
  @Get('company')
  async getCompanySettings() {
    const data = await this.settingsService.getCompanySettings();
    return createSuccessResponse(data);
  }

  @Put('company')
  @RequirePermissions('write:settings')
  async updateCompanySettings(
    @Body() body: Record<string, string>,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.settingsService.updateCompanySettings(body, user.id);
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
  async updateAppSettings(
    @Body() body: Record<string, string>,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.settingsService.updateAppSettings(body, user.id);
    return createSuccessResponse(data);
  }

  @Get('tax')
  async getTaxSettings() {
    const data = await this.settingsService.getTaxSettings();
    return createSuccessResponse(data);
  }

  // Readable by every signed-in user: the UI hides or enables features (credit
  // sales, wholesale POS, wastage) from these flags for every role.
  @Get('flags')
  async getFeatureFlags() {
    const data = await this.settingsService.getFeatureFlags();
    return createSuccessResponse(data);
  }

  @Get('flags/definitions')
  @RequirePermissions('read:settings')
  getFeatureFlagDefinitions() {
    const data = this.settingsService.getFeatureFlagDefinitions();
    return createSuccessResponse(data);
  }

  @Put('flags/:name')
  @RequirePermissions('write:settings')
  async updateFeatureFlag(
    @Param('name') name: string,
    @Body() body: { isEnabled: boolean },
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.settingsService.updateFeatureFlag(name, body.isEnabled, user.id);
    return createSuccessResponse(data);
  }
}
