import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { createSuccessResponse } from '../../common/utils/response';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  async getCompanySettings() {
    const data = await this.settingsService.getCompanySettings();
    return createSuccessResponse(data);
  }

  @Put('company')
  async updateCompanySettings(@Body() body: Record<string, string>) {
    const data = await this.settingsService.updateCompanySettings(body);
    return createSuccessResponse(data);
  }

  @Get('app')
  async getAppSettings() {
    const data = await this.settingsService.getAppSettings();
    return createSuccessResponse(data);
  }

  @Put('app')
  async updateAppSettings(@Body() body: Record<string, string>) {
    const data = await this.settingsService.updateAppSettings(body);
    return createSuccessResponse(data);
  }
}
